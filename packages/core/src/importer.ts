// Import progress from the prototype (kanjiskole.html, localStorage key "kanjiskole-v1" or its artifact DB doc).
import type { ImportEvent } from "./events.ts";

/** cards[k] = [due, interval, ease, reps, lapses, calibrated?]; due is a prototype day number. */
export interface PrototypeState {
  v: 1;
  u?: number;
  cards: Record<string, [number, number, number, number, number, (0 | 1)?]>;
  perDay?: number;
  calPos?: number;
  log?: Record<string, { n: number; r: number }>;
  style?: "quiz" | "flash";
  best?: number;
}

export interface ImportResult {
  events: ImportEvent[];
  settings: { newPerDay?: number; reviewStyle?: "quiz" | "flash" };
  blitzBest: number;
  /** Daily counts the prototype kept; there are no individual reviews to recreate. */
  legacyDays: { day: string; newKanji: number; reviews: number }[];
  skipped: string[];
}

/** Prototype day number → 10:00 local time on that calendar date (well inside the study day). */
export function prototypeDayToTime(day: number): number {
  const d = new Date(day * 864e5); // UTC midnight of the date the prototype meant
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 10).getTime();
}

export function parsePrototype(json: unknown): PrototypeState {
  const s = json as PrototypeState;
  if (!s || typeof s !== "object" || s.v !== 1 || typeof s.cards !== "object" || s.cards === null) {
    throw new Error("Not a Kanjiskole prototype export (expected { v: 1, cards: {…} })");
  }
  return s;
}

/**
 * Turns the prototype's SM-2 cards into import events. Event ids are deterministic ("import:<kanji>"),
 * so importing the same file twice changes nothing.
 */
export function importPrototype(json: unknown, isKnown: (k: string) => boolean, now: number = Date.now()): ImportResult {
  const s = parsePrototype(json);
  const at = s.u && s.u <= now ? s.u : now;
  const events: ImportEvent[] = [];
  const skipped: string[] = [];
  for (const [k, c] of Object.entries(s.cards)) {
    if (!isKnown(k) || !Array.isArray(c) || c.length < 5 || !c.slice(0, 5).every((x) => Number.isFinite(x))) {
      skipped.push(k);
      continue;
    }
    const [due, interval, ease, reps, lapses, cal] = c;
    events.push({
      id: `import:${k}`, t: "import", k, at,
      due: prototypeDayToTime(due), interval, ease, reps, lapses, calibrated: cal === 1,
    });
  }
  return {
    events,
    settings: {
      ...(s.perDay ? { newPerDay: s.perDay } : {}),
      ...(s.style ? { reviewStyle: s.style } : {}),
    },
    blitzBest: s.best ?? 0,
    legacyDays: Object.entries(s.log ?? {}).map(([day, d]) => ({ day, newKanji: d.n, reviews: d.r })),
    skipped,
  };
}
