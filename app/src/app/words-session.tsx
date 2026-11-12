// A vocabulary session: due words first, newly unlocked ones woven in. Same grades and Hvorfor? as the kanji.
import {
  afterAnswer, afterIntro, dueWords, explainKanjiChoice, explainReading, interleave, judgeTyped, makeWordExercise,
  newToday, newWords, preview, toKana, wordOf, type CardState, type Explanation, type Grade, type Item, type WordExercise,
} from "@kanjiskole/core";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Explain } from "@/components/Explain";
import { Card, Ghost, Group, J, LinkButton, Primary, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKnown } from "@/lib/known";
import { hasVoice, speakWord, useJapaneseVoice } from "@/lib/speech";
import { hasRecording } from "@/lib/recordings";
import { SpeakButton } from "@/components/SpeakButton";
import { useKeys } from "@/lib/useKeys";
import { data, useApp } from "@/state/AppState";
import { C, R } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/words"));
const NEW_PER_DAY = 10;

export default function WordsSession() {
  const { cards, events, meta, record } = useApp();
  const known = useKnown(cards);
  const [q, setQ] = useState<Item[]>(() => {
    const now = Date.now();
    const roll = meta.settings.rolloverHour;
    const left = Math.max(0, NEW_PER_DAY - newToday(events, now, roll, (k) => k.startsWith("w:")));
    return interleave(dueWords(cards, now, roll), newWords(cards, data, known, left), "quiz");
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
        {total === 0 ? <T size={16} color={C.muted} style={{ textAlign: "center" }}>{t.session.nothing}</T> : null}
        <Primary label={t.session.back} onPress={leave} style={{ alignSelf: "stretch", marginTop: 12 }} />
      </Screen>
    );
  }

  const word = wordOf(head.k, data)!;
  const bar = <TopBar onBack={leave} progress={total ? done / total : 0} label={`${done}/${total}`} />;
  if (head.t === "intro") {
    const next = () => { setQ((cur) => afterIntro(cur)); setStep((x) => x + 1); };
    return <Intro key={step} bar={bar} wordK={head.k} onDone={next} />;
  }
  return (
    <Quiz key={step} bar={bar} fresh={!!head.fresh} wordK={head.k} card={cards.get(head.k)}
      onSettle={(grade, ex, ok, answer, ms) => {
        record([{ t: "review", k: head.k, ex: ex.kind, ok, grade, word: word.w, answer, ms, via: "app" }]);
        if (grade > 1) setDone((d) => d + 1);
        setQ((cur) => afterAnswer(cur, grade === 1));
        setStep((x) => x + 1);
      }} />
  );
}

