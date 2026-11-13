// A study session: reviews oldest-first with new kanji woven in, misses requeued three cards back.
import {
  afterAnswer, afterIntro, buildSession, extraNew, explainKanjiChoice, explainReading, judgeTyped, makeExercise, newToday,
  planFor, preferredKind, preview, toKana, type CardState, type Exercise, type ExerciseKind, type Explanation, type Grade,
  type Item, type Option, type Verdict, type Word,
} from "@kanjiskole/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { AnswerPanel, Marked } from "@/components/AnswerPanel";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Explain } from "@/components/Explain";
import { Card, Ghost, Group, J, KanjiSquare, LinkButton, Primary, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKnown } from "@/lib/known";
import { useKeys } from "@/lib/useKeys";
import { speakWord } from "@/lib/speech";
import { data, useApp } from "@/state/AppState";
import { C, R } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));
const isKanjiKey = (k: string) => !!data.get(k);

interface Settle { grade: Grade; ex: ExerciseKind; ok: boolean; word?: string; answer?: string; ms: number }

export default function Session() {
  const { cards, events, meta, record } = useApp();
  const { extra } = useLocalSearchParams<{ extra?: string }>();
  const [q, setQ] = useState<Item[]>(() => {
    const now = Date.now();
    // `extra` arrives from a URL (kanjiskole://session?extra=…): extraNew clamps it, never trusts it.
    const more = extraNew(extra);
    const onlyNew = more !== null;
    const newLimit = more !== null ? more : Math.max(0, meta.settings.newPerDay - newToday(events, now, meta.settings.rolloverHour, isKanjiKey));
    return buildSession(cards as Map<string, CardState>, data, { now, newLimit, style: meta.settings.reviewStyle, rolloverHour: meta.settings.rolloverHour, onlyNew });
  });
  const total = useRef(q.length).current;
  const [done, setDone] = useState(0);
  const [step, setStep] = useState(0);
  const failed = useRef(new Set<string>()).current;
  const answers = useRef(0);
  const known = useKnown(cards);
  const head = q[0];

  const settle = (item: Item, s: Settle) => {
    record([{ t: "review", k: item.k, ex: s.ex, ok: s.ok, grade: s.grade, word: s.word, answer: s.answer, ms: s.ms, via: "app" }]);
    answers.current++;
    const again = s.grade === 1;
    if (again) failed.add(item.k);
    else setDone((d) => d + 1);
    setQ((cur) => afterAnswer(cur, again));
    setStep((x) => x + 1);
  };

  if (!head) return <Finished answers={answers.current} fresh={newToday(events, Date.now(), meta.settings.rolloverHour, isKanjiKey)} empty={total === 0} />;

  const kanji = data.get(head.k)!;
  const card = cards.get(head.k);
  const bar = <TopBar onBack={leave} progress={total ? done / total : 0} label={`${done}/${total}`} />;
  const status = head.fresh ? t.session.newTest : failed.has(head.k) ? t.session.again : !card || card.fsrs.reps === 0 ? t.session.newKanji : t.session.review;

  if (head.t === "intro") {
    return <Intro key={step} bar={bar} kanji={kanji} onDone={() => { setQ((cur) => afterIntro(cur)); setStep((x) => x + 1); }} />;
  }
  if (head.t === "flash") {
    return <Flash key={step} bar={bar} status={status} kanjiK={head.k} card={card} known={known} onSettle={(s) => settle(head, s)} />;
  }
  return <Quiz key={step} bar={bar} status={status} kanjiK={head.k} card={card} known={known} onSettle={(s) => settle(head, s)} />;
}

function Chips({ a, b }: { a: string; b: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.ink, justifyContent: "center" }}><T v="bold" size={14} color={C.bg}>{a}</T></View>
      <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: C.outline, justifyContent: "center" }}><T size={14} color="#D7DAE2">{b}</T></View>
    </View>
  );
}

const Keys = ({ text }: { text: string }) => <T size={13} color={C.faint} style={{ textAlign: "center", marginTop: "auto" }}>{text}</T>;

// ---------- intro ----------

