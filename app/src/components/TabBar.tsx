// The floating pill tab bar, with Lyntest as its own accent button (SAS's EuroBonus slot).
import { router, type Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { C } from "@/theme";
import { MAX_W } from "./Screen";
import { J, T } from "./ui";

// Labels are read at render time: `t` changes when the language does.
const TABS: Record<string, { icon: string; label: () => string }> = {
  index: { icon: "家", label: () => t.tabs.home },
  kanji: { icon: "字", label: () => t.tabs.kanji },
  stats: { icon: "統", label: () => t.tabs.stats },
};

export const TAB_BAR_SPACE = 112;

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t.tabs.nav}
      style={{ position: "absolute", left: 0, right: 0, bottom: ins.bottom + 14, alignItems: "center" }}
    >
      <View style={{ width: "100%", maxWidth: MAX_W, paddingHorizontal: 12, flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, height: 72, borderRadius: 36, backgroundColor: C.tabBar, borderWidth: 1, borderColor: "#34363E", flexDirection: "row", alignItems: "center", paddingHorizontal: 6, gap: 2 }}>
          {state.routes.map((r, i) => {
            const tab = TABS[r.name];
            if (!tab) return null;
            const on = state.index === i;
            return (
              <Pressable
                key={r.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => { if (!on) navigateToTab(r.key); }}
                style={{ flex: 1, height: 60, borderRadius: 30, backgroundColor: on ? C.tabActive : "transparent", alignItems: "center", justifyContent: "center", gap: 2 }}
              >
                <J size={20} style={{ lineHeight: 22 }} accessibilityElementsHidden importantForAccessibility="no">{tab.icon}</J>
                <T size={13}>{tab.label()}</T>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/blitz")}
          style={({ pressed }) => ({ width: 92, height: 72, borderRadius: 36, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", gap: 2, opacity: pressed ? 0.85 : 1 })}
        >
          <J size={22} style={{ lineHeight: 24 }} accessibilityElementsHidden importantForAccessibility="no">速</J>
          <T size={13}>{t.tabs.blitz}</T>
        </Pressable>
      </View>
    </View>
  );
}
