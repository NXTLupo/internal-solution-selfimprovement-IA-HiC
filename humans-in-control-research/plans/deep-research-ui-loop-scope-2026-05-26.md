# Deep Research Plan-Act-Reflect UI Loop — Scope Document

**Status**: Backend functional, UI iteration loop deferred for focused
build. The current `#deep-research <goal>` chat directive runs end-to-end
and produces a research_plan.json + plan HTML rendered in the Design Desk.
What's MISSING is the user-in-the-loop iteration UI.

**Why deferred from the 2026-05-26 bulk-ship sprint**: A correct
implementation needs editable-form UI for the plan JSON, an Approve
button, an iteration runner that fires the data fabric in a loop with
reflection traces, and real-time progress. That's a 2-4 hour focused
build and crosses too many surfaces (chat → plan-edit modal → iteration
runner → wiki persistence → trace renderer) to ship cleanly inside a
bulk latency sprint.

## What works today

`services/researchPlanner.ts::buildResearchPlan(goal, proxy_base)`
produces a structured `research_plan.json`:

```ts
{
  goal: string;
  sub_questions: SubQuestion[];
  source_strategy: SourceStrategy;
  named_institutions: string[];
  expected_theme_count: number;
  budget_cap_usd: number;
  reflection_threshold: number;  // 0..1 — fire reflection if confidence < this
  max_iterations: number;
}
```

The plan HTML renders in Design Desk via `renderResearchPlanHtml` and
lands as a FreeformArtifact. The user CAN see the plan today; they just
can't edit it AND trigger a plan-act-reflect loop from the UI.

## What needs to be built — three components

### 1. Plan editor modal

A new `components/ResearchPlanEditor.tsx` that opens when a research-plan
artifact is clicked in the Design Desk. Renders the plan JSON as
editable form fields:

- Sub-questions list (add / remove / reorder rows)
- Source strategy multi-select (which connectors to include)
- Named institutions chips
- Budget cap (USD slider, 1-50)
- Reflection threshold (0.5-0.95 slider)
- Max iterations (3-10 selector)

Save button writes back to `research_plan.json` in the engagement's wiki
directory. Approve button kicks off the runner (#2).

### 2. Plan-act-reflect runner

A new service `services/researchPlanRunner.ts` that takes the approved
plan and runs:

```
for iter in range(max_iterations):
  for sub_q in plan.sub_questions where not sub_q.resolved:
    results = data_fabric.fetch(sub_q.query, sources=plan.source_strategy)
    reflection = await reflect(sub_q, results, model="claude-sonnet-4-6")
    if reflection.verdict in ("covered", "rejected"):
      sub_q.resolved = true
      sub_q.evidence = results
    elif reflection.verdict == "new_question":
      plan.sub_questions.append(reflection.new_question)
    sub_q.reflection_trace.append(reflection)
  if all(sub_q.resolved for sub_q in plan.sub_questions):
    break
  if spend_so_far >= plan.budget_cap_usd:
    break
```

Reflection traces persisted to
`hic-workspace/engagements/<slug>/research_log.json`.

### 3. Live reflection trace renderer

A panel that shows reflection trace as the runner fires, updating in
real-time via SSE or websocket. Each row: sub-question, iteration N,
reflection verdict, evidence count, spend so far. User can pause / abort
at any iteration boundary.

## What this unblocks

NotebookLM has a "Deep Research" feature that runs a fully autonomous
plan-act-reflect loop. HiC's differentiation is the HUMAN-IN-CONTROL
checkpoint at the planning stage (the user edits the plan BEFORE
collection starts) AND the iteration boundaries (user can pause mid-run).

The standing-rule basis for this:
- `feedback_quality_first_never_relax_default` — quality is owned by the
  human checkpoint, not by lowered automation thresholds.
- The "Humans in Control" framing across the entire platform — the
  control surface for deep research must be human-driven.

## Why it's the highest-leverage UI work remaining

- All four NotebookLM uplift phases (Phase 4 mind-map, Phase 5 deep
  research, Phase 6 meta-themes, Phase 7 the integration) hinge on the
  user trusting the planning step. Without the editable plan, the
  whole NotebookLM uplift is "trust the AI's plan" which contradicts
  the platform's identity.
- It's the highest-visibility differentiator vs NotebookLM. Every other
  feature can be argued as "NotebookLM has that too"; this one
  cannot.

## Composes with

- The `research-planner` skill that already generates plans.
- The `reinforcement-inference` wrapper at
  `services/reinforcementInference.ts` — reflection verdicts that come
  back as "needs more evidence" can trigger anchored re-asks against the
  prior plan, rather than discarding the iteration.
- The `cross-engagement-pattern-miner` — every completed
  plan-act-reflect run feeds the pattern miner with new trajectory
  evidence, which can then propose plan-template improvements via
  SkillOpt (now gated by `skillopt-validation-gate`).
