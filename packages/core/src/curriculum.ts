// What a card is ready for: which words its questions may use and which exercise types, by how well she knows it.
// New kanji meet only words she can already read, in plain readings, with gentle distractors; the hard material
// (whole-word readings like 二十歳 はたち, rendaku, typed recall, look-alikes) unlocks as the card matures.
import { State, type CardState } from "./cards.ts";
import type { KanjiData } from "./data.ts";
import type { QuizKind } from "./exercises.ts";
import { isKanji, toHira } from "./kana.ts";
import type { Kanji, Word } from "./types.ts";

/** 0 new (intro just seen, or still learning), 1 young, 2 established (or calibrated as known). */
export type Maturity = 0 | 1 | 2;

export const YOUNG_STABILITY = 2; // days
export const ESTABLISHED_STABILITY = 10; // days

export function maturity(c: CardState | undefined): Maturity {
  if (!c || c.fsrs.state !== State.Review) return 0;
  if (c.needsTypedCheck || c.fsrs.stability >= ESTABLISHED_STABILITY) return 2;
  return c.fsrs.stability >= YOUNG_STABILITY ? 1 : 0;
}

/** 0 plain (every kanji read with one of its own listed readings), 1 sound change (rendaku, っ), 2 irregular. */
export type Difficulty = 0 | 1 | 2;

const UNVOICE: Record<string, string> = Object.fromEntries(
  [..."がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ"].map((c, i) => [c, "かきくけこさしすせそたちつてとはひふへほはひふへほ"[i]!]),
);

export function wordDifficulty(w: Word, data: KanjiData): Difficulty {
  const chars = [...w.w];
  const kanjiCount = chars.filter(isKanji).length;
  if (!w.f || !w.f.length) {
    // No alignment: a lone kanji read with one of its readings is plain; anything else we can't vouch for.
    return kanjiCount === 1 && chars.length === 1 && data.readingsOf(w.w).includes(toHira(w.r)) ? 0 : 2;
  }
  let worst: Difficulty = 0;
  for (const [a, b, r] of w.f) {
    if (b - a !== 1) return 2; // one reading over several kanji: jukujikun (今日 きょう)
    const listed = data.readingsOf(chars[a]!);
    if (listed.includes(r)) continue;
    // Sound changes of a listed reading: voiced first kana (rendaku), or a final っ replacing く/き/つ/ち.
    const unvoiced = (UNVOICE[r[0]!] ?? r[0]) + r.slice(1);
    const sokuon = r.endsWith("っ") && listed.some((l) => l.length === r.length && l.startsWith(r.slice(0, -1)) && "くきつち".includes(l.at(-1)!));
    if (listed.includes(unvoiced) || sokuon) worst = 1;
    else return 2;
  }
  return worst;
}

/** Words whose other kanji she already knows: the target may be new, nothing else may. */
export function readableWords(k: Kanji, data: KanjiData, known: ReadonlySet<string>): Word[] {
  return data.wordsOf(k).filter((w) => [...w.w].every((c) => c === k.k || !isKanji(c) || known.has(c)));
}

export interface Plan {
  maturity: Maturity;
  /** Words questions may use, best first. Empty: kanji-only exercises. */
  words: Word[];
  weights: Partial<Record<QuizKind, number>>;
  /** Use visually confusable kanji as distractors. */
  similar: boolean;
}

const WEIGHTS: Record<Maturity, Record<QuizKind, number>> = {
  0: { mean: 3, which: 2, read: 2, fill: 0, type: 0 },
  1: { mean: 2, which: 2, read: 3, fill: 2, type: 1 },
  2: { mean: 2, which: 1, read: 3, fill: 3, type: 3 },
};

export function planFor(k: Kanji, card: CardState | undefined, data: KanjiData, known: ReadonlySet<string>): Plan {
  const m = maturity(card);
  const readable = readableWords(k, data, known);
  const allowed = readable.filter((w) => wordDifficulty(w, data) <= m);
  const glossed = allowed.filter((w) => w.g);
  return { maturity: m, words: (glossed.length ? glossed : allowed).slice(0, 6), weights: WEIGHTS[m], similar: m > 0 };
}
