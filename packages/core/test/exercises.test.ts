import { describe, expect, it } from "vitest";
import { availableKinds, makeExercise } from "../src/exercises.ts";
import { seeded } from "../src/rng.ts";
import { data } from "./helpers.ts";

const d = data();

describe("makeExercise", () => {
  it("builds every supported kind for every kanji, with exactly one right option", () => {
    for (const k of d.kanji) {
      for (const kind of availableKinds(k, d)) {
        const ex = makeExercise(k, d, seeded(k.i), { prefer: kind });
        expect(ex.kind).toBe(kind);
        if ("options" in ex) {
          expect(ex.options.filter((o) => o.ok)).toHaveLength(1);
          expect(new Set(ex.options.map((o) => o.label)).size).toBe(ex.options.length);
          expect(ex.options.length).toBe(4);
        }
      }
    }
  });

  it("fill: a wrong kanji never completes another real word", () => {
    for (const k of d.kanji) {
      if (!availableKinds(k, d).includes("fill")) continue;
      const ex = makeExercise(k, d, seeded(k.i + 1), { prefer: "fill" });
      if (ex.kind !== "fill") throw new Error("expected fill");
      for (const o of ex.options) if (!o.ok) expect(d.word(ex.word.w.replaceAll(k.k, o.label))).toBeUndefined();
    }
  });

  it("never picks type when noType is set (blitz)", () => {
    const k = d.get("時")!;
    for (let s = 0; s < 200; s++) expect(makeExercise(k, d, seeded(s), { noType: true }).kind).not.toBe("type");
  });

  it("roughly follows the weights mean 3, which 2, read 3, type 2, fill 3", () => {
    const k = d.get("時")!;
    const n: Record<string, number> = {};
    const rng = seeded(42);
    for (let s = 0; s < 13000; s++) { const kind = makeExercise(k, d, rng).kind; n[kind] = (n[kind] ?? 0) + 1; }
    for (const [kind, wt] of Object.entries({ mean: 3, which: 2, read: 3, type: 2, fill: 3 })) {
      expect(n[kind]! / 1000).toBeGreaterThan(wt * 0.85);
      expect(n[kind]! / 1000).toBeLessThan(wt * 1.15);
    }
  });
});
