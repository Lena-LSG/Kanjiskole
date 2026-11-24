import { describe, expect, it } from "vitest";
import { calibrationDue, replay } from "../src/cards.ts";
import { maturity, planFor, readableWords, readingBreakdown, wordDifficulty } from "../src/curriculum.ts";
import { makeExercise } from "../src/exercises.ts";
import { seeded } from "../src/rng.ts";
import { data, id, local } from "./helpers.ts";

const d = data();
const w = (s: string) => d.word(s)!;
const rank = (j: number | null) => (j ? 5 - j : 5);

describe("curriculum order", () => {
  it("never introduces a kanji while a level two or more steps easier is unfinished (no N1 before N5)", () => {
    const total = [0, 0, 0, 0, 0, 0];
    for (const k of d.kanji) total[rank(k.j)]!++;
    const seen = [0, 0, 0, 0, 0, 0];
    for (const k of d.kanji) {
      for (let easier = 0; easier < rank(k.j) - 1; easier++) expect(seen[easier], `${k.k} (N${k.j})`).toBe(total[easier]);
      seen[rank(k.j)]!++;
    }
  });

  it("starts with N5 and N4 only", () => {
    expect(new Set(d.kanji.slice(0, 100).map((k) => k.j)).has(1)).toBe(false);
    expect(d.kanji.slice(0, 100).filter((k) => k.j === 5).length).toBeGreaterThan(70);
  });

  it("teaches parts before the kanji built from them", () => {
    for (const [part, whole] of [["言", "語"], ["口", "語"], ["木", "林"], ["日", "時"], ["木", "森"]] as const) {
      expect(d.pos(part), `${part} before ${whole}`).toBeLessThan(d.pos(whole));
    }
  });

  it("keeps the frequency rank in .i", () => {
    expect(d.get("日")!.i).toBe(0);
  });
});

describe("wordDifficulty", () => {
  it.each([
    ["時間", 0], ["学生", 0], ["会う", 0],
    ["学校", 1], ["手紙", 1],
    ["今日", 2], ["二十歳", 2], ["大人", 2],
  ] as const)("%s → %i", (word, level) => expect(wordDifficulty(w(word), d)).toBe(level));
});

describe("readableWords", () => {
  it("only allows words whose other kanji she knows", () => {
    const k = d.get("時")!;
    expect(readableWords(k, d, new Set()).map((x) => x.w)).not.toContain("時間");
    expect(readableWords(k, d, new Set(["間"])).map((x) => x.w)).toContain("時間");
  });
});

describe("planFor", () => {
  const at = local(2026, 11, 1);
  const known = new Set(d.kanji.slice(0, 300).map((k) => k.k));

  it("a new card gets plain, readable words, no typing, no fill, no look-alikes", () => {
    const k = d.get("十")!;
    const p = planFor(k, undefined, d, known);
    expect(p.maturity).toBe(0);
    expect(p.words.every((x) => wordDifficulty(x, d) === 0)).toBe(true);
    expect(p.words.map((x) => x.w)).not.toContain("二十歳");
    expect(p.weights.type ?? 0).toBe(0);
    expect(p.weights.fill ?? 0).toBe(0);
    expect(p.similar).toBe(false);
    for (let s = 0; s < 200; s++) expect(["type", "fill"]).not.toContain(makeExercise(k, d, seeded(s), p).kind);
  });

  it("a calibrated card is treated as established and may use hard words", () => {
    const c = replay([{ id: id(), t: "calibrate", k: "十", at, due: calibrationDue(at, seeded(1)) }]).get("十");
    expect(maturity(c)).toBe(2);
    const p = planFor(d.get("十")!, c, d, known);
    expect(p.similar).toBe(true);
    expect(p.weights.type).toBeGreaterThan(0);
  });

  it("falls back to kanji-only exercises when no word is readable yet", () => {
    const k = d.get("語")!;
    const p = planFor(k, undefined, d, new Set());
    for (const x of p.words) expect([...x.w].filter((c) => c !== "語" && /\p{Script=Han}/u.test(c))).toEqual([]);
    for (let s = 0; s < 100; s++) {
      const ex = makeExercise(k, d, seeded(s), p);
      if ("word" in ex) expect(p.words).toContain(ex.word);
    }
  });
});

describe("readingBreakdown", () => {
  const kinds = (s: string) => readingBreakdown(w(s), d).map((p) => `${p.text}:${p.reading}:${p.kind}${p.base ? "<" + p.base : ""}`);
  it("explains each part of the reading", () => {
    expect(kinds("時間")).toEqual(["時:じ:plain", "間:かん:plain"]);
    expect(kinds("手紙")).toEqual(["手:て:plain", "紙:がみ:rendaku<かみ"]);
    expect(kinds("学校")).toEqual(["学:がっ:sokuon<がく", "校:こう:plain"]);
    expect(kinds("今日")).toEqual(["今日:きょう:whole"]);
    expect(kinds("会う")).toEqual(["会:あ:plain", "う:う:kana"]);
  });
});
