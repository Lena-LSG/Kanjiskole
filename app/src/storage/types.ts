import type { KanjiEvent } from "@kanjiskole/core";

/**
 * Local, offline-first persistence. Events are append-only and keyed by id, so writing one twice is harmless.
 * `synced` marks what M3's sync has already pushed to Supabase.
 */
export interface Store {
  loadEvents(): Promise<KanjiEvent[]>;
  append(events: readonly KanjiEvent[]): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  /** Every meta value, for export. */
  allMeta(): Promise<Record<string, unknown>>;
}
