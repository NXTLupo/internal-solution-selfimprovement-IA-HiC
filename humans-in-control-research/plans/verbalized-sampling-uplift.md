# Verbalized Sampling Uplift Plan for Humans in Control

> Source: Zhang, Yu, Chong, Sicilia, Tomz, Manning, Shi. *Verbalized Sampling: How to Mitigate Mode Collapse and Unlock LLM Diversity.* arXiv:2510.01171v3, Oct 2025. PDF at `.claude/skills/intelligence/2510.01171v3.pdf`.

## Why our outputs feel stale (the diagnosis the paper hands us)

The paper proves something important: aligned LLMs (every model we use — Gemini 3.1 Pro, Claude Opus, GPT-5.5) are mode-collapsed by construction, not by configuration. Post-training (SFT + RLHF + DPO + RLVR) bakes in **typicality bias** from human preference annotators who systematically prefer familiar, fluent, schema-consistent text. The collapse is not a bug in any one model — it is the inherent equilibrium of the alignment objective.

Empirical numbers from the paper:

| Stage | Direct-prompt diversity on poems |
|---|---|
| Base Llama-3.1-70B (pre-alignment) | 45.4% |
| Tulu-SFT-70B | 20.8% |
| Tulu-DPO-70B | 10.8% |
| Tulu-Final-70B (post-RLVR) | similar |

The aligned models RETAIN the diversity learned during pretraining — they just refuse to surface it under a normal instance-level prompt because the alignment process collapsed the conditional distribution toward the modal "safe" answer.

**Verbalized Sampling (VS)** is a training-free, inference-time prompting technique that recovers ~66.8% of the base model's pretraining diversity by asking the model to **emit a probability distribution over k candidate responses** rather than a single answer. Different prompts collapse to different modes — an instance-level prompt collapses to the mode joke; a distribution-level prompt collapses to a *distribution that approximates the pretraining distribution*.

The mechanism: forcing the model to write `"Probability: 0.07"` next to a candidate response is what compels it to commit to non-modal completions. The act of verbalizing the probability distribution is the unlock — list-level prompts ("give me 5") do not work as well because they collapse to a *uniform* distribution of the most typical 5 items.

## Three VS variants the paper validates

| Variant | Calls × candidates | Use when |
|---|---|---|
| **VS-Standard** | 1 call × k candidates with probabilities | Default — single-shot creative generation. 1.6-2.1× diversity over Direct. |
| **VS-CoT** | 1 call × k candidates, model first reasons step-by-step about the distribution | When you want diversity AND highest quality. Pareto-front winner on creative-writing tasks. |
| **VS-Multi** | N/k turns × k candidates, each turn explicitly asked for items distinct from prior | When k is small and you need to layer divergent generations across calls. Best for synthetic-data generation and dialogue simulation. |

**Diversity tuning**: ask for `probability < 0.10` (moderate diversity) or `probability < 0.01` (tail sampling, extreme diversity). The lower the threshold, the more the model is forced to skip the obvious and surface the un-typical.

**Emergent scaling**: bigger models (Gemini 3.1 Pro, Claude Opus, GPT-5.5) benefit ~1.5-2× more from VS than smaller models. Our default stack is exactly the regime where VS pays off most.

**Quality stays intact**: VS-Standard maintains quality vs. Direct; VS-CoT *improves* both diversity AND quality on Pareto-optimal runs.

**Cost**: VS-Standard with k=5 in 1 call ≈ same total tokens as Direct ×5 (so no compute regression). VS-CoT and VS-Multi cost more but produce more.

## HiC pipeline audit — where mode collapse is killing creativity

Every box below is a place HiC asks an LLM to synthesize, ideate, or recommend. Each is a candidate for VS. I've ranked them by leverage (how much creative downstream depends on the output) and by the symptom severity the user has actually flagged.

