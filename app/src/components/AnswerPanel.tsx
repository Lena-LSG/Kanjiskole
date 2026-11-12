// The full kanji panel shown after an answer and on intro cards.
import type { Kanji, Word } from "@kanjiskole/core";
import { View } from "react-native";
import { t } from "@/i18n";
import { data } from "@/state/AppState";
import { C } from "@/theme";
import { SpeakButton } from "./SpeakButton";
import { Card, J, KanjiSquare, T } from "./ui";

export function Kun({ s }: { s: string }) {
  const [stem, okuri] = s.split(".");
  return <J size={20}>{stem}{okuri ? <J size={20} color={C.faint}>{okuri}</J> : null}</J>;
}

export function Marked({ word, k, size, color = C.highlight }: { word: string; k: string; size: number; color?: string }) {
  return <J size={size}>{[...word].map((ch, i) => (ch === k ? <J key={i} size={size} color={color}>{ch}</J> : ch))}</J>;
}

export function AnswerPanel({ kanji, focus, max = 4 }: { kanji: Kanji; focus?: Word; max?: number }) {
  const words = data.wordsOf(kanji);
  const list = (focus ? [focus, ...words.filter((w) => w !== focus)] : words).slice(0, max);
  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
        <KanjiSquare k={kanji.k} size={104} />
        <View style={{ flex: 1, gap: 6 }}>
          <T v="bold" size={22}>{kanji.m.slice(0, 3).join(", ")}</T>
          {kanji.on.length ? <T size={15} color={C.muted}>On <J size={17}>{kanji.on.slice(0, 4).join("・")}</J></T> : null}
          {kanji.kun.length ? (
            <T size={15} color={C.muted}>
              Kun {kanji.kun.slice(0, 4).map((k, i) => <T key={k} size={15}>{i ? "・" : ""}<Kun s={k} /></T>)}
            </T>
          ) : null}
          <T size={13} color={C.muted}>
            {[t.panel.strokes(kanji.s), kanji.j ? `N${kanji.j}` : null, t.panel.freq(kanji.i)].filter(Boolean).join(" · ")}
          </T>
        </View>
      </View>
      <View>
        {list.map((w) => (
          <View key={w.w} style={{ flexDirection: "row", alignItems: "baseline", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line }}>
            <Marked word={w.w} k={kanji.k} size={22} color={C.ink} />
            <J size={16} color={C.highlight}>{w.r}</J>
            <T size={14} color={C.muted} style={{ flex: 1 }} numberOfLines={2}>{w.g}</T>
            <SpeakButton text={w.r} word={w} size={32} />
          </View>
        ))}
      </View>
      {kanji.c.length ? <T size={13} color={C.muted}>{t.panel.parts}: <J size={15}>{kanji.c.join(" + ")}</J></T> : null}
    </Card>
  );
}
