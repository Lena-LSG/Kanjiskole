// Design tokens, signed off 2026-10-28 (docs/DECISIONS.md). Dark only.
export const C = {
  bg: "#000000",
  surface: "#17181C",
  line: "#2A2C33",
  outline: "#4A4D57",
  ink: "#FFFFFF",
  muted: "#B4B8C4",
  faint: "#8E929E",
  navy: "#0A0B5C",
  swoosh: "#2B1FD6",
  swooshKanji: "#3A30E0",
  accent: "#3B30F0",
  electric: "#4A5CFF",
  highlight: "#7C95FF",
  onNavy: "#E4E6EE",
  onNavyMuted: "#B9BCC8",
  wrong: "#F07C66",
  track: "#26282F",
  tabBar: "#1C1D22",
  tabActive: "#3A3C44",
  map: { mature: "#FFFFFF", young: "#4A5CFF", learning: "#241E8A", unseen: "#26282F" },
} as const;

export const R = { card: 16, pill: 999, tile: 16, small: 12 } as const;
export const GUTTER = 16;