| # | Touchpoint | File / function | Current state | Diversity impact | Leverage |
|---|---|---|---|---|---|
| 1 | **Theme synthesis** | `services/geminiService.ts` → `generateThemes()` Pass 1 BREADTH | 1 Gemini call, "produce 15 themes" — list-level prompt | Themes are the foundation. Mode collapse here means same ~10 obvious themes ("system fragmentation", "manual workarounds", "data silos") show up every run regardless of industry/segment | **Foundational — leverage 10/10** |
| 2 | **Strategic recommendations** | `components/CorpusChatPanel.tsx` → `#recommendations` handler + `recommendation-architect` skill | Just rewritten with rich schema. Still list-level prompt. User explicitly called this output "stale, predictable, simple, not innovative" | Drives every prototype downstream. Most-visible user-facing surface for ideation | **Critical — leverage 10/10** |
| 3 | **Prototype Stage 1: Concept Decomposer** | `services/prototypeBuilder.ts` → `STAGE_1_SYSTEM` | 1 Gemini call → 1 brief. Brief shape determines the prototype's entire feature surface | If the brief is mode-collapsed, the prototype is too. User has called the prototypes "lame", "not valuable", "feel like slop" | **Critical — leverage 10/10** |
| 4 | **Persona roster (Phase A)** | `persona-architect` skill | 1 call → roster of personas | Same canonical personas every research run ("the overwhelmed first-year", "the type-A senior") | High — leverage 8/10 |
| 5 | **Prototype Stage 2: Interaction Architect** | `services/prototypeBuilder.ts` → `STAGE_2_SYSTEM` | 1 call → 1 spec (screens, state machine, motion contract) | Interaction patterns collapse to the same dashboard + chat + modal pattern across concepts | High — leverage 8/10 |
| 6 | **Deck narrative / strategy author** | `deck-narrative-composer`, `strategy-author` skills | Single-shot generation | Slide titles + Rumelt kernel statements often read like the same template | Medium-high — leverage 7/10 |
| 7 | **Cross-cutting synthesis** | `geminiService.ts` → `generateCrossCuttingSynthesis()` | Single insight per axis | Insights tend to be conventional convergences | Medium — leverage 6/10 |
| 8 | **PRD features, roadmap initiatives, gap analysis gaps, tech architecture components, competitive matrix axes** | Various `generate*` functions | Each produces a fixed list | Each list reads predictable. Tail items missing | Medium — leverage 6/10 |
| 9 | **AI Analyst chat (per-turn)** | `services/corpusChatService.ts` → `sendChatMessage()` | Single response per turn | Responses are competent but homogeneous across users | Medium — leverage 5/10 |
| 10 | **Prototype Stage 3: Visual Designer** | `STAGE_3_SYSTEM` | 1 call → 1 design system JSON | Designs converge on rounded-card-on-white SaaS aesthetic regardless of brand spec | Lower — leverage 4/10 (we already lock brand tokens) |
| 11 | **Prototype Stage 4: Coder** | `STAGE_4_SYSTEM` | 1 call → 1 implementation | Code structures converge (header + sidebar + main + modal). Feature implementation under-uses domain creativity | Lower (depends on upstream Stage 1/2 diversity) |
| 12 | **Prototype Stage 5: Critic** | `STAGE_5_SYSTEM` | 1 critique, optional 1 refinement | Critic is already convergent (which is correct for QA) — VS not needed here | N/A |

## Where VS pays off most — three "ground-truth" injection points

If we apply VS to the right places, the diversity injection propagates downstream automatically. Rather than apply VS at every box, target the **upstream creative bottlenecks** and let the diversity cascade.

The three foundational injection points:

### Injection point A: Theme synthesis (geminiService.generateThemes Pass 1)

**Current**: list-level prompt asks for "15 themes". → 15 conventional themes.

**Upgrade**: VS-Standard with **k=24 candidate themes, probability < 0.05 (tail sampling)**, then keep the top 15 ranked by `1 / probability × source_density` (i.e., favor the rare-but-evidenced themes). VS-CoT variant: model first reasons about WHAT the corpus's "long-tail" themes might be vs. the conventional ones, then emits the distribution.

