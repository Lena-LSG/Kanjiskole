# Kanjiskole: handover for Claude Code

> The original brief the app was built from (October 2026), kept as the design rationale. It was written for one
> learner; personal details have since been removed. Where the app later went another way, `DECISIONS.md` says so
> and wins.

A kanji-reading trainer for one learner, built properly: web + Android, synced progress, and Claude built into the learning loop. A working single-file prototype exists in `prototype/`. Treat it as the behavioural spec for v1 and replace it, don't extend it.

## 1. Who it's for

- **User:** one learner whose spoken Japanese is far ahead of their kanji. That gap is the whole point of the app.
- **UI language:** Danish by default, which doubles as Danish practice. Kanji meanings are in English because the source data is. Explanations Claude writes are in Danish, with an English toggle.
- **Devices:** Android is primary, plus the web. Most sessions happen on the phone, often after midnight.
- **Prior art:** the author's earlier app **DANSK**: GitHub Pages + Supabase, SM-2, an Expo Android build via EAS, and quiz, mock-exam, weak-spot and history modes. Reuse what worked there, including auth, Supabase conventions and the EAS setup, and avoid the build pain it went through (Node/Java/Gradle version conflicts, path length, corrupted PNG assets).
- **Suggested home:** a subdomain of the author's site, served by GitHub Pages.

## 2. The goal and the pedagogy

The goal is to **read** Japanese, not to write it by hand. Every design decision follows from that.

1. **Calibrate first.** Don't drill a B2 speaker on 日 and 人. Show batches of 25 kanji in frequency order, and she taps the ones she can read. Those skip the new queue and get scheduled for a **typed-reading check** 3–4 weeks out. Typing is the hardest format, so overclaiming gets caught.
2. **Kanji live in words.** The reading of 生 depends on the word it's in. Prompts show real words (時間, not 時 alone) without furigana.
3. **Recognition over production,** with one exception: typing the reading, because recall is what reading actually requires.
4. **Distractors are realistic mistakes,** not random noise (see §5). A wrong option should be something she might genuinely believe.
5. **Spaced repetition,** with reviews before new cards and new cards woven in rather than stacked at the end.
6. **The day rolls over at 04:00.** Sessions often run past midnight, so a 1am session belongs to "today".
7. **Tone:** dry and a little cheeky, never sycophantic. The blitz end screen in the prototype needles her when she misses her record ("Det var ikke din bedste. Det ved du godt."). Keep that voice.

## 3. What exists (`prototype/`, `data/`)

`prototype/kanjiskole.html` is a self-contained app with about 620 KB of embedded JSON. Open it in a browser to see the intended behaviour. It has:

- **Home:** due, new and answered-today counts; a 2,136-cell progress map (one cell per jōyō kanji, coloured by SRS stage); and settings for new cards per day (5–30) and review style (mixed quiz or flashcards).
- **Calibration:** 25 kanji at a time in a tap grid.
- **Study session:** reviews come as auto-graded quizzes. A new kanji gets an intro card, then a quiz three cards later. Failed items are requeued three positions back.
- **Five exercise types:** meaning, find-the-kanji, build-the-word, reading (multiple choice) and typed reading. Typed answers accept romaji, converted to kana live.
- **After each answer:** the full kanji panel, plus override buttons. On a correct answer: Guessed (Hard), Next (Good), Too easy (Easy). On a wrong typed answer: "my answer was also a valid reading".
- **Blitz:** 60 seconds of multiple choice, with ×2 points after three correct in a row. It's weighted toward weak cards, and misses get pulled into today's reviews. Her personal best is stored.
- **Keyboard:** 1–4, Enter and Esc on desktop.
- **Storage:** progress is a single JSON doc (`cards[k] = [due, interval, ease, reps, lapses, calibrated]`). It's stored in localStorage and in the Claude artifact's private per-user DB.

`data/make_data.py` builds `data/data.json` (2,136 records):

