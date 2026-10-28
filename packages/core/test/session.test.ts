import { describe, expect, it } from "vitest";
import { replay } from "../src/cards.ts";
import type { KanjiEvent } from "../src/events.ts";
import { afterAnswer, afterIntro, buildSession, newKanji, newToday, preferredKind, requeue } from "../src/session.ts";
import { data, id, local } from "./helpers.ts";

const d = data();

describe("buildSession", () => {
  const now = local(2026, 10, 28, 22);
  // Eight cards, all due today, plus room for three new ones.
  const ks = d.kanji.slice(0, 8).map((k) => k.k);
  const log: KanjiEvent[] = ks.map((k, i) => ({ id: id(), t: "calibrate", k, at: local(2026, 9, 1), due: local(2026, 10, 1 + i) }));
  const cards = replay(log);

  it("puts due reviews oldest first, a new kanji after every 4th review", () => {
    const q = buildSession(cards, d, { now, newLimit: 3, style: "quiz" });
    expect(q.map((x) => x.t)).toEqual(["quiz", "quiz", "quiz", "quiz", "intro", "quiz", "quiz", "quiz", "quiz", "intro", "intro"]);
    expect(q.filter((x) => x.t === "quiz").map((x) => x.k)).toEqual(ks);
    expect(q.filter((x) => x.t === "intro").map((x) => x.k)).toEqual(d.kanji.slice(8, 11).map((k) => k.k));
  });

  it("uses flashcards for everything in flash style", () => {
    expect(new Set(buildSession(cards, d, { now, newLimit: 2, style: "flash" }).map((x) => x.t))).toEqual(new Set(["flash"]));
  });

  it("only new cards for the extra button", () => {
    expect(buildSession(cards, d, { now, newLimit: 5, style: "quiz", onlyNew: true })).toHaveLength(5);
  });

  it("forces a typed check on calibrated cards", () => {
    expect(preferredKind(cards.get(ks[0]!), true)).toBe("type");
    expect(preferredKind(cards.get(ks[0]!), false)).toBeUndefined();
  });
});

describe("queue mechanics", () => {
  const q = ["a", "b", "c", "d", "e"].map((k) => ({ k, t: "quiz" as const }));
  it("requeues three back", () => {
    expect(requeue(q, { k: "x", t: "quiz" }).map((x) => x.k)).toEqual(["a", "b", "c", "x", "d", "e"]);
    expect(requeue(q.slice(0, 1), { k: "x", t: "quiz" }).map((x) => x.k)).toEqual(["a", "x"]);
  });
  it("misses come back, hits leave", () => {
    expect(afterAnswer(q, true).map((x) => x.k)).toEqual(["b", "c", "d", "a", "e"]);
    expect(afterAnswer(q, false).map((x) => x.k)).toEqual(["b", "c", "d", "e"]);
  });
  it("an intro becomes a quiz three cards later", () => {
    const out = afterIntro([{ k: "n", t: "intro" }, ...q]);
    expect(out[3]).toEqual({ k: "n", t: "quiz", fresh: true });
  });
});

describe("new cards", () => {
  it("counts kanji first answered this study day, including at 01:30", () => {
    const log: KanjiEvent[] = [
      { id: id(), t: "review", k: "日", at: local(2026, 10, 28, 20), ex: "read", ok: true, grade: 3 },
      { id: id(), t: "review", k: "一", at: local(2026, 10, 29, 1, 30), ex: "read", ok: true, grade: 3 },
      { id: id(), t: "review", k: "国", at: local(2026, 10, 27, 20), ex: "read", ok: true, grade: 3 },
    ];
    expect(newToday(log, local(2026, 10, 29, 2))).toBe(2);
  });
  it("puts queued kanji first", () => {
    const cards = replay([{ id: id(), t: "queue", k: "鬱", at: 1 }]);
    expect(newKanji(cards, d, 2)).toEqual(["鬱", d.kanji[0]!.k]);
  });
});
