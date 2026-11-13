// The vocabulary track: today's numbers, progress by JLPT level, and the whole word list (search, status and
// level filters). A word unlocks once every kanji in it is known, so "locked" words show what they wait for.
import {
  dueWords, isStarted, NEW_PER_DAY, newToday, newWords, stagesOf, vocabLevels, vocabOrder, wordKey, wordStatus, isWordKey,
  type Word, type WordStatus,
} from "@kanjiskole/core";
import { router } from "expo-router";
import { memo, useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chips, Column, Lock, Hero, HeroBand, Meter, StageBar, StageDot, StartOrExtra, TodaySplit } from "@/components/Track";
import { Card, J, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKnown } from "@/lib/known";
import { searchWords } from "@/lib/search";
import { useKeys } from "@/lib/useKeys";
import { data, useApp, useNow } from "@/state/AppState";
import { C, R } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

type StatusFilter = "all" | "active" | "ready" | "locked";
type LevelFilter = "all" | "5" | "4" | "3" | "2" | "1" | "none";
const ST: Record<WordStatus, 0 | 1 | 2 | 3> = { locked: 0, ready: 0, learning: 1, young: 2, mature: 3 };
const matches = (s: WordStatus, f: StatusFilter) =>
  f === "all" || (f === "active" ? s === "learning" || s === "young" || s === "mature" : s === f);
const levelOf = (w: Word): LevelFilter => (w.j ? (String(w.j) as LevelFilter) : "none");

const WordRow = memo(function WordRow({ w, status }: { w: Word; status: WordStatus }) {
  const locked = status === "locked";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${w.w}, ${w.r}, ${w.g}, ${t.vocab.status[status]}`}
      onPress={() => router.push(`/word/${encodeURIComponent(w.w)}`)}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: pressed ? C.surface : "transparent", borderBottomWidth: 1, borderBottomColor: C.line })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <J size={22} color={locked ? C.faint : C.ink}>{w.w}</J>
          <J size={15} color={locked ? C.faint : C.highlight}>{w.r}</J>
        </View>
        <T size={14} color={C.muted} numberOfLines={1}>{w.g}</T>
      </View>
      {w.j ? <T size={12} color={C.faint}>N{w.j}</T> : null}
      {locked
        ? <Lock />
        : <StageDot st={ST[status]} />}
    </Pressable>
  );
});

export default function Words() {
  const { cards, events, meta } = useApp();
  const now = useNow();
  const ins = useSafeAreaInsets();
  const known = useKnown(cards);
  const roll = meta.settings.rolloverHour;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  useKeys((k) => { if (k === "Escape") leave(); });

  const order = vocabOrder(data);
  const levels = vocabLevels(data);
  const statusOf = useMemo(() => new Map(order.map((w) => [w, wordStatus(w, cards, known)])), [order, cards, known]);
  const unlocked = useMemo(() => order.filter((w) => statusOf.get(w) !== "locked"), [order, statusOf]);
  const counts = useMemo(() => stagesOf(cards, unlocked.map(wordKey)), [cards, unlocked]);
  const started = counts.total - counts.unseen;
  const due = useMemo(() => dueWords(cards, now, roll).length, [cards, now, roll]);
  const left = Math.max(0, NEW_PER_DAY.words - newToday(events, now, roll, isWordKey));
  const fresh = useMemo(() => newWords(cards, data, known, left).length, [cards, known, left]);
  const ready = unlocked.length - started;

  const shown = useMemo(() => {
    const pool = order.filter((w) => (level === "all" || levelOf(w) === level) && matches(statusOf.get(w)!, status));
    return searchWords(q, pool);
  }, [order, level, status, statusOf, q]);

  const start = () => router.push("/words-session");
  const extra = () => router.push({ pathname: "/words-session", params: { extra: "5" } });
  const statusCount = (f: StatusFilter) => order.reduce((n, w) => n + (matches(statusOf.get(w)!, f) ? 1 : 0), 0);

  const header = (
    <>
      <HeroBand glyph="語" />
      <Column style={{ gap: 16 }}>
        <Hero
          onBack={leave}
          title={t.vocab.title}
          sub={unlocked.length ? t.track.summary(due, fresh) : t.vocab.none}
          action={<StartOrExtra waiting={due + fresh} onStart={start} onExtra={extra} canExtra={ready > 0} />}
        />
        <View style={{ height: 22 }} />
        <TodaySplit due={due} fresh={fresh} perDay={NEW_PER_DAY.words} onExtra={ready ? extra : undefined} />

        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <T v="bold" size={18}>{t.track.progress}</T>
            <T size={14} color={C.muted}>{t.vocab.unlockedOf(unlocked.length, order.length)}</T>
          </View>
          <StageBar counts={counts} unseenLabel={t.vocab.status.ready} />
        </Card>

        <Card style={{ gap: 4 }}>
          <T v="bold" size={18} style={{ marginBottom: 8 }}>{t.vocab.levels}</T>
          {levels.map((l) => {
            const key: LevelFilter = l.level ? (String(l.level) as LevelFilter) : "none";
            const un = l.words.filter((w) => statusOf.get(w) !== "locked").length;
            const st = l.words.filter((w) => isStarted(cards.get(wordKey(w)))).length;
            const on = level === key;
            return (
              <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setLevel(on ? "all" : key)}
                accessibilityLabel={`${t.vocab.level(l.level)}: ${t.vocab.levelLine(st, un, l.words.length)}`}
                style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 10, marginHorizontal: -10, borderRadius: R.small, gap: 8, backgroundColor: on ? C.tabActive : pressed ? C.line : "transparent" })}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
                  <T v="black" size={17} style={{ width: 96 }}>{t.vocab.level(l.level)}</T>
                  <T size={13} color={C.muted} style={{ flex: 1, textAlign: "right" }}>{t.vocab.levelLine(st, un, l.words.length)}</T>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: C.track, overflow: "hidden", flexDirection: "row" }}>
                  <View style={{ flex: st, backgroundColor: C.electric }} />
                  <View style={{ flex: un - st, backgroundColor: C.map.learning }} />
                  <View style={{ flex: l.words.length - un }} />
                </View>
              </Pressable>
            );
          })}
        </Card>

        <TextInput
          value={q} onChangeText={setQ} placeholder={t.vocab.search} placeholderTextColor={C.faint}
          autoCapitalize="none" autoCorrect={false} accessibilityLabel={t.vocab.search} clearButtonMode="while-editing"
          style={{ height: 52, borderRadius: 26, backgroundColor: C.surface, color: C.ink, paddingHorizontal: 20, fontSize: 17, marginTop: 8 }}
        />
        <Chips<StatusFilter> value={status} onChange={setStatus} options={(["all", "active", "ready", "locked"] as const).map((f) => ({ value: f, label: t.vocab.status[f]!, count: statusCount(f) }))} />
        <Chips<LevelFilter> value={level} onChange={setLevel} options={[
          { value: "all", label: t.vocab.allLevels },
          ...levels.map((l) => ({ value: (l.level ? String(l.level) : "none") as LevelFilter, label: t.vocab.level(l.level) })),
        ]} />
        <T size={13} color={C.muted} accessibilityLiveRegion="polite">{shown.length ? t.vocab.results(shown.length) : t.vocab.noMatch}</T>
      </Column>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={shown}
        keyExtractor={(w) => w.w}
        ListHeaderComponent={header}
        initialNumToRender={20}
        windowSize={11}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: ins.bottom + 32 }}
        renderItem={({ item }) => <Column><WordRow w={item} status={statusOf.get(item)!} /></Column>}
      />
    </View>
  );
}
