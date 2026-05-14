# HiC Session Handoff — 2026-05-14 — Cost Savings + T4 Build-Only Iteration

**Read this FIRST if you are picking up the HiC cost-savings / brief-quality work.**

Status: mid-flight. Phase 1 shipped to disk but **NOT committed** and **NOT Docker-rebuilt** since the last set of brief-generator changes. Phase 2 (engagement resume UX) is fully designed but not coded. The user just raised a strategic critique that should be addressed before more code is written.

---

## TL;DR for the next Claude

1. **Stop and think before coding.** The user's open question (below) is a design-level critique of my "fall back to Opus" approach. Don't write more code until you've responded to it with a richer multi-model orchestration plan.
2. Everything shipped this session is on the local filesystem in branch `HiC-VS-HTML-Hashtag-UX` but UNCOMMITTED. Standing rule: never commit without explicit approval. Never merge to main. Never push to Shane's branch.
3. The Docker container at port 5011 was last rebuilt before the brief-generator hybrid changes. To see the hybrid + narrative gate live, rebuild: `docker compose -f /d/NXT-HUMANS_AI_CX_WORKBENCH/docker-compose-all.yml up -d --build research-generator`
4. Read `humans-in-control-research/services/prototypeBriefGenerator.ts` end-to-end before touching brief generation.
5. Read `humans-in-control-research/services/costMeter.ts` before changing pricing or instrumentation.

---

## The User's Open Question (CURRENT)

Verbatim:

> "if briefs are in danger of being too thin with GPT 5.5, why cant we build in more determinism related to length, detail, synthetic data, users represented, design, etc. Are you thinking about how we may improve consistency and maximizing our usage of GPT 5.5, Gemini 3.1, and the Flash model, in addition to just falling back to Opus 4.7?"

**They are right.** "Fall back to Opus" is the lazy answer. The user wants:

1. **Deterministic prompting** — replace ranges ("8-12 use cases", "150-280 chars") with single targets, anchor examples, and structured-outputs JSON schemas (`response_format: { type: 'json_schema', json_schema: { minItems: 8, maxItems: 8 } }`). Per the official guidelines: GPT-5.5 hits single-target lengths better than ranges; Opus 4.7 interprets instructions literally — give it exactness.
2. **Multi-model fan-out by capability** — different models win at different sub-tasks:
   - **Opus 4.7** — persona psychology, demonstrated_moment, narrative_arc, why_this_frame (narrative-rich)
   - **GPT-5.5** — use_cases, key_screens, ai_capabilities, feature_roadmap, interaction_choreography (structured)
   - **Gemini 3.1 Pro** — long-context synthesis when the source corpus is large
   - **Gemini 2.5 Flash** — seed_data records (cheap volume — generate 50+ realistic synthetic users/products/orders)
3. **Pre-anchor with synthetic data** — have Flash generate the seed records FIRST, then both Opus and GPT-5.5 deepen passes anchor to those records → consistency by construction. Anchored prompts are dramatically more deterministic.
4. **Verbalized Sampling within deepen** — k=3 candidates per persona / narrative_arc with verbalized probabilities, pick the lowest-probability one that meets the quality gate. This pulls divergent depth out of cheaper models without retrying.
5. **Reinforcement Inference for thin fields** — anchored re-ask with the verbatim prior output + uncertainty hint, instead of routing to a different model. Cheaper and often equivalent. (Skill: `reinforcement-inference`.)
6. **JSON schema enforcement** — GPT-5.5 supports `response_format: { type: 'json_schema' }` which enforces counts at the API layer. We currently use plain `json_object` mode which doesn't.
7. **Self-validation loop** — model scores its own output against a rubric, re-emits any field that scores below threshold. Skill: `score-prompt` exists.

**Available skills that operationalize this**: `verbalized-sampling`, `reinforcement-inference`, `constrain`, `lock-format`, `decompose`, `guard`, `score-prompt`, `stress-test`, `before-after`. The `decompose` skill is exactly the move the user is asking for — turn the monolithic deepen prompt into a multi-phase skill system with explicit handoffs.

**Recommended response shape**: present the user with a richer architecture (fan-out by capability + pre-anchored seed data + structured outputs + VS within deepen + RI for thin fields) with cost impact. Ask which levers to ship. DON'T just write more code.

