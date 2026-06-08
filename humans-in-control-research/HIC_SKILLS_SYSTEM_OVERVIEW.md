# Humans in Control: The Skills System, in Plain Terms

A simple overview of how HiC produces consulting-grade work, keeps the human in
control, and improves itself over time.

## The core idea

HiC works like a consulting firm staffed by AI, with three kinds of workers and a
human partner who stays in control of every decision:

- Experts (skills) do the work, each following a real method.
- Hooks (quality gates) inspect the work and enforce your standards automatically.
- Sub-agents (specialist reviewers) pressure-test the work with independent eyes.

You, the human, see the reasoning at every stage and approve, edit, or reject
before the next step runs.

## 1. Experts (the skills)

A skill is a written playbook for one job. There are roughly forty of them, one
per deliverable and per supporting task.

| Expert | What it produces |
|---|---|
| persona-architect | Evidence-grounded personas (Cooper goal hierarchy, verbatim quotes) |
| theme-analyst | Themes clustered from the corpus with cited evidence |
| strategy-author | Strategy built on Rumelt's Kernel (diagnosis, policy, actions) |
| recommendation-architect | Action recommendations with owners, targets, and impact |
| service-blueprint-mapper | Bitner five-layer service blueprints |
| journey (journey mapper) | Phase-by-phase journeys with pains, emotion, and quotes |
| competitive-analyst | Named-rival capability matrices |
| gap-analysis-evaluator | Current-versus-target capability gaps |
| roadmap-builder | Now / Next / Later horizons with success metrics |
| prd-compiler | Product requirements with prioritized features |
| quantification-architect | Forces every recommendation to carry a baseline, target, measure, and cadence |

Each playbook tells the AI which framework to use, what evidence is required, and
what to never do. Loading the right expert is why the output follows a method
instead of generic AI guesswork.

Benefit: consistent, defensible, partner-grade deliverables that look and read
like a senior consultant produced them.

## 2. Hooks (the quality gates)

A hook is an automatic check that runs before or after the AI produces something.
Hooks are the inspectors, and they are code, not suggestions, so the AI cannot
talk its way past them.

What hooks catch:

- Fabricated statistics and unsourced numbers
- Missing or generic citations ("studies show" instead of a named source)
- Banned cliches and AI-writing tells (including the em-dash)
- Accessibility failures such as dark text on a dark background
- Under-extraction (for example, too few themes from a rich corpus)
- Evidence that is stale, thin, or dominated by a single source

If a hook finds a violation, it blocks the output or auto-corrects it.

Benefit: your standards are enforced every time, automatically, without you having
to police each deliverable by hand.

## 3. Sub-agents (the specialist reviewers)

A sub-agent is a separate AI reviewer brought in for a focused second opinion. It
works in its own context, so it is not anchored to the first draft.

| Sub-agent | What it does |
|---|---|
| dissent-panel | Argues against a recommendation from five expert viewpoints |
| evidence-quality-auditor | Grades every citation for credibility, recency, and relevance |
| pre-mortem-runner | Asks "how would this fail" and names the risks up front |
| hic-output-qa | Audits structural quality of the finished deliverable |

Benefit: the work is stress-tested by independent reviewers before it reaches you,
the way a review committee strengthens a proposal.

## How the human stays in control

- You see the live reasoning at each stage, not just a final answer.
- You can edit, approve, or reject at every checkpoint before the next step runs.
- Deep research shows you the plan (questions, sources, budget) for approval
  before any external calls fire.
- You choose which cached data and prior research feed the run.

The experts propose, the hooks enforce your standards, the sub-agents pressure-test,
and you decide. Nothing ships that you have not seen.

## How the system improves itself

Three loops make HiC better the more you use it:

1. Edit learning. Every edit you make at a checkpoint is logged. After several
   similar edits, HiC turns that pattern into a standing constraint and injects it
   into future prompts. A correction you make once becomes a rule the system
   follows from then on.

2. The second-brain wiki. A persistent knowledge base stores prior engagements,
   evidence, learned constraints, and reusable frameworks. Each new project builds
   on the last instead of starting cold, and recurring patterns across engagements
   surface as portfolio insights.

3. Scored feedback. Deliverables are scored after generation. Low scores feed back
   into which experts and constraints get strengthened next time, so quality trends
   upward rather than drifting.

## The net effect

- Output follows expert method, not generic AI patterns.
- Your standards are enforced automatically on every deliverable.
- The work is pressure-tested by independent reviewers.
- You remain in control of every decision.
- The system gets measurably better the more you use it.

That is what "Humans in Control" means: the AI does the heavy lifting, the guardrails
hold the quality line, and the human keeps the judgment.
