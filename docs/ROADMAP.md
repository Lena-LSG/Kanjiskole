# Roadmap

Where things stand and what's next. Newest decisions win over HANDOVER.md; see DECISIONS.md for the why.

## Done
- M1 core + data pipeline (2026-10-28)
- M2 app shell, Android + web, offline; first EAS APK running on the S26 (2026-10-28)
- English UI option

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
