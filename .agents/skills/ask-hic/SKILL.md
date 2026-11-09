---
name: ask-hic
description: Router for the HiC skill library. Use when you know what you want to do but not which skill does it, or when starting any multi-step HiC job (a research run, an artifact, a prototype, a QA pass, a self-improvement pass) and you want the right skills in the right order.
invocation: model
---

# ask-hic

The HiC library holds 82 skill packages. That is more than anyone remembers, so the
usual failure is not a missing skill, it is a skill nobody reached for. This file maps
what you are trying to DO onto the skills that do it, in the order they compose.

Adapted from `ask-matt` in Matt Pocock's library, including its enforcement rule: a
router that names a skill which no longer exists, or omits one that does, is a router
that lies. `scripts/check-skills.mjs` fails the build when this file drifts out of sync
with the model-reachable packages, so keep it current when you add or rename one.

## How to read this

Each flow lists skills in composition order. Call them with the Skill tool. A skill
marked `invocation: runtime` in its frontmatter is NOT listed here: HiC's own generation
loader reads those by path from `hic-workspace/skill-manifest.json`, and you never invoke
them by hand.

Before any non-trivial pipeline, retrieval, routing, design-system, export or
self-improvement work, read **hic-unified-vision** first. It is the nine-phase contract
every other flow answers to.

## Flow: a research run, brief to corpus

1. **research-planner** decomposes the objective into sub-questions with priorities.
   Everything downstream grades itself against this plan, and a run without one records
   `planAbsent` rather than a coverage score.
2. **wiki-query-expander** fires several angle variants at the corpus, because one query
   only reaches one neighbourhood of the embedding space.
3. **wiki-reranker** cross-encodes a candidate set when the question is narrow.
4. **analog-finder** abstracts the problem and retrieves from adjacent industries, which
   is the only way out of the within-industry retrieval ceiling.
5. **source-ranker** and **source-yield-scorer** judge what came back.
6. **evidence-density-pre-checker** predicts whether this corpus can support the theme
   floor BEFORE generation, so a thin corpus gets fixed upstream rather than relaxed
   downstream.
7. **manifest-chunk-retrieval** is the contract for how a generator pulls evidence.
   Read it before writing any new generator.

## Flow: synthesis and themes

1. **theme-analyst** clusters, **topic-cluster-to-theme-converter** turns model topics
   into themes, **theme-yield-guarantee** enforces the floor.
2. **contradiction-finder** surfaces where sources actively disagree, instead of
   flattening the disagreement into a smooth consensus.
3. **second-order-thinker** asks what follows from the finding.
4. **meta-themes** finds patterns across engagements, which is the thing a single-run
   tool cannot do.
5. **cross-engagement-pattern-miner** writes the portfolio signal back into the wiki so
   the next run starts from it.

## Flow: an artifact (deck, report, explainer)

1. **deck-composer** is the single authority for `#slides` composition: archetype choice,
   the visual floor, the narrative arc, title craft. On deck surfaces it supersedes
   deck-narrative-composer and folds in infographic-composer.
2. **verbalized-sampling** before any creative or synthesis step, so the output is not
   the first conventional answer.
3. **human-voice-editor** alongside any authoring skill. It is the POSITIVE half of the
   writing contract; the 350-plus bans say what not to write, this says what to write.
4. **slide-title-lab** for action titles that state a judgment.
5. **quantification-architect** when a recommendation needs a target, and
   **pre-mortem** and **stakeholder-lens-auditor** before it ships.
6. **explainer** or **html-deliverable-composer** for a long-form human-read artifact.
7. **infographic-composer** for the data panels, **illustrator** and **designer** for
   the visual slots, **org-chart** and **mind-map-architect** for those shapes.
8. The per-exhibit illustrators when a specific diagram family is the deliverable:
   **journey-illustrator**, **blueprint-illustrator**, **arch-illustrator**,
   **org-illustrator**, **roadmap-illustrator**. Each owns the line-art contract for its
   own shape; do not hand a journey to the architecture illustrator.
9. **nxt-humans-slides** for the NXT deck chrome, and the brand voice packages
   **nxt-style** and **nu-style** when the artifact carries a specific brand. Brand is a
   token-mode flip on one component set, never a separate design.
10. **wiki-synthesizer** when several sources have to be read together into one passage
    rather than cited side by side.
11. **brief-dialog** for the two-persona brief a partner reads instead of a deck.
12. **critic-revise-loop** wraps any of the above in generate, critique, revise.

## Flow: a prototype (`#proto`)

1. **experience-prototype-composer** is the strict rule: compose only from the AI
   Experience Patterns catalog, never invent UI shapes.
2. **design-exemplar-curator** picks named exemplars and one framing.
3. **nxt-slot-illustrator** and **nano-banana-diagram-composer** fill the visual slots.
4. **export-paint-sync** before any export, or the capture races the paint.

## Flow: QA on something already generated

1. **preflight** before the run, **qa-gate** after it.
2. **self-review** and **stress-test** on the argument.
3. **drift-check** when the same prompt gives inconsistent output across runs.
4. **analyst-chat-formatter** for the shape of a non-hashtag chat reply.
5. The deterministic gates are code, not skills: the ten-stage chain in
   `services/artifactChain.ts` runs on every artifact, and `services/gatesBite.test.ts`
   proves each stage still rejects what it claims to reject.

## Flow: debugging HiC itself

1. **service-log-triage** first. The stated symptom is rarely the root cause, and the
   phase gate there is explicit: no red-capable command, no hypothesis.
2. **ai-output-syntax-repair** for truncated or malformed model output.
3. **fallback-event-surfacing** when a run silently degraded, and
   **rate-limit-pacer** when a provider is the constraint.
4. **long-running-service-call** is the wrapper contract for any call over ten seconds.
5. **failure-log** to record it so the next occurrence is cheaper.
6. **git-branch-protocol** before touching git. Never merge to main, never commit
   without approval.

## Flow: prompts and skills

1. **diagnose-prompt** to find the failure pattern, **constrain** to replace vague
   instructions with measurable ones, **lock-format** to stop output drift.
2. **decompose** when one prompt is doing too many jobs, **trim-prompt** when it is
   carrying dead weight, **score-prompt** and **before-after** to measure the change.
3. **guard** to add the failure-prevention layer.
4. **skillopt-validation-gate** on any proposed edit to this library. Its ten checks
   include the no-op test and the negation rule, which exist because a library gets
   worse by accumulating instructions nobody proved were needed.
5. **epoch-proposer** and **reinforcement-inference** for the self-improvement loop.

## Flow: platform work

1. **mcp-service-bootstrap** to scaffold a new MCP wrapper and register it.
2. **escape-audit** for Power Automate escape chains.
3. **deterministic-naming-pass** so a cached corpus produces identical identity fields
   across runs.
4. **preflight** and **rebuild-hic** around any container change: HiC has no HMR, so an
   unrebuilt container serves the old bundle and every conclusion drawn from it is
   about the old code.
