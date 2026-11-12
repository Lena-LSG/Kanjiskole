// The five exercise types, as plain data. The app renders them; nothing here touches the UI.
import type { KanjiData } from "./data.ts";
import { lookalikes, readingOptions } from "./distractors.ts";
import type { ExerciseKind } from "./events.ts";
import { pick, shuffle, type Rng } from "./rng.ts";
import type { Kanji, Word } from "./types.ts";

export interface Option {
  label: string;
  ok: boolean;
  /** For kanji options: the kanji, so a wrong pick can be explained. */
  k?: string;
}

export type Exercise =
  | { kind: "mean"; k: Kanji; options: Option[] }
  | { kind: "which"; k: Kanji; meaning: string; options: Option[] }
  | { kind: "fill"; k: Kanji; word: Word; options: Option[] }
  | { kind: "read"; k: Kanji; word: Word; options: Option[] }
  | { kind: "type"; k: Kanji; word: Word };

export type QuizKind = Exclude<ExerciseKind, "flash">;

export const WEIGHTS: Record<QuizKind, number> = { mean: 3, which: 2, read: 3, type: 2, fill: 3 };

export const meaningLabel = (k: Kanji) => k.m.slice(0, 2).join(", ");

/** Prompt words: the most common few with a gloss, so prompts stay meaningful. */
function defaultWords(k: Kanji, data: KanjiData): Word[] {
  const ws = data.wordsOf(k);
  const glossed = ws.filter((w) => w.g);
  return (glossed.length ? glossed : ws).slice(0, 6);
}

export interface ExerciseOptions {
  noType?: boolean;
  prefer?: QuizKind;
  /** Words questions may use (from planFor). Defaults to the kanji's most common glossed words. */
  words?: Word[];
  /** Weights per type; a type weighted 0 or missing is never picked. Defaults to WEIGHTS. */
  weights?: Partial<Record<QuizKind, number>>;
  /** Visually confusable distractors (default) or plain curriculum neighbours for new cards. */
  similar?: boolean;
}

/** Which types this kanji supports, given the words it may use. */
export function availableKinds(k: Kanji, data: KanjiData, noType = false, words: Word[] = defaultWords(k, data)): QuizKind[] {
  const kinds: QuizKind[] = ["mean", "which"];
  if (words.length) { kinds.push("read"); if (!noType) kinds.push("type"); }
  if (words.some((w) => [...w.w].length >= 2)) kinds.push("fill");
  return kinds;
}

export function makeExercise(k: Kanji, data: KanjiData, rng: Rng, opts: ExerciseOptions = {}): Exercise {
  const words = opts.words ?? defaultWords(k, data);
  const weights = opts.weights ?? WEIGHTS;
  const similar = opts.similar ?? true;
  const avail = availableKinds(k, data, opts.noType, words);
  let kind: QuizKind | undefined = opts.prefer && avail.includes(opts.prefer) ? opts.prefer : undefined;
  if (!kind) {
    const weighted = avail.filter((a) => (weights[a] ?? 0) > 0);
    let x = rng() * weighted.reduce((s, a) => s + weights[a]!, 0);
    kind = weighted.find((a) => (x -= weights[a]!) < 0) ?? "mean";
  }
  const kanjiOptions = (accept?: (o: Kanji) => boolean) =>
    shuffle(rng, [{ label: k.k, ok: true, k: k.k }, ...lookalikes(k, data, rng, 3, accept, similar).map((o) => ({ label: o.k, ok: false, k: o.k }))]);

  switch (kind) {
    case "mean": {
      const right = meaningLabel(k);
      const others = lookalikes(k, data, rng, 3, (o) => meaningLabel(o) !== right, similar);
      return { kind, k, options: shuffle(rng, [{ label: right, ok: true }, ...others.map((o) => ({ label: meaningLabel(o), ok: false, k: o.k }))]) };
    }
    case "which":
      return { kind, k, meaning: meaningLabel(k), options: kanjiOptions() };
    case "fill": {
      const word = pick(rng, words.filter((w) => [...w.w].length >= 2));
      // A distractor must not complete a different real word (□当 with 相 gives 相当).
      const accept = (o: Kanji) => !data.word(word.w.replaceAll(k.k, o.k));
      return { kind, k, word, options: kanjiOptions(accept) };
    }
    case "read": {
      const word = pick(rng, words);
      return { kind, k, word, options: readingOptions(word, data, rng).map((r) => ({ label: r, ok: r === word.r })) };
    }
    case "type":
      return { kind, k, word: pick(rng, words) };
  }
}