function Intro({ bar, kanji, onDone }: { bar: React.ReactNode; kanji: NonNullable<ReturnType<typeof data.get>>; onDone: () => void }) {
  useKeys((k, e) => { if (k === "Enter" || k === " ") { e.preventDefault(); onDone(); } else if (k === "Escape") leave(); });
  return (
    <Screen>
      {bar}
      <Chips a={t.session.newKanji} b={kanji.j ? `N${kanji.j}` : "jōyō"} />
      <View style={{ alignItems: "center", paddingVertical: 8 }}><KanjiSquare k={kanji.k} size={180} /></View>
      <AnswerPanel kanji={kanji} />
      <Primary label={t.session.gotIt} onPress={onDone} />
      <Keys text={t.session.keysIntro} />
    </Screen>
  );
}

// ---------- flashcards ----------

function Flash({ bar, status, kanjiK, card, known, onSettle }: { bar: React.ReactNode; status: string; kanjiK: string; card?: CardState; known: ReadonlySet<string>; onSettle: (s: Settle) => void }) {
  const kanji = data.get(kanjiK)!;
  const word = useMemo(() => planFor(kanji, card, data, known).words[0], []); // eslint-disable-line react-hooks/exhaustive-deps
  const [shown, setShown] = useState(false);
  const start = useRef(Date.now()).current;
  const pv = useMemo(() => preview(card, Date.now()), [card]);
  const go = (g: Grade) => onSettle({ grade: g, ex: "flash", ok: g > 1, word: word?.w, ms: Date.now() - start });
  useKeys((k, e) => {
    if (k === " " || k === "Enter") { e.preventDefault(); setShown(true); }
    else if (shown && "1234".includes(k)) go(Number(k) as Grade);
    else if (k === "Escape") leave();
  });
  return (
    <Screen>
      {bar}
      <Chips a={t.misc.flashcard} b={status} />
      <Card navy style={{ alignItems: "center", gap: 12, paddingVertical: 28 }}>
        <KanjiSquare k={kanji.k} size={150} />
        {word ? <Marked word={word.w} k={kanji.k} size={40} /> : null}
        <T size={15} color={C.onNavyMuted}>{word ? t.session.flashPrompt : t.session.flashPromptNoWord}</T>
      </Card>
      {shown ? (
        <>
          <AnswerPanel kanji={kanji} focus={word} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {([1, 2, 3, 4] as Grade[]).map((g) => (
              <Pressable
                key={g}
                accessibilityRole="button"
                onPress={() => go(g)}
                style={({ pressed }) => ({ flex: 1, minHeight: 64, borderRadius: R.small, alignItems: "center", justifyContent: "center", backgroundColor: g === 1 ? "#3A1A14" : g === 3 ? C.accent : C.surface, borderWidth: 1, borderColor: g === 1 ? C.wrong : g === 3 ? C.accent : C.line, opacity: pressed ? 0.8 : 1 })}
              >
                <T v="bold" size={15} color={g === 1 ? C.wrong : C.ink}>{t.grades[g - 1]}</T>
                <T size={12} color={g === 3 ? C.onNavy : C.muted}>{t.intervals(pv[g])}</T>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Primary label={t.session.show} onPress={() => setShown(true)} />
      )}
      <Keys text={t.session.keysFlash} />
    </Screen>
  );
}

// ---------- quizzes ----------

type Result = { ok: boolean; chosen?: Option; verdict?: Verdict; at: number };

function Quiz({ bar, status, kanjiK, card, known, onSettle }: { bar: React.ReactNode; status: string; kanjiK: string; card?: CardState; known: ReadonlySet<string>; onSettle: (s: Settle) => void }) {
  const kanji = data.get(kanjiK)!;
  const ex = useMemo<Exercise>(
    () => {
      // What this card is ready for: readable words, exercise types and distractors by how well she knows it.
      const plan = planFor(kanji, card, data, known);
      return makeExercise(kanji, data, Math.random, { ...plan, prefer: preferredKind(card, plan.words.length > 0) });
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps -- one exercise per card on screen
  );
  const word: Word | undefined = "word" in ex ? ex.word : undefined;
  const start = useRef(Date.now()).current;
  const [res, setRes] = useState<Result | null>(null);
  const [typed, setTyped] = useState("");
  const pv = useMemo(() => preview(card, Date.now()), [card]);
  const right = useMemo(() => t.session.right[Math.floor(Math.random() * t.session.right.length)]!, []);

  const answerText = res?.verdict?.got ?? res?.chosen?.label;
  const { meta } = useApp();
  useEffect(() => { if (res && word && meta.settings.autoSpeak) speakWord(word); }, [res !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (grade: Grade, ok = res?.ok ?? false) =>
    onSettle({ grade, ex: ex.kind, ok, word: word?.w, answer: answerText, ms: (res?.at ?? Date.now()) - start });

  const choose = (o: Option) => { if (!res) setRes({ ok: o.ok, chosen: o, at: Date.now() }); };
  const submit = () => {
    if (res || !typed.trim() || ex.kind !== "type") return;
    const v = judgeTyped(typed, ex.word);
    setRes({ ok: v.ok, verdict: v, at: Date.now() });
  };

  useKeys((k, e) => {
    if (k === "Escape") return leave();
    if (!res) {
      if ("options" in ex && "1234".includes(k)) ex.options[Number(k) - 1] && choose(ex.options[Number(k) - 1]!);
      return;
    }
    if (Date.now() - res.at < 350) return; // the key that answered must not also settle
    if (k === "Enter" || k === " ") { e.preventDefault(); go(res.ok ? 3 : 1); }
    else if (res.ok && k === "1") go(2);
    else if (res.ok && k === "3") go(4);
  });

  const why: Explanation | null = useMemo(() => {
    if (!res || res.ok) return null;
    if (ex.kind === "read" && res.chosen) return explainReading(res.chosen.label, ex.word, data);
    if (ex.kind === "type" && res.verdict) return explainReading(res.verdict.got, ex.word, data);
    if (res.chosen?.k) return explainKanjiChoice(res.chosen.k, kanji.k, data);
    return null;
  }, [res, ex, kanji.k]);

  const kind = t.kinds[ex.kind];
  return (
    <Screen>
      {bar}
      <Chips a={kind.label} b={status} />
      <Prompt ex={ex} />

      {"options" in ex ? (
        <Group>
          {ex.options.map((o, i) => {
            const isRight = !!res && o.ok, isWrong = !!res && res.chosen === o && !o.ok;
            return (
              <Pressable
                key={o.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!res, selected: res?.chosen === o }}
                disabled={!!res}
                onPress={() => choose(o)}
                style={({ pressed }) => ({ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: C.line, backgroundColor: isRight ? "#141A55" : isWrong ? "#3A1A14" : pressed ? "#202128" : "transparent" })}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: isRight ? C.electric : isWrong ? C.wrong : C.outline, alignItems: "center", justifyContent: "center" }}>
                  <T size={15} color={isRight ? C.highlight : isWrong ? C.wrong : C.muted}>{isRight ? "✓" : isWrong ? "✗" : i + 1}</T>
                </View>
                {ex.kind === "mean"
                  ? <T size={18} style={{ flex: 1 }}>{o.label}</T>
                  : <J size={ex.kind === "read" ? 26 : 34}>{o.label}</J>}
              </Pressable>
            );
          })}
        </Group>
      ) : (
        <View style={{ gap: 8 }}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={submit}
            editable={!res}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            enterKeyHint="done"
            placeholder={t.session.typePlaceholder}
            placeholderTextColor={C.faint}
            accessibilityLabel={kind.q}
            style={{ minHeight: 56, borderRadius: R.small, borderWidth: 2, borderColor: res ? (res.ok ? C.electric : C.wrong) : C.outline, backgroundColor: C.bg, color: C.ink, paddingHorizontal: 16, fontSize: 20 }}
          />
          {/[a-z]/i.test(typed) ? <J size={22} color={C.highlight} accessibilityLiveRegion="polite">{toKana(typed)}</J> : null}
          {!res ? <Primary label={t.session.check} onPress={submit} /> : null}
        </View>
      )}

      {res ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12, flexWrap: "wrap" }} accessibilityLiveRegion="polite">
            <T v="black" size={34} color={res.ok ? C.highlight : C.wrong}>{res.ok ? right : t.session.wrong}</T>
            {res.ok ? <T size={17} color="#D7DAE2">{t.session.rightSuffix}</T> : null}
            {!res.ok && word ? <T size={17} color="#D7DAE2">{t.session.correctIs} <J size={22}>{word.r}</J></T> : null}
          </View>
          {res.verdict?.how === "alternative" && word ? <T size={15} color={C.muted}>{t.session.alsoRight(word.r)}</T> : null}
          {!res.ok ? <Explain e={why} word={ex.kind === "read" || ex.kind === "type" || ex.kind === "fill" ? word : undefined} /> : null}
          <AnswerPanel kanji={kanji} focus={word} />
          {res.ok ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Ghost label={t.session.guessed} sub={t.intervals(pv[2])} onPress={() => go(2)} style={{ flex: 1 }} />
              <Primary label={t.session.next} sub={t.intervals(pv[3])} onPress={() => go(3)} style={{ flex: 1.3 }} />
              <Ghost label={t.session.tooEasy} sub={t.intervals(pv[4])} onPress={() => go(4)} style={{ flex: 1 }} />
            </View>
          ) : (
            <Primary label={`${t.session.next} · ${t.session.comesBack}`} onPress={() => go(1)} />
          )}
          {!res.ok && ex.kind === "type" ? <LinkButton label={t.session.alsoValid} onPress={() => go(3, true)} /> : null}
        </>
      ) : null}
      <Keys text={"options" in ex ? t.session.keysOpts : t.session.keysTyped} />
    </Screen>
  );
}

