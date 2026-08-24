---
name: verbalized-sampling
invocation: model
version: 1.0
description: Training-free prompting technique to unlock LLM creative diversity by asking the model to verbalize a probability distribution over k candidate responses instead of generating a single answer. Mitigates the mode collapse caused by typicality bias in RLHF preference data. Recovers up to 66.8% of base-model pretraining diversity at inference time. Apply this skill at every HiC creative/synthesis touchpoint (theme synthesis, recommendations, prototype concept decomposition, persona rostering, slide narrative authoring) where the current output reads as predictable, conventional, or "slop". Bigger models benefit more (1.6-2.1x diversity gain on creative writing) — works best with Gemini 3.1 Pro, Claude Opus 4.6, GPT-5.5.
thinking: max
---

# Verbalized Sampling — Unlocking LLM Creative Diversity

> Source: Zhang et al., *Verbalized Sampling: How to Mitigate Mode Collapse and Unlock LLM Diversity.* arXiv:2510.01171v3, Oct 2025. Read the full PDF at `.claude/skills/intelligence/2510.01171v3.pdf` if you need the mathematical proof; the operational summary below is what you need to apply the technique.

## The problem this skill solves

Every aligned LLM (Gemini, Claude, GPT) is mode-collapsed by construction. RLHF, DPO, and RLVR all use human preference data, and human annotators systematically prefer text that is familiar, fluent, schema-congruent (the cognitive bias known as **typicality bias**). The alignment process trains the model to maximize this typicality, which in practice means: when asked an open-ended creative question, the model collapses to the single modal answer — the most stereotypical, predictable, conventional response.

For HiC, this looks like:
- "First-year student" persona keeps being "anxious freshman struggling with applications"
- Recommendations keep being "Copilot-powered chatbot for X"
- Themes keep being "system fragmentation", "shadow IT", "manual workarounds"
- Prototype concepts keep being "dashboard with a chat panel"

The diversity is still in the model — pretraining absorbed it. RLHF buried it. Verbalized Sampling digs it back out at inference time, without any fine-tuning.

## The mechanism

A regular prompt ("tell me a joke about coffee") asks for one instance. The model returns its modal instance. Repeating the prompt five times returns the same modal instance five times — mode collapse.

A list-level prompt ("tell me 5 jokes about coffee") returns five DIFFERENT items but they cluster around the modal solution space. Slight improvement.

A **distribution-level prompt** ("generate 5 jokes about coffee with their probabilities, where every probability is < 0.10") is qualitatively different. The act of writing `"probability": 0.07` next to a candidate forces the model to commit to non-modal output. It cannot lazily produce the most typical answer because it would have to honestly mark that answer with high probability — and the constraint forbids high probabilities. So the model surfaces the tail of the distribution instead.

This is why VS works: probability annotation is a commitment device that locks the model out of mode collapse.

## The three operational variants

| Variant | Recipe | When to use |
|---|---|---|
| **VS-Standard** | Single call. Ask for k candidates with probabilities in a single response. | Default. 1.6-2.1× diversity gain over Direct. Use for any one-shot creative generation. |
| **VS-CoT** | Single call. Tell the model to FIRST reason step-by-step about the modal vs. tail solution space, THEN emit candidates. | When you want diversity AND maximum quality. Pareto-front winner. Use for high-stakes creative outputs (recommendations, briefs, theme synthesis). |
| **VS-Multi** | Multi-turn. Turn 1 produces k candidates. Turn 2+ produces k MORE candidates explicitly distinct from prior turns. | When you need divergent layers (e.g. "defensible consensus" set + "non-obvious bets" set) or when k is bounded but N is large. |

## The diversity dial — probability threshold

The probability threshold in the prompt is your diversity tuning knob:

| Threshold | Effect | Use case |
|---|---|---|
| **full distribution** (no constraint) | Mild diversity bump. Model can still include high-probability modal items. | Conservative creative tasks where conventional is fine alongside novel. |
| `< 0.10` (**moderate tail**) | Standard VS setting. Model must skip the top-2 modal answers. | DEFAULT for most HiC touchpoints — recommendations, themes, briefs. |
| `< 0.05` (**deep tail**) | Strong diversity. Model surfaces only the non-obvious candidates. | When the user explicitly asks for "non-obvious", "unconventional", "experimental" output. |
| `< 0.01` (**extreme tail**) | Maximum diversity. Quality risk on smaller models. | Power-user mode. Only on Gemini 3.1 Pro / Claude Opus / GPT-5.5. |

