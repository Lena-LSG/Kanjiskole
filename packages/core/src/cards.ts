// Card state, derived from the event log with FSRS (ts-fsrs).
import { createEmptyCard, fsrs, generatorParameters, State, type Card, type FSRS } from "ts-fsrs";
import { addStudyDays, DEFAULT_ROLLOVER, endOfStudyDay } from "./day.ts";
import { byTime, type Grade, type KanjiEvent } from "./events.ts";

export { State };

export interface CardState {
  k: string;
  fsrs: Card;
  /** Came from calibration and has not yet been checked by typing the reading. */
  needsTypedCheck: boolean;
  /** Queued to the front of the new cards. */
  queuedAt?: number;
  firstSeen?: number;
  /** Times a review-state card was failed. */
  lapses: number;
}

export const LEECH_LAPSES = 8;
export const isLeech = (c: CardState) => c.lapses >= LEECH_LAPSES;

export interface SchedulerOptions {
  requestRetention?: number;
  maximumInterval?: number;
  /** Optimised weights, once there is enough history. */
  w?: number[];
}

export function scheduler(opts: SchedulerOptions = {}): FSRS {
  return fsrs(generatorParameters({
    request_retention: opts.requestRetention ?? 0.9,
    maximum_interval: opts.maximumInterval ?? 730,
    // Within a session the app requeues misses itself; FSRS schedules in whole days.
    enable_short_term: false,
    // ts-fsrs seeds fuzz from the card and the review time, so a replay gives the same dates.
    enable_fuzz: true,
    ...(opts.w ? { w: opts.w } : {}),
  }));
}

const CALIBRATED_STABILITY = 21;

/** Seeds a review-state card that FSRS will treat as known. */
function seededCard(at: number, due: number, stability: number, difficulty: number, reps: number, lapses: number): Card {
  return {
    ...createEmptyCard(new Date(at)),
    state: State.Review,
    due: new Date(due),
    stability,
    difficulty,
    reps,
    lapses,
    scheduled_days: Math.max(1, Math.round((due - at) / 864e5)),
    last_review: new Date(at),
  };
}

/** Replays a log into card states. Pure: same events in, same cards out. */
export function replay(
  events: readonly KanjiEvent[],
  opts: SchedulerOptions & { rolloverHour?: number } = {},
): Map<string, CardState> {
  const f = scheduler(opts);
  const roll = opts.rolloverHour ?? DEFAULT_ROLLOVER;
  const cards = new Map<string, CardState>();
  for (const e of [...events].sort(byTime)) {
    let c = cards.get(e.k);
    switch (e.t) {
      case "review": {
        if (!c) c = { k: e.k, fsrs: createEmptyCard(new Date(e.at)), needsTypedCheck: false, lapses: 0, firstSeen: e.at };
        const wasReview = c.fsrs.state === State.Review;
        c.fsrs = f.next(c.fsrs, new Date(e.at), e.grade as Grade).card;
        if (e.grade === 1 && wasReview) c.lapses++;
        if (e.ex === "type" && e.ok) c.needsTypedCheck = false;
        c.queuedAt = undefined;
        cards.set(e.k, c);
        break;
      }
      case "calibrate":
        if (c && c.fsrs.reps > 0) break; // already studied: calibration doesn't override real history
        cards.set(e.k, {
          k: e.k, fsrs: seededCard(e.at, e.due, CALIBRATED_STABILITY, 4, 1, 0),
          needsTypedCheck: true, lapses: 0, firstSeen: e.at,
        });
        break;
      case "import": {
        // SM-2 → FSRS: interval approximates stability; ease 250 ≈ difficulty 5, lower ease = harder.
        const difficulty = Math.min(10, Math.max(1, 5 + (250 - e.ease) / 24));
        const card = e.reps > 0
          ? seededCard(e.at, e.due, Math.max(0.5, e.interval), difficulty, e.reps, e.lapses)
          : createEmptyCard(new Date(e.at));
        cards.set(e.k, { k: e.k, fsrs: card, needsTypedCheck: e.calibrated && e.reps <= 1, lapses: e.lapses, firstSeen: e.at });
        break;
      }
      case "blitz-miss":
        if (c && c.fsrs.reps > 0 && c.fsrs.due.getTime() >= endOfStudyDay(e.at, roll)) {
          c.fsrs = { ...c.fsrs, due: new Date(e.at) };
        }
        break;
      case "queue":
        if (!c) cards.set(e.k, { k: e.k, fsrs: createEmptyCard(new Date(e.at)), needsTypedCheck: false, lapses: 0, queuedAt: e.at });
        else if (c.fsrs.state === State.New) c.queuedAt = e.at;
        break;
    }
  }
  return cards;
}

/** A card is due if its due time falls before the end of the current study day. */
export const isDue = (c: CardState, now: number, rolloverHour = DEFAULT_ROLLOVER) =>
  c.fsrs.state !== State.New && c.fsrs.due.getTime() < endOfStudyDay(now, rolloverHour);

/** Has she started this kanji (studied, calibrated or imported)? */
export const isStarted = (c: CardState | undefined) => !!c && c.fsrs.state !== State.New;

/** Days until the next review for each grade, for the buttons' small print. 0 = later today. */
export function preview(c: CardState | undefined, now: number, opts: SchedulerOptions = {}): Record<Grade, number> {
  const f = scheduler({ ...opts });
  const card: Card = c ? c.fsrs : createEmptyCard<Card>(new Date(now));
  const p = f.repeat(card, new Date(now));
  const days = (g: Grade) => Math.max(0, Math.round((p[g].card.due.getTime() - now) / 864e5));
  return { 1: 0, 2: days(2), 3: days(3), 4: days(4) };
}

/** Stage for the progress map: 0 unseen, 1 learning, 2 young (<21 d), 3 mature. */
export function stage(c: CardState | undefined): 0 | 1 | 2 | 3 {
  if (!c || c.fsrs.state === State.New) return 0;
  if (c.fsrs.state !== State.Review) return 1;
  return c.fsrs.stability >= 21 ? 3 : 2;
}

/** Calibration due date: spread 3–28 study days out so a batch doesn't land on one day. */
export function calibrationDue(at: number, rand: () => number, rolloverHour = DEFAULT_ROLLOVER): number {
  return addStudyDays(at, 3 + Math.floor(rand() * 26), rolloverHour) + 6 * 3600e3; // 10:00, well inside the day
}