function WordCard({ w, label }: { w: string; label?: string }) {
  const word = data.word(w)!;
  return (
    <Card style={{ gap: 6 }}>
      {label ? <T size={13} color={C.muted}>{label}</T> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <J size={34}>{word.w}</J>
        <J size={20} color={C.highlight}>{word.r}</J>
        <SpeakButton text={word.r} word={word} size={36} />
        {word.j ? <T size={13} color={C.faint}>N{word.j}</T> : null}
      </View>
      <T size={16} color={C.muted}>{word.g}</T>
      {/* each kanji with its reading in this word: why the word reads the way it does */}
      {word.f?.length ? (
        <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
          {word.f.map(([a, b, r]) => (
            <Pressable key={a} accessibilityRole="button" onPress={() => router.push(`/kanji/${encodeURIComponent([...word.w][a]!)}`)}>
              <T size={15} color={C.muted}><J size={18}>{[...word.w].slice(a, b).join("")}</J> {r}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Intro({ bar, wordK, onDone }: { bar: React.ReactNode; wordK: string; onDone: () => void }) {
  const word = wordOf(wordK, data)!;
  const { meta } = useApp();
  const voice = useJapaneseVoice();
  useEffect(() => { if ((voice || hasRecording(word)) && meta.settings.autoSpeak) speakWord(word); }, [voice]); // eslint-disable-line react-hooks/exhaustive-deps
  useKeys((key, e) => { if (key === "Enter" || key === " ") { e.preventDefault(); onDone(); } else if (key === "Escape") leave(); });
  return (
    <Screen>
      {bar}
      <Card navy style={{ alignItems: "center", gap: 8, paddingVertical: 32 }}>
        <T size={15} color={C.onNavyMuted}>{t.vocab.newWord}</T>
        <J size={72} style={{ lineHeight: 96 }}>{word.w}</J>
        <J size={26} color={C.highlight}>{word.r}</J>
        <T size={18} color={C.onNavy} style={{ textAlign: "center" }}>{word.g}</T>
      </Card>
      <WordCard w={word.w} />
      <Primary label={t.session.gotIt} onPress={onDone} />
    </Screen>
  );
}

function Quiz({ bar, fresh, wordK, card, onSettle }: {
  bar: React.ReactNode; fresh: boolean; wordK: string; card?: CardState;
  onSettle: (grade: Grade, ex: WordExercise, ok: boolean, answer: string | undefined, ms: number) => void;
}) {
  const word = wordOf(wordK, data)!;
  const { meta } = useApp();
  const ex = useMemo(() => makeWordExercise(word, card, data, Math.random, { audio: hasVoice() || hasRecording(word) }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ex.kind === "word-listen") speakWord(word); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const start = useRef(Date.now()).current;
  const [res, setRes] = useState<{ ok: boolean; answer: string; at: number; alt?: boolean } | null>(null);
  const [typed, setTyped] = useState("");
  const pv = useMemo(() => preview(card, Date.now()), [card]);
  const right = useMemo(() => t.session.right[Math.floor(Math.random() * t.session.right.length)]!, []);

  const go = (g: Grade, ok = res?.ok ?? false) => onSettle(g, ex, ok, res?.answer, (res?.at ?? Date.now()) - start);
  useEffect(() => { if (res && meta.settings.autoSpeak && ex.kind !== "word-listen") speakWord(word); }, [res !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (o: { label: string; ok: boolean }) => { if (!res) setRes({ ok: o.ok, answer: o.label, at: Date.now() }); };
  const submit = () => {
    if (res || !typed.trim() || ex.kind !== "word-type") return;
    const v = judgeTyped(typed, word);
    setRes({ ok: v.ok, answer: v.got, at: Date.now(), alt: v.how === "alternative" });
  };
  useKeys((k, e) => {
    if (k === "Escape") return leave();
    if (!res) { if ("options" in ex && "1234".includes(k) && ex.options[Number(k) - 1]) choose(ex.options[Number(k) - 1]!); return; }
    if (Date.now() - res.at < 350) return;
    if (k === "Enter" || k === " ") { e.preventDefault(); go(res.ok ? 3 : 1); }
    else if (res.ok && k === "1") go(2);
    else if (res.ok && k === "3") go(4);
  });

  const why = useMemo((): { e?: Explanation | null; text?: string } | null => {
    if (!res || res.ok) return null;
    if (ex.kind === "word-read" || ex.kind === "word-type") return { e: explainReading(res.answer, word, data) };
    if (ex.kind === "word-spell") {
      const a = [...res.answer], b = [...word.w];
      const i = a.findIndex((c, j) => c !== b[j]);
      return { e: i >= 0 ? explainKanjiChoice(a[i]!, b[i]!, data) : null, text: t.vocab.spelled(word.w, word.r) };
    }
    return { text: t.vocab.means(word.w, word.g) };
  }, [res, ex, word]);

  const label = { "word-meaning": t.vocab.meaningLabel, "word-read": t.vocab.readLabel, "word-type": t.vocab.typeLabel, "word-spell": t.vocab.spellLabel, "word-listen": t.audio.listenLabel }[ex.kind];
  const q = { "word-meaning": t.vocab.meaningQ, "word-read": t.vocab.readQ, "word-type": t.vocab.typeQ, "word-spell": t.vocab.spellQ, "word-listen": t.audio.listenQ }[ex.kind];

  return (
    <Screen>
      {bar}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.ink, justifyContent: "center" }}><T v="bold" size={14} color={C.bg}>{label}</T></View>
        <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: C.outline, justifyContent: "center" }}><T size={14} color="#D7DAE2">{fresh ? t.session.newTest : t.session.review}</T></View>
      </View>

      <Card navy style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
        <T size={15} color={C.onNavyMuted}>{q}</T>
        {ex.kind === "word-listen" ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t.audio.again} onPress={() => speakWord(word)}
            style={({ pressed }) => ({ width: 120, height: 120, borderRadius: 60, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}>
            <T v="black" size={44}>▶</T>
          </Pressable>
        ) : ex.kind === "word-spell" ? (
          <>
            <J size={40} color={C.highlight}>{word.r}</J>
            <T size={18} color={C.onNavy} style={{ textAlign: "center" }}>{word.g}</T>
          </>
        ) : (
          <>
            <J size={word.w.length > 3 ? 56 : 72} style={{ lineHeight: 96 }}>{word.w}</J>
            {ex.kind !== "word-meaning" ? <T size={17} color={C.onNavy} style={{ textAlign: "center" }}>{word.g}</T> : null}
          </>
        )}
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
                {ex.kind === "word-meaning" ? <T size={17} style={{ flex: 1 }}>{o.label}</T> : <J size={ex.kind === "word-spell" || ex.kind === "word-listen" ? 32 : 26}>{o.label}</J>}
              </Pressable>
            );
          })}
        </Group>
      ) : (
        <View style={{ gap: 8 }}>
          <TextInput value={typed} onChangeText={setTyped} onSubmitEditing={submit} editable={!res} autoFocus autoCapitalize="none"
            autoCorrect={false} spellCheck={false} placeholder={t.session.typePlaceholder} placeholderTextColor={C.faint} accessibilityLabel={q}
            style={{ minHeight: 56, borderRadius: R.small, borderWidth: 2, borderColor: res ? (res.ok ? C.electric : C.wrong) : C.outline, backgroundColor: C.bg, color: C.ink, paddingHorizontal: 16, fontSize: 20 }} />
          {/[a-z]/i.test(typed) ? <J size={22} color={C.highlight}>{toKana(typed)}</J> : null}
          {!res ? <Primary label={t.session.check} onPress={submit} /> : null}
        </View>
      )}

      {res ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12, flexWrap: "wrap" }} accessibilityLiveRegion="polite">
            <T v="black" size={34} color={res.ok ? C.highlight : C.wrong}>{res.ok ? right : t.session.wrong}</T>
            {res.ok ? <T size={17} color="#D7DAE2">{t.session.rightSuffix}</T> : <T size={17} color="#D7DAE2">{t.session.correctIs} <J size={22}>{ex.kind === "word-read" || ex.kind === "word-type" ? word.r : word.w}</J></T>}
          </View>
          {res.alt ? <T size={15} color={C.muted}>{t.session.alsoRight(word.r)}</T> : null}
          {why ? <Explain e={why.e} text={why.text} word={word} /> : null}
          <WordCard w={word.w} />
          {res.ok ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Ghost label={t.session.guessed} sub={t.intervals(pv[2])} onPress={() => go(2)} style={{ flex: 1 }} />
              <Primary label={t.session.next} sub={t.intervals(pv[3])} onPress={() => go(3)} style={{ flex: 1.3 }} />
              <Ghost label={t.session.tooEasy} sub={t.intervals(pv[4])} onPress={() => go(4)} style={{ flex: 1 }} />
            </View>
          ) : <Primary label={`${t.session.next} · ${t.session.comesBack}`} onPress={() => go(1)} />}
          {!res.ok && ex.kind === "word-type" ? <LinkButton label={t.session.alsoValid} onPress={() => go(3, true)} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
