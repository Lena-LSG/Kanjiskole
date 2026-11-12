import { importPrototype, studyDay } from "@kanjiskole/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Card, Ghost, Primary, T } from "@/components/ui";
import { LANGS, t } from "@/i18n";
import { pickText, saveText } from "@/lib/files";
import { useJapaneseVoice } from "@/lib/speech";
import { useKeys } from "@/lib/useKeys";
import { data, useApp } from "@/state/AppState";
import { store } from "@/storage/store";
import { C, R } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

function Segmented<V extends string | number | boolean>({ options, value, onChange }: { options: [V, string][]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable key={String(v)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(v)}
            style={{ minHeight: 44, minWidth: 52, paddingHorizontal: 16, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: on ? C.ink : "transparent", borderWidth: 1, borderColor: on ? C.ink : C.outline }}>
            <T v={on ? "bold" : "body"} size={16} color={on ? C.bg : C.ink}>{label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Settings() {
  const { meta, setMeta, ingest, events } = useApp();
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const voice = useJapaneseVoice();
  useKeys((k) => { if (k === "Escape") leave(); });

  const runImport = (text: string) => {
    try {
      const res = importPrototype(JSON.parse(text), (k) => !!data.get(k));
      ingest(res.events);
      setMeta("settings", { ...meta.settings, ...res.settings });
      if (res.blitzBest > meta.blitzBest) setMeta("blitzBest", res.blitzBest);
      const days = new Map(meta.legacyDays.map((d) => [d.day, d]));
      for (const d of res.legacyDays) days.set(d.day, d);
      setMeta("legacyDays", [...days.values()]);
      setMsg(t.settings.imported(res.events.length, res.skipped.length));
      setPaste("");
    } catch {
      setMsg(t.settings.importFailed);
    }
  };

  const runExport = async () => {
    const dump = { app: "kanjiskole", format: 1, exportedAt: new Date().toISOString(), dataVersion: data.version, events, meta: await store.allMeta() };
    await saveText(`kanjiskole-${studyDay(Date.now())}.json`, JSON.stringify(dump, null, 1));
  };

  return (
    <Screen>
      <TopBar onBack={leave} backLabel={t.settings.close} />
      <T v="black" size={34} accessibilityRole="header">{t.settings.title}</T>

      <Card style={{ gap: 12 }}>
        <T v="bold" size={17}>{t.settings.perDay}</T>
        <Segmented options={[5, 10, 15, 20, 30].map((n) => [n, String(n)] as [number, string])} value={meta.settings.newPerDay}
          onChange={(n) => setMeta("settings", { ...meta.settings, newPerDay: n })} />
        <T v="bold" size={17} style={{ marginTop: 8 }}>{t.settings.style}</T>
        <Segmented options={[["quiz", t.settings.quiz], ["flash", t.settings.flash]]} value={meta.settings.reviewStyle}
          onChange={(v) => setMeta("settings", { ...meta.settings, reviewStyle: v })} />
        <T v="bold" size={17} style={{ marginTop: 8 }}>{t.settings.language}</T>
        <Segmented options={LANGS.map((l) => [l, t.settings.languages[l]] as [typeof l, string])} value={meta.settings.uiLang}
          onChange={(l) => setMeta("settings", { ...meta.settings, uiLang: l })} />
        <T v="bold" size={17} style={{ marginTop: 8 }}>{t.audio.setting}</T>
        {voice ? (
          <Segmented options={[[true, t.audio.on], [false, t.audio.off]] as [boolean, string][]} value={meta.settings.autoSpeak}
            onChange={(v) => setMeta("settings", { ...meta.settings, autoSpeak: v })} />
        ) : <T size={14} color={C.muted} style={{ lineHeight: 20 }}>{t.audio.noVoice}</T>}
      </Card>

      <Card style={{ gap: 12 }}>
        <T v="bold" size={17}>{t.settings.importTitle}</T>
        <T size={15} color={C.muted} style={{ lineHeight: 22 }}>{t.settings.importHelp}</T>
        <TextInput value={paste} onChangeText={setPaste} multiline placeholder='{"v":1,"cards":{…}}' placeholderTextColor={C.faint}
          accessibilityLabel={t.settings.importTitle}
          style={{ minHeight: 96, borderRadius: R.small, borderWidth: 1, borderColor: C.outline, color: C.ink, padding: 12, fontSize: 14, textAlignVertical: "top" }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Ghost label={t.settings.importPick} style={{ flex: 1 }} onPress={async () => { const txt = await pickText(); if (txt) runImport(txt); }} />
          <Primary label={t.settings.importRun} style={{ flex: 1 }} disabled={!paste.trim()} onPress={() => runImport(paste)} />
        </View>
        {msg ? <T size={15} color={C.highlight} accessibilityLiveRegion="polite">{msg}</T> : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <T v="bold" size={17}>{t.settings.exportTitle}</T>
        <T size={15} color={C.muted}>{t.settings.exportHelp}</T>
        <Ghost label={t.settings.exportRun} onPress={runExport} />
      </Card>

      <Card style={{ gap: 8 }}>
        <T v="bold" size={17}>{t.settings.about}</T>
        <T size={13} color={C.muted} style={{ lineHeight: 19 }}>{t.settings.aboutText}</T>
        <T size={12} color={C.faint}>{t.misc.dataVersion(data.version)}</T>
      </Card>
    </Screen>
  );
}
