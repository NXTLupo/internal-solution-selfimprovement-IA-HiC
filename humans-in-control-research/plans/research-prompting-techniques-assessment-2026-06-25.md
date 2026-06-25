# Where the "10 Research Prompting Techniques" Fit HiC (VS + RI assessment, 2026-06-25)

> Source: an article of 10 prompting moves for researchers, split by the author into two families:
> **Thinking partner** (01 Interview Me, 02 Socratic, 03 Ultrathink, 04 Second Order, 05 Inversion)
> and **find-the-holes-first** (06 ELI5, 07 Pre-Mortem, 08 Steelman, 09 Red Team, 10 First Principles),
> with a "stack them" finale (chain the moves).
>
> Task: assess, against HiC's UNIFIED_VISION + end-to-end workflow, WHERE each could enhance the
> experience. Verbalized Sampling escapes the modal "just add a skill" answer; Reinforcement
> Inference flags confidence + what to verify. ANALYSIS ONLY - nothing implemented.

## The one-paragraph verdict
The article is, almost line-for-line, a description of what HiC's vision already aspires to: VS and RI
are TWO of these ten and are first-class in the vision; the "stack them" finale IS HiC's
`critic-revise-loop` composition; and most of the find-the-holes family is already converged as skills
(`second-order-thinker`, `pre-mortem`, `contradiction-finder`, `stakeholder-lens-auditor`) and agents
(`dissent-panel` = red team, the `*-deliverable-auditor` panel, `hic-output-qa`). So the meta-principle
applies hard: **converge + wire the ones we have to the right surfaces; only build-new for the genuine
gaps.** The genuine gaps are the THINKING-PARTNER, pre-generation half - and the single highest-value
one (**01 Interview Me**) maps directly onto HiC's #1 documented failure mode: a vague goal or pasted
one-liner producing a Reddit-skewed, hollow deliverable.

## Coverage map (grounded in .claude/skills + skill-manifest.json)

