// The three tracks share one event log; this is where a key says which track it belongs to, and where the
// per-track views (stage counts, the kana chart, a word's status) live.
import { isStarted, stage, type CardState } from "./cards.ts";
import type { KanjiData } from "./data.ts";
import { isKanji } from "./kana.ts";
import { isKanaKey, KANA, type KanaGroup, type KanaItem, type Script } from "./kana-track.ts";
import type { Word } from "./types.ts";
import { isWordKey, vocabOrder, wordKey } from "./vocab.ts";

export type Track = "kanji" | "kana" | "words";
export const trackOf = (k: string): Track => (isKanaKey(k) ? "kana" : isWordKey(k) ? "words" : "kanji");
export const inTrack = (track: Track) => (k: string) => trackOf(k) === track;

/** New cards per study day for the tracks without a setting (kanji use settings.newPerDay). */
export const NEW_PER_DAY = { kana: 15, words: 10 } as const;

/**
 * "Learn more than today's allowance": the number of extra new cards a session may take. Arrives from a URL
 * (kanjiskole://…?extra=…), so it is clamped to 1–30 and never trusted. No parameter means a normal session.
 */
export function extraNew(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return null;
  const n = Math.floor(Number(Array.isArray(raw) ? raw[0] : raw));
  return Number.isFinite(n) && n > 0 ? Math.min(30, n) : 5;
}

export interface StageCounts { unseen: number; learning: number; young: number; mature: number; total: number }

/** Stage counts over a fixed set of keys (a script's kana, a level's words). */
export function stagesOf(cards: ReadonlyMap<string, CardState>, keys: Iterable<string>): StageCounts {
  const out: StageCounts = { unseen: 0, learning: 0, young: 0, mature: 0, total: 0 };
  for (const k of keys) {
    out.total++;
    out[(["unseen", "learning", "young", "mature"] as const)[stage(cards.get(k))]]++;
  }
  return out;
}

// ---------- kana chart ----------

export interface KanaSection { group: KanaGroup; cols: number; rows: (KanaItem | null)[][] }

/** The chart as it's printed: gojūon in five vowel columns with the gaps (や _ ゆ _ よ), yōon in three. */
export function kanaChart(script: Script): KanaSection[] {
  const items = KANA.filter((x) => x.script === script);
  const byRow = (group: KanaGroup) => {
    const rows = new Map<string, KanaItem[]>();
    for (const x of items.filter((x) => x.group === group)) (rows.get(x.row) ?? rows.set(x.row, []).get(x.row)!).push(x);
    return [...rows.values()];
  };
  const fiveCols = (row: KanaItem[]) => {
    const out: (KanaItem | null)[] = [null, null, null, null, null];
    for (const x of row) out[x.r === "n" ? 0 : Math.max(0, "aiueo".indexOf(x.r.at(-1)!))] = x;
    return out;
  };
  const sections: KanaSection[] = [
    { group: "basic", cols: 5, rows: byRow("basic").map(fiveCols) },
    { group: "dakuten", cols: 5, rows: byRow("dakuten").map(fiveCols) },
    { group: "yoon", cols: 3, rows: byRow("yoon") },
  ];
  const ext = items.filter((x) => x.group === "extended");
  if (ext.length) {
    const rows: (KanaItem | null)[][] = [];
    for (let i = 0; i < ext.length; i += 4) rows.push([...ext.slice(i, i + 4), ...Array<null>(Math.max(0, 4 - ext.slice(i, i + 4).length)).fill(null)]);
    sections.push({ group: "extended", cols: 4, rows });
  }
  return sections;
}

// ---------- words ----------

/** locked: some kanji not known yet · ready: unlocked, not started · then the card's stage. */
export type WordStatus = "locked" | "ready" | "learning" | "young" | "mature";

export const missingKanji = (w: Word, known: ReadonlySet<string>) => [...new Set([...w.w].filter((c) => isKanji(c) && !known.has(c)))];

export function wordStatus(w: Word, cards: ReadonlyMap<string, CardState>, known: ReadonlySet<string>): WordStatus {
  const c = cards.get(wordKey(w));
  if (isStarted(c)) return (["ready", "learning", "young", "mature"] as const)[stage(c)];
  return missingKanji(w, known).length ? "locked" : "ready";
}

export interface WordLevel { level: number | null; words: Word[] }

/** The vocabulary grouped by JLPT level, N5 first, unlisted words last; teaching order inside each level. */
export function vocabLevels(data: KanjiData): WordLevel[] {
  const by = new Map<number | null, Word[]>();
  for (const w of vocabOrder(data)) (by.get(w.j ?? null) ?? by.set(w.j ?? null, []).get(w.j ?? null)!).push(w);
  return [5, 4, 3, 2, 1, null].filter((l) => by.has(l)).map((level) => ({ level, words: by.get(level)! }));
}
