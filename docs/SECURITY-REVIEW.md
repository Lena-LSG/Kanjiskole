# Security review, 2026-11-12 (re-checked 2026-11-13)

Scope: everything that exists before M3 (the Expo app on Android and web, `packages/core`, the data pipeline, CI,
dependencies, GitHub and Expo configuration), plus a threat model for M3 (Supabase, sync, MCP) so that work starts
from known requirements. Method: reading the code and config, generating the Android manifest with
`expo prebuild`, a clean `npm ci` with lifecycle scripts disabled, both bundles built, and the web build driven in
headless Chromium with CSP violations logged.

Severity is for this app as it is: one user, study progress, no credentials stored yet.

## Summary

| ID | Area | Finding | Severity | Status |
|---|---|---|---|---|
| S1 | Android | Manifest requested SYSTEM_ALERT_WINDOW (draw over other apps), READ/WRITE_EXTERNAL_STORAGE and VIBRATE; none are used | Medium | **Fixed**: `blockedPermissions` in `app/app.json`; only INTERNET remains (verified in the generated manifest) |
| S2 | Web | No Content Security Policy; GitHub Pages can't send headers | Medium | **Fixed**: CSP meta in `app/public/index.html` (scripts from self only, no eval, no plugins, no base or form targets); tested with a full session, detail page and blitz: no violations |
| S3 | Supply chain | Dependency lifecycle scripts could run arbitrary code on `npm ci` (dev machine, CI, EAS) | Medium | **Fixed**: `ignore-scripts=true` in `.npmrc`; none of the 631 packages has an install script today, so nothing breaks (clean install, tests and both bundles verified) |
| S4 | CI | Actions pinned to movable tags; checkout left the token in `.git/config` | Low | **Fixed**: pinned to commit SHAs (Dependabot updates SHA pins), `persist-credentials: false`; workflow token is already `contents: read` |
| S5 | App | `kanjiskole://session?extra=…` trusted the number: a crafted link could start a session of all 2,136 kanji | Low | **Fixed**: clamped to 1–30 |
| S6 | App | `/kanji/<k>` decoded the parameter again; a stray `%` threw into the error screen | Low | **Fixed**: safe decode |
| S7 | Web privacy | Referrer sent to Google Fonts | Info | **Fixed**: `referrer: no-referrer`. Google still sees the IP on font load; self-hosted subset fonts are an option later |
| S8 | Dependencies | decode-uri-component (one high, one moderate): a crafted URL can hang the tab or app. Fix needs expo-router 58; a forced override crashes routing (ESM-only fix under a CommonJS caller) | High (DoS only) | **Fixed 2026-11-12** by the SDK 58 upgrade (decode-uri-component is gone from the tree) |
| S9 | Dependencies | zod 3 and deepmerge inside Expo's build tooling | High / Low | **Fixed 2026-11-12** by SDK 58. Left: minimatch (moderate, build-time), documented in `scripts/audit-accepted.json` |
| S10 | GitHub | Default branch is the work branch; no branch protection; no required checks | Medium | **Open, Lena**: see "Settings to change" |
| S11 | Data | `kotobako-data` comes from an unknown npm publisher | Low | Accepted: pinned by integrity hash, parsed as JSON only, never executed. Poisoned content could only mislead (wrong glosses), not run code. Cross-check against jmdict-simplified when GitHub releases are reachable |
| S12 | App | Error screen shows the raw error message | Info | Accepted: local only, no secrets exist in the app; revisit when tokens exist (M3) |
| S14 | App | Pronunciation recordings come from a third-party host (`media.kanjialive.com`) and are not hash-verified yet (the host is unreachable from the build sandbox) | Low | Accepted until M3: HTTPS only, the CSP allows that one origin for media and fetch, every file must start with the Ogg signature before it is played or cached, failures fall back to TTS. M3: self-host with SHA-256 per file in `audio.v1.json` |
| S13 | Android | `allowBackup` is on, so progress goes to Google backup | Info | Accepted on purpose: it is the only backup until sync exists. Turn off (or exclude the auth store) once M3 stores tokens |

Already in good shape: no secrets in the repository; `.env*` ignored; the lockfile resolves only from the npm
registry with integrity hashes; data sources pinned by SHA-256/SRI and never executed (the RADKFILE `.js` is parsed
as text); `execFileSync` without a shell in the pipeline; workflow token read-only; no `pull_request_target`; the
repository is private; cleartext HTTP is off by default on Android; the prototype import validates shape, kanji and
numbers, and its event ids are deterministic so a re-import can't duplicate; no analytics or trackers.