```json
{"k":"時","m":["Time","Hour"],"on":["ジ"],"kun":["とき","-どき"],"s":10,"f":16,"j":5,"g":2,
 "c":["Sun","Temple"],"w":[["時々","ときどき","sometimes"],["時間","じかん","time"]],"i":15}
```

Sources:

| Source | Used for | Licence |
|---|---|---|
| [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data) (KANJIDIC2-derived) | meanings, readings, strokes, grade, JLPT, newspaper frequency | MIT; underlying data CC BY-SA 4.0 (EDRDG) |
| [jamsinclair/open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) | about 7,600 example words with readings and English glosses | MIT |
| `@furifont/dictionary` (npm) | fallback words for rare kanji (JMdict, readings only) | CC BY-SA 4.0 |
| Hand-written overrides | prefecture names (茨城, 栃木, 愛媛…), 朕 | — |

**Known data weaknesses:**
- About 2,100 fallback words have no English gloss.
- The component names (`c`) are WaniKani's. They're fine for personal use, but swap them for KRADFILE/RADKFILE (EDRDG) components if the app is ever made public.
- Words are ranked by JLPT level, not by real word frequency.

**v1 data pipeline (replaces `make_data.py`):**
- Use full **jmdict-simplified** (English, with common-word flags and priority tags like `news1`/`ichi1`) to rank words and supply glosses.
- Add **Tatoeba** example sentences (CC BY 2.0 FR) with their Japanese–English pairs.
- Add **KanjiVG** (CC BY-SA 3.0) for stroke-order SVGs. These are optional and only shown on the detail view.
- Keep the build reproducible: a script in `scripts/` writes versioned JSON into `assets/`. Never hand-edit the generated files.

Note: GitHub release assets may be blocked in some sandboxes. If a download fails, ask the owner to fetch the file rather than routing around the block.

## 4. Scope

**v1 (MVP, parity plus a proper foundation):**
- Supabase auth (email magic link, same as DANSK) and Postgres with RLS. Offline-first: the session works with no network, and a sync queue flushes later.
- Everything in §3, including import of the prototype's progress JSON (see §11, M1).
- FSRS scheduling (see §6).
- Kanji detail view: readings, all words, components, stroke order, and her personal history for that kanji.
- Browse and search by kanji, reading or meaning.
- Stats: reviews per day, retention, and lists of leeches and weak kanji.
- The Claude features marked **v1** in §8.

**v2:**
- The remaining Claude features.
- An MCP server so Claude in the Claude app can use her data (§9).
- Graded reading passages.
- Photo-to-deck.
- Android widget ("3 due").

**Out of scope:** handwriting input, vocabulary-only decks, social features.

## 5. Exercise types (port these exactly, then improve)

| Type | Prompt | Answer | Requires |
|---|---|---|---|
| `mean` | the kanji alone, in a 田字格 square | 4 English meanings | — |
| `which` | an English meaning | 4 look-alike kanji | — |
| `fill` | a word with a dashed gap (時□) + reading + gloss | 4 look-alike kanji | a word of 2+ characters containing the kanji |
| `read` | a word, target kanji highlighted, plus gloss | 4 kana readings | a word |
| `type` | a word | free text; romaji converted to kana | a word |

The prototype picks a type at random with weights mean 3, which 2, read 3, type 2, fill 3, among the types the kanji supports. Blitz never uses `type`.

**Look-alike kanji (`which`, `fill`, `mean` distractors):**
1. Find kanji that share components, ranked by number of shared components, then by closeness in frequency rank.
2. Shuffle the top 12 and pick 3 with distinct first meanings.
3. Fallback: kanji within ±80 frequency ranks with a stroke count within ±3.

v1 improvement: also use visual similarity, for example a precomputed similar-kanji list from component overlap and stroke-count difference, since 末/未 and 土/士 share no "component" but are the real confusables.