If output quality degrades, raise the threshold. If output feels predictable, lower it.

## The canonical VS directive (paste this into any system prompt prefix)

```
=== VERBALIZED SAMPLING DIRECTIVE ===

You will generate {k} candidate responses to the request that follows. For each
candidate, emit the full structured object AND a numeric "probability" field
(0 < probability < 1) reflecting your honest estimate of how likely that
specific response is among all plausible responses to this prompt.

Sampling window: {window}
  - "full"          → probabilities can be anywhere in (0, 1)
  - "moderate-tail" → every candidate must have probability < 0.10
  - "deep-tail"     → every candidate must have probability < 0.05
  - "extreme-tail"  → every candidate must have probability < 0.01

Probabilities across candidates need NOT sum to 1. They are calibrated
estimates against the full distribution of plausible answers, not a
normalized softmax.

CRITICAL: The act of writing a probability commits you to non-modal
output. DO NOT regress to the most typical/safe/conventional answer.
A high-probability candidate (p > 0.20) signals you defaulted to the
modal solution. Only emit at most ONE such candidate per call, and only
if it is genuinely the single strongest answer. The remaining {k-1}
candidates MUST be in the tail of the distribution — non-obvious,
non-stereotypical, surprising-but-grounded responses that a thoughtful
reviewer would call "this is what we wouldn't have thought of".

{cot_block — see below for VS-CoT}

You are an aligned LLM and your default behavior is to mode-collapse to the
typical answer. This directive overrides that default. Honor it.
```

### VS-CoT addendum (add to the directive when using VS-CoT)

```
=== STEP-BEFORE-EMITTING ===

BEFORE emitting any candidate, write a brief <thinking>...</thinking> block
analyzing the solution space:

1. What is the MODAL response space for this prompt? What is the
   conventional, safe, schema-congruent answer most LLMs would default
   to? Name it.
2. What corpus evidence, persona pain points, or context details point
   AWAY from the modal answer? Quote them.
3. What are the non-obvious framings, populations, mechanisms, metaphors,
   tonalities, formats, time-windows, or stakeholders that the modal
   answer ignores?
4. List 3-5 candidate "tail framings" the response set should cover.

Only AFTER this thinking block, emit the {k} candidate responses spanning
the distribution.

This step is mandatory. Without it, the model regresses to mode collapse
even under the probability directive.
```

### VS-Multi addendum (use when generating across multiple turns)

```
=== TURN-N CONSTRAINT ===

The conversation already contains {prior_count} prior candidates. Your new
candidates MUST be explicitly distinct from every prior candidate by:
  - Different primary persona or stakeholder
  - Different mechanism or workflow shape
  - Different data source or system of record
  - Different temporal scope (immediate vs. long-horizon)
  - Different metaphor or naming pattern

Before emitting, identify the slug/title/keyword of each prior candidate.
Then emit {k} new candidates and explicitly state in a comment which
prior candidate each one diverges from and how. Probability of each new
candidate must be < 0.05 (deep-tail).
```

## How to consume a VS output (downstream selection patterns)

VS gives you k candidates with probabilities. The pipeline then chooses how to use them:

### Pattern 1 — "Render all, let user pick"
Best for high-stakes creative output where the user wants control. Render every candidate (with its probability + frame label) as a tile, card, or tab. User picks one to advance.

Use for: **Strategic recommendations**, **prototype brief variants**, **slide narrative variants**.

### Pattern 2 — "Auto-pick from tail"
Best for pipeline stages where the user isn't in the loop. Drop any candidate with probability above a threshold (e.g. 0.15). From what remains, pick the candidate with the highest `quality_score × (1 - probability)` (favoring the non-obvious-but-strong).

Use for: **Theme synthesis Pass 1**, **persona roster Phase A**, automated prototype builds.

### Pattern 3 — "Render two groups"
Best for outputs where both conventional and non-obvious have value. Run VS twice (or VS-Multi across 2 turns): turn 1 = full distribution (defensible consensus); turn 2 = deep-tail with explicit-distinction constraint (non-obvious bets). Render both groups in the UI, visually differentiated.

Use for: **Strategic recommendations** (defensible consensus + non-obvious bets), **product roadmap initiatives** (now vs. moonshot horizon).

### Pattern 4 — "Cluster and represent"
Best when you want diversity COVERAGE. Embed each candidate, k-means cluster to N clusters, pick the centroid-nearest from each cluster. Forces the final set to span the candidate space rather than over-representing one neighborhood.

