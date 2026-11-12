// Downloads every pinned source into .cache/sources and verifies it. Uses curl and `npm pack`
// so the sandbox proxy and npm's own integrity checks apply. Nothing downloaded is executed.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { extname, join } from "node:path";

type Source = { url?: string; sha256?: string; npm?: string; integrity?: string; file?: string };

const root = new URL("../..", import.meta.url).pathname;
const cache = join(root, ".cache/sources");
const sources: Record<string, Source> = JSON.parse(readFileSync(join(root, "scripts/data/sources.json"), "utf8"));
mkdirSync(cache, { recursive: true });

const hash = (algo: string, path: string, enc: "hex" | "base64") =>
  createHash(algo).update(readFileSync(path)).digest(enc);

for (const [name, s] of Object.entries(sources)) {
  if (name.startsWith("$")) continue;
  if (s.url) {
    const out = join(cache, `${name}${extname(new URL(s.url).pathname) || ".json"}`);
    if (!existsSync(out) || hash("sha256", out, "hex") !== s.sha256) {
      execFileSync("curl", ["-sSfL", "--retry", "3", "-o", out, s.url], { stdio: "inherit" });
    }
    const got = hash("sha256", out, "hex");
    if (got !== s.sha256) throw new Error(`${name}: sha256 ${got} does not match the pin ${s.sha256}`);
  } else if (s.npm && s.integrity && s.file) {
    const dir = join(cache, name);
    const tgz = join(cache, `${name}.tgz`);
    if (!existsSync(tgz) || `sha512-${hash("sha512", tgz, "base64")}` !== s.integrity) {
      const packed = execFileSync("npm", ["pack", s.npm, "--silent", "--pack-destination", cache], { encoding: "utf8" })
        .trim().split("\n").pop()!;
      execFileSync("mv", [join(cache, packed), tgz]);
    }
    const got = `sha512-${hash("sha512", tgz, "base64")}`;
    if (got !== s.integrity) throw new Error(`${name}: integrity ${got} does not match the pin ${s.integrity}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir);
    execFileSync("tar", ["xzf", tgz, "-C", dir, "--no-same-owner", s.file]);
  }
  console.log(`ok  ${name}`);
}
