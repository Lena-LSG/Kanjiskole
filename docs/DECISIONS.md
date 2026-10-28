# Decisions

Changes to the handover (`HANDOVER.md`) and why. Newest first.

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

**Design:** SAS's app as the reference (her pick): calm navy, white cards, big type, one clear "next thing" card on
the home screen (their upcoming-flight card is our "N kanji venter"), a bottom tab bar, generous spacing. The
handover's tokens stay; 藍 indigo already sits close to SAS navy.

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
