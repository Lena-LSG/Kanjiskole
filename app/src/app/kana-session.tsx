// A kana session: due kana first, new ones woven in, misses back three cards later. Same grades as the kanji.
import {
  afterAnswer, afterIntro, areConfusable, dueKana, interleave, judgeKana, KANA, kanaItem, makeKanaExercise, newKana, newToday,
  preview, toKana, type CardState, type Grade, type Item, type KanaExercise, type Script,
} from "@kanjiskole/core";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Card, Ghost, Group, J, LinkButton, Primary, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKeys } from "@/lib/useKeys";
import { useApp } from "@/state/AppState";
import { C, R } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/kana"));
const NEW_PER_DAY = 15; // kana are quick to learn; a day's new batch is about one gojūon block and a half

export default function KanaSession() {
  const { cards, events, meta, record } = useApp();
  const { script: s } = useLocalSearchParams<{ script?: string }>();
  const script: Script = s === "kata" ? "kata" : "hira";
  const [q, setQ] = useState<Item[]>(() => {
    const now = Date.now();
    const roll = meta.settings.rolloverHour;
    const due = dueKana(cards, now, roll).filter((k) => kanaItem(k)!.script === script);
    const left = Math.max(0, NEW_PER_DAY - newToday(events, now, roll, (k) => !!kanaItem(k)));
    return interleave(due, newKana(cards, left, script), "quiz");
  });
  const total = useRef(q.length).current;
  const [done, setDone] = useState(0);
  const [step, setStep] = useState(0);
  const head = q[0];

  if (!head) {
    return (
      <Screen style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <J size={120} style={{ lineHeight: 140 }}>済</J>
        <T v="black" size={30}>{t.session.finishedTitle}</T>
        {total === 0 ? <T size={16} color={C.muted} style={{ textAlign: "center" }}>{KANA.some((x) => x.script === script && !cards.has(x.k)) ? t.session.nothing : t.kana.done}</T> : null}
        <Primary label={t.session.back} onPress={leave} style={{ alignSelf: "stretch", marginTop: 12 }} />
      </Screen>
    );
  }

  const item = kanaItem(head.k)!;
  const bar = <TopBar onBack={leave} progress={total ? done / total : 0} label={`${done}/${total}`} />;
  if (head.t === "intro") {
    const next = () => { setQ((cur) => afterIntro(cur)); setStep((x) => x + 1); };
    return <Intro key={step} bar={bar} k={item.k} r={item.r} onDone={next} />;
  }
  return (
    <Quiz
      key={step}
      bar={bar}
      fresh={!!head.fresh}
      itemK={item.k}
      card={cards.get(item.k)}
      onSettle={(grade, ex, ok, answer, ms) => {
        record([{ t: "review", k: item.k, ex: ex.kind, ok, grade, answer, ms, via: "app" }]);
        if (grade > 1) setDone((d) => d + 1);
        setQ((cur) => afterAnswer(cur, grade === 1));
        setStep((x) => x + 1);
      }}
    />
  );
}

function Intro({ bar, k, r, onDone }: { bar: React.ReactNode; k: string; r: string; onDone: () => void }) {
  useKeys((key, e) => { if (key === "Enter" || key === " ") { e.preventDefault(); onDone(); } else if (key === "Escape") leave(); });
  return (
    <Screen>
      {bar}
      <Card navy style={{ alignItems: "center", gap: 8, paddingVertical: 36 }}>
        <T size={15} color={C.onNavyMuted}>{t.kana.newKana}</T>
        <J size={140} style={{ lineHeight: 170 }}>{k}</J>
        <T v="black" size={36}>{r}</T>
      </Card>
      <Primary label={t.session.gotIt} onPress={onDone} />
    </Screen>
  );
}

