---
title: HiC Deliverable Architecture Contract
type: architecture
version: 1.0.0
date: 2026-06-06
machine_readable: true
purpose: Single source of truth for every hashtag deliverable. The Hook Bus
  (dispatch_validators.py) reads the `deliverables` table at the bottom and
  dispatches to the named validators on every Stop event. The Emission Wrapper
  (services/emitDeliverable.ts) reads the same table to know which Pareto-
  frontier dim subset applies to each deliverable.
---

# HiC Deliverable Architecture Contract

This file is the **machine-readable contract** between four layers:

1. **SKILL** — per-deliverable expert; tells the model HOW to generate.
   Lives at `.claude/skills/{path}/SKILL.md`.
2. **HOOK (validators)** — runtime guardrails that REJECT non-compliant
   output. Live at `.claude/hooks/scripts/validate_*.py`. The Hook Bus
   (`dispatch_validators.py`) reads this file and routes to the
   appropriate validators.
3. **SUBAGENT** — async deep auditors invoked in parallel for high-cost
   verification (cross-cutting). Live at `.claude/agents/*.md`.
4. **SELF-IMPROVEMENT signals** — Pareto-frontier dim subset that the
   emission wrapper scores for each deliverable; feeds the epoch proposer.

## How to edit this file

The `deliverables:` YAML block at the bottom is **parsed at runtime** by:
- `.claude/hooks/scripts/dispatch_validators.py` (Hook Bus, reads `validators`)
- `humans-in-control-research/services/emitDeliverable.ts` (Emission Wrapper,
  reads `frontier_dims` to know which Pareto dims to score)
- `humans-in-control-research/services/hashtagRegistry.ts` cross-references
  `hashtag` field to confirm a skill exists for every registered hashtag

When you add a new deliverable, add an entry to BOTH the table below (human-
readable summary) AND the YAML block (machine-readable contract). The Hook
Bus warns if `hashtagRegistry.ts` has a hashtag with no matching entry here.

## Cross-cutting components (always-on, not per-deliverable)

| Component | Path | Purpose |
|---|---|---|
| Emission wrapper | `services/emitDeliverable.ts` | recordTurn + scoreOutput + setCommitment on every emission |
| Trace recorder | `services/traceRecorder.ts` | Per-turn ring buffer + disk persist (`sessions/<slug>/traces/`) |
| Pareto frontier | `services/qualityFrontier.ts` | 15+ dim scoring; the epoch proposer's M2 vector |
| Engagement commitment | `services/engagementCommitment.ts` | Per-engagement provider stickiness |
| Epoch proposer | `.claude/skills/epoch-proposer/SKILL.md` | Reads traces + drift-audit; proposes ONE harness edit per epoch |
| SkillOpt validation gate | `.claude/agents/skillopt-validation-gate.md` | Reviews proposed edits before they land |
| SkillOpt applier | `.claude/agents/skillopt-applier.md` | Applies approved edits to live `.claude/skills/` |
| Hook rejection log | `hic-workspace/wiki/synthesis/hook-rejection-log.md` | Hook Bus writes every rejection here for epoch-proposer mining |
| Drift audit | `hic-workspace/wiki/synthesis/drift-audit-*.md` | Cross-engagement gap catalog |
| Slide post-processor | `services/slidePostProcessor.ts` | Runtime slop scrubber: META + METAPHOR + format-tells |

## Hook Bus contract

`dispatch_validators.py` runs as the SINGLE registered Stop hook in
`.claude/settings.json`. It does NOT replace `humans-in-control-research/
hooks/validate_output.py` — both run, providing belt-and-suspenders. Bus
contract:

1. Read Stop event payload from stdin
2. Locate transcript file, extract last assistant message
3. For each `deliverables[*]` entry, run its `detection_pattern` against
   the message. If matched, run every validator in its `validators` list.
4. Aggregate all rejection reasons. Exit 2 + structured rejection if any.
5. Append every rejection (and every pass) to `hook-rejection-log.md` so
   the epoch proposer can mine which validators fire most often.

## Subagent invocation rule

Cross-cutting subagents (`evidence-quality-auditor`, `hic-output-qa`,
`export-render-verifier`, `dissent-panel`) are invoked by the parent
agent (orchestrator), NOT by the Hook Bus, because they spawn subprocess
LLMs and are too expensive to run on every Stop. The Hook Bus runs only
the synchronous Python validators.

## Coverage matrix (human-readable summary; see YAML below for contract)

