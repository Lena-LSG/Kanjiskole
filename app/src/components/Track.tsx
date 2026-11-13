// Building blocks shared by the track hubs (kana, vocabulary) and the home screen, so every track looks and
// behaves like the kanji one: a navy hero, today's numbers with "+5", a stage bar, filters, a detail sheet.
import type { StageCounts } from "@kanjiskole/core";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { t } from "@/i18n";
import { C, GUTTER, R } from "@/theme";
import { MAX_W } from "./Screen";
import { Circle, J, T, WhitePill } from "./ui";

export const STAGE_COLOR = [C.map.unseen, C.map.learning, C.map.young, C.map.mature] as const;

/** The navy band with the swoosh and one big glyph, as on the home screen. Full width, behind the content. */
export function HeroBand({ glyph, height = 400 }: { glyph: string; height?: number }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: height + ins.top, backgroundColor: C.navy, overflow: "hidden" }}>
      <View style={{ position: "absolute", left: "35%", top: 120 + ins.top, width: 620, height: 620, borderRadius: 120, backgroundColor: C.swoosh, transform: [{ rotate: "28deg" }] }} />
      <J size={250} color={C.swooshKanji} style={{ position: "absolute", right: -6, top: 30 + ins.top, lineHeight: 270 }} accessibilityElementsHidden importantForAccessibility="no">{glyph}</J>
    </View>
  );
}

/** The phone-width column the hubs put their content in. */
export function Column({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: "100%", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: GUTTER }, style]}>{children}</View>;
}

/** Title, summary and the main action, on the band. */
export function Hero({ title, sub, onBack, action }: { title: string; sub: string; onBack?: () => void; action?: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: ins.top + 16 }}>
      {onBack ? <Circle label={t.session.back} onPress={onBack}><T size={22}>‹</T></Circle> : null}
      <View style={{ marginTop: 96, gap: 6 }}>
        <T v="black" size={44} style={{ lineHeight: 48, letterSpacing: -0.5 }} accessibilityRole="header">{title}</T>
        <T size={15} color={C.onNavy} style={{ lineHeight: 22 }}>{sub}</T>
      </View>
      {action ? <View style={{ marginTop: 18 }}>{action}</View> : null}
    </View>
  );
}

/** A scrolling hub page: band, then a column of content. */
export function Hub({ glyph, children }: { glyph: string; children: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: ins.bottom + 32 }}>
        <HeroBand glyph={glyph} />
        <Column style={{ gap: 16 }}>{children}</Column>
      </ScrollView>
    </View>
  );
}

/** Start the session, or, when nothing is left today, take extra new cards beyond the allowance. */
export function StartOrExtra({ waiting, onStart, onExtra, canExtra = true }: { waiting: number; onStart: () => void; onExtra: () => void; canExtra?: boolean }) {
  if (waiting) return <WhitePill label={t.track.start} onPress={onStart} />;
  if (!canExtra) return null;
  return <WhitePill label={t.track.extra} accessibilityHint={t.track.extraSub} onPress={onExtra} />;
}

