# HiC End-to-End Workflow — LIVE-VALIDATED Gap Assessment (2026-06-29)

Companion to `end-to-end-workflow-ideal-vs-actual-handoff-2026-06-29.md`. That doc is the IDEAL/ACTUAL/GAP
ledger; this doc records what a **live research run + 5 parallel code-verification passes** actually proved,
corrects several stale ledger claims, and root-causes the three failures the owner named (citation failures,
incorrect model routing, missing images).

Evidence base:
- A live run: goal "Define the 2026 state-of-the-art operational and technological..." (1 upload + 283 sources,
  88 themes synthesized), browser console log + a citation-read screenshot.
- 5 code-verification agents over all 15 stages (file:line evidence).
- Direct reads of the two named bug sites + a disk check.

Verdict: the **architecture is largely as documented** (anti-RAG manifest grounding, the skill gate, the export
invariant, the parity test all hold). The failures are concentrated in **(1) routing during the Opus cap,
(2) citation-pointer dereference, (3) source-type balance, and (4) anti-slop enforcement on the themes path** —
plus latency/reliability on the Gemini-only fallback.

---

## A. LIVE-RUN VALIDATION — what the run proved (ranked by severity)

| # | Severity | Finding | Live evidence |
|---|---|---|---|
| 1 | **P0** | **Theme shards still call Opus 4.8 first during the cap** — every shard eats an HTTP 400 then falls back. | `[Themes-S1..S10] Opus 4.8 shard failed ... HTTP 400 invalid_request_error; falling back to Gemini chain` (10x) |
| 2 | **P0** | **Citation chunk-pointer dereference 404s** — `#cN` fragment breaks the read. | `GET /api/wiki/read-article/articles%2Fgemini-focused-research%2F33aec05c8b.md%23c3 → 404`; screenshot "Read failed (404)" |
| 3 | **P0** | **Source-type skew unfixed** — themes ground on ~90% social despite a stated "40% soft-cap". | MMR packs: `90 social / 1 non-social`, `93/7`, `83/4`, `74/7`, `66/7` (social soft-cap 40%) |
| 4 | **P1** | **Em-dash hard-ban NOT enforced on themes** — 1691 em-dashes shipped into the deliverable. | `[themes] quality score: 69/100 \| failures: em_dash_absent: 1691 em-dash characters present` |
| 5 | **P1** | **Gemini-only path is slow + unstable** — repetition-collapse, GPT-5.5 recovery, 8-min shards. | `repetition-collapse ("11111111" x66)`, `recovered via GPT-5.5`, `Themes-S10 ... elapsed=491434ms` |
| 6 | **P2** | **Theme quality regressed run-over-run.** | `[Discriminator] themes: Quality down 20 points (now 60/100). corpus or context regressed.` |
| 7 | **P2** | **wiki-hydration re-render storm** — themes.json re-hydrated hundreds of times in one session. | hundreds of `[wiki-hydration] hydrated themes from ...themes.json` (App.tsx:1719) |
| 8 | P3 | Session-restore 404s on prior engagements at load. | `GET /api/sessions/<slug> → 404` (x8) |
| 9 | P3 | Enrichment loses authoritative sources to timeout. | `Enrich ERR "mckinsey.com" → timeout`; `3/20 items enriched` |

What WORKED in the live run (do not regress): anti-RAG manifest grounding (`[Themes] GROUNDING=anti-rag-mcr`),
fabrication guard (`343/346 quotes grounded, 3 fabricated blanked`), BY-NAME retrieval (matched the upload + the
Drew Parker interview, `missing=[]`), KL user-selection priority, deck-mode tier override
(`gemini-3.5-flash -> gemini-3.1-pro-preview`), verbalized confidence calibration (`calibration=OK`).

---

## B. THE THREE NAMED BUGS — root cause + fix