| Hashtag | SKILL | Per-deliverable Validators | Frontier Dims |
|---|---|---|---|
| `#themes` | `theme-analyst`, `theme-yield-guarantee` | `validate_theme_yield`, `validate_theme_reproducibility`, `validate_titles`, `validate_no_em_dashes` | meta_narration_count, banned_phrase_count, external_citation_rate, action_title_rate |
| `#personas` | `persona-architect` | `validate_titles`, `validate_evidence`, `validate_quantification`, `validate_no_em_dashes` | meta_narration_count, evidence_density, banned_phrase_count |
| `#recommendations` | `recommendation-architect` | `validate_titles`, `validate_evidence`, `validate_quantification`, `validate_no_em_dashes`, `validate_speculative_claims` | meta_narration_count, action_title_rate, evidence_density, banned_phrase_count |
| `#journey` | `diagrams/journey-illustrator` | `validate_journey_overview_slide`, `validate_titles`, `validate_no_em_dashes`, `validate_speculative_claims` | meta_narration_count, banned_phrase_count, evidence_density |
| `#blueprint` | `service-blueprint-mapper` | `validate_freeform_structure`, `validate_titles`, `validate_evidence` | evidence_density, meta_narration_count |
| `#compete` | `competitive-analyst` | `validate_titles`, `validate_evidence`, `validate_quantification` | evidence_density, external_citation_rate |
| `#arch` | `tech-arch-generator` | `validate_titles`, `validate_no_em_dashes` | banned_phrase_count, meta_narration_count |
| `#audit` | `tech-audit-inspector` | `validate_titles`, `validate_evidence`, `validate_speculative_claims` | evidence_density, banned_phrase_count |
| `#gap` | `gap-analysis-evaluator` | `validate_titles`, `validate_evidence`, `validate_quantification` | meta_narration_count, evidence_density |
| `#prd` | `prd-compiler` | `validate_titles`, `validate_no_em_dashes` | action_title_rate, banned_phrase_count |
| `#roadmap` | `roadmap-builder` | `validate_titles`, `validate_quantification` | action_title_rate, meta_narration_count |
| `#brief` | `brief-dialog` | `validate_titles`, `validate_no_em_dashes`, `validate_no_emoji` | meta_narration_count, banned_phrase_count |
| `#report` | `strategic-report-writer`, `html-deliverable-composer` | `validate_titles`, `validate_evidence`, `validate_no_em_dashes` | evidence_density, action_title_rate, meta_narration_count |
| `#explainer` | `explainer` (authored 2026-06-06) | `validate_titles`, `validate_no_em_dashes` | meta_narration_count, banned_phrase_count |
| `#case-study` | `case-study-analyst` | `validate_titles`, `validate_evidence`, `validate_quantification` | evidence_density, action_title_rate |
| `#strategy` | `strategy-author`, `deck-narrative-composer` | `validate_titles`, `validate_evidence`, `validate_speculative_claims`, `validate_slide_variety` | meta_narration_count, evidence_density, action_title_rate |
| `#proto` | `experience-prototype-composer`, `design-exemplar-curator` | `validate_titles`, `validate_no_em_dashes` | meta_narration_count, banned_phrase_count |
| `#mindmap` | `mind-map-architect` | `validate_titles` | meta_narration_count |
| `#meta-themes` | `meta-themes` | `validate_titles`, `validate_evidence` | meta_narration_count, evidence_density |
| `#org` | `org-chart` (authored 2026-06-06) | `validate_titles` | meta_narration_count |
| `#presentation` | `nxt-humans-slides` _(partial)_ | `validate_titles`, `validate_no_em_dashes`, `validate_slide_variety` | meta_narration_count, action_title_rate |
| `#deep-research` | `research-planner` | `validate_evidence`, `validate_speculative_claims` | external_citation_rate, evidence_density |

## Global defaults (2026-06-06) — applied to EVERY deliverable

Three layers are now universal across all 22 deliverables, NOT enumerated per-entry below. The Hook Bus dispatcher and emission wrapper apply them by convention:

| Layer | Universal default | Per-deliverable override |
|-------|-------------------|--------------------------|
| Validator | `validate_cached_selection_honored.py` runs on every deliverable that has a per-deliverable skill | (none — universal) |
| Subagent | `{deliverable}-deliverable-auditor.md` exists for ALL 22 deliverables (18 authored 2026-06-06; 5 had existed prior in the C3 initial build) | Subagent's rubric extends with dim-11 cached-selection coverage |
| Frontier dim | `cached_selection_coverage_pct` (direction: maximize, floor: 60) added to every deliverable's scored vector | (none — universal) |
| Skill section | "Cached-selection contract" §N appended to all 19 per-deliverable skills (3 done in initial round, 16 batched 2026-06-06) | (none — universal) |