**Reading distractors (`read`), in priority order:**
1. **Reading swap:** the same kanji with another of its readings. 有名 ゆうめい → うめい (有 = ウ) or ゆうみょう (名 = ミョウ); 日本 にほん → にもと (本 = もと). Only substitute substrings of 2+ kana, or a match at the start of the word, to avoid nonsense like ゆゆうめい.
2. **Phonological mutations:** toggle voicing (か↔が, は↔ば↔ぱ); add or remove っ before k/s/t/p rows; add or remove long う after o-row or ゅ/ょ, but never before ん/っ; drop the い in e-row + い (めい → め); swap small and large ゃゅょ.
3. **Fallback:** a random reading of similar length.

Hard rule: never generate a distractor that is actually a valid reading of the word. v1 should check candidates against JMdict readings for the same spelling.

**Romaji → kana:** Hepburn plus common Kunrei forms. "nn" or "n'" gives ん; "n" before a consonant or at the end gives ん; a doubled consonant (or "tc") gives っ. Katakana input is normalised to hiragana. The prototype's `toKana()` passes these cases: jikan, konnichiha, kanji, honnou, gakkou, kyou, shinbun, shinnbunn, benkyou, chotto, kin'en. Make them unit tests.

## 6. Scheduling

- Use **FSRS** via `ts-fsrs` instead of the prototype's SM-2 variant. Store each review as a log row so parameters can be re-optimised on her own history later.
- Grade mapping: wrong → Again; correct → Good; the "Guessed" override → Hard; "Too easy" → Easy.
- A calibrated card starts as a review card with an interval of about 21 days, spread over the next 3–28 days so they don't all land at once. Its first review is forced to `type`.
- Order: due reviews oldest-first, with a new card inserted after every 4th review. New cards per day are configurable, and the "5 extra" button bypasses the limit.
- Each blitz miss on a known card moves its due date to today. It doesn't count as a review log entry.
- Leeches: 8+ lapses flags the card and shows the mnemonic feature (§8.2) more prominently.

## 7. Architecture

- **Expo (React Native + web) with expo-router:** one codebase, shipped as an Android APK via EAS and as a static web export on GitHub Pages. DANSK has a separate web app and RN app; avoid that split here unless Expo web proves inadequate.
- **TypeScript strict.** Pure logic (scheduler, distractors, kana, session builder) lives in a `core/` package with no UI imports and full unit tests (Vitest).
- **Offline-first local store:** SQLite on device (`expo-sqlite`) and IndexedDB on web. Kanji data is bundled. Progress syncs to Supabase.
- **Supabase:** auth, Postgres, and Edge Functions as the **only** path to the Claude API.