| # | Technique | HiC today | Verdict |
|---|---|---|---|
| 04 | Second Order | `second-order-thinker` skill, WIRED via composes_with into recommendations/strategy (corpusChatService L3137) | **HAVE + wired** |
| 07 | Pre-Mortem | `pre-mortem` skill + `pre-mortem-runner` agent (populates risk_register on strategy/recs/roadmap) | **HAVE** |
| 09 | Red Team | `dissent-panel` agent (5 adversarial critics) + `hic-output-qa` + per-deliverable auditor agents + `qa-gate` | **HAVE** |
| 08 | Steelman | partial: `contradiction-finder` (surfaces counter-evidence) + `dissent-panel`; no skill that builds the STRONGEST opposing case or steelmans the model's OWN conclusion | **PARTIAL gap** |
| 05 | Inversion | partial: `pre-mortem` + `qa-gate` + `stress-test` cover "how it fails"; no instrument-level invert ("list every way this survey/deck betrays you") | **PARTIAL gap** |
| 03 | Ultrathink | partial: artifacts route to Opus 4.8 adaptive thinking; `#proto` uses max thinking. No uncertainty/complexity-TRIGGERED escalation (RI's composite signal could drive it) | **PARTIAL gap** |
| 10 | First Principles | partial: the AIR brief decomposition reframes intent; no user-facing "rebuild the goal/method from scratch" move | **PARTIAL gap** |
| 06 | ELI5 | partial: `explainer` skill is LONG-form; no compression move ("ELI5 this finding for a 30-second VP") and no use of compressibility as a readiness gate | **GAP (high value)** |
| 01 | Interview Me | `research-planner` plans, `HeuristicBriefIntake` is a static FORM; no ADAPTIVE pre-task interview that turns a vague goal into a scoped brief | **GAP (highest value)** |
| 02 | Socratic | none - HiC is a generation tool, not a tutor | **GAP (low fit)** |
| -- | Stack them | `critic-revise-loop` chains critic skills; composes_with stacks quality skills per deliverable | **HAVE (architectural validation)** |

## Where each fits across the END-TO-END workflow

- **Intake / goal entry** (the thinnest, highest-leverage stage): **01 Interview Me** (turn a one-liner
  into a scoped brief), **10 First Principles** (is this the real question / right method?), **05
  Inversion** of the research plan (how will this study fail to answer the decision?).
- **Collection**: **05 Inversion / 07 Pre-mortem** of the source plan ("will this corpus actually
  answer the question, or will it come back Reddit-skewed?") - converges with the existing
  `evidence-density-pre-checker` + the source-type quota.
- **Theme / synthesis**: **03 Ultrathink + 08 Steelman** on CONFLICTING evidence - the article's exact
  example ("survey says satisfied, interviews say frustrated") is HiC's source-type-disagreement
  problem (external vs reddit). **04 Second-order** (have) + **contradiction-finder** (have).
- **Deliverable generation**: **04 Second-order** (have, wired), **10 First-principles** on each
  recommendation, **08 Steelman** the strategy's counter-case.
- **Pre-export / QA**: **09 Red Team** (have: dissent-panel + auditors), **07 Pre-mortem** (have),
  **05 Inversion** of the deck/instrument, **06 ELI5-readiness** gate, **08 Steelman-my-own-conclusion**.
- **Analyst / Designer chat**: **06 ELI5** a finding for a named stakeholder, **02 Socratic** learning
  mode, **03 Ultrathink** toggle, **01 Interview Me** when the user's ask is vague.
- **Self-improvement**: the moves become critic lenses inside `critic-revise-loop` / `epoch-proposer`;
  **10 First-principles** turned on HiC's OWN pipeline (what rituals can we stop?).

---

## VS pass - candidate placements for the top gaps (VS-CoT, k=4, moderate-tail)

<vs_thinking>
The modal answer for EVERY technique is "add it as a `.claude/skill` and compose it in." That is
high-probability and mostly WRONG-by-incompleteness: a skill that nothing routes to is an orphan (we
have a whole orphan-code-auditor because of exactly this). The interesting, lower-probability
placements wire the move into a SURFACE the user already touches (the goal box, a checkpoint, a chat
chip, a pre-export gate) so it fires without the user knowing the skill's name. The vision also says
two of these (VS, RI) are already substrate - so the strongest placements REUSE that substrate
(Interview Me = RI applied pre-task; Ultrathink = RI's uncertainty signal driving thinking budget).
</vs_thinking>

### 01 Interview Me (highest value)
| # | Frame | Candidate placement | p |
|---|---|---|---|
| 1 | modal | Add an `interview-me` skill the user invokes with `#interview`. | 0.42 |
| 2 | shifted (RECOMMEND) | Make it an **adaptive pre-flight at goal entry**: when the goal is short/vague/low-specificity, the Analyst Desk asks 4-6 scoping questions (decision riding on it, audience, what's been tried, success criteria, hard constraints) BEFORE collection, and writes the answers into the engagement brief + the manifest objective. This is **RI applied pre-task** (uncertainty-triggered re-ask, the substrate already exists) and directly attacks the vague-goal -> Reddit-skew failure. | 0.18 |
| 3 | tail | Gate EXTERNAL COLLECTION behind a one-screen interview so the source packs + subreddit inference are chosen from a scoped brief, not a one-liner (fixes the reddit-deep auto-infer skew at its root). | 0.07 |
| 4 | tail | A `#interview`-style chat that converts a pasted Slack one-liner ("can we research the new dashboard") into a research plan the user confirms, then auto-fills the goal. | 0.05 |
| **Commit** | | **#2 (adaptive pre-flight, RI-backed) feeding #3 (gate collection on the scoped brief).** This is the convergence move: reuse RI, fix the documented #1 failure, no orphan skill. |

### 06 ELI5 (high value, genuine gap)
| # | Frame | Candidate | p |
|---|---|---|---|
| 1 | modal | Add an `eli5` skill / `#eli5` command. | 0.40 |
| 2 | shifted (RECOMMEND) | A **chat affordance** ("explain this finding for a [VP/CFO/skeptical eng] in 30 seconds") on every generated insight, reusing the `stakeholder-lens-auditor` personas. | 0.18 |
| 3 | tail (RECOMMEND) | **Compressibility as a readiness GATE**: in `critic-revise-loop`/`qa-gate`, if the model cannot ELI5 a finding to a named stakeholder in one read, flag it as not-ready (the author's "the day I can't ELI5 my finding is the day I know it isn't ready"). A cheap, powerful quality signal that complements the slop/evidence gates. | 0.08 |
| 4 | tail | Auto-attach a one-line "for a busy exec" standfirst to each deck/brief section (an artifact field), so every deliverable carries its own ELI5. | 0.06 |
| **Commit** | | **#2 (chat affordance) + #3 (readiness gate).** The gate is the non-obvious, high-leverage one. |

### 03 Ultrathink + 08 Steelman (the conflicting-evidence pair)
| # | Frame | Candidate | p |
|---|---|---|---|
| 1 | modal | Add `ultrathink`/`steelman` skills. | 0.38 |
| 2 | shifted (RECOMMEND) | Wire **uncertainty-triggered thinking escalation**: when RI's composite uncertainty signal is high OR two source-types disagree, the deliverable router raises the thinking budget AND runs a steelman-both-sides pass before committing. This is the article's "survey vs interviews" example = HiC's external-vs-reddit reconciliation, and it reuses the RI signal + deliverableModelRouter. | 0.16 |
| 3 | tail | A `steelman` critic lens added to `critic-revise-loop` for strategy/recommendation deliverables (build the strongest counter-case, force the deck to answer it). | 0.07 |
| **Commit** | | **#2 (uncertainty-driven escalation + steelman-both-sides on source conflict).** |

### 05 / 10 (Inversion of instruments / First-principles on the goal)
- **Inversion (05):** converge into the existing pre-export QA - add an "invert this artifact: list every
  way it gets ignored / hands you garbage" lens to `qa-gate` for decks and (if HiC ever emits research
  instruments) surveys/guides. Lower marginal value since `pre-mortem` + auditors overlap.
- **First Principles (10):** best as an **Analyst-chat move** ("rebuild this goal/method from scratch -
  what is it actually for?") and as a periodic **self-improvement** turn on HiC's own pipeline (which
  rituals/sections can we stop?), feeding `epoch-proposer`.

### 02 Socratic - low fit, do not pursue now
HiC's job is consulting-grade deliverables, not tutoring. A Socratic learning mode in the Analyst chat
is a nice-to-have for a user learning a method, but it does not serve the deliverable mission and would
be an orphan. Park it.

## RI pass - confidence + what to verify before building
**overallConfidence: high** on the coverage map and on Interview Me / ELI5-gate being the top gaps;
**medium** on the exact wiring seams. Verify before any build:
- **leastDefensible:** (1) *That `HeuristicBriefIntake` cannot already be made adaptive cheaply* -
  read it before designing the Interview-Me pre-flight; the form may be extendable rather than replaced.
  (2) *That no `steelman` logic hides inside `dissent-panel` already* - read the agent prompt; one of
  its five critics may already steelman, in which case 08 is fully converged. (3) *That the
  deliverableModelRouter exposes a thinking-budget knob* RI can drive (Opus "adaptive thinking, no
  effort param wired" per the model-routing note) - confirm the escalation lever exists before
  promising #2 of the Ultrathink pair.
- **rationale:** the placements are dictated by the vision (converge onto RI substrate + existing
  surfaces); the uncertainty is purely which existing component to extend, a read-before-build step.

## Bottom line (recommended sequence, gated, when you want to act)
1. **Interview Me at intake (RI pre-task)** - highest ROI; fixes the vague-goal/Reddit-skew failure.
2. **ELI5 readiness gate + chat affordance** - cheap, high-leverage quality signal using existing
   stakeholder personas.
3. **Uncertainty-triggered Ultrathink + steelman-both-sides on source conflict** - hardens the exact
   "two sources disagree" case HiC has fought.
4. **Wire/confirm the already-present family** (second-order, pre-mortem, red-team/dissent, inversion-
   via-qa-gate) fires on the right surfaces; add a `steelman` lens only if `dissent-panel` lacks it.
The article is best read as external validation that HiC's cognition layer (VS + RI + critic stacking)
is the right architecture - the work is converging these ten onto it, not bolting on ten skills.
