// Lyntest: 60 seconds of multiple choice. Misses on known kanji are pulled into today's reviews.
import {
  BLITZ_MS, blitzPool, blitzVerdict, drawFrom, isStarted, makeExercise, planFor, scoreAnswer,
  type BlitzScore, type CardState, type Exercise, type Option,
} from "@kanjiskole/core";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Marked } from "@/components/AnswerPanel";
import { Screen } from "@/components/Screen";
import { Card, Ghost, Group, J, KanjiSquare, LinkButton, Primary, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKnown } from "@/lib/known";
import { useKeys } from "@/lib/useKeys";
import { data, useApp } from "@/state/AppState";
import { C } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

type Phase = "intro" | "run" | "end";

export default function Blitz() {
  const { cards, meta, setMeta, record } = useApp();
  const [phase, setPhase] = useState<Phase>("intro");
  const [score, setScore] = useState<BlitzScore>({ score: 0, streak: 0 });
  const [misses, setMisses] = useState<string[]>([]);
  const [run, setRun] = useState(0);
  const bestBefore = useRef(meta.blitzBest);
  const mine = useMemo(() => [...cards.values()].filter(isStarted).length >= 20, [cards]);

  const start = () => {
    bestBefore.current = meta.blitzBest;
    setScore({ score: 0, streak: 0 });
    setMisses([]);
    setRun((r) => r + 1);
    setPhase("run");
  };

  const end = (final: BlitzScore, missed: string[]) => {
    setPhase("end");
    if (final.score > meta.blitzBest) setMeta("blitzBest", final.score);
    setMeta("blitzRuns", [...meta.blitzRuns, { at: Date.now(), score: final.score, misses: missed }].slice(-200));
  };

  const miss = (k: string) => {
    setMisses((m) => (m.includes(k) ? m : [...m, k]));
    if (isStarted(cards.get(k))) record([{ t: "blitz-miss", k }]);
  };

  if (phase === "intro") return <Intro mine={mine} best={meta.blitzBest} onStart={start} />;
  if (phase === "end") return <End score={score.score} best={bestBefore.current} misses={misses} cards={cards} onAgain={start} />;
  return <Run key={run} cards={cards} best={meta.blitzBest} score={score} setScore={setScore} onMiss={miss} onEnd={end} misses={misses} />;
}

function Intro({ mine, best, onStart }: { mine: boolean; best: number; onStart: () => void }) {
  useKeys((k, e) => { if (k === "Enter" || k === " ") { e.preventDefault(); onStart(); } else if (k === "Escape") leave(); });
  return (
    <Screen style={{ flex: 1, justifyContent: "center" }}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <J size={120} style={{ lineHeight: 140 }}>速</J>
        <T v="black" size={34}>{t.blitz.title}</T>
      </View>
      <T size={16} color={C.muted} style={{ textAlign: "center", lineHeight: 24 }}>{t.blitz.intro} {mine ? t.blitz.mine : t.blitz.top}</T>
      <T v="bold" size={16} style={{ textAlign: "center" }}>{t.blitz.best(best)}</T>
      <Primary label={t.blitz.start} onPress={onStart} />
      <LinkButton label={t.session.back} onPress={leave} />
    </Screen>
  );
}

