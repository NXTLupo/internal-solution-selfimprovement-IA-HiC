# HiC Chunking and Output Quality Plan

> Goal (2026-05-23): Eliminate silent truncation across every HiC generator, every artifact, and every chat-driven hashtag deliverable. Replace the current mixed pattern (some generators chunk, most do not) with a uniform per-artifact chunking contract. Wire user feedback into the chunking decision so a "this is incomplete" signal demonstrably produces a deeper, fuller next attempt. No fallbacks, no compromises — every artifact ships at consulting-grade depth or fails loudly with diagnostics.

## Part 0 — Executive thesis in five sentences

The HiC pipeline ships some artifacts through 2-pass chunking (themes, personas, recommendations enrichment) and others through single-shot generation (chat-driven slides, PRD, strategy frame, gap analysis until 2026-05-22's 600K cap). Single-shot generation against Gemini 3.5 Flash silently truncates whenever a deliverable needs more than ~10-12K output tokens — exactly the bug the user just hit, where 4-5 of 20 requested case-study slides came back. The fix is not "raise maxOutputTokens" (it's already at 65K) — the fix is to **chunk every deliverable above ~5K-output-tokens-per-call at the structural unit the artifact is built from**: themes per topic, slides per theme, recommendations per pain point, gaps per capability. Each chunking strategy must compose with the existing self-improvement loops so that feedback signals like "incomplete" or "too short" durably increase chunk count for the same artifact type on future runs. The contract is: every artifact emits at its full structural target (e.g., 20 slides means 20 slides, not 4) or surfaces a diagnostic that names exactly which chunk failed and why — no truncation, no silent partial output, no fallbacks that mask a failure as a success.

## Part 1 — Model hard limits (verified against `services/aiRouter.ts`)

| Model | Provider | Context (in) | Output (out) | Cost in $/M | Cost out $/M | Where HiC uses it |
|---|---|---|---|---|---|---|
| Gemini 3.5 Flash | google | 1,000,000 | 65,536 | 1.50 | 9.00 | Default for `fast_agentic` (learning, verifier, compiler, Apply-now). Now also opt-in for chat. 13 deliverable-generator sites in `geminiService.ts` (since 2026-05-22) |
| Gemini 3.1 Pro Preview | google | 1,000,000 | 65,536 | — | — | Default for `research`, `fast_generation`, `vision`, `narrative_composition`. Chat-driven pipeline. Themes Pass 1 BREADTH + Pass 2 DEPTH (one-shot per theme) |
| Gemini 2.5 Flash | google | 1,048,576 | 65,536 | 0.30 | 1.20 | Image/video generation; utility paths (briefParser, subredditSuggester, dynamicPromptSuggestions, promptEnhancer, chatFeedbackExtractor); 2 image-model lines in `geminiService.ts` |
| GPT-5.5 | openai | 1,200,000 | 128,000 | — | — | Council mode (3-model consensus), TriModel research-fabric analysis |
| GPT-5.4 | openai | 1,050,000 | 128,000 | — | — | Vision fallback |
| GPT-5.4 Mini | openai | 400,000 | 128,000 | — | — | aiRouter `fast_generation` legacy |
| DeepSeek V4 Flash | deepseek | 256,000 | 8,192 | — | — | Council mode; legacy chat fallback (demoted 2026-05-07) |
| DeepSeek V4 Pro | deepseek | 256,000 | 8,192 | — | — | Council mode premium |
| Claude Opus 4.6 | anthropic | 200,000 (typical) | 8,192 (typical) | 15.00 | 75.00 | Wiki compiler Opus escalation, Apply-now Opus escalation, fallback for Gemini failures |
| Claude Haiku 4.5 | anthropic | 200,000 | 8,192 | ~1.00 | ~5.00 | Wiki contradiction detector, fallback parsers |

**Critical observations:**

