// IndexedDB in the browser. (expo-sqlite's web build needs COOP/COEP headers, which GitHub Pages can't send.)
import type { KanjiEvent } from "@kanjiskole/core";
import type { Store } from "./types";

let db: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open("kanjiskole", 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      const ev = d.createObjectStore("events", { keyPath: "id" });
      ev.createIndex("at", "at");
      ev.createIndex("synced", "synced");
      d.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  return db;
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("IndexedDB request failed"));
  });

type Row = { id: string; at: number; event: KanjiEvent; synced: 0 | 1 };

export const store: Store = {
  async loadEvents() {
    const tx = (await open()).transaction("events");
    const rows = await request(tx.objectStore("events").index("at").getAll() as IDBRequest<Row[]>);
    return rows.map((r) => r.event);
  },
  async append(events) {
    const tx = (await open()).transaction("events", "readwrite");
    const os = tx.objectStore("events");
    for (const e of events) {
      // add() fails on an existing id: that's the idempotence we want, so swallow just that error.
      const r = os.add({ id: e.id, at: e.at, event: e, synced: 0 } satisfies Row);
      r.onerror = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    }
    await done(tx);
  },
  async getMeta<T>(key: string) {
    const tx = (await open()).transaction("meta");
    return (await request(tx.objectStore("meta").get(key))) as T | undefined;
  },
  async setMeta(key, value) {
    const tx = (await open()).transaction("meta", "readwrite");
    tx.objectStore("meta").put(value, key);
    await done(tx);
  },
  async allMeta() {
    const tx = (await open()).transaction("meta");
    const os = tx.objectStore("meta");
    const [keys, values] = await Promise.all([request(os.getAllKeys()), request(os.getAll())]);
    // Meta keys are always strings (setMeta's key).
    return Object.fromEntries(keys.map((k, i) => [k as string, values[i]]));
  },
};
