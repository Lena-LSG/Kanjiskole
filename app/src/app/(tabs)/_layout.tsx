import { Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";
import { C } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="kanji" />
      <Tabs.Screen name="stats" />
    </Tabs>
  );
}