1. **Output ceiling is the bottleneck, not context.** Every model gives 1M+ input tokens for context, but output tops out at 65K-128K tokens. A 20-slide JSON-fenced deliverable at ~500 tokens per slide = 10K tokens output — should fit, but only if the model is willing to emit that long a stream. Gemini Flash often stops well before maxOutputTokens on long outputs, especially when generating identical-structure repetitive content.
2. **DeepSeek V4 Flash has the smallest output cap (8K).** Any council-mode pass where DeepSeek participates is bounded by 8K output. Council synthesis must chunk if the consensus deliverable exceeds 8K.
3. **Opus and Haiku are 8K output for HiC's use** (typical Anthropic config — not the 64K extended modes). Apply-now Opus escalation will hit the 8K wall fast on big deliverables.
4. **No model in HiC's roster outputs more than 128K tokens in a single call.** Any deliverable estimated above 128K output tokens MUST chunk. Most deliverables that look complete to a consultant are actually 20-80K tokens.

## Part 2 — Current state audit

### Generators that already chunk (good)

| Generator | Chunking pattern | Location |
|---|---|---|
| `generateThemes` | Pass 1 BREADTH (one-shot Gemini 3.1 Pro) → Pass 2 DEPTH (per-theme enrichment). 18 themes × ~2-3K tokens enrichment each. | `geminiService.ts:765` |
| `generatePersonas` | Phase A roster (lightweight) → Phase B per-persona enrichment (one call per persona, 6 personas typical) | `geminiService.ts:1776` |
| `generateRecommendations` | Pass 1 + Pass 1B enrichment-of-thin-recs + Pass 2 Rumelt strategy frame | `geminiService.ts:2090` |
| `generateGapAnalysis` | Single Pass + Phase 2 thin-gap enrichment + Phase 2B actions/risks fill — added 600K evidence cap 2026-05-22 | `geminiService.ts:3651` |

### Generators that do NOT chunk (the failure surface)

