# Research-run failure analysis + action plan (2026-06-18)

Engagement analyzed: `deliver-a-comprehensive-2026-outlook-report-on-the-global-re` (retail/e-commerce 2026 outlook).
Method: 3 parallel evidence investigations over the wiki/manifest + run outputs + the chat transcript
(`Downloads/chat-2026-06-18 (1).txt`), then Verbalized Sampling (multiple candidate fixes per issue,
select best) + Reinforcement Inference (flag low-confidence claims to re-verify before committing).

## The one thread tying all three issues together
The pipeline over-trusts its **manifest-chunk corpus grounding** (anti-RAG, UNIFIED_VISION #6) and
under-weights two things it should respect MORE: (a) **source-type diversity** (the user's curated
non-Reddit sources) and (b) **explicit user input** (a verbatim paste). The "user selections trump
auto-ranking" doctrine (MEMORY: feedback_user_selections_trump_auto_ranking) was implemented for CHUNK
retrieval but never extended to **source-type balance** or **verbatim paste authority**. Separately,
the **Subject-Discipline / meta-narration guard is prompt-only on the chat/deck path** (no runtime gate).

---

## ISSUE 1 — Corpus dominated by Reddit, not the user-selected retail sources

### Root cause (evidence)
1. **Reddit-deep runs on a SEPARATE path that ignores the pack selection.** Pre-run pack selection
   (`selectedPackIds`) resolves only to RSS/news/article/academic IDs feeding `multiSearch`
   (`App.tsx:3917-3924`). Reddit-deep is driven by a different variable `deepSubreddits`, built from
   `parseUserSubreddits` and, when the box is empty, **auto-inferred 6-10 subreddits from the goal via an
   LLM** (`App.tsx:4782-4798`, `inferSubredditsFromGoal`) — fires UNCONDITIONALLY. Selecting "Retail"
   packs adds no Reddit; NOT selecting Reddit doesn't remove it.
2. **Volume asymmetry.** Reddit-deep: `post_limit=50`/subreddit, ≤12,000 chars body + 8 comments
   (`researchFabricOrchestrator.ts:856-889,1124-1198`; proxy `app.py:2436-2540`); ~11 subreddits ≈ 550
   rich posts. Selected news/article sources: hard-coded `&limit=15` snippet items (`App.tsx:4628`).
   This is the cause of `[Corpus] Composition … External 7487KB (75%)`.
3. **No source-TYPE balancing at chunk admission.** `chunkRetrieval.ts:420-466` ranks purely on
   token-overlap + relevance + MMR — no per-type floor/cap. `/api/corpus/scope` (`app.py:13407-13464`)
   explicitly REMOVED the 50/subreddit cap for "relevance over the whole corpus" with nothing balancing.
4. **Quantified outcome:** `themes.json` cites `reddit-deep` 314×, `Reddit` 73×, `Shopify` 57×, and
   **0** from OpenAlex / Retail Dive / Modern Retail / Digital Commerce / McKinsey / YouTube. The grounded
   evidence base is ~100% Reddit; the curated retail sources contributed effectively nothing.

### VS — candidate fixes (diverse), with selection
- (A) Gate reddit-deep behind explicit user selection + cap volume (stop unconditional auto-infer).
- (B) **Enforce a source-TYPE quota at chunk admission** (e.g. social ≤40% of admitted pool; floors for
  article/news/academic), enforced on the actual chunks, not just the ≥60%-external prompt instruction.
- (C) Normalize fetch volume (raise news `limit`, char-budget down-weight Reddit at corpus assembly).
- **SELECT: B as the keystone** (protects every engagement regardless of fetch volume / connector) +
  A (stops the unconditional Reddit injection at the source). C is a supporting tune, not the fix.

### RI (verify before committing)
- Confirm the exact admission function signature + where a type tag exists per chunk (source.scope is
  external/uploaded/analysis, NOT type) — may need a source-TYPE field threaded through the manifest.
- Confirm `inferSubredditsFromGoal` has no existing guard for "user made a non-Reddit selection."

---

## ISSUE 2 — Self-referential slop ("How this deck is built…") shipped

### Root cause (evidence)
- The offending output is a **#slides DECK-MODE** deck (`corpusChatService.ts` deckMode), `slides:agenda`
  archetype, title **"How this deck is built: themes, the ten, and where to ideate"** (transcript line 106;
  session `chat.json`). Not a #presentation/:5014, not an HTML #report.
- The deck path DOES run the meta sweep (`corpusChatService.ts:3595` → `stripQAAnnotations` →
  `removeMetaNarration`, `slidePostProcessor.ts:668-669`), BUT **no regex in `META_NARRATION_PATTERNS`
  matches this construction**: `slidePostProcessor.ts:160` requires "**in** this deck"; `:171` requires
  "this deck" + a closed verb set (lacks bare "is built"). PATTERN GAP — the decisive cause.
- **Subject-discipline gate is NOT runtime-enforced on this path** (`corpusChatService.ts:3588` comment:
  "No AIR gate … no plain-prose meta/process strip"). The `.claude/CLAUDE.md` Subject-Discipline rules
  are prompt-only here.
- Contributing trigger: the user's own feedback "add a table of contents with a structured narrative
  framework" nudged the model to author a build-process agenda title.

### VS — candidate fixes
- (A) Add patterns to `META_NARRATION_PATTERNS` for the self-referential-structure class:
  `/\b(how|why|what|where)\s+this\s+(deck|presentation|report|brief|section)\s+(is|was|gets?)\s+(built|structured|organized|laid out|put together|framed)\b/i`
  + broaden `:171` verbs (is built/structured/organized, breaks down, is laid out).
- (B) Wire a runtime subject-discipline scrub into the deck/chat finalizer (`corpusChatService.ts:3585-3599`)
  that rejects/strips any slide whose title/content is ABOUT the deliverable (catches the whole class).
- (C) Constrain at the source: the `slides:agenda` archetype contract forbids meta titles (agenda title
  must name a subject conclusion, never describe deck construction).
- **SELECT: A (immediate, targeted) + B (class-level runtime enforcement)**; regex-only is always one
  phrasing behind the model, so B is the durable layer. C as a cheap prompt reinforcement.

### RI
- Verify `removeMetaNarration` runs on slide TITLES specifically (it splits the whole fenced blob by
  sentence; confirm a fenced JSON `"title": "How this deck…"` is actually reached as a "sentence").
  If titles inside JSON fences are not sentence-split cleanly, the per-field `postProcessSlides` path must
  also be wired (it isn't, on the chat path).

---

## ISSUE 2b — #slides decks have no STRUCTURED STRATEGIC NARRATIVE (under-scoped originally)

### Root cause (evidence)
The `#slides` chat path runs DECK MODE (`corpusChatService.ts:3527`), which injects the SLIDES archetype
registry + a SELECTION DOCTRINE optimizing ONLY for archetype VARIETY and content-shape fit ("use >=5
distinct archetypes", "map each slide to the archetype that matches its shape", "never repeat an
archetype"). There is NO governing business-narrative contract - no Rumelt kernel / SCQA / Minto spine,
no "argue one thesis start to finish". The `deck-narrative-composer` skill is NOT loaded on this path
(only the `#presentation`/narrativeComposer route builds a real `narrativeArc`). Result: a well-varied
but UNARGUED assortment of on-topic slides. "Barely any content" is compounded by the doctrine favoring
sparse archetypes (cover/divider/thesis/stat-row) without requiring the content-dense body archetypes
that carry the argument. (A transient Anthropic `SSLV3_ALERT_BAD_RECORD_MAC` 502 also degraded one
observed run; proxy re-probe returned HTTP 200 - transient, not the structural cause.)

### Fix (DONE 2026-06-18)
Injected a **NARRATIVE ARC - PLAN THE BUSINESS ARGUMENT FIRST (MANDATORY)** block into the DECK MODE
prompt ABOVE the SELECTION DOCTRINE (`corpusChatService.ts`): a one-line thesis (Minto answer-first), a
Rumelt+SCQA arc in order (setup -> complication/diagnosis -> evidence -> implication/so-what -> guiding
policy+actions -> close, "always resolve to and-therefore, never end on a list"), connective-tissue rule
(titles read top-to-bottom as the whole argument - Partner Test; dividers mark transitions not filler),
a SUBSTANCE-IN-BODY-SLIDES density rule (content lives in numbered-themes/evidence-table/block-quote/
org-model/stat-row, not sparse connective slides), and a clause to build the arc AROUND authoritative
pasted content in the user's order. Archetype selection now SERVES the arc. Prompt-contract only (no
renderer change); the frameworks reuse .claude/CLAUDE.md (Minto/Rumelt/SCQA, already loaded).

## ISSUE 3 — Verbatim pasted content ignored in #slides

### Root cause (evidence, transcript-confirmed)
The user pasted the assistant's own prior 10-challenge answer VERBATIM into a `#slides` request to be laid
out as-is. The model re-derived from corpus instead: run 1 **dropped challenge #5 (Brand Defamation)**
from the cover deck and the 10-at-a-glance (only 6 of 10 in the evidence-table), and **swapped the pasted
facts** (EU €150 relief / July 1 2026 → "$800 US de minimis / July 1 **2027**"; invented corroborating
"1 in 2 / ~74% / Loop" figures attributed to "r/customerexperience deep corpus" not in the paste).
Mechanisms:
1. The full paste is used only as a **retrieval query** to `pickChunksForPrompt`
   (`corpusChatService.ts:3002-3026`); the retrieved chunks are then injected under the header
   **`=== PRIMARY EVIDENCE (manifest-selected, cite by pointer) ===`** (`corpusChatService.ts:1844-1848`),
   which OUTRANKS the paste. The paste itself arrives as the untagged user turn (`callClaude(... userMessage)`,
   `:3508`) with no authoritative status.
2. The anti-hallucination contract ("Answer ONLY from evidence that EXISTS in the corpus … NEVER invent
   quotes not in the corpus", `:3214-3221`) pressures the model to REPLACE user-supplied facts with
   corpus-citable substitutes — the paste is implicitly treated as untrusted.
3. DECK MODE's archetype registry + selection doctrine (`:3465-3470`) tell the model to re-architect
   (re-group 10→5+5, vary archetypes), with no rule to preserve the pasted item set/order.
4. The full paste IS passed intact (not truncated) — so this is a **priority/authority** failure, not a
   truncation failure. No analogue to narrativeComposer's USER OVERRIDE block or KL `userSelected` trump
   exists for verbatim paste in the chat #slides path.

### VS — candidate fixes
- (A) Detect a substantive paste (artifact message + body >~600 chars OR enumerated `####`/numbered list),
  split directive from content, inject the content as a top-priority **"AUTHORITATIVE SOURCE CONTENT"**
  block ABOVE the manifest "PRIMARY EVIDENCE" block: "Build FROM this; corpus is supplementary, used only
  to source citations for claims already here; do not drop/merge/renumber/substitute items." (mirrors
  narrativeComposer USER OVERRIDE).
- (B) Parse an explicit enumerated set and pass it into DECK MODE as a hard rule: one slide/section per
  item, in order, preserving title/framing; archetype variation applies to LAYOUT, not which items exist.
- (C) Scope the anti-hallucination contract: facts/quotes in the user paste are permitted even if not
  independently corpus-resident; corpus corroborates, does not gate.
- **SELECT: A as the minimal first step** (re-prioritizes paste above "PRIMARY EVIDENCE"), then B
  (preserve item list/order/count — stops the dropped-#5 and 5+5 re-grouping), then C (stops fact swaps).
  All three are needed for full fidelity; A alone is the smallest change that moves the needle.

### RI
- Verify there isn't already a paste-detection/override branch elsewhere (search isArtifactGenerationMessage
  + any "authoritative"/"verbatim" handling) before adding a new one (converge, don't duplicate).

---

## Prioritized action plan (gated, no-stopgap; implement in this order)

P0 (highest leverage, protects all engagements):
- **1. Source-TYPE balance at chunk admission** (`chunkRetrieval.ts`) — per-type quota/floors; thread a
  source-type tag through the manifest if absent. (Issue 1, fix B.)
- **2. Verbatim-paste authority block** in the chat #slides/artifact path (`corpusChatService.ts` ~3002 +
  buildGroundingContext ~1844) — paste ranked ABOVE manifest "PRIMARY EVIDENCE", item-set preserved.
  (Issue 3, fixes A+B.)

P1:
- **3. Gate + cap reddit-deep** behind explicit selection (`App.tsx:4782`); bound volume vs the news pack.
  (Issue 1, fix A.)
- **4. Runtime subject-discipline scrub + META_NARRATION_PATTERNS additions** on the deck/chat finalizer
  (`corpusChatService.ts:3585`, `slidePostProcessor.ts:156`). (Issue 2, fixes A+B.)

P2:
- **5. Anti-hallucination carve-out for user-pasted facts** (Issue 3, fix C); **fetch-volume normalize +
  composition pre-warning** (Issue 1, fix C); **agenda archetype meta-title ban** (Issue 2, fix C).

Each lands behind the existing held-out gate (UNIFIED_VISION RHO/SkillOpt #2-3): no change ships unless it
measurably reduces the failure on a held-out check (e.g. a re-run of THIS engagement showing
external-source citations >0 and >Reddit floor; the paste-fidelity test; the meta-title scrub test).
NO STOPGAPS — each is the durable root-cause fix, not a band-aid.

## Status — IMPLEMENTED 2026-06-18 (typecheck 0, vitest 170/170, +8 held-out tests)
- **P0.1 DONE** — source-type soft-cap in the MMR pack (`chunkRetrieval.ts`): social ≤40% while
  non-social candidates remain; never starves a genuinely social corpus; user-selected/pinned never
  capped. Logs `source-type balance: N social / M non-social`.
- **P0.2 DONE** — verbatim-paste authority (`corpusChatService.ts`): `extractAuthoritativePaste` detects a
  substantive/structured paste; `buildGroundingContext` emits an `AUTHORITATIVE SOURCE CONTENT` block
  ABOVE PRIMARY EVIDENCE with preserve-item-set + facts-as-ground-truth rules.
- **P1.3 DONE** — reddit-deep bounded (`App.tsx`): auto-inferred subreddits capped at 5 + postLimit
  halved to 25 for the auto-inferred case; user-explicit subs keep full volume.
- **P1.4 DONE** — `removeMetaNarration` is now FENCE-AWARE (skips `:::slide`/code so it can't delete slide
  JSON) + self-referential-structure patterns added; `scrubMetaTitle` strips "how this deck is built"
  meta from slide titles per-field, applied in `slideComposer.composeSlide`.
- **P2 partial** — anti-hallucination carve-out DONE (`corpusChatService.ts:3274`, scoped to the
  authoritative block). REMAINING (lower value, covered at admission/render): fetch-volume normalize +
  >50%-one-type composition pre-warning; agenda-archetype meta-title prompt ban (already scrubbed at render).
- Tests: `services/researchRunFixes.test.ts` (paste extractor, scrubMetaTitle, fence guard). LIVE
  ACCEPTANCE GATE the owner runs: re-run this engagement and confirm (a) `source-type balance` log shows
  non-social >0 / external citations in themes.json >0; (b) a verbatim #slides paste preserves all items
  + the user's facts; (c) no "how this deck is built"-class title ships. SPA rebuilt; nothing committed.
