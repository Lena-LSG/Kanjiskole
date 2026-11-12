# Decisions

Changes to the handover (`HANDOVER.md`) and why. Newest first.

## 2026-11-12: audio and better Hvorfor?

- **Audio** is the device's own text-to-speech (`expo-speech`: Android TTS, the browser's Web Speech API), offline
  where a Japanese voice is installed; the app sends nothing anywhere. Readings are spoken from kana, not kanji, so
  TTS can't guess a reading wrong. Without a Japanese voice all audio UI disappears and Settings says how to install
  one. Answers are read aloud on reveal (Settings → "Læs svaret op", on by default), every word has a speaker
  button, and the kana and word tracks get a "listen and pick" exercise that never offers homophones.
- **Hvorfor? on every wrong answer**, not only when a slip pattern matches: readings get a per-kanji breakdown
  (`readingBreakdown` in core: plain, rendaku, っ, irregular, whole-word) with a line for anything special; kanji
  choices say what both kanji mean, and only call it a look-alike when it is one (visually close or sharing parts),
  with the parts that tell them apart.

## 2026-11-12: vocabulary cards

- Words are cards of their own, keyed `w:<spelling>` so a one-kanji word never collides with its kanji card.
- A word unlocks once every kanji in it is known; order: JLPT level, common words first, then the curriculum
  position of its latest kanji, then length. Only glossed words of two or more characters (12,894).
- Exercises: word → meaning, word → reading, typed reading, and spelling (reading + gloss → the right spelling among
  look-alike spellings such as 持間 for 時間; never a real word read the same way). New words get meaning and
  reading only; spelling and typing come as the card matures. Hvorfor? reuses the kanji explanations.
- Kept apart like kana: kanji sessions, blitz and kanji stats ignore word cards; 10 new words a day of its own.
- Whole-word readings (一人 ひとり, 大人 おとな) are fine here: the word card teaches the word itself, intro first.

## 2026-11-12: kana track

- Hiragana and katakana are generated in `core/kana-track.ts` (46 basic, 25 dakuten, 33 yōon per script, plus 7
  katakana extensions such as ファ and シェ), taught hiragana first, basic → dakuten → yōon. ティ, ディ and ヴ wait
  until the romaji converter supports them.
- Same event log and FSRS as the kanji, keyed by the kana itself; kanji sessions, blitz, kanji stats and the kanji
  new-card quota ignore kana cards, and the kana track has its own quota (15 new a day).
- Exercises: kana → romaji, romaji → kana, typed romaji (Hepburn, Kunrei or kana accepted). New kana get same-row
  distractors; the known look-alikes (シ/ツ, ソ/ン, ぬ/め…) come once a kana is no longer new, and Hvorfor? only calls
  something a common mix-up when it is one.
- "I already know these" calibrates a whole script in one tap; those kana are checked by typing in 3–4 weeks and
  don't count as solid before that.

## 2026-11-12: Expo SDK 58

- expo 58.0.21, React Native 0.88.1, React 19.3.0, expo-router 58.0.28; every pin from SDK 58's
  `bundledNativeModules.json`, each at least two weeks old (cutoff 29 October). TypeScript stays 6.0.3.
- Fixes the two decode-uri-component advisories (expo-router no longer uses query-string 7) and the zod and
  deepmerge findings: `npm audit` has no high or critical left. One documented moderate (minimatch, build-time).
- Code changes it needed: the tab bar uses `navigateToTab` (expo-router 58 dropped `navigation` from tab bar props);
  `File.write()` is now async, so the export awaits it before opening the share sheet.
- Web output is now one chunk per screen (same origin, CSP unchanged).

## 2026-11-12: a curriculum, not a list

- **New kanji in JLPT order:** N5 → N4 → N3 → N2 → N1, then jōyō outside the lists. Within a level, frequency
  order, but a kanji's parts that are kanji come first (言 before 語, 木 before 林), even one level early (言 and 口
  are N4, 語 is N5); never more than one level. The order is the array order of `kanji.v1.json` (data 1.1.0);
  `.i` stays the frequency rank. Test: no kanji appears while a level two or more steps easier is unfinished.
- **Questions use words she can read:** besides the target, a prompt word may only contain kanji she has started.
  With none readable, the card gets kanji-only exercises.
- **Difficulty ramps with the card** (`core/curriculum.ts`): new cards get plain words only (every kanji read with
  one of its own readings), meaning/recognition/reading, and plain curriculum neighbours as distractors. Young cards
  add sound changes (rendaku, っ), fill-the-gap and some typing; established or calibrated cards get everything,
  whole-word readings (二十歳 はたち), typed recall and the visual look-alikes.
- **Data fix:** words with okurigana (会う, 読む, 食べる) had no furigana and no JLPT/common flags, because furifont
  only keys runs of kanji, so the most basic verbs fell out of each kanji's word list. Furigana now comes from
  matching the okurigana, flags from kotobako.

## 2026-10-28: M2 app shell

- **Expo SDK 57** (React Native 0.86), not 58: 58 was a month old. Versions are exact pins taken from SDK 57's own
  `bundledNativeModules.json` (the Expo version API is blocked from the build sandbox), each at least two weeks old.
- **Storage:** SQLite on Android (`expo-sqlite`), IndexedDB on the web. expo-sqlite's web build needs COOP/COEP
  headers, which GitHub Pages can't send. Both behind one `Store` interface; events are insert-or-ignore by id.
- **Fonts:** bundled TTFs on Android (no network); Google Fonts on the web, where unicode-range subsetting serves a
  few hundred KB instead of a 15 MB Shippori Mincho file.
