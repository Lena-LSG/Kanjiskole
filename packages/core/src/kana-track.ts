// Hiragana and katakana as a track of their own: the same event log and scheduler as the kanji, keyed by the kana
// itself. Generated here (no data download): the gojūon, dakuten, yōon, and the common katakana extensions.
import { isDue, isStarted, State, type CardState } from "./cards.ts";
import { maturity } from "./curriculum.ts";
import { DEFAULT_ROLLOVER } from "./day.ts";
import { normalizeReading, toHira, toKana, toKata } from "./kana.ts";
import { pick, shuffle, type Rng } from "./rng.ts";

export type Script = "hira" | "kata";
export type KanaGroup = "basic" | "dakuten" | "yoon" | "extended";

export interface KanaItem {
  /** The kana as shown: あ, ア, きゃ, ファ. Also the card key in the event log. */
  k: string;
  /** Hepburn romaji. */
  r: string;
  /** Other accepted romaji (ぢ is ji or di, を is wo or o). */
  alt?: string[];
  script: Script;
  group: KanaGroup;
  /** Gojūon row, for gentle distractors: "a", "k", "s" … "n". */
  row: string;
  /** Teaching order within the whole track. */
  i: number;
}

const BASIC: [string, string, string][] = [
  ["a", "あいうえお", "a i u e o"], ["k", "かきくけこ", "ka ki ku ke ko"], ["s", "さしすせそ", "sa shi su se so"],
  ["t", "たちつてと", "ta chi tsu te to"], ["n", "なにぬねの", "na ni nu ne no"], ["h", "はひふへほ", "ha hi fu he ho"],
  ["m", "まみむめも", "ma mi mu me mo"], ["y", "やゆよ", "ya yu yo"], ["r", "らりるれろ", "ra ri ru re ro"],
  ["w", "わを", "wa wo"], ["nn", "ん", "n"],
];
const DAKUTEN: [string, string, string][] = [
  ["g", "がぎぐげご", "ga gi gu ge go"], ["z", "ざじずぜぞ", "za ji zu ze zo"], ["d", "だぢづでど", "da ji zu de do"],
  ["b", "ばびぶべぼ", "ba bi bu be bo"], ["p", "ぱぴぷぺぽ", "pa pi pu pe po"],
];
const YOON: [string, string][] = [
  ["き", "ky"], ["し", "sh"], ["ち", "ch"], ["に", "ny"], ["ひ", "hy"], ["み", "my"], ["り", "ry"],
  ["ぎ", "gy"], ["じ", "j"], ["び", "by"], ["ぴ", "py"],
];
/** Katakana-only sounds for loanwords; each round-trips through toKana. */
const EXTENDED: [string, string][] = [["シェ", "she"], ["ジェ", "je"], ["チェ", "che"], ["ファ", "fa"], ["フィ", "fi"], ["フェ", "fe"], ["フォ", "fo"]];
const ALT: Record<string, string[]> = { ぢ: ["di"], づ: ["du"], を: ["o"], し: ["si"], ち: ["ti"], つ: ["tu"], ふ: ["hu"], じ: ["zi"], ん: ["nn"] };

function build(): KanaItem[] {
  const out: KanaItem[] = [];
  for (const script of ["hira", "kata"] as Script[]) {
    const conv = (s: string) => (script === "hira" ? s : toKata(s));
    const add = (hira: string, r: string, group: KanaGroup, row: string) => {
      const alt = ALT[hira];
      out.push({ k: conv(hira), r, ...(alt ? { alt } : {}), script, group, row, i: out.length });
    };
    for (const [row, ks, rs] of BASIC) [...ks].forEach((c, j) => add(c, rs.split(" ")[j]!, "basic", row));
    for (const [row, ks, rs] of DAKUTEN) [...ks].forEach((c, j) => add(c, rs.split(" ")[j]!, "dakuten", row));
    for (const [base, cons] of YOON) {
      (["ゃ", "ゅ", "ょ"] as const).forEach((small, j) => add(base + small, cons + "auo"[j], "yoon", `y-${cons}`));
    }
    if (script === "kata") for (const [k, r] of EXTENDED) out.push({ k, r, script, group: "extended", row: `x-${r[0]}`, i: out.length });
  }
  return out;
}

export const KANA: readonly KanaItem[] = build();
const BY_K = new Map(KANA.map((x) => [x.k, x]));
export const kanaItem = (k: string): KanaItem | undefined => BY_K.get(k);
export const isKanaKey = (k: string): boolean => BY_K.has(k);

/** Pairs people really mix up, per script. Used as distractors once a kana is no longer new. */
const CONFUSABLE: string[][] = [
  ["ぬ", "め"], ["ね", "れ", "わ"], ["は", "ほ"], ["さ", "ち", "き"], ["る", "ろ"], ["あ", "お"], ["い", "り"],
  ["こ", "に"], ["う", "ら"], ["し", "つ"], ["ま", "も"], ["す", "む"], ["た", "な"], ["け", "は"], ["く", "へ"],
  ["シ", "ツ"], ["ソ", "ン"], ["ノ", "メ"], ["ク", "ケ", "タ"], ["ワ", "ウ", "フ"], ["コ", "ユ", "ロ"], ["ス", "ヌ"],
  ["チ", "テ"], ["マ", "ム"], ["ヲ", "ラ"], ["セ", "サ"], ["エ", "ニ"], ["ハ", "ル"], ["シ", "ン"], ["ツ", "ソ"],
];
const confusablesOf = (k: string) => [...new Set(CONFUSABLE.filter((g) => g.includes(k)).flat())].filter((x) => x !== k);

