import { describe, expect, it } from "vitest";
import { buildSession, newToday } from "../src/session.ts";
import { blitzPool } from "../src/blitz.ts";
import { replay } from "../src/cards.ts";
import type { KanjiEvent } from "../src/events.ts";
import { areConfusable, dueKana, judgeKana, KANA, kanaItem, kanaProgress, makeKanaExercise, newKana } from "../src/kana-track.ts";
import { normalizeReading, toKana } from "../src/kana.ts";
import { seeded } from "../src/rng.ts";
import { stageCounts, weakest } from "../src/stats.ts";
import { data, id, local } from "./helpers.ts";

const d = data();

describe("kana inventory", () => {
  it("has the full sets per script", () => {
    const count = (script: string, group: string) => KANA.filter((x) => x.script === script && x.group === group).length;
    for (const s of ["hira", "kata"]) {
      expect(count(s, "basic")).toBe(46);
      expect(count(s, "dakuten")).toBe(25);
      expect(count(s, "yoon")).toBe(33);
    }
    expect(count("kata", "extended")).toBe(7);
    expect(new Set(KANA.map((x) => x.k)).size).toBe(KANA.length);
  });

  it("every romaji types back to its kana (and every alternative too)", () => {
    for (const x of KANA) {
      // ぢ/づ are ji/zu in Hepburn, which type as じ/ず; their alternatives di/du type them directly.
      const typesBack = [x.r, ...(x.alt ?? [])].some((r) => normalizeReading(toKana(r)) === normalizeReading(x.k));
      expect(typesBack, `${x.k} ${x.r}`).toBe(true);
      expect(judgeKana(x.r, x).ok).toBe(true);
      for (const a of x.alt ?? []) expect(judgeKana(a, x).ok, `${x.k} ${a}`).toBe(true);
    }
  });

  it("teaches hiragana before katakana, basic before dakuten before yōon", () => {
    const pos = (k: string) => kanaItem(k)!.i;
    expect(pos("あ")).toBe(0);
    expect(pos("ん")).toBeLessThan(pos("が"));
    expect(pos("ぽ")).toBeLessThan(pos("きゃ"));
    expect(pos("ぴょ")).toBeLessThan(pos("ア"));
  });
});

describe("judgeKana", () => {
  const shi = kanaItem("し")!, wo = kanaItem("を")!, fa = kanaItem("ファ")!;
  it("accepts Hepburn, Kunrei, alternatives and kana in either script", () => {
    for (const ok of ["shi", "si", "SHI", "し", "シ"]) expect(judgeKana(ok, shi).ok, ok).toBe(true);
    expect(judgeKana("o", wo).ok).toBe(true);
    expect(judgeKana("fa", fa).ok).toBe(true);
  });
  it("rejects wrong answers", () => {
    expect(judgeKana("tsu", shi).ok).toBe(false);
    expect(judgeKana("", shi).ok).toBe(false);
  });
});

describe("kana listening", () => {
  it("is only offered with a Japanese voice, and its options are kana", () => {
    const a = kanaItem("あ")!;
    const kinds = (audio: boolean) => new Set(Array.from({ length: 300 }, (_, s) => makeKanaExercise(a, undefined, seeded(s), { audio }).kind));
    expect(kinds(false).has("kana-listen")).toBe(false);
    expect(kinds(true).has("kana-listen")).toBe(true);
    for (let s = 0; s < 100; s++) {
      const ex = makeKanaExercise(a, undefined, seeded(s), { audio: true });
      if (ex.kind === "kana-listen") expect(ex.options.every((o) => kanaItem(o.label))).toBe(true);
    }
  });
});

describe("areConfusable", () => {
  it("knows the real pairs and nothing else", () => {
    expect(areConfusable("シ", "ツ")).toBe(true);
    expect(areConfusable("ソ", "ン")).toBe(true);
    expect(areConfusable("い", "お")).toBe(false);
  });
});

describe("kana exercises", () => {
  it("always one right option of four, all distinct, never a same-sound kana as distractor", () => {
    for (const x of KANA) {
      for (let s = 0; s < 4; s++) {
        const ex = makeKanaExercise(x, undefined, seeded(s * 31 + x.i));
        if (ex.kind === "kana-type") continue;
        expect(ex.options.filter((o) => o.ok)).toHaveLength(1);
        expect(new Set(ex.options.map((o) => o.label)).size).toBe(4);
        if (ex.kind === "kana-pick") for (const o of ex.options) if (!o.ok) expect(kanaItem(o.label)!.r).not.toBe(x.r);
      }
    }
  });
  it("new kana are never typed and never get the confusable as distractor", () => {
    const shi = kanaItem("シ")!;
    for (let s = 0; s < 300; s++) {
      const ex = makeKanaExercise(shi, undefined, seeded(s));
      expect(ex.kind).not.toBe("kana-type");
      if (ex.kind === "kana-pick") expect(ex.options.map((o) => o.label)).not.toContain("ツ");
    }
  });
});

describe("the tracks stay apart", () => {
  const at = local(2026, 11, 1, 20);
  const log: KanjiEvent[] = [
    ...["あ", "い", "う", "え", "お"].map((k, i) => ({ id: id(), t: "review" as const, k, at: at + i, ex: "kana-read" as const, ok: true, grade: 3 as const })),
    { id: id(), t: "review", k: "日", at: at + 10, ex: "read", ok: true, grade: 3 },
  ];
  const cards = replay(log);
  const later = at + 30 * 864e5;

  it("kanji sessions, blitz and stats ignore kana cards", () => {
    expect(buildSession(cards, d, { now: later, newLimit: 0, style: "quiz" }).map((x) => x.k)).toEqual(["日"]);
    expect(stageCounts(cards, d.kanji.length).unseen).toBe(d.kanji.length - 1);
    expect(weakest(cards, later).map((w) => w.k)).toEqual(["日"]);
    expect(blitzPool(cards, d).every((p) => d.get(p.k))).toBe(true);
  });

  it("each track counts its own new cards", () => {
    expect(newToday(log, at + 3600e3, 4, (k) => !!d.get(k))).toBe(1);
    expect(newToday(log, at + 3600e3, 4, (k) => !!kanaItem(k))).toBe(5);
  });

  it("kana sessions see only kana", () => {
    expect(dueKana(cards, later)).toEqual(["あ", "い", "う", "え", "お"]);
    expect(newKana(cards, 3)).toEqual(["か", "き", "く"]);
    expect(newKana(cards, 2, "kata")).toEqual(["ア", "イ"]);
    expect(kanaProgress(cards, "hira").started).toBe(5);
  });

  it("calibrated kana are started but not solid until checked", () => {
    const cal = replay([{ id: id(), t: "calibrate", k: "あ", at, due: at + 21 * 864e5 }]);
    expect(kanaProgress(cal, "hira")).toMatchObject({ started: 1, solid: 0 });
  });
});
