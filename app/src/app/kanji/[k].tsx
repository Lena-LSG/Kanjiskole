// Kanji detail: readings, every word with her own hit rate, stroke order, her mnemonic.
import { isLeech, isStarted, stage, type ReviewEvent } from "@kanjiskole/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Kun } from "@/components/AnswerPanel";
import { Screen } from "@/components/Screen";
import { Card, Circle, Ghost, Group, J, KanjiSquare, LinkButton, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKeys } from "@/lib/useKeys";
import { data, useApp } from "@/state/AppState";
import { C, R } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/kanji"));

let strokesCache: Record<string, string[]> | undefined;
function useStrokes(k: string): string[] | null {
  const [s, setS] = useState<string[] | null>(strokesCache?.[k] ?? null);
  useEffect(() => {
    if (strokesCache) { setS(strokesCache[k] ?? []); return; }
    let live = true;
    import("../../../../assets/data/strokes.v1.json").then((m) => {
      strokesCache = (m.default ?? m) as unknown as Record<string, string[]>;
      if (live) setS(strokesCache[k] ?? []);
    });
    return () => { live = false; };
  }, [k]);
  return s;
}

function StrokeOrder({ paths }: { paths: string[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityLabel={`${t.kanji.strokes}: ${paths.length}`}>
      {paths.map((_, i) => (
        <View key={i} style={{ width: 58, height: 58, borderWidth: 1, borderColor: "#34363E", borderRadius: 6 }}>
          <Svg width={56} height={56} viewBox="0 0 109 109">
            {paths.slice(0, i + 1).map((d, j) => (
              <Path key={j} d={d} fill="none" stroke={j === i ? C.highlight : "#5A5D68"} strokeWidth={j === i ? 5 : 4} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
        </View>
      ))}
    </View>
  );
}

export default function KanjiDetail() {
  const { k: raw } = useLocalSearchParams<{ k: string }>();
  // From a URL: expo-router has usually decoded it already, and a stray "%" must not throw.
  const k = (() => { try { return decodeURIComponent(raw ?? ""); } catch { return raw ?? ""; } })();
  const kanji = data.get(k);
  const { cards, events, meta, setMeta, record } = useApp();
  const card = cards.get(k);
  const strokes = useStrokes(k);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meta.mnemonics[k] ?? "");
  const [allWords, setAllWords] = useState(false);
  useKeys((key) => { if (key === "Escape" && !editing) leave(); });

  const history = useMemo(() => {
    const m = new Map<string, { ok: number; n: number; lastWrong?: string }>();
    for (const e of events) {
      if (e.t !== "review" || e.k !== k || !e.word) continue;
      const r = m.get(e.word) ?? { ok: 0, n: 0 };
      r.n++;
      if (e.ok) { r.ok++; r.lastWrong = undefined; } else r.lastWrong = (e as ReviewEvent).answer ?? "?";
      m.set(e.word, r);
    }
    return m;
  }, [events, k]);

  if (!kanji) return <Screen><T>?</T></Screen>;
  const st = stage(card);
  const words = data.wordsOf(kanji);
  const shown = allWords ? words : words.slice(0, 6);
  const nextDays = card && isStarted(card) ? Math.ceil((card.fsrs.due.getTime() - Date.now()) / 864e5) : null;
  const mnemonic = meta.mnemonics[k];
  // KANJIDIC lists う.まれる and うま.れる separately; one per spoken form is enough here.
  const kunUnique = [...new Map(kanji.kun.map((r) => [r.replace(/[.-]/g, ""), r])).values()];
  const kunShown = kunUnique.slice(0, 8), kunMore = kunUnique.length - kunShown.length;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Circle label={t.session.back} onPress={leave}><T size={22}>‹</T></Circle>
        <T v="bold" size={17}>{t.misc.kanjiNo(kanji.i + 1)}</T>
        {card?.queuedAt !== undefined
          ? <T size={15} color={C.muted}>{t.kanji.queued}</T>
          : !isStarted(card)
            ? <Ghost label={t.kanji.queue} style={{ minHeight: 48 }} onPress={() => record([{ t: "queue", k }])} />
            : <View style={{ width: 48 }} />}
      </View>

      <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
        <KanjiSquare k={k} size={180} />
        <T v="black" size={30} style={{ textAlign: "center" }} accessibilityRole="header">{kanji.m.slice(0, 3).join(", ")}</T>
        <T size={14} color={C.muted} style={{ textAlign: "center" }}>
          {[t.panel.strokes(kanji.s), kanji.g <= 6 ? t.misc.grade(kanji.g) : null, kanji.j ? `N${kanji.j}` : null].filter(Boolean).join(" · ")}
          {kanji.c.length ? <> · {t.panel.parts.toLowerCase()} <J size={16}>{kanji.c.join(" + ")}</J></> : null}
        </T>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          [t.kanji.stage, t.kanji.stages[st], C.ink],
          [t.kanji.next, nextDays === null ? "–" : t.kanji.inDays(nextDays), C.ink],
          [t.kanji.lapses, String(card?.lapses ?? 0), card?.lapses ? C.wrong : C.ink],
        ].map(([label, value, color]) => (
          <View key={label} style={{ flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, gap: 6 }}>
            <T size={13} color={C.muted}>{label}</T>
            <T v="bold" size={20} color={color}>{value}</T>
          </View>
        ))}
      </View>
      {card && isLeech(card) ? <T size={15} color={C.wrong}>{t.kanji.leech}</T> : null}

      <Group>
        {kanji.on.length ? (
          <View style={{ flexDirection: "row", gap: 16, padding: 16, borderBottomWidth: kanji.kun.length ? 1 : 0, borderBottomColor: C.line, alignItems: "baseline" }}>
            <T size={14} color={C.muted} style={{ width: 36 }}>On</T>
            <J size={22} style={{ flex: 1 }}>{kanji.on.join("・")}</J>
          </View>
        ) : null}
        {kanji.kun.length ? (
          <View style={{ flexDirection: "row", gap: 16, padding: 16, alignItems: "baseline" }}>
            <T size={14} color={C.muted} style={{ width: 36 }}>Kun</T>
            <J size={22} style={{ flex: 1, lineHeight: 32 }}>{kunShown.map((r, i) => <J key={r} size={22}>{i ? "・" : ""}<Kun s={r} /></J>)}{kunMore ? <T size={15} color={C.faint}>{`  +${kunMore}`}</T> : null}</J>
          </View>
        ) : null}
      </Group>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
        <T v="bold" size={20}>{t.kanji.words}</T>
        {words.length > 6 ? <LinkButton label={allWords ? "–" : `${words.length} ›`} onPress={() => setAllWords((x) => !x)} /> : null}
      </View>
      <Group>
        {shown.map((w, i) => {
          const h = history.get(w.w);
          const note = !h ? t.kanji.notSeen : h.lastWrong ? `✗ ${h.lastWrong}` : `✓ ${h.ok}/${h.n}`;
          return (
            <View key={w.w} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < shown.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
              <J size={22} style={{ minWidth: 64 }}>{w.w}</J>
              <View style={{ flex: 1 }}>
                <J size={16} color={C.highlight}>{w.r}</J>
                {w.g ? <T size={14} color={C.muted}>{w.g}</T> : null}
              </View>
              <T size={13} color={!h ? C.faint : h.lastWrong ? C.wrong : C.highlight}>{note}</T>
            </View>
          );
        })}
      </Group>

      <Card navy style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T v="bold" size={14} color={C.onNavyMuted} style={{ letterSpacing: 0.5 }}>{t.kanji.mnemonic}</T>
          {!editing ? <LinkButton label={t.kanji.edit} onPress={() => { setDraft(mnemonic ?? ""); setEditing(true); }} /> : null}
        </View>
        {editing ? (
          <>
            <TextInput value={draft} onChangeText={setDraft} multiline autoFocus accessibilityLabel={t.kanji.mnemonic}
              style={{ minHeight: 96, borderRadius: R.small, borderWidth: 1, borderColor: C.electric, color: C.ink, padding: 12, fontSize: 16, textAlignVertical: "top" }} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Ghost label={t.kanji.cancel} style={{ flex: 1 }} onPress={() => setEditing(false)} />
              <Ghost label={t.kanji.save} style={{ flex: 1 }} color={C.highlight}
                onPress={() => { const m = { ...meta.mnemonics }; if (draft.trim()) m[k] = draft.trim(); else delete m[k]; setMeta("mnemonics", m); setEditing(false); }} />
            </View>
          </>
        ) : (
          <T size={16} color={mnemonic ? C.ink : C.onNavyMuted} style={{ lineHeight: 24 }}>{mnemonic ?? t.kanji.mnemonicEmpty}</T>
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <T v="bold" size={17}>{t.kanji.strokes}</T>
        {strokes ? <StrokeOrder paths={strokes} /> : <T size={14} color={C.faint}>…</T>}
      </Card>
    </Screen>
  );
}
