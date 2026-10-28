// Small building blocks, all on the design tokens.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { FAMILIES } from "@/fonts";
import { C, R } from "@/theme";

type Variant = "body" | "bold" | "black" | "k";
const FONT: Record<Variant, TextStyle> = { body: FAMILIES.ui, bold: FAMILIES.uiBold, black: FAMILIES.uiBlack, k: FAMILIES.k };

export function T({ v = "body", size = 16, color = C.ink, style, ...rest }: TextProps & { v?: Variant; size?: number; color?: string }) {
  const ja = v === "k" ? { lang: "ja" } : {};
  return <Text {...ja} {...rest} style={[FONT[v], { fontSize: size, color, lineHeight: Math.round(size * (v === "k" ? 1.25 : 1.35)) }, style]} />;
}

/** Japanese text in the print-style mincho. */
export const J = (p: TextProps & { size?: number; color?: string }) => <T v="k" {...p} />;

const JA_RUN = /([\u3040-\u30ff\u3400-\u9fff々□]+)/u;

/** Danish prose with any Japanese in it set in the mincho, so 囗 doesn't read as a missing glyph. */
export function Mixed({ text, size = 16, color = C.ink, style }: { text: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <T size={size} color={color} style={style}>
      {text.split(JA_RUN).map((part, i) => (i % 2 ? <J key={i} size={size + 2} color={color}>{part}</J> : part))}
    </T>
  );
}

type BtnProps = Omit<PressableProps, "children"> & { label: string; sub?: string; style?: StyleProp<ViewStyle> };

export function Primary({ label, sub, style, ...rest }: BtnProps) {
  return (
    <Pressable accessibilityRole="button" {...rest} style={({ pressed }) => [s.btn, { backgroundColor: C.accent, opacity: pressed ? 0.85 : 1 }, style]}>
      <T v="bold" size={18}>{label}</T>
      {sub ? <T size={13} color={C.onNavy}>{sub}</T> : null}
    </Pressable>
  );
}

export function WhitePill({ label, style, ...rest }: BtnProps) {
  return (
    <Pressable accessibilityRole="button" {...rest} style={({ pressed }) => [s.btn, { backgroundColor: C.ink, paddingHorizontal: 28, alignSelf: "flex-start", opacity: pressed ? 0.85 : 1 }, style]}>
      <T v="bold" size={18} color={C.accent}>{label}</T>
    </Pressable>
  );
}

export function Ghost({ label, sub, style, color = C.ink, ...rest }: BtnProps & { color?: string }) {
  return (
    <Pressable accessibilityRole="button" {...rest} style={({ pressed }) => [s.btn, { borderWidth: 1, borderColor: C.outline, opacity: pressed ? 0.7 : 1 }, style]}>
      <T v="bold" size={16} color={color}>{label}</T>
      {sub ? <T size={13} color={C.muted}>{sub}</T> : null}
    </Pressable>
  );
}

export function LinkButton({ label, style, ...rest }: BtnProps) {
  return (
    <Pressable accessibilityRole="button" {...rest} style={({ pressed }) => [{ minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 }, style]}>
      <T v="bold" size={15} color={C.highlight}>{label}</T>
    </Pressable>
  );
}

export function Circle({ label, children, ...rest }: Omit<PressableProps, "children"> & { label: string; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} {...rest} style={({ pressed }) => [s.circle, { opacity: pressed ? 0.7 : 1 }]}>
      {children}
    </Pressable>
  );
}

export const Card = ({ children, style, navy }: { children: ReactNode; style?: StyleProp<ViewStyle>; navy?: boolean }) => (
  <View style={[s.card, navy && { backgroundColor: C.navy }, style]}>{children}</View>
);

/** A grouped list, like SAS's booking rows. */
export const Group = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ backgroundColor: C.surface, borderRadius: R.card, overflow: "hidden" }, style]}>{children}</View>
);

export function Row({ icon, label, onPress, last, right }: { icon?: string; label: string; onPress?: () => void; last?: boolean; right?: ReactNode }) {
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowLine, { opacity: pressed ? 0.7 : 1 }]}>
      {icon ? <J size={22} style={{ width: 28 }} accessibilityElementsHidden importantForAccessibility="no">{icon}</J> : null}
      <T size={17} style={{ flex: 1 }}>{label}</T>
      {right ?? (onPress ? <T size={20} color={C.muted} accessibilityElementsHidden importantForAccessibility="no">›</T> : null)}
    </Pressable>
  );
}

/** The 田字格 practice square with dashed centre guides. */
export function KanjiSquare({ k, size = 180 }: { k: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderWidth: 1.5, borderColor: C.outline, borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", left: size / 2 - 0.5, top: 0, bottom: 0, borderLeftWidth: 1, borderStyle: "dashed", borderColor: "#34363E" }} />
      <View style={{ position: "absolute", top: size / 2 - 0.5, left: 0, right: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: "#34363E" }} />
      <J size={Math.round(size * 0.74)} style={{ lineHeight: Math.round(size * 0.9) }}>{k}</J>
    </View>
  );
}

export const s = StyleSheet.create({
  btn: { minHeight: 56, borderRadius: R.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  circle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#FFFFFF40", backgroundColor: "#00000055", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.surface, borderRadius: R.card, padding: 16 },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: C.line },
});
