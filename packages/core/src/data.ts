// Indexed access to the generated dataset.
import { toHira } from "./kana.ts";
import type { Dataset, Kanji, Word } from "./types.ts";

export class KanjiData {
  readonly kanji: readonly Kanji[];
  readonly words: readonly Word[];
  readonly version: string;
  private readonly byK = new Map<string, Kanji>();
  private readonly bySpelling = new Map<string, Word>();
  /** Every primary reading, for the last-resort distractor. */
  readonly allReadings: readonly string[];

  constructor(ds: Dataset) {
    this.kanji = ds.kanji;
    this.words = ds.words;
    this.version = ds.version;
    for (const k of ds.kanji) this.byK.set(k.k, k);
    for (const w of ds.words) this.bySpelling.set(w.w, w);
    this.allReadings = [...new Set(ds.words.map((w) => w.r))];
  }

  get(k: string): Kanji | undefined { return this.byK.get(k); }
  word(spelling: string): Word | undefined { return this.bySpelling.get(spelling); }
  wordsOf(k: Kanji): Word[] { return k.w.map((i) => this.words[i]!); }

  /** Readings of a kanji as hiragana stems: on readings, and kun readings without okurigana or affix marks. */
  readingsOf(k: string): string[] {
    const r = this.byK.get(k);
    if (!r) return [];
    return [...new Set([...r.on.map(toHira), ...r.kun.map((x) => x.split(".")[0]!.replace(/-/g, ""))].filter(Boolean))];
  }
}

/** Every reading a distractor must never be: the accepted answers and any other known reading of the spelling. */
export const validReadings = (w: Word): Set<string> => new Set([w.r, ...w.rs, ...(w.x ?? [])]);
