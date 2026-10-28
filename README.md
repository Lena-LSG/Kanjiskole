# Kanjiskole

A kanji-reading trainer for one learner: calibrate what you already read, then drill kanji inside real words with
FSRS scheduling and distractors that are realistic mistakes. Web and Android from one Expo codebase, synced
through Supabase, with an MCP server so Claude can see the progress.

- `docs/HANDOVER.md`: the original spec. `docs/DECISIONS.md`: what changed and why.
- `docs/prototype/`: the single-file prototype that defines v1 behaviour.
- `app/`: the Expo app (Android + web), expo-router screens in `app/src/app/`.
- `packages/core/`: all the logic (kana, FSRS via ts-fsrs, distractors, exercises, sessions, stats, import). No UI.
- `scripts/data/`: the reproducible data build. `assets/data/`: its output (never edit by hand).

```sh
npm ci
npm test          # Vitest, in Europe/Copenhagen time
npm run typecheck
npm run data      # fetch pinned sources, rebuild assets/data
npm run audit     # npm audit with explicit, expiring exceptions
npm run web       # dev server for the web app
npm run build:web # static export to app/dist
```

Android (EAS, from `app/`): `npx eas-cli@latest login`, `npx eas-cli@latest init` once, then
`npx eas-cli@latest build -p android --profile preview` for an installable APK.

Setting up a machine: `docs/DEV-SETUP.md`. Data licences: `assets/data/LICENSES.md`.
