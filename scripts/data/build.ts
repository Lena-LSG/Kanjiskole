// Builds assets/data/kanji.v1.json and assets/data/strokes.v1.json from the pinned sources in .cache/sources.
// Deterministic: no randomness, stable sorts, so the same sources give byte-identical output.
// Run `npm run data` (fetch + build). Never hand-edit the output.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isKana, isKanji, toHira, toKata } from "../../packages/core/src/kana.ts";
import type { Dataset, Furigana, Kanji, Word } from "../../packages/core/src/types.ts";
import { similarity } from "./similar.ts";

const VERSION = "1.1.0";
const root = new URL("../..", import.meta.url).pathname;
const src = (p: string) => join(root, ".cache/sources", p);
const readJson = (p: string) => JSON.parse(readFileSync(src(p), "utf8"));

// ---------- sources ----------

type KD = {
  strokes: number; grade: number | null; freq: number | null; jlpt_new: number | null;
  meanings: string[]; readings_on: string[] | null; readings_kun: string[] | null;
};
const kanjidata: Record<string, KD> = readJson("kanjidata.json");

type Furi = {
  versions: Record<string, string>;
  runs: Record<string, Record<string, [number, number]>>;
  kanji: Record<string, Record<string, [number, number]>>;
};
const furi: Furi = readJson("furifont/package/data/dictionary.json");

type KotoVocab = { word: string; reading: string; meanings: string[]; jlpt: string | null };
type KotoKanji = { char: string; strokes: string[] };
const koto: { version: string; datasets: { vocab: KotoVocab[]; kanji: KotoKanji[] } } =
  readJson("kotobako/package/kotobako-static.json");

// Jōyō since 2010 uses 𠮟 塡 頰 剝; dictionaries mix them with 叱 填 頬 剥. Spell everything the way kanji-data does.
const SPELL: Record<string, string> = { "𠮟": "叱", "填": "塡", "頬": "頰", "剝": "剥" };
const respell = (s: string) => [...s].map((c) => SPELL[c] ?? c).join("");
const runsOf = new Map<string, Record<string, [number, number]>>();
for (const [w, r] of Object.entries(furi.runs)) runsOf.set(respell(w), { ...runsOf.get(respell(w)), ...r });

const radkText = readFileSync(src("radk/package/dist/data/radkfile.data.js"), "utf8");

// furifont source flags
const F = { jmdict: 1, ichi: 2, news: 4, spec: 8, nf: 32, place: 128, N5: 4096, N4: 8192, N3: 16384, N2: 32768, N1: 65536 };
const PRIORITY = F.ichi | F.news | F.spec | F.nf;
const JLPT_BITS: [number, number][] = [[F.N5, 5], [F.N4, 4], [F.N3, 3], [F.N2, 2], [F.N1, 1]];

// ---------- jōyō kanji ----------

const joyoChars = Object.keys(kanjidata).filter((k) => [1, 2, 3, 4, 5, 6, 8].includes(kanjidata[k]!.grade ?? 0));
const JOYO = new Set(joyoChars);
const freqRank = (k: string) => kanjidata[k]?.freq ?? 4000;

// ---------- components (KRADFILE via RADKFILE) ----------

