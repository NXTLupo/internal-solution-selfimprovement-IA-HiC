---
name: prd-compiler
description: "Compile the one PRD contract (PrdAir, spec v2026) from typed AIR references: two tiers, twelve sections, a Source to Signal traceability graph, evidence-derived MoSCoW tiers, seven-field success signals, and the typed requirement_target number rule. Document first; the deck is a projection."
invocation: runtime
disable-model-invocation: true
version: "2.0"
status: active
thinking: high
triggers:
  - PRD
  - requirements
  - feature spec
  - feature
  - features
  - product requirements
  - user story
  - user stories
  - epics
  - feature list
  - product specification
  - spec
  - specifications
  - acceptance criteria
  - must have
  - should have
  - MoSCoW
  - moscow
  - backlog
  - release plan
composes_with:
  - source-ranker
  - human-voice-editor
loader:
  title: PRD Compiler
  role: research-deliverable
  execution_context: subagent
  wiki_companions:
    - frameworks/prd.md
    - anti-patterns/prd.md
  benchmarks:
    - benchmarks/technology-adoption.md
  output_types:
    - grid-matrix
    - evidence-block
    - split-panel
    - comparison-table
---

# Product Requirements Document Compilation (v2026)

## What changed and why (2026-10-01)

Finding F1 of `humans-in-control-research/plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md`
found four PRD shapes with no shared contract: a sixteen-section pipeline stage fed EMPTY persona and
theme arrays, a `prd-feature` slide set whose deck fence (`slides:prd-feature`) was not a registered
archetype and fell through to the generic renderer, a `:::deliverable:prd_feature` chat block, and the
prototype brief's `prd_candidate`. Finding F3 found this skill and the wiki pages teaching the model to
write figures. This version replaces all of that with ONE contract and ONE number rule.

- Contract: `humans-in-control-research/services/prdAir.ts` (`PrdAir`), schema
  `humans-in-control-research/schemas/prd_air.schema.json`.
- Prompt builder and parser: `humans-in-control-research/services/prdCompiler.ts`
  (`buildPrdCompilerPrompt`, `compilePrdAir`). The prompt you receive at runtime IS that builder's
  output; this page is the skill of record it encodes.
- Projection: `humans-in-control-research/services/prdProjection.ts` renders the two-tier HTML document
  (the `#prd` artifact, gated by the HTML artifact chain like `#report`) and the eight-to-ten-slide deck
  (`slides:prd-story`, `slides:prd-ledger`, `slides:prd-signals`, `slides:prd-trace`, plus cover,
  thesis-interstitial, role-needs and flow-arc).
- Rubric: `humans-in-control-research/hic-workspace/wiki/eval/rubrics/prd-rubric.json` (ten items, a one
  on items two, six or eight withholds the artifact).

## You are

A senior product manager writing the document an engineer and a designer could start from without a
clarifying meeting, and an auditor could trace to its sources. You write about the SUBJECT the objective
names (the product, its users, the decision), never about how to write or position the document.

## Input contract (typed references, never empty arrays)

The runtime hands you, by id:

- The research objective, the decision it supports and the audience.
- APPROVED PERSONAS (`PE-*`): name, role, primary flag, stage of struggle, pain points with their quotes.
- APPROVED THEMES (`T-*`): name, insight, quotes with sources and pointers.
- JOURNEY PAIN POINTS (`JP-*`): stage, text, quote, source, persona ids.
- COMPETITIVE GAPS (`CG-*`): the second permitted root for a requirement.
- EVIDENCE: the chunks and quotes you may quote from, each with a bracketed evidence id and its source.

If no pain root and no competitive gap is present, the compiler refuses to run (`PrdInputsError`); it never
asks you to invent one.

## Output contract

One JSON object in the draft shape the runtime prompt prints (title, thesis, problem, whyNow, usersAndJobs,
goalsNonGoalsAppetite, pains, competitiveGapQuotes, requirements with acceptanceTests, signals,
hypotheses, solutionFlows, quality, risks, delivery). The compiler turns it into `PrdAir`:

- Every quote you write is VERBATIM text copied from an EVIDENCE item and carries that item's
  `evidenceId`. The compiler verifies the text against the item and copies the source and pointer from the
  item. A quote that does not match is dropped; a pain left without a quote is dropped; a requirement left
  without a pain or gap is typed HYPOTHESIS and rendered as a NON-OBVIOUS BET. You never author a source
  name, a publication, an author or a date.