### B1. Incorrect model routing (P0) — theme shards bypass the cap split
**Root cause:** `services/geminiService.ts:2476-2486` (`_runBreadthShard`) unconditionally tries `claude-opus-4-8`
FIRST whenever `ANTHROPIC_API_KEY` is set. It has **no awareness of the Opus-cap workaround** that was wired into
`corpusChatService.ts` (`ARTIFACT_DEFAULT_DURING_CAP`) and `prototypeBuilder.ts` (`CODE_MODEL`). So while the cap is
active (until 2026-07-01), every theme breadth shard makes a doomed Opus call (`maxAttempts:2`,
`requestTimeoutMs:240_000`), takes the 400, logs it, then falls through to Gemini→GPT-5.5. This is wasted latency on
every shard and pollutes the cost-meter / trace with failed-primary noise.
**This is the canonical-routing deviation the handoff flagged as cross-cutting #1, now proven live — and it lives in a
THIRD routing site the cap workaround never touched.**
**Fix (durable, no-stopgap):** centralize "is Opus currently usable" in ONE place (e.g. an `isOpusAvailable()` /
`OPUS_CAP_ACTIVE` flag in `aiRouter.ts`) and gate all three sites on it (`corpusChatService`, `prototypeBuilder`,
`geminiService._runBreadthShard`). While capped, `_runBreadthShard` should skip the Opus attempt and go straight to
Gemini, so no shard eats a 400. Post-2026-07-01 the single flag flips back and all three sites restore Opus together.
This also fixes the split-brain (today the revert requires editing 3 files; it should be 1).

### B2. Citation failures (P0) — read-article does not strip the `#cN` chunk fragment
**Root cause:** `proxy/app.py:11711-11724` (`wiki_read_article`). The manifest chunk-pointer scheme is
`<wikiPath>#cN`. The frontend dereferences a pointer by GETting `/api/wiki/read-article/<path>%23cN`. After
URL-decoding, `hash_or_path = "articles/gemini-focused-research/33aec05c8b.md#c3"`. Line 11717 sees the `/`,
takes the direct-path branch, and builds `safe_path = .../33aec05c8b.md#c3` — a filename that does not exist
(`os.path.exists` → False → 404). **Confirmed: the base file `33aec05c8b.md` DOES exist on disk (14,645 bytes),** so
this is purely fragment mishandling, not a persistence gap.
**Fix (durable):** in `wiki_read_article`, split off the `#...` fragment before resolving the path:
`base, _, frag = hash_or_path.partition('#')`; resolve `base` to the file; if `frag` matches `c<N>`, use the page's
`chunks:` frontmatter `char_span` to slice and return just that chunk's text (so the citation viewer shows the cited
passage, not the whole article). Falling back to the full body if the fragment can't be resolved is acceptable; 404ing
is not. Apply the same partition in the hash-only branch.

