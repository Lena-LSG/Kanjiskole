// What the home screen and the session agree on: what's due, how many new are left today.
import { dueCards, isStarted, newKanji, newToday, type CardState, type KanjiEvent } from "@kanjiskole/core";
import { data, type Settings } from "@/state/AppState";

export function todayCounts(cards: ReadonlyMap<string, CardState>, events: readonly KanjiEvent[], settings: Settings, now: number) {
  const m = cards as Map<string, CardState>;
  const due = dueCards(m, data, now, settings.rolloverHour).length;
  const doneNew = newToday(events, now, settings.rolloverHour);
  const newLeft = newKanji(m, data, Math.max(0, settings.newPerDay - doneNew)).length;
  const started = [...cards.values()].filter(isStarted).length;
  // ~15 s per review, ~40 s per new kanji (intro + quiz)
  const minutes = Math.max(1, Math.round((due * 15 + newLeft * 40) / 60));
  return { due, newLeft, doneNew, started, minutes };
}
