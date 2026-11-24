// Hvorfor?: what kind of slip it was (when one matches), and always why the right answer is right.
import { readingBreakdown, type Explanation, type Word } from "@kanjiskole/core";
import { View } from "react-native";
import { t } from "@/i18n";
import { data } from "@/state/AppState";
import { C } from "@/theme";
import { Card, J, Mixed, T } from "./ui";

const meaning = (k: string) => data.get(k)?.m.slice(0, 2).join(", ") ?? "";

export function Explain({ e, word, text }: { e?: Explanation | null; word?: Word; text?: string }) {
  const slip = e ? t.explain(e, meaning) : null;
  const parts = word ? readingBreakdown(word, data) : [];
  const notes = parts.flatMap((p) =>
    p.kind === "rendaku" ? [t.part.rendaku(p.text, p.base!, p.reading)]
    : p.kind === "sokuon" ? [t.part.sokuon(p.text, p.base!, p.reading)]
    : p.kind === "whole" ? [t.part.whole(p.text, p.reading)]
    : p.kind === "irregular" ? [t.part.irregular(p.text, p.reading)]
    : []);
  if (!slip && !text && !parts.length) return null;
  return (
    <Card navy style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="bold" size={14} color={C.onNavyMuted} style={{ letterSpacing: 0.5 }}>{t.why.toUpperCase()}</T>
        {slip ? <T size={13} color={C.onNavyMuted}>{slip.tag}</T> : null}
      </View>
      {slip ? <Mixed text={slip.text} size={17} style={{ lineHeight: 26 }} /> : null}
      {text ? <Mixed text={text} size={17} style={{ lineHeight: 26 }} /> : null}
      {parts.length ? (
        <View style={{ gap: 6, marginTop: slip || text ? 4 : 0 }}>
          <T size={13} color={C.onNavyMuted}>{t.howRead}</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }} accessible accessibilityLabel={parts.map((p) => `${p.text} ${p.reading}`).join(", ")}>
            {parts.map((p, i) => (
              <View key={i} style={{ alignItems: "center" }}>
                <J size={15} color={p.kind === "plain" || p.kind === "kana" ? C.onNavy : C.highlight}>{p.reading}</J>
                <J size={28} style={{ lineHeight: 36 }}>{p.text}</J>
              </View>
            ))}
          </View>
          {notes.map((n, i) => <Mixed key={i} text={n} size={15} color={C.onNavy} style={{ lineHeight: 22 }} />)}
        </View>
      ) : null}
    </Card>
  );
}