**Why this helps**: One creative theme at the top of the analyst desk ("Brand-Name Fixation Trapping First-Years in Mass Application Cycles" instead of "Application Volume Stress") changes the entire downstream framing — personas, recommendations, prototypes all become more interesting because the theme they're grounded in is more interesting.

### Injection point B: Strategic recommendations (#recommendations skill)

**Current**: just-rewritten consulting-grade schema, single VS-style "generate 10 concepts" call. Still produces predictable concepts.

**Upgrade**: **VS-Multi** across 2 turns:
- Turn 1: "Generate 5 candidate recommendations covering the modal solution space, each with probability and consulting brief." → captures the obvious, defensible recommendations stakeholders expect.
- Turn 2: "Generate 5 MORE recommendations explicitly distinct from turn 1, with probability < 0.05. These should be the concepts a senior partner would call 'non-obvious but defensible'." → captures the tail.

Then render both groups separately in the UI: **"Defensible Consensus" set** (turn 1) + **"Non-Obvious Bets" set** (turn 2). User picks across both halves. Build prototypes prefer the tail set unless user picks otherwise.

**Why this helps**: separates the "boring but safe" recommendations from the "interesting but risky" ones explicitly, which is exactly the cut a senior partner would make in a client meeting.

### Injection point C: Prototype Stage 1 Concept Decomposer

**Current**: 1 call → 1 brief → 1 prototype.

**Upgrade**: VS-Standard with **k=3 candidate briefs at staged probability levels** (one "convention-honoring", one "shifted-frame", one "radical-reinterpretation"). Then either:
- (a) Let the user pick which brief shape to build, OR
- (b) Build all 3 in parallel (3× compute) and let Stage 5 Critic rank them, OR
- (c) Pick the brief at the lowest stable probability that still meets all hard constraints from the engagement_context.

The result: even when the tile slug is the same, the prototypes built from it span a creative range from "what a junior would build" to "what a senior product partner would defend".

**Why this helps**: directly addresses "the prototypes feel lame". The current 1-brief path makes the prototype 80% deterministic from the tile click. Branching the brief is where creative variance enters.

## Compositional application: VS × HTML deliverables (added 2026-05-12)

VS originally targeted **content** mode collapse — themes, recommendations, concept briefs. The HTML-as-default uplift (see `plans/html-as-default-output-uplift.md`) opened a SECOND class of mode collapse: **presentation** mode collapse. Every HTML deliverable an LLM emits without VS converges on the same generic SaaS aesthetic — rounded centered cards, slider-only interactions, rectangles-with-arrows diagrams, heading+bullet IA — regardless of topic.

VS composes with HTML at **five distinct generation layers**:

| Layer | Mode collapse | VS recipe |
|---|---|---|
| Visual layout | Logo-top / title-center / body-below | k=5 layouts at staged probabilities; commit to one |
| Information architecture | Heading + paragraph + bullets | k=5 IAs (flow-led, snippet-led, Q&A, worked-example, decision-tree); commit |
| Diagram type (per SVG) | Rectangles with arrows | k=5 diagram types (flowchart, sequence, swimlane, Sankey, state machine, radial); commit per diagram |
| Interaction pattern | Sliders | k=5 patterns (sliders, before/after, drag-to-position, easing-curve, code+preview, scrubber); commit |
| Iconography vocabulary | Default lucide-react every time | k=5 vocabularies; commit |

The `html-deliverable-composer` skill (Sprint H1 in the HTML uplift plan) opens with a composition contract: it MUST load `verbalized-sampling/SKILL.md` first and apply the five-layer VS pattern as a `<vs_thinking>` preamble before every HTML emission.

A new `--variants k` modifier formalizes the article's "show me 6" pattern: any `#brief`, `#explainer`, `#report`, `#playground`, or `#approaches` directive can request k distinct variants in a single HTML grid with probability pills + tradeoff captions + "Pick this" promotion buttons. This is VS-Multi rendered inline as a picker UI.