function Quiz({ bar, fresh, itemK, card, onSettle }: {
  bar: React.ReactNode; fresh: boolean; itemK: string; card?: CardState;
  onSettle: (grade: Grade, ex: KanaExercise, ok: boolean, answer: string | undefined, ms: number) => void;
}) {
  const item = kanaItem(itemK)!;
  const ex = useMemo(() => makeKanaExercise(item, card, Math.random), []); // eslint-disable-line react-hooks/exhaustive-deps
  const start = useRef(Date.now()).current;
  const [res, setRes] = useState<{ ok: boolean; answer: string; at: number } | null>(null);
  const [typed, setTyped] = useState("");
  const pv = useMemo(() => preview(card, Date.now()), [card]);
  const right = useMemo(() => t.session.right[Math.floor(Math.random() * t.session.right.length)]!, []);

  const go = (g: Grade, ok = res?.ok ?? false) => onSettle(g, ex, ok, res?.answer, (res?.at ?? Date.now()) - start);
  const choose = (o: { label: string; ok: boolean }) => { if (!res) setRes({ ok: o.ok, answer: o.label, at: Date.now() }); };
  const submit = () => {
    if (res || !typed.trim() || ex.kind !== "kana-type") return;
    const v = judgeKana(typed, item);
    setRes({ ok: v.ok, answer: typed.trim(), at: Date.now() });
  };
  useKeys((k, e) => {
    if (k === "Escape") return leave();
    if (!res) { if ("options" in ex && "1234".includes(k) && ex.options[Number(k) - 1]) choose(ex.options[Number(k) - 1]!); return; }
    if (Date.now() - res.at < 350) return;
    if (k === "Enter" || k === " ") { e.preventDefault(); go(res.ok ? 3 : 1); }
    else if (res.ok && k === "1") go(2);
    else if (res.ok && k === "3") go(4);
  });

  // A wrong pick explains itself: what the picked one is, and what this one is.
  const picked = res && !res.ok && "options" in ex
    ? ex.kind === "kana-pick" ? kanaItem(res.answer) : KANA.find((x) => x.script === item.script && x.r === res.answer)
    : undefined;
  const label = ex.kind === "kana-read" ? t.kana.readLabel : ex.kind === "kana-pick" ? t.kana.pickLabel : t.kana.typeLabel;

  return (
    <Screen>
      {bar}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.ink, justifyContent: "center" }}><T v="bold" size={14} color={C.bg}>{label}</T></View>
        <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: C.outline, justifyContent: "center" }}><T size={14} color="#D7DAE2">{fresh ? t.session.newTest : item.script === "hira" ? t.kana.hira : t.kana.kata}</T></View>
      </View>

      <Card navy style={{ alignItems: "center", gap: 10, paddingVertical: 30 }}>
        <T size={15} color={C.onNavyMuted}>{ex.kind === "kana-read" ? t.kana.readQ : ex.kind === "kana-pick" ? t.kana.pickQ : t.kana.typeQ}</T>
        {ex.kind === "kana-pick" ? <T v="black" size={64}>{item.r}</T> : <J size={120} style={{ lineHeight: 150 }}>{item.k}</J>}
      </Card>

      {"options" in ex ? (
        <Group>
          {ex.options.map((o, i) => {
            const isRight = !!res && o.ok, isWrong = !!res && res.answer === o.label && !o.ok;
            return (
              <Pressable key={o.label} accessibilityRole="button" disabled={!!res} onPress={() => choose(o)}
                style={({ pressed }) => ({ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: C.line, backgroundColor: isRight ? "#141A55" : isWrong ? "#3A1A14" : pressed ? "#202128" : "transparent" })}>
                <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: isRight ? C.electric : isWrong ? C.wrong : C.outline, alignItems: "center", justifyContent: "center" }}>
                  <T size={15} color={isRight ? C.highlight : isWrong ? C.wrong : C.muted}>{isRight ? "✓" : isWrong ? "✗" : i + 1}</T>
                </View>
                {ex.kind === "kana-pick" ? <J size={36}>{o.label}</J> : <T v="bold" size={22}>{o.label}</T>}
              </Pressable>
            );
          })}
        </Group>
      ) : (
        <View style={{ gap: 8 }}>
          <TextInput value={typed} onChangeText={setTyped} onSubmitEditing={submit} editable={!res} autoFocus autoCapitalize="none"
            autoCorrect={false} spellCheck={false} placeholder={t.kana.placeholder} placeholderTextColor={C.faint} accessibilityLabel={t.kana.typeQ}
            style={{ minHeight: 56, borderRadius: R.small, borderWidth: 2, borderColor: res ? (res.ok ? C.electric : C.wrong) : C.outline, backgroundColor: C.bg, color: C.ink, paddingHorizontal: 16, fontSize: 20 }} />
          {/[a-z]/i.test(typed) ? <J size={22} color={C.highlight}>{toKana(typed)}</J> : null}
          {!res ? <Primary label={t.session.check} onPress={submit} /> : null}
        </View>
      )}

      {res ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12, flexWrap: "wrap" }} accessibilityLiveRegion="polite">
            <T v="black" size={34} color={res.ok ? C.highlight : C.wrong}>{res.ok ? right : t.session.wrong}</T>
            <T size={17} color="#D7DAE2"><J size={22}>{item.k}</J> = {item.r}</T>
          </View>
          {!res.ok ? (
            <Card navy style={{ gap: 8 }}>
              <T v="bold" size={14} color={C.onNavyMuted} style={{ letterSpacing: 0.5 }}>{t.why.toUpperCase()}</T>
              <T size={17} style={{ lineHeight: 25 }}>
                {!picked ? t.kana.isRead(item.k, item.r)
                  : areConfusable(item.k, picked.k) ? t.kana.mixup(item.k, item.r, picked.k, picked.r)
                  : t.kana.picked(picked.k, picked.r, item.k, item.r)}
              </T>
            </Card>
          ) : null}
          {res.ok ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Ghost label={t.session.guessed} sub={t.intervals(pv[2])} onPress={() => go(2)} style={{ flex: 1 }} />
              <Primary label={t.session.next} sub={t.intervals(pv[3])} onPress={() => go(3)} style={{ flex: 1.3 }} />
              <Ghost label={t.session.tooEasy} sub={t.intervals(pv[4])} onPress={() => go(4)} style={{ flex: 1 }} />
            </View>
          ) : <Primary label={`${t.session.next} · ${t.session.comesBack}`} onPress={() => go(1)} />}
          {!res.ok && ex.kind === "kana-type" ? <LinkButton label={t.session.alsoValid} onPress={() => go(3, true)} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