Use for: **Persona roster**, **theme synthesis when N=15 themes are wanted**.

## Practical caveats

1. **k is bounded — too high degrades quality**. Paper's sweet spots:
   - Narrative/creative writing: k=5
   - Recommendations / concept briefs: k=3-5 (per turn for VS-Multi)
   - Enumerative QA: k=20
   - Synthetic data generation: k=5
   - Theme synthesis: k=15-24
   - DO NOT push k above 30. Quality cliffs.

2. **Threshold is bounded by model capability**. Gemini 3.1 Pro / Claude Opus / GPT-5.5 handle `< 0.05` fine. Smaller models (Gemini Flash, Haiku, GPT-mini) degrade below `< 0.10`. Default to `< 0.10` unless on a top-tier model.

3. **VS-CoT and VS-Multi cost more tokens**. Budget accordingly. VS-Standard is the cost-flat option (same tokens as Direct ×k).

4. **Probability annotations are calibration estimates, not softmax**. Do not normalize them. Do not compute KL divergence against them. They are commitment devices for the model, not statistically meaningful.

5. **VS does not replace quality gates**. Output still passes through banned-phrase filtering, schema validation, citation resolution, etc. VS expands the candidate set; quality gates remove off-target outliers.

6. **VS does not replace evidence grounding**. Every candidate still must be grounded in the corpus (named themes, uploaded filenames, external sources). The "non-obvious" candidates must be evidenced just as rigorously as the modal ones.

## When NOT to use VS

