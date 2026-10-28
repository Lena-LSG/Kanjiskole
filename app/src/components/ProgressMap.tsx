// One cell per jōyō kanji, in frequency order, coloured by stage. One SVG, so 2,136 cells stay cheap.
import { stage, type CardState } from "@kanjiskole/core";
import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { t } from "@/i18n";
import { data } from "@/state/AppState";
import { C } from "@/theme";
import { T } from "./ui";

const COLS = 48;
const COLOR = [C.map.unseen, C.map.learning, C.map.young, C.map.mature] as const;

export function ProgressMap({ cards }: { cards: ReadonlyMap<string, CardState> }) {
  const [w, setW] = useState(0);
  const { stages, counts } = useMemo(() => {
    const st = data.kanji.map((k) => stage(cards.get(k.k)));
    const n = [0, 0, 0, 0];
    for (const x of st) n[x]!++;
    return { stages: st, counts: n };
  }, [cards]);
  const cell = w / COLS;
  const rows = Math.ceil(stages.length / COLS);
  return (
    <View style={{ gap: 12 }}>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t.home.mapLabel(counts[3]!, counts[2]!, counts[1]!, counts[0]!)}
      >
        {w > 0 ? (
          <Svg width={w} height={cell * rows}>
            {stages.map((x, i) => (
              <Rect key={i} x={(i % COLS) * cell} y={Math.floor(i / COLS) * cell} width={cell - 1} height={cell - 1} rx={1} fill={COLOR[x]} />
            ))}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
        {([3, 2, 1, 0] as const).map((x) => (
          <View key={x} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COLOR[x] }} />
            <T size={13} color={C.muted}>{[t.home.legend.unseen, t.home.legend.learning, t.home.legend.young, t.home.legend.mature][x]}</T>
          </View>
        ))}
      </View>
    </View>
  );
}
