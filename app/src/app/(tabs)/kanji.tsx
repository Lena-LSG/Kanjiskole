import { stage } from "@kanjiskole/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_W } from "@/components/Screen";
import { TAB_BAR_SPACE } from "@/components/TabBar";
import { J, T } from "@/components/ui";
import { t } from "@/i18n";
import { search } from "@/lib/search";
import { useApp } from "@/state/AppState";
import { C, GUTTER, R } from "@/theme";

const DOT = [C.map.unseen, C.map.learning, C.map.young, C.map.mature] as const;

export default function KanjiTab() {
  const { cards } = useApp();
  const ins = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const results = useMemo(() => search(q), [q]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ width: "100%", maxWidth: MAX_W, alignSelf: "center", flex: 1, paddingHorizontal: GUTTER, paddingTop: ins.top + 16, gap: 12 }}>
        <T v="black" size={34} accessibilityRole="header">{t.tabs.kanji}</T>
        <TextInput
          value={q} onChangeText={setQ} placeholder={t.kanji.search} placeholderTextColor={C.faint}
          autoCapitalize="none" autoCorrect={false} accessibilityLabel={t.kanji.search}
          style={{ height: 52, borderRadius: 26, backgroundColor: C.surface, color: C.ink, paddingHorizontal: 20, fontSize: 17 }}
        />
        <T size={13} color={C.muted}>{results.length ? t.kanji.results(results.length) : t.kanji.none}</T>
        <FlatList
          data={results}
          keyExtractor={(k) => k.k}
          initialNumToRender={20}
          contentContainerStyle={{ paddingBottom: ins.bottom + TAB_BAR_SPACE }}
          renderItem={({ item: k, index }) => {
            const st = stage(cards.get(k.k));
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${k.k}, ${k.m[0] ?? ""}, ${t.kanji.stages[st]}`}
                onPress={() => router.push(`/kanji/${encodeURIComponent(k.k)}`)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: pressed ? C.surface : "transparent", borderRadius: R.small, borderBottomWidth: index < results.length - 1 ? 1 : 0, borderBottomColor: C.line })}
              >
                <J size={34} style={{ width: 44, lineHeight: 44 }}>{k.k}</J>
                <View style={{ flex: 1 }}>
                  <T size={16} numberOfLines={1}>{k.m.slice(0, 3).join(", ")}</T>
                  <J size={14} color={C.highlight} numberOfLines={1}>{[...k.on.slice(0, 2), ...k.kun.slice(0, 2).map((r) => r.replace(".", ""))].join("・")}</J>
                </View>
                <T size={12} color={C.faint}>{k.j ? `N${k.j}` : "–"}</T>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: DOT[st], borderWidth: st === 0 ? 1 : 0, borderColor: C.outline }} />
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}
