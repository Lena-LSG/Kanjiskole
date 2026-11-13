// The set of kanji she has started, which decides which words are unlocked.
import { isStarted, type CardState } from "@kanjiskole/core";
import { useMemo } from "react";

/** Kanji she has started (studied, calibrated or imported): what a prompt word may contain besides the target. */
export function useKnown(cards: ReadonlyMap<string, CardState>): ReadonlySet<string> {
  return useMemo(() => new Set([...cards.values()].filter(isStarted).map((c) => c.k)), [cards]);
}
