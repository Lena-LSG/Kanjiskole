// Stats over the log and the derived cards. Blitz answers are practice and never count as reviews here.
import { isLeech, isStarted, scheduler, State, type CardState } from "./cards.ts";
import { DEFAULT_ROLLOVER, studyDay } from "./day.ts";
import type { KanjiEvent, ReviewEvent } from "./events.ts";
import { isKanaKey } from "./kana-track.ts";
import { isWordKey } from "./vocab.ts";

const isKanjiCard = (c: CardState) => !isKanaKey(c.k) && !isWordKey(c.k);

const reviews = (events: readonly KanjiEvent[]) =>
  events.filter((e): e is ReviewEvent => e.t === "review" && e.via !== "blitz");

export interface DayStats { day: string; reviews: number; correct: number; newKanji: number }

export function perDay(events: readonly KanjiEvent[], rolloverHour = DEFAULT_ROLLOVER): DayStats[] {
  const days = new Map<string, DayStats>();
  const seen = new Set(events.filter((e) => e.t === "import" || e.t === "calibrate").map((e) => e.k));
  for (const e of [...reviews(events)].sort((a, b) => a.at - b.at)) {
    const day = studyDay(e.at, rolloverHour);
    const d = days.get(day) ?? days.set(day, { day, reviews: 0, correct: 0, newKanji: 0 }).get(day)!;
    d.reviews++;
    if (e.ok) d.correct++;
    if (!seen.has(e.k)) { seen.add(e.k); d.newKanji++; }
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Share of answers right on cards she had already learned (first sightings excluded). */
export function retention(events: readonly KanjiEvent[], since = 0): number | null {
  const seen = new Set(events.filter((e) => e.t === "import" || e.t === "calibrate").map((e) => e.k));
  let n = 0, ok = 0;
  for (const e of [...reviews(events)].sort((a, b) => a.at - b.at)) {
    if (seen.has(e.k) && e.at >= since) { n++; if (e.ok) ok++; }
    seen.add(e.k);
  }
  return n ? ok / n : null;
}

/** Consecutive study days with at least one review, ending today (or yesterday, if today is still empty). */
export function streak(events: readonly KanjiEvent[], now: number, rolloverHour = DEFAULT_ROLLOVER): number {
  const days = new Set(reviews(events).map((e) => studyDay(e.at, rolloverHour)));
  let n = 0;
  let t = now;
  if (!days.has(studyDay(t, rolloverHour))) t -= 864e5;
  while (days.has(studyDay(t, rolloverHour))) { n++; t -= 864e5; }
  return n;
}

export interface Weak { k: string; retrievability: number; lapses: number; leech: boolean }

/** Started kanji she is most likely to get wrong right now. */
export function weakest(cards: Map<string, CardState>, now: number, limit = 20): Weak[] {
  const f = scheduler();
  return [...cards.values()].filter((c) => isKanjiCard(c) && isStarted(c))
    .map((c) => ({
      k: c.k,
      retrievability: c.fsrs.state === State.Review ? f.get_retrievability(c.fsrs, new Date(now), false) : 0,
      lapses: c.lapses,
      leech: isLeech(c),
    }))
    .sort((a, b) => Number(b.leech) - Number(a.leech) || a.retrievability - b.retrievability || b.lapses - a.lapses)
    .slice(0, limit);
}

export const leeches = (cards: Map<string, CardState>) => [...cards.values()].filter((c) => isKanjiCard(c) && isLeech(c)).map((c) => c.k);

export function stageCounts(cards: Map<string, CardState>, total: number) {
  const out = { unseen: total, learning: 0, young: 0, mature: 0 };
  for (const c of cards.values()) {
    if (!isKanjiCard(c) || !isStarted(c)) continue;
    out.unseen--;
    if (c.fsrs.state !== State.Review) out.learning++;
    else if (c.fsrs.stability >= 21) out.mature++;
    else out.young++;
  }
  return out;
}
