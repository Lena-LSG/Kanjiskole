// A progress ring (accuracy on the home screen).
import Svg, { Circle } from "react-native-svg";
import { C } from "@/theme";

export function Ring({ value, size = 64 }: { value: number; size?: number }) {
  const r = size / 2 - 5;
  const len = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.line} strokeWidth={6} />
      {value > 0 ? <Circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.electric} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={`${len * Math.max(0, Math.min(1, value))} ${len}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
      /> : null}
    </Svg>
  );
}
