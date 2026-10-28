// Judging a typed reading. Deterministic only: no network, so it works at 1am in airplane mode.
import { normalizeAnswer, normalizeReading } from "./kana.ts";
import type { Word } from "./types.ts";

export type Verdict =
  | { ok: true; how: "exact"; got: string }
  /** A different reading JMdict accepts for this spelling (日本 にっぽん). Correct, but show the main one. */
  | { ok: true; how: "alternative"; got: string }
  | { ok: false; how: "wrong"; got: string };

export function judgeTyped(input: string, word: Word): Verdict {
  const got = normalizeAnswer(input);
  if (got === normalizeReading(word.r)) return { ok: true, how: "exact", got };
  if (word.rs.some((r) => normalizeReading(r) === got)) return { ok: true, how: "alternative", got };
  return { ok: false, how: "wrong", got };
}
