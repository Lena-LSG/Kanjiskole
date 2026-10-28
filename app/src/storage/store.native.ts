// SQLite on the device.
import type { KanjiEvent } from "@kanjiskole/core";
import * as SQLite from "expo-sqlite";
import type { Store } from "./types";

let db: Promise<SQLite.SQLiteDatabase> | undefined;

function open() {
  db ??= SQLite.openDatabaseAsync("kanjiskole.db").then(async (d) => {
    await d.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY NOT NULL, at INTEGER NOT NULL, k TEXT NOT NULL, json TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS events_at ON events (at);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL);
    `);
    return d;
  });
  return db;
}

export const store: Store = {
  async loadEvents() {
    const rows = await (await open()).getAllAsync<{ json: string }>("SELECT json FROM events ORDER BY at, id");
    return rows.map((r) => JSON.parse(r.json) as KanjiEvent);
  },
  async append(events) {
    const d = await open();
    await d.withTransactionAsync(async () => {
      for (const e of events) {
        await d.runAsync("INSERT OR IGNORE INTO events (id, at, k, json) VALUES (?, ?, ?, ?)", e.id, e.at, e.k, JSON.stringify(e));
      }
    });
  },
  async getMeta<T>(key: string) {
    const row = await (await open()).getFirstAsync<{ json: string }>("SELECT json FROM meta WHERE key = ?", key);
    return row ? (JSON.parse(row.json) as T) : undefined;
  },
  async setMeta(key, value) {
    await (await open()).runAsync("INSERT OR REPLACE INTO meta (key, json) VALUES (?, ?)", key, JSON.stringify(value));
  },
  async allMeta() {
    const rows = await (await open()).getAllAsync<{ key: string; json: string }>("SELECT key, json FROM meta");
    return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.json)]));
  },
};
