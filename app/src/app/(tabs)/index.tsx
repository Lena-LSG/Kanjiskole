import { retention, streak } from "@kanjiskole/core";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_W } from "@/components/Screen";
import { ProgressMap } from "@/components/ProgressMap";
import { Ring } from "@/components/Ring";
import { TAB_BAR_SPACE } from "@/components/TabBar";
import { Circle, Group, J, Row, T, WhitePill } from "@/components/ui";
import { t } from "@/i18n";
import { todayCounts } from "@/lib/today";
import { data, useApp, useNow } from "@/state/AppState";
import { C, GUTTER, R } from "@/theme";

function Tile({ label, onPress, children }: { label: string; onPress?: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: 150, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.tile, padding: 16, justifyContent: "space-between", opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T size={15}>{label}</T>
        {onPress ? <T size={18} color={C.muted} accessibilityElementsHidden importantForAccessibility="no">›</T> : null}
      </View>
      {children}
    </Pressable>
  );
}

const Big = ({ n, sub }: { n: string; sub: string }) => (
  <View>
    <T v="black" size={44} style={{ lineHeight: 48 }}>{n}</T>
    <T size={14} color={C.muted}>{sub}</T>
  </View>
);

export default function Home() {
  const { cards, events, meta } = useApp();
  const now = useNow();
  const ins = useSafeAreaInsets();
  const c = useMemo(() => todayCounts(cards, events, meta.settings, now), [cards, events, meta.settings, now]);
  const acc = useMemo(() => retention(events, now - 30 * 864e5), [events, now]);
  const days = useMemo(() => streak(events, now, meta.settings.rolloverHour), [events, now, meta.settings.rolloverHour]);
  const waiting = c.due + c.newLeft;
  const hour = new Date(now).getHours();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + TAB_BAR_SPACE + 16 }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 470 + ins.top, backgroundColor: C.navy, overflow: "hidden" }}>
          <View style={{ position: "absolute", left: "30%", top: 150 + ins.top, width: 620, height: 620, borderRadius: 120, backgroundColor: C.swoosh, transform: [{ rotate: "28deg" }] }} />
          <J size={300} color={C.swooshKanji} style={{ position: "absolute", right: -10, top: 30 + ins.top, lineHeight: 320 }} accessibilityElementsHidden importantForAccessibility="no">読</J>
        </View>

        <View style={{ width: "100%", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: GUTTER, paddingTop: ins.top + 16, gap: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Circle label={t.home.profile} onPress={() => router.push("/settings")}><T v="bold" size={18}>L</T></Circle>
            <Circle label={t.home.search} onPress={() => router.navigate("/kanji")}><J size={20}>検</J></Circle>
          </View>

          <View style={{ marginTop: 92, gap: 6 }}>
            <T size={17} color={C.onNavy}>{t.greeting(hour)}, Lena</T>
            <T v="black" size={46} style={{ lineHeight: 48, letterSpacing: -0.5 }} accessibilityRole="header">
              {waiting ? t.home.waiting(waiting) : t.home.doneTitle}
            </T>
            <T size={15} color={C.onNavy} style={{ marginTop: 4 }}>
              {waiting ? t.home.summary(c.due, c.newLeft, c.minutes) : t.home.doneSub}
            </T>
          </View>
          {waiting
            ? <WhitePill label={t.home.start} onPress={() => router.push("/session")} />
            : <WhitePill label={t.home.extra} onPress={() => router.push({ pathname: "/session", params: { extra: "5" } })} />}

          <View style={{ marginTop: 22, flexDirection: "row", borderRadius: 6, overflow: "hidden" }}>
            <View style={{ flex: 1, backgroundColor: C.surface, padding: 16, gap: 4 }}>
              <T size={14} color={C.muted}>{t.home.reviews}</T>
              <T v="black" size={44} style={{ lineHeight: 50 }}>{c.due}</T>
              <T size={15} color={C.muted}>{t.home.dueToday}</T>
            </View>
            <View style={{ flex: 1, backgroundColor: C.navy, padding: 16, gap: 4 }}>
              <T size={14} color={C.onNavyMuted}>{t.home.fresh}</T>
              <T v="black" size={44} color={C.highlight} style={{ lineHeight: 50 }}>{c.newLeft}</T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <T size={15} color={C.onNavyMuted}>{t.home.ofToday(meta.settings.newPerDay)} ·</T>
                <Pressable accessibilityRole="button" accessibilityLabel={t.home.extra} onPress={() => router.push({ pathname: "/session", params: { extra: "5" } })} hitSlop={12}>
                  <T v="bold" size={15} color={C.highlight}>+5</T>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Tile label={t.home.accuracy} onPress={() => router.navigate("/stats")}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ring value={acc ?? 0} />
                <T v="black" size={28}>{acc === null ? "–" : `${Math.round(acc * 100)} %`}</T>
              </View>
            </Tile>
            <Tile label={t.home.streak}><Big n={String(days)} sub={t.home.streakSub(days)} /></Tile>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Tile label={t.home.known} onPress={() => router.navigate("/kanji")}><Big n={t.num(c.started)} sub={t.home.knownSub(data.kanji.length)} /></Tile>
            <Tile label={t.home.blitzBest} onPress={() => router.push("/blitz")}><Big n={String(meta.blitzBest)} sub={t.home.blitzSub} /></Tile>
          </View>

          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.card, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <T v="bold" size={18}>{t.home.map}</T>
              <T size={13} color={C.muted}>{t.home.mapSub}</T>
            </View>
            <ProgressMap cards={cards} />
          </View>

          <Group>
            <Row icon="語" label={t.home.vocab} onPress={() => router.push("/words")} />
            <Row icon="か" label={t.home.kana} onPress={() => router.push("/kana")} />
            <Row icon="測" label={t.home.calibrate} onPress={() => router.push("/calibrate")} />
            <Row icon="弱" label={t.home.weakest} onPress={() => router.navigate("/stats")} />
            <Row icon="設" label={t.home.settings} onPress={() => router.push("/settings")} last />
          </Group>
        </View>
      </ScrollView>
    </View>
  );
}
