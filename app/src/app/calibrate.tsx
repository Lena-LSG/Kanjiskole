// Calibration: 25 kanji at a time in frequency order; the ones she taps are scheduled as known,
// with a typed-reading check 3–4 weeks out.
import { calibrationDue, isStarted } from "@kanjiskole/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Ghost, J, Primary, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKeys } from "@/lib/useKeys";
import { data, useApp } from "@/state/AppState";
import { C, R } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

export default function Calibrate() {
  const { cards, events, meta, setMeta, record } = useApp();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const batch = useMemo(() => {
    const out: typeof data.kanji[number][] = [];
    for (let i = meta.calPos; i < data.kanji.length && out.length < 25; i++) {
      const k = data.kanji[i]!;
      if (!isStarted(cards.get(k.k))) out.push(k);
    }
    return out;
  }, [meta.calPos]); // eslint-disable-line react-hooks/exhaustive-deps -- a batch stays put while she taps
  const calibrated = useMemo(() => new Set(events.filter((e) => e.t === "calibrate").map((e) => e.k)).size, [events]);

  const commit = () => {
    const now = Date.now();
    record([...picked].map((k) => ({ t: "calibrate" as const, k, due: calibrationDue(now, Math.random, meta.settings.rolloverHour) })));
    const lastK = batch[batch.length - 1];
    if (lastK) setMeta("calPos", data.pos(lastK) + 1);
    setPicked(new Set());
  };

  useKeys((k) => { if (k === "Escape") leave(); });

  if (!batch.length) {
    return (
      <Screen style={{ flex: 1, justifyContent: "center" }}>
        <J size={100} style={{ textAlign: "center", lineHeight: 120 }}>完</J>
        <T size={17} color={C.muted} style={{ textAlign: "center" }}>{t.calibrate.done}</T>
        <Primary label={t.session.back} onPress={leave} />
      </Screen>
    );
  }

  const first = data.pos(batch[0]!) + 1, last = data.pos(batch[batch.length - 1]!) + 1;
  return (
    <Screen>
      <TopBar onBack={leave} backLabel={t.session.back} progress={meta.calPos / data.kanji.length} label={`#${first}–${last}`} />
      <View style={{ gap: 6 }}>
        <T v="black" size={34} style={{ lineHeight: 38 }} accessibilityRole="header">{t.calibrate.title}</T>
        <T size={16} color={C.muted} style={{ lineHeight: 23 }}>{t.calibrate.body}</T>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {batch.map((k) => {
          const on = picked.has(k.k);
          return (
            <Pressable
              key={k.k}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${k.k}, ${k.m[0] ?? ""}`}
              onPress={() => setPicked((p) => { const n = new Set(p); if (n.has(k.k)) n.delete(k.k); else n.add(k.k); return n; })}
              style={{ width: "18.4%", aspectRatio: 1, borderRadius: R.small, borderWidth: 1, borderColor: on ? C.ink : C.line, backgroundColor: on ? C.ink : C.surface, alignItems: "center", justifyContent: "center" }}
            >
              <J size={32} color={on ? C.bg : C.ink} style={{ lineHeight: 40 }}>{k.k}</J>
            </Pressable>
          );
        })}
      </View>
      <T size={15} color={C.muted}>{t.calibrate.picked(picked.size, calibrated)}</T>
      <View style={{ gap: 10, marginTop: "auto" }}>
        <Primary label={t.calibrate.next} onPress={commit} />
        <Ghost label={t.calibrate.stop} onPress={() => { commit(); leave(); }} />
      </View>
    </Screen>
  );
}