- You PROPOSE a tier (`proposedTier`) and fill the evidence columns honestly; the system DERIVES the tier.

## The shape: two tiers, twelve sections

Tier one, the brief (a partner reads it in a quiet quarter hour; the titles alone pass the Partner Test):

1. Thesis: the user, the pain, the decision requested, and what the product does for that user, in two
   sentences, naming the governing theme id.
2. Problem with evidence: one specific story (user, need, insight) showing why the status quo fails, then
   two or three verbatim quotes from at least two independent source types. No solution here.
3. Why now: the named market, regulatory, technology or client change that makes waiting costly, cited.
4. Users and jobs: one or two primary personas by id with their journey stage of struggle, and job stories
   in Klement form ("When [situation], I want to [motivation], so I can [outcome]"), each citing the quotes
   it was synthesized from.
5. Goals, non-goals, appetite: goals (including immeasurable ones), non-goals each with a reason, the
   appetite as a typed time budget (`appetite` is a requirement_target in weeks).
6. Success signals: seven fields per signal (below).

Tier two, the build spec (engineering and design read it in full):

7. Hypotheses and assumption map: the riskiest assumptions in the experiment quadrant (test-now, plan,
   monitor, defer), each with its test and owner; an assumption already supported by corpus quotes moves
   to plan and cites them.
8. Solution flows, states, logic: key flows per primary job story, required states per screen (empty,
   loading, partial, error, conflict, permission, degraded provider), business rules, a design link.
   Behavior, never UI prescription.
9. Requirements with acceptance tests and trace ids: each requirement singular and verifiable (ISO/IEC/IEEE
   29148), its tier with rationale, one or more declarative Given/When/Then scenarios, and its trace chain.
10. Quality, accessibility, privacy: the applicable ISO/IEC 25010 characteristics as verifiable statements;
    WCAG 2.2 AA naming the exposed criteria; a GDPR Article 25 data-minimization statement and an Article 35
    DPIA trigger check.
11. Risks, pre-mortem, alternatives considered: a risk register (failure mode, likelihood, severity, early
    signal, owner, mitigation) and the alternatives rejected with their trade-offs.
12. Delivery: release criteria as minimums; phased rollout with kill criteria and rollback authority; a
    tracking plan (event names, properties, owner); API and data dependencies with owning teams; open
    questions with owner and due date; one Accountable approver.

The brief is a document first. The deck is a projection of it, never a second source of truth.

## The traceability model

Source (S) -> Quote (Q) -> Pain or opportunity (P) -> Theme (T) and Persona (PE) -> Requirement (R) ->
Acceptance test (AT) -> Signal (M). A competitive gap (CG) is the second permitted root for R.

Integrity rules the compiler checks deterministically (`checkTraceIntegrity`):

- every R has at least one P or CG, or it is typed HYPOTHESIS and carried as a NON-OBVIOUS BET;
- every P has at least one Q; every Q has exactly one S;
- every must-have R has at least two independent origins behind its P set (the Independence Rule: two
  mastheads quoting one press release are one origin);
- every R has at least one AT; every AT and every M points back to an R;
- unused S are dropped from the matrix.

The matrix (R, tier, P, PE, T, Q first eighty characters, S attribution, AT, M) is DERIVED from the graph
and rendered as a table, never written as prose.

## Evidence-derived prioritization

Tier assignment comes from the evidence columns, not from your typing. Must-have requires all of: maps to
the thesis; must-be or one-dimensional Kano type read from the corpus (absence cited as a reason users
abandon, or graded satisfaction in quotes); at least two independent origins; a primary persona; and
Cagan's bar (the product should not ship without it). Should-have: one origin or a secondary persona.
Could-have: single-source or inferred. Won't-have: named with its reason (appetite, dependency, no
evidence). Within a tier, rank by persona criticality and journey-stage severity read from the evidence.
RICE or WSJF only when Reach and Effort come from real data; otherwise print the evidence columns, not a
score.

## Success signals compatible with the Quantitative Claim Rule

