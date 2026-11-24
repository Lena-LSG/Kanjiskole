// `npm audit`, failing on high/critical unless the advisory is accepted (with a reason and an unexpired date)
// in scripts/audit-accepted.json.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Via = string | { url?: string; title?: string; severity?: string };
type Vuln = { severity: string; via: Via[] };

const root = new URL("..", import.meta.url).pathname;
const accepted: { id: string; expires: string; reason: string }[] =
  (JSON.parse(readFileSync(new URL("audit-accepted.json", import.meta.url), "utf8")) as { accepted: { id: string; expires: string; reason: string }[] }).accepted;
const today = new Date().toISOString().slice(0, 10);

let raw: string;
try {
  raw = execFileSync("npm", ["audit", "--json"], { cwd: root, encoding: "utf8", maxBuffer: 64 << 20 });
} catch (e) {
  raw = (e as { stdout?: string }).stdout ?? "";
}
const vulns: Record<string, Vuln> = (JSON.parse(raw) as { vulnerabilities?: Record<string, Vuln> }).vulnerabilities ?? {};

const failures: string[] = [];
for (const [name, v] of Object.entries(vulns)) {
  for (const via of v.via) {
    if (typeof via === "string" || !via.url) continue; // inherited: reported on the package that has it
    if (via.severity !== "high" && via.severity !== "critical") continue;
    const id = via.url.split("/").pop()!;
    const ok = accepted.find((a) => a.id === id);
    if (!ok) failures.push(`${name}: ${id} ${via.title} (${via.severity})`);
    else if (ok.expires < today) failures.push(`${name}: ${id} was accepted until ${ok.expires}; re-assess it`);
    else console.log(`accepted  ${name}: ${id} until ${ok.expires}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("audit ok");
