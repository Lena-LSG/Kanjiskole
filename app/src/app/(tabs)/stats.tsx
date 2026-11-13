import {
  inTrack, KANA, kanaItem, leeches, perDay, retention, stagesOf, streak, studyDay, vocabOrder, weakest, wordKey, wordOf, type Track,
} from "@kanjiskole/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_W } from "@/components/Screen";
import { TAB_BAR_SPACE } from "@/components/TabBar";
import { Segmented, StageBar } from "@/components/Track";
import { Card, J, T } from "@/components/ui";
import { t } from "@/i18n";
import { data, useApp, useNow } from "@/state/AppState";
import { C, GUTTER } from "@/theme";

/** Weakest cards / leeches as tappable chips: a kanji or kana in a square, a word in a pill. */
function Chips({ keys, track, empty }: { keys: string[]; track: Track; empty: string }) {
  if (!keys.length) return <T size={15} color={C.muted}>{empty}</T>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {keys.map((k) => {
        const word = track === "words" ? wordOf(k, data) : undefined;
        const label = word ? word.w : k;
        const sub = track === "kanji" ? data.get(k)?.m[0] : track === "kana" ? kanaItem(k)?.r : word?.r;
        const go = track === "kanji" ? () => router.push(`/kanji/${encodeURIComponent(k)}`) : word ? () => router.push(`/word/${encodeURIComponent(word.w)}`) : () => router.push("/kana");
        return (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${label}, ${sub ?? ""}`} onPress={go}
            style={({ pressed }) => ({ minWidth: 52, height: 52, paddingHorizontal: word ? 14 : 0, borderRadius: 12, backgroundColor: pressed ? C.line : C.bg, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" })}>
            <J size={word ? 20 : label.length > 1 ? 20 : 28} style={{ lineHeight: word ? 26 : 34 }}>{label}</J>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Stats() {
  const { cards, events, meta } = useApp();
  const now = useNow();
  const ins = useSafeAreaInsets();
  const roll = meta.settings.rolloverHour;
  const [track, setTrack] = useState<Track>("kanji");
  const include = useMemo(() => inTrack(track), [track]);

  const days = useMemo(() => {
    const byDay = new Map(perDay(events, roll, include).map((d) => [d.day, d]));
    // Days carried over from the prototype were all kanji.
    if (track === "kanji") for (const l of meta.legacyDays) if (!byDay.has(l.day)) byDay.set(l.day, { day: l.day, reviews: l.reviews, correct: l.reviews, newKanji: l.newKanji });
    return Array.from({ length: 14 }, (_, i) => {
      const day = studyDay(now - (13 - i) * 864e5, roll);
      return byDay.get(day) ?? { day, reviews: 0, correct: 0, newKanji: 0 };
    });
  }, [events, meta.legacyDays, now, roll, include, track]);
  const max = Math.max(1, ...days.map((d) => d.reviews));
  const total = days.reduce((n, d) => n + d.reviews, 0);
  const acc = useMemo(() => retention(events, now - 30 * 864e5, include), [events, now, include]);
  const counts = useMemo(() => {
    const keys = track === "kanji" ? data.kanji.map((k) => k.k) : track === "kana" ? KANA.map((x) => x.k) : vocabOrder(data).map(wordKey);
    return stagesOf(cards, keys);
  }, [cards, track]);
  const weak = useMemo(() => weakest(cards, now, 20, include).map((w) => w.k), [cards, now, include]);
  const lee = useMemo(() => leeches(cards, include), [cards, include]);
  const run = streak(events, now, roll);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + TAB_BAR_SPACE + 16 }}>
        <View style={{ width: "100%", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: GUTTER, paddingTop: ins.top + 16, gap: 16 }}>
          <T v="black" size={34} accessibilityRole="header">{t.stats.title}</T>
          <Segmented<Track> label={t.track.tracksLabel} value={track} onChange={setTrack}
            options={(["kanji", "kana", "words"] as const).map((v) => ({ value: v, label: t.track.tracks[v] }))} />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card style={{ flex: 1, gap: 6 }}><T size={14} color={C.muted}>{t.stats.retention}</T><T v="black" size={36}>{acc === null ? "–" : `${Math.round(acc * 100)} %`}</T></Card>
            <Card style={{ flex: 1, gap: 6 }}><T size={14} color={C.muted}>{t.stats.streak}</T><T v="black" size={36}>{run}</T></Card>
          </View>

          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <T v="bold" size={17}>{t.stats.perDay}</T>
              <T size={14} color={C.muted}>{t.num(total)}</T>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120, gap: 4 }}
              accessible accessibilityRole="image" accessibilityLabel={days.map((d) => `${d.day}: ${d.reviews}`).join(", ")}>
              {days.map((d) => (
                <View key={d.day} style={{ flex: 1, height: `${Math.max(2, (d.reviews / max) * 100)}%`, borderRadius: 3, backgroundColor: d.reviews ? C.electric : C.track }}>
                  {d.reviews ? <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${(1 - d.correct / d.reviews) * 100}%`, backgroundColor: C.wrong, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} /> : null}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <T size={12} color={C.faint}>{days[0]!.day.slice(5)}</T>
              <T size={12} color={C.faint}>{days[13]!.day.slice(5)}</T>
            </View>
          </Card>

          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <T v="bold" size={17}>{t.stats.stages}</T>
              <T size={14} color={C.muted}>{t.num(counts.total - counts.unseen)} / {t.num(counts.total)}</T>
            </View>
            <StageBar counts={counts} />
          </Card>

          <Card style={{ gap: 12 }}><T v="bold" size={17}>{t.stats.weakest}</T><Chips keys={weak} track={track} empty={t.stats.none} /></Card>
          <Card style={{ gap: 12 }}><T v="bold" size={17}>{t.stats.leeches}</T><Chips keys={lee} track={track} empty={t.stats.leechesNone} /></Card>
        </View>
      </ScrollView>
    </View>
  );
}
