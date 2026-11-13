// The kana track: today's numbers, progress per script, the full chart laid out as it's printed (gojūon in vowel
// columns, dakuten, yōon, loanword extensions) coloured by stage, and a detail sheet per character.
import {
  areConfusable, calibrationDue, dueKana, isStarted, KANA, kanaChart, kanaItem, kanaProgress, NEW_PER_DAY, newKana, newToday, stage, stagesOf,
  type KanaItem, type Script,
} from "@kanjiskole/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { SpeakButton } from "@/components/SpeakButton";
import { Fact, Hero, Hub, Segmented, SectionTitle, Sheet, StageBar, StageDot, StartOrExtra, TodaySplit, STAGE_COLOR } from "@/components/Track";
import { Card, Ghost, J, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKeys } from "@/lib/useKeys";
import { useApp, useNow } from "@/state/AppState";
import { C } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));
const DAY = 864e5;

function Cell({ x, onPress }: { x: KanaItem | null; onPress: (x: KanaItem) => void }) {
  const { cards } = useApp();
  if (!x) return <View style={{ flex: 1, aspectRatio: 1 }} />;
  const st = stage(cards.get(x.k));
  const filled = st >= 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${x.k}, ${x.r}, ${t.kanji.stages[st]}`}
      onPress={() => onPress(x)}
      style={({ pressed }) => ({
        flex: 1, aspectRatio: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 0,
        backgroundColor: filled ? STAGE_COLOR[st] : st === 1 ? "#14123F" : C.surface,
        borderWidth: 1, borderColor: st ? STAGE_COLOR[st] : C.line, opacity: pressed ? 0.7 : 1,
      })}
    >
      <J size={x.k.length > 1 ? 19 : 24} color={st === 3 ? C.bg : C.ink} style={{ lineHeight: x.k.length > 1 ? 24 : 30 }}>{x.k}</J>
      <T size={11} color={st === 3 ? "#45474F" : st === 2 ? C.onNavy : C.faint} style={{ lineHeight: 13 }}>{x.r}</T>
    </Pressable>
  );
}

function Chart({ script, onPick }: { script: Script; onPick: (x: KanaItem) => void }) {
  const { cards } = useApp();
  const sections = useMemo(() => kanaChart(script), [script]);
  return (
    <>
      {sections.map((s) => {
        const items = s.rows.flat().filter((x): x is KanaItem => !!x);
        const started = items.filter((x) => isStarted(cards.get(x.k))).length;
        return (
          <View key={s.group} style={{ gap: 10 }}>
            <SectionTitle title={t.kana.sections[s.group] ?? s.group} right={t.kana.count(started, items.length)} />
            <View style={{ gap: 6, maxWidth: s.cols === 5 ? undefined : s.cols === 4 ? "82%" : "62%" }}>
              {s.rows.map((row, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 6 }}>
                  {row.map((x, j) => <Cell key={x?.k ?? `_${j}`} x={x} onPress={onPick} />)}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </>
  );
}

function KanaSheet({ x, onClose }: { x: KanaItem | null; onClose: () => void }) {
  const { cards } = useApp();
  const now = useNow();
  const c = x ? cards.get(x.k) : undefined;
  const st = stage(c);
  const look = x ? KANA.filter((y) => y.script === x.script && areConfusable(x.k, y.k)) : [];
  const days = c && isStarted(c) ? Math.ceil((c.fsrs.due.getTime() - now) / DAY) : null;
  return (
    <Sheet open={!!x} onClose={onClose}>
      {x ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <View style={{ width: 112, height: 112, borderRadius: 20, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" }}>
              <J size={x.k.length > 1 ? 52 : 72} style={{ lineHeight: x.k.length > 1 ? 62 : 86 }}>{x.k}</J>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <T v="black" size={32}>{x.r}</T>
              <T size={15} color={C.muted}>{[x.script === "hira" ? t.kana.hira : t.kana.kata, t.kana.sections[x.group]].join(" · ")}</T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <StageDot st={st} />
                <T size={15}>{t.kanji.stages[st]}</T>
              </View>
            </View>
            <SpeakButton text={x.k} size={48} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Fact label={t.track.nextDue} value={days === null ? t.kanji.notSeen : t.kanji.inDays(days)} />
            <Fact label={t.track.lapses} value={c ? t.num(c.lapses) : "–"} />
          </View>
          {look.length ? (
            <View style={{ gap: 8 }}>
              <T size={13} color={C.muted}>{t.kana.lookalikes}</T>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {look.map((y) => (
                  <View key={y.k} style={{ flexDirection: "row", alignItems: "baseline", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }}>
                    <J size={24}>{y.k}</J>
                    <T size={14} color={C.highlight}>{y.r}</T>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <Ghost label={t.kana.close} onPress={onClose} />
        </>
      ) : null}
    </Sheet>
  );
}

function KnowAll({ script }: { script: Script }) {
  const { cards, meta, record } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const name = script === "hira" ? t.kana.hira : t.kana.kata;
  const todo = KANA.filter((x) => x.script === script && !isStarted(cards.get(x.k)));
  if (!todo.length && !msg) return null;
  const mark = () => {
    const at = Date.now();
    record(todo.map((x) => ({ t: "calibrate" as const, k: x.k, due: calibrationDue(at, Math.random, meta.settings.rolloverHour) })));
    setConfirm(false);
    setMsg(t.kana.marked(todo.length));
  };
  return (
    <Card style={{ gap: 10 }}>
      {msg ? <T size={15} color={C.highlight} accessibilityLiveRegion="polite">{msg}</T>
        : confirm ? (
          <>
            <T size={15} color={C.muted} style={{ lineHeight: 22 }}>{t.kana.knowConfirm(name)}</T>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Ghost label={t.kana.knowNo} style={{ flex: 1 }} onPress={() => setConfirm(false)} />
              <Ghost label={t.kana.knowYes} color={C.highlight} style={{ flex: 1 }} onPress={mark} />
            </View>
          </>
        ) : <Ghost label={t.kana.know} onPress={() => setConfirm(true)} />}
    </Card>
  );
}

export default function Kana() {
  const { cards, events, meta } = useApp();
  const now = useNow();
  const roll = meta.settings.rolloverHour;
  // Open on katakana once hiragana is all started: that's where the work is.
  const [script, setScript] = useState<Script>(() => {
    const h = kanaProgress(cards, "hira");
    return h.started === h.total ? "kata" : "hira";
  });
  const [picked, setPicked] = useState<KanaItem | null>(null);
  useKeys((k) => {
    if (k !== "Escape") return;
    if (picked) setPicked(null);
    else leave();
  });

  const p = useMemo(() => kanaProgress(cards, script), [cards, script]);
  const counts = useMemo(() => stagesOf(cards, KANA.filter((x) => x.script === script).map((x) => x.k)), [cards, script]);
  const due = useMemo(() => dueKana(cards, now, roll).filter((k) => kanaItem(k)!.script === script).length, [cards, now, roll, script]);
  const left = Math.max(0, NEW_PER_DAY.kana - newToday(events, now, roll, (k) => !!kanaItem(k)));
  const fresh = useMemo(() => newKana(cards, left, script).length, [cards, left, script]);
  const unstarted = p.total - p.started;
  const start = () => router.push({ pathname: "/kana-session", params: { script } });
  const extra = () => router.push({ pathname: "/kana-session", params: { script, extra: "5" } });

  return (
    <Hub glyph={script === "hira" ? "あ" : "ア"}>
      <Hero
        onBack={leave}
        title={t.kana.title}
        sub={t.track.summary(due, fresh)}
        action={<StartOrExtra waiting={due + fresh} onStart={start} onExtra={extra} canExtra={unstarted > 0} />}
      />
      <View style={{ marginTop: 22 }}>
        <Segmented label={t.kana.title} value={script} onChange={setScript} options={[{ value: "hira", label: t.kana.hira }, { value: "kata", label: t.kana.kata }]} />
      </View>
      <TodaySplit due={due} fresh={fresh} perDay={NEW_PER_DAY.kana} onExtra={unstarted ? extra : undefined} />

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <T v="bold" size={18}>{t.track.progress}</T>
          <T size={14} color={C.muted}>{t.kana.count(p.started, p.total)} · {t.num(p.solid)} {t.kana.solid}</T>
        </View>
        <StageBar counts={counts} />
      </Card>

      <T size={14} color={C.muted}>{t.kana.tapHint}</T>
      <Chart script={script} onPick={setPicked} />
      <KnowAll key={script} script={script} />
      <KanaSheet x={picked} onClose={() => setPicked(null)} />
    </Hub>
  );
}
