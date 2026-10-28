import { describe, expect, it } from "vitest";
import { explainKanjiChoice, explainReading } from "../src/explain.ts";
import { judgeTyped } from "../src/judge.ts";
import { data } from "./helpers.ts";

const d = data();
const w = (s: string) => d.word(s)!;

describe("judgeTyped", () => {
  it("accepts romaji and kana", () => {
    expect(judgeTyped("jikan", w("時間"))).toMatchObject({ ok: true, how: "exact" });
    expect(judgeTyped("ジカン", w("時間"))).toMatchObject({ ok: true, how: "exact" });
  });
  it("accepts other JMdict readings of the spelling", () => {
    expect(judgeTyped("nippon", w("日本"))).toMatchObject({ ok: true, how: "alternative" });
    expect(judgeTyped("asu", w("明日"))).toMatchObject({ ok: true, how: "alternative" });
  });
  it("rejects a reading only seen inside a longer word", () => {
    expect(judgeTyped("tokiaka", w("説明")).ok).toBe(false);
  });
  it("rejects wrong answers", () => {
    expect(judgeTyped("jikann", w("時間")).ok).toBe(true); // nn is ん
    expect(judgeTyped("jika", w("時間"))).toMatchObject({ ok: false, got: "じか" });
  });
});

describe("explainReading", () => {
  it("rendaku", () => expect(explainReading("てかみ", w("手紙"), d)).toMatchObject({ code: "rendaku", kanji: "紙", correct: "がみ", missed: true }));
  it("not rendaku when the voiced form is the kanji's own reading", () =>
    expect(explainReading("いちと", w("一度"), d)).toMatchObject({ code: "other-reading", kanji: "度", used: "と", correct: "ど" }));
  it("long vowel", () => expect(explainReading("ゆめい", w("有名"), d)).toMatchObject({ code: "long-vowel", missed: true }));
  it("sokuon", () => expect(explainReading("がこう", w("学校"), d)).toMatchObject({ code: "sokuon", missed: true }));
  it("another reading of the kanji", () =>
    expect(explainReading("なまかつ", w("生活"), d)).toMatchObject({ code: "other-reading", kanji: "生", used: "なま", correct: "せい", usedIsOn: false }));
  it("unknown slips stay unexplained", () => expect(explainReading("ばなな", w("時間"), d)).toBeNull());
  it("look-alike kanji", () => expect(explainKanjiChoice("未", "末", d)).toMatchObject({ code: "lookalike", chosen: "未", target: "末" }));
});