// Stand-in radicals EDRDG keys by a kanji that holds the shape; show the shape people know.
const SHAPE: Record<string, string> = {
  化: "亻", 个: "𠆢", 并: "丷", 刈: "刂", 込: "辶", 尚: "⺌", 忙: "忄", 扎: "扌", 汁: "氵", 犯: "犭",
  艾: "艹", 邦: "阝", 阡: "阝", 老: "耂", 杰: "灬", 礼: "礻", 疔: "疒", 禹: "禸", 初: "衤", 買: "罒",
};
const unicodeMap: Record<string, string> = Object.fromEntries(
  [...(radkText.match(/unicode: \{([^}]*)\}/)?.[1] ?? "").matchAll(/"([^"]+)": "([^"]+)"/g)].map((m) => [m[1]!, m[2]!]),
);
const components = new Map<string, string[]>(); // kanji → radical keys
for (const m of radkText.matchAll(/\{ radical: "([^"]+)", strokes: \d+, kanji: "([^"]*)"/g)) {
  for (const k of m[2]!) if (JOYO.has(k)) (components.get(k) ?? components.set(k, []).get(k)!).push(m[1]!);
}
const shapeOf = (r: string) => SHAPE[r] ?? unicodeMap[r] ?? r;

// ---------- words ----------

/** furifont run key ("0:て;1:がみ", "0-1:にほん") → reading and furigana for that spelling. */
function readKey(word: string, key: string): { reading: string; f: Furigana[] } {
  const chars = [...word];
  const segs = key.split(";").map((seg) => {
    const [pos, r] = [seg.slice(0, seg.indexOf(":")), toHira(seg.slice(seg.indexOf(":") + 1))];
    const [a, b] = pos.split("-").map(Number);
    return [a!, (b ?? a!) + 1, r] as Furigana;
  }).sort((x, y) => x[0] - y[0]);
  let reading = "";
  let i = 0;
  for (const [a, b, r] of segs) {
    while (i < a) reading += toHira(chars[i++]!);
    reading += r;
    i = b;
  }
  while (i < chars.length) reading += toHira(chars[i++]!);
  return { reading, f: segs };
}

const glossOf = new Map<string, Map<string, string>>(); // word → reading → gloss
const kotoJlpt = new Map<string, number>(); // word → JLPT level, for words furifont has no flags for
for (const v of koto.datasets.vocab) {
  const lvl = v.jlpt ? Number(v.jlpt.slice(1)) : 0;
  if (lvl && !kotoJlpt.has(respell(v.word))) kotoJlpt.set(respell(v.word), lvl);
  const g = v.meanings.map((m) => m.replace(/\s*\(.*?\)\s*/g, " ").trim()).filter(Boolean).slice(0, 2).join(", ");
  if (!g) continue;
  const word = respell(v.word);
  const byReading = glossOf.get(word) ?? glossOf.set(word, new Map()).get(word)!;
  const r = toHira(v.reading);
  if (!byReading.has(r)) byReading.set(r, g);
}

// Hand-written overrides: words for kanji that otherwise only appear in names (handover §3).
const OVERRIDES: Record<string, [string, string, string]> = {
  茨: ["茨城", "いばらき", "Ibaraki (prefecture)"], 栃: ["栃木", "とちぎ", "Tochigi (prefecture)"],
  媛: ["愛媛", "えひめ", "Ehime (prefecture)"], 梨: ["山梨", "やまなし", "Yamanashi (prefecture)"],
  埼: ["埼玉", "さいたま", "Saitama (prefecture)"], 岐: ["岐阜", "ぎふ", "Gifu (prefecture)"],
  阜: ["岐阜", "ぎふ", "Gifu (prefecture)"], 潟: ["新潟", "にいがた", "Niigata (prefecture)"],
  奈: ["奈良", "なら", "Nara (prefecture)"], 沖: ["沖縄", "おきなわ", "Okinawa (prefecture)"],
  縄: ["沖縄", "おきなわ", "Okinawa (prefecture)"], 熊: ["熊本", "くまもと", "Kumamoto (prefecture)"],
  崎: ["長崎", "ながさき", "Nagasaki (prefecture)"], 鹿: ["鹿児島", "かごしま", "Kagoshima (prefecture)"],
  滋: ["滋賀", "しが", "Shiga (prefecture)"], 阪: ["大阪", "おおさか", "Osaka"],
  鶴: ["千羽鶴", "せんばづる", "a thousand paper cranes"], 朕: ["朕", "ちん", "We (imperial first person)"],
  浦: ["浦安", "うらやす", "Urayasu (city)"],
};

type Cand = Word & { score: number };
const words = new Map<string, Cand>();

/**
 * Furigana for a spelling furifont has no entry for (it keys runs of kanji, so 読む and 会う are missing): match the
 * kana around each kanji run against the reading. A multi-kanji run is split per kanji when furifont knows that run.
 */
function align(spelling: string, reading: string): Furigana[] | undefined {
  const groups: { kanji: boolean; start: number; end: number; text: string }[] = [];
  [...spelling].forEach((c, i) => {
    const kanji = !isKana(c);
    const last = groups[groups.length - 1];
    if (last && last.kanji === kanji) { last.end = i + 1; last.text += c; }
    else groups.push({ kanji, start: i, end: i + 1, text: c });
  });
  if (!groups.some((g) => g.kanji)) return undefined;
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = toHira(reading).match(new RegExp(`^${groups.map((g) => (g.kanji ? "(.+?)" : esc(toHira(g.text)))).join("")}$`));
  if (!m) return undefined;
  const out: Furigana[] = [];
  let gi = 1;
  for (const g of groups) {
    if (!g.kanji) continue;
    const r = m[gi++]!;
    if (g.end - g.start > 1) {
      const runs = runsOf.get(g.text);
      const hit = runs && Object.keys(runs).map((key) => readKey(g.text, key)).find((x) => x.reading === r);
      if (hit) { for (const [a, b, rr] of hit.f) out.push([g.start + a, g.start + b, rr]); continue; }
    }
    out.push([g.start, g.end, r]);
  }
  return out;
}

/** Readings of a spelling from JMdict, split into accepted answers and readings that are merely possible. */
function readingsOf(spelling: string) {
  const runs = runsOf.get(spelling);
  const entries = runs
    ? Object.entries(runs).map(([key, [score, flags]]) => ({ ...readKey(spelling, key), score, flags }))
    : [];
  // furifont keys are kanji runs, so a reading seen only inside a longer word (説明 ときあか, from 説き明かす)
  // scores 5 with no list flags. Such readings never count as answers, but they are never distractors either.
  const accepted = entries.filter((e) => e.flags & F.jmdict && (e.score >= 10 || e.flags & (PRIORITY | F.N5 | F.N4 | F.N3 | F.N2 | F.N1)));
  return { entries, accepted };
}

const okSpelling = (chars: string[]) =>
  chars.some((c) => JOYO.has(c)) && chars.length <= 6 &&
  // Every kanji in the word must be jōyō, or the prompt shows something the app never teaches.
  chars.every((c) => isKana(c) || JOYO.has(c) || c === "々");

function addWord(spelling: string, primary: string | undefined, gloss: string, fallback: boolean) {
  const chars = [...spelling];
  const { entries, accepted } = readingsOf(spelling);
  const best = (primary && entries.find((e) => e.reading === primary)) ||
    [...accepted].sort((a, b) => b.score - a.score)[0];
  const r = primary ?? best?.reading;
  if (!r) return;
  const rs = [...new Set([r, ...accepted.map((e) => e.reading)])];
  const x = [...new Set(entries.map((e) => e.reading))].filter((y) => !rs.includes(y));
  const flags = entries.reduce((a, e) => a | e.flags, 0);
  // Words with kana in them have no furifont flags: kotobako's own JLPT level, and its list is JMdict's common words.
  const jlpt = JLPT_BITS.find(([bit]) => flags & bit)?.[1] ?? kotoJlpt.get(spelling);
  const w: Cand = { w: spelling, r, rs, g: gloss, score: 0 };
  if (x.length) w.x = x;
  const f = best?.f && best.reading === r ? best.f : align(spelling, r);
  if (f && chars.some(isKanji)) w.f = f;
  if (flags & PRIORITY || (!fallback && !entries.length && glossOf.has(spelling))) w.p = 1;
  if (jlpt) w.j = jlpt;
  // Lower is better: glossed, common, easy JLPT, short, built from frequent kanji, then furifont's own score.
  const ks = chars.filter((c) => JOYO.has(c));
  w.score = (fallback ? 100 : 0) + (w.p ? 0 : 20) + (jlpt ? (5 - jlpt) * 2 : 12) + chars.length * 1.5 +
    (ks.reduce((s, c) => s + Math.min(freqRank(c), 3000), 0) / 1000) * 2 - (best?.score ?? 50) / 100;
  words.set(spelling, w);
}

// 1. Real words: JMdict common words with English glosses.
for (const [spelling, byReading] of glossOf) {
  if (!okSpelling([...spelling])) continue;
  const [r, g] = [...byReading][0]!;
  addWord(spelling, r, g, false);
}
// 2. Hand-written overrides.
for (const [spelling, reading, gloss] of Object.values(OVERRIDES)) {
  addWord(spelling, reading, gloss, false);
}
// 3. Fallback for rare kanji: frequent JMdict spellings without a gloss (readings only).
const glossedCount = new Map<string, number>();
for (const w of words.values()) for (const c of new Set(w.w)) glossedCount.set(c, (glossedCount.get(c) ?? 0) + 1);
for (const [spelling, runs] of runsOf) {
  const chars = [...spelling];
  if (words.has(spelling) || chars.length < 2 || !okSpelling(chars)) continue;
  if (!chars.some((c) => JOYO.has(c) && (glossedCount.get(c) ?? 0) < 3)) continue;
  const good = Object.values(runs).some(([score, flags]) => flags & F.jmdict && score >= 55 && flags & (PRIORITY | F.N1 | F.N2));
  if (good) addWord(spelling, undefined, "", true);
}
// 4. Kanji still without words (about 30 of the rarest): the dictionary form from a kun reading (叱る, 僅か),
// then rarer two- or three-character JMdict compounds (辛辣, 一隻), then the kanji alone.
const hasWord = new Set([...words.values()].flatMap((w) => [...w.w]));
for (const k of joyoChars) {
  if (hasWord.has(k)) continue;
  let n = 0;
  const kun = (kanjidata[k]!.readings_kun ?? []).find((r) => r.includes(".") && !r.startsWith("-"));
  if (kun) {
    const [stem, okuri] = kun.replace(/-/g, "").split(".") as [string, string];
    const spelling = k + okuri;
    words.set(spelling, { w: spelling, r: stem + okuri, rs: [stem + okuri], g: "", f: [[0, 1, stem]], score: 150 });
    n++;
  }
  const rare = [...runsOf].filter(([sp]) => [...sp].length <= 3 && sp.length > 1 && sp.includes(k) && okSpelling([...sp]))
    .map(([sp, runs]) => [sp, Object.entries(runs).filter(([, [, fl]]) => fl & F.jmdict).sort((x, y) => y[1][0] - x[1][0])[0]] as const)
    .filter(([, e]) => e)
    .sort((x, y) => y[1]![1][0] - x[1]![1][0] || x[0].length - y[0].length || x[0].localeCompare(y[0]))
    .slice(0, 3 - n);
  for (const [sp, e] of rare) addWord(sp, readKey(sp, e![0]).reading, "", true);
  n += rare.length;
  const on = kanjidata[k]!.readings_on?.[0];
  if (!n && on) words.set(k, { w: k, r: toHira(on), rs: [toHira(on)], g: "", score: 200 });
}

// ---------- assemble ----------

const strokes: Record<string, string[]> = {};
for (const kk of koto.datasets.kanji) {
  const k = respell(kk.char);
  if (JOYO.has(k)) strokes[k] = kk.strokes;
}

const byKanji = new Map<string, Cand[]>();
for (const w of words.values()) {
  for (const c of new Set(w.w)) if (JOYO.has(c)) (byKanji.get(c) ?? byKanji.set(c, []).get(c)!).push(w);
}

const order = [...joyoChars].sort((a, b) => {
  const fa = kanjidata[a]!.freq, fb = kanjidata[b]!.freq;
  return (fa == null ? 1 : 0) - (fb == null ? 1 : 0) || (fa ?? 0) - (fb ?? 0) ||
    (kanjidata[a]!.grade ?? 9) - (kanjidata[b]!.grade ?? 9) || a.localeCompare(b);
});

const sims = similarity(order, strokes, (k) => components.get(k) ?? [], (k) => kanjidata[k]!.strokes);

// The curriculum: JLPT N5 → N1, then jōyō outside the JLPT lists. Within a level, frequency order, except that a
// kanji's parts that are kanji themselves come first (言 before 語, 木 before 林), even when the JLPT lists put the
// part one level higher (言 and 口 are N4, 語 is N5). Never more than one level: nothing from N1 turns up early.
const freqPos = new Map(order.map((k, i) => [k, i]));
const levelRank = (k: string) => { const j = kanjidata[k]!.jlpt_new; return j ? 5 - j : 5; }; // N5 → 0 … none → 5
const curriculum: string[] = [];
const placed = new Set<string>(), visiting = new Set<string>();
function visit(k: string, maxRank = levelRank(k) + 1) {
  if (placed.has(k) || visiting.has(k)) return;
  visiting.add(k);
  const parts = (components.get(k) ?? []).filter((c) => c !== k && JOYO.has(c) && levelRank(c) <= maxRank);
  for (const c of parts.sort((a, b) => freqPos.get(a)! - freqPos.get(b)!)) visit(c, maxRank);
  visiting.delete(k);
  placed.add(k);
  curriculum.push(k);
}
for (let rank = 0; rank <= 5; rank++) for (const k of order) if (levelRank(k) === rank) visit(k);

const usedWords: Word[] = [];
const wordIndex = new Map<string, number>();
const kanji: Kanji[] = curriculum.map((k) => {
  const d = kanjidata[k]!;
  const ws = (byKanji.get(k) ?? []).sort((a, b) => a.score - b.score || a.w.localeCompare(b.w));
  const glossed = ws.filter((w) => w.g);
  // Up to 16 words, so there's choice once prompts must be readable: glossed first; unglossed only to reach 3.
  const chosen = [...glossed.slice(0, 16), ...ws.filter((w) => !w.g).slice(0, Math.max(0, 3 - glossed.length))];
  const override = OVERRIDES[k];
  if (override) chosen.sort((a, b) => (a.w === override[0] ? -1 : b.w === override[0] ? 1 : 0));
  return {
    k, i: freqPos.get(k)!,
    m: d.meanings.filter((m) => !/radical/i.test(m)).slice(0, 3).concat(d.meanings.every((m) => /radical/i.test(m)) ? d.meanings.slice(0, 2) : []),
    on: (d.readings_on ?? []).map(toKata),
    kun: d.readings_kun ?? [],
    s: d.strokes, f: d.freq, j: d.jlpt_new, g: d.grade ?? 8,
    c: [...new Set((components.get(k) ?? []).map(shapeOf))],
    w: chosen.map(({ score: _s, ...w }) => {
      let idx = wordIndex.get(w.w);
      if (idx === undefined) { idx = usedWords.push(w) - 1; wordIndex.set(w.w, idx); }
      return idx;
    }),
    sim: sims.get(k) ?? [],
  };
});

const dataset: Dataset = {
  version: VERSION,
  sources: {
    kanjidata: "davidluzgouveia/kanji-data (KANJIDIC2-derived, CC BY-SA 4.0 EDRDG)",
    jmdict: `JMdict ${furi.versions.JMdict} via @furifont/dictionary (CC BY-SA 4.0 EDRDG)`,
    glosses: `${koto.version.split(" / ")[0]} via kotobako-data (CC BY-SA 4.0 EDRDG)`,
    components: "KRADFILE via @johnmorrisdotca/bushu (CC BY-SA 4.0 EDRDG)",
    strokes: `KanjiVG ${koto.version.split(" / ")[1]} via kotobako-data (CC BY-SA 3.0)`,
  },
  kanji,
  words: usedWords,
};

// Native-speaker recordings (Kanji alive, CC BY 4.0): which of our words have one, and its file name. The file name
// is the CSV's kname, "_06_", and a letter for the example's position (their own web app builds it the same way).
const audio: Record<string, string> = {};
{
  const text = readFileSync(src("kanjialive.csv"), "utf8");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  const col = (n: string) => head!.indexOf(n);
  const ours = new Map(usedWords.map((w) => [w.w, w]));
  for (const r of body) {
    const examples = JSON.parse(r[col("examples")] || "[]") as [string, string][];
    examples.forEach(([jp], i) => {
      const m = jp.trim().match(/^(.+?)（(.+?)）$/);
      if (!m) return;
      const w = ours.get(respell(m[1]!));
      if (w && (w.r === m[2] || w.rs.includes(m[2]!)) && !audio[w.w]) audio[w.w] = `${r[col("kname")]}_06_${"abcdefghijklmnopqrstuvwxyz"[i]}`;
    });
  }
}

const out = join(root, "assets/data");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "kanji.v1.json"), JSON.stringify(dataset));
writeFileSync(join(out, "audio.v1.json"), JSON.stringify({
  version: VERSION,
  source: "Kanji alive (kanjialive.com), CC BY 4.0: native-speaker recordings of example words",
  base: "https://media.kanjialive.com/examples_audio/audio-opus/",
  ext: ".opus",
  files: Object.fromEntries(Object.entries(audio).sort(([a], [b]) => a.localeCompare(b))),
}));
writeFileSync(join(out, "strokes.v1.json"), JSON.stringify(Object.fromEntries(order.map((k) => [k, strokes[k] ?? []]))));

const noWords = kanji.filter((k) => !k.w.length).map((k) => k.k);
const fewGlossed = kanji.filter((k) => k.w.filter((i) => usedWords[i]!.g).length < 2).length;
console.log(`${kanji.length} kanji, ${usedWords.length} words (${usedWords.filter((w) => !w.g).length} unglossed)`);
console.log(`no words: ${noWords.length} ${noWords.join("")}`);
console.log(`fewer than 2 glossed words: ${fewGlossed}`);
console.log(`recordings: ${Object.keys(audio).length} words`);
console.log(`no strokes: ${order.filter((k) => !strokes[k]?.length).join("") || "none"}`);
