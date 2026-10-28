import { describe, expect, it } from "vitest";
import { replay } from "../src/cards.ts";
import type { KanjiEvent } from "../src/events.ts";
import { blitzVerdict, scoreAnswer } from "../src/blitz.ts";
import { perDay, retention, streak, weakest } from "../src/stats.ts";
import { id, local } from "./helpers.ts";

const r = (k: string, at: number, ok: boolean, via?: "blitz"): KanjiEvent =>
  ({ id: id(), t: "review", k, at, ex: "read", ok, grade: ok ? 3 : 1, ...(via ? { via } : {}) });

describe("stats", () => {
  const log = [
    r("日", local(2026, 10, 27, 21), true),
    r("日", local(2026, 10, 29, 1, 30), false), // counts for 28 October
    r("一", local(2026, 10, 29, 1, 40), true),
    r("一", local(2026, 10, 29, 1, 45), true, "blitz"),
  ];
  it("a 01:30 session counts toward the previous day (acceptance check)", () => {
    expect(perDay(log)).toEqual([
      { day: "2026-10-27", reviews: 1, correct: 1, newKanji: 1 },
      { day: "2026-10-28", reviews: 2, correct: 1, newKanji: 1 },
    ]);
  });
  it("retention ignores first sightings and blitz", () => expect(retention(log)).toBe(0));
  it("streak", () => expect(streak(log, local(2026, 10, 29, 2))).toBe(2));
  it("weakest puts failed cards first", () => {
    expect(weakest(replay(log), local(2026, 10, 29, 2))[0]!.k).toBe("日");
  });
});

describe("blitz", () => {
  it("doubles from the third in a row", () => {
    let s = { score: 0, streak: 0 };
    for (const ok of [true, true, true, true, false, true]) s = scoreAnswer(s, ok);
    expect(s.score).toBe(1 + 1 + 2 + 2 + 1);
  });
  it("verdicts", () => {
    expect(blitzVerdict(31, 30)).toBe("record");
    expect(blitzVerdict(25, 30)).toBe("close");
    expect(blitzVerdict(10, 30)).toBe("off");
  });
});
