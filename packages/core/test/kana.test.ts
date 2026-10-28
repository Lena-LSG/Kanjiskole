import { describe, expect, it } from "vitest";
import { normalizeAnswer, toHira, toKana } from "../src/kana.ts";

describe("toKana", () => {
  // The prototype's passing cases (handover §5).
  it.each([
    ["jikan", "じかん"], ["konnichiha", "こんにちは"], ["kanji", "かんじ"], ["honnou", "ほんのう"],
    ["gakkou", "がっこう"], ["kyou", "きょう"], ["shinbun", "しんぶん"], ["shinnbunn", "しんぶん"],
    ["benkyou", "べんきょう"], ["chotto", "ちょっと"], ["kin'en", "きんえん"],
  ])("%s → %s", (romaji, kana) => expect(toKana(romaji)).toBe(kana));

  it("accepts Kunrei forms", () => {
    expect(toKana("sinbun")).toBe("しんぶん");
    expect(toKana("tyotto")).toBe("ちょっと");
    expect(toKana("hutatu")).toBe("ふたつ");
  });
  it("handles tc as っ and n before consonants", () => {
    expect(toKana("matcha")).toBe("まっちゃ");
    expect(toKana("sanpo")).toBe("さんぽ");
    expect(toKana("hon")).toBe("ほん");
  });
  it("distinguishes ni from n+i via apostrophe", () => {
    expect(toKana("kani")).toBe("かに");
    expect(toKana("kan'i")).toBe("かんい");
  });
  it("normalises katakana input to hiragana", () => {
    expect(toKana("ジカン")).toBe("じかん");
    expect(toHira("テガミ")).toBe("てがみ");
  });
});

describe("normalizeAnswer", () => {
  it("ignores case, spaces and separators", () => {
    expect(normalizeAnswer(" Ji Kan ")).toBe("じかん");
    expect(normalizeAnswer("じ・かん")).toBe("じかん");
  });
});