**Likely revised cost model** (rough):
- Opus on narrative fields only (~25% of original Opus cost): ~$4-6
- GPT-5.5 on structural fields (full pass cheap): ~$3-5
- Flash on seed data (very cheap, high volume): ~$0.50
- Total Pass 2: ~$8-12 vs $15-22 all-Opus vs $4-7 all-GPT (with drift risk)
- AND seed data density 2-3× higher than either model alone
- AND structural counts hit deterministically via schema

---

## What's Shipped (on disk, NOT committed)

### Stage 5 Critic + Refiner JSON-truncation fix
**File**: `services/prototypeBuilder.ts`

The original Stage 5 was dying on max-tokens overflow (the user's last failing log showed `Unterminated string at position 57953`). The pipeline killed the whole build even though Stages 1-4 + 3.5 + 2.5 had succeeded.

Changes:
- Added `recoverTruncatedJson()` helper — walks JSON, balances bracket stack, closes unterminated strings, retruncates to last clean value close.
- Added `extractPartialCritique()` — regex extractor for verdict / summary / coverage_pct / sessions_passed/total as a last-resort fallback so prototype always ships.
- Bumped Stage 5 `maxOutputTokens` from 32K → 64K (matches Stage 3.5 / Stage 4).
- Tightened `STAGE_5_SYSTEM`: `corrected_code` only emitted on verdict=`refine` (not `rebuild` — pipeline ships original anyway, so it was 20K wasted tokens); `missing_piece` capped at ≤20 words; `issues[].description` ≤30 words; explicit ≤50K-token budget instruction.
- Wrapped the Stage 5 `tryParseJson` in try/catch; on parse failure runs `extractPartialCritique` and ships the prototype with a degraded-but-meaningful critique.

### Prompt-enhancement engine (5 surfaces)
**Files**:
- `services/promptEnhancer.ts` — Gemini-2.5-Flash-powered rewriter. Hashtag tokens extracted to sentinels, rewritten, restored verbatim. Five surfaces: `analyst | design | research-goal | revision | brief-customization`. Encodes 2026-Q2 OpenAI GPT-5.5 + Anthropic Opus 4.7 official prompting guidelines as a rubric.
- `components/PromptEnhancer.tsx` — `usePromptEnhancer()` hook + `<EnhanceButton>` + `<EnhancePreview>` reusable primitives.

Wired into:
- `components/CorpusChatPanel.tsx` — chat input (analyst surface) — bumped textarea rows 2→4, fontSize 11→12, minHeight 88px
- `design-desk/DesignDeskChat.tsx` — chat input (design surface) — rows 2→4, minHeight 96px
- `App.tsx` Research Goal field (research-goal surface) — was single-line `<input>`, now 4-row `<textarea>` minHeight 110px; 4-ingredient rubric (population, decision, scope, lens); placeholder upgraded with denser example
- `components/CorpusChatPanel.tsx` `PresentationLibraryGrid` (revision surface, line ~704) — artifact revision instruction field
- `components/CorpusChatPanel.tsx` `PrototypeLibraryGrid` (revision surface, line ~1421) — prototype revision instruction field
- `components/CorpusChatPanel.tsx` `ProductBriefCard` (brief-customization surface) — NEW expandable "Refine brief before building" slot; customization text threads into `concept` passed to `buildPrototype()` via new `customizationBlock` block in `handleApproveBrief()`
- `components/HeuristicBriefIntake.tsx` competitiveContext field (analyst surface) — was `<input>`, now `<textarea>` rows=3 with richer placeholder

### Subreddit suggester (separate flow — generates, not rewrites)
**Files**:
- `services/subredditSuggester.ts` — Gemini Flash generates 5-8 subreddit suggestions from research goal + uploaded file context. Returns `{ slug, rationale (≤15 words), estimated_signal: high|medium|low }`. System prompt: hard-rule never invent communities, lowercase no-`r/`-prefix, de-dupe vs existing.
- `components/SubredditSuggester.tsx` — `useSubredditSuggester()` hook + `<SuggesterButton>` + `<SuggesterPanel>` (split because the panel needs to render full-width below the input while the button sits inline with the label).

Wired into `App.tsx` Reddit Communities field area. Button right-aligned with the label; panel renders below the input when expanded with checkbox list + signal-dot colors (green/yellow/gray).

### Cost meter (Phase 1A + 1B — DONE)
**Files**:
- `services/costMeter.ts` — records every successful AI call. 2026-Q2 list pricing. Per-model + per-label tallies. Subscribers re-render on every call. Window-exposed at `__HIC_COST` for console inspection. Pricing table:
  - `gemini-3.1-pro-preview` $3.50 / $10.50
  - `gemini-2.5-flash` $0.30 / $1.20
  - `claude-opus-4-7` $15 / $75
  - `claude-sonnet-4-6` $3 / $15
  - `claude-haiku-4-5` $1 / $5
  - `gpt-5.5` $5 / $20
  - `gpt-5.4-mini` $0.25 / $2
  - `deepseek-v4-flash` $0.27 / $1.10
  - Thinking-budget tokens (Gemini `thoughtsTokenCount`) are summed into output count (billed as output).
- `services/aiRetryClient.ts` — instrumented at the single success path inside the retry loop. Calls `recordAICall({ label, model, response, durationMs })`. Wrapped in try/catch so meter failures never break a real call.
- `components/CostMeterChip.tsx` — fixed bottom-right chip. Hidden until first call. Click to expand by-model + by-label breakdown.
- Mounted in `App.tsx` at the top of the main render tree.
- `components/CorpusChatPanel.tsx` `handleApproveBrief()` — appends `summarizeRun()` to the final build chat message.

### Hybrid brief generator with narrative quality gate (Phase 1C — DONE)
**File**: `services/prototypeBriefGenerator.ts`

This is **the most strategically important change**, and also the one the user is now critiquing. Read it end-to-end before touching anything else.

Changes:
- Added `BRIEF_MODEL_GPT55 = 'gpt-5.5'` constant.
- Added `briefModelMode?: 'opus' | 'hybrid' | 'gpt'` to `BriefGenerationOptions`. Default: `'hybrid'`.
- Added `callGpt55Json()` — mirrors `callOpusJson()` interface. Uses `/api/ai/openai` endpoint via `aiRetryClient`. Uses `response_format: { type: 'json_object' }`, `max_completion_tokens`, `temperature: 0.9`. **NOT structured outputs** (`json_schema`) yet — that's part of the user's open critique.
- Added `assessNarrativeQuality(brief)` — returns `{ pass: boolean, missing: string[], score: 0-100 }`. Checks:
  - `primary_persona.context` ≥ 150 chars
  - `primary_persona.emotional_state` ≥ 50 chars
  - `primary_persona.pain_points` ≥ 3 items × ≥ 40 chars each
  - `demonstrated_moment` ≥ 200 chars
  - `narrative_arc` ≥ 3 beats with non-trivial user_moment + feeling lengths
- Added `NARRATIVE_REFINEMENT_SYSTEM` prompt + `refineNarrativeFieldsViaOpus(brief, conceptContext)` helper. Sends only the structural-locked + thin-narrative fields to Opus with explicit char-count targets per field. Returns just `primary_persona / demonstrated_moment / narrative_arc / why_this_frame`. Cost: ~25% of a full Opus deepen.
- Rewired Pass 2 loop:
  - `mode === 'opus'` → existing all-Opus path
  - `mode === 'gpt'` → all-GPT-5.5, no gate (accept narrative drift)
  - `mode === 'hybrid'` (default) → GPT-5.5 deepen, run narrative gate, if thin → Opus narrative-only refinement, merge narrative fields into brief, preserve GPT structural output, mark with `_narrative_refined` / `_narrative_gate_score`
- Added Opus retry fallback when hybrid/gpt HARD FAILS — better than skeleton-only fallback. Marks the brief with `_opus_fallback: true`.
- Completion log surfaces `pass2Refined` count.

**KEY POINT**: nothing in CorpusChatPanel currently sets `briefModelMode` — so the new hybrid path is on-by-default the next time `#proto` runs. The user has not yet opted in. The first thing they'll see when they trigger `#proto` is the hybrid path running. If they don't like it they can pass `briefModelMode: 'opus'` from `CorpusChatPanel#proto` handler. There's NO UI selector yet.

### Brief persistence helpers (Phase 1D — service layer DONE, wire-up NOT DONE)
**File**: `services/wikiService.ts` (appended at the end)

Added types + helpers:
- `EngagementBriefRecord`, `EngagementBriefsFile`, `EngagementManifest` interfaces
- `writeEngagementBriefs(slug, payload)` → writes `wiki/engagements/<slug>/briefs.json`
- `readEngagementBriefs(slug)` → reads back; returns null if missing
- `writeEngagementManifest(slug, partial)` → merges with existing if present; writes `wiki/engagements/<slug>/manifest.json`
- `readEngagementManifest(slug)` → reads back; returns null if missing
- `listEngagementManifests()` → lists all engagement dirs via `/api/wiki/list/engagements`, reads each manifest, returns sorted by `updated_at` desc
- `scoreGoalMatch(enteredGoal, manifestGoal)` → keyword overlap (4+ char tokens) with stopword filter; returns 0-1; min meaningful threshold 0.25

**NOT YET WIRED**: nothing in `CorpusChatPanel.tsx` calls `writeEngagementBriefs()` after the briefs are emitted. Need to find where `#proto` injects the brief chat message and add a fire-and-forget `writeEngagementBriefs()` call alongside.

The proxy endpoints `/api/wiki/{read,write,list}` already exist — no proxy changes needed.

---

## What's NOT Shipped

### Phase 1D wire-up (small remaining work)
- Find the `#proto` handler in `CorpusChatPanel.tsx` where the briefs chat message is emitted (after `generatePrototypeBriefs()` resolves).
- After successful emit, fire `writeEngagementBriefs(engagementSlug, { research_goal, brand, original_concept, briefs, brief_model_mode, cost_usd_at_generation })` — do not await; let it persist in the background.
- Also fire `writeEngagementManifest(engagementSlug, { research_goal, brand, cached: { briefs: { count: briefs.length, path: 'briefs.json', brief_model_mode } }, cost_usd_total })`.

### Phase 1E: Build + Docker rebuild + verify
Once Phase 1D wire-up is done:
```bash
cd /d/NXT-HUMANS_AI_CX_WORKBENCH/humans-in-control-research && npm run build 2>&1 | tail -10
docker compose -f /d/NXT-HUMANS_AI_CX_WORKBENCH/docker-compose-all.yml up -d --build research-generator 2>&1 | tail -7
HASH=$(curl -s http://localhost:5011/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
echo "Entry: $HASH"
curl -s "http://localhost:5011/$HASH" | grep -oE "(RUN COST|narrative_refined|writeEngagementBriefs|Brief Narrative Gate)" | sort -u
```

### Phase 2 (all NOT started)
Phase 2A — Engagement manifest writer wired at every major milestone:
- After research completes (themes + deliverables generated): write manifest with `cached: { themes, personas, deliverables }`
- After briefs: write manifest with `cached: { briefs }` (handled in Phase 1D wire-up if extended)
- After each prototype built (`handleApproveBrief`): append prototype id to `cached.prototypes.ids`

Phase 2B — IDLE-screen resume detection:
- On `App.tsx` IDLE mount + when `researchGoal` changes (debounced), call `listEngagementManifests()`
- For each manifest, compute `scoreGoalMatch(researchGoal, manifest.research_goal)`
- Surface matches scoring ≥ 0.25, sorted by score desc
- Cap at top 3-5 to avoid clutter

Phase 2C — Resume UX picker (the UI sketch I gave the user):
```
┌────────────────────────────────────────────────────────────┐
│  ⚡ 3 prior runs of this goal found                         │
│  ○ Fresh research          (full pipeline, est. $32-60)    │
│  ○ Reuse themes only       (skip synthesis, est. $26-48)   │
│  ● Reuse research + briefs (only build, est. $13-24) ◀──   │
│  ○ Reuse everything        (open prior artifacts, $0)      │
│  [ Resume engagement ]    [ Start fresh anyway ]            │
└────────────────────────────────────────────────────────────┘
```
Render below the Research Goal field when matches found. Tier choice writes to App state so downstream stages know what to skip.

Phase 2D — Cached brief library re-render in chat:
- On resume with tier T3+ → CorpusChatPanel mounts with a synthetic message containing the cached `ProductBriefsGrid` rendered against `briefs.json`
- Click Build → `handleApproveBrief(brief, meta, msgId)` runs exactly as if briefs had just been freshly generated. Stage 1 is already skipped via existing `approvedBrief` path. Stages 2-5 run.
- This is THE T4 killer mode: $13-24 per re-build vs $43-74 fresh.

Phase 2E — Build + Docker rebuild + smoke test full T4 flow.

---

## Cost Analysis Snapshot

### Current per-run cost (FRESH build, no cache, no hybrid yet activated by UI)

| Phase | Cost |
|---|---|
| Data collection (TriModel) | $0.50-1.50 |
| Themes Pass 1+2 | $2.20-4.00 |
| Personas, strategy, journey, gap, comp, blueprint, recommendations | $5-8 |
| Brief gen (Opus, 5 briefs × 32K output each) | **$15-22** ← dominant |
| Prototype builder Stages 2-5 (Gemini Pro, thinking budget burn) | $20-37 |
| Enhancers/suggester | ~$0.01 |
| **Total fresh build** | **$43-74** |

### Once hybrid+gate is the default (Phase 1C, shipped not yet UI-confirmed)
- Brief gen: ~$5-9 (~60% saving on the dominant line)
- **Fresh build: $32-60**

### Once T4 ships (Phase 2)
- Skip data collection + themes + deliverables + brief gen → reuse from `wiki/engagements/<slug>/*.json`
- Only run Stages 2-5 against a chosen cached brief (possibly with new customization tweaks)
- **Re-build cost: $13-24** vs $43-74 fresh
- 3-5 prototype variants for the price of one fresh build

### Worst case (Anthropic 504s × Opus retries + Stage 5 refine emitting corrected_code, all-Opus mode)
- Up to $80-120

### After addressing user's open critique (multi-model fan-out + determinism)
Rough sketch:
- Opus narrative-only fan-out: ~$4-6
- GPT-5.5 structural fan-out: ~$3-5
- Flash seed data fan-out: ~$0.50
- Sub-total: $7.50-11.50 brief gen
- **Fresh build: $30-55, with NO quality drop-off claim from Opus, AND 2-3× seed data density**

---

## Sentinel Strings (grep these in the served chunk to verify a build is live)

| String | What it proves |
|---|---|
| `extractPartialCritique` | Stage 5 truncation-recovery fix live |
| `recoverTruncatedJson` | Stage 5 truncation-recovery fix live |
| `research_goal_structure` | research-goal enhancer rubric live |
| `POPULATION / SUBJECT` | research-goal rubric live |
| `brief_customization_structure` | brief-customization enhancer rubric live |
| `revision_instruction_structure` | revision enhancer rubric live |
| `Suggest from goal` | subreddit suggester button label live |
| `Asking Gemini Flash for subreddit` | suggester loading state live |
| `RUN COST` | cost meter chip label live |
| `Brief Narrative Gate` | narrative quality gate in brief gen live |
| `narrative_refined` | brief-refinement marker live |
| `_pass2_failed` | brief skeleton-fallback marker live |
| `Refine brief before` | brief-customization expandable label live |

Bundle path: `http://localhost:5011/assets/index-XXX.js` where XXX is the entry hash visible in the page `<head>`.

---

## File Map of Recent Changes

| File | Status | What changed |
|---|---|---|
| `services/prototypeBuilder.ts` | EDITED | Stage 5 truncation recovery + token bump + tightened prompt |
| `services/promptEnhancer.ts` | NEW | 5-surface Gemini Flash rewriter |
| `components/PromptEnhancer.tsx` | NEW | Hook + button + preview primitives |
| `services/subredditSuggester.ts` | NEW | Gemini Flash subreddit recommender |
| `components/SubredditSuggester.tsx` | NEW | Hook + button + panel primitives |
| `services/costMeter.ts` | NEW | Per-call cost accounting |
| `services/aiRetryClient.ts` | EDITED | Instruments cost meter at success path |
| `components/CostMeterChip.tsx` | NEW | Floating chip + breakdown panel |
| `services/prototypeBriefGenerator.ts` | EDITED | Hybrid Pass 2 + narrative gate + Opus narrative refinement + Opus fallback on HARD FAIL |
| `services/wikiService.ts` | EDITED | Appended engagement-cache layer (writeEngagementBriefs, readEngagementBriefs, writeEngagementManifest, readEngagementManifest, listEngagementManifests, scoreGoalMatch) |
| `components/CorpusChatPanel.tsx` | EDITED | Larger textarea + Enhance button + Enhance preview in main chat; two revision enhancers; brief-customization slot in ProductBriefCard; customizationBlock threaded into pipeline concept; end-of-build cost summary line |
| `design-desk/DesignDeskChat.tsx` | EDITED | Larger textarea + enhancer wiring |
| `App.tsx` | EDITED | Goal textarea + enhancer + suggester + CostMeterChip mount |
| `components/HeuristicBriefIntake.tsx` | EDITED | competitiveContext as textarea + enhancer |

---

## Project Rules That Apply (from memory + CLAUDE.md)

- **Never commit without explicit approval.** During multi-task plan execution, stage files but do not commit until the user has tested each task's output. Even within a single session.
- **Never merge to main.** Branch FROM HiC-PPTX-Native (or other feature branches) to inherit recent HiC work. Main is months behind.
- **Sacred port 5011** for HiC. Never start `npm run dev` on :3000 for HiC changes — that's Social Research UI. Always rebuild Docker.
- **Test before handoff.** HTTP 200 is not enough. Verify the app actually renders + curl shell-check before telling the user it's working.
- **No emoji** anywhere — prompts, code, output. Breaks Power Automate JSON escaping; reads unprofessional.
- **No self-referential / meta language in outputs.** Never reference the deck, the research, or absence of evidence. Enforced at `services/slidePostProcessor.ts`.
- **Never guess — validate assumptions first.** Read code or ask before asserting. Label hypotheses as hypotheses.
- **Brand colors**:
  - NXT: black `#0D0D0D`, chartreuse `#B8B800`, cyan `#00B7C3`, teal `#115054`, rust `#CC6644`
  - NU: red `#C8102E`, near-black `#0D0D0D`
  - Use cyan `#00B7C3` for enhancer accents (chosen because it differentiates from chartreuse Send buttons).
- **Citation protocol**: real source names, ≥60% external, no generic "research/data/sources". Enforced at `services/slidePostProcessor.ts` PROCESS_REFERENCE_REWRITES.
- **Banned phrases (350+)** in `slidePostProcessor.ts` SLOP_PHRASES. Auto-corrective, not just detected.

## API Model IDs (current as of 2026-05)

- Opus: `claude-opus-4-7` (no date suffix) — brief generation Pass 1
- Sonnet: `claude-sonnet-4-6` (no date suffix) — fallback option
- Haiku: `claude-haiku-4-5-20251001` (REQUIRES date suffix)
- GPT: `gpt-5.5` — brief generation Pass 2 (hybrid mode)
- Gemini Pro: `gemini-3.1-pro-preview` — prototype Stages 2-5, themes, deliverables
- Gemini Flash: `gemini-2.5-flash` — enhancer, suggester, future seed-data fan-out

Note: claude-sonnet-4-6 does NOT support assistant message prefill (conversation must end with user message). claude-opus-4-7 DOES. Anything using a prefilled-continuation pattern must stay on Opus.

---

## Branch / Repo State

- Current branch: `HiC-VS-HTML-Hashtag-UX`
- Last committed work (per git log): `3c08258 fix(hic): brief generator anemic-fix + Anthropic endpoint restoration + v4 banner + Shane change log`
- All work in this session is UNCOMMITTED. Run `git status` to confirm the working tree state before doing anything destructive.
- The `CHANGES_FOR_SHANE.md` doc at the repo root tracks the v4 merge audit log for when this branch eventually goes to Shane for review. Update it when committing anything that matters to the upstream merge story.

---

## Recommended Next Moves

1. **Respond to the user's open critique** with a multi-model orchestration + determinism plan. Use this structure:
   - Acknowledge they're right that fall-back is the lazy answer
   - Propose fan-out by capability (Opus narrative / GPT structural / Flash seed-data)
   - Propose pre-anchored seed data (Flash generates 50+ records BEFORE deepen)
   - Propose structured-outputs JSON schema (enforces counts at API layer)
   - Propose VS within deepen (k=3 candidates per persona, pick lowest-prob meeting gate)
   - Propose RI for thin fields instead of Opus fallback
   - Quantify expected cost
   - Ask which levers to ship
2. **Do not write more code until the user picks a direction.** This is a design fork.
3. After alignment, finish Phase 1D wire-up (~10 lines in `CorpusChatPanel.tsx`), then Phase 1E checkpoint build, then Phase 2 in order.
4. The cost-meter chip should let you observe the savings empirically as each change ships.

---

## What NOT to do

- Do not commit without explicit approval.
- Do not run `npm run dev` for HiC — sacred port 5011 + Docker rebuild only.
- Do not silently change the default `briefModelMode`. It defaults to `'hybrid'` now; that change is on disk but the user has not seen it run yet. They should opt-in by name when they're ready.
- Do not delete or reset the wiki `engagements/` directory — once Phase 1D wire-up lands, the user's prior briefs will start persisting there and forming the foundation for T4. Treat the directory as user data.
- Do not address the user's open critique with code first. Respond strategically, get alignment, then code.

---

End of handoff. Good luck.
