import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppFonts } from "@/fonts";
import { setLang, t } from "@/i18n";
import { AppStateProvider, useApp } from "@/state/AppState";
import { C } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const fonts = useAppFonts();
  const { ready, meta } = useApp();
  setLang(meta.settings.uiLang); // before any screen renders a string
  const go = fonts && ready;
  useEffect(() => { if (go) SplashScreen.hideAsync().catch(() => {}); }, [go]);
  if (!go) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <Stack key={meta.settings.uiLang} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: "fade" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="session" options={{ gestureEnabled: false }} />
      <Stack.Screen name="blitz" options={{ gestureEnabled: false }} />
      <Stack.Screen name="calibrate" />
      <Stack.Screen name="kana" />
      <Stack.Screen name="words" />
      <Stack.Screen name="words-session" options={{ gestureEnabled: false }} />
      <Stack.Screen name="kana-session" options={{ gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      <Stack.Screen name="kanji/[k]" />
      <Stack.Screen name="word/[w]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <AppStateProvider>
        <Gate />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

/** Never a blank page: show what broke and a way back. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: "center", gap: 16 }}>
      <Text style={{ color: C.wrong, fontSize: 28, fontWeight: "900" }}>{t.error.title}</Text>
      <Text style={{ color: C.muted, fontSize: 15 }}>{error.message}</Text>
      <Text style={{ color: C.muted, fontSize: 15 }}>{t.error.body}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.ink, fontSize: 18, fontWeight: "700" }}>{t.error.retry}</Text>
      </Pressable>
    </View>
  );
}
