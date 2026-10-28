// The shape of the generated data in assets/data. scripts/data/build.ts writes it; never edit the JSON by hand.

/** A furigana segment: characters [start, end) of the word read as `reading`. Kana outside segments read as themselves. */
export type Furigana = [start: number, end: number, reading: string];

export interface Word {
  /** Spelling, e.g. 時間 */
  w: string;
  /** Primary reading in hiragana, e.g. じかん */
  r: string;
  /** Every reading accepted as a typed answer (JMdict), including `r`. */
  rs: string[];
  /** Further readings of this spelling (names, places) that are never used as distractors. */
  x?: string[];
  /** English gloss, or "" when no source has one. */
  g: string;
  /** Furigana for `r`, when the alignment is known. */
  f?: Furigana[];
  /** JMdict priority word (ichi1/news1/nf01–24/spec). */
  p?: 1;
  /** JLPT level 5…1, if listed. */
  j?: number;
}

export interface Kanji {
  k: string;
  /** Frequency order, 0-based. This is the calibration and new-card order. */
  i: number;
  m: string[];
  /** On readings, katakana. */
  on: string[];
  /** Kun readings, hiragana; "." marks okurigana, "-" marks a prefix or suffix. */
  kun: string[];
  s: number;
  /** Newspaper frequency rank, if ranked. */
  f: number | null;
  j: number | null;
  g: number;
  /** Visual components from KRADFILE, as displayable glyphs. */
  c: string[];
  /** Indexes into Dataset.words, best first. */
  w: number[];
  /** Visually confusable kanji, most similar first. */
  sim: string[];
}

export interface Dataset {
  version: string;
  sources: Record<string, string>;
  kanji: Kanji[];
  words: Word[];
}
