# Roadmap

Where things stand and what's next. Newest decisions win over HANDOVER.md; see DECISIONS.md for the why.

## Done
- M1 core + data pipeline (2026-10-28)
- M2 app shell, Android + web, offline; first EAS APK running on the S26 (2026-10-28)
- English UI option
- Expo SDK 58 (2026-11-12): closes the URL-parsing advisories
- Kana track (2026-11-12): hiragana and katakana with their own sessions, calibration and chart (item 6; words in
  kana and listening come with audio, item 7)
- Curriculum (2026-11-12): JLPT order with parts first, prompts limited to words she can read, difficulty that
  ramps with each card (item 5 below, apart from vocabulary cards)

## Security
- Review of 2026-11-12: `docs/SECURITY-REVIEW.md`. Fixed S1–S7; Lena's settings (GitHub branch protection, push
  protection, 2FA; Supabase sign-ups off and redirect allowlist) are listed there; M3 must meet its threat model.

## Next: M3 sync
- Supabase project (EU), `SUPABASE_ACCESS_TOKEN` as an environment secret, `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` as variables, network access to `*.supabase.co` and `api.supabase.com`.
- Magic-link auth, events table with RLS, sync queue (union by id), RLS tests per table.
- Web deploy to kanji.lenagibson.eu (GitHub Pages, SPA 404 fallback, CNAME to lena-lsg.github.io).
- Local Android toolchain on the laptop (`npx expo run:android`), see DEV-SETUP.md.

## Feedback from the first evening on the phone (2026-10-28)
1. **Explain why the right answer is right**, not only what kind of slip the wrong one was, on every exercise type:
   - read/type: break the word down per kanji with its furigana (時 じ + 間 かん), and flag readings that belong to
     the whole word (二十歳 はたち, 今日 きょう: jukujikun) so they aren't mistaken for per-kanji readings.
   - mean/which/fill: show what the right kanji means and what the picked one means, with the components that
     tell them apart; for fill, the word's gloss and the reading the gap carries.
   - Hvorfor? should appear on every wrong answer, with a plain fallback when no slip pattern matches.
2. **Handwriting and stroke order** (was out of scope in the handover; now in): draw the kanji on a canvas,
   judged stroke by stroke against KanjiVG (order, direction, rough shape), with hints after a miss.
3. **Vocabulary, not only kanji** (also previously out of scope; now in): words as cards of their own with their
   own scheduling and exercises (reading, meaning, kanji-from-kana), sharing the event log.
4. **New cards shouldn't open on a jukujikun word.** A freshly introduced 十 tested with 二十歳 はたち teaches
   nothing about 十. Prefer words whose furigana splits per kanji for a card's first quizzes.
5. **Teach by difficulty and build vocabulary in order.** Today new kanji come in newspaper-frequency order and a
   prompt word is picked at random from a kanji's six most common, whether or not she knows the other kanji in it.
   Instead:
   - **Words are i+1:** a prompt word may contain only the target plus kanji she already knows (started, or above
     a stability threshold); otherwise fall back to the kanji alone or a kana-supported word. Harder words
     (jukujikun, rendaku, rare readings) unlock as the card matures.
   - **Kanji order is a curriculum, not a list:** frequency blended with JLPT level and with component order
     (teach 木 before 林 and 森, 言 before 語), so each new kanji is built from parts she has seen.
   - **Vocabulary follows the kanji:** a word becomes a card of its own once all its kanji are known, easiest and
     most common first, so the word list grows out of what she can already read.
   - **JLPT levels in order: no N1 before N5.** Today's frequency order puts 29 N3 kanji, one N2 and one N1 in
     the first hundred. New kanji should come N5 → N4 → N3 → N2 → N1, frequency and component order within each
     level, non-JLPT jōyō last. Calibration still lets her skip whole stretches she already reads.
   - **Exercise difficulty ramps:** meaning and recognition for new cards, readings next, typed recall and
     look-alike distractors once a card is stable.
6. **Kana practice:** hiragana and katakana as their own track, before or alongside N5: recognition (kana →
   romaji), production (romaji → pick the kana), dakuten/handakuten, yōon (きゃ), small っ, long vowels in katakana
   (ー), and the classic look-alikes (シ/ツ, ソ/ン, ぬ/め, わ/ね). Same SRS and event log as the kanji. Typing by
   ear once audio exists. Calibration can mark the whole track known in one tap.
7. **Audio:** the device's Japanese text-to-speech (`expo-speech` on Android, the Web Speech API in the browser),
   offline where the voice is installed. Play the word on the answer screen, a "listen and choose" exercise, and
   a speaker button on every word in the detail view. Check the S26 and Xperia have a Japanese voice installed.

## A personal WaniKani replacement
What WaniKani has that we still lack, in the order to build it:
- **A structured path** with levels that unlock: components → kanji → vocabulary (items 3 and 5).
- **A mnemonic for every item.** WaniKani's are copyrighted, so never copied: hers, or written with Claude in chat
  through the MCP server and saved to the kanji (`save_mnemonic`).
- **Vocabulary audio** (item 7) and **example sentences** filtered to kanji she knows (needs the Tatoeba
  jpn-eng file).
- Beyond WaniKani: calibration for what she already reads, look-alike distractors, deterministic Hvorfor?,
  handwriting (item 2), kana (item 6), offline, free, her data.

Suggested order: curriculum + JLPT order + i+1 words → kana track → vocabulary cards → audio → M3 sync →
mnemonics via MCP → handwriting.
8. **Japanese keyboard for Japanese answers.** Android doesn't let an app switch the user's keyboard itself (only
   the user, or a system app, can change the input method). What works instead: `imeHintLocales` set to Japanese
   on the answer field, which Gboard and Samsung Keyboard honour by switching to their Japanese layout when it is
   enabled. React Native's TextInput doesn't expose it, so it needs a small local Expo module (or a config plugin)
   on Android. On the web: `lang="ja"` on the input, which some virtual keyboards respect. Romaji input stays as it
   is for anyone without a Japanese keyboard, and kana typed directly is already accepted.