function Prompt({ ex }: { ex: Exercise }) {
  const kind = t.kinds[ex.kind];
  const k = ex.k.k;
  return (
    <Card navy style={{ alignItems: "center", gap: 10, paddingVertical: 26 }}>
      {ex.kind === "mean" ? (
        <>
          <KanjiSquare k={k} size={170} />
          <T size={15} color={C.onNavyMuted}>{kind.q}</T>
        </>
      ) : ex.kind === "which" ? (
        <>
          <T size={15} color={C.onNavyMuted}>{kind.q}</T>
          <T v="black" size={30} style={{ textAlign: "center" }}>{ex.meaning}</T>
        </>
      ) : ex.kind === "fill" ? (
        <>
          <T size={15} color={C.onNavyMuted}>{kind.q}</T>
          <J size={64} style={{ lineHeight: 84, letterSpacing: 4 }}>
            {[...ex.word.w].map((ch, i) => (ch === k ? <J key={i} size={64} color={C.highlight}>□</J> : ch))}
          </J>
          <T size={16} color={C.onNavy}><J size={18} color={C.highlight}>{ex.word.r}</J>{ex.word.g ? ` · ${ex.word.g}` : ""}</T>
        </>
      ) : (
        <>
          <T size={15} color={C.onNavyMuted}>{kind.q}</T>
          <Marked word={ex.word.w} k={k} size={ex.word.w.length > 3 ? 64 : 84} />
          {ex.word.g ? <T size={17} color={C.onNavy} style={{ textAlign: "center" }}>{ex.word.g}</T> : null}
        </>
      )}
    </Card>
  );
}

function Finished({ answers, fresh, empty }: { answers: number; fresh: number; empty: boolean }) {
  useKeys((k) => { if (k === "Enter" || k === "Escape") leave(); });
  return (
    <Screen style={{ justifyContent: "center", alignItems: "center", flex: 1 }}>
      <J size={120} style={{ lineHeight: 140 }}>済</J>
      <T v="black" size={30}>{t.session.finishedTitle}</T>
      <T size={16} color={C.muted} style={{ textAlign: "center" }}>{empty ? t.session.nothing : t.session.finished(answers, fresh)}</T>
      <Primary label={t.session.back} onPress={leave} style={{ alignSelf: "stretch", marginTop: 12 }} />
    </Screen>
  );
}