The `#approaches` directive **IS VS-Multi by definition** — turn 1 = 3 conventional approaches, turn 2 = 3 more at `p<0.05` explicitly distinct. Same pattern as Sprint 2's Defensible Consensus + Non-Obvious Bets, different surface.

## Secondary applications (apply once A/B/C are shipping)

### D — Persona roster diversification

Phase A of `persona-architect` becomes VS-Standard: generate k=8 personas with probability, force `p<0.10`, then keep the 5 most distinct (Manhattan-distance on JTBD+pain-points embeddings).

### E — Slide narrative diversity

`deck-narrative-composer` per-slide: emit 3 candidate slide titles + narratives per slide at different probabilities, let the user (or critic) pick. Surfaces titles like "Brand-Name Fixation costs $2.4B in unfilled SME co-ops" instead of generic "Application Strategy Opportunities".

### F — AI Analyst chat exploratory mode

Optional `#explore` directive in the chat: when set, every model response uses VS-CoT to give the user 3 candidate framings of the answer with probabilities. Default chat stays single-response (no latency hit unless user opts in).

### G — Synthetic data generation

Already shown in the paper: VS-Multi for synthetic training data (math problem generation, persona variants for testing, edge-case scenarios). Applies if/when we ever generate synthetic training data for fine-tuning.

## Implementation specs (drop-in patterns)

The paper's canonical VS prompt (Figure 2 of 2510.01171v3):

> *System prompt:* You are a helpful assistant. For each query, please generate a set of five possible responses, each within a separate `<response>` tag. Responses should each include a `<text>` and a numeric `<probability>`. Please sample at random from the [**full distribution** | **tails of the distribution, such that the probability of each response is less than 0.10**].

We adapt this to HiC's JSON-schema outputs. For every VS-instrumented generation point, the prompt prefix becomes:

```
=== VERBALIZED SAMPLING DIRECTIVE ===
Generate {k} candidate {item_name}s in a single response. For each, emit
both the full structured object AND a numeric "probability" field
(0 < probability < 1) reflecting your estimate of how likely each candidate
is among all plausible {item_name}s for this brief.

Sample from {sampling_window}:
  - "full"         → probabilities can be anywhere in (0, 1).
  - "moderate-tail" → probability of every candidate must be < 0.10.
  - "extreme-tail"  → probability of every candidate must be < 0.05.

Probabilities across candidates need not sum to 1 — they are calibrated
estimates against the full distribution of plausible answers, not a
normalized softmax.

The act of writing a probability commits you to non-modal completions.
DO NOT regress to the most typical answer. A high-probability response
(p > 0.20) signals you defaulted to the modal solution — only emit one
high-probability item per call, and only if it is genuinely the strongest.
The remaining {k-1} candidates must be in the tail.

For VS-CoT variant: BEFORE emitting candidates, write a brief
<thinking>...</thinking> block reasoning about:
  - What is the modal/conventional response space for this brief?
  - What are the non-obvious framings, populations, mechanisms, metaphors?
  - Which corpus evidence points away from the modal answer?
Then emit the {k} candidates spanning the distribution.
```

### Schema additions per touchpoint

**Theme synthesis output:**
```json
{
  "themes": [
    { "name": "...", "thesis": "...", "evidence": [...], "probability": 0.04, "frame": "modal | shifted | tail" }
  ]
}
```

**Recommendations output (already partially shaped):**
```json
{
  "engagement_context": {...},
  "analytical_preamble": {...},
  "concepts_defensible_consensus": [{ "...full concept schema...", "probability": 0.12 }],
  "concepts_non_obvious_bets":    [{ "...full concept schema...", "probability": 0.04 }],
  "comparison_table": {...},
  ...
}
```

