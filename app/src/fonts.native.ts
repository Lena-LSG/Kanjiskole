// Fonts are bundled in the APK: no network, no tracker. Only the weights we use, required directly so Metro
// doesn't pull every weight of a 15 MB-per-weight CJK family into the build.
import { useFonts } from "expo-font";

export const FAMILIES = {
  k: { fontFamily: "ShipporiMinchoB1_500Medium" },
  ui: { fontFamily: "ZenKakuGothicNew_400Regular" },
  uiBold: { fontFamily: "ZenKakuGothicNew_700Bold" },
  uiBlack: { fontFamily: "ZenKakuGothicNew_900Black" },
} as const;

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    ShipporiMinchoB1_500Medium: require("@expo-google-fonts/shippori-mincho-b1/500Medium/ShipporiMinchoB1_500Medium.ttf"),
    ZenKakuGothicNew_400Regular: require("@expo-google-fonts/zen-kaku-gothic-new/400Regular/ZenKakuGothicNew_400Regular.ttf"),
    ZenKakuGothicNew_700Bold: require("@expo-google-fonts/zen-kaku-gothic-new/700Bold/ZenKakuGothicNew_700Bold.ttf"),
    ZenKakuGothicNew_900Black: require("@expo-google-fonts/zen-kaku-gothic-new/900Black/ZenKakuGothicNew_900Black.ttf"),
  });
  return loaded || !!error; // on a font error, render with system fonts rather than not at all
}
