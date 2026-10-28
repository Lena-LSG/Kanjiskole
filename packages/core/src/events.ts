// Progress is an append-only log of events. Card state is derived by replaying it (see cards.ts), so syncing
// is a union of logs keyed by id, with nothing to merge and nothing to duplicate.

export const EXERCISES = ["mean", "which", "fill", "read", "type", "flash"] as const;
export type ExerciseKind = (typeof EXERCISES)[number];

/** FSRS grades: 1 Again, 2 Hard, 3 Good, 4 Easy. */
export type Grade = 1 | 2 | 3 | 4;

interface Base {
  /** Client-generated UUID; the sync key. */
  id: string;
  /** Epoch ms. */
  at: number;
  k: string;
}

export interface ReviewEvent extends Base {
  t: "review";
  ex: ExerciseKind;
  ok: boolean;
  grade: Grade;
  word?: string;
  answer?: string;
  ms?: number;
  /** Where it was answered. "chat" is a review recorded through the MCP server. */
  via?: "app" | "blitz" | "chat";
}

/** She tapped it in calibration: scheduled as known, first check is a typed reading. */
export interface CalibrateEvent extends Base {
  t: "calibrate";
  /** Chosen when the event is created (3–28 days out), so replay is deterministic. */
  due: number;
}

/** Missed in blitz: pulled into today's reviews. Not a review. */
export interface BlitzMissEvent extends Base {
  t: "blitz-miss";
}

/** A card carried over from the prototype's SM-2 state. */
export interface ImportEvent extends Base {
  t: "import";
  due: number;
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  calibrated: boolean;
}

/** Put a kanji at the front of the new queue. */
export interface QueueEvent extends Base {
  t: "queue";
}

export type KanjiEvent = ReviewEvent | CalibrateEvent | BlitzMissEvent | ImportEvent | QueueEvent;

/** Replay order: time, then id so that equal timestamps still replay identically on every device. */
export const byTime = (a: KanjiEvent, b: KanjiEvent) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Union two logs by id. */
export function mergeLogs(a: readonly KanjiEvent[], b: readonly KanjiEvent[]): KanjiEvent[] {
  const m = new Map<string, KanjiEvent>();
  for (const e of a) m.set(e.id, e);
  for (const e of b) if (!m.has(e.id)) m.set(e.id, e);
  return [...m.values()].sort(byTime);
}