**Prototype brief (Stage 1) output:**
```json
{
  "candidate_briefs": [
    { "frame": "convention-honoring",    "probability": 0.40, "brief": {...} },
    { "frame": "shifted-frame",          "probability": 0.12, "brief": {...} },
    { "frame": "radical-reinterpretation","probability": 0.05, "brief": {...} }
  ]
}
```

### Downstream selection strategy

For every VS call, define how we consume the distribution:

| Touchpoint | Selection strategy |
|---|---|
| Themes | Keep top 15 by `1/p × evidence_density` (favor rare-but-evidenced) |
| Recommendations | Render BOTH groups in UI; let user pick. Default `#proto` builds from non-obvious set unless user explicitly picks consensus tile |
| Prototype brief | Default to `shifted-frame` (probability ~0.12). Expose UI toggle for user to pick `convention` or `radical` |
| Persona roster | Cluster on JTBD embeddings, keep representative of 5 most-distant clusters |
| Slide narrative | Render 3 candidates as expandable tabs per slide; user picks one |

### Quality safeguards (from the paper's caveats)

1. **k is bounded** — paper shows k=5 is the sweet spot for most tasks; k=20 only for enumerative QA. Going higher degrades per-candidate quality. Use k=5 for narrative, k=3 for prototype briefs, k=15-24 only for themes.
2. **Probability threshold is bounded** — extreme tail (`p < 0.01`) on small models degrades quality. We're on Gemini 3.1 Pro / Claude Opus / GPT-5.5 so we can push to `< 0.05` safely.
3. **CoT variant only on capable models** — VS-CoT and VS-Multi require strong instruction-following. Confirmed safe on our defaults.
4. **Quality gate** — every VS-generated item still passes through the existing post-processor (`slidePostProcessor.ts` for slides, the JSON validator for recs, etc.). VS expands the candidate set; quality gates remove the off-target outliers.
5. **A/B watch** — every VS-instrumented touchpoint gets a feature flag so we can toggle off if quality regressions appear. Wiki log captures before/after diversity scores per run.

## Rollout sequence (in order)

### Sprint 1 — Theme synthesis VS (highest foundational leverage)
**STATUS: REVERTED on 2026-05-12 due to thin-evidence regressions.** The `1/p × evidence_density` ranker promoted candidates with insufficient corpus support, producing themes the post-processor could not back with citations. The VS probability field was removed from generateThemes Pass 1 at `geminiService.ts:1136-1140` and the explicit rollback comment lives at `geminiService.ts:770-793`. Original sprint plan below is preserved for historical reference but must NOT be re-implemented as-described. If themes VS returns, the ranker MUST apply a strict evidence-floor pre-filter (>=3 distinct external sources per candidate) BEFORE ranking by probability tail.

1. ~~Add VS directive to `generateThemes()` Pass 1 BREADTH prompt~~
2. ~~Switch from "produce 15 themes" → "produce 24 candidate themes with probabilities < 0.10"~~
3. ~~Add selection step: rank by `1/p × source_count`, keep top 15~~
4. ~~Wire to feature flag `vs_themes_enabled` (default ON for new sessions)~~
5. ~~Log before/after diversity scores to `wiki/log.md`~~
6. ~~**Estimated effort: M (4-6 engineer-hours)**~~

### Sprint 2 — Recommendations VS-Multi (most visible UX win)
1. Change `#recommendations` handler to make 2 sequential Gemini calls
2. Turn 1: 5 defensible consensus concepts with `p` (full distribution)
3. Turn 2: 5 non-obvious bets with `p < 0.05`, explicitly distinct from turn 1's slugs
4. Extend schema with `concepts_defensible_consensus` and `concepts_non_obvious_bets`
5. Update `RecommendationTilesGrid` to render two grouped sections with visual differentiation (defensible: chartreuse left border; non-obvious bets: cyan left border + "BET" badge)
6. Update `#proto`-from-tile to inject `frame: 'non-obvious'` into the concept brief when the user picks a non-obvious tile
7. **Estimated effort: L (8-12 engineer-hours)**

