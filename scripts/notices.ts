// Third-party notices for everything that ships inside the app, so the licences that ask for their notice to travel
// with the software (MIT, BSD, Apache-2.0, OFL…) are honoured in the APK and the web build.
//
//   npm run notices           regenerate THIRD-PARTY-NOTICES.md and assets/data/notices.v1.json
//   npm run notices -- --check   fail if they are stale (CI): a listed version changed, or a shipped package is missing
//
// What ships is measured, not guessed: the JavaScript packages are read from the source maps of real Android and
// web exports, then every autolinked native module (its Java/C++ is in the APK even when no JS of it is bundled) and the
// bundled fonts are added.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const OUT_MD = join(root, "THIRD-PARTY-NOTICES.md");
const OUT_JSON = join(root, "assets/data/notices.v1.json");

type LockEntry = { version?: string; license?: string | { type: string }; dev?: boolean; link?: boolean };
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")) as { packages: Record<string, LockEntry> };
const installed = (name: string) => lock.packages[`node_modules/${name}`] ?? lock.packages[`app/node_modules/${name}`];
const dirOf = (name: string) => [join(root, "node_modules", name), join(root, "app/node_modules", name)].find(existsSync);

/** Autolinked native modules: their compiled code is in the APK whether or not their JS is bundled. */
function nativeModules(): string[] {
  const native = /^(expo(-.+)?|@expo\/.+|react-native(-.+)?|@react-native\/.+|@react-native-.+\/.+)$/;
  return Object.entries(lock.packages)
    .filter(([p, e]) => p.includes("node_modules/") && !e.dev && !e.link)
    .map(([p]) => p.slice(p.lastIndexOf("node_modules/") + "node_modules/".length))
    .filter((n) => native.test(n) && existsSync(join(dirOf(n) ?? "", "android")));
}

/** Fonts the native build bundles (see app/src/fonts.native.ts). */
const fonts = () => [...new Set(readFileSync(join(root, "app/src/fonts.native.ts"), "utf8").match(/@expo-google-fonts\/[a-z0-9-]+/g) ?? [])];

/** Packages whose JavaScript is in the Android or web bundle, from the exports' source maps. */
function bundled(): string[] {
  const out = mkdtempSync(join(tmpdir(), "notices-"));
  try {
    execFileSync("npx", ["expo", "export", "-p", "android", "-p", "web", "--source-maps", "--output-dir", out], {
      cwd: join(root, "app"), stdio: "ignore", env: { ...process.env, EXPO_NO_TELEMETRY: "1" },
    });
    const maps: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(d, e.name));
        else if (e.name.endsWith(".map")) maps.push(join(d, e.name));
      }
    };
    walk(out);
    const names = new Set<string>();
    for (const m of maps) {
      // Web maps are index maps (sections), Android's are flat.
      type SourceMap = { sources?: string[]; sections?: { map: SourceMap }[] };
      const sourcesOf = (x: SourceMap): string[] => [...(x.sources ?? []), ...(x.sections ?? []).flatMap((sec) => sourcesOf(sec.map))];
      for (const s of sourcesOf(JSON.parse(readFileSync(m, "utf8")) as SourceMap)) {
        const i = s.lastIndexOf("node_modules/");
        if (i < 0) continue;
        const [a, b] = s.slice(i + "node_modules/".length).split("/");
        names.add(a!.startsWith("@") ? `${a}/${b}` : a!);
      }
    }
    return [...names];
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

const licenceOf = (e: LockEntry | undefined, dir: string) => {
  const l = e?.license ?? (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { license?: LockEntry["license"] }).license;
  return (typeof l === "object" ? l.type : l) ?? "UNKNOWN";
};

/** The licence text(s) a package ships: LICENSE, LICENCE, COPYING, and a font's LICENSE_FONT. */
function licenceText(dir: string): string | null {
  const files = readdirSync(dir).filter((f) => /^(licen[cs]e|copying)([._-].*)?$/i.test(f) && !/\.(js|ts|json)$/i.test(f)).sort();
  const texts = files.map((f) => readFileSync(join(dir, f), "utf8").trim()).filter(Boolean);
  return texts.length ? texts.join("\n\n---\n\n") : null;
}

interface Entry { n: string; v: string; l: string; t: number | null }

function generate() {
  const names = [...new Set([...bundled(), ...nativeModules(), ...fonts()])].filter((n) => dirOf(n)).sort();
  const texts: string[] = [];
  const entries: Entry[] = names.map((n) => {
    const dir = dirOf(n)!;
    const e = installed(n);
    const v = e?.version ?? (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version: string }).version;
    const text = licenceText(dir);
    let t: number | null = null;
    if (text) { t = texts.indexOf(text); if (t < 0) t = texts.push(text) - 1; }
    return { n, v, l: licenceOf(e, dir), t };
  });
  writeFileSync(OUT_JSON, JSON.stringify({ packages: entries, texts }) + "\n");

  const md = [
    "# Third-party notices",
    "",
    "Generated by `npm run notices` from what actually ships in the app (the Android and web bundles' source maps, the",
    "autolinked native modules and the bundled fonts). Do not edit by hand. Data and media credits: `CREDITS.md`.",
    "",
    "| Package | Version | Licence |",
    "|---|---|---|",
    ...entries.map((e) => `| ${e.n} | ${e.v} | ${e.l} |`),
    "",
    ...entries.flatMap((e) => [`## ${e.n} ${e.v} (${e.l})`, "", e.t === null ? "_No licence file in the package; licence as declared above._" : "```\n" + texts[e.t] + "\n```", ""]),
  ].join("\n");
  writeFileSync(OUT_MD, md);
  console.log(`notices: ${entries.length} packages, ${texts.length} distinct licence texts`);
}

/** CI: cheap staleness check without an export. */
function check() {
  const { packages } = JSON.parse(readFileSync(OUT_JSON, "utf8")) as { packages: Entry[] };
  const listed = new Map(packages.map((p) => [p.n, p.v]));
  const problems: string[] = [];
  for (const [n, v] of listed) {
    const now = installed(n)?.version;
    if (now && now !== v) problems.push(`${n}: listed ${v}, installed ${now}`);
  }
  const appDeps = Object.keys((JSON.parse(readFileSync(join(root, "app/package.json"), "utf8")) as { dependencies: Record<string, string> }).dependencies);
  for (const n of [...nativeModules(), ...fonts(), ...appDeps.filter((d) => !d.startsWith("@types/") && d !== "typescript")]) {
    if (!listed.has(n) && n !== "@kanjiskole/core") problems.push(`${n}: ships but is not listed`);
  }
  if (problems.length) {
    for (const p of problems) console.error(p);
    console.error("Run `npm run notices` and commit the result.");
    process.exit(1);
  }
  console.log(`notices: ${listed.size} packages, up to date`);
}

if (process.argv.includes("--check")) check();
else generate();
