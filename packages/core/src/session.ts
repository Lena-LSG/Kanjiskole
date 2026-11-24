// Building and running a study session: reviews oldest-first, a new kanji after every 4th review,
// misses requeued three cards back, new kanji introduced and then quizzed three cards later.
import { isDue, isStarted, State, type CardState } from "./cards.ts";
import type { KanjiData } from "./data.ts";
import { DEFAULT_ROLLOVER, studyDay } from "./day.ts";
import type { KanjiEvent } from "./events.ts";
import type { QuizKind } from "./exercises.ts";

export type ReviewStyle = "quiz" | "flash";

export interface Item {
  k: string;
  t: "intro" | "quiz" | "flash";
  /** Just introduced in this session. */
  fresh?: boolean;
}

export interface SessionOptions {
  now: number;
  newLimit: number;
  style: ReviewStyle;
  rolloverHour?: number;
  /** Only new cards (the "5 extra" button after the day's quota). */
  onlyNew?: boolean;
}

export function dueCards(cards: Map<string, CardState>, data: KanjiData, now: number, rolloverHour = DEFAULT_ROLLOVER): CardState[] {
  return [...cards.values()]
    .filter((c) => data.get(c.k) && isDue(c, now, rolloverHour)) // kanji only: kana have their own track
    .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime() || (data.get(a.k)?.i ?? 0) - (data.get(b.k)?.i ?? 0));
}

/** Next new kanji: anything queued first (oldest queue first), then frequency order. */
export function newKanji(cards: Map<string, CardState>, data: KanjiData, n: number): string[] {
  if (n <= 0) return [];
  const queued = [...cards.values()].filter((c) => c.queuedAt !== undefined && c.fsrs.state === State.New)
    .sort((a, b) => a.queuedAt! - b.queuedAt!).map((c) => c.k);
  const out = queued.slice(0, n);
  for (const k of data.kanji) {
    if (out.length >= n) break;
    if (!isStarted(cards.get(k.k)) && !out.includes(k.k)) out.push(k.k);
  }
  return out;
}

/** New cards first answered in the current study day; `include` picks the track (kanji or kana). */
export function newToday(
  events: readonly KanjiEvent[],
  now: number,
  rolloverHour = DEFAULT_ROLLOVER,
  include: (k: string) => boolean = () => true,
): number {
  const today = studyDay(now, rolloverHour);
  const first = new Map<string, number>();
  for (const e of events) if (e.t === "review" && include(e.k) && (!first.has(e.k) || e.at < first.get(e.k)!)) first.set(e.k, e.at);
  // An imported or calibrated card was never new here.
  const known = new Set(events.filter((e) => e.t === "import" || e.t === "calibrate").map((e) => e.k));
  let n = 0;
  for (const [k, at] of first) if (!known.has(k) && studyDay(at, rolloverHour) === today) n++;
  return n;
}

/** Due reviews in order, a new card after every 4th review, the rest of the new cards at the end. */
export function interleave(due: readonly string[], news: readonly string[], style: ReviewStyle): Item[] {
  const review: Item["t"] = style === "quiz" ? "quiz" : "flash";
  const intro: Item["t"] = style === "quiz" ? "intro" : "flash";
  const q: Item[] = [];
  let ni = 0;
  due.forEach((k, i) => {
    q.push({ k, t: review });
    if ((i + 1) % 4 === 0 && ni < news.length) q.push({ k: news[ni++]!, t: intro });
  });
  while (ni < news.length) q.push({ k: news[ni++]!, t: intro });
  return q;
}

export function buildSession(cards: Map<string, CardState>, data: KanjiData, opts: SessionOptions): Item[] {
  const due = opts.onlyNew ? [] : dueCards(cards, data, opts.now, opts.rolloverHour).map((c) => c.k);
  return interleave(due, newKanji(cards, data, opts.newLimit), opts.style);
}

/** Put an item back three positions later (or at the end of a short queue). */
export function requeue(q: readonly Item[], item: Item): Item[] {
  const at = Math.min(3, q.length);
  return [...q.slice(0, at), item, ...q.slice(at)];
}

/** After the intro card: the same kanji comes back as a quiz three cards later. */
export const afterIntro = (q: readonly Item[]): Item[] => {
  const [head, ...rest] = q;
  return head ? requeue(rest, { k: head.k, t: "quiz", fresh: true }) : [];
};

/** After an answer: drop the head; a miss comes back. */
export const afterAnswer = (q: readonly Item[], again: boolean): Item[] => {
  const [head, ...rest] = q;
  if (!head) return [];
  return again ? requeue(rest, { k: head.k, t: head.t === "flash" ? "flash" : "quiz", fresh: head.fresh }) : rest;
};

/** Calibrated cards get checked the hardest way first: type the reading. */
export function preferredKind(card: CardState | undefined, hasWords: boolean): QuizKind | undefined {
  return card?.needsTypedCheck && hasWords ? "type" : undefined;
}