### Sprint 3 — Prototype Stage 1 VS branching (most direct user complaint addressed)
1. Update `STAGE_1_SYSTEM` to emit 3 candidate briefs at staged probability levels
2. Update `prototypeBuilder.ts` orchestrator: parse the candidate_briefs array, pick the `shifted-frame` brief by default, expose user override via `#proto --frame=radical` directive
3. Add a "Brief variants" preview step before Stage 2 runs (so user can see the 3 briefs and pick)
4. **Estimated effort: M (6-8 engineer-hours)**

### Sprint 4 — Persona roster VS
1. Update `persona-architect` skill Phase A to emit k=8 with `p < 0.10`
2. Add k-means clustering on JTBD+pain-points embeddings; keep 5 cluster representatives
3. **Estimated effort: S (3-4 engineer-hours)**

### Sprint 5 — Slide narrative VS (deck quality lift)
1. Update `deck-narrative-composer` skill to emit k=3 per slide
2. Update slide renderer to expose tab switcher per slide for the 3 variants
3. **Estimated effort: M (4-6 engineer-hours)**

### Sprint 6 — Optional `#explore` chat mode
1. Add `#explore` directive parser to `hashtagParser.ts`
2. When triggered, swap `sendChatMessage` to VS-CoT with k=3 framings
3. Render the 3 framings as expandable accordion in chat
4. **Estimated effort: S (3-4 engineer-hours)**

## A reusable VS skill so we don't re-implement at each touchpoint

Create `.claude/skills/verbalized-sampling/SKILL.md` as a system-prompt prefix any generation pipeline can pull at runtime. The skill encodes the VS directive, the three variants, the probability-threshold tuning, and the consumption patterns. Then every touchpoint just does:

```typescript
const vsSkill = await fetch('/skills/verbalized-sampling/SKILL.md').then(r => r.text());
const systemPrompt = `${vsSkill}\n\n---\n\n${originalSystemPrompt}`;
```

Same pattern we already use for `recommendation-architect`. One canonical source of truth for VS behavior across the whole codebase.

## Success criteria — how we know this worked

1. **Theme synthesis**: average semantic diversity (1 - mean pairwise cosine similarity) increases ≥30% across 5 test runs on the same corpus vs. current baseline.
2. **Recommendations**: blind side-by-side test — for 5 recommendations from old pipeline vs. 5 non-obvious bets from new pipeline, the user picks the new ones as "more interesting / less obvious" ≥80% of the time.
3. **Prototype briefs**: across 10 same-tile builds, the resulting prototypes are visually and structurally distinct (not 80% same scaffold).
4. **No quality regression**: post-processor banned-phrase rejection rate stays ≤ current baseline. Citation density stays ≥ current baseline. Schema validation pass rate stays ≥ 95%.
5. **User signal**: zero "feels predictable" / "feels like slop" complaints across 10 sessions post-rollout.

## What we are NOT doing (intentional exclusions)

- **Not modifying Critic/Stage 5** — convergence is correct for QA.
- **Not modifying image/video generation** — already diverse via temperature.
- **Not modifying tech architecture / PRD / roadmap structure** — these are determined by the engagement, not creative ideation. VS would over-randomize.
- **Not fine-tuning any model** — VS is training-free by design. No risk of degrading base capabilities.
- **Not adding VS to streamlined operational endpoints** (citation resolution, post-processing, evidence density scoring) — these are deterministic transforms, not generations.

## References baked into the pipeline going forward

- Paper: `2510.01171v3.pdf` (in `.claude/skills/intelligence/`)
- Skill: `.claude/skills/verbalized-sampling/SKILL.md` (to be created in this rollout)
- Wiki entry: `hic-workspace/wiki/frameworks/verbalized-sampling.md` (to be created, captures the framework so it's loaded into any future deliverable that needs creative depth)
- Memory entry: link from `MEMORY.md` under "creative-depth frameworks"
