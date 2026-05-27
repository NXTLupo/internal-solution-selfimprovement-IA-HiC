---
name: critic-revise-loop
version: 1.0
description: The architectural primitive that wraps any deliverable in a generator → critic → revisor loop. Inspired by NotebookLM's Audio Overview pipeline (outline → critique → revise → script → critique → revise). Takes (deliverable_draft, [critic_skills], revisor_model, budget) and runs critics in sequence; each critic emits structured edits which the revisor applies; loop until all critics accept OR iterations/budget exhausted. Makes Phases 4-6 of the NotebookLM uplift plan cheap by providing a composable primitive instead of bespoke per-deliverable pipelines. Composes with pre-mortem, stakeholder-lens-auditor, quantification-architect, contradiction-finder, second-order-thinker as critics; uses Sonnet 4.6 as the default revisor.
thinking: high
category: architectural-primitive
triggers:
  - critic revise
  - generator critic revisor
  - "#critique-loop"
  - "#revise"
  - iterate deliverable
---

# Critic-Revise Loop

## You Are

The composable architectural primitive that turns any existing single-shot generator into a multi-pass synthesis with embedded critiques. Before this primitive, every deliverable that needed a critic pass had to build its own ad-hoc orchestration (`pre-mortem-runner` for recommendations; nothing for personas; nothing for strategy). After this primitive, every deliverable can opt-in to any subset of critic skills with one function call.

