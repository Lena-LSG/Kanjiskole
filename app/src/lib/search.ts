// Browse/search by kanji, reading (romaji or kana) or English meaning.
import { isKanji, normalizeReading, toHira, toKana, type Kanji } from "@kanjiskole/core";
import { data } from "@/state/AppState";

interface Entry { k: Kanji; meanings: string; readings: string[]; wordReadings: string[] }

let index: Entry[] | undefined;
function build(): Entry[] {
  index ??= data.kanji.map((k) => ({
    k,
    meanings: k.m.join(" | ").toLowerCase(),
    readings: [...k.on.map(toHira), ...k.kun.map((r) => r.replace(/[.-]/g, ""))],
    wordReadings: data.wordsOf(k).map((w) => w.r),
  }));
  return index;
}

export function search(q: string): Kanji[] {
  const query = q.trim();
  if (!query) return data.kanji as Kanji[];
  const chars = [...query].filter(isKanji);
  if (chars.length) return chars.map((c) => data.get(c)).filter((k): k is Kanji => !!k);
  const latin = /[a-z]/i.test(query);
  const kana = normalizeReading(latin ? toKana(query) : query);
  const word = query.toLowerCase();
  const scored: [number, Kanji][] = [];
  for (const e of build()) {
    let s = 0;
    if (e.readings.includes(kana)) s = 3;
    else if (e.readings.some((r) => r.startsWith(kana))) s = 2;
    else if (e.wordReadings.includes(kana)) s = 1.5;
    if (latin && word.length >= 2) {
      if (e.meanings.split(" | ").some((m) => m === word)) s = Math.max(s, 3.5);
      else if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(e.meanings)) s = Math.max(s, 2.5);
    }
    if (s) scored.push([s, e.k]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].i - b[1].i).map(([, k]) => k);
}