**Data model (Supabase, all tables RLS'd to `auth.uid()`):**

```
cards        (user_id, kanji, state jsonb /* FSRS card */, calibrated bool, flagged bool, updated_at)
review_logs  (id, user_id, kanji, exercise_type, word, correct, grade, answer_text, ms_to_answer, reviewed_at)
settings     (user_id, new_per_day, review_style, ui_lang, day_rollover_hour default 4)
blitz_runs   (id, user_id, score, misses text[], played_at)
ai_cache     (user_id, kind, key, payload jsonb, model, created_at)   -- mnemonics, sentences, explanations
ai_usage     (user_id, day, input_tokens, output_tokens, calls)       -- for quotas
```

## 8. Claude integrations

All calls go **app → Supabase Edge Function → Claude API**. The API key lives only in Edge Function secrets. Use the Messages API with **structured JSON output** (tool use or a JSON schema) for anything the UI renders. Cache results in `ai_cache`.

Suggested models: **Haiku** (`claude-haiku-5-5`) for per-tap features and **Sonnet** (`claude-sonnet-5-5`) for generation. Check the current model list and pricing at docs.claude.com before hardcoding either.

### 8.1 "Hvorfor?" (Why?) on a wrong answer (v1, Haiku)
- **Trigger:** after a wrong answer, a "Hvorfor?" button.
- **Input:** the exercise, the correct answer, her answer, and the kanji record.
- **Output:** 2–4 sentences explaining the actual mistake, for example rendaku in 手紙 (てがみ), a long vowel she dropped, or 末 vs 未. The explanation is in Danish, in a dry voice, never "Godt forsøg!".
- **Cache key:** (kanji, word, wrong answer).

### 8.2 Mnemonics (v1, Haiku)
- **Trigger:** "Huskeregel" on the detail view; shown automatically on leeches.
- **Output:** a short story built from the components, plus a reading hook.
- **Behaviour:** generated once and stored. She can edit it or regenerate it, and her edited version wins.

### 8.3 Lenient judging of typed readings (v1, Haiku)
- **Purpose:** replaces the "my answer was also valid" button as the first line of defence.
- **Flow:**
  1. Run deterministic checks first: an exact match after normalisation, then a match against any JMdict reading for that spelling.
  2. Only if both miss, call Claude for a verdict: correct, typo of the correct reading, or wrong, with a reason.
  3. A "typo" verdict counts as correct but shows the right spelling.
- **Override:** the manual button stays as an escape hatch.

### 8.4 i+1 example sentences (v2, Sonnet)
- **What:** a natural sentence using the target word, where every other kanji is one she already knows (FSRS stability above a threshold). This is the killer feature.
- **Input:** the target, plus the set of known kanji passed as a compact string.
- **Validation:** the server checks that every kanji in the output is in the known set plus the target, and retries up to twice if not. Return the sentence, a reading split for furigana-on-tap, and translations in English and Danish.
- **Fallback:** Tatoeba sentences when generation fails validation.

### 8.5 Graded reading (v2, Sonnet)
- **What:** a short news-style or slice-of-life passage of 150–300 characters, restricted to known kanji plus up to 3 new ones (highlighted), followed by 3 comprehension questions.
- **Interaction:** tapping any kanji opens its detail view or adds it to the queue.
- **Topics:** let the learner pick (current affairs, tech, travel, anime…).

### 8.6 Photo to deck (v2, Sonnet with vision)
- **What:** photograph a sign, menu or label. Claude extracts the text, and the app lists the unknown jōyō kanji with one-tap "add to new queue".
- **Privacy:** process the image transiently and don't store it.

### 8.7 Tutor chat (v2, Sonnet)
- **What:** a short Japanese conversation that deliberately uses words with her weak kanji, written in kanji. Her mistakes are corrected with explanations, in the same style as her Claude chats: a correction block after each reply.
- **Context:** pass the weak-kanji list, not her whole history.

### Cost and abuse controls
- **Per-user daily caps** in `ai_usage`: soft limits shown in the UI, enforced in the Edge Function.
- **Hard caps:** `max_tokens` on every call, and a global monthly budget kill-switch via an env var.
- **Prompt hygiene:** typed answers and OCR text are untrusted input. Wrap them in clearly delimited data blocks, tell the model they are data, and never let model output trigger writes beyond the user's own `ai_cache` row.

## 9. MCP server: Claude ↔ Kanjiskole (v2)

Expose a small **remote MCP server** (a Supabase Edge Function or a tiny Deno or Cloudflare Worker service) with OAuth tied to her Supabase account. That lets Claude in the Claude app work with her data, e.g. "what are my weakest kanji?", "quiz me on today's reviews here in chat", "add the kanji from this article to my queue". The learner would add it as a custom connector.

| Tool | Kind | Description |
|---|---|---|
| `get_progress` | read | Counts by stage, due today, streak, blitz best |
| `get_weak_kanji(limit)` | read | Lowest stability or most lapses, with their words |
| `get_kanji(k)` | read | Full record plus her history for that kanji |
| `get_due(limit)` | read | Today's due items, so Claude can quiz her in chat |
| `record_review(kanji, correct, exercise_type)` | write | Logs a chat-quiz answer as a real review, through the same scheduler as the app |
| `add_to_queue(kanji[])` | write | Pushes kanji to the front of the new queue |
| `save_mnemonic(kanji, text)` | write | Stores a mnemonic written in chat |

**Rules:**
- Write tools are scoped to the authenticated user only, with no destructive tools (no reset or delete).
- Every write goes through `core/` logic, never raw SQL from tool arguments.
- Rate-limit writes and log tool calls.

## 10. Security and privacy (it will be checked by someone who does this for a living)

- **Secrets:** no secrets in the client bundle. The Claude key stays in Edge Function secrets, and the Supabase anon key is the only key the client holds.
- **RLS:** enabled on every table. Write a test per table proving one user can't read or write another's rows.
- **Edge Functions:** verify the JWT, validate input with zod, cap request size, and rate-limit per user.
- **Data collection:** no analytics or third-party trackers. Fonts are self-hosted in the app bundle; Google Fonts is fine on web.
- **Dependencies:** pin them, enable Dependabot, and run `npm audit` in CI.
- **Export:** a full JSON export of her data from settings. She should never be locked in.

## 11. Design (carry over from the prototype)

- **Mood:** a quiet study notebook, with one accent.
- **Colour tokens:**
  - light: paper `#F3F4F7`, sheet `#FFFFFF`, ink `#1A1E29`, muted `#697082`, line `#D7DAE2`
  - dark: paper `#111319`, sheet `#191C25`, ink `#E7E8EE`, muted `#979DAE`, line `#2B2F3C`
  - 藍 indigo accent: `#2B3C8C`, or `#93A5F2` in dark mode
  - 朱 vermilion, used **only** for wrong and Again: `#C2412B`, or `#F07C66` in dark mode
- **Fonts:** Shippori Mincho B1 for kanji, words and readings, so she reads print-style glyphs. Zen Kaku Gothic New for the UI.
- **Kanji square:** the 田字格 practice square with dashed centre guides.
- **Progress map:** the 2,136-cell map stays on the home screen. It's the "how far am I" view she'll actually look at.
- **Feedback:** answer feedback in Japanese (正解 / その通り / 完璧), the rest of the UI in Danish.
- **Theme:** follows the system light/dark setting; make sure dark mode looks deliberate.

### Milestones

1. **M1 Core:** `core/` package (kana, distractors, FSRS wrapper, session builder) with tests ported from the prototype, plus the data pipeline v1. Also an importer for the prototype's progress JSON. It's the shape described in §3; ask the owner to export it from the artifact (an export button can be added to the prototype on request).
2. **M2 App shell:** Expo app with home, calibration, session, blitz and settings at parity with the prototype, running offline.
3. **M3 Sync:** Supabase auth, sync and RLS tests; web deploy to the author's site; Android build through EAS.
4. **M4 Claude v1:** "Hvorfor?", mnemonics and lenient typed judging, with quotas.
5. **M5 v2:** i+1 sentences, graded reading, MCP server, photo-to-deck, tutor chat.

### Acceptance checks

- A full session works in airplane mode and syncs afterwards without duplicating review logs.
- A session started at 01:30 counts toward the previous calendar day's stats (04:00 rollover).
- Generated distractors never equal a valid reading of the word. Property-test this over all words.
- An i+1 sentence never contains a kanji outside the known set plus the target, enforced server-side.
- Lighthouse a11y ≥ 95 on web. Every control is reachable by keyboard, and 1–4 / Enter / Esc work.

### Open questions (answered since; see DECISIONS.md)

1. Should Kanjiskole share DANSK's Supabase project and account, or get its own?
2. Danish-only UI, or a Danish/English toggle from day one?
3. Should the MCP server be read-only first, or include writes at launch?
4. Which monthly API budget should the kill-switch enforce?
