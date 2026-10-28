import { readFileSync } from "node:fs";
import { KanjiData } from "../src/data.ts";
import type { Dataset } from "../src/types.ts";

let cached: KanjiData | undefined;
export function data(): KanjiData {
  cached ??= new KanjiData(JSON.parse(readFileSync(new URL("../../../assets/data/kanji.v1.json", import.meta.url), "utf8")) as Dataset);
  return cached;
}

let n = 0;
export const id = () => `t-${++n}`;

/** Local time in the test zone (Europe/Copenhagen, set in package.json). */
export const local = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
