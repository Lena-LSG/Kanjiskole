# Kanjiskole

A kanji-reading trainer for one learner: calibrate what you already read, then drill kanji inside real words with
FSRS scheduling and distractors that are realistic mistakes. Web and Android from one Expo codebase, synced
through Supabase, with an MCP server so Claude can see the progress.

- `docs/HANDOVER.md`: the original spec. `docs/DECISIONS.md`: what changed and why.
- `docs/prototype/`: the single-file prototype that defines v1 behaviour.
- `packages/core/`: all the logic (kana, FSRS via ts-fsrs, distractors, exercises, sessions, stats, import). No UI.
- `scripts/data/`: the reproducible data build. `assets/data/`: its output (never edit by hand).

```sh
npm ci
npm test          # Vitest, in Europe/Copenhagen time
npm run typecheck
npm run data      # fetch pinned sources, rebuild assets/data
```

Data licences: `assets/data/LICENSES.md`.
