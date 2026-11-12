// The kana track: progress per script, practice, "I already know these", and a chart coloured by stage.
import { calibrationDue, dueKana, isStarted, KANA, kanaProgress, stage, type Script } from "@kanjiskole/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Card, Ghost, J, Primary, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKeys } from "@/lib/useKeys";
import { useApp, useNow } from "@/state/AppState";
import { C } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));
const DOT = [C.map.unseen, C.map.learning, C.map.young, C.map.mature] as const;

function ScriptCard({ script }: { script: Script }) {
  const { cards, meta, record } = useApp();
  const now = useNow();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const p = useMemo(() => kanaProgress(cards, script), [cards, script]);
  const due = useMemo(() => dueKana(cards, now, meta.settings.rolloverHour).filter((k) => KANA.find((x) => x.k === k)?.script === script).length, [cards, now, meta.settings.rolloverHour, script]);
  const name = script === "hira" ? t.kana.hira : t.kana.kata;
  const items = KANA.filter((x) => x.script === script);

  const markKnown = () => {
    const at = Date.now();
    const todo = items.filter((x) => !isStarted(cards.get(x.k)));
    record(todo.map((x) => ({ t: "calibrate" as const, k: x.k, due: calibrationDue(at, Math.random, meta.settings.rolloverHour) })));
    setConfirm(false);
    setMsg(t.kana.marked(todo.length));
  };

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <J size={56} style={{ lineHeight: 64 }} accessibilityElementsHidden importantForAccessibility="no">{script === "hira" ? "あ" : "ア"}</J>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="black" size={24} accessibilityRole="header">{name}</T>
          <T size={14} color={C.muted}>{t.kana.progress(p.started, p.total, p.solid)}</T>
          <T size={14} color={due ? C.highlight : C.muted}>{t.kana.due(due)}</T>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }} accessible accessibilityLabel={`${t.kana.chart}: ${t.kana.progress(p.started, p.total, p.solid)}`}>
        {items.map((x) => {
          const st = stage(cards.get(x.k));
          return (
            <View key={x.k} style={{ minWidth: 40, height: 40, paddingHorizontal: 4, borderRadius: 8, backgroundColor: st >= 2 ? DOT[st] : C.bg, borderWidth: 1, borderColor: st ? DOT[st] : C.line, alignItems: "center", justifyContent: "center" }}>
              <J size={x.k.length > 1 ? 15 : 20} color={st === 3 ? C.bg : C.ink} style={{ lineHeight: 24 }}>{x.k}</J>
            </View>
          );
        })}
      </View>

      <Primary label={t.kana.practise} onPress={() => router.push({ pathname: "/kana-session", params: { script } })} />
      {p.started < p.total ? (
        confirm ? (
          <View style={{ gap: 8 }}>
            <T size={15} color={C.muted} style={{ lineHeight: 22 }}>{t.kana.knowConfirm(name)}</T>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Ghost label={t.kana.knowNo} style={{ flex: 1 }} onPress={() => setConfirm(false)} />
              <Ghost label={t.kana.knowYes} color={C.highlight} style={{ flex: 1 }} onPress={markKnown} />
            </View>
          </View>
        ) : <Ghost label={t.kana.know} onPress={() => setConfirm(true)} />
      ) : null}
      {msg ? <T size={15} color={C.highlight} accessibilityLiveRegion="polite">{msg}</T> : null}
    </Card>
  );
}

export default function Kana() {
  useKeys((k) => { if (k === "Escape") leave(); });
  return (
    <Screen>
      <TopBar onBack={leave} backLabel={t.session.back} />
      <T v="black" size={34} accessibilityRole="header">{t.kana.title}</T>
      <T size={16} color={C.muted} style={{ lineHeight: 23 }}>{t.kana.intro}</T>
      <ScriptCard script="hira" />
      <ScriptCard script="kata" />
    </Screen>
  );
}
