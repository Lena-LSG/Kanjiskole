// Guards on the shipped assets that aren't core logic but would be security or licence problems if they drifted.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const asset = (f: string) => JSON.parse(readFileSync(new URL(`../../../assets/data/${f}`, import.meta.url), "utf8")) as unknown;

describe("audio manifest", () => {
  const m = asset("audio.v1.json") as { base: string; ext: string; files: Record<string, string> };
  it("points at one HTTPS host, and every file name is a plain name (no path, no traversal)", () => {
    expect(m.base).toBe("https://media.kanjialive.com/examples_audio/audio-opus/");
    expect(m.ext).toBe(".opus");
    const bad = Object.values(m.files).filter((f) => !/^[a-z0-9()-]+_\d\d_[a-z]$/.test(f));
    expect(bad).toEqual([]);
  });
});

describe("third-party notices", () => {
  const n = asset("notices.v1.json") as { packages: { n: string; l: string; t: number | null }[]; texts: string[] };
  // Permissive licences only inside the app; anything else needs a deliberate decision (CREDITS.md).
  const ALLOWED = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD", "MIT AND OFL-1.1", "OFL-1.1", "BlueOak-1.0.0"]);
  it("every package inside the app is under a permissive licence", () => {
    expect(n.packages.filter((p) => !ALLOWED.has(p.l)).map((p) => `${p.n}: ${p.l}`)).toEqual([]);
  });
  it("lists the app's core runtime and the bundled fonts", () => {
    const names = new Set(n.packages.map((p) => p.n));
    for (const p of ["react", "react-native", "expo", "ts-fsrs", "@expo-google-fonts/shippori-mincho-b1", "@expo-google-fonts/zen-kaku-gothic-new"]) expect(names).toContain(p);
  });
});
