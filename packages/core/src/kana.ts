// Kana tools: romaji → hiragana (Hepburn plus common Kunrei), script normalisation.

export const toHira = (s: string): string =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

export const toKata = (s: string): string =>
  s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

export const isKana = (c: string): boolean => /^[ぁ-ゖァ-ヺー]$/.test(c);

// CJK unified ideographs plus 々 (the repeat mark behaves like a kanji in a word).
export const isKanji = (c: string): boolean => /^[㐀-䶿一-鿿豈-﫿々]$/u.test(c);

const ROMAJI: Record<string, string> = (() => {
  const t: Record<string, string> = { a: "あ", i: "い", u: "う", e: "え", o: "お", "-": "ー" };
  const rows: Record<string, string> = {
    k: "かきくけこ", s: "さしすせそ", t: "たちつてと", n: "なにぬねの", h: "はひふへほ", m: "まみむめも",
    r: "らりるれろ", g: "がぎぐげご", z: "ざじずぜぞ", d: "だぢづでど", b: "ばびぶべぼ", p: "ぱぴぷぺぽ",
  };
  for (const [c, ks] of Object.entries(rows)) [..."aiueo"].forEach((v, j) => (t[c + v] = ks[j]!));
  Object.assign(t, {
    ya: "や", yu: "ゆ", yo: "よ", wa: "わ", wo: "を", shi: "し", chi: "ち", tsu: "つ", fu: "ふ", ji: "じ",
    si: "し", ti: "ち", tu: "つ", hu: "ふ", zi: "じ", di: "ぢ", du: "づ",
    sha: "しゃ", shu: "しゅ", sho: "しょ", she: "しぇ", cha: "ちゃ", chu: "ちゅ", cho: "ちょ", che: "ちぇ",
    ja: "じゃ", ju: "じゅ", jo: "じょ", je: "じぇ", fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
    xtsu: "っ", ltsu: "っ", xtu: "っ", ltu: "っ",
    xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ", xya: "ゃ", xyu: "ゅ", xyo: "ょ",
    sya: "しゃ", syu: "しゅ", syo: "しょ", tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
    zya: "じゃ", zyu: "じゅ", zyo: "じょ", jya: "じゃ", jyu: "じゅ", jyo: "じょ",
    dya: "ぢゃ", dyu: "ぢゅ", dyo: "ぢょ",
  });
  const yoon: Record<string, string> = { k: "き", g: "ぎ", n: "に", h: "ひ", b: "び", p: "ぴ", m: "み", r: "り" };
  for (const [c, s] of Object.entries(yoon)) Object.assign(t, { [c + "ya"]: s + "ゃ", [c + "yu"]: s + "ゅ", [c + "yo"]: s + "ょ" });
  return t;
})();

/** Romaji (or mixed romaji/kana) to hiragana. Unknown characters pass through. */
export function toKana(src: string): string {
  const s = src.toLowerCase().replace(/\s+/g, "");
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    const nx = s[i + 1];
    if (c === "n" && (nx === "n" || nx === "'")) {
      out += "ん";
      i += nx === "'" ? 2 : 1;
      // "nn" is ん unless the second n starts a syllable: "konnichi" = こ + ん + にち
      if (nx === "n" && !/[aiueoy]/.test(s[i + 1] ?? "")) i++;
      continue;
    }
    if (c === "n" && (nx === undefined || !/[aiueoy]/.test(nx))) { out += "ん"; i++; continue; }
    if (c === nx && /[bcdfghjklmpqrstvwxz]/.test(c)) { out += "っ"; i++; continue; }
    if (c === "t" && nx === "c") { out += "っ"; i++; continue; }
    let hit = false;
    for (const len of [4, 3, 2, 1]) {
      const kana = ROMAJI[s.substr(i, len)];
      if (kana) { out += kana; i += len; hit = true; break; }
    }
    if (!hit) { out += c; i++; }
  }
  return toHira(out);
}

/** What a typed answer is compared on: hiragana, no spaces or separators. */
export const normalizeReading = (s: string): string => toHira(s).replace(/[\s・.-]/g, "");

/** Typed input (romaji or kana) to the comparable form. */
export const normalizeAnswer = (input: string): string => normalizeReading(toKana(input.trim()));
