// Wrong options that are realistic mistakes, never random noise, and never a valid reading.
import { validReadings, type KanjiData } from "./data.ts";
import { pick, shuffle, type Rng } from "./rng.ts";
import type { Kanji, Word } from "./types.ts";

// ---------- readings ----------

const VOICE: Record<string, string> = {};
for (const p of ["かが", "きぎ", "くぐ", "けげ", "こご", "さざ", "しじ", "すず", "せぜ", "そぞ", "ただ", "ちぢ", "つづ", "てで", "とど", "はば", "ひび", "ふぶ", "へべ", "ほぼ"]) {
  VOICE[p[0]!] = p[1]!;
  VOICE[p[1]!] = p[0]!;
}
Object.assign(VOICE, { ぱ: "ば", ぴ: "び", ぷ: "ぶ", ぺ: "べ", ぽ: "ぼ" });
const OROW = "おこごそぞとどのほぼぽもよろ";
const EROW = "えけげせぜてでねへべぺめれ";
const SOKU = "かきくけこさしすせそたちつてとぱぴぷぺぽ";
const SMALL: Record<string, string> = { ゃ: "や", ゅ: "ゆ", ょ: "よ", や: "ゃ", ゆ: "ゅ", よ: "ょ" };

export type Mutation = "voice" | "soku" | "long" | "small";

/** One phonological slip: voicing, a dropped or added っ, a dropped or added long vowel, ゃ/や. */
export function mutate(h: string, rng: Rng): string | null {
  const a = [...h];
  const where = (f: (c: string, i: number) => boolean) => a.flatMap((c, i) => (f(c, i) ? [i] : []));
  const edit = (f: (b: string[]) => void) => { const b = [...a]; f(b); return b.join(""); };
  for (const op of shuffle<Mutation>(rng, ["voice", "soku", "long", "small", "voice"])) {
    if (op === "voice") {
      const idx = where((c) => !!VOICE[c]);
      if (idx.length) { const i = pick(rng, idx); return edit((b) => void (b[i] = VOICE[b[i]!]!)); }
    }
    if (op === "soku") {
      const k = a.indexOf("っ");
      if (k >= 0) return edit((b) => void b.splice(k, 1));
      const idx = where((c, i) => i > 0 && SOKU.includes(c));
      if (idx.length) { const i = pick(rng, idx); return edit((b) => void b.splice(i, 0, "っ")); }
    }
    if (op === "long") {
      const drop = where((c, i) => c === "う" && i > 0 && (OROW.includes(a[i - 1]!) || "ゅょ".includes(a[i - 1]!)));
      if (drop.length) { const i = pick(rng, drop); return edit((b) => void b.splice(i, 1)); }
      const ei = where((c, i) => c === "い" && i > 0 && EROW.includes(a[i - 1]!));
      if (ei.length) { const i = pick(rng, ei); return edit((b) => void b.splice(i, 1)); }
      // add a long う after o-row or ゅ/ょ, but never before ん, っ or an existing う
      const add = where((c, i) => (OROW.includes(c) || "ゅょ".includes(c)) && !"うんっ".includes(a[i + 1] ?? ""));
      if (add.length) { const i = pick(rng, add); return edit((b) => void b.splice(i + 1, 0, "う")); }
    }
    if (op === "small") {
      const idx = where((c, i) => !!SMALL[c] && i > 0);
      if (idx.length) { const i = pick(rng, idx); return edit((b) => void (b[i] = SMALL[b[i]!]!)); }
    }
  }
  return null;
}

/** The right kanji read with another of its readings: 有名 ゆうめい → うめい, 日本 にほん → にもと. */
export function swapReadings(word: Word, data: KanjiData, rng: Rng): string[] {
  const chars = [...word.w];
  const out = new Set<string>();
  if (word.f?.length) {
    // With furigana we know exactly which kana belong to which kanji.
    for (const [a, b, r] of word.f) {
      if (b - a !== 1) continue; // jukujikun like 今日: no per-kanji reading to swap
      for (const alt of data.readingsOf(chars[a]!)) {
        if (alt === r) continue;
        let s = "";
        for (let i = 0, j = 0; i < chars.length; ) {
          const seg = word.f[j];
          if (seg && seg[0] === i) { s += seg[0] === a ? alt : seg[2]; i = seg[1]; j++; }
          else s += chars[i++];
        }
        out.add(s);
      }
    }
  } else {
    // Without alignment, substitute substrings, but only of 2+ kana or at the start (avoids ゆゆうめい).
    for (const ch of new Set(chars)) {
      const reads = data.readingsOf(ch);
      for (const a of reads) {
        if (!(a.length >= 2 || word.r.startsWith(a)) || !word.r.includes(a)) continue;
        for (const b of reads) if (b !== a) out.add(word.r.replace(a, b));
      }
    }
  }
  out.delete(word.r);
  return shuffle(rng, [...out]);
}

/** Four kana options for a word, one right. Order: reading swaps, then phonological slips, then a fallback. */
export function readingOptions(word: Word, data: KanjiData, rng: Rng): string[] {
  const banned = validReadings(word);
  const set = new Set<string>([word.r]);
  const add = (x: string | null) => { if (x && !banned.has(x) && !set.has(x)) set.add(x); };
  for (const x of swapReadings(word, data, rng)) { if (set.size >= 3) break; add(x); }
  for (let guard = 0; set.size < 4 && guard < 40; guard++) add(mutate(guard > 12 ? pick(rng, [...set]) : word.r, rng));
  for (let guard = 0; set.size < 4 && guard < 2000; guard++) {
    const o = pick(rng, data.allReadings);
    if (Math.abs(o.length - word.r.length) <= 1) add(o);
  }
  return shuffle(rng, [...set]);
}

// ---------- kanji ----------

const firstMeaning = (k: Kanji) => (k.m[0] ?? "").toLowerCase();

/** Look-alike kanji: visually similar first, then the frequency/stroke fallback. Distinct first meanings. */
export function lookalikes(
  k: Kanji,
  data: KanjiData,
  rng: Rng,
  n = 3,
  accept: (o: Kanji) => boolean = () => true,
): Kanji[] {
  const out: Kanji[] = [];
  const seen = new Set([firstMeaning(k)]);
  const take = (o: Kanji | undefined) => {
    if (!o || o === k || out.includes(o) || seen.has(firstMeaning(o)) || !accept(o)) return;
    seen.add(firstMeaning(o));
    out.push(o);
  };
  for (const s of shuffle(rng, k.sim.slice(0, 12))) { if (out.length >= n) break; take(data.get(s)); }
  for (let guard = 0; out.length < n && guard < 400; guard++) {
    const o = data.kanji[Math.max(0, Math.min(data.kanji.length - 1, k.i + Math.floor(rng() * 160) - 80))]!;
    if (Math.abs(o.s - k.s) <= 3 || guard > 200) take(o);
  }
  return out;
}
