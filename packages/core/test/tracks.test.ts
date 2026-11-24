import { describe, expect, it } from "vitest";
import { replay } from "../src/cards.ts";
import type { KanjiEvent } from "../src/events.ts";
import { KANA } from "../src/kana-track.ts";
import { leeches, perDay, retention, weakest } from "../src/stats.ts";
import { extraNew, inTrack, kanaChart, missingKanji, stagesOf, trackOf, vocabLevels, wordStatus } from "../src/tracks.ts";
import { vocabOrder, wordKey } from "../src/vocab.ts";
import { data, id, local } from "./helpers.ts";

const d = data();
const r = (k: string, at: number, ok = true): KanjiEvent => ({ id: id(), t: "review", k, at, ex: "read", ok, grade: ok ? 3 : 1 });

describe("tracks", () => {
  it("every key belongs to exactly one track", () => {
    expect([trackOf("日"), trackOf("あ"), trackOf("キャ"), trackOf("w:時間")]).toEqual(["kanji", "kana", "kana", "words"]);
  });

  it("extra new cards: absent means a normal session, anything else is clamped to 1–30", () => {
    expect(extraNew(undefined)).toBeNull();
    expect([extraNew("5"), extraNew("9999"), extraNew("-3"), extraNew("x"), extraNew(["8"])]).toEqual([5, 30, 5, 5, 8]);
  });

  it("stats can be narrowed to one track; the kanji defaults stay kanji-only", () => {
    const log = [r("日", local(2026, 11, 1)), r("あ", local(2026, 11, 1)), r("あ", local(2026, 11, 2), false), r("w:時間", local(2026, 11, 2))];
    expect(perDay(log, 4, inTrack("kana")).map((x) => x.reviews)).toEqual([1, 1]);
    expect(retention(log, 0, inTrack("kana"))).toBe(0);
    const cards = replay(log);
    expect(weakest(cards, local(2026, 11, 3)).map((w) => w.k)).toEqual(["日"]);
    expect(weakest(cards, local(2026, 11, 3), 20, inTrack("words")).map((w) => w.k)).toEqual(["w:時間"]);
    expect(leeches(cards, inTrack("kana"))).toEqual([]);
    expect(stagesOf(cards, ["あ", "い"])).toMatchObject({ total: 2, unseen: 1 });
  });
});

describe("kana chart", () => {
  it("lays the gojūon out in vowel columns with the traditional gaps", () => {
    const [basic, dakuten, yoon] = kanaChart("hira");
    const row = (i: number) => basic!.rows[i]!.map((x) => x?.k ?? "_").join("");
    expect(row(0)).toBe("あいうえお");
    expect(row(7)).toBe("や_ゆ_よ");
    expect(row(9)).toBe("わ___を");
    expect(row(10)).toBe("ん____");
    expect(dakuten!.rows.length).toBe(5);
    expect(yoon!.rows[0]!.map((x) => x!.k)).toEqual(["きゃ", "きゅ", "きょ"]);
  });

  it("covers every kana of the script exactly once; extensions only for katakana", () => {
    for (const script of ["hira", "kata"] as const) {
      const shown = kanaChart(script).flatMap((s) => s.rows.flat()).filter(Boolean).map((x) => x!.k);
      expect(shown.sort()).toEqual(KANA.filter((x) => x.script === script).map((x) => x.k).sort());
    }
    expect(kanaChart("hira").some((s) => s.group === "extended")).toBe(false);
    expect(kanaChart("kata").at(-1)!.group).toBe("extended");
  });
});

describe("word status and levels", () => {
  const w = d.word("時間")!;
  it("locked until every kanji is known, then ready, then the card's stage", () => {
    expect(wordStatus(w, new Map(), new Set(["時"]))).toBe("locked");
    expect(missingKanji(w, new Set(["時"]))).toEqual(["間"]);
    expect(wordStatus(w, new Map(), new Set(["時", "間"]))).toBe("ready");
    const cards = replay([r(wordKey(w), local(2026, 11, 1))]);
    expect(["learning", "young"]).toContain(wordStatus(w, cards, new Set(["時", "間"])));
  });

  it("levels run N5 → N1, unlisted last, and together hold the whole vocabulary", () => {
    const lv = vocabLevels(d);
    expect(lv.map((l) => l.level)).toEqual([5, 4, 3, 2, 1, null]);
    expect(lv.reduce((n, l) => n + l.words.length, 0)).toBe(vocabOrder(d).length);
    expect(lv[0]!.words.every((x) => x.j === 5)).toBe(true);
  });
});
