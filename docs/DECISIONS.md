# Decisions

Changes to the handover (`HANDOVER.md`) and why. Newest first.

## 2026-10-28: design signed off

Mockups: https://claude.ai/artifact/LqXRxCWaasWmARK7P4mvpe (Hjem, Quiz, Svar + Hvorfor?, Kanji-detalje, Lyntest,
Kalibrering). **Dark only, no light mode.** These tokens replace the handover's §11 colours; fonts stay
(Shippori Mincho B1 for Japanese, Zen Kaku Gothic New for the UI).

| Token | Hex | Use |
|---|---|---|
| `bg` | `#000000` | ground |
| `surface` | `#17181C` | cards, list groups |
| `line` | `#2A2C33` | borders, dividers |
| `outline` | `#4A4D57` | outlined pills, kanji square |
| `ink` | `#FFFFFF` | text |
| `muted` | `#B4B8C4` | secondary text |
| `faint` | `#8E929E` | hints, key help |
| `navy` | `#0A0B5C` | hero, prompt and Hvorfor? cards, the "Nye" half |
| `swoosh` | `#2B1FD6` | the diagonal shape on hero areas |
| `accent` | `#3B30F0` | primary buttons, Lyntest tab; white text on it |
| `electric` | `#4A5CFF` | progress, rings, young cards |
| `highlight` | `#7C95FF` | target kanji, readings, links |
| `onNavy` | `#E4E6EE` / `#B9BCC8` | text and secondary text on navy |
| `wrong` | `#F07C66` | 朱: wrong and Again, nothing else |
| map | `#FFFFFF` mature, `#4A5CFF` young, `#241E8A` learning, `#26282F` unseen | progress map |

Layout cues from SAS: big black-weight headlines and numbers, a white pill CTA on the hero, the split card
(Repetition | Nye), stat tiles (label top left, chevron top right, number bottom left), grouped list rows, a floating
pill tab bar (家 Hjem, 字 Kanji, 統 Statistik) with a separate accent button (速 Lyntest).

## 2026-10-28: after the first review with Lena

**No in-app AI.** The app never calls the Claude API. Claude's part is the MCP server: Claude, in the Claude app,
reads her progress and works with her in chat. That drops §8's Edge Function → Claude path, `ai_cache`, `ai_usage`
and the budget kill-switch. What it replaces:
- *Hvorfor?* is deterministic: `core/explain.ts` classifies a wrong answer (rendaku, long vowel, っ, another reading
  of the same kanji, a look-alike kanji) and the app phrases it in Danish.
- *Lenient typed judging* is deterministic: any JMdict reading of the spelling is accepted (日本 にっぽん), and the
  "my answer was also valid" button stays.
- *Mnemonics* are hers to write in the app; later Claude can save one through the MCP server.

**MCP server read-only first**, then writes (`record_review`, `add_to_queue`, `save_mnemonic`) once it has proved
itself. `record_review` goes through `core/` like the app does.

**Progress is an event log.** `review_logs` (and calibrate, import, blitz-miss, queue events) are append-only with
client-generated ids; card state comes from replaying them (`core/cards.ts`). Sync is a union by id, so an offline
session can't duplicate or conflict, and FSRS weights can be re-optimised from the full history.

**Its own Supabase project**, separate from DANSK. A local backend would work for the app alone, but a remote MCP
connector needs something Claude can reach.

**UI in Danish, built on i18n keys** so English is a later switch, not a rewrite.

**Design:** SAS's app as the reference (her pick); see "design signed off" above.

## Data sources

GitHub release assets and edrdg.org are blocked from the build sandbox, so v1 sources come from npm and raw GitHub,
pinned by hash in `scripts/data/sources.json`. Nothing downloaded is executed (the RADKFILE package's `.js` data file
is parsed as text).

| Need | Source |
|---|---|
| jōyō list, meanings, readings, frequency | kanji-data (KANJIDIC2) |
| every reading of a spelling, furigana alignment, ichi/news/nf priority, JLPT | @furifont/dictionary (JMdict 2026-10-15) |
| English glosses (~23k common words) | kotobako-data (jmdict-simplified 3.6.2) |
| components | KRADFILE (via @johnmorrisdotca/bushu) |
| stroke order | KanjiVG (via kotobako-data) |

- Components are KRADFILE now, not WaniKani's names: the site is public, and glyphs (日 + 寺) suit a reader anyway.
- Look-alikes come from the strokes: each kanji's KanjiVG paths are rasterised, blurred and correlated, then blended
  with component overlap. That's what finds 末/未 and 土/士.
- Accepted typed answers are JMdict readings with real frequency; rare readings seen only inside longer words
  (説明 ときあか, from 説き明かす) are not accepted, but they are never used as distractors either.
- Tatoeba sentences aren't in v1. The i+1 sentence feature they backed is gone with in-app AI; if example
  sentences on the detail view are wanted, Lena fetches the jpn-eng pairs file and the pipeline adds it.
- Known gap: about 30 of the rarest kanji (貞, 璽, 辣…) only have unglossed or rare words. They come last in
  frequency order.
