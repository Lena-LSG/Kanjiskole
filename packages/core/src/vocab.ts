// Vocabulary as cards of their own. A word unlocks once every kanji in it is known, so the word list grows out of
// what she can already read; easiest and most common first. Keyed "w:<spelling>" in the event log, so a one-kanji
// word never collides with the kanji card of the same character.
import { isDue, isStarted, type CardState } from "./cards.ts";
import { maturity } from "./curriculum.ts";
import { validReadings, type KanjiData } from "./data.ts";
import { DEFAULT_ROLLOVER } from "./day.ts";
import { readingOptions } from "./distractors.ts";
import { isKanji } from "./kana.ts";
import { shuffle, type Rng } from "./rng.ts";
import type { Word } from "./types.ts";

export const WORD_PREFIX = "w:";
export const wordKey = (w: Word | string) => WORD_PREFIX + (typeof w === "string" ? w : w.w);
export const isWordKey = (k: string) => k.startsWith(WORD_PREFIX);
export const wordOf = (k: string, data: KanjiData): Word | undefined => (isWordKey(k) ? data.word(k.slice(WORD_PREFIX.length)) : undefined);

const kanjiIn = (w: Word) => [...w.w].filter(isKanji);

const ORDER = new WeakMap<KanjiData, Word[]>();
/** Every word worth a card (glossed, two or more characters, at least one kanji), in teaching order. */
export function vocabOrder(data: KanjiData): Word[] {
  let o = ORDER.get(data);
  if (!o) {
    const lastKanji = (w: Word) => Math.max(...kanjiIn(w).map((c) => data.pos(c)));
    o = data.words
      .filter((w) => w.g && [...w.w].length >= 2 && kanjiIn(w).length > 0 && kanjiIn(w).every((c) => data.get(c)))
      .map((w) => ({ w, key: [w.j ? 5 - w.j : 5, w.p ? 0 : 1, lastKanji(w), [...w.w].length] }))
      .sort((a, b) => a.key.reduce((d, x, i) => d || x - b.key[i]!, 0) || a.w.w.localeCompare(b.w.w))
      .map((x) => x.w);
    ORDER.set(data, o);
  }
  return o;
}

/** Words whose kanji she all knows. */
export const unlockedWords = (data: KanjiData, known: ReadonlySet<string>): Word[] =>
  vocabOrder(data).filter((w) => kanjiIn(w).every((c) => known.has(c)));

export function newWords(cards: ReadonlyMap<string, CardState>, data: KanjiData, known: ReadonlySet<string>, n: number): string[] {
  const out: string[] = [];
  for (const w of unlockedWords(data, known)) {
    if (out.length >= n) break;
    if (!isStarted(cards.get(wordKey(w)))) out.push(wordKey(w));
  }
  return out;
}

export function dueWords(cards: ReadonlyMap<string, CardState>, now: number, rolloverHour = DEFAULT_ROLLOVER): string[] {
  return [...cards.values()]
    .filter((c) => isWordKey(c.k) && isDue(c, now, rolloverHour))
    .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime() || (a.k < b.k ? -1 : 1))
    .map((c) => c.k);
}

export function vocabProgress(cards: ReadonlyMap<string, CardState>, data: KanjiData, known: ReadonlySet<string>) {
  const unlocked = unlockedWords(data, known);
  const started = unlocked.filter((w) => isStarted(cards.get(wordKey(w)))).length;
  return { total: vocabOrder(data).length, unlocked: unlocked.length, started };
}

// ---------- exercises ----------

export type WordKind = "word-meaning" | "word-read" | "word-type" | "word-spell";

export type WordExercise =
  | { kind: "word-meaning"; word: Word; options: { label: string; ok: boolean }[] }
  | { kind: "word-read"; word: Word; options: { label: string; ok: boolean }[] }
  | { kind: "word-type"; word: Word }
  /** Shown the reading and gloss, pick the right spelling among look-alike spellings. */
  | { kind: "word-spell"; word: Word; options: { label: string; ok: boolean }[] };

const firstGloss = (g: string) => g.split(",")[0]!.trim().toLowerCase();

/** Glosses of nearby words or words sharing a kanji: plausible, never the same meaning. */
function meaningOptions(word: Word, data: KanjiData, rng: Rng): { label: string; ok: boolean }[] | null {
  const order = vocabOrder(data);
  const at = order.indexOf(word);
  const ks = new Set(kanjiIn(word));
  const near = order.filter((w, i) => w !== word && (kanjiIn(w).some((c) => ks.has(c)) || Math.abs(i - at) <= 60));
  const seen = new Set([firstGloss(word.g)]);
  const wrong: string[] = [];
  for (const w of shuffle(rng, near)) {
    if (wrong.length >= 3) break;
    const f = firstGloss(w.g);
    if (!seen.has(f)) { seen.add(f); wrong.push(w.g); }
  }
  if (wrong.length < 3) return null;
  return shuffle(rng, [{ label: word.g, ok: true }, ...wrong.map((label) => ({ label, ok: false }))]);
}

/** The same word with one kanji swapped for a look-alike (時間 → 持間), never a real word read the same way. */
function spellOptions(word: Word, data: KanjiData, rng: Rng): { label: string; ok: boolean }[] | null {
  const chars = [...word.w];
  const cands = new Set<string>();
  chars.forEach((c, i) => {
    for (const s of data.get(c)?.sim.slice(0, 8) ?? []) {
      const alt = [...chars.slice(0, i), s, ...chars.slice(i + 1)].join("");
      const real = data.word(alt);
      if (alt !== word.w && !(real && validReadings(real).has(word.r))) cands.add(alt);
    }
  });
  const wrong = shuffle(rng, [...cands]).slice(0, 3);
  if (wrong.length < 3) return null;
  return shuffle(rng, [{ label: word.w, ok: true }, ...wrong.map((label) => ({ label, ok: false }))]);
}

const WEIGHTS: Record<0 | 1 | 2, Record<WordKind, number>> = {
  0: { "word-meaning": 3, "word-read": 3, "word-spell": 0, "word-type": 0 },
  1: { "word-meaning": 2, "word-read": 3, "word-spell": 2, "word-type": 1 },
  2: { "word-meaning": 1, "word-read": 2, "word-spell": 2, "word-type": 3 },
};

export function makeWordExercise(word: Word, card: CardState | undefined, data: KanjiData, rng: Rng): WordExercise {
  const w = WEIGHTS[maturity(card)];
  const meaning = meaningOptions(word, data, rng);
  const spell = w["word-spell"] ? spellOptions(word, data, rng) : null;
  const avail = (Object.keys(w) as WordKind[]).filter((k) => w[k] > 0 && (k !== "word-meaning" || meaning) && (k !== "word-spell" || spell));
  let x = rng() * avail.reduce((s, k) => s + w[k], 0);
  const kind = avail.find((k) => (x -= w[k]) < 0) ?? "word-read";
  switch (kind) {
    case "word-meaning": return { kind, word, options: meaning! };
    case "word-spell": return { kind, word, options: spell! };
    case "word-type": return { kind, word };
    case "word-read": return { kind, word, options: readingOptions(word, data, rng).map((r) => ({ label: r, ok: r === word.r })) };
  }
}
