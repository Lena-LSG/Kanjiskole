// Word detail: the word with furigana, its sound, meaning, where it stands, and the kanji it's built from.
import { isLeech, isStarted, missingKanji, stage, isKanji, wordKey, wordStatus, type Word } from "@kanjiskole/core";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { SpeakButton } from "@/components/SpeakButton";
import { Screen } from "@/components/Screen";
import { StageDot } from "@/components/Track";
import { Card, Circle, Group, J, T } from "@/components/ui";
import { t } from "@/i18n";
import { useKnown } from "@/lib/known";
import { useKeys } from "@/lib/useKeys";
import { data, useApp, useNow } from "@/state/AppState";
import { C } from "@/theme";

const leave = () => (router.canGoBack() ? router.back() : router.replace("/words"));

/** The spelling with each furigana segment set above its characters. */
function Ruby({ w, size }: { w: Word; size: number }) {
  const chars = [...w.w];
  if (!w.f?.length) return <J size={size} style={{ lineHeight: size * 1.2 }}>{w.w}</J>;
  const parts: { text: string; ruby?: string }[] = [];
  let i = 0;
  for (const [a, b, r] of [...w.f].sort((x, y) => x[0] - y[0])) {
    if (a > i) parts.push({ text: chars.slice(i, a).join("") });
    parts.push({ text: chars.slice(a, b).join(""), ruby: r });
    i = b;
  }
  if (i < chars.length) parts.push({ text: chars.slice(i).join("") });
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", justifyContent: "center" }} accessible accessibilityLabel={`${w.w}, ${w.r}`}>
      {parts.map((p, j) => (
        <View key={j} style={{ alignItems: "center" }}>
          <J size={Math.round(size * 0.3)} color={C.highlight} style={{ lineHeight: Math.round(size * 0.4) }}>{p.ruby ?? " "}</J>
          <J size={size} style={{ lineHeight: size * 1.2 }}>{p.text}</J>
        </View>
      ))}
    </View>
  );
}

export default function WordDetail() {
  const { w: raw } = useLocalSearchParams<{ w: string }>();
  // From a URL: expo-router has usually decoded it already, and a stray "%" must not throw.
  const spelling = (() => { try { return decodeURIComponent(raw ?? ""); } catch { return raw ?? ""; } })();
  const word = data.word(spelling);
  const { cards } = useApp();
  const now = useNow();
  const known = useKnown(cards);
  useKeys((k) => { if (k === "Escape") leave(); });
  if (!word) return <Screen><Circle label={t.session.back} onPress={leave}><T size={22}>‹</T></Circle><T>?</T></Screen>;

  const card = cards.get(wordKey(word));
  const status = wordStatus(word, cards, known);
  const st = stage(card);
  const missing = missingKanji(word, known);
  const nextDays = card && isStarted(card) ? Math.ceil((card.fsrs.due.getTime() - now) / 864e5) : null;
  const kanji = [...new Set([...word.w].filter(isKanji))].map((c) => data.get(c)).filter((k) => !!k);
  const other = word.rs.filter((r) => r !== word.r);

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Circle label={t.session.back} onPress={leave}><T size={22}>‹</T></Circle>
        <T v="bold" size={17}>{[word.j ? `N${word.j}` : null, t.vocab.status[status]].filter(Boolean).join(" · ")}</T>
        <View style={{ width: 48 }} />
      </View>

      <Card navy style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
        <Ruby w={word} size={64} />
        {!word.f?.length ? <J size={22} color={C.highlight}>{word.r}</J> : null}
        <SpeakButton text={word.r} word={word} size={48} onNavy />
      </Card>

      <View style={{ gap: 6 }}>
        <T v="black" size={26} accessibilityRole="header" style={{ lineHeight: 32 }}>{word.g}</T>
        {other.length ? <T size={15} color={C.muted}>{t.vocab.alsoRead}: <J size={16} color={C.highlight}>{other.join("・")}</J></T> : null}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          [t.kanji.stage, status === "locked" ? t.vocab.status.locked! : t.kanji.stages[st], C.ink],
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
      {missing.length ? <T size={15} color={C.highlight} style={{ lineHeight: 22 }}>{t.vocab.lockedBy}<J size={17} color={C.highlight}>{missing.join("、")}</J></T> : null}

      <T v="bold" size={20} style={{ marginTop: 4 }}>{t.vocab.kanjiIn}</T>
      <Group>
        {kanji.map((k, i) => {
          const kst = stage(cards.get(k.k));
          const learned = known.has(k.k);
          return (
            <Pressable key={k.k} accessibilityRole="button" accessibilityLabel={`${k.k}, ${k.m[0] ?? ""}, ${learned ? t.kanji.stages[kst] : t.vocab.notLearned}`}
              onPress={() => router.push(`/kanji/${encodeURIComponent(k.k)}`)}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < kanji.length - 1 ? 1 : 0, borderBottomColor: C.line, opacity: pressed ? 0.7 : 1 })}>
              <J size={34} style={{ width: 44, lineHeight: 44 }}>{k.k}</J>
              <View style={{ flex: 1 }}>
                <T size={16} numberOfLines={1}>{k.m.slice(0, 3).join(", ")}</T>
                <J size={14} color={C.highlight} numberOfLines={1}>{[...k.on.slice(0, 2), ...k.kun.slice(0, 2).map((r) => r.replace(".", ""))].join("・")}</J>
              </View>
              {learned ? <StageDot st={kst} /> : <T size={13} color={C.faint}>{t.vocab.notLearned}</T>}
              <T size={20} color={C.muted} accessibilityElementsHidden importantForAccessibility="no">›</T>
            </Pressable>
          );
        })}
      </Group>
    </Screen>
  );
}