The per-entry validators / subagents_async / frontier_dims lists below are
augmented at runtime by these globals. An emit's actual hook + scoring stack
is: per-entry items + the global defaults above.

## YAML contract (parsed by Hook Bus + Emission Wrapper)

> Note: the universal validators (e.g. `validate_cached_selection_honored.py`)
> and universal auditors (`{deliverable}-deliverable-auditor.md`) are NOT
> enumerated in the per-deliverable entries below. The dispatcher's
> `UNIVERSAL_VALIDATORS` constant adds them to every matched deliverable's
> stack at runtime. See the "Global defaults" table above for the universal
> layer's contract.

```yaml
deliverables:
  - hashtag: '#themes'
    skill: .claude/skills/theme-analyst/SKILL.md
    detection_patterns:
      - 'template=theme-cluster'
      - 'template=theme-spotlight'
      - 'template=theme-arc'
      - 'template=theme-mosaic'
      - '#themes'
    validators:
      - validate_theme_yield.py
      - validate_theme_reproducibility.py
      - validate_titles.py
      - validate_no_em_dashes.py
      - validate_cached_selection_honored.py
    subagents_async:
      - evidence-quality-auditor
      - themes-deliverable-auditor
    frontier_dims:
      - meta_narration_count
      - banned_phrase_count
      - external_citation_rate
      - action_title_rate
      - cached_selection_coverage_pct

  - hashtag: '#personas'
    skill: .claude/skills/persona-architect/SKILL.md
    detection_patterns:
      - 'template=persona-card'
      - '#persona'
      - '#personas'
    validators:
      - validate_titles.py
      - validate_evidence.py
      - validate_quantification.py
      - validate_no_em_dashes.py
      - validate_cached_selection_honored.py
    subagents_async:
      - evidence-quality-auditor
      - personas-deliverable-auditor
    frontier_dims:
      - meta_narration_count
      - evidence_density
      - banned_phrase_count
      - cached_selection_coverage_pct

  - hashtag: '#recommendations'
    skill: .claude/skills/recommendation-architect/SKILL.md
    detection_patterns:
      - 'template=recommendation'
      - '#recommendations'
    validators:
      - validate_titles.py
      - validate_evidence.py
      - validate_quantification.py
      - validate_no_em_dashes.py
      - validate_speculative_claims.py
      - validate_cached_selection_honored.py
    subagents_async:
      - evidence-quality-auditor
      - dissent-panel
      - recommendations-deliverable-auditor
    frontier_dims:
      - meta_narration_count
      - action_title_rate
      - evidence_density
      - banned_phrase_count
      - cached_selection_coverage_pct

  - hashtag: '#journey'
    skill: .claude/skills/diagrams/journey-illustrator/SKILL.md
    detection_patterns:
      - 'template=journey'
      - 'nxt-process'
      - '#journey'
    validators:
      - validate_journey_overview_slide.py
      - validate_titles.py
      - validate_no_em_dashes.py
      - validate_speculative_claims.py
    subagents_async:
      - evidence-quality-auditor
      - hic-output-qa
    frontier_dims:
      - meta_narration_count
      - banned_phrase_count
      - evidence_density

  - hashtag: '#blueprint'
    skill: .claude/skills/service-blueprint-mapper/SKILL.md
    detection_patterns:
      - 'template=service-blueprint'
      - '#blueprint'
    validators:
      - validate_freeform_structure.py
      - validate_titles.py
      - validate_evidence.py
    subagents_async:
      - evidence-quality-auditor
    frontier_dims:
      - evidence_density
      - meta_narration_count

  - hashtag: '#compete'
    skill: .claude/skills/competitive-analyst/SKILL.md
    detection_patterns:
      - 'template=competitive-matrix'
      - '#compete'
    validators:
      - validate_titles.py
      - validate_evidence.py
      - validate_quantification.py
    subagents_async:
      - evidence-quality-auditor
    frontier_dims:
      - evidence_density
      - external_citation_rate

  - hashtag: '#arch'
    skill: .claude/skills/tech-arch-generator/SKILL.md
    detection_patterns:
      - 'template=architecture-map'
      - '#arch'
    validators:
      - validate_titles.py
      - validate_no_em_dashes.py
    frontier_dims:
      - banned_phrase_count
      - meta_narration_count

  - hashtag: '#audit'
    skill: .claude/skills/tech-audit-inspector/SKILL.md
    detection_patterns:
      - 'template=tech-audit'
      - 'template=systems-inventory'
      - '#audit'
    validators:
      - validate_titles.py
      - validate_evidence.py
      - validate_speculative_claims.py
    frontier_dims:
      - evidence_density
      - banned_phrase_count

  - hashtag: '#gap'
    skill: .claude/skills/gap-analysis-evaluator/SKILL.md
    detection_patterns:
      - 'template=gap-matrix'
      - '#gap'
    validators:
      - validate_titles.py
      - validate_evidence.py
      - validate_quantification.py
    frontier_dims:
      - meta_narration_count
      - evidence_density

  - hashtag: '#prd'
    skill: .claude/skills/prd-compiler/SKILL.md
    detection_patterns:
      - 'template=prd-feature'
      - '#prd'
    validators:
      - validate_titles.py
      - validate_no_em_dashes.py
    frontier_dims:
      - action_title_rate
      - banned_phrase_count

  - hashtag: '#roadmap'
    skill: .claude/skills/roadmap-builder/SKILL.md
    detection_patterns:
      - 'template=timeline'
      - '#roadmap'
    validators:
      - validate_titles.py
      - validate_quantification.py
    frontier_dims:
      - action_title_rate
      - meta_narration_count

  - hashtag: '#brief'
    skill: .claude/skills/brief-dialog/SKILL.md
    detection_patterns:
      - '#brief'
    validators:
      - validate_titles.py
      - validate_no_em_dashes.py
      - validate_no_emoji.py
    frontier_dims:
      - meta_narration_count
      - banned_phrase_count

  - hashtag: '#report'
    skill: .claude/skills/strategic-report-writer/SKILL.md
    detection_patterns:
      - '#report'
    validators:
      - validate_titles.py
      - validate_evidence.py
      - validate_no_em_dashes.py
    frontier_dims:
      - evidence_density
      - action_title_rate
      - meta_narration_count

  - hashtag: '#explainer'
    skill: null
    skill_status: MISSING — author at .claude/skills/explainer/SKILL.md
    detection_patterns:
      - '#explainer'
    validators:
      - validate_titles.py
      - validate_no_em_dashes.py
    frontier_dims:
      - meta_narration_count
      - banned_phrase_count

  - hashtag: '#case-study'
    skill: .claude/skills/case-study-analyst/SKILL.md
    detection_patterns:
      - 'template=case-study'
      - '#case-study'
    validators:
      - validate_titles.py
      - validate_evidence.py
      - validate_quantification.py
    frontier_dims:
      - evidence_density
      - action_title_rate

  - hashtag: '#strategy'
    skill: .claude/skills/strategy-author/SKILL.md
    detection_patterns:
      - '#strategy'
    validators:
      - validate_titles.py
      - validate_evidence.py
      - validate_speculative_claims.py
      - validate_slide_variety.py
    subagents_async:
      - evidence-quality-auditor
      - dissent-panel
    frontier_dims:
      - meta_narration_count
      - evidence_density
      - action_title_rate

  - hashtag: '#proto'
    skill: .claude/skills/experience-prototype-composer/SKILL.md
    detection_patterns:
      - '#proto'
    validators:
      - validate_titles.py
      - validate_no_em_dashes.py
    frontier_dims:
      - meta_narration_count
      - banned_phrase_count

  - hashtag: '#mindmap'
    skill: .claude/skills/mind-map-architect/SKILL.md
    detection_patterns:
      - '#mindmap'
    validators:
      - validate_titles.py
    frontier_dims:
      - meta_narration_count

  - hashtag: '#meta-themes'
    skill: .claude/skills/meta-themes/SKILL.md
    detection_patterns:
      - '#meta-themes'
    validators:
      - validate_titles.py
      - validate_evidence.py
    frontier_dims:
      - meta_narration_count
      - evidence_density

  - hashtag: '#org'
    skill: null
    skill_status: MISSING — author at .claude/skills/org-chart/SKILL.md
    detection_patterns:
      - '#org'
    validators:
      - validate_titles.py
    frontier_dims:
      - meta_narration_count

  - hashtag: '#presentation'
    skill: .claude/skills/nxt-humans-slides/SKILL.md
    skill_status: PARTIAL — needs completion for #NU brand path
    detection_patterns:
      - '#presentation'
      - '#presentations'
    validators:
      - validate_titles.py
      - validate_no_em_dashes.py
      - validate_slide_variety.py
    frontier_dims:
      - meta_narration_count
      - action_title_rate

  - hashtag: '#deep-research'
    skill: .claude/skills/research-planner/SKILL.md
    detection_patterns:
      - '#deep-research'
    validators:
      - validate_evidence.py
      - validate_speculative_claims.py
    frontier_dims:
      - external_citation_rate
      - evidence_density
```

