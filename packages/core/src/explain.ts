// "Hvorfor?" without a network: classify what kind of mistake a wrong answer was.
// Returns structured codes; the app phrases them (in Danish, in its own voice).
import type { KanjiData } from "./data.ts";
import { normalizeReading, toHira } from "./kana.ts";
import type { Word } from "./types.ts";

export type Explanation =
  /** Read one kanji with another of its readings: 生 as なま where the word wants せい. */
  | { code: "other-reading"; kanji: string; used: string; correct: string; usedIsOn: boolean }
  /** Missed (or invented) the voicing that joins a compound: 手紙 てがみ, not てかみ. */
  | { code: "rendaku"; kanji: string; correct: string; missed: boolean }
  | { code: "voicing"; correct: string }
  | { code: "long-vowel"; missed: boolean }
  | { code: "sokuon"; missed: boolean }
  | { code: "small-kana"; correct: string }
  /** A real reading of this spelling, just not the one asked for (names, rare readings). */
  | { code: "rare-reading" }
  /** Picked a kanji that looks like the right one. */
  | { code: "lookalike"; chosen: string; target: string; shared: string[]; chosenOnly: string[]; targetOnly: string[] }
  /** Picked another kanji that doesn't particularly resemble the right one (new cards get plain distractors). */
  | { code: "other-kanji"; chosen: string; target: string };

const VOICED = "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ";
const PLAIN = "かきくけこさしすせそたちつてとはひふへほはひふへほ";
const unvoice = (c: string) => { const i = VOICED.indexOf(c); return i < 0 ? c : PLAIN[i]!; };
const SMALL = "ゃゅょぁぃぅぇぉっ", LARGE = "やゆよあいうえおつ";

/** Offsets of each furigana segment's kana within the full reading. */
function segmentSpans(word: Word): { kanji: string; start: number; reading: string }[] {
  if (!word.f) return [];
  const chars = [...word.w];
  const spans: { kanji: string; start: number; reading: string }[] = [];
  let pos = 0;
  for (let i = 0, j = 0; i < chars.length; ) {
    const seg = word.f[j];
    if (seg && seg[0] === i) {
      spans.push({ kanji: chars.slice(seg[0], seg[1]).join(""), start: pos, reading: seg[2] });
      pos += seg[2].length;
      i = seg[1];
      j++;
    } else { pos += toHira(chars[i]!).length; i++; }
  }
  return spans;
}

export function explainReading(answer: string, word: Word, data: KanjiData): Explanation | null {
  const got = normalizeReading(answer);
  const right = normalizeReading(word.r);
  if (!got || got === right) return null;
  if ((word.x ?? []).includes(got)) return { code: "rare-reading" };

  const spans = segmentSpans(word);
  const a = [...got], b = [...right];
  // One kana off by voicing first: 手紙 てかみ is a missed rendaku even though かみ is also a reading of 紙.
  if (a.length === b.length) {
    const diff = a.flatMap((c, i) => (c !== b[i] ? [i] : []));
    if (diff.length === 1) {
      const i = diff[0]!, x = a[i]!, y = b[i]!;
      if (unvoice(x) === unvoice(y)) {
        const s = spans.find((sp) => sp.start === i && sp.start > 0);
        // Rendaku only if the voiced form isn't a reading of its own: 一度 いちど is ド, not voiced と.
        const voicedSide = VOICED.includes(y) ? right : got;
        const voicedSeg = s && voicedSide.slice(s.start, s.start + s.reading.length);
        if (s && voicedSeg && !data.readingsOf(s.kanji).includes(voicedSeg)) {
          return { code: "rendaku", kanji: s.kanji, correct: s.reading, missed: VOICED.includes(y) };
        }
        if (!s || !data.readingsOf(s.kanji).includes(got.slice(s.start, s.start + s.reading.length))) return { code: "voicing", correct: right };
      }
      if (SMALL.indexOf(x) >= 0 && LARGE[SMALL.indexOf(x)] === y || SMALL.indexOf(y) >= 0 && LARGE[SMALL.indexOf(y)] === x) {
        return { code: "small-kana", correct: right };
      }
    }
  }
  // Another reading of one of the kanji, everything else right.
  for (const s of spans) {
    if ([...s.kanji].length !== 1) continue;
    const before = right.slice(0, s.start), after = right.slice(s.start + s.reading.length);
    if (!got.startsWith(before) || !got.endsWith(after) || got.length < before.length + after.length) continue;
    const used = got.slice(before.length, got.length - after.length);
    if (used === s.reading) continue;
    const k = data.get(s.kanji);
    if (k && data.readingsOf(s.kanji).includes(used)) {
      return { code: "other-reading", kanji: s.kanji, used, correct: s.reading, usedIsOn: k.on.some((o) => toHira(o) === used) };
    }
  }

  if (Math.abs(a.length - b.length) === 1) {
    const [long, short] = a.length > b.length ? [a, b] : [b, a];
    for (let i = 0; i < long.length; i++) {
      if (long.slice(0, i).join("") + long.slice(i + 1).join("") !== short.join("")) continue;
      const missed = long === b;
      if (long[i] === "っ") return { code: "sokuon", missed };
      if ((long[i] === "う" || long[i] === "い") && i > 0) return { code: "long-vowel", missed };
    }
  }
  return null;
}

export function explainKanjiChoice(chosen: string, target: string, data: KanjiData): Explanation | null {
  const a = data.get(chosen), b = data.get(target);
  if (!a || !b || chosen === target) return null;
  const shared = a.c.filter((c) => b.c.includes(c));
  // Only call it a look-alike when it is one: visually close, or built from the same parts.
  if (!b.sim.slice(0, 12).includes(chosen) && !a.sim.slice(0, 12).includes(target) && !shared.length) {
    return { code: "other-kanji", chosen, target };
  }
  return { code: "lookalike", chosen, target, shared, chosenOnly: a.c.filter((c) => !b.c.includes(c)), targetOnly: b.c.filter((c) => !a.c.includes(c)) };
}
