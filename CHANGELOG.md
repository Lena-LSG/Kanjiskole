# Changelog

All notable changes. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions
follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-13

The first release: a complete reading trainer for kanji, kana and vocabulary on Android and the web.

### Added
- **Kanji**: calibration, daily sessions with FSRS scheduling, i+1 prompt words, JLPT N5 → N1 curriculum with
  components first, five exercise types with distractors that are realistic mistakes, "Hvorfor?" explanations on
  every answer, kanji pages with readings, words, stroke order and mnemonics, the progress map, Lyntest.
- **Kana**: hiragana and katakana sessions, the full chart coloured by stage with a detail sheet per character,
  look-alike drills, listening, "I already know these" calibration.
- **Vocabulary**: words unlock when their kanji are known; progress by JLPT level; the full list with search and
  status/level filters; a page per word with furigana, sound and its kanji.
- **Audio**: Kanji alive native-speaker recordings for 4,497 words, cached for offline use, and the device's
  Japanese voice for everything else.
- Five extra new cards beyond the daily allowance in every track.
- Statistics per track: accuracy, streak, reviews per day, stages, weakest cards, leeches.
- Danish and English UI; import from the prototype; JSON export.
- About screen with credits and the licence of every open-source package inside the app.

### Security
- Reviewed twice (`docs/SECURITY-REVIEW.md`, S1–S19): only the INTERNET permission, a strict web CSP, lifecycle
  scripts disabled, pinned actions, audit exceptions that expire, measured third-party notices.

### Licence
- Kanjiskole's code is GPL-3.0-only. Data under CC BY-SA 4.0 / 3.0 and CC BY 4.0 as credited in `CREDITS.md`.

[1.0.0]: https://github.com/Lena-LSG/Kanjiskole/releases/tag/v1.0.0