## Settings to change (Lena)

GitHub:
1. After M3 starts, create `main`, make it the default branch, and work in PRs to it.
2. Branch protection on `main`: require the CI checks (`check`, `web`, `data`), require a PR, block force pushes
   and deletion.
3. Settings → Code security: secret scanning and **push protection** on (Supabase keys are about to exist).
4. Two-factor authentication on GitHub and on the Expo account (Expo holds the Android signing keystore).

Supabase (when the project is created, before any data):
5. **Disable public sign-ups**, or allow only your address. With magic links on and sign-ups open, anyone can make
   an account on your project and use its quota.
6. Auth → URL configuration: redirect URLs limited to `https://kanji.lenagibson.eu/**` and `kanjiskole://**`.
7. MFA on the Supabase account; the access token for me is scoped to this project and has an expiry.

## Threat model for M3 (requirements, not suggestions)

Assets: study history (low sensitivity), the email address, the Supabase session, the project's quota, and the
integrity of the scheduler (a poisoned log corrupts every future review).

Actors: anyone on the internet with the public anon key (it ships in the app by design); a crafted link; a
compromised dependency; prompt injection reaching Claude through the MCP server (her own mnemonics or imported text
are untrusted when Claude reads them).

Controls M3 must have, each with a test:
- **RLS on every table, forced** (`alter table … force row level security`), policies `user_id = auth.uid()` for
  select and insert. `review_logs`/events: **no update or delete policy**, so the log stays append-only; a test per
  table proves another user can neither read nor write.
- **Events validated server-side**: a check constraint or trigger on type, kanji (one character), grade (1–4),
  timestamps (not in the future beyond clock skew), and payload size. The client's `ingest` validates pulled events
  with zod before they reach `replay`.
- **Only the anon key in the client.** No service-role key anywhere in the app or the repo; CI gets none.
- **Session storage**: on Android in `expo-secure-store` (Keystore-backed), not plain storage. On the web the
  session sits in `localStorage`, which is why S2's CSP matters; keep third-party scripts at zero.
- **CSP**: add exactly the Supabase project origin to `connect-src`, nothing broader.
- **Edge Functions** (if any): verify the JWT, validate with zod, cap request size, rate-limit per user.
- **MCP server**: OAuth tied to her account; read-only first; later write tools go through `core/` (the same
  validation and scheduler as the app), never raw SQL from tool arguments; no destructive tools; tool calls logged;
  text from the database returned to Claude is labelled as data.

## Re-check 2026-11-13 (release 1.0.0)

Scope: everything added since the first review (audio, kana and vocabulary tracks, the hubs, word pages, About,
the native-module fixes), plus a fresh pass over CI, the git history and the shipped permissions.

| ID | Area | Finding | Severity | Status |
|---|---|---|---|---|
| S15 | CI | The workflow ran only on pushes to `main`, which doesn't exist: no push had ever been checked | Medium | **Fixed**: runs on every push and pull request |
| S16 | App | Recording lookup used `word in files`, which also matches inherited keys (`constructor`) | Low | **Fixed**: `Object.hasOwn`. A test pins the audio manifest to one HTTPS host and plain file names (no `/`, no `..`) |
| S17 | Android | expo-audio's library manifest merges in `MODIFY_AUDIO_SETTINGS` | Info | Accepted: a normal-level permission (no prompt, no data access) needed for playback. No microphone: the expo-audio config plugin, which would add `RECORD_AUDIO`, is not used. Verified from the generated app manifest and every library manifest |
| S18 | App | New URL parameters: `/word/<w>`, `extra` on all three sessions, `script` on kana | Low | Safe by construction: safe decode for `/word`, `extraNew` clamps to 1–30 (tested), `script` is an allowlist of two values |
| S19 | Supply chain | Licences of what ships were unverified | Info | **Fixed**: `npm run notices` measures what ships (source maps of both bundles, autolinked native modules, fonts); a test fails if anything non-permissive gets in; CI fails if the list is stale |

Also checked, no finding: no secrets anywhere in the git history (token, key and JWT patterns); user input never
reaches a regular expression unescaped (kanji and word search); About opens only constant URLs; `npm audit` shows only
the documented minimatch entry; the app requests INTERNET and nothing else that needs consent.

## Re-check

At the next Expo SDK upgrade, when M3 lands (the controls above), and whenever `scripts/audit-accepted.json`
entries expire (CI enforces that).
