// Japanese read-aloud with the device's own text-to-speech (Android TTS, or the browser's Web Speech API):
// offline where the voice is installed, nothing sent anywhere by us. Without a Japanese voice the app hides audio.
import type { Word } from "@kanjiskole/core";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { localRecording } from "./audioCache";
import { recordingName } from "./recordings";

let found: Promise<string | null> | undefined;

/** The identifier of a Japanese voice, or null. Browsers load their voice list late, so ask a few times. */
function japaneseVoice(): Promise<string | null> {
  found ??= (async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const ja = (await Speech.getAvailableVoicesAsync()).filter((v) => v.language?.toLowerCase().replace("_", "-").startsWith("ja"));
        if (ja.length) return (ja.find((v) => String(v.quality) === "Enhanced") ?? ja[0]!).identifier;
      } catch { /* no TTS engine: treat as no voice */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  })();
  return found;
}

let voiceId: string | null = null;
/** Synchronous check, for code that decides once (e.g. which exercise to build). */
export const hasVoice = () => voiceId !== null;

export function useJapaneseVoice(): boolean {
  const [ok, setOk] = useState(voiceId !== null);
  useEffect(() => {
    let live = true;
    japaneseVoice()
      .then((v) => { voiceId = v; if (live) setOk(v !== null); })
      .catch((e: unknown) => console.warn("Kanjiskole: could not list voices", e));
    return () => { live = false; };
  }, []);
  return ok;
}

/** Say it in Japanese. Pass the reading in kana where there is one: TTS can guess a kanji's reading wrong. */
export function say(text: string) {
  if (voiceId === null || !text) return;
  try {
    if (player) { try { player.remove(); } catch { /* already gone */ } player = null; }
    void Speech.stop();
    Speech.speak(text, { language: "ja-JP", voice: voiceId, rate: 0.9 });
  } catch (e) {
    console.warn("Kanjiskole: text-to-speech failed", e); // audio is a nicety: never let it break a session
  }
}

let player: AudioPlayer | null = null;
const unavailable = new Set<string>(); // failed this session: don't ask the server again until the app restarts

function stopAll() {
  Speech.stop().catch(() => undefined); // nothing playing
  if (player) { try { player.remove(); } catch { /* already gone */ } player = null; }
}

/**
 * A word, by a native speaker when Kanji alive has a recording (fetched once, then kept), otherwise by the device
 * voice from its kana reading. Any failure (offline on first play, a decoding error) falls back to the voice.
 */
export async function speakWord(w: Word) {
  const name = recordingName(w);
  stopAll();
  if (!name || unavailable.has(name)) return say(w.r);
  try {
    const uri = await localRecording(name);
    stopAll();
    player = createAudioPlayer(uri);
    player.play();
  } catch (e) {
    unavailable.add(name);
    console.warn("Kanjiskole: recording unavailable, using the device voice", e);
    say(w.r);
  }
}
