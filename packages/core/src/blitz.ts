// Blitz: 60 seconds of multiple choice, ×2 points from the third right answer in a row, weighted to weak cards.
import { isStarted, State, type CardState } from "./cards.ts";
import type { KanjiData } from "./data.ts";
import type { Rng } from "./rng.ts";

export const BLITZ_MS = 60_000;

export interface PoolEntry { k: string; weight: number }

/** Her own started kanji, weighted to lapses and young cards; the 300 most frequent if she has under 20. */
export function blitzPool(cards: Map<string, CardState>, data: KanjiData): PoolEntry[] {
  const mine = [...cards.values()].filter(isStarted);
  if (mine.length >= 20) {
    return mine.map((c) => ({
      k: c.k,
      weight: 1 + c.lapses * 2 + (c.fsrs.state !== State.Review || c.fsrs.stability < 7 ? 2 : 0),
    }));
  }
  return data.kanji.slice(0, 300).map((k) => ({ k: k.k, weight: 1 }));
}

/** Weighted draw that avoids repeating the previous kanji. */
export function drawFrom(pool: readonly PoolEntry[], rng: Rng, last?: string): string {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  for (let guard = 0; guard < 20; guard++) {
    let x = rng() * total;
    const hit = pool.find((p) => (x -= p.weight) < 0) ?? pool[0]!;
    if (hit.k !== last || pool.length === 1) return hit.k;
  }
  return pool[0]!.k;
}

export interface BlitzScore { score: number; streak: number }

export const scoreAnswer = (s: BlitzScore, ok: boolean): BlitzScore =>
  ok ? { score: s.score + (s.streak + 1 >= 3 ? 2 : 1), streak: s.streak + 1 } : { score: s.score, streak: 0 };

/** The end-screen verdict. The app owns the wording; this owns the rule. */
export function blitzVerdict(score: number, best: number): "record" | "close" | "off" {
  if (score > best) return "record";
  return score >= best * 0.8 ? "close" : "off";
}
