// The vocabulary track: what's unlocked, what's due, and the next words in line.
import { dueWords, newWords, vocabProgress, wordOf } from "@kanjiskole/core";
import { router } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Card, J, Primary, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKnown } from "@/lib/known";
import { useKeys } from "@/lib/useKeys";
import { data, useApp, useNow } from "@/state/AppState";
import { C } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

export default function Words() {
  const { cards, meta } = useApp();
  const now = useNow();
  const known = useKnown(cards);
  const p = useMemo(() => vocabProgress(cards, data, known), [cards, known]);
  const due = useMemo(() => dueWords(cards, now, meta.settings.rolloverHour).length, [cards, now, meta.settings.rolloverHour]);
  const upcoming = useMemo(() => newWords(cards, data, known, 12).map((k) => wordOf(k, data)!), [cards, known]);
  useKeys((k) => { if (k === "Escape") leave(); });

  return (
    <Screen>
      <TopBar onBack={leave} backLabel={t.session.back} />
      <T v="black" size={34} accessibilityRole="header">{t.vocab.title}</T>
      <T size={16} color={C.muted} style={{ lineHeight: 23 }}>{t.vocab.intro}</T>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <J size={52} style={{ lineHeight: 60 }} accessibilityElementsHidden importantForAccessibility="no">語</J>
          <View style={{ flex: 1, gap: 4 }}>
            <T size={15} color={C.muted}>{t.vocab.progress(p.started, p.unlocked, p.total)}</T>
            <T size={15} color={due ? C.highlight : C.muted}>{t.vocab.due(due)}</T>
          </View>
        </View>
        {p.unlocked ? <Primary label={t.vocab.practise} onPress={() => router.push("/words-session")} /> : <T size={15} color={C.muted}>{t.vocab.none}</T>}
      </Card>

      {upcoming.length ? (
        <Card style={{ gap: 4 }}>
          <T v="bold" size={17} style={{ marginBottom: 6 }}>{t.vocab.next}</T>
          {upcoming.map((w, i) => (
            <View key={w.w} style={{ flexDirection: "row", alignItems: "baseline", gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <J size={22} style={{ minWidth: 72 }}>{w.w}</J>
              <J size={15} color={C.highlight}>{w.r}</J>
              <T size={14} color={C.muted} style={{ flex: 1 }} numberOfLines={1}>{w.g}</T>
              {w.j ? <T size={12} color={C.faint}>N{w.j}</T> : null}
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
