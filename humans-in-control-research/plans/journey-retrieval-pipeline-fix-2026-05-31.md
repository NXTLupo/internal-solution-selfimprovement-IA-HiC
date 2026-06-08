# Journey / Slides / Artifact Retrieval-Pipeline Fix Plan (2026-05-31)

Audit of the generated `#journey #slides` deck
(`internal-solutions-journeymapper/journey_maps/journey_map_da1564a5-2e76-4c66-9933-4bfbfa4b6e40.html`)
plus a fix plan for the knowledge-retrieval pipeline that feeds journey, slides, and every
artifact built off the chat/session corpus.

---

## 0. The one-sentence diagnosis

The journey/artifact path does NOT use the fixed `/api/wiki/fetch-articles` objective-keyed
retrieval. It POSTs a raw in-session corpus blob (research-fabric `fullCorpus` with a tri-model
synthesis prepended + serialized themes/personas JSON), the proxy blind-truncates it to the first
60 KB, and the journey-mapper analyzes whatever prose it receives with no goal-keyed selection. So
every quality failure below is a corpus-assembly failure, not a rendering failure.

---

## 1. Audit findings (evidence-backed, from the live deck)

### 1A. Knowledge-retrieval failures (root layer)
1. **The journey corpus bypasses the fixed retrieval entirely.** `CorpusChatPanel.tsx:6232-6281`
   assembles `corpusText` from uploads + `liveCtx.corpusText` + themes/personas/journey JSON, then
   POSTs it as `corpus` to `/api/journey-map/generate` (`:6509-6533`). It never calls
   `fetchWikiArticles`. The embedding-ranked chunk store (`.vectors.db`, 27k chunks) is never queried
   for the journey objective.
2. **The proxy blind-truncates to the first 60 KB.** `proxy/app.py:11641` `JOURNEY_MAPPER_MAX_CORPUS_BYTES
   = 60_000`; trim at `:12206-12214` takes the HEAD at a newline boundary, on the stated assumption
   "HiC already orders chunks by relevance." It does not re-order for the journey objective, so the
   head is whatever the fabric packed first — which is the synthesis preamble.
3. **The JM service does zero retrieval.** `dynamic_journey_mapper.py` head-slices items
   (`[:CLAUDE_MAX_DETAILED_ITEMS]` `:476`, `stages[:8]`/`pain_points[:5]`/`opportunities[:5]`
   `:552-554`) and analyzes them. No cosine, no rerank, no goal filter.
4. **Effective evidence base = 1-2 real sources.** Source Index (deck lines 345-348): r/personalfinance,
   r/careeradvice, Co-Op Technology Brief Deck (Northeastern), and "Tri-Model Synthesis" (not a
   source). None of the 189 newly-wired creative-AI sources, none of r/uxdesign / r/graphic_design,
   reached the deck.
5. **Off-objective corpus.** Two of the three real sources are unrelated subreddits; the third is the
   Northeastern co-op enterprise-platform brief. Movements Four-Six (deck lines 177-294) are almost
   entirely that co-op platform (Model Garden, NU SSO, Azure Content Safety), repurposed as a
   "designer workflow." The objective was AI design trends for creative teams.

### 1B. Generated-content gaps
6. **Synthesis cited as evidence.** `researchFabricOrchestrator.ts:2085` prepends `triModelSynthesis`
   to `corpus`; the JM model then cites "Source: Tri-Model Synthesis, Highlights / Gaps section" four
   times (deck 74, 245, 292, 348). This is the synthesis-citing-synthesis compounding loop that the
   wiki retrieval's `exclude_kinds:['synthesis']` was built to stop, reintroduced on the journey path.
7. **Leaked LLM artifact as a pull quote (CRITICAL).** Deck lines 73-74 render
   `"please provide the content of Part 2/3 of the research corpus."` as a voice-of-user quote. Origin:
   `triModelAnalysis()` (`researchFabricOrchestrator.ts:1873`) — one model slice returned a
   continuation/error string that got prepended verbatim and survived into the deck.
8. **OCR fragment-dumps as quotes.** Deck 198, 202, 209, 233, 280, 284 are concatenated slide-label
   fragments ("Pre - Built Agents Prompt Library Governance Tools Access (NU SSO)..."), not verbatim
   prose. Source: the co-op brief's bulleted diagram text passed through as "quotes."
9. **Generic conclusions.** Synthesis table opportunities (deck 310-329) are consulting boilerplate
   ("Revise hiring rubrics and KPIs", "Make human-in-the-loop review gates mandatory") with no named
   tools/benchmarks from the actual design domain.