function Run({ cards, best, score, setScore, onMiss, onEnd, misses }: {
  cards: ReadonlyMap<string, CardState>; best: number; score: BlitzScore; misses: string[];
  setScore: (s: BlitzScore) => void; onMiss: (k: string) => void; onEnd: (s: BlitzScore, misses: string[]) => void;
}) {
  const pool = useMemo(() => blitzPool(cards as Map<string, CardState>, data), []); // eslint-disable-line react-hooks/exhaustive-deps
  const known = useKnown(cards);
  const endAt = useRef(Date.now() + BLITZ_MS).current;
  const last = useRef<string | undefined>(undefined); // before the first next(), which reads it
  const [left, setLeft] = useState(BLITZ_MS);
  const [ex, setEx] = useState<Exercise>(() => next());
  const [picked, setPicked] = useState<Option | null>(null);
  const scoreRef = useRef(score);
  const missRef = useRef(misses);
  scoreRef.current = score;
  missRef.current = misses;

  function next(): Exercise {
    const k = drawFrom(pool, Math.random, last.current);
    last.current = k;
    const kanji = data.get(k)!;
    return makeExercise(kanji, data, Math.random, { ...planFor(kanji, cards.get(k), data, known), noType: true });
  }

  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, endAt - Date.now());
      setLeft(l);
      if (l === 0) { clearInterval(id); onEnd(scoreRef.current, missRef.current); }
    }, 100);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (o: Option) => {
    if (picked || left === 0) return;
    setPicked(o);
    const s = scoreAnswer(scoreRef.current, o.ok);
    setScore(s);
    scoreRef.current = s;
    if (!o.ok) { onMiss(ex.k.k); if (!missRef.current.includes(ex.k.k)) missRef.current = [...missRef.current, ex.k.k]; }
    setTimeout(() => { setPicked(null); setEx(next()); }, o.ok ? 260 : 900);
  };

  useKeys((k) => {
    if (k === "Escape") return leave();
    if ("options" in ex && "1234".includes(k)) { const o = ex.options[Number(k) - 1]; if (o) choose(o); }
  });

  if (!("options" in ex)) return null;
  const frac = left / BLITZ_MS;
  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <T size={16}><T v="black" size={30}>{score.score}</T> {t.blitz.points}</T>
        {score.streak >= 3
          ? <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, backgroundColor: C.accent }}><T v="bold" size={14}>{t.blitz.inARow(score.streak)}</T></View>
          : <T size={14} color={C.muted}>{best ? `${t.blitz.record} ${best}` : ""}</T>}
        <T v="bold" size={16} color={left < 10_000 ? C.wrong : C.ink}>{Math.ceil(left / 1000)} s</T>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.track, overflow: "hidden" }}>
        <View style={{ width: `${frac * 100}%`, height: 6, borderRadius: 3, backgroundColor: left < 10_000 ? C.wrong : C.electric }} />
      </View>
      <Card navy style={{ alignItems: "center", gap: 10, paddingVertical: 22 }}>
        {ex.kind === "mean" ? <KanjiSquare k={ex.k.k} size={130} /> : null}
        {ex.kind === "which" ? <T v="black" size={28} style={{ textAlign: "center" }}>{ex.meaning}</T> : null}
        {ex.kind === "read" ? <><Marked word={ex.word.w} k={ex.k.k} size={64} />{ex.word.g ? <T size={15} color={C.onNavy}>{ex.word.g}</T> : null}</> : null}
        {ex.kind === "fill" ? <><J size={56}>{[...ex.word.w].map((ch, i) => (ch === ex.k.k ? <J key={i} size={56} color={C.highlight}>□</J> : ch))}</J><T size={15} color={C.onNavy}><J size={17} color={C.highlight}>{ex.word.r}</J>{ex.word.g ? ` · ${ex.word.g}` : ""}</T></> : null}
      </Card>
      <Group>
        {ex.options.map((o, i) => {
          const isRight = !!picked && o.ok, isWrong = picked === o && !o.ok;
          return (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              onPress={() => choose(o)}
              style={{ minHeight: 62, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: C.line, backgroundColor: isRight ? "#141A55" : isWrong ? "#3A1A14" : "transparent" }}
            >
              <T size={15} color={C.muted} style={{ width: 20 }}>{i + 1}</T>
              {ex.kind === "mean" ? <T size={17} style={{ flex: 1 }}>{o.label}</T> : <J size={ex.kind === "read" ? 24 : 32}>{o.label}</J>}
            </Pressable>
          );
        })}
      </Group>
    </Screen>
  );
}

function End({ score, best, misses, cards, onAgain }: { score: number; best: number; misses: string[]; cards: ReadonlyMap<string, CardState>; onAgain: () => void }) {
  const v = blitzVerdict(score, best);
  const [line, sub] = score === 0 ? t.blitz.zero
    : v === "record" ? t.blitz.newRecord : v === "close" ? t.blitz.close(best - score) : t.blitz.off(best - score);
  const anyKnown = misses.some((k) => isStarted(cards.get(k)));
  useKeys((k) => { if (k === "Enter") onAgain(); else if (k === "Escape") leave(); });
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 440, backgroundColor: C.navy, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: -60, top: 230, width: 700, height: 420, borderRadius: 140, backgroundColor: C.swoosh, transform: [{ rotate: "-18deg" }] }} />
      </View>
      <Screen transparent>
        <T size={15} color={C.onNavy}>{t.blitz.sub}</T>
        <T v="black" size={120} style={{ marginTop: 40, lineHeight: 120, letterSpacing: -2 }} accessibilityRole="header">{score}</T>
        <T v="bold" size={26}>{line}</T>
        <T size={17} color={C.onNavy}>{sub}</T>
        {misses.length ? (
          <>
            <View style={{ marginTop: 36, flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
              <T v="bold" size={18}>{t.blitz.misses(misses.length)}</T>
              {anyKnown ? <T size={13} color={C.muted}>{t.blitz.missesNote}</T> : null}
            </View>
            <Group>
              {misses.map((k, i) => {
                const r = data.get(k)!;
                const w = data.wordsOf(r)[0];
                return (
                  <Pressable key={k} accessibilityRole="button" onPress={() => router.push(`/kanji/${encodeURIComponent(k)}`)} style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < misses.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
                    <J size={34} style={{ width: 40 }}>{k}</J>
                    <View style={{ flex: 1 }}>
                      <T size={16}>{r.m.slice(0, 2).join(", ")}</T>
                      {w ? <J size={15} color={C.highlight}>{w.w} {w.r}</J> : null}
                    </View>
                  </Pressable>
                );
              })}
            </Group>
          </>
        ) : null}
        <View style={{ marginTop: "auto", flexDirection: "row", gap: 12, paddingTop: 16 }}>
          <Primary label={t.blitz.again} onPress={onAgain} style={{ flex: 1 }} />
          <Ghost label={t.blitz.home} onPress={() => router.replace("/")} style={{ flex: 1 }} />
        </View>
      </Screen>
    </View>
  );
}