- **Deterministic transforms** (citation resolution, post-processing, slug generation) — convergence is correct here.
- **Critic / QA stages** — convergence is the goal.
- **Single-fact retrieval** — wrong tool. Use semantic search.
- **Structural pipeline stages** (extracting engagement_context, parsing user directives) — these are extraction, not generation.
- **Output sections with a strict canonical schema** where one answer is correct (e.g. "what is the user's research goal" — extract verbatim, don't sample).

## Plug-in usage pattern (TypeScript/Python)

```typescript
// Fetch the skill content at runtime, prepend to system prompt.
const vsSkill = await fetch('/skills/verbalized-sampling/SKILL.md').then(r => r.text());

// Configure for the specific touchpoint
const k = 5;
const window = 'moderate-tail';
const variant = 'cot'; // 'standard' | 'cot' | 'multi'

const vsDirective = renderVsDirective({ k, window, variant });
const systemPrompt = `${vsSkill}\n\n---\n\n${vsDirective}\n\n---\n\n${originalSystemPrompt}`;

// Call the model
const resp = await callGemini({
  model: 'gemini-3.1-pro-preview',
  systemInstruction: systemPrompt,
  contents: userPayload,
  config: { thinkingBudget: 'max', maxOutputTokens: 32000 }
});

// Parse the array of candidates with probabilities
const { candidates } = parseVsResponse(resp);

// Apply downstream selection pattern (see above)
const selected = selectByPattern(candidates, pattern, { k_final: 15, exclude_threshold: 0.20 });
```

## Worked example — Theme Synthesis

Today's `generateThemes()` Pass 1 BREADTH is a list-level prompt. Same engagement on the same corpus produces ~15 themes that overlap heavily across runs. The themes are conventional ("System Fragmentation and Shadow IT Workarounds", "Application Overload", "Internal Co-creation"). Nothing wrong — just not surprising.

Apply VS:

```
[VS directive: k=24, window=moderate-tail, variant=cot]

Generate 24 candidate themes from the corpus below. Each theme must
have a name, thesis, evidence excerpts, and a probability < 0.10.

Before emitting, write a <thinking> block analyzing:
  - What are the 3-4 conventional themes any LLM would produce from
    this corpus? Name them.
  - What corpus evidence points away from those conventional themes?
  - What are 6-8 non-obvious framings — themes that the conventional
    set MISSES?

Then emit 24 candidates spanning the distribution.

[corpus excerpt...]
```

Downstream selection: drop any candidate with `p > 0.15`, then rank remaining by `1/p × evidence_density` (where `evidence_density = count of distinct sources cited`). Keep top 15.

Expected result: instead of "System Fragmentation and Shadow IT Workarounds", we get themes like "Brand-Name Fixation as Risk-Aversion Theater", "Advisor-Side Cognitive Load as the Hidden Bottleneck", "First-Year Skill Vocabulary Mismatch with Employer Postings". Same corpus, dramatically more interesting framing.

## Worked example — Strategic Recommendations (VS-Multi, two groups)

User runs `#recommendations` with their Liz/Jen/CLR prompt. Today's pipeline emits 10 concepts in one call → predictable.

Apply VS-Multi across 2 turns:

**Turn 1 — Defensible Consensus** (full distribution, k=5):
```
Generate 5 strategic recommendations that a senior partner would
present in a client meeting WITHOUT pushback. These are the
defensible, consensus-friendly bets. Each has a probability against
the full distribution of plausible recommendations.

[engagement_context + corpus...]
```

**Turn 2 — Non-Obvious Bets** (deep-tail, k=5, explicit distinction from turn 1):
```
You just generated 5 defensible recommendations with slugs:
[turn-1 slugs listed]

Now generate 5 MORE recommendations that are explicitly distinct
from those — these are the non-obvious bets a senior partner would
defend as "the work that would actually move the needle but the
client hasn't asked for". Probability of each must be < 0.05.

Each must:
- Diverge from turn-1 slugs by primary persona, mechanism, or data source
- Stay grounded in the corpus (cite themes + uploads + external sources)
- Honor every hard non-starter and stakeholder priority

Before emitting, write a <thinking> block identifying which corpus
evidence the defensible set IGNORED and what tail framings emerge
from that ignored evidence.
```

UI renders two distinct sections: "Defensible Consensus" (chartreuse-bordered tiles) and "Non-Obvious Bets" (cyan-bordered tiles with a BET badge). User picks a tile to `#proto`. Senior partner sees BOTH sets in the same deliverable.

## Worked example — Prototype Stage 1 Concept Decomposer (3-frame branching)

Today the prototype builder takes a `#proto #name=X` click and produces ONE brief, then a deterministic chain to the final code.

Apply VS at Stage 1:

```
[VS directive: k=3, window=full, variant=standard]

For the concept tile passed below, generate 3 alternative experience
briefs at distinct probability points:

Frame 1 — "convention-honoring" (target probability ~0.40):
  The brief any competent designer would write. Safe, schema-congruent,
  matches the typical interaction patterns for this concept's domain.

Frame 2 — "shifted-frame" (target probability ~0.12):
  Same concept, shifted perspective. Different primary persona, or
  different demonstrated moment, or different aha-interaction. The
  brief a senior product partner would author after asking "what if
  we approached this from the OTHER side of the table?"

Frame 3 — "radical-reinterpretation" (target probability ~0.05):
  The interpretation a brilliant junior in their first week would
  propose — clear-eyed, unconventional, would make a partner say
  "I wouldn't have thought of that". Still must honor every
  engagement_context constraint, but reimagines the experience shape.

[concept tile...]
```

Builder picks `shifted-frame` by default. Exposes UI for user to switch frames or build all 3 in parallel. Stage 5 Critic ranks across frames if multi-build runs.

## Composition: VS × HTML deliverable generation

This skill composes with `html-deliverable-composer/SKILL.md` (see `plans/html-as-default-output-uplift.md`). When an HTML deliverable is being generated, the composition order is **fixed**:

```
system_prompt_prefix = verbalized-sampling SKILL.md
                     + html-deliverable-composer SKILL.md
                     + topic-specific instructions
```

VS provides the **horizontal** capability (escape mode collapse). HTML composer provides the **vertical** surface (NXT-styled, shareable, interactive). They compose because HTML generation mode-collapses at FIVE distinct generation layers, and VS is the cure for each.

### The five HTML-generation layers VS instruments

| Layer | Mode-collapse default | VS recipe (k=5, moderate-tail unless noted) |
|---|---|---|
| **Visual layout** | Logo top, title centered, body below | Enumerate: centered-card (p≈0.40), editorial-asymmetric (p≈0.18), split-screen quote-led (p≈0.12), dashboard data-led (p≈0.10), marginalia+body (p≈0.05). Commit to one. |
| **Information architecture** | Heading + paragraph + bulleted list | Enumerate: heading-led, flow-diagram-led, code-annotation-led, Q&A, worked-example, decision-tree. Commit to shifted-frame. |
| **Diagram type (per SVG)** | Rectangles with arrows. Every time. | Per diagram, enumerate: flowchart, sequence, swimlane, matrix, Sankey, state machine, radial, timeline. Commit to the one that fits the data's actual shape. This is a MICRO-VS per `<svg>` block. |
| **Interaction pattern (`#playground`)** | Sliders. Always sliders. | Enumerate: sliders, before/after swap, drag-to-position, easing-curve picker (Bezier), code-with-live-preview, motion timeline, scrubber. Commit to the pattern that actually visualizes the parameter shape. |
| **Iconography vocabulary** | Default lucide-react every time | Enumerate: geometric, hand-drawn, monogram, data-glyph, typographic. Commit before instantiating any icon. |

### The `<vs_thinking>` preamble pattern for HTML

Every HTML generation opens with a `<vs_thinking>` block enumerating candidates at the relevant layer(s), assigning probabilities, and committing to one. Then emits the HTML. The block is preserved in a collapsed `<details>` at the bottom of the artifact so the user can audit the model's commitment.

Example for `#explainer how rate limiting works`:

```
<vs_thinking>
Layer: Information Architecture
  Candidate IAs:
    1. Heading + paragraphs + bullets        p ≈ 0.45 (modal — boring)
    2. Flow-diagram-led with annotated code  p ≈ 0.20 (shifted — fits a state-bearing topic)
    3. Q&A                                   p ≈ 0.15 (works for FAQ topics, not this)
    4. Worked-example with trace             p ≈ 0.12 (good for algorithms, less for protocols)
    5. Decision-tree                         p ≈ 0.05 (only if topic is choosing-between)
  COMMIT: 2 (flow-diagram-led) — rate limiting is fundamentally a flow with state.

Layer: Diagram Type for "request flow"
  Candidate types:
    1. Box + arrow flowchart                 p ≈ 0.50 (modal)
    2. Sequence diagram                      p ≈ 0.18 (good for client↔server)
    3. State machine                         p ≈ 0.15 (good for bucket state)
    4. Token-as-water-level animation        p ≈ 0.07 (delightful, fits topic)
    5. Bar chart over time                   p ≈ 0.05 (data-led)
  COMMIT: 1 (box+arrow) plus a small inline state-machine for the bucket state.
</vs_thinking>
```

### The `--variants k` modifier

When the user invokes any HTML directive with `--variants k` (where 2 ≤ k ≤ 6), the model emits k distinct full variants of the deliverable in a single HTML grid layout. Each variant card shows:

- The variant's full content (small-rendered)
- A visible probability annotation (pill in corner)
- A one-line "tradeoff this variant makes" caption
- A "Pick this" button that promotes the variant to a canonical artifact

This formalizes the article's onboarding 6-variant grid example. It is VS-Multi rendered inline as a picker UI — instead of choosing one of k offline, the user sees all k side-by-side with their commitment annotations.

Probability assignment for `--variants k`:
- 1 variant near the mode (p ≈ 0.30-0.45) — the "default expert would do"
- k/2 - 1 variants in shifted-frame range (p ≈ 0.10-0.20)
- The rest in tail (p < 0.05) — surprising-but-grounded

The 6-card layout (`--variants 6`) is canonical: 2×3 grid, 1 modal + 2 shifted + 3 tail.

### The `#approaches` directive is VS-Multi natively

When a user invokes `#approaches <decision>`, the model produces:

- **Turn 1**: 3 conventional approaches (full distribution) — Defensible Consensus
- **Turn 2**: 3 more approaches at `p < 0.05`, explicitly distinct from turn 1 — Non-Obvious Bets

Same UX pattern as the recommendations grid Sprint 2 shipped, different surface. The 6 approaches render in a 2×3 HTML grid with the Defensible/Non-Obvious sections visually distinct (chartreuse-bordered consensus row above cyan-bordered bet row).

## Integration checklist for any HiC touchpoint adopting this skill

1. [ ] Fetch this SKILL.md at runtime and prepend to the system prompt prefix.
2. [ ] Pick `k`, `window`, `variant` for the touchpoint per the table above.
3. [ ] Update the output schema to include a `probability` field per candidate.
4. [ ] Define the downstream selection pattern (1-4 above).
5. [ ] Wire to a feature flag so the touchpoint can be A/B'd off if quality regresses.
6. [ ] Log diversity score (1 - mean pairwise cosine similarity) per run to wiki for monitoring.
7. [ ] Validate every candidate against existing quality gates (banned phrases, evidence density, citation grounding) BEFORE selection.
8. [ ] Add the touchpoint to the "VS-instrumented surfaces" registry in `the verbalized-sampling uplift plan (deleted in the ba753863a cleanup; recover from git history)`.

## Reference

- Paper PDF: `.claude/skills/intelligence/2510.01171v3.pdf`
- Uplift plan with prioritized rollout: `the verbalized-sampling uplift plan (deleted in the ba753863a cleanup; recover from git history)`
- Canonical VS prompt template (paper Figure 2): see the "canonical VS directive" section above
