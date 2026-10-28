// A scrolling, safe-area-aware page on the black ground, capped at phone width on a laptop.
import type { ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, GUTTER } from "@/theme";

export const MAX_W = 520;

export function Screen({ children, scroll = true, bottom = 24, style, transparent }: { children: ReactNode; scroll?: boolean; bottom?: number; style?: StyleProp<ViewStyle>; transparent?: boolean }) {
  const ins = useSafeAreaInsets();
  const inner = (
    <View style={[{ width: "100%", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: GUTTER, paddingTop: ins.top + 16, paddingBottom: ins.bottom + bottom, gap: 16 }, !scroll && { flex: 1 }, style]}>
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: transparent ? "transparent" : C.bg }}>
      {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
    </View>
  );
}
