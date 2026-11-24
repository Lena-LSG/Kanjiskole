// Keyboard shortcuts on the web (1–4, Enter, Space, Esc). No-op on Android.
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

export function useKeys(handler: (key: string, e: KeyboardEvent) => void, active = true) {
  // Always call the latest handler without re-subscribing: updated after each render, never during one.
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => {
    if (Platform.OS !== "web" || !active) return;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
      if (typing && e.key !== "Escape" && e.key !== "Enter") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      ref.current(e.key, e);
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [active]);
}
