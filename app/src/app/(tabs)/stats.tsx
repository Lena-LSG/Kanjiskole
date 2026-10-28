import { leeches, perDay, retention, stageCounts, streak, studyDay, weakest, type CardState } from "@kanjiskole/core";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_W } from "@/components/Screen";
import { TAB_BAR_SPACE } from "@/components/TabBar";
import { Card, J, T } from "@/components/ui";
import { t } from "@/i18n";
import { data, useApp, useNow } from "@/state/AppState";
import { C, GUTTER } from "@/theme";

function KanjiChips({ ks, empty }: { ks: string[]; empty: string }) {
  if (!ks.length) return <T size={15} color={C.muted}>{empty}</T>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {ks.map((k) => (
        <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${k}, ${data.get(k)?.m[0] ?? ""}`} onPress={() => router.push(`/kanji/${encodeURIComponent(k)}`)}
          style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 12, backgroundColor: pressed ? C.line : C.bg, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" })}>
          <J size={28} style={{ lineHeight: 34 }}>{k}</J>
        </Pressable>
      ))}
    </View>
  );
}

export default function Stats() {
  const { cards, events, meta } = useApp();
  const now = useNow();
  const ins = useSafeAreaInsets();
  const roll = meta.settings.rolloverHour;
  const days = useMemo(() => {
    const byDay = new Map(perDay(events, roll).map((d) => [d.day, d]));
    for (const l of meta.legacyDays) if (!byDay.has(l.day)) byDay.set(l.day, { day: l.day, reviews: l.reviews, correct: l.reviews, newKanji: l.newKanji });
    return Array.from({ length: 14 }, (_, i) => {
      const day = studyDay(now - (13 - i) * 864e5, roll);
      return byDay.get(day) ?? { day, reviews: 0, correct: 0, newKanji: 0 };
    });
  }, [events, meta.legacyDays, now, roll]);
  const max = Math.max(1, ...days.map((d) => d.reviews));
  const acc = useMemo(() => retention(events, now - 30 * 864e5), [events, now]);
  const st = useMemo(() => stageCounts(cards as Map<string, CardState>, data.kanji.length), [cards]);
  const weak = useMemo(() => weakest(cards as Map<string, CardState>, now, 20).map((w) => w.k), [cards, now]);
  const lee = useMemo(() => leeches(cards as Map<string, CardState>), [cards]);
  const run = streak(events, now, roll);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + TAB_BAR_SPACE + 16 }}>
        <View style={{ width: "100%", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: GUTTER, paddingTop: ins.top + 16, gap: 16 }}>
          <T v="black" size={34} accessibilityRole="header">{t.stats.title}</T>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card style={{ flex: 1, gap: 6 }}><T size={14} color={C.muted}>{t.stats.retention}</T><T v="black" size={36}>{acc === null ? "–" : `${Math.round(acc * 100)} %`}</T></Card>
            <Card style={{ flex: 1, gap: 6 }}><T size={14} color={C.muted}>{t.stats.streak}</T><T v="black" size={36}>{run}</T></Card>
          </View>

          <Card style={{ gap: 14 }}>
            <T v="bold" size={17}>{t.stats.perDay}</T>
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

          <Card style={{ gap: 10 }}>
            <T v="bold" size={17}>{t.stats.stages}</T>
            {([["mature", st.mature, C.map.mature], ["young", st.young, C.map.young], ["learning", st.learning, C.map.learning], ["unseen", st.unseen, C.map.unseen]] as const).map(([key, n, color]) => (
              <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color, borderWidth: key === "unseen" ? 1 : 0, borderColor: C.outline }} />
                <T size={16} style={{ flex: 1 }}>{t.home.legend[key]}</T>
                <T v="bold" size={16}>{n.toLocaleString("da-DK")}</T>
              </View>
            ))}
          </Card>

          <Card style={{ gap: 12 }}><T v="bold" size={17}>{t.stats.weakest}</T><KanjiChips ks={weak} empty={t.stats.weakestNone} /></Card>
          <Card style={{ gap: 12 }}><T v="bold" size={17}>{t.stats.leeches}</T><KanjiChips ks={lee} empty={t.stats.leechesNone} /></Card>
        </View>
      </ScrollView>
    </View>
  );
}