### B3. Missing images in deliverables (P1) — NEEDS the artifact output to confirm, strong hypothesis
**Status:** the supplied log ends at the themes auto-synth + a deck-mode kickoff (`DECK MODE ACTIVE`,
`gemini-3.1-pro-preview`); it does NOT contain the artifact's image-authoring/render lines, so I will not assert a
root cause without that evidence (per the no-guessing rule).
**Static facts (from the verification pass):** the slot→carrier→render chain is intact for wired slots
(`artifactIllustrator.ts` stores **data-URIs** so images survive export; `slideToStageHtml.ts` renders every carrier
as a real `<img>`; the export GEO walker depends on that). `personas-overview` + `strategy actionImages` are
**deliberately `wired:false`** (GOLD-page-only, no chat renderer) — if the missing images are on those, that is BY
DESIGN, not a bug.
**Leading hypothesis (tie to B1):** during the cap the artifact path runs on **Gemini 3.1 Pro, not Opus**. The
per-element imagery contract (`nxt-visual-renderer` Universal Contract #6) may be authored reliably by Opus but
under-emitted by Gemini-Pro, so the carriers come back empty and the renderer has nothing to paint. The visual router
also gates the **emotive** branch OFF by default (`visualRouter.ts` section-8 gate), so emotive hero/persona art will
be absent unless explicitly enabled.
**To root-cause (please provide):** the console log for the actual `#slides`/`#strategy`/`#personas` generation that
showed missing images, OR the rendered artifact. I will then trace registry-slot → carrier population → `<img>` count
in the iframe and confirm whether it's (a) empty carriers from the Gemini path, (b) a `wired:false` slot, or (c) a
CSS-background regression (the export invariant — verified clean in `slideToStageHtml.ts` today).

---

## C. STAGE-BY-STAGE DELTA vs the prior ledger (what changed under verification)

Legend: ✅ verified as-documented · 🔧 FIXED since ledger was written · ⚠️ GAP confirmed · ❌ ledger claim REFUTED.

- **S1 Collection** — ⚠️ **Source-type quota still absent** (`researchFabricOrchestrator.ts` ranks, never caps by
  type; `greedyPackCorpus` is provenance-blind). 🔧 30K upload cap REMOVED for uploads (`capItemBody`); 🔧 7x dupe
  fixed (content-stable synthetic URL); 🔧 **by-name retrieval tier now EXISTS** (`/api/manifest/chunks-by-title`,
  proven live). ❌ ledger's "demotes off-objective items" — it mostly ORDERS; only social `<30` and enrichment `<40`
  actually drop.
- **S2 Chunking** — ✅ deterministic, non-LLM (`wiki_chunker.chunk_for_manifest`); ❌ it's a header/paragraph/token
  chunker, not sentence-split. ⚠️ in-page `char_span` staleness real (reconcile heals the sidecar, not in-page spans).
- **S3 Wiki storage** — ✅ as designed (layers, proxy-write, `wikiService` API all present).
- **S4 Citation mapping** — ❌ **`citationResolver.ts` does not implement the documented contract** (emits
  `(Source: "Title", Name, year)`, not `"SourceName: ArticleTitle"`; comma-lists are stripped, not joined). ✅
  `validate_chunk_citations.py` gate present. ⚠️ **+ the live 404 dereference bug (B2).**
- **S5 Manifest / anti-RAG** — ✅ **genuinely wired**: `groundedViaManifest` gate suppresses legacy RAG; all
  on-demand deliverables ground via `assembleDeliverableCorpus`. ⚠️ `generateStrategicReport` retains a `rawSources`
  bulk-inject block, but only as a manifest-empty FALLBACK.
- **S6 Caching** — ❌ **biggest correction: the main `geminiService.ts` deliverable pipeline bypasses the proxy
  cache** (GenAISession + ~15 `standaloneAi` sites call Google directly via `@google/genai`; `recordDirectGeminiCall`
  admits it). The 2026-06-28 proxy-routing fix only covered `corpusChatService.callGemini`. ✅ Anthropic prefix /
  exact-match / tool / content-hash caches all present. ⚠️ determinism gap real (per-run chunk selection varies the
  prompt hash → re-gen misses exact cache).
- **S7 Themes** — ❌ **VS is DEAD on themes** (reverted 2026-05-12; `geminiService.ts:1642` still instructs a
  `probability` field that no longer exists in the schema — stale, self-contradictory prompt text). ✅ deterministic
  depth pass (temp 0); ✅ topic-model 502 multiworker fix (disk-authoritative). ⚠️ **live: em-dash ban not enforced
  here (1691 shipped), repetition-collapse, quality regression.**
- **S8 Routing** — ✅ `aiRouter.ts` SSOT + `routedModelFor` + force-route correct. ⚠️ **cap split present in 2 of 3
  sites** — `corpusChatService` (`ARTIFACT_DEFAULT_DURING_CAP='gemini-3.1-pro-preview'`) + `prototypeBuilder`
  (`CODE_MODEL='gemini-3.1-pro-preview'`) honor it; **`geminiService._runBreadthShard` does NOT (B1).** Revert after
  2026-07-01 — now a 3-file revert that should be consolidated to 1 flag.
- **S9 Prompt grounding** — ✅ systemPrompt assembled as documented; rides in Anthropic `system` field. ⚠️ **opens
  with volatile content (research goal) before the ~50KB static block → defeats cross-engagement prefix cache.**
- **S10 Hashtag generation** — ✅ ALL 16 single-template hashtags present in `ARTIFACT_TPL`; `#slides`/`#slide`
  handled by deck mode (not a gap). ✅ density spec, deck archetypes, case-study variants reachable. ⚠️ `types.ts`
  "18 templates" label is stale (union is ~24). ✅ renderer-twin trichotomy as documented (`slideToStageHtml`
  authoritative).
- **S11 Figma componentization** — ✅ COMPONENT + IMAGE-SLOT registries present, single library + modes. ⚠️ live Figma
  node existence is doc-asserted only (NEEDS Figma MCP to confirm; #64 re-componentization pending).
- **S12 Tokenization** — ✅ `figma-tokens.json` both modes; `/api/design-tokens` serves it; **`figmaRegistryParity`
  ran live → 15/15 PASS** (no-hardcode hex ceiling enforced). ⚠️ type-scale + space tokens are carried-forward
  mirrors (PAT lacks `file_variables:read`) — un-droppable drift risk, not CI-caught.
- **S13 Runtime retrieval** — ✅ composer + carriers + visual router + data-URI illustrator all present; `wired:false`
  slots documented. (See B3 for the live "missing images" item.)
- **S14 Export** — ✅ GEO walker + native auto-shapes + picture placeholders + per-variant masters present; **export
  invariant HOLDS (zero CSS-background image slots in `slideToStageHtml.ts`).** ⚠️ actual `.pptx` binary fidelity is
  NEEDS-LIVE-RUN (open with python-pptx).
- **S15 SkillOpt** — 🔧 **`applySkillPatch` gate is NOW in-path + test-locked** (`learningEngine.ts:390-399`,
  `learningEngineSkillPatchGate.test.ts`) — the confirmed ungated-drift is fixed. 🔧 `verifyDeliverable()` no longer
  orphaned (wired at `App.tsx:3029`). ⚠️ `precheck_orphan_export.py` registration in `hooks.json` unconfirmed.

---

## D. UNIFIED-VISION DEVIATIONS (which principle each violates)

1. **No-stopgaps / single-source-of-truth** — the Opus-cap workaround is a 3-site stopgap (B1); routing SSOT
   (`aiRouter.ts`) is bypassed by `_runBreadthShard`. Consolidate to one `OPUS_CAP_ACTIVE` flag.
2. **Anti-RAG / manifest grounding** — honored at generation, but **citations can't be dereferenced** (B2) — the
   "named source, verbatim quote, click-through" contract breaks at the last hop.
3. **Quality-first, meet floors UPSTREAM** — source-type skew (A3) means the floor is met by whatever was collected;
   the corpus is ~90% social because collection over-pulls Reddit. Fix upstream (quota at collection), not by relaxing.
4. **Anti-slop output rules** — the em-dash hard ban (`.claude/CLAUDE.md` FORMAT TELLS) is not enforced on the themes
   synthesis path (A4); `slidePostProcessor.stripEmDashes` runs on slides, not on themes JSON.
5. **Determinism-first for cached runs** — volatile-first systemPrompt (S9) + per-run chunk variance (S6) defeat the
   exact/prefix cache on re-gens; the mechanism works but determinism doesn't hold.
6. **CONVERGE/DELETE** — dead VS prompt text on themes (S7) and the legacy `citationResolver` format (S4) are debt to
   delete/converge.

---

## E. PRIORITIZED REMEDIATION (proposed — awaiting go-ahead, no code changed yet)

**P0 (correctness, do first):**
1. **B2 citation 404** — strip `#cN` fragment in `wiki_read_article` (+ optionally slice the chunk). Smallest, highest
   user-visible win. Proxy-only change.
2. **B1 routing** — add `OPUS_CAP_ACTIVE` flag in `aiRouter.ts`; gate `_runBreadthShard` (and converge the other two
   sites onto it). Stops 10 doomed Opus calls + latency per themes run.
3. **A3 source-type quota** — enforce a per-`sourceType` share cap in `mergeResultsToCorpus` BEFORE `greedyPackCorpus`
   (and/or a collection-time quota), so no type exceeds ~40-50% of the chunk catalog. This is the upstream root of the
   90%-social themes.

**P1:**
4. **A4 em-dash on themes** — route themes synthesis output through `stripEmDashes` (or call it in the themes persist
   path) so the hard ban holds everywhere, not just slides.
5. **B3 missing images** — provide the artifact log; then fix the confirmed cause (likely empty carriers on the
   Gemini-cap path or an enable for the gated emotive branch).
6. **S7 dead VS text** — delete the stale `probability`/"VS DIRECTIVE BLOCK" lines from the breadth prompt
   (`geminiService.ts:1642`) — they instruct a non-existent field.

**P2:**
7. **A5 Gemini reliability** — the repetition-collapse + 491s shard argue for reverting artifacts/themes to Opus the
   moment the cap lifts (2026-07-01) — fold into the B1 single-flag revert.
8. **A7 wiki-hydration storm** — add a dependency/guard so themes.json hydrates once per change, not per render.
9. **S6 caching** — route the `geminiService` direct-SDK sites through proxy `/api/ai/gemini` to extend cache coverage
   to the dominant Gemini spend.

**P2/maintenance:** S9 reorder systemPrompt static-first (cross-engagement cache); S4 converge `citationResolver` to
the documented format; S10 fix the stale "18 templates" label; S12 pull type-scale/space tokens when an Enterprise PAT
is available; S15 confirm `precheck_orphan_export.py` registration; S14 open a real `.pptx` with python-pptx.

---

## E2. FIXES APPLIED + VALIDATED THIS SESSION (2026-06-29, on branch self-improvement-ia-2026-05-29)

- **B2 citation 404 — FIXED + VALIDATED LIVE.** `proxy/app.py wiki_read_article` now strips the `#cN`
  fragment before file resolution and best-effort slices the cited chunk (`_slice_chunk_from_article`).
  Validated on the rebuilt `:5012` against the exact URL from the live console: `#c3` -> HTTP 200 (was 404),
  returns the 14,643-char article + `chunkId:c3` + the 1,681-char chunk; base -> 200; bad `#c999` -> 200 full
  content no chunk; missing file -> 404. The WikiArticleViewer now OPENS (proven by the user's screenshot).
- **B1 routing — FIXED + TEST-LOCKED.** One canonical `OPUS_CAP_ACTIVE` flag in `aiRouter.ts`; `geminiService
  ._runBreadthShard` now skips the doomed Opus-first attempt while capped (was eating an HTTP 400 on every theme
  shard); `corpusChatService.ARTIFACT_DEFAULT_DURING_CAP` + `prototypeBuilder.CODE_MODEL` derive from the same
  flag. Post-cap revert = flip one boolean. Guard: `services/opusCapConvergence.test.ts` (5/5).
- **A4 em-dash false-failure — FIXED + TEST-LOCKED.** `deliverableScorer.ts` `em_dash_absent` counted ASCII
  hyphens (`/-/g`) and reported them as em-dashes (the live "1691 em-dash characters present" on clean themes,
  -20pt composite + bogus discriminator alarm). Now counts only the AI-tell dash family `[‒–—―]`, never the
  ASCII hyphen. Guard: `services/deliverableScorer.emdash.test.ts` (3/3).
- **S7 dead VS prompt text — REMOVED.** Deleted the orphaned `probability`/"VS DIRECTIVE BLOCK ABOVE" line in
  the themes breadth prompt (`geminiService.ts`) that instructed a field no longer in the schema.
- Gates: `tsc --noEmit` exit 0; full vitest 45 files / 394 + 8 new = green; proxy `ast.parse` OK.
- NOT live in the browser yet: B1/A4/S7 ride in the SPA bundle (`research-generator`) which needs a Docker
  rebuild to take effect; only the proxy (B2) was rebuilt. No commit (awaiting approval).

## E3. NEW P0 SCOPED THIS SESSION — deep-research source attribution loss (the "egregious" citation issue)

Standing rule (user, 2026-06-29; memory feedback_every_source_real_attribution_2026_06_29): EVERY cited source
MUST carry real per-type attribution (reddit subreddit+username / news outlet+headline+author / blog
platform+name+author). Provider-bucket / no-author citations are unacceptable and not credible.

**Root cause (mapped, NOT yet fixed):** `deepResearchService.ts` captures real `groundingChunks[].web ->
{url,title}`, but `researchFabricOrchestrator.ts:1017-1026` writes the synthesis doc as
`sourceName:"gemini (focused research)"`, `title:"AI Research (gemini): ..."`, no author; grounding-source items
(1061-1068) get `sourceName:'gemini'` not the publisher; `derived_from` (proxy app.py ~11477) keeps only opaque
vertexaisearch redirect URLs (titles dropped). So real attribution is available at fetch time and discarded.

**Fix design:** resolve each grounding redirect URL -> real URL; derive per-type attribution; persist structured
`resolved_sources:[{sourceName,title,author,kind,url}]`; citation resolution surfaces the real named sources,
never the provider bucket; the synthesis narrative is not itself a named citable source.

**BACKFILL — DONE + VALIDATED (2026-06-29).** Built a server-side resolver in `proxy/app.py`
(`_resolve_redirect_attribution` + `_derive_attribution` + `_extract_page_meta`: follow the grounding redirect ->
real URL; publisher from og:site_name > known map > domain stem; reddit -> r/sub + u/user; UTF-8-forced decode +
HTML-entity unescape + surrogate scrub + junk-title filter) and endpoint
`POST /api/deep-research/backfill-attribution` (dry_run/limit/path_contains/per_doc_cap). The vertexaisearch
grounding redirects STILL resolve (verified), so existing research is recoverable. Ran wiki-wide:
**25 deep-research docs updated, 391 real sources recovered, 0 remaining.** Verified on the screenshot's exact
article (`33aec05c8b.md`): "gemini (focused research)" now resolves to Dakota (Morgan Holycross), Deloitte
Insights, Boston Consulting Group, The WealthAdvisor with real titles; `resolved_sources` parses as valid JSON
(no surrogate breakage). Proxy rebuilt + healthy.

**FORWARD FIX — DONE.** The proxy `wiki_write_article` path now auto-runs `_resolve_redirect_attribution` for any
`method: deep-research` doc with `derived_from`, splicing `resolved_sources` into the frontmatter at write time
(single chokepoint, same resolver as the backfill). New runs persist real attribution automatically; no
`researchFabricOrchestrator` change needed. Full end-to-end forward proof needs a live deep-research run (the
resolver itself is validated; the write-path wiring is syntax-checked + shares the proven resolver).

**RENDER SURFACING — DONE + VALIDATED (viewer path).** `read-article` now parses + returns `resolvedSources`
(`_parse_resolved_sources`); validated live: the screenshot's `33aec05c8b.md` returns 16 real sources
(Dakota/Morgan Holycross, Deloitte Insights, BCG, The WealthAdvisor, ...). `WikiArticleViewer.tsx` renders a
"Grounded in N real sources" panel (publisher · author — linked title) above the body, so opening a citation now
shows the REAL named sources instead of only the "gemini (focused research)" chip. SPA rebuilt (tsc 0).

**STILL OPEN (smaller):** the themes-board CARD label still reads the baked `citations[].sourceName` from the
already-persisted themes.json ("Gemini Focused Research"); fully correcting the card text needs either a
render-time lookup of the article's `resolved_sources` by wikiPath or a one-time themes.json re-resolve. The
viewer (the click-through inspection surface) is corrected; the card chip is the remaining cosmetic.

## F. WHAT STILL NEEDS A LIVE RUN (not confirmable from code)
- B3 missing-images: the artifact generation log / rendered output.
- S14: open an exported `.pptx` with python-pptx (picture placeholders, `<a:blip>`, native auto-shapes, embedded fonts).
- S11: Figma node existence via Figma MCP against `iSQhAVM7SI4QHAWB7y9C2z`.
- S6 cache HIT on re-gen: send an identical deterministic request twice; confirm 2nd is `$0` hit.
