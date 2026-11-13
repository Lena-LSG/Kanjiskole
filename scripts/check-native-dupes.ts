import { createRequire } from "node:module";
// Fails if any native module (expo*, @expo/*, react-native*) is installed in more than one version, or in a
// version the installed Expo SDK doesn't list. Two copies
// means JavaScript from one version talking to native code from another: the first SDK 58 APK crashed at start
// because of exactly this (expo-constants and expo-font, pinned older than what `expo` itself depends on).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")) as {
  packages: Record<string, { version?: string; link?: boolean }>;
};
const native = /^(expo(-.+)?|@expo\/.+|react-native(-.+)?|@react-native\/.+)$/;
// Only packages that ship native code count: two copies of a JS-only helper are harmless.
const hasNativeCode = (path: string) =>
  ["android", "expo-module.config.json", "react-native.config.js"].some((f) => existsSync(join(root, path, f)));
// Copies nested inside Expo's own CLI tooling are used only while prebuilding, never linked into the app.
const toolingOnly = (path: string) => path.includes("node_modules/@expo/prebuild-config/node_modules/");
const versions = new Map<string, Set<string>>();
for (const [path, p] of Object.entries(lock.packages)) {
  if (!path.includes("node_modules/") || p.link || !p.version || toolingOnly(path)) continue;
  const name = path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
  if (native.test(name) && hasNativeCode(path)) (versions.get(name) ?? versions.set(name, new Set()).get(name)!).add(p.version);
}
const dupes = [...versions].filter(([, v]) => v.size > 1);
if (dupes.length) {
  for (const [n, v] of dupes) console.error(`${n}: ${[...v].join(", ")}`);
  console.error("Pin the direct dependency to the version the SDK package itself uses.");
  process.exit(1);
}

// Every native module must also be the version the installed Expo SDK was tested with. Transitive ones count
// too: expo-router accepts any gesture-handler ("*"), and npm picked one newer than SDK 58 supports, which
// crashed the app at start.
const satisfies = createRequire(import.meta.url)("semver/functions/satisfies") as (v: string, r: string) => boolean;
const table = JSON.parse(readFileSync(join(root, "node_modules/expo/bundledNativeModules.json"), "utf8")) as Record<string, string>;
const off = [...versions].flatMap(([n, v]) => {
  const want = table[n];
  const have = [...v][0]!;
  return want && !satisfies(have, want) ? [`${n}: have ${have}, Expo SDK expects ${want}`] : [];
});
if (off.length) {
  for (const o of off) console.error(o);
  console.error("Pin it as a direct dependency of app/ at the SDK's version.");
  process.exit(1);
}
console.log(`native modules: ${versions.size}, one version each, all matching the Expo SDK table`);