- **Stroke data** is a separate web chunk, loaded when a detail page opens.
- **Audit:** `npm run audit` fails on high/critical unless accepted in `scripts/audit-accepted.json` with a reason and
  an expiry. One entry today: zod 3 inside `@expo/cli` (build-time only, no patched 3.x).
- **Language:** Danish by default, English in Indstillinger → Sprog. `app/src/i18n/en.ts` is typed against
  `da.ts`, so a missing key fails the typecheck. Kanji meanings and glosses stay English in both: that's the data.
- **Dependabot** never touches the Expo SDK set (expo, expo-*, React, React Native and their libraries), not even
  patches: an SDK upgrade is one deliberate change from `bundledNativeModules.json`. Everything else has a 14-day
  cooldown, and dev tooling comes grouped into one PR.
- **No reset button.** The log is append-only and will sync; export and import cover "start over somewhere else".

## 2026-10-28: design signed off

Mockups: https://claude.ai/artifact/LqXRxCWaasWmARK7P4mvpe (Hjem, Quiz, Svar + Hvorfor?, Kanji-detalje, Lyntest,
Kalibrering). **Dark only, no light mode.** These tokens replace the handover's §11 colours; fonts stay
(Shippori Mincho B1 for Japanese, Zen Kaku Gothic New for the UI).

| Token | Hex | Use |
|---|---|---|
| `bg` | `#000000` | ground |
| `surface` | `#17181C` | cards, list groups |
| `line` | `#2A2C33` | borders, dividers |
| `outline` | `#4A4D57` | outlined pills, kanji square |
| `ink` | `#FFFFFF` | text |
| `muted` | `#B4B8C4` | secondary text |
| `faint` | `#8E929E` | hints, key help |
| `navy` | `#0A0B5C` | hero, prompt and Hvorfor? cards, the "Nye" half |
| `swoosh` | `#2B1FD6` | the diagonal shape on hero areas |
| `accent` | `#3B30F0` | primary buttons, Lyntest tab; white text on it |
| `electric` | `#4A5CFF` | progress, rings, young cards |
| `highlight` | `#7C95FF` | target kanji, readings, links |
| `onNavy` | `#E4E6EE` / `#B9BCC8` | text and secondary text on navy |
| `wrong` | `#F07C66` | 朱: wrong and Again, nothing else |
| map | `#FFFFFF` mature, `#4A5CFF` young, `#241E8A` learning, `#26282F` unseen | progress map |

Layout cues from SAS: big black-weight headlines and numbers, a white pill CTA on the hero, the split card
(Repetition | Nye), stat tiles (label top left, chevron top right, number bottom left), grouped list rows, a floating
pill tab bar (家 Hjem, 字 Kanji, 統 Statistik) with a separate accent button (速 Lyntest).

## 2026-10-28: after the first review with Lena

**No in-app AI.** The app never calls the Claude API. Claude's part is the MCP server: Claude, in the Claude app,
reads her progress and works with her in chat. That drops §8's Edge Function → Claude path, `ai_cache`, `ai_usage`
and the budget kill-switch. What it replaces:
- *Hvorfor?* is deterministic: `core/explain.ts` classifies a wrong answer (rendaku, long vowel, っ, another reading
  of the same kanji, a look-alike kanji) and the app phrases it in Danish.
- *Lenient typed judging* is deterministic: any JMdict reading of the spelling is accepted (日本 にっぽん), and the
  "my answer was also valid" button stays.
- *Mnemonics* are hers to write in the app; later Claude can save one through the MCP server.

**MCP server read-only first**, then writes (`record_review`, `add_to_queue`, `save_mnemonic`) once it has proved
itself. `record_review` goes through `core/` like the app does.

**Progress is an event log.** `review_logs` (and calibrate, import, blitz-miss, queue events) are append-only with
client-generated ids; card state comes from replaying them (`core/cards.ts`). Sync is a union by id, so an offline
session can't duplicate or conflict, and FSRS weights can be re-optimised from the full history.

**Its own Supabase project**, separate from DANSK. A local backend would work for the app alone, but a remote MCP
connector needs something Claude can reach.

**UI in Danish, built on i18n keys** so English is a later switch, not a rewrite.

**Design:** SAS's app as the reference (her pick); see "design signed off" above.

## Data sources

GitHub release assets and edrdg.org are blocked from the build sandbox, so v1 sources come from npm and raw GitHub,
pinned by hash in `scripts/data/sources.json`. Nothing downloaded is executed (the RADKFILE package's `.js` data file
is parsed as text).

| Need | Source |
|---|---|
| jōyō list, meanings, readings, frequency | kanji-data (KANJIDIC2) |
| every reading of a spelling, furigana alignment, ichi/news/nf priority, JLPT | @furifont/dictionary (JMdict 2026-10-15) |
| English glosses (~23k common words) | kotobako-data (jmdict-simplified 3.6.2) |
| components | KRADFILE (via @johnmorrisdotca/bushu) |
| stroke order | KanjiVG (via kotobako-data) |

- Components are KRADFILE now, not WaniKani's names: the site is public, and glyphs (日 + 寺) suit a reader anyway.
- Look-alikes come from the strokes: each kanji's KanjiVG paths are rasterised, blurred and correlated, then blended
  with component overlap. That's what finds 末/未 and 土/士.
- Accepted typed answers are JMdict readings with real frequency; rare readings seen only inside longer words
  (説明 ときあか, from 説き明かす) are not accepted, but they are never used as distractors either.
- Tatoeba sentences aren't in v1. The i+1 sentence feature they backed is gone with in-app AI; if example
  sentences on the detail view are wanted, Lena fetches the jpn-eng pairs file and the pipeline adds it.
- Known gap: about 30 of the rarest kanji (貞, 璽, 辣…) only have unglossed or rare words. They come last in
  frequency order.
