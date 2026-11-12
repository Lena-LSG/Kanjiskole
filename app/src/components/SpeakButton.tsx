import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { t } from "@/i18n";
import { say, useJapaneseVoice } from "@/lib/speech";
import { C } from "@/theme";

/** A small speaker button; renders nothing when the device has no Japanese voice. */
export function SpeakButton({ text, size = 40, onNavy }: { text: string; size?: number; onNavy?: boolean }) {
  const voice = useJapaneseVoice();
  if (!voice) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t.audio.play} hitSlop={8} onPress={() => say(text)}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: onNavy ? "#FFFFFF40" : C.outline, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke={C.highlight} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M11 5 6 9H3v6h3l5 4V5z" />
        <Path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
      </Svg>
    </Pressable>
  );
}
