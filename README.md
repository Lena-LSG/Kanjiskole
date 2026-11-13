# Kanjiskole

A Japanese reading trainer for one learner, in Danish or English. It starts from what you already read, then
teaches kanji inside real words, with FSRS scheduling and wrong answers that are realistic mistakes. Kana and
vocabulary are tracks of their own. Android and web from one Expo codebase. It works offline and has no
accounts, analytics or AI calls.

## What it does

- **Kanji**: calibrate what you know, then daily sessions. Words are i+1 (only kanji you know plus the new one),
  the order is JLPT N5 → N1 with components first, and every answer has a "Hvorfor?" that explains why the right
  one is right. Kanji pages show readings, words, stroke order and your own mnemonic.
- **Kana**: hiragana and katakana with the full chart coloured by progress, look-alike drills (シ/ツ) and listening.
- **Vocabulary**: a word unlocks when you know all its kanji, so the word list grows out of what you can read
  (12,894 words, by JLPT level, searchable, each with its own page).
- **Audio**: native-speaker recordings from Kanji alive for 4,497 words (fetched once, then offline) and the
  device's Japanese voice for the rest.
- **Lyntest**: a 60-second blitz. **Statistik**: accuracy, streak, stages, weakest cards and leeches per track.
- Five extra new cards beyond the daily allowance in every track. Import from the prototype, export as JSON.

## Repository

| Path | What |
|---|---|
| `app/` | The Expo app (SDK 58, expo-router). Screens in `app/src/app/`, building blocks in `app/src/components/` |
| `packages/core/` | All the learning logic: FSRS (ts-fsrs), curriculum, exercises, distractors, sessions, stats. No UI, fully tested |
| `scripts/data/` | The reproducible data build from hash-pinned sources. Output in `assets/data/` (never edit by hand) |
| `scripts/` | Supply-chain checks: `audit.ts`, `check-native-dupes.ts`, `notices.ts` |
| `docs/` | `DECISIONS.md` (what changed and why), `ROADMAP.md`, `SECURITY-REVIEW.md`, `DEV-SETUP.md`, the original `HANDOVER.md` and prototype |

## Development

Node 22 (see `.nvmrc`). Setting up a Windows machine from scratch: `docs/DEV-SETUP.md`.

```sh
npm ci
npm test               # Vitest, in Europe/Copenhagen time
npm run typecheck
npm run lint           # ESLint: typescript-eslint (type-aware) and the React hooks rules
npm run audit          # npm audit, with explicit and expiring exceptions
npm run check:native   # native modules: one version each, all matching the Expo SDK, no Expo Modules v2
npm run notices        # regenerate THIRD-PARTY-NOTICES.md from what actually ships
npm run data           # fetch the pinned sources and rebuild assets/data
npm run web            # dev server
npm run build:web      # static export to app/dist
```

Android APKs are built with EAS from `app/`: `npx eas-cli@latest build -p android --profile preview`. CI runs
every check above on every push, plus both bundles, the data build and a REUSE licence lint.

## Releases

Tag `vX.Y.Z` with the APK link in `docs/releases/vX.Y.Z.md`. The release workflow publishes the notes, the APK
(with its SHA-256) and the web build on GitHub. History: `CHANGELOG.md`.

## Licence

Kanjiskole is free software: you can redistribute it and/or modify it under the terms of the
[GNU General Public License v3](LICENSE).

The dictionary data is derived from the EDRDG's JMdict, KANJIDIC2, RADKFILE and KRADFILE and is shared under
CC BY-SA 4.0; stroke order is from KanjiVG (CC BY-SA 3.0); the recordings are from Kanji alive (CC BY 4.0). Who
made what: [`CREDITS.md`](CREDITS.md). The open-source packages inside the app and their licences:
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md). Per-file licensing follows the [REUSE](https://reuse.software)
specification (`REUSE.toml`, `LICENSES/`).