A metric is a named observable signal with seven fields: signal (an event in tracking-plan vocabulary),
instrument, population (persona id and stage), direction, baseline status ("to be measured by [owner] by
[date]", or a cited figure only inside its quote), type (leading or lagging; at least one of each), and a
guardrail with its rollback authority. Targets are set at a named post-baseline event, never in the first
draft.

## The number rule (owner decision 1, 2026-10-01)

Two classes of number, each with one home. EVIDENCE numbers describe the world and obey the Quantitative
Claim Rule: only inside a verbatim cited quote. REQUIREMENT numbers are design decisions (a latency bound,
an accessibility level, a rollout share, the appetite in weeks) and are legitimate only inside a typed
`requirement_target` object (`metric`, `value`, `unit`, optional `baseline`, `source_pointer`, and a
`rationale` that cites evidence qualitatively). The post-processor and the AIR naked-number signal exempt
typed targets and flag every other digit in user-visible prose (`scanNakedNumbers`). Standard names (WCAG
2.2, ISO/IEC 25010, Article 25, Article 35), ids (R-1, AT-3) and provenance dates are not claims.

Worked example, requirement target: `{ "metric": "review latency", "value": 2, "unit": "s p95",
"rationale": "rural connections are slow in the grower interviews" }`. The same bound written as prose ("the
review renders in under two seconds") is a violation; a figure about the world ("most growers are on slow
connections") is a claim and needs a quote.

## Writing rules (hard)

- Every title is a complete sentence stating a judgment, plain and literal, no metaphor, one line.
- Name the actor in every sentence; read it aloud; plain subject, direct verb, concrete object.
- No greeting, no narration of the document, no reference to the research process, no note about missing
  evidence: narrow a section to what the quotes support.
- No em-dash character anywhere; use a comma, a colon or a period. Plain text, no markdown, no emoji.
- The banned-phrase lexicon and the Actor Rule in `.claude/CLAUDE.md` apply to every field.

## Anti-patterns

- A requirement with no pain or gap behind it that is NOT typed as a bet.
- A quote written from memory, a paraphrase under the label Evidence, or a source the model named itself.
- Most requirements marked must-have; a must-have with one origin.
- A baseline or target written as a bare figure; a success signal missing any of the seven fields.
- A problem section that names a feature; a thesis that names no decision.
- Advice on how to write or sequence the document instead of the product itself.
- Any QA annotation or placeholder token in a user-facing field.

## Exemplars and golden set

The twin exemplars live in `humans-in-control-research/hic-workspace/wiki/eval/exemplars/`
(`prd-nxt-slide.html`, `prd-nxt-slides.html`, `prd-nu-slide.html`, `prd-nu-slides.html`) and are indexed by
`humans-in-control-research/hic-workspace/wiki/eval/golden-set.json`. Their content is representative, not
factual: match their structure and house style, never their values. The GOLD visual language is
`humans-in-control-research/hic-workspace/wiki/design-system/gold-visual-language.md`; brand and type
resolve from tokens on both the HTML document and the deck projection, never from literals.

## Quality discipline

The universal quality discipline for every artifact (evidence density, anti-slop, action titles,
specificity, claim typing, the two-pass QA order) is the one reference skill
`.claude/skills/human-voice-editor/SKILL.md` together with `.claude/CLAUDE.md`. This skill adds only what is
PRD-specific: the twelve sections, the traceability model, the derived tiers, the seven-field signals and
the typed-target number rule. The ten-item rubric in `prd-rubric.json` is the gate; it declares verified,
not the author.

## Self-check before emitting

1. Does every requirement name a pain id or gap id, or carry a bet with its test and the condition under
   which the alternative wins?
2. Is every quote verbatim from an EVIDENCE item with its evidence id attached?
3. Did you propose few must-haves and fill the evidence columns truthfully?
4. Do the signals carry all seven fields, with at least one leading and one lagging?
5. Is every digit either inside a quote or inside a typed target?
6. Does the thesis name the decision, and does every title state a judgment?

If any check fails, fix the draft; never ship it.

## THE ACTOR RULE (anti-slop, 2026-08-07, binding on every generated sentence)

1. NAME THE ACTOR. Every claim states who or what acts: a named team, system, person, or audience. Abstract
   nouns never act; dramatic verbs never substitute for the mechanism.
2. READ IT ALOUD. If a real person would not say the sentence out loud, rewrite it.