/** A known look-alike pair (シ/ツ), so the app may say so; anything else is just a wrong pick. */
export const areConfusable = (a: string, b: string): boolean => confusablesOf(a).includes(b);

// ---------- exercises ----------

export type KanaKind = "kana-read" | "kana-pick" | "kana-type" | "kana-listen";

export type KanaExercise =
  | { kind: "kana-read"; item: KanaItem; options: { label: string; ok: boolean }[] }
  | { kind: "kana-pick"; item: KanaItem; options: { label: string; ok: boolean }[] }
  | { kind: "kana-type"; item: KanaItem }
  /** Hear it, pick the kana. Only offered when a Japanese voice is available. */
  | { kind: "kana-listen"; item: KanaItem; options: { label: string; ok: boolean }[] };

const sameRomaji = (a: KanaItem, b: KanaItem) =>
  a.r === b.r || (a.alt ?? []).includes(b.r) || (b.alt ?? []).includes(a.r);

/** Three wrong kana of the same script: confusables when `similar`, else the same row and group. */
function distractors(item: KanaItem, rng: Rng, similar: boolean): KanaItem[] {
  const pool = KANA.filter((x) => x.script === item.script && x !== item && !sameRomaji(x, item));
  const out: KanaItem[] = [];
  const take = (x: KanaItem | undefined) => { if (x && !out.includes(x) && out.length < 3) out.push(x); };
  if (similar) for (const c of shuffle(rng, confusablesOf(item.k))) take(pool.find((x) => x.k === c));
  for (const x of shuffle(rng, pool.filter((x) => x.row === item.row))) take(x);
  for (const x of shuffle(rng, pool.filter((x) => x.group === item.group))) take(x);
  while (out.length < 3) take(pick(rng, pool));
  return out;
}

const WEIGHTS: Record<0 | 1 | 2, Record<KanaKind, number>> = {
  0: { "kana-read": 3, "kana-pick": 2, "kana-type": 0, "kana-listen": 2 },
  1: { "kana-read": 2, "kana-pick": 2, "kana-type": 1, "kana-listen": 2 },
  2: { "kana-read": 2, "kana-pick": 1, "kana-type": 3, "kana-listen": 2 },
};

export function makeKanaExercise(item: KanaItem, card: CardState | undefined, rng: Rng, opts: { audio?: boolean } = {}): KanaExercise {
  const m = maturity(card);
  // Calibrated kana get checked the hardest way first, like calibrated kanji.
  const base = card?.needsTypedCheck ? { "kana-read": 0, "kana-pick": 0, "kana-type": 1, "kana-listen": 0 } : WEIGHTS[m];
  const w = { ...base, "kana-listen": opts.audio ? base["kana-listen"] : 0 };
  let x = rng() * Object.values(w).reduce((s, v) => s + v, 0);
  const kind = (Object.keys(w) as KanaKind[]).find((k) => (x -= w[k]) < 0) ?? "kana-read";
  if (kind === "kana-type") return { kind, item };
  const wrong = distractors(item, rng, m > 0);
  if (kind === "kana-read") {
    return { kind, item, options: shuffle(rng, [{ label: item.r, ok: true }, ...wrong.map((o) => ({ label: o.r, ok: false }))]) };
  }
  return { kind, item, options: shuffle(rng, [{ label: item.k, ok: true }, ...wrong.map((o) => ({ label: o.k, ok: false }))]) };
}

/** A typed answer: romaji (Hepburn, Kunrei, or the listed alternatives) or the kana itself in either script. */
export function judgeKana(input: string, item: KanaItem): { ok: boolean; got: string } {
  const raw = input.trim().toLowerCase();
  const target = normalizeReading(item.k);
  if (!raw) return { ok: false, got: "" };
  if (raw === item.r || (item.alt ?? []).includes(raw)) return { ok: true, got: raw };
  const got = normalizeReading(/[a-z]/.test(raw) ? toKana(raw) : toHira(raw));
  return { ok: got === target, got };
}

// ---------- sessions ----------

export function dueKana(cards: ReadonlyMap<string, CardState>, now: number, rolloverHour = DEFAULT_ROLLOVER): string[] {
  return [...cards.values()]
    .filter((c) => isKanaKey(c.k) && isDue(c, now, rolloverHour))
    .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime() || kanaItem(a.k)!.i - kanaItem(b.k)!.i)
    .map((c) => c.k);
}

export function newKana(cards: ReadonlyMap<string, CardState>, n: number, script?: Script): string[] {
  const out: string[] = [];
  for (const x of KANA) {
    if (out.length >= n) break;
    if ((!script || x.script === script) && !isStarted(cards.get(x.k))) out.push(x.k);
  }
  return out;
}

export function kanaProgress(cards: ReadonlyMap<string, CardState>, script: Script) {
  const items = KANA.filter((x) => x.script === script);
  const started = items.filter((x) => isStarted(cards.get(x.k)));
  // Calibrated kana aren't solid until the typed check has confirmed them.
  const solid = started.filter((x) => { const c = cards.get(x.k)!; return !c.needsTypedCheck && c.fsrs.state === State.Review && c.fsrs.stability >= 21; });
  return { total: items.length, started: started.length, solid: solid.length };
}
