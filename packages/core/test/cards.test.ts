import { describe, expect, it } from "vitest";
import { calibrationDue, isDue, preview, replay, stage, State } from "../src/cards.ts";
import { endOfStudyDay } from "../src/day.ts";
import { mergeLogs, type KanjiEvent, type ReviewEvent } from "../src/events.ts";
import { seeded } from "../src/rng.ts";
import { id, local } from "./helpers.ts";

const review = (k: string, at: number, grade: 1 | 2 | 3 | 4, extra: Partial<ReviewEvent> = {}): ReviewEvent =>
  ({ id: id(), t: "review", k, at, ex: "read", ok: grade > 1, grade, ...extra });

describe("replay", () => {
  it("is deterministic and independent of input order", () => {
    const log: KanjiEvent[] = [review("日", local(2026, 10, 1), 3), review("日", local(2026, 10, 2), 3), review("日", local(2026, 10, 6), 1)];
    const a = replay(log).get("日")!;
    const b = replay([...log].reverse()).get("日")!;
    expect(a.fsrs).toEqual(b.fsrs);
    expect(a.lapses).toBe(1);
  });

  it("calibrated cards start known, due weeks out, and need a typed check", () => {
    const at = local(2026, 10, 28, 22);
    const c = replay([{ id: id(), t: "calibrate", k: "人", at, due: calibrationDue(at, seeded(1)) }]).get("人")!;
    expect(c.fsrs.state).toBe(State.Review);
    expect(c.needsTypedCheck).toBe(true);
    const days = (c.fsrs.due.getTime() - at) / 864e5;
    expect(days).toBeGreaterThan(2);
    expect(days).toBeLessThan(29);
    expect(stage(c)).toBe(3);
  });

  it("a correct typed answer clears the typed check; other exercises don't", () => {
    const at = local(2026, 10, 1);
    const cal: KanjiEvent = { id: id(), t: "calibrate", k: "人", at, due: at + 21 * 864e5 };
    expect(replay([cal, review("人", at + 22 * 864e5, 3)]).get("人")!.needsTypedCheck).toBe(true);
    expect(replay([cal, review("人", at + 22 * 864e5, 3, { ex: "type" })]).get("人")!.needsTypedCheck).toBe(false);
  });

  it("calibration never overrides real history", () => {
    const at = local(2026, 10, 1);
    const c = replay([review("人", at, 1), { id: id(), t: "calibrate", k: "人", at: at + 1000, due: at + 30 * 864e5 }]).get("人")!;
    expect(c.needsTypedCheck).toBe(false);
    expect(c.fsrs.reps).toBe(1);
  });

  it("a blitz miss pulls a known card into today, without counting as a review", () => {
    const at = local(2026, 10, 1);
    const blitzAt = local(2026, 10, 3, 1, 30); // 01:30 belongs to 2 October
    const base = [review("年", at, 3), review("年", at + 864e5, 3)];
    const before = replay(base).get("年")!;
    expect(isDue(before, blitzAt)).toBe(false);
    const after = replay([...base, { id: id(), t: "blitz-miss", k: "年", at: blitzAt }]).get("年")!;
    expect(isDue(after, blitzAt)).toBe(true);
    expect(after.fsrs.reps).toBe(before.fsrs.reps);
    expect(after.fsrs.due.getTime()).toBeLessThan(endOfStudyDay(blitzAt));
  });

  it("a blitz miss on an unstarted kanji does nothing", () => {
    expect(replay([{ id: id(), t: "blitz-miss", k: "鬱", at: local(2026, 10, 1) }]).has("鬱")).toBe(false);
  });

  it("queue events put a kanji in the new queue until it is studied", () => {
    const at = local(2026, 10, 1);
    expect(replay([{ id: id(), t: "queue", k: "鬱", at }]).get("鬱")!.queuedAt).toBe(at);
    expect(replay([{ id: id(), t: "queue", k: "鬱", at }, review("鬱", at + 1, 3)]).get("鬱")!.queuedAt).toBeUndefined();
  });
});

describe("sync", () => {
  it("merging logs from two devices never duplicates, and replays the same (airplane-mode check)", () => {
    const at = local(2026, 10, 28, 23);
    const synced = [review("日", at - 864e5, 3)];
    const offline = [...synced, review("日", at, 3), review("一", at + 60e3, 1)];
    const merged = mergeLogs(mergeLogs(synced, offline), offline);
    expect(merged).toHaveLength(3);
    expect(replay(merged).get("日")!.fsrs).toEqual(replay(offline).get("日")!.fsrs);
  });
});

describe("preview", () => {
  it("orders the grades: hard ≤ good ≤ easy", () => {
    const at = local(2026, 10, 1);
    const c = replay([review("日", at, 3), review("日", at + 3 * 864e5, 3)]).get("日")!;
    const p = preview(c, at + 10 * 864e5);
    expect(p[1]).toBe(0);
    expect(p[2]).toBeLessThanOrEqual(p[3]);
    expect(p[3]).toBeLessThanOrEqual(p[4]);
  });
});