## Self-improvement feedback contract

Every Hook Bus rejection writes one JSONL line to
`hic-workspace/wiki/synthesis/hook-rejection-log.md` with shape:

```json
{
  "ts_ms": 1780703385178,
  "engagement_slug": "...",
  "deliverable": "#journey",
  "validator": "validate_journey_overview_slide.py",
  "fail_reason": "R1 FAIL: No journey-overview-diagram slide...",
  "transcript_excerpt": "(first 400 chars of the rejected output)"
}
```

The epoch-proposer skill's Step-2a inspection
(`grep -l '"step_label":"commitment_change"' ...` already documented) is
extended to include this log on Step-2b
(`grep '"deliverable":"#X"' hook-rejection-log.md`). Recurring rejections
on the same `validator` for the same `deliverable` = a high-leverage
intervention candidate for that epoch.

## C3 — Per-deliverable auditor subagents (shipped 2026-06-06, 5 instances)

Five per-deliverable auditor subagents are now defined in `.claude/agents/`:

| Auditor | Audits | Lives at |
|---------|--------|----------|
| journey-deliverable-auditor | #journey + #blueprint output (phase coverage, cell anatomy, overview slide, action titles) | `.claude/agents/journey-deliverable-auditor.md` |
| recommendations-deliverable-auditor | #recommendations VS framing + tile execution depth + four-tuple quantification | `.claude/agents/recommendations-deliverable-auditor.md` |
| themes-deliverable-auditor | #themes yield + evidence anchoring + distinctiveness + naming determinism | `.claude/agents/themes-deliverable-auditor.md` |
| personas-deliverable-auditor | #personas Cooper-goal-hierarchy + JTBD + verbatim quote authenticity + elasticity rejection | `.claude/agents/personas-deliverable-auditor.md` |
| strategy-deliverable-auditor | #strategy Rumelt's Kernel + pre-mortem coverage + second-order depth | `.claude/agents/strategy-deliverable-auditor.md` |