### 1C. AI-slop / output-rule violations (full list from deck audit)
CRITICAL: (1) leaked "Part 2/3" quote; (2) "Tri-Model Synthesis" cited as source x4; (3) self-referential
"the corpus / the record / the material never answers" (deck 64, 70, 71, 76, 157); (4) literal
"Evidence gap:" rendered in the synthesis table (deck 327).
HIGH: (5) off-topic citations (r/personalfinance, r/careeradvice); (6) evidence base of 1-2 sources fails
the >=60% external on-topic floor; (7) OCR fragment-dumps as quotes.
MEDIUM: (8) sentence-fragment quotes (deck 105, 160, 167, 244, 291); (9) severity-stamp chrome in chips
("Pain, PERSISTENT and identity-shaking", deck 95/126/157/195/230/277); (10) process language
("stated gap", "the feedback", "forward signal flags").
LOW: (11) back half of deck answers a different (co-op) objective than the title.
PASSED: em-dashes (none), naked numbers (none), greeting meta-narration (none), banned slop words
(none in model prose), action-title craft (strong).

Total: 11 violations (4 CRITICAL, 3 HIGH, 3 MEDIUM, 1 LOW). Deck is NOT shippable.

---

## 2. Root-cause architecture map

```
RESEARCH FABRIC (researchFabricOrchestrator.ts)
  triModelAnalysis()  ── prepends a 3-model synthesis blob (can contain error/continuation strings)
        │                                  ↓ corpus = header + triModelSynthesis + sections
  fullCorpus ───────────────────────────────────────────────┐
                                                             │ stored verbatim
App.tsx  corpusTextRef.current  ◄──────────────────────────┘
        │
CorpusChatPanel  combinedCorpusParts = uploads + corpusText + themes JSON + personas JSON + journey JSON
        │  POST corpus: <raw blob>                ← NO /api/wiki/fetch-articles, NO goal rerank
        ▼
proxy /api/journey-map/generate  ── strip markers → BLIND HEAD-TRUNCATE 60KB (synthesis sits on top, always kept)
        ▼
JM dynamic_journey_mapper  ── head-slice items → analyze ALL of it (no retrieval, no rerank)
        ▼
DECK  ← off-topic + synthesis-as-evidence + leaked artifacts
```

The fixed retrieval (`/api/wiki/fetch-articles`: empty-path admission fix + objective-blended cosine +
`exclude_kinds:['synthesis']`) is bypassed on this whole path. Theme synthesis (geminiService) got the
fixes; the artifact path did not. This is the same gap flagged in
`project_hic_objective_supremacy_decontamination.md` ("the #journey/#artifact path bypasses it").

---

## 3. The fix plan (phased; each phase independently shippable)

Standing rules honored: objective-driven (no hardwired topics), cross-industry analogues preserved,
quality-first (raise upstream, never relax a gate), determinism for cached runs, test render not just 200.

### Phase 1 — Route the artifact corpus through the fixed objective retrieval (HIGHEST leverage)
The journey/blueprint/artifact corpus must be BUILT from `/api/wiki/fetch-articles` against the
objective, not from the raw session blob.
1. In `CorpusChatPanel.tsx` journey/blueprint path (and the artifact-engine paths), before POSTing,
   call `fetchWikiArticles({ query: goal, engagementGoal: goal, goalBlendWeight: 1.0, limit: 40,
   maxCharsPerArticle: 7000, includeSynthesis: false })` and build `corpus` from the returned
   article bodies + matched chunks. Fall back to the session corpus ONLY if retrieval returns empty.
2. Keep uploads (client docs) as a separate, clearly-labeled block (they are legitimately in-scope),
   but everything else (external evidence) comes from the objective-keyed retrieval.
3. Result: the journey is grounded in the on-objective slice (r/uxdesign, creative-AI sources, etc.),
   and the 60 KB truncation now trims the LEAST-relevant tail instead of dropping real sources.

### Phase 2 — Stop synthesis + artifacts leaking into any corpus (CRITICAL hygiene)
1. **Never prepend `triModelSynthesis` to the corpus that feeds downstream generation.** In
   `researchFabricOrchestrator.ts:2085`, keep the synthesis as a SEPARATE return field
   (`analysisSummary`) used for UI/insights, NOT concatenated into `corpus`. Generation must see
   primary sources only.
2. **Drop the serialized themes/personas/journey JSON from the journey corpus**
   (`CorpusChatPanel.tsx:6256-6258`) — those are prior deliverables (synthesis), not evidence. If the
   journey needs theme context, pass it as a labeled "PRIOR FINDINGS (context only, do not cite)"
   block the JM prompt is told never to cite.
