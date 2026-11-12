// Native-speaker recordings from Kanji alive (CC BY 4.0) for ~4,500 common words. The manifest says which words
// have one; the file is fetched the first time it's played and kept on the device.
import type { Word } from "@kanjiskole/core";
import manifest from "../../../assets/data/audio.v1.json";

const files = manifest.files as Record<string, string>;

export const hasRecording = (w: Word) => w.w in files;
export const recordingName = (w: Word) => (w.w in files ? `${files[w.w]}${manifest.ext}` : null);
export const recordingUrl = (name: string) => `${manifest.base}${encodeURIComponent(name)}`;

/** Ogg pages start with "OggS": a cheap check that a download is audio and not an error page. */
export const isOgg = (b: Uint8Array) => b.length > 4 && b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53;
