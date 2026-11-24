// The bar above a session: back, progress, and a count.
import { View } from "react-native";
import { C } from "@/theme";
import { t } from "@/i18n";
import { Circle, T } from "./ui";

export function TopBar({ onBack, progress, label, backLabel = t.session.pause }: { onBack: () => void; progress?: number; label?: string; backLabel?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <Circle label={backLabel} onPress={onBack}><T size={22}>‹</T></Circle>
      {progress !== undefined ? (
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.track, overflow: "hidden" }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: 6, backgroundColor: C.electric, borderRadius: 3 }} />
        </View>
      ) : <View style={{ flex: 1 }} />}
      {label ? <T size={15} color={C.muted}>{label}</T> : null}
    </View>
  );
}
