---
name: skillopt-validation-gate
invocation: human
disable-model-invocation: true
description: Validation gate that audits every SkillOpt-proposed skill edit BEFORE it lands in the skill library. Catches compounding bad instructions, blocks iterative drift, and only lets approved deltas pass into .claude/skills/. The validation gate is where optimization actually works — most systems just apply suggestions and compound bad edits into the skill library, producing skills that get worse over time, not better. This gate sits between the SkillOpt trajectory analysis (which scans hic-workspace/sessions/_journey-rollouts/ for user-rejected outputs and proposes skill edits) and the actual skill-library write. Use when the SkillOpt training loop emits a proposed_edits.json file, when running the weekly /loop training pass, or when any pipeline proposes mutating a SKILL.md or its referenced wiki frameworks. Composes with cross-engagement-pattern-miner (provides the corpus of trajectories), validate_ai_slop and validate_ai_output_syntax (apply same banned-phrase + structural checks to skill edits), and the wiki-curator subagent (which the gate flags for human review when it can't auto-decide).
---

# SkillOpt Validation Gate

> "The validation gate is where optimization actually works. Most systems
> just apply suggestions and compound bad instructions into your skill
> library. Catching edits before they stick stops iterative drift and
> keeps improvement real."

This is the centerpiece of the HiC SkillOpt loop. Without it, every weekly
training pass risks making the skill library WORSE by absorbing edits
that look plausible but encode regressions, bias, or scope creep.

## What it gates

Any process that proposes a write to `.claude/skills/*/SKILL.md` or to a
wiki framework page (`hic-workspace/wiki/frameworks/*.md`,
`hic-workspace/wiki/anti-patterns/*.md`,
`hic-workspace/wiki/exemplars/*.md`) MUST pass through this gate first.
Specifically:

- The `extract-rollouts.py` SkillOpt trajectory miner that runs against
  `hic-workspace/sessions/_journey-rollouts/`.
- The `cross-engagement-pattern-miner` skill's `wiki/synthesis/cross-
  engagement-patterns.md` write step.
- The `wiki-curator` subagent's auto-rewrite proposals.
- Any human-authored skill edit during a /loop session that originated
  from a prior failure analysis (because the proposal might itself
  encode the failure pattern).

## The 10-check validation rubric

Each proposed edit is scored independently on these dimensions. ANY hard
fail blocks the edit. Soft fails accumulate; ≥ 3 soft fails block.

### 1. Source attribution (HARD)
The edit MUST cite the specific rollout(s), commit(s), or user feedback
signal(s) that motivated it. An edit with no source citation is
unprovenanced — block.

Pattern to require: `Source: rollout-{id} / commit-{sha} / feedback-{id}`
at the top of the proposed diff.

### 2. Anti-regression contract (HARD)
The edit MUST NOT contradict an existing standing rule in any
`memory/feedback_*.md` file. Cross-reference:

- `feedback_quality_first_never_relax_default.md`
- `feedback_determinism_first_for_cached_runs.md`
- `feedback_check_sister_services_first.md`
- `feedback_multi_model_resilience_pattern.md`
- `feedback_no_self_referential_output.md`
- `feedback_hashtag_routing_dominance.md`
- `feedback_journey_must_route_to_journey_mapper.md`
- `feedback_cross_service_payload_contract.md`
- `feedback_large_block_deletion.md`

If the edit relaxes a floor, removes a fail-loud guard, or proposes a
fork of a sister service, block.

### 3. Slop + format compliance (HARD)
The edit text MUST pass the same Stop-hook rubric the gate enforces on
deliverables: no em-dashes, no banned slop phrases, no meta-narration,
no knowledge-cutoff disclaimers, no reporting-depth metadata. Run the
proposed text through `validate_ai_slop.py` and `validate_no_em_dashes.py`
in dry-run mode.

### 4. Specificity test (SOFT)
The edit MUST replace at least one vague instruction with a measurable
one, OR add a concrete example, OR add a fail condition. Edits that
just rephrase existing prose with no new constraint are noise.

Counter-pattern (block): "Be more thorough when generating themes."
Approved pattern: "Themes must each cite ≥ 3 named external sources;
hook validate_evidence.py enforces."

### 5. Single-source-of-truth check (SOFT)
The edit MUST NOT duplicate guidance that already exists elsewhere.
Cross-reference the existing SKILL.md AND every memory file. If the same
rule appears in two places, the edit should LINK to the canonical rule,
not duplicate it.

### 6. Scope creep guard (SOFT)
The edit MUST stay within the skill's `description` frontmatter scope.
A SkillOpt pass on `persona-architect` should not mutate generic chat
behavior; an edit to `slide-title-lab` should not change theme synthesis.
If the proposed edit crosses skill boundaries, split into per-skill
proposals.

### 7. Reversibility (SOFT)
The edit MUST be reversible — phrased as an addition or a replacement,
NOT a wholesale rewrite that loses prior detail. SkillOpt suggesting
"rewrite the whole skill" is almost always a sign the trajectory miner
saw a single bad rollout and over-generalized; block and require
finer-grained proposals.

### 8. Batch curation (HARD, batch-level — ECC learning-curation, 2026-07-01)
Checks 1-7 audit one proposal in isolation; this check audits the BATCH.
The library gets WORSE, not better, when it accumulates many low-confidence,
duplicated, or mutually-contradictory instructions. So, across the whole
`proposed_edits.json` batch:
- **Cross-proposal contradiction (HARD):** if two proposals in the batch
  give conflicting guidance for the same skill/situation (e.g. one says
  "lead with the number", another says "never lead with a number"), BLOCK
  both and require the miner to reconcile them into one. Check 2 only guards
  against contradicting EXISTING standing rules; this guards against the
  batch contradicting itself.
- **Duplicate-within-batch (HARD):** if two proposals encode the same
  guidance (even if worded differently), keep the single most-specific,
  best-attributed one and BLOCK the rest as redundant.
- **Bulk-generation guard (SOFT):** prefer a SMALL set of high-confidence,
  well-attributed edits over a large bulk-generated set. If a batch carries
  more than ~5 proposals for one skill, or the median source-attribution is
  a single rollout, treat the batch as over-generated: HUMAN-REVIEW the
  batch as a whole and keep only the top few by confidence x attribution.
Rationale: "prefer a small accurate set of instructions over a bulk,
duplicated, or contradictory one" — accuracy and coherence beat volume.

### 9. No-op check (SOFT, E2.3 2026-08-21)
An instruction the model already obeys by default pays context to say
nothing. Adapted from `writing-for-agents`: a no-op is settled by RUNNING
the document, not by arguing about it. So before accepting an edit that
adds a rule, ask whether the current skill already produces that behaviour.
If a rollout cannot be produced where the skill misbehaved without the new
line, the edit is sediment: SOFT-fail it and require the miner to attach
the rollout that shows the failure. "Adding feels safe and removing feels
risky" is exactly how a skill library silts up.

### 10. Negation check (HARD, E2.3 2026-08-21)
Steering by prohibition drags the forbidden behaviour into context and makes
it MORE available, so a rule phrased only as a ban is weaker than the same
rule phrased as a target. This matters more here than almost anywhere,
because HiC's writing control is already 350-plus prohibitions.

BLOCK any proposed edit that adds a prohibition with no positive target
beside it. The remedy is not to delete the ban, it is to pair it:

- REJECTED: "Never open a section with a statistic."
- ACCEPTED: "Open a section with the judgment the evidence supports, and
  keep the supporting figure inside a cited quote. Never open with a bare
  statistic."

A prohibition may stand alone ONLY when it is a hard guardrail that cannot
be phrased positively (an em-dash ban, a fabrication ban). If the proposal
claims that exemption, it must say why the positive form is impossible.

## Output format

The gate emits one verdict file per proposal:
`hic-workspace/skillopt/proposals/{skill-id}-{timestamp}.verdict.md`

```
# SkillOpt Verdict — {skill-id} — {timestamp}

## Proposed edit
{the diff or full edit text}

## Source attribution
{citation rollout/commit/feedback ids}

## Rubric scores
- [1] Source attribution: PASS / HARD-FAIL
- [2] Anti-regression contract: PASS / HARD-FAIL (cites {standing-rule})
- [3] Slop + format: PASS / HARD-FAIL ({offending tokens})
- [4] Specificity: PASS / SOFT-FAIL
- [5] Single-source-of-truth: PASS / SOFT-FAIL ({duplicate location})
- [6] Scope creep: PASS / SOFT-FAIL
- [7] Reversibility: PASS / SOFT-FAIL
- [8] Batch curation: PASS / HARD-FAIL ({contradicting/duplicate proposal id}) / SOFT-FAIL (over-generated batch)

## Verdict
APPROVE / BLOCK / HUMAN-REVIEW

## Next action
{specific change required for the proposal to be re-submitted, OR
"apply via skillopt-applier subagent", OR "discard"}
```

## When to escalate to HUMAN-REVIEW

The gate auto-APPROVES when all 10 checks pass with no soft fails. It
auto-BLOCKS on any hard fail (including a check-8 cross-proposal
contradiction or within-batch duplicate). Anything in between (1-2 soft
fails, e.g. an over-generated batch) escalates to HUMAN-REVIEW with a
1-line summary the user can decide on during the next /loop pass.

## Composes with

- `cross-engagement-pattern-miner` — the upstream miner that generates
  the trajectory data the gate validates against. Pattern miner's
  output is the ONLY allowed input to SkillOpt; ad-hoc proposals must
  cite the miner's output.
- `validate_ai_slop`, `validate_no_em_dashes`, `validate_ai_output_syntax`
  — invoked in dry-run mode against the proposed edit text.
- `wiki-curator` subagent — when an edit passes the gate but its
  application would create a wiki page write, wiki-curator audits
  cross-page consistency before the write lands.

## Anti-patterns

- DO NOT bypass the gate "just this once" because a proposed edit looks
  obviously correct. The whole POINT is that bad edits look correct.
- DO NOT batch-apply approved edits without re-running the
  cross-engagement miner against the post-edit skill library. An
  edit that passes the gate in isolation may compose badly with other
  approved edits. The miner re-scan catches composition bugs.
- DO NOT lower the rubric thresholds because the queue is getting
  long. A blocked edit is doing its job. Long queues mean the
  trajectory miner is producing low-quality proposals — the right
  response is to tune the miner upstream, not the gate downstream.
