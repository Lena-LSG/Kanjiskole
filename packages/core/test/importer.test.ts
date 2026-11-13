import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isDue, replay, State } from "../src/cards.ts";
import { mergeLogs } from "../src/events.ts";
import { importPrototype, parsePrototype } from "../src/importer.ts";
import { data, local } from "./helpers.ts";

const d = data();
const fixture = JSON.parse(readFileSync(new URL("./fixtures/prototype-progress.json", import.meta.url), "utf8")) as unknown;

describe("importPrototype (a real prototype export, 28 Oct 2026)", () => {
  const res = importPrototype(fixture, (k) => !!d.get(k), local(2026, 10, 28, 23));

  it("imports all ten cards with deterministic ids", () => {
    expect(res.events).toHaveLength(10);
    expect(res.skipped).toEqual([]);
    expect(res.events.map((e) => e.id)).toContain("import:日");
  });

  it("keeps settings, blitz best and daily counts", () => {
    expect(res.settings).toEqual({ newPerDay: 10, reviewStyle: "quiz" });
    expect(res.blitzBest).toBe(0);
    expect(res.legacyDays).toEqual([{ day: "2026-10-28", newKanji: 10, reviews: 10 }]);
  });

  it("schedules them for tomorrow, as the prototype did", () => {
    const cards = replay(res.events);
    const c = cards.get("日")!;
    expect(c.fsrs.state).toBe(State.Review);
    expect(isDue(c, local(2026, 10, 28, 23))).toBe(false);
    expect(isDue(c, local(2026, 10, 29, 9))).toBe(true);
  });

  it("is idempotent", () => {
    const again = importPrototype(fixture, (k) => !!d.get(k), local(2026, 10, 30));
    expect(mergeLogs(res.events, again.events)).toHaveLength(10);
  });

  it("rejects things that aren't an export", () => {
    expect(() => parsePrototype({ cards: {} })).toThrow();
    expect(() => parsePrototype(null)).toThrow();
  });
});
