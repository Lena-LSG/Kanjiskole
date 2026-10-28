// On the web the fonts come from Google Fonts, which subsets CJK by unicode-range: a few hundred KB instead of
// the 15 MB file the APK bundles. (Allowed by the handover, §10.)
import { useEffect } from "react";

const HREF =
  "https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500&family=Zen+Kaku+Gothic+New:wght@400;700;900&display=swap";

export const FAMILIES = {
  k: { fontFamily: "'Shippori Mincho B1', 'Hiragino Mincho ProN', 'Yu Mincho', serif", fontWeight: "500" },
  ui: { fontFamily: "'Zen Kaku Gothic New', system-ui, sans-serif", fontWeight: "400" },
  uiBold: { fontFamily: "'Zen Kaku Gothic New', system-ui, sans-serif", fontWeight: "700" },
  uiBlack: { fontFamily: "'Zen Kaku Gothic New', system-ui, sans-serif", fontWeight: "900" },
} as const;

export function useAppFonts(): boolean {
  useEffect(() => {
    if (document.querySelector(`link[href="${HREF}"]`)) return;
    for (const origin of ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]) {
      const pre = document.createElement("link");
      pre.rel = "preconnect";
      pre.href = origin;
      if (origin.includes("gstatic")) pre.crossOrigin = "anonymous";
      document.head.appendChild(pre);
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = HREF;
    document.head.appendChild(link);
  }, []);
  return true; // display=swap: render now, swap the font in when it arrives
}