Each auditor emits a structured YAML verdict appended to `hic-workspace/wiki/synthesis/auditor-verdicts.jsonl` for the epoch-proposer to mine. Remaining deliverables (#blueprint, #compete, #arch, #audit, #gap, #prd, #roadmap, #brief, #report, #explainer, #case-study, #proto, #mindmap, #meta-themes, #org, #presentation, #deep-research) inherit cross-cutting subagents (`evidence-quality-auditor`, `hic-output-qa`) until their per-deliverable auditors are written.

## C6 — Epoch outcome tracker (shipped 2026-06-06)

`services/epochOutcomeTracker.ts` + proxy endpoints `/api/epochs/{epoch_id}/outcome` (append) and `/api/epochs/{epoch_id}/outcomes` (read aggregate). Closes the self-improvement feedback loop:

1. `bindActiveEpoch(EpochRecord)` — SkillOpt applier calls this after an edit lands; tags subsequent deliverables with epoch_id.
2. `emitDeliverable` automatically invokes `scoreEpochOutcome` after every Pareto-scored emission; outcomes append to `hic-workspace/wiki/synthesis/epoch-outcomes/{epoch_id}.jsonl`.
3. The epoch-proposer's next round calls `computeEpochVerdict(epoch_id)` which returns `keep` / `rollback` / `human-review` based on `dominate_rate` (target dims improved) vs `regression_rate` (floor dims degraded ≥20%).

Decision thresholds:
- `samples < 5` → human-review (insufficient data)
- `regression_rate > 30%` → rollback (the edit demonstrably degraded multiple deliverables on floor dims)
- `dominate_rate > 60%` → keep (the edit demonstrably improved multiple deliverables)
- otherwise → human-review

## What this doc does NOT cover (yet)

- Routing for `#refine` and other meta-commands (not deliverable-typed)
- Brand-specific validator subsets (NXT vs NU branding rules — handled by `slidePostProcessor` brand awareness, not per-deliverable here)
- Per-deliverable auditors for the remaining 13 hashtags (templated; can be filled in incrementally — see C3 above for the 5 shipped instances as templates)

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-06-06 | Initial coverage matrix + YAML contract. C1+C2+C4 build. |
