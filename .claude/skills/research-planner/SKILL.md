---
name: research-planner
invocation: model
version: 1.0
description: Phase 5 of the NotebookLM uplift plan. The "Humans in Control" feature - takes a research goal + uploaded brief + optional institution context and emits a structured research_plan.json with sub-questions, source strategy, named institutions, expected theme count, budget cap, reflection threshold. The plan is RENDERED IN THE UI for user edit/approval BEFORE any external API calls. After approval, the data fabric runs in a plan-act-reflect loop with reflection traces persisted to the engagement. NotebookLM has Deep Research; only HiC has Deep Research with a deliberate human checkpoint at the planning stage.
thinking: high
category: agentic-loop
triggers:
  - "#deep-research"
  - research plan
  - plan-act-reflect
  - HITL planning
---

# Research Planner

## You Are

The planner half of HiC Deep Research. Your job is to take a research goal and emit a structured plan the user can edit before any external API calls fire. The plan is the "Humans in Control" gate — it makes the product name mean something concrete in product surface.

This is NOT a one-shot prompt. It's structured planning with explicit acceptance criteria.

## When to activate

- User invokes `#deep-research <goal>` hashtag
- Pipeline mode set to `deep_research` via App.tsx state machine
- User clicks "Regenerate plan" after editing

Do NOT activate when:
- User is in chat workbench (not collection)
- The corpus is already collected (deep research is a collection mode, not a synthesis mode)

## Input contract

```typescript
type ResearchPlannerInput = {
    research_goal: string;
    uploaded_brief?: string;     // optional client brief
    named_institutions?: string[];
    budget_usd?: number;         // hard cap; default $5
    target_theme_count?: number; // default 20-25
};
```

## Output contract — research_plan.json

```yaml
plan_version: 1
plan_hash: <sha256 of goal + inputs>
goal: <verbatim user goal>
sub_questions:
  - id: q1
    question: <one of 5-10 sub-questions>
    angle: definition | mechanism | evidence | counter_evidence | second_order | named_entities
    expected_evidence_types: [academic, news, government, social, client]
    expected_named_entities: [...]
    priority: high | medium | low
source_strategy:
  - source_id: <connector_id from SOURCES registry>
    sub_question_ids: [q1, q3]
    expected_yield: <article count>
    rationale: <one sentence>
named_institutions: [Northeastern, MIT, ...]
expected_themes_count: <target>
budget_usd: <hard cap>
reflection_threshold: 0.75   # 75% coverage exits loop
max_iterations: 6
```

## The 5-step protocol

1. **Read the goal + brief.** Extract named entities, target outcome, audience.
2. **Decompose into 5-10 sub-questions** spanning the 6 angles (definition / mechanism / evidence / counter_evidence / second_order / named_entities). Priority-tag each.
3. **Map sub-questions to source connectors.** For each sub-question, pick 2-4 connectors most likely to answer it. Reference the SOURCES registry in proxy/app.py. **Enhancement F (2026-06-08): consult the source-scores page first, which the `source-yield-scorer` skill writes to `hic-workspace/wiki/synthesis/source-scores.md` (produced from the connector-health ledger from the connector-health ledger). DEPRIORITIZE or drop any connector marked DEAD (reliability < 0.3 or yield_score ~ 0) and PREFER connectors with high yield_score for this goal's domain. If source-scores.md is absent, fall back to the registry defaults. This is the collection-side self-improvement loop: the planner learns which sources actually return relevant evidence over time instead of re-selecting dead connectors every run.**
4. **Estimate yield + budget.** Per source, expected articles. Sum to total. Compare to budget_usd cap.
5. **Set reflection threshold.** For a typical 200-doc target with 5 sub-questions, threshold=0.75 means: stop when ≥4 of 5 sub-questions are "covered" (≥10 articles found per sub-question).

## Hard rules

1. **The plan is human-editable.** UI renders it as a form. User can edit sub-questions, remove sources, change budget cap.
2. **No external API calls during planning.** The planner uses Opus 4.7 + extended thinking but does NOT collect data.
3. **plan_hash is deterministic.** Same inputs → same hash. Lets reproducibility_hash bind the engagement to the approved plan.
4. **budget_usd is binding.** The reflector loop must halt when budget exhausted.
5. **No emoji.** Repo-wide rule.

## Composition

- **Triggered by:** `#deep-research` hashtag or `pipelineMode: 'deep_research'`
- **Output rendered by:** `components/ResearchPlanEditor.tsx` (new React component, defined in plan section 5.2)
- **After approval:** `services/researchFabricOrchestrator.ts` wraps the existing collection in an iteration loop with the reflector
- **Reflector:** uses `critic-revise-loop` primitive — reflector is the critic, planner is the revisor
- **Persistence:** approved plan + reflection trace persist to `engagements/<slug>/research_log.json` for audit

## Visual Output (GOLD design language)

Render to the canonical GOLD visual language. Full spec: `hic-workspace/wiki/design-system/gold-visual-language.md`.
Your reference twin(s): `research-plan-nu.html` / `research-plan-nxt.html` in `hic-workspace/wiki/design-system/gold/`.

Layout: Plan meta row (budget cap, max iterations, reflection, human gate). Sub-question rows: big numeral + question (serif) + source strategy. Takeaway states the human-in-control plan-edit gate.

Invariants (from the spec): 1920x1080 stage, brand rail + 3x3 dot mark, IBM Plex Mono kicker,
serif(NU)/Archivo(NXT) action-title h1, dark takeaway band with exactly one accent-bold phrase.
Color is meaning (accent = pain/critical/diagnosis; cool = need/target/fix/source; neutral = structure).
NO eyebrow microlabels that color/position already convey (WHAT FRUSTRATES THEM, WHAT THEY NEED,
DESIGN RESPONSE, PROOF IT WORKED, PEAKS). NO em-dash. Content is data-dependent; the language is fixed.

---

## Cached-selection contract (2026-06-06, MANDATORY)

When the engagement manifest carries `cached_selection.theme_cluster_ids[]` or
`cached_selection.engagement_slugs[]` (the user explicitly selected prior
artifacts via the Knowledge Library), the `assembleEnhancedPrompt()` function
injects a `PRIOR CACHED SELECTION` block into your system prompt.

1. For each emitted item, set a `source` field:
   - `"cached"`   — carried forward unchanged from the user's selection
   - `"extended"` — carried forward with refinement on the new corpus
   - `"new"`      — from the new corpus, not in the selection

2. **NO FLOORS, NO OMISSIONS — 100% coverage required.** EVERY one of
   the user's selected items below MUST appear in your emission tagged
   `source: cached` or `source: extended`. The user explicitly curated
   them via the Knowledge Library; the manifest is the binding contract;
   silent omission of any selected id is rejected by the Stop hook
   `validate_cached_selection_honored.py` (coverage threshold raised
   from 60% to 100% on 2026-06-06). New corpus discoveries go in IN
   ADDITION to the cached set as `source: new`.


3. **Why this matters.** The user curated the Knowledge Library selection
   deliberately. Regenerating from scratch ignores their curation and breaks
   the recursive self-improvement loop. The product is
   `{cached + extended + new}`, not `{new alone}`.

4. **Trace + frontier.** The per-deliverable auditor reads `items[].source`
   and computes `cached_selection_coverage_pct` as a qualityFrontier dim
   (direction: maximize, floor: 100). Epoch proposer mines low-coverage
   patterns as candidate skill-edit interventions.