| Generator | Current behavior | Failure mode |
|---|---|---|
| Chat-driven `#slides`+`#case study` (the user's bug) | Single-shot through `callGemini` with maxOutputTokens 65K. Asks for N slides, model truncates somewhere between 4 and N. | Silent truncation. The deliverable is partial, the user has to manually click Apply-now to retry, and even then the retry uses the same single-shot path. |
| Chat-driven `#presentations` | Goes through `composeSlideDeck` in narrative-composer; single LLM call with all slides at once | Same — truncates on long decks |
| `generateRoadmap` | Single-shot prompt | Truncates on long roadmaps with NOW/NEXT/LATER coverage |
| `generatePRD` | Single-shot with 16 Cagan/SVPG sections | Truncates around section 8-12 on dense PRDs |
| `generateStrategy` (Rumelt strategy frame) | Single-shot after recommendations | Diagnosis + Guiding Policy + 5-7 Coherent Actions — usually fits, but no chunking safety net |
| `generateBlueprint` (service blueprint) | Single-shot per persona × Bitner 5-component grid | Truncates on multi-persona blueprints |
| `generateCompetitiveAnalysis` | Single-shot + Phase 2 fill. 600K evidence cap added 2026-05-22 but no output chunking | The output side is still one shot |
| `generateTechArchitecture` | Single-shot C4 Context + Container | Truncates on complex architectures |
| `generateTechAudit` | Single-shot systems inventory | Truncates on > 8 systems |
| `generateJourneyMap` (`generateBlueprint` variant) | Single-shot Bitner blueprint | Truncates on multi-persona journeys |

### Side observations that matter

- The chat path (`sendChatMessage` → `callGemini`) is set to `maxOutputTokens: 65536` but that's the cap, not the typical output. Gemini Flash on long structured-content generation routinely stops at 8-12K tokens of its own accord (model behavior, not the cap).
- The two slug bugs from 2026-05-22 (collision between writer and reader) are now fixed and not in scope here.
- The Apply-now-via-handleSend fix shipped 2026-05-23 routes the re-attempt through the same chat-send path as the original — which means **Apply-now inherits the same single-shot truncation risk** unless we chunk at the chat-send level.

## Part 3 — Per-artifact chunking strategy

For each artifact, three things matter: the **structural unit** (the natural per-item building block), the **chunk size** (items per LLM call), and the **merge step** (how chunks combine into the final deliverable).

### 3.1 Slide decks (chat-driven `#slides`, `#case study`, `#presentations`)

This is the artifact that the user just hit. A request for "5 slides per theme × 4 themes = 20 slides" produces ~10K output tokens of dense JSON-fenced content. Gemini Flash stops around slide 4-5.

**Structural unit:** one slide (a single `:::slide ... :::` fence with one JSON object).

**Chunking strategy:**
- Detect deck size from the user's prompt: count slides via theme × per-theme math, OR allow explicit `#slides=20` directive.
- If estimated total > 6 slides, switch to chunked generation. One LLM call per **theme** (not per slide — theme is the natural cohesion boundary).
- Call N (=themes) in parallel via `Promise.all`. Each call asked for 5 slides of one theme, ~2.5K output tokens. Well under the soft stop limit.
- Merge: concatenate `:::slide` blocks in theme order, prepend a 1-paragraph deck intro that summarizes the cross-theme arc.

**Validation:**
- Count emitted `:::slide` blocks after each call. If a chunk returns < expected slide count, that single chunk auto-retries (not the whole deck).
- After merge: if total < 90% of target slide count, the deliverable is flagged "incomplete" with the missing-theme breakdown surfaced to the user.

**Code location:** new file `services/slideDeckChunker.ts` invoked from the chat hashtag router when `#slides` is detected with implied count > 6.

**Estimated output tokens after fix:** 4 themes × 2.5K = 10K total, but produced in parallel under the per-call truncation threshold. Latency stays similar to one-shot (parallel calls).

### 3.2 Themes (`generateThemes`)

Already chunked: Pass 1 BREADTH (one-shot) + Pass 2 DEPTH (per-theme enrichment). Mostly works.

**Improvements:**
- Pass 1 BREADTH currently emits up to 20 themes in one call (Gemini 3.1 Pro can handle this for now). If a future corpus produces 30+ themes, Pass 1 itself will truncate. Add a "Pass 1 chunked" mode: split the corpus into 2-3 angle-views (the multi-angle retrieval already does this) and emit themes per angle, then dedup.
- Pass 2 DEPTH already runs per-theme. Already chunked.

**Validation:**
- If Pass 1 returns < `min_themes` for the corpus size (heuristic: 12 themes per 200 corpus chunks), trigger a Pass 1B "find more themes" call with the already-found themes as exclusion set.

### 3.3 Personas (`generatePersonas`)

Already chunked: Phase A roster + Phase B per-persona enrichment. Mostly works.

**Improvements:**
- Phase A roster currently emits 3-5 personas in one call. Output is small (~3K tokens). No chunking needed there.
- Phase B enrichment is already per-persona (one call per persona × 6 personas typical). Sequential currently — switch to `Promise.all` for parallelism (4-6x latency improvement, no token-cap risk since each enrichment is ~5-8K output).

**Validation:** existing `verbalizedConfidence` check stays. Add a "persona has all 14 required fields" structural check after Phase B.

### 3.4 Recommendations (`generateRecommendations`)

Already chunks via Pass 1 + Pass 1B + Strategy Frame. Single-shot Pass 1 emits all recs at once.

**Improvements:**
- Pass 1 currently emits ALL recommendations in one call. For corpora that produce 12+ recs, this truncates around rec 8-10.
- Switch to chunked Pass 1: cluster the pain points (from themes + personas) into 3-5 problem clusters. Generate recommendations per cluster in parallel. Merge.
- Pass 1B already handles thin recs individually — keep.
- Pass 2 Rumelt strategy frame is small enough to stay single-shot.

**Validation:** "if recs count < problem count, surface gap" — already partially implemented.

### 3.5 Roadmap (`generateRoadmap`)

Currently single-shot. NOW/NEXT/LATER × per-horizon initiatives. Frequently truncates around the LATER horizon.

**Chunking strategy:** one call per horizon. Three calls in parallel (NOW, NEXT, LATER). Merge with cross-horizon dependency check.

**Output tokens per call:** ~5-8K. Total: ~15-24K. Parallel = roughly same latency as one-shot.

**Validation:** every horizon has ≥ 2 initiatives, every initiative has all required fields (success metric, owner, dependencies, strategic theme, confidence level).

### 3.6 PRD (`generatePRD`)

Single-shot 16-section Cagan/SVPG output. Frequently truncates around section 10-12 (Pricing Strategy / Go-to-Market / Success Metrics).

**Chunking strategy:** 4 chunks by section family:
1. Problem (sections 1-4: Problem statement, target users, value prop, business outcomes)
2. Solution (sections 5-8: Solution vision, key features, user journeys, technical approach)
3. Execution (sections 9-12: Pricing, GTM, success metrics, launch plan)
4. Risk (sections 13-16: Risks, dependencies, alternatives considered, decision log)

Parallel generation, then a final coherence pass that reads all four and writes the executive summary.

**Validation:** all 16 sections present, every section ≥ 100 words.

### 3.7 Service Blueprint (`generateBlueprint`)

Bitner 5-component model × N personas × M journey stages. Currently single-shot for the whole grid.

**Chunking strategy:** one call per persona. Each emits the full 5-component blueprint for that persona's primary journey. Merge into a cross-persona comparison matrix.

**Output tokens per call:** ~4-6K. Total: 4-6 personas × 5K = 25-30K. Parallel.

### 3.8 Journey Map (`generateJourneyMap`)

Per-stage activities + emotions + pain points + opportunities + supporting evidence. Single-shot today.

**Chunking strategy:** one call per journey stage (typically 5-7 stages). Parallel. Each stage emits its full activity/emotion/pain/opp set with citations.

### 3.9 Gap Analysis (`generateGapAnalysis`)

Already capped at 600K evidence input (2026-05-22). Output still single-shot. Truncates around gap 5-6 on rich corpora.

**Chunking strategy:** one call per capability domain. The themes naturally cluster into 4-6 domains (people, process, technology, data, governance, strategy). Generate gaps per domain in parallel. Merge into a single risk register.

### 3.10 Tech Audit (`generateTechAudit`)

Systems inventory × integration map × capability matrix × consolidation opportunities. Currently single-shot.

**Chunking strategy:** two-pass:
- Pass 1: produce the systems inventory (just the list with one-line descriptions) — small output.
- Pass 2: for each system in the inventory, generate its full audit entry (risk, consolidation opportunity, integration list) in parallel.

### 3.11 Tech Architecture (`generateTechArchitecture`)

C4 Context + Container levels with N nodes + M edges. Single-shot today.

**Chunking strategy:** Context first (one call, small output), then Container per major node (parallel). Merge into a single C4 specification.

### 3.12 Competitive Analysis (`generateCompetitiveAnalysis`)

Already has 600K evidence cap. Single-shot output. Truncates on long peer-comparison matrices.

**Chunking strategy:** one call per peer (typically 4-6 named peers). Each emits the full multi-dimension comparison for one peer. Merge into the matrix.

### 3.13 Strategic Report / Whitepaper

McKinsey-format whitepaper with 20+ sources, case studies, social evidence, mandatory section manifest. Currently single-shot.

**Chunking strategy:** section-by-section. The strategic-report-writer skill defines the section manifest dynamically based on available deliverables. Generate each section in its own call. Merge with a final coherence pass.

### 3.14 Knowledge Graph synthesis (background chain)

Already runs sequentially through the KG Auto-Synthesis chain. The chain itself IS the chunking — each deliverable type is its own call. No further chunking needed at the chain level; per-deliverable chunking (per items above) is what matters.

### 3.15 Prototypes (#proto pipeline)

Five-stage pipeline already chunked by stage: brief → research → visual direction → catalog injection → prototype coder → deepen. Each stage is its own call. No further chunking needed at the pipeline level; the coder stage's output is HTML which can grow large but the proxy doesn't artificially cap it.

**Improvement:** the coder stage (Stage 4) emits a full HTML page. For complex prototypes (3+ interactive components) this can hit 30K+ output tokens. Add a "scaffold first, fill components" two-pass: Pass 1 produces the page shell + named component slots, Pass 2 fills each slot in parallel.

## Part 4 — Pipeline-wide infrastructure

Four new pieces of shared code support every per-artifact chunker.

### 4.1 `services/chunkDispatcher.ts` (new)

Generic chunk-and-merge orchestrator. Every per-artifact chunker calls into this. Reduces duplication.

```ts
export interface ChunkPlan<TInput, TChunkResult, TFinal> {
    /** Split the input into N chunks. Each chunk is one LLM call's worth. */
    split: (input: TInput) => Array<{ id: string; payload: any }>;
    /** Generate one chunk's output. Called once per chunk. */
    generate: (chunkId: string, payload: any) => Promise<TChunkResult>;
    /** Merge all chunk results into the final deliverable. */
    merge: (results: TChunkResult[]) => TFinal;
    /** Validate the final merged output. Throws if structurally incomplete. */
    validate: (final: TFinal) => { ok: boolean; failures: string[] };
    /** Per-chunk retry budget. Defaults to 1 retry per chunk. */
    perChunkRetries?: number;
    /** Parallelism cap. Defaults to 6 (well under most provider rate limits). */
    parallelism?: number;
}

export async function runChunked<TI, TC, TF>(
    plan: ChunkPlan<TI, TC, TF>,
    input: TI,
): Promise<{ ok: boolean; result?: TF; failures: string[]; perChunkResults: Array<{ id: string; ok: boolean; error?: string }> }>;
```

The dispatcher logs every chunk to `wiki/log.md` so the operator can see exactly which chunk in which artifact succeeded or failed. No silent partial output — if any chunk fails after retries, the user gets a structured diagnostic, not a half-deliverable.

### 4.2 `services/outputCompletenessValidator.ts` (new)

Heuristics to detect truncated output BEFORE it reaches the user.

Checks:
- JSON output: if the response ends mid-property or mid-array (unbalanced braces/brackets after the JSON-repair pass), flag as truncated.
- Markdown output with `:::slide` fences: if the last fence is unclosed, or the count of `:::slide` openers > `:::` closers, flag.
- Numbered list output: if the prompt asked for "N items" and fewer than `0.9 * N` numbered entries appear, flag.
- Sentence-level: if the response ends mid-sentence (no `.!?` and last token isn't a closing punctuation), flag.

Every generator's caller runs this validator before declaring success. Truncation is now a known concept, not a silent failure.

### 4.3 `services/chunkBudgetCalculator.ts` (new)

Given an artifact type, expected item count, and target model, returns the recommended chunk plan. Encapsulates the table from Part 3 in code.

```ts
export function calculateChunkPlan(opts: {
    artifactType: 'slides' | 'themes' | 'personas' | 'roadmap' | 'prd' | 'blueprint' | 'journey' | 'gap' | 'tech-audit' | 'architecture' | 'competitive' | 'report' | 'prototype';
    expectedItemCount?: number;
    targetModel?: string;
    userFeedbackSignals?: { incomplete?: boolean; tooShort?: boolean; bumpChunkCount?: number };
}): { chunkCount: number; perChunkItemCount: number; parallelism: number; rationale: string };
```

Default values come from Part 3's table. Feedback signals push the chunk count higher. If a user said "too short" on a previous run of the same artifact type, `bumpChunkCount > 0` and chunks per artifact go up.

### 4.4 `services/chunkTelemetry.ts` (new)

Persists per-chunk results to `wiki/synthesis/chunk-telemetry.jsonl`. Each record:
- Artifact type
- Chunk id
- Tokens-in, tokens-out, latency
- Truncation flag (from completeness validator)
- Final outcome (ok / retried / failed)

The learning engine reads this monthly to derive:
- Which artifact types truncate most often
- Which chunk sizes correlate with truncation
- Which models truncate at what output sizes

Feeds back into `chunkBudgetCalculator` defaults.

## Part 5 — Skill upgrades

Each of the 11 artifact skills under `.claude/skills/` gets a new frontmatter section: `chunking`. The format:

```yaml
---
name: roadmap-builder
version: 1.1
chunking:
  strategy: per-horizon              # one of: per-item, per-theme, per-section, per-horizon, single-shot
  unit: horizon                      # the structural unit (used by chunk dispatcher)
  expected_chunk_count: 3            # NOW + NEXT + LATER
  parallelism: 3                     # safe to run all in parallel
  per_chunk_output_budget: 6000      # tokens
  merge_step: dependency-resolution  # how to combine
  truncation_floor: 0.9              # 90% of expected items must arrive or the artifact is flagged incomplete
description: ...
---
```

The chunker reads this frontmatter when invoking the skill so the chunking decision lives WITH the skill, not scattered in generator code. New skills inherit a default profile (single-shot, fail-loud) that they explicitly override.

Update all 11 artifact skills:
- `roadmap-builder`: per-horizon, 3 chunks
- `persona-architect`: per-persona, 6 chunks (matches existing Phase B)
- `theme-analyst`: per-theme depth + single-shot breadth (matches existing Pass 1/2)
- `recommendation-architect`: per-problem-cluster, 3-5 chunks (NEW)
- `prd-compiler`: per-section-family, 4 chunks (NEW)
- `service-blueprint-mapper`: per-persona, 4-6 chunks (NEW)
- `gap-analysis-evaluator`: per-capability-domain, 4-6 chunks (NEW)
- `tech-audit-inspector`: 2-pass inventory-then-detail (NEW)
- `tech-arch-generator`: context-then-container-per-node (NEW)
- `competitive-analyst`: per-peer, 4-6 chunks (NEW)
- `strategic-report-writer`: per-section, dynamic count (NEW)
- `deck-narrative-composer`: per-theme, dynamic count (NEW)
- `experience-prototype-composer`: scaffold-then-component-fill (NEW)

## Part 6 — Feedback-aware chunking

The user's "Apply now with feedback" path now re-fires the original prompt. The chunking layer reads the feedback text and adjusts.

### 6.1 Feedback classification (extends `chatFeedbackExtractor.ts`)

Two new signal types:
- `incomplete_output` — feedback mentions "truncated", "cut off", "stops at", "only got N of M", "missing slides", "didn't finish"
- `too_short` — feedback mentions "more depth", "more detail", "needs more", "expand", "too brief"

These signals carry an artifact-type tag.

### 6.2 Chunk-bump rule

When `chunkBudgetCalculator` is called with `userFeedbackSignals.incomplete` or `userFeedbackSignals.tooShort`:
- `incomplete`: chunk count × 1.5 (rounded up), per-chunk output budget × 1.3
- `too_short`: chunk count × 1.0, per-chunk output budget × 1.5

The bump only applies to the IMMEDIATE re-attempt by default. If the same artifact type accumulates 3+ `incomplete` signals across sessions, the bumped chunk count is promoted to the SKILL's frontmatter `expected_chunk_count` via the learning engine (Phase 3 routing rule already exists — this is a new routing target: `chunk-config`).

### 6.3 Persisted chunk config

`wiki/synthesis/chunk-config.json` accumulates per-artifact-type chunk overrides learned from feedback. Loaded at the top of every generation and merged with the skill defaults.

### 6.4 User-facing acknowledgment

When Apply-now re-fires with bumped chunks, the FeedbackReceipt now says:

> Applied: "only got 5 of 20 slides last time"
> Action: bumped slide deck chunks from 4 → 6 for this run. Generating in parallel.

So the user sees the system is responding to the specific signal, not just regenerating.

## Part 7 — No-fallback principle

The current pipeline has several silent-fallback paths that mask failures. These get hardened.

### 7.1 Silent fallbacks that must end

| Site | Current behavior | New behavior |
|---|---|---|
| `generateThemes` "Pass 1 Pro failed, falling back to chat-session Flash → GPT chain" | Silently falls back; user sees themes without knowing Pass 1 failed | Show a "Theme synthesis fell back to secondary model — review for depth gaps" notification in the Reasoning Stream |
| `generateRecommendations` "auto-retrying" on validation failures | Silently retries once and ships whatever comes back | Surface "Recommendations regenerated 2x for completeness; flagged sections: …" |
| Gap-enrichment "non-blocking" catch-all | Silently absorbs enrichment failures | Log enrichment failures per gap so the user knows which gaps are thin |
| TriModel OpenAI 429 | Silently drops to 2-model consensus | Surface "Council ran on 2/3 models (OpenAI rate-limited); confidence reduced" |
| `applyRegeneration` silent failure on parse error | Returns `result.ok = false` with vague error | Return structured diagnostic with the partial output and a "click to retry on Opus" affordance |

### 7.2 The new failure contract

When any chunked artifact run cannot produce all chunks, the system MUST:

1. Persist what it has (no data loss)
2. Surface a structured failure card in the chat: which chunks failed, why, what to do
3. Offer three actions: "Retry the failed chunks", "Ship as partial and continue", "Cancel and revise the prompt"

No more silent partial deliverables that look complete but aren't.

## Part 8 — Phased delivery

Six phases. Each independently shippable.

### Phase 1: Shared infrastructure (3-4 days)
- Build `chunkDispatcher.ts`, `outputCompletenessValidator.ts`, `chunkBudgetCalculator.ts`, `chunkTelemetry.ts`
- Add `chunking` frontmatter to all 13 artifact skills (defaults only)
- Wire telemetry to `wiki/synthesis/chunk-telemetry.jsonl`
- Verify: existing pipeline keeps working (no behavioral change yet)

### Phase 2: Slide deck chunker (1-2 days, highest user impact)
- Build `services/slideDeckChunker.ts`
- Wire into the chat hashtag router for `#slides`, `#case study`, `#presentations`
- Detect deck size from prompt; switch to chunked mode at > 6 slides
- Verify by re-running the user's "5 × 4 = 20 slides" prompt — should produce all 20

### Phase 3: PRD + Roadmap + Service Blueprint chunkers (3 days)
- Three highest-impact non-chat deliverables that currently truncate
- Wire each through `chunkDispatcher`
- Per-skill chunking config in frontmatter

### Phase 4: Gap + Competitive + Tech Audit + Tech Arch chunkers (3 days)
- Remaining single-shot generators
- Each gets its per-artifact chunking strategy per Part 3

### Phase 5: Feedback-aware chunk-bump (2 days)
- Extend `chatFeedbackExtractor` with `incomplete_output` + `too_short` classifiers
- Wire to `chunkBudgetCalculator`
- Persist `wiki/synthesis/chunk-config.json` overrides
- FeedbackReceipt shows chunk-bump action
- Learning engine: `incomplete_output` cluster (3+) promotes the chunk-bump to skill frontmatter

### Phase 6: No-fallback hardening (2 days)
- Convert the 5 silent-fallback sites in Part 7.1 to surfaced diagnostics
- Build the failure-card UI for partial-chunk failures
- Update wiki/log.md format to include per-chunk telemetry

### Total: ~14-16 days

## Part 9 — Verification protocol

After each phase, verify with one of these tests:

| Phase | Test |
|---|---|
| 1 | Send a single-artifact prompt that previously truncated (e.g., 20-slide deck). Confirm `chunk-telemetry.jsonl` records the run with `truncation: true` even though current code still produces partial output. Telemetry is the foundation for everything later. |
| 2 | Send the "5 slides per theme × 4 themes = 20 slides" prompt. Confirm 20 fully-formed `:::slide` fences in the output, no truncation, total latency under 60s (parallel 4 themes). |
| 3 | Generate a roadmap with all 3 horizons populated, ≥ 2 initiatives per horizon. Generate a PRD with all 16 sections present. Generate a service blueprint for 3+ personas with the full 5-component grid per persona. |
| 4 | Generate a gap analysis with ≥ 6 capability gaps across ≥ 4 domains. Generate a competitive analysis with ≥ 4 named peers and the full comparison matrix. |
| 5 | After phase 2 produces 20 slides successfully, give feedback "needs more depth per slide". Confirm the next run shows the FeedbackReceipt bumping the `per_chunk_output_budget` and producing visibly denser slides. |
| 6 | Trigger an OpenAI 429 mid-run (rate-limit). Confirm the council-mode response shows "2/3 models" diagnostic instead of silently shipping a 2-model result. |

## Part 10 — What this plan deliberately does not change

| Rejected | Why |
|---|---|
| Switch all generators to GPT-5.5 (128K output) | Cost prohibitive; chunking gets us the same outcome at 1/10th the cost on Flash |
| Build a streaming UI that shows slides as they're generated | Out of scope; chunking gives complete output, UI work is a separate uplift |
| Replace Gemini Flash with Opus for deliverables | Cost prohibitive ($75/M output vs $9/M); chunking + verifier already gets us frontier-grade output on Flash |
| Add a separate "deep mode" toggle | Implicit per-artifact via feedback signals is better UX |
| Auto-regenerate on truncation without telling the user | Violates the no-silent-fallback principle; user must see what happened |

## Part 11 — Open questions to verify before phase 2

1. **Gemini Flash 3.5 actual soft stop on long structured outputs:** I claim it stops around 8-12K tokens on repetitive structured content even with maxOutputTokens 65K. Confirm via direct test — send a "generate 30 identical-format JSON objects" prompt and measure where it stops. If it actually goes to 65K, the slide deck failure had a different cause and we need to dig into stream handling.
2. **Council mode under chunking:** can `runCouncilSynthesis` itself be chunked? If a council pass exceeds 8K (DeepSeek's cap), we need to either drop DeepSeek for chunked passes or chunk the synthesis as well.
3. **`responseSchema` and `responseMimeType: application/json` interaction with output budget:** does strict-JSON mode reduce or increase the effective output budget? Some providers shorten output under strict-schema constraints.

These need direct empirical measurement before phases 2-4 land. Phase 1 (telemetry) is the prerequisite — it gives us the data.

## Sources / current-state references

- `services/aiRouter.ts:161-201` — model registry (verified table in Part 1)
- `services/geminiService.ts:765` — `generateThemes` (Pass 1 + Pass 2 — already chunked)
- `services/geminiService.ts:1776` — `generatePersonas` (Phase A + Phase B — already chunked)
- `services/geminiService.ts:2090` — `generateRecommendations` (Pass 1 + 1B + Rumelt — partially chunked, recs themselves are single-shot)
- `services/geminiService.ts:3651` — `generateGapAnalysis` (600K evidence cap added 2026-05-22, output still single-shot)
- `services/geminiService.ts:3941` — `generateCompetitiveAnalysis` (same as gap)
- `services/corpusChatService.ts:3045-3145` — `callGemini` (maxOutputTokens 65536, no chunking)
- `services/feedbackRegeneration.ts` — Apply-now path (now re-fires through `handleSend`, inherits chat-send truncation risk)
- `components/CorpusChatPanel.tsx:6505` — Apply-now handler (re-fires through `handleSend` post-2026-05-23)
- `.claude/skills/*/SKILL.md` — 49 skill files (chunking frontmatter to be added per Part 5)
- The user's 2026-05-22 failure (20-slide deck → 4 slides delivered) — drives Part 3.1 and Phase 2 urgency
