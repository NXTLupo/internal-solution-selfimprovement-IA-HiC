# Interview-Me-at-Intake - Implementation Plan (2026-06-25)

> Feature: an OPTIONAL "Interview me" button beside the Research Goal field. Click it and a model
> conducts a short adaptive interview (decision, audience, prior art, success criteria, constraints,
> horizon) that produces a HIGHLY REFINED research objective written back into the field. The user
> stays in control: it is optional, never blocks free typing, and the result is theirs to edit/accept.
>
> Vision fit (UNIFIED_VISION): this is **Reinforcement Inference applied PRE-task** - resolve
> uncertainty by re-asking BEFORE generating, instead of charging ahead on a vague goal. It directly
> attacks HiC's #1 documented failure: a one-liner goal -> reddit-deep auto-infers subreddits -> a
> Reddit-skewed, hollow deliverable (see research-run-failure-analysis-2026-06-18). CONVERGE, don't
> build-new: reuse `researchPlanner.ts` + mirror the existing `goalEnhancer`/`EnhanceButton` pattern;
> the interview prompt must be DOMAIN-NEUTRAL (the de-poisoning fix of 2026-06-24 applies). PLAN ONLY.

## Anchors (verified in code)
- Field: `App.tsx` ~L6395-6411 - `<textarea value={researchGoal} onChange={setResearchGoal}>` labeled
  "Research Goal", with `EnhancePreview`/`EnhanceButton handle={goalEnhancer}` already beside it
  (`flex justify-end mt-2`). The Interview-me button sits in that same action row.