/** Today's reviews and new cards side by side, with "+5" for more than the daily allowance. */
export function TodaySplit({ due, fresh, perDay, onExtra }: { due: number; fresh: number; perDay: number; onExtra?: () => void }) {
  return (
    <View style={{ flexDirection: "row", borderRadius: 6, overflow: "hidden" }}>
      <View style={{ flex: 1, backgroundColor: C.surface, padding: 16, gap: 4 }}>
        <T size={14} color={C.muted}>{t.track.reviews}</T>
        <T v="black" size={44} style={{ lineHeight: 50 }}>{t.num(due)}</T>
        <T size={15} color={C.muted}>{t.track.dueToday}</T>
      </View>
      <View style={{ flex: 1, backgroundColor: C.navy, padding: 16, gap: 4 }}>
        <T size={14} color={C.onNavyMuted}>{t.track.fresh}</T>
        <T v="black" size={44} color={C.highlight} style={{ lineHeight: 50 }}>{t.num(fresh)}</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <T size={15} color={C.onNavyMuted}>{t.track.ofToday(perDay)}{onExtra ? " ·" : ""}</T>
          {onExtra ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t.track.extra} accessibilityHint={t.track.extraSub} onPress={onExtra} hitSlop={12}>
              <T v="bold" size={15} color={C.highlight}>+5</T>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const ORDER = ["mature", "young", "learning", "unseen"] as const;
const COLOR = { mature: C.map.mature, young: C.map.young, learning: C.map.learning, unseen: C.map.unseen };

/** One stacked bar for the stages, with the counts underneath. */
export function StageBar({ counts, height = 12, unseenLabel }: { counts: StageCounts; height?: number; unseenLabel?: string }) {
  const label = (k: (typeof ORDER)[number]) => (k === "unseen" && unseenLabel ? unseenLabel : t.home.legend[k]);
  const total = Math.max(1, counts.total);
  return (
    <View style={{ gap: 12 }}>
      <View
        accessible accessibilityRole="image"
        accessibilityLabel={ORDER.map((k) => `${label(k)} ${counts[k]}`).join(", ")}
        style={{ flexDirection: "row", height, borderRadius: height / 2, overflow: "hidden", backgroundColor: C.map.unseen }}
      >
        {ORDER.slice(0, 3).map((k) => (counts[k] ? <View key={k} style={{ flex: counts[k] / total, backgroundColor: COLOR[k] }} /> : null))}
        <View style={{ flex: counts.unseen / total }} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 6 }}>
        {ORDER.map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COLOR[k], borderWidth: k === "unseen" ? 1 : 0, borderColor: C.outline }} />
            <T size={13} color={C.muted}>{label(k)}</T>
            <T v="bold" size={13}>{t.num(counts[k])}</T>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A thin progress line (started of total). */
export function Meter({ value, color = C.electric }: { value: number; color?: string }) {
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: C.track, overflow: "hidden" }} accessibilityElementsHidden importantForAccessibility="no">
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height: 4, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

/** Two or three equal options in a pill, like SAS's trip switcher. */
export function Segmented<V extends string>({ options, value, onChange, label }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label?: string }) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: "row", backgroundColor: C.surface, borderRadius: R.pill, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flex: 1, minHeight: 44, borderRadius: R.pill, backgroundColor: on ? C.tabActive : "transparent", alignItems: "center", justifyContent: "center" }}>
            <T v={on ? "bold" : "body"} size={15} color={on ? C.ink : C.muted}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A horizontally scrolling row of filter chips. */
export function Chips<V extends string>({ options, value, onChange }: { options: { value: V; label: string; count?: number }[]; value: V; onChange: (v: V) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0, flexShrink: 0, marginHorizontal: -GUTTER }}>
      <View style={{ width: GUTTER - 8 }} />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 14, borderRadius: R.pill, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? C.ink : C.surface, borderWidth: 1, borderColor: on ? C.ink : C.line, opacity: pressed ? 0.8 : 1 })}>
            <T v="bold" size={14} color={on ? C.bg : C.ink}>{o.label}</T>
            {o.count !== undefined ? <T size={13} color={on ? "#45474F" : C.faint}>{t.num(o.count)}</T> : null}
          </Pressable>
        );
      })}
      <View style={{ width: GUTTER - 8 }} />
    </ScrollView>
  );
}

/** A section title with an optional quiet figure on the right. */
export function SectionTitle({ title, right }: { title: string; right?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
      <T v="bold" size={20} accessibilityRole="header">{title}</T>
      {right ? <T size={14} color={C.muted}>{right}</T> : null}
    </View>
  );
}

/** A small stage dot: hollow when unseen. */
export const StageDot = ({ st, size = 10 }: { st: 0 | 1 | 2 | 3; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: STAGE_COLOR[st], borderWidth: st === 0 ? 1 : 0, borderColor: C.outline }} />
);

/** A bottom sheet for details (a kana from the chart). Tapping outside closes it. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t.kana.close} onPress={onClose} style={{ flex: 1, backgroundColor: "#000000AA" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: MAX_W, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: C.line, padding: 20, paddingBottom: ins.bottom + 20, gap: 16 }}>
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.outline }} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** A label/value pair for detail views. */
export const Fact = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flex: 1, gap: 2 }}>
    <T size={13} color={C.muted}>{label}</T>
    <T v="bold" size={17}>{value}</T>
  </View>
);

/** A small padlock for locked words. */
export const Lock = ({ size = 14, color = C.faint }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Rect x={5} y={11} width={14} height={10} rx={2} />
    <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);