3. **Harden `triModelAnalysis()`** (`researchFabricOrchestrator.ts:1890+`): validate each model slice
   before use — reject outputs that are continuation/error strings ("please provide", "Part N/M",
   "I cannot", empty, < N chars). A rejected slice contributes nothing rather than leaking.

### Phase 3 — Proxy + JM: objective-aware trimming and a citation allowlist
1. **Replace the blind 60 KB head-truncate** (`proxy/app.py:12206-12214`) with objective-keyed
   selection: if the corpus exceeds the budget, rank its blocks by cosine to the goal (reuse the
   chunk-store embed) and keep the top-budget, not the head.
2. **JM citation allowlist**: the JM prompt already forbids self-referential sourcing; add an explicit
   rule that every `Source:` must be a NAMED EXTERNAL source from the supplied corpus, and that
   "Tri-Model Synthesis", "Highlights", "Gaps section", "the corpus", "the record" are FORBIDDEN as
   citations. Add these to the proxy `_apply_brand_and_anti_slop` strip list as a deterministic
   backstop (regex-drop any quote block whose cite matches the banned set).

### Phase 4 — Deterministic post-processor backstops for the leaked-artifact class
Add to `proxy/app.py` artifact post-processing (and mirror in `slidePostProcessor.ts` for SPA decks):
1. Drop any `.nxt-quote` whose text matches LLM-artifact patterns ("please provide", "Part \d/\d",
   "as an AI", "I cannot", "content of the research corpus").
2. Strip self-referential corpus/record/material sentences (extend `PROCESS_REFERENCE_REWRITES`).
3. Strip "Evidence gap:" and severity-stamp chrome ("Pain, PERSISTENT", etc.) from visible text →
   move classification to `data-severity` attributes.
4. Reject quote blocks that are fragment-dumps (no terminal punctuation AND >3 capitalized label
   tokens) — these are OCR dumps, not quotes.

### Phase 5 — Evidence-floor gate for artifacts (quality-first, not relaxation)
1. Before an artifact renders, assert a minimum DISTINCT on-objective external-source count (e.g. >=5).
   If retrieval can't meet it, the fix is upstream (broaden retrieval angles / collect more sources),
   never relax the floor. Surface the shortfall to the user instead of shipping a 2-source deck.
2. Apply the domain-relevance gate (already built for themes/topics) to the journey's
   stages/pains/opportunities so off-objective (co-op) content is dropped, while cross-industry
   analogues that serve the objective are kept.

### Phase 6 — Fix source collection so the right corpus exists in the first place (furthest upstream)
1. Objective-driven subreddit/source selection: an AI-design goal must collect r/uxdesign,
   r/graphic_design, the creative-AI pack — not r/personalfinance/r/careeradvice. (The 189-source
   creative-AI pack is now wired; ensure pack selection actually drives collection.)
2. Scope/clear the Reddit-deep cache per engagement so a stale co-op cache can't serve an unrelated
   objective (the 253-stale-post cache-hit observed earlier).

---

## 4. Sequencing

| Phase | Theme | Leverage | Risk | Ship alone? |
|---|---|---|---|---|
| 1 | Artifact corpus via fixed retrieval | HIGHEST | med | yes |
| 2 | No synthesis/artifacts in corpus + harden tri-model | CRITICAL hygiene | low | yes — do with 1 |
| 3 | Objective-aware trim + JM citation allowlist | high | low | yes |
| 4 | Deterministic leaked-artifact backstops | high (safety net) | low | yes — do first, cheap |
| 5 | Evidence-floor + domain gate for artifacts | high | med | yes |
| 6 | Objective-driven collection + cache scoping | highest upstream | med | yes |

If only one ships: **Phase 1** (grounds artifacts in the on-objective slice). If two: **1 + 2**
(also stops the synthesis/artifact leak that produced the two CRITICAL defects). **Phase 4 is the
cheap deterministic safety net** and should land first so leaked artifacts can never reach a deck again
regardless of upstream state.

---

## 5. Verification (per phase, evidence not assertion)
- Regenerate the AI-design `#journey #slides` after each phase; diff Source Index (expect on-topic
  design sources, 0 "Tri-Model Synthesis", 0 leaked artifacts).
- Re-run the AI-slop audit (the 11-violation checklist above) — target 0 CRITICAL/HIGH.
- Cross-objective test: same corpus, a retail goal and a healthcare goal → on-objective journeys
  (proves no hardwiring, analogue-aware).
- Confirm em-dash/naked-number/banned-slop stays clean (already passing).
```
