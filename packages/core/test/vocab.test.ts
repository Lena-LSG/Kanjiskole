import { describe, expect, it } from "vitest";
import { replay } from "../src/cards.ts";
import { validReadings } from "../src/data.ts";
import type { KanjiEvent } from "../src/events.ts";
import { buildSession } from "../src/session.ts";
import { seeded } from "../src/rng.ts";
import { stageCounts, weakest } from "../src/stats.ts";
import { dueWords, makeWordExercise, newWords, unlockedWords, vocabOrder, wordKey, wordOf } from "../src/vocab.ts";
import { data, id, local } from "./helpers.ts";

const d = data();

describe("vocabulary order and unlocking", () => {
  it("only glossed words of two or more characters, N5 before N1", () => {
    const o = vocabOrder(d);
    expect(o.every((w) => w.g && [...w.w].length >= 2)).toBe(true);
    const firstN1 = o.findIndex((w) => w.j === 1), lastN5 = o.map((w) => w.j).lastIndexOf(5);
    expect(lastN5).toBeLessThan(firstN1);
  });

  it("a word unlocks only when every kanji in it is known", () => {
    expect(unlockedWords(d, new Set(["時"])).map((w) => w.w)).not.toContain("時間");
    expect(unlockedWords(d, new Set(["時", "間"])).map((w) => w.w)).toContain("時間");
    expect(unlockedWords(d, new Set()).length).toBe(0);
  });

  it("keys never collide with kanji cards", () => {
    expect(wordKey("時間")).toBe("w:時間");
    expect(wordOf("w:時間", d)?.r).toBe("じかん");
    expect(wordOf("時", d)).toBeUndefined();
  });
});

describe("word exercises", () => {
  const known = new Set(d.kanji.slice(0, 400).map((k) => k.k));
  const words = unlockedWords(d, known).slice(0, 300);

  it("one right option of four, all distinct, for every unlocked word", () => {
    for (const w of words) {
      const ex = makeWordExercise(w, undefined, d, seeded(w.w.length * 97));
      if (!("options" in ex)) continue;
      expect(ex.options.filter((o) => o.ok)).toHaveLength(1);
      expect(new Set(ex.options.map((o) => o.label)).size).toBe(4);
    }
  });

  it("listening is only offered with a voice and never offers a homophone", () => {
    const kinds = (audio: boolean) => new Set(Array.from({ length: 200 }, (_, s) => makeWordExercise(d.word("時間")!, undefined, d, seeded(s), { audio }).kind));
    expect(kinds(false).has("word-listen")).toBe(false);
    expect(kinds(true).has("word-listen")).toBe(true);
    for (const w of words.slice(0, 150)) {
      const ex = makeWordExercise(w, undefined, d, seeded(w.w.length), { audio: true });
      if (ex.kind !== "word-listen") continue;
      for (const o of ex.options) if (!o.ok) expect(validReadings(d.word(o.label)!).has(w.r), `${w.w}: ${o.label}`).toBe(false);
    }
  });

  it("new words are never typed or spelled", () => {
    for (let s = 0; s < 200; s++) expect(["word-type", "word-spell"]).not.toContain(makeWordExercise(d.word("時間")!, undefined, d, seeded(s)).kind);
  });

  it("a wrong spelling is never a real word with the same reading", () => {
    const at = local(2026, 11, 1);
    const established = replay([{ id: id(), t: "calibrate", k: "w:時間", at, due: at + 864e5 }]).get("w:時間");
    for (const w of words.slice(0, 120)) {
      for (let s = 0; s < 3; s++) {
        const ex = makeWordExercise(w, established, d, seeded(s));
        if (ex.kind !== "word-spell") continue;
        for (const o of ex.options) if (!o.ok) {
          const real = d.word(o.label);
          expect(real ? validReadings(real).has(w.r) : false, `${w.w}: ${o.label}`).toBe(false);
        }
      }
    }
  });
});

describe("the vocabulary track stays apart", () => {
  const at = local(2026, 11, 1, 20);
  const log: KanjiEvent[] = [
    { id: id(), t: "review", k: "日", at, ex: "read", ok: true, grade: 3 },
    { id: id(), t: "review", k: "w:毎日", at: at + 1, ex: "word-read", ok: true, grade: 3 },
  ];
  const cards = replay(log);
  const later = at + 30 * 864e5;
  it("kanji sessions and stats ignore word cards; the word track sees only words", () => {
    expect(buildSession(cards, d, { now: later, newLimit: 0, style: "quiz" }).map((x) => x.k)).toEqual(["日"]);
    expect(stageCounts(cards, d.kanji.length).unseen).toBe(d.kanji.length - 1);
    expect(weakest(cards, later).map((w) => w.k)).toEqual(["日"]);
    expect(dueWords(cards, later)).toEqual(["w:毎日"]);
    expect(newWords(cards, d, new Set(["日", "毎"]), 5)).not.toContain("w:毎日");
  });
});
