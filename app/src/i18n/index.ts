// The active dictionary. `t` is one object whose contents are swapped by setLang, so modules can import it once;
// the root layout remounts the screens when the language changes.
import { Platform } from "react-native";
import { da, type Strings } from "./da";
import { en } from "./en";

export type Lang = "da" | "en";
export const LANGS: Lang[] = ["da", "en"];

export const t: Strings = { ...da };

let current: Lang = "da";
export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  Object.assign(t, lang === "en" ? en : da);
  if (Platform.OS === "web") document.documentElement.lang = lang;
}
