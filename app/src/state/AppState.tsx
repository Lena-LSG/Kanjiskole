// The app's single source of truth: the event log (persisted), the cards derived from it, settings and meta.
import {
  applyEvent, byTime, DEFAULT_ROLLOVER, KanjiData, replay, scheduler,
  type CardState, type KanjiEvent, type ReviewStyle,
} from "@kanjiskole/core";
import { newId } from "../lib/id";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Lang } from "@/i18n";
import { store } from "@/storage/store";
import raw from "../../../assets/data/kanji.v1.json";

export const data = new KanjiData(raw);

export interface Settings {
  newPerDay: number;
  reviewStyle: ReviewStyle;
  rolloverHour: number;
  uiLang: Lang;
  /** Read the answer aloud when it is revealed (when a Japanese voice exists). */
  autoSpeak: boolean;
}
export const DEFAULT_SETTINGS: Settings = { newPerDay: 10, reviewStyle: "quiz", rolloverHour: DEFAULT_ROLLOVER, uiLang: "da", autoSpeak: true };

export interface BlitzRun { at: number; score: number; misses: string[] }

interface Meta {
  settings: Settings;
  blitzBest: number;
  blitzRuns: BlitzRun[];
  calPos: number;
  mnemonics: Record<string, string>;
  legacyDays: { day: string; newKanji: number; reviews: number }[];
}
const DEFAULT_META: Meta = { settings: DEFAULT_SETTINGS, blitzBest: 0, blitzRuns: [], calPos: 0, mnemonics: {}, legacyDays: [] };

/** An event before it has an id and a time. */
export type Draft = KanjiEvent extends infer E ? (E extends KanjiEvent ? Omit<E, "id" | "at"> & { at?: number } : never) : never;

interface AppState {
  ready: boolean;
  events: readonly KanjiEvent[];
  cards: ReadonlyMap<string, CardState>;
  meta: Meta;
  /** Persists events and updates the cards. Returns the stored events. */
  // Function properties, not methods: they are plain closures and safe to destructure from the context.
  record: (drafts: Draft[]) => KanjiEvent[];
  /** Merges events that already have ids (import). */
  ingest: (events: KanjiEvent[]) => void;
  setMeta: <K extends keyof Meta>(key: K, value: Meta[K]) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<KanjiEvent[]>([]);
  const [cards, setCards] = useState<Map<string, CardState>>(new Map());
  const [meta, setMetaState] = useState<Meta>(DEFAULT_META);
  const f = useMemo(() => scheduler(), []);
  const eventsRef = useRef<KanjiEvent[]>([]);
  const cardsRef = useRef(cards);

  useEffect(() => {
    (async () => {
      const [evs, stored] = await Promise.all([store.loadEvents(), store.allMeta()]);
      const m = { ...DEFAULT_META, ...(stored as Partial<Meta>) };
      m.settings = { ...DEFAULT_SETTINGS, ...m.settings };
      eventsRef.current = evs.sort(byTime);
      cardsRef.current = replay(eventsRef.current, { rolloverHour: m.settings.rolloverHour });
      setEvents(eventsRef.current);
      setCards(cardsRef.current);
      setMetaState(m);
      setReady(true);
    })().catch((e) => {
      console.error("Kanjiskole: could not open local storage", e);
      setReady(true);
    });
  }, []);

  const commit = useCallback((evs: KanjiEvent[], rolloverHour: number) => {
    const last = eventsRef.current[eventsRef.current.length - 1];
    const inOrder = evs.every((e) => !last || byTime(last, e) < 0);
    eventsRef.current = [...eventsRef.current, ...evs].sort(byTime);
    if (inOrder) {
      const next = new Map(cardsRef.current);
      for (const e of [...evs].sort(byTime)) applyEvent(next, e, f, rolloverHour);
      cardsRef.current = next;
    } else {
      cardsRef.current = replay(eventsRef.current, { rolloverHour });
    }
    setEvents(eventsRef.current);
    setCards(cardsRef.current);
    store.append(evs).catch((e) => console.error("Kanjiskole: could not save events", e));
  }, [f]);

  const record = useCallback((drafts: Draft[]) => {
    const now = Date.now();
    const evs = drafts.map((d, i) => ({ ...d, id: newId(), at: d.at ?? now + i }));
    commit(evs, meta.settings.rolloverHour);
    return evs;
  }, [commit, meta.settings.rolloverHour]);

  const ingest = useCallback((incoming: KanjiEvent[]) => {
    const have = new Set(eventsRef.current.map((e) => e.id));
    const fresh = incoming.filter((e) => !have.has(e.id));
    if (fresh.length) commit(fresh, meta.settings.rolloverHour);
  }, [commit, meta.settings.rolloverHour]);

  const setMeta = useCallback(<K extends keyof Meta>(key: K, value: Meta[K]) => {
    setMetaState((m) => ({ ...m, [key]: value }));
    store.setMeta(key, value).catch((e) => console.error("Kanjiskole: could not save", key, e));
  }, []);

  const value = useMemo(() => ({ ready, events, cards, meta, record, ingest, setMeta }), [ready, events, cards, meta, record, ingest, setMeta]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppStateProvider");
  return v;
}

/** Re-render once a minute, so "due today" and greetings move with the clock (and the 04:00 rollover). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
