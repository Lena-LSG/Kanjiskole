import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validReadings } from "../src/data.ts";
import { lookalikes, mutate, readingOptions, swapReadings } from "../src/distractors.ts";
import { seeded } from "../src/rng.ts";
import { data } from "./helpers.ts";

const d = data();
const w = (s: string) => d.word(s)!;

describe("readingOptions", () => {
  it("never offers a valid reading as a distractor, over every word (acceptance check)", () => {
    for (const word of d.words) {
      for (const seed of [1, 2, 3]) {
        const opts = readingOptions(word, d, seeded(seed * 7919 + word.w.length));
        const valid = validReadings(word);
        expect(opts.filter((o) => o === word.r)).toHaveLength(1);
        for (const o of opts) if (o !== word.r) expect(valid.has(o), `${word.w}: ${o}`).toBe(false);
        expect(new Set(opts).size).toBe(opts.length);
      }
    }
  });

  it("gives four options for every word", () => {
    const short = d.words.filter((word) => readingOptions(word, d, seeded(5)).length < 4);
    expect(short.map((x) => x.w)).toEqual([]);
  });

  it("property: arbitrary seeds keep the rule", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: d.words.length - 1 }), fc.integer(), (i, seed) => {
      const word = d.words[i]!;
      const valid = validReadings(word);
      return readingOptions(word, d, seeded(seed)).every((o) => o === word.r || !valid.has(o));
    }), { numRuns: 2000 });
  });

  it("never offers にっぽん against にほん", () => {
    for (let s = 0; s < 200; s++) expect(readingOptions(w("日本"), d, seeded(s))).not.toContain("にっぽん");
  });
});

describe("swapReadings", () => {
  it("swaps one kanji's reading using the furigana", () => {
    const swaps = swapReadings(w("有名"), d, seeded(1));
    expect(swaps).toContain("うめい");
    expect(swaps).toContain("ゆうみょう");
    expect(swaps).not.toContain("ゆうめい");
  });
});

describe("mutate", () => {
  it("makes one realistic slip", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 300; s++) seen.add(mutate("がっこう", seeded(s))!);
    expect(seen).toContain("がこう"); // dropped っ
    expect(seen).toContain("がっこ"); // dropped long vowel
    expect(seen).toContain("かっこう"); // voicing
  });
  it("never adds a long vowel before ん or っ", () => {
    for (let s = 0; s < 300; s++) expect(mutate("ほん", seeded(s))).not.toBe("ほうん");
  });
});

describe("lookalikes", () => {
  it("finds the real confusables", () => {
    const k = d.get("末")!;
    const hits = new Set<string>();
    for (let s = 0; s < 50; s++) for (const o of lookalikes(k, d, seeded(s))) hits.add(o.k);
    expect(hits).toContain("未");
    expect(d.get("土")!.sim.slice(0, 4)).toContain("士");
  });
  it("returns three distinct kanji with distinct first meanings, never the target", () => {
    for (const k of d.kanji) {
      const out = lookalikes(k, d, seeded(k.i));
      expect(out).toHaveLength(3);
      expect(out.map((o) => o.k)).not.toContain(k.k);
      expect(new Set([k, ...out].map((o) => o.m[0]!.toLowerCase())).size).toBe(4);
    }
  });
});