The pattern (from NotebookLM's six-pass Audio Overview pipeline): `outline → critique → revise → script → critique → revise`. The architectural insight isn't that critics improve output — that's well-known. The insight is that the **critic returns structured edits, not a verdict**, and the **revisor is a separate model role** whose only job is applying those edits idempotently.

## When to activate

- Any deliverable that has been DRAFTED and needs critique-revision before shipping
- Specifically the high-stakes deliverables: recommendations, personas, strategy, roadmap, case studies, briefs that go to executive audiences
- Whenever a user invokes `#critique-loop <deliverable>` or `#revise <deliverable>`
- Internal callers in the pipeline (Phases 4-6 of the NotebookLM uplift plan all reuse this)

Do NOT activate when:
- The deliverable is exploratory / discovery (variance is the goal, not convergence)
- The deliverable type lacks an applicable critic (e.g., themes — BERTopic + LLM naming is already deterministic; no critic adds value)
- The user is iterating fast and wants the next variant, not the polished version

## The contract

### CriticVerdict — what every critic must return

```typescript
type CriticVerdict = {
    accept: boolean;            // does the critic accept the deliverable as-is?
    edits: Array<CriticEdit>;   // structured edits to apply (empty if accept=true)
    rationale: string;          // one-paragraph explanation of the verdict
    confidence: 'high' | 'medium' | 'low';
};

type CriticEdit = {
    target_path: string;        // dot-path or JSONPath into the deliverable JSON
    action: 'replace' | 'append' | 'remove';
    new_value?: unknown;        // required for replace/append; ignored for remove
    reason: string;             // why the critic wants this edit
};
```

The critic skill MUST be invocable with `(deliverable_json, critic_context)` → CriticVerdict. Existing critics (`pre-mortem`, `stakeholder-lens-auditor`, `quantification-architect`, `contradiction-finder`, `second-order-thinker`) need a thin adapter that wraps their existing output in this contract.

### RevisorContract — what the revisor must do

```typescript
type RevisorContract = (
    deliverable: any,
    edits: CriticEdit[]
) => Promise<any>;  // returns edited deliverable
```

The revisor is a Sonnet 4.6 call at `temperature=0.1` whose only instruction is: "Apply these structured edits to the deliverable JSON. Do not improvise. Do not add fields not in the edits list. Output the edited JSON only."

### Loop control

```typescript
type CriticReviseLoopOpts<T> = {
    deliverable: T;
    critics: Array<{
        skill_name: string;
        max_iterations: number;          // per-critic cap; default 2
        invocation_model: 'sonnet-4.6' | 'opus-4.7' | 'haiku-4.5';
    }>;
    revisor_model: 'sonnet-4.6' | 'haiku-4.5';
    halt_when: 'all_accept' | 'iterations_exhausted' | 'budget_breached';
    budget_usd?: number;                 // hard cost cap; default $0.50
    surface_critique_log: boolean;       // emit to degradation_events; default true
};
```

### Loop execution

```
for critic in critics:
    iteration = 0
    while iteration < critic.max_iterations:
        verdict = invoke_critic(critic.skill_name, current_deliverable)
        log(verdict)
        if verdict.accept:
            break
        current_deliverable = revisor(current_deliverable, verdict.edits)
        iteration += 1
        if total_cost_usd > budget_usd:
            halt('budget_breached')
            break

return current_deliverable, critique_log, total_cost
```

### Why critics return EDITS, not REWRITES

Three reasons:
1. **Idempotency.** Two critics can target different fields without conflicting. If both rewrote the whole deliverable, the second would clobber the first.
2. **Auditability.** Every edit has a `reason` field. The critique_log is a structured record the user can inspect to see exactly what changed and why.
3. **Cost.** Critics are Sonnet ($) emitting small JSON diffs; rewriters would be Opus ($$$) emitting large prose. The split halves cost per loop.

## Hard rules

1. **Critics MUST emit structured edits, not prose rewrites.** Adapter layer enforces this. A critic that returns "here's the rewritten deliverable" is rejected.
2. **Revisor MUST apply edits idempotently.** Running the same edit list on the same deliverable twice produces the same output.
3. **Budget cap is mandatory.** No loop runs without a `budget_usd` cap. Default $0.50; can be raised per call.
4. **All critique iterations log to degradation_events** when `surface_critique_log: true` (default). User sees what changed.
5. **No silent halt.** Every halt reason (`all_accept` / `iterations_exhausted` / `budget_breached`) is surfaced in the result.
6. **No emoji.** Repo-wide rule.

## Composition with existing critic skills

| Critic skill | Adapter status | Edit types produced |
|---|---|---|
| `pre-mortem` | NEW adapter required | append risk_register[] entries; append pre_commitment field per high×high failure mode |
| `stakeholder-lens-auditor` | NEW adapter required | append stakeholder_audit.{lens}.objections[]; replace recommendation status if SHOWSTOPPER |
| `quantification-architect` | NEW adapter required | append quantification.{baseline,target,measurement_method,refresh_cadence}; replace status if BLOCKED |
| `contradiction-finder` | NEW adapter required | append contradictions[]; replace confidence field if low |
| `second-order-thinker` | NEW adapter required | append second_order_effects[]; append feedback_loops[] |

Adapters live alongside the existing critic skills as a parallel `_adapter.ts` file per critic. Wrote once.

## Default presets

Three preset critic configurations for the common deliverables:

```typescript
const RECOMMENDATIONS_LOOP = {
    critics: [
        { skill_name: 'pre-mortem', max_iterations: 2, invocation_model: 'sonnet-4.6' },
        { skill_name: 'stakeholder-lens-auditor', max_iterations: 2, invocation_model: 'sonnet-4.6' },
        { skill_name: 'quantification-architect', max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],
    revisor_model: 'sonnet-4.6',
    halt_when: 'all_accept',
    budget_usd: 0.50,
};

const PERSONAS_LOOP = {
    critics: [
        { skill_name: 'contradiction-finder', max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],
    revisor_model: 'sonnet-4.6',
    halt_when: 'all_accept',
    budget_usd: 0.25,
};

const STRATEGY_LOOP = {
    critics: [
        { skill_name: 'second-order-thinker', max_iterations: 2, invocation_model: 'opus-4.7' },
        { skill_name: 'pre-mortem', max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],
    revisor_model: 'sonnet-4.6',
    halt_when: 'all_accept',
    budget_usd: 0.75,
};
```

## Failure modes to avoid

- **Critic produces edits that conflict with another critic's edits.** If `pre-mortem` and `stakeholder-lens-auditor` both want to edit `recommendations[3].status`, the second edit clobbers the first. Mitigation: critics target distinct field families by convention (pre-mortem owns `risk_register[]`; stakeholder-lens owns `stakeholder_audit[]`; quantification owns `quantification`).
- **Revisor invents fields not in the edits.** Mitigation: revisor prompt is explicit and short. Add a post-revision schema check.
- **Critic accepts everything (no-op critic).** Mitigation: track `accept_rate` per critic across runs; flag critics that accept >95% of inputs as broken.
- **Loop runs forever on contradicting critics.** Mitigation: `iterations_exhausted` halt. Halt is a real ship state, not a failure.

## Engineering implementation

TypeScript file at `humans-in-control-research/services/criticReviseLoop.ts`. The function signature is exactly the contract above. Each critic skill's adapter wraps its existing output in a `CriticVerdict`. The revisor is one Sonnet 4.6 call with a fixed prompt template.

## Composition

- **Reused by** Phase 5 (Deep Research planner: `reflector` is a critic, `planner` is a revisor)
- **Reused by** Phase 6 (`brief-dialog` uses two critics — Skeptical Partner + Curious Strategist — alternating per turn)
- **Reused by** the existing `pre-mortem-runner` subagent (refactored to use this primitive)
- **Pairs with** `validate_no_silent_fallback.py` Stop hook (critique iterations surface as degradation_events)
- **Calibrated by** `cross-engagement-pattern-miner` (critic accept rates per deliverable type become quality anchors)