- State: `researchGoal` / `setResearchGoal` (`App.tsx` L1290); the goal is the most load-bearing
  prompt (drives sources, themes, personas, deck per the field's own caption).
- Convergence service: `services/researchPlanner.ts` - `buildResearchPlan(input)` (Opus 4.8 /
  Gemini 3.1 Pro) + `reflectOnCollection` (Sonnet/Flash). Reuse its provider-call + plan shape.
- Existing precedent: `goalEnhancer` (EnhanceButton) already does a ONE-SHOT goal rewrite; Interview-me
  is its MULTI-TURN, higher-fidelity sibling.
- Downstream the refined objective feeds: engagement `research_goal` -> source-pack/subreddit selection
  -> `loadGenerationContext` -> `chunkRetrieval` `researchObjective` -> generateThemes. So a better
  objective improves EVERY stage.

## UX (recommended)
- A small secondary button **"Interview me"** in the existing action row next to "Enhance". Optional;
  the textarea remains fully usable without it.
- Click -> an **inline panel** below the field (not a full modal, not a chat-takeover) with a compact
  Q&A: the model asks ONE focused question at a time (adaptive), the user types a short answer, ~3-6
  turns. Affordances: "Skip this question", "Good enough - build it now", "Start over".
- On finish (or "build it now"), the model synthesizes a **refined objective**; show it as a
  preview/diff against the current field text; user clicks **"Use this"** (writes `researchGoal`) or
  edits inline first. Mirror the `EnhancePreview` accept pattern so it feels native.
- Render the Q&A with the existing `ChatProse` component (already NXT-styled) for zero new styling.
- Latency contract: use the `long-running-service-call` skill pattern (immediate in-panel "thinking",
  AbortSignal + bounded timeout, fast model) so the panel never feels hung.

## Data flow + output contract
New service `services/objectiveInterview.ts` (converges with `researchPlanner.ts`):
```
startInterview(seed: string): { state, firstQuestion }
nextTurn(state, answer: string): { state, nextQuestion | null }   // null => ready to synthesize
synthesizeObjective(state): {
  refinedObjective: string,            // 1-3 sentence scoped objective -> writes researchGoal
  scope: { decision, audience, priorArt, successCriteria, constraints, horizon, industry? },
  rationale: string                    // 1 line: what the interview sharpened
}
```
- The structured `scope` is the deeper win: `scope.industry` can auto-suggest the source pack and
  `scope.audience/decision/constraints` seed the manifest objective so COLLECTION is scoped (the
  article's "gate collection on a real brief", and the anti-Reddit-skew lever). v1 just fills the
  field; v2 wires `scope` into pack-suggest + the engagement brief.

## Model + loop
- Interview turns (conversational, adaptive): **Gemini 3.5 Flash** via `/api/ai/gemini` (HiC's plain-
  conversational tier; snappy). Cap at ~6 questions; ADAPTIVE - skip any dimension the seed already
  answers (RI: ask only what's missing/uncertain).
- Final synthesis: **Gemini 3.5 Flash** for v1 (latency), with an option to route synthesis to
  **Claude Opus 4.8** behind a flag if quality demands (it is intake, not a hashtag artifact, so Flash
  is the default-correct tier; do NOT force-route to Opus).
- Behavior lives in a new skill `.claude/skills/objective-interview/SKILL.md` (the question bank by
  dimension, the adaptive/RI logic, the output schema, the DOMAIN-NEUTRAL mandate). The service loads
  it (no orphan). Mirror how `research-planner` is consumed.

## Integration points (files)
- `App.tsx`: add `Interview me` button in the goal action row; local state for panel open + interview
  state; on accept -> `setResearchGoal(refinedObjective)` (+ stash `scope` for v2).
- NEW `components/ObjectiveInterview.tsx`: the inline Q&A panel (renders via `ChatProse`).
- NEW `services/objectiveInterview.ts`: the loop + synthesis (reuses researchPlanner's provider call).
- NEW `.claude/skills/objective-interview/SKILL.md`: the interview contract.
- v2: `scope` -> source-pack suggestion (proxy `/api/source-packs`) + engagement brief
  (`writeEngagementManifest` research_goal + a brief block) so collection/generation use it.

## VS pass - the design choices that matter (VS-CoT, k=3, moderate-tail)
<vs_thinking>Modal answers: "a #interview chat command" and "a full-screen modal wizard." The
command is an orphan (users won't discover it at intake); the full modal is heavy and fights the
existing field. The tail-but-right answer reuses the goalEnhancer surface the user already sees.</vs_thinking>

| Choice | Modal answer (reject) | Recommended (committed) |
|---|---|---|
| Surface | `#interview` chat command (p .40) - undiscoverable at intake, orphan-risk | **Button in the goal action row beside Enhance** (p .16) - native, optional, discoverable |
| Question flow | Fixed 6-question form (p .35) - just a longer form, not adaptive | **Adaptive, RI-driven**: ask only the dimensions the seed leaves uncertain; stop early when scoped (p .15) |
| Output | Replace the field silently (p .30) | **Preview/diff + "Use this" accept** (p .12) - preserves user authority, mirrors EnhancePreview |
| Model | Force Opus 4.8 (p .25) - over-spec for conversational intake, slow | **Gemini 3.5 Flash loop + optional Opus synthesis** (p .10) - HiC's correct tier for plain conversation |

## RI pass - confidence + verify-before-build
**overallConfidence: high** on approach (RI-pre-task + converge on researchPlanner/goalEnhancer);
**medium** on exact reuse seams. Verify before coding:
- Read `goalEnhancer`/`EnhanceButton`/`EnhancePreview` to copy the accept/preview pattern exactly
  (button placement, handle shape).
- Read `researchPlanner.ts` `buildResearchPlan` input/output to reuse its provider call + possibly
  pipe the synthesized objective straight into it (interview -> objective -> plan in one flow).
- Confirm `HeuristicBriefIntake.tsx` is the heuristic-UX path (a different mode) and not already an
  intake interview we should extend instead of duplicating.

## Phases (each gated: typecheck 0, vitest green, SPA rebuild + smoke, live run)
- **P1 - the feature**: button + `ObjectiveInterview.tsx` + `objectiveInterview.ts` (Flash adaptive
  loop + synthesis) + skill; fills `researchGoal` via preview/accept. Unit test the synthesis parser +
  a domain-neutrality test on the skill (no NEU bleed). Live: a vague seed ("research the new
  dashboard") yields a scoped objective. **Acceptance gate.**
- **P2 - scope -> collection**: pipe `scope` into source-pack suggestion + the engagement brief so
  collection is scoped (the anti-skew win). Gate: scoped objective reaches `chunkRetrieval`.
- **P3 (optional) - RI nudge**: when the typed goal is short/low-specificity, surface a gentle
  "Interview me?" hint (uncertainty-triggered), never auto-opening.

## Guardrails (HiC-specific)
- DOMAIN-NEUTRAL interview prompt (no higher-ed/advancement assumptions - the 2026-06-24 fix).
- Optional + non-blocking; free typing always works.
- User authority: the refined objective is previewed and editable; never silently overwrites.
- No orphan: the skill is loaded by the service; the button is wired; tests gate it.
- No stopgap: P1 ships the complete optional feature; P2 (scope->collection) is the durable extension,
  not a backlog excuse.
