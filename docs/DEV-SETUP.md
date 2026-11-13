# Dev setup (Windows)

What it took to get from a fresh clone to an APK, so the next machine is a checklist and not an evening.

## Before cloning

- **Node: an even-numbered LTS (22 or 24).** `node -v`. Odd releases (23, 25) are short-lived and React Native
  refuses 23. If winget installed it, the ID carries the major: `winget list node` shows e.g. `OpenJS.NodeJS.23`;
  `winget uninstall OpenJS.NodeJS.23`, then `winget install OpenJS.NodeJS.LTS`, then open a new terminal.
- **Git credentials: only `manager`.** `git config --show-origin --get-all credential.helper` should list
  `manager` (from Git for Windows) and nothing else. A `cache` helper is Linux/macOS only; remove it with
  `git config --global --unset-all credential.helper`. A stale GitHub login shows up as "Invalid username or
  token"; clear it with `"protocol=https`nhost=github.com`n" | git credential reject`.
- **Not as Administrator.** npm runs third-party install scripts; a normal terminal is enough for everything here.
- **Long paths on** (DANSK lesson), and keep the repo in a short path such as `C:\Users\<you>\kanji`.

## Clone and install

```
git clone https://github.com/Lena-LSG/Kanjiskole kanji
cd kanji
npm ci
npm test
```

`.npmrc` sets `ignore-scripts=true`: no dependency gets to run code at install time (none needs to). If a future
dependency genuinely needs a build step, run it explicitly rather than turning scripts back on globally.

`npm ci` may warn that cached tarballs are corrupted and refresh them; that's npm healing its cache, and the
lockfile hashes still verify. `npm audit` reports one moderate (minimatch, in Expo's build tooling): documented in
`scripts/audit-accepted.json`. Never `npm audit fix --force`: it "fixes" things by downgrading Expo.

## Android build in the cloud (EAS)

From `app/`:

```
npx eas-cli@latest login
npx eas-cli@latest init        # once; writes the project id into app.json, commit it
npx eas-cli@latest build -p android --profile preview
```

From a Claude Code cloud session: use the **Kanji** environment (network: api.expo.dev, expo.dev,
storage.googleapis.com; setup script runs `npm ci`). The Expo robot token "Claude (robot)" is saved there as a
network secret for api.expo.dev, so the proxy adds it and no key exists in the repo or the session; the CLI only
needs a placeholder: `EXPO_TOKEN=proxy-injected npx eas-cli@latest build -p android --profile preview
--non-interactive --no-wait`. Revoke the robot token on expo.dev to cut that access.

Let EAS generate and keep the keystore: every future update has to be signed with the same one.
`eas build --local` does not run on Windows.

## Android on the device (local, no queue)

For a second machine with a full Android toolchain:

- Android Studio for the SDK, platform tools and an emulator; one JDK, with `JAVA_HOME` pointing at it (check the
  version React Native 0.86 requires before installing).
- `npx expo run:android` from `app/` builds a development build and installs it over USB (with USB
  debugging on). After that, JS changes arrive through Metro in seconds.
- A local release APK: `npx expo prebuild -p android`, then `gradlew assembleRelease` in `app/android`.

## Web

```
npm run web        # dev server
npm run build:web  # static export to app/dist
```
