# Model Bake-off (BROADENED): 6 schema-constrained + #personas emotive — 2026-06-28

STEP 3 of the model-usage optimization. Extends `model-bakeoff-gap-journey-2026-06-28.md`
(which validated #gap + #journey -> gemini-3.5-flash) to the remaining schema-constrained
deliverables and to one emotive deliverable, using the SAME harness method + SAME scoring.
Measurement only. **No routing code was changed.** Companion to
`model-usage-optimization-vs-ri-2026-06-28.md` §3b (the six untested schema deliverables) and
§3c (the Nano-Banana image-concept-authoring constraint).

## Bottom line

- **PART A (6 schema-constrained deliverables: #blueprint #competitive #org #audit #arch #roadmap).**
  On identical grounded evidence at temp 0, **Gemini 3.5 Flash matched Gemini 3.1 Pro on every
  decision-relevant dimension for all six**: zero fabricated citations (both), 100% structural
  completeness (both, all six), zero naked numbers, no meta-narration, no fabricated named people in
  the org chart. Flash totaled **$0.017 across all six vs Pro's $0.192 (11.4x cheaper)**. The only
  raw anti-slop deltas were minor and went BOTH ways (Pro emitted one banned phrase "cutting-edge";
  Flash emitted "serves as" twice), all of which the runtime `slidePostProcessor` scrubs anyway.
  **Recommendation: Flash is sufficient for all six** (step-up to Pro not justified on quality),
  pending the same generalization caveats as the prior run (n=1 corpus, Opus arm deferred).

- **PART B (#personas, emotive, carries Nano-Banana imagery).** This is where a budget model breaks.
  **Gemini 3.5 Flash FAILED the deliverable**: it returned 1 of 3 requested personas, with NO
  `:::slide` fence (a hard render failure), truncated mid-`painPoints`. **Gemini 3.1 Pro produced a
  complete, faithful, content-true result**: 3 personas, 100% structural, all 12 carried quotes
  verbatim-in-corpus with named sources, and 3 distinct, evidence-traceable `brandImage.concept`
  strings (NOT generic). **Claude Sonnet 4.6 returned HTTP 400 — it shares the capped Anthropic key,
  so it is currently UNUSABLE and does not relieve quota.** **Mid-tier recommendation for #personas:
  Gemini 3.1 Pro.** Sonnet is off the table until the cap lifts (2026-07-01) AND, even then, it does
  not relieve the Anthropic quota that motivated tiering in the first place.

Confidence: **MEDIUM-HIGH** on Part A (Flash==Pro is conclusive on this corpus; generalization +
Opus baseline are the open items). **HIGH** on the Part B mid-tier call (the Flash failure and the
Sonnet 400 are both unambiguous and directly decision-relevant).

---

## 1. Method (identical to the prior bake-off; reused)

- **Grounding (identical for every model):** real evidence from the saved engagement
  `sessions/analyze-emerging-higher-education-advancement-trends-for-2026-focusing-on-ai-dri/`
  (research goal: AI-driven alumni engagement + fundraising for higher-ed advancement; 1,153 source
  results, 1,480 items per the session metadata). Items were objective-ranked (goal-keyword relevance
  with title weighting + credibility tier + content richness), deduped by title, and capped at
  **27 chunks (28,336 chars, 27 distinct sources)** — mimicking the app's manifest-chunk retrieval
  (cite-by-pointer, not bulk RAG injection). The same 27-chunk block was fed to all models and all
  deliverables. Chunk mix spans credibility tiers (t1 peer-reviewed: U.Va. alumni-giving study,
  HBCU fundraising guide, public-HE annual-giving paper; t2; t3 vendor/practitioner: Virtuous,
  Fundraise Up, RNL Giving Day Playbook, Gravyty campus-data guide, etc.).
- **System prompt (identical per deliverable across models):** a faithful condensation of the
  `corpusChatService` deliverable contract — SLIDE MODE protocol, the **verbatim per-template JSON
  schema block** lifted from `corpusChatService.ts` (service-blueprint ~L1282, competitive-matrix
  ~L1132, gap-matrix/org-chart/systems-inventory/architecture-map/timeline shapes ~L1298-1514,
  persona-card ~L954), the citation protocol, the Quantitative Claim Rule, and the anti-slop bans.
  Only the schema block differed per deliverable; it was identical across models for a given one.
- **User directive (identical per deliverable across models):** the artifact hashtag + the research
  goal. For #personas: "Create 3 distinct, evidence-grounded personas ... Emit 3 :::slide blocks."
- **Sampling:** Gemini `config.temperature = 0` (deterministic). Anthropic strips temperature at the
  proxy chokepoint. `max_tokens = 8000` for all.
- **Transport:** POST to the live proxy `http://localhost:5012` (`/api/ai/gemini`, `/api/ai/anthropic`)
  — same path the app uses. Harness has resume + 3x retry-on-transport-fail (one transient
  "fetch failed" burst was retried clean; it did not affect any recorded result).
- **Scoring (automated, then hand-verified):** parse each `:::slide` JSON, then score citation
  faithfulness (cited source names matched against the 27 chunk titles; quotes checked
  verbatim-in-evidence), structural completeness (required schema fields filled per template),
  evidence diversity, anti-slop (em-dash / banned phrases / meta-narration / QA annotations /
  naked numbers in titles+KPIs+insights), output tokens, cost. Two automated FALSE POSITIVES were
  identified and neutralized by hand (see §4 note): the `"jtbd"` JSON key contains the substring
  "tbd"; and `"World-class"` is a schema-PRESCRIBED competitive-matrix scaleLabel copied identically
  by both models, not a model slop choice.

Models: `gemini-3.5-flash` ($0.30/$1.20 per 1M in/out), `gemini-3.1-pro-preview` ($3.50/$10.50),
`claude-opus-4-8` ($5/$25, probed), `claude-sonnet-4-6` ($3/$15, probed).

**Anthropic arms (Opus + Sonnet) returned HTTP 400 — monthly cap.** Both probes returned
`"You have reached your specified API usage limits. You will regain access on 2026-07-01 at
00:00 UTC."` (Opus request_id `req_011CcVqKdzdiD9W2wHF9bYCF`; Sonnet request_id
`req_011CcVqNiXKvUSUz6zXH2Nzd`). Same cap as the prior run, on the same shared key. This is itself a
finding for Part B (see §6).

---

## 2. PART A scoring table (6 schema-constrained deliverables; Flash vs Pro)

All six produced exactly one slide of the correct template, valid JSON, HTTP 200, on both models.

| Deliverable (template) | arm | Struct complete | Cited srcs real | Fabricated | Distinct srcs | Naked # | em-dash | banned (raw) | out tok | cost |
|---|---|---|---|---|---|---|---|---|---|---|
| #blueprint (service-blueprint) | Flash | **28/28 (100%)** | 7/7 | **0** | 7 | 0 | 0 | 0 | 841 | **$0.0030** |
| #blueprint (service-blueprint) | Pro | 28/28 (100%) | 10/10 | 0 | 10 | 0 | 0 | 0 | 1271 | $0.0371 |
| #competitive (competitive-matrix) | Flash | **23/23 (100%)** | 8/8 | **0** | 4 | 0 | 0 | 0 | 681 | **$0.0029** |
| #competitive (competitive-matrix) | Pro | 23/23 (100%) | 8/8 | 0 | 4 | 0 | 0 | **1 (cutting-edge)** | 687 | $0.0311 |
| #org (org-chart) | Flash | **29/29 (100%)** | 12/12 | **0** | 6 | 0 | 0 | 0 | 666 | **$0.0029** |
| #org (org-chart) | Pro | 31/31 (100%) | 12/12 | 0 | 6 | 0 | 0 | 0 | 720 | $0.0317 |
| #audit (systems-inventory) | Flash | **34/34 (100%)** | 5/5 | **0** | 5 | 0 | 0 | **1 (serves as)** | 568 | **$0.0027** |
| #audit (systems-inventory) | Pro | 44/44 (100%) | 5/5 | 0 | 5 | 0 | 0 | 0 | 631 | $0.0302 |
| #arch (architecture-map) | Flash | **20/20 (100%)** | 5/5 | **0** | 5 | 0 | 0 | **1 (serves as)** | 579 | **$0.0027** |
| #arch (architecture-map) | Pro | 21/21 (100%) | 6/6 | 0 | 6 | 0 | 0 | 0 | 755 | $0.0315 |
| #roadmap (timeline) | Flash | **12/12 (100%)** | 8/8 | **0** | 8 | 0 | 0 | 0 | 558 | **$0.0027** |
| #roadmap (timeline) | Pro | 15/15 (100%) | 8/8 | 0 | 8 | 0 | 0 | 0 | 695 | $0.0308 |
| #blueprint Opus probe | Opus | — | — | — | — | — | — | — | — | **HTTP 400 (cap)** |

**Part A cost: Flash $0.0169 total vs Pro $0.1924 total = Pro is 11.4x more expensive** for
identical-quality output. (Counts: "cited srcs real" sums slide-level + inline source citations
matched to real chunks; struct-complete is required-fields-filled per the template's schema; "raw
banned" is pre-slidePostProcessor — the runtime layer scrubs all four of these.)

Notes from hand-verification:
- **No fabricated sources or quotes in any of the 12 Part-A outputs.** Every cited source maps to a
  real chunk title; the competitive peers are all real platforms present in the evidence (Virtuous,
  Fundraise Up, Qgiv by Bloomerang, ScaleFunder).
- **No fabricated named individuals in the org chart (both arms).** Both correctly used role titles
  (Advancement Leader, Major Gift Officer, Annual Giving Practitioner, Gift Officer, Ambassador)
  because the corpus does not name specific people in reporting relationships — this is exactly the
  schema's required behavior ("a correct role-only node beats a wrong or fabricated name").
- **A small PRO-side formatting tell:** on #org and #roadmap, **Pro carried the literal `"SOURCE: "`
  prefix** from the chunk labels into its `sources[]` array (e.g. `"SOURCE: A Guide to Managing
  Complex Campus Data"`). Flash stripped the prefix cleanly. The runtime resolver tolerates this,
  but it is a minor artifact and it is on PRO, not Flash — i.e. it does NOT argue for stepping up.
- Pro wrote modestly more output tokens (1.05x-1.5x) for the same structural content; this is the
  source of most of the cost gap on top of the 8.75x out-rate difference.

### Citation spot-checks (Part A; quoted, all verified verbatim-in-corpus)

**#blueprint / Flash** — title "AI-powered advancement platforms resolve fragmented campus data to
retain donors." sources include *A Guide to Managing Complex Campus Data*, *Virtuous Acquires
Momentum to Transform Major Donor Fundraising with AI*, *2026 Virtuous Benchmark Report for
Education Nonprofits*. All real chunks; no number stated as a bare assertion. ✓

**#competitive / Flash** — 4 NAMED real peers scored: *Virtuous* ("acquired Momentum to deliver an
AI-powered inbox..."), *Fundraise Up* ("powers peer-to-peer giving..."), *Qgiv by Bloomerang*,
*ScaleFunder*. Each row carries a `note` traceable to its chunk + a named `source`. ✓ (Pro picked
the same 4 peers; Pro's Virtuous note used "cutting-edge AI" — the one raw banned phrase in Part A.)

**#org / Pro** — TIER 1 DECIDES: "Advancement Leader" (src: *2026 Virtuous Benchmark Report*); TIER 2
DIRECTS: "Major Gift Officer", "Annual Giving Practitioner"; TIER 3 DELIVERS: "Gift Officer",
"Ambassador"; TIER 4 ADVISES: "Faculty and Administrators" (src: *HBCU All-Campus Approach*). No
invented names; every node a named source. ✓

**#roadmap / Flash** — title "Advancement offices must unify campus data and deploy AI." 3-5 phases,
each 2-4 concrete initiatives, sources span 8 distinct real chunks (Complex Campus Data, Fundraising
Automation, Virtuous Benchmark, DAF/Generational Giving, SMS examples). No naked numbers in titles.
✓

---

## 3. PART B scoring table (#personas, emotive; Pro vs Sonnet vs Flash)

Directive: emit 3 distinct evidence-grounded personas as 3 `:::slide template=persona-card` blocks,
each with verbatim-quoted painPoints/motivations, JTBD, goal hierarchy, and a content-true
`brandImage.concept`.

| arm | Status | Personas emitted | Struct | Quotes verbatim | Fabricated | Image concepts | Result |
|---|---|---|---|---|---|---|---|
| **gemini-3.1-pro-preview** | 200 | **3 / 3** | **42/42 (100%)** | **12/12** | 0 | **3 content-true, distinct** | **PASS** |
| claude-sonnet-4-6 | **400** | — | — | — | — | — | **UNUSABLE (quota cap, shared key)** |
| gemini-3.5-flash | 200 | **1 / 3** | **0/0 (no valid slide)** | 0 | 0 | (truncated before any) | **FAIL** |

### Why Flash failed #personas (specific evidence)

Flash returned 1,422 chars / ~319 output tokens and then stopped. Three distinct failures, any one
of which is disqualifying for an emotive deliverable:

1. **Count failure:** emitted **1 persona, not the 3 requested** ("ONE SLIDE PER X" coverage contract).
2. **Format failure:** wrapped the single persona in a ` ```json ` markdown code fence with **NO
   `:::slide` fence**. Per the SLIDE MODE contract this is a HARD failure — the renderer only draws
   cards from `:::slide` blocks, so this renders as raw markdown slop.
3. **Truncation:** the single object is **cut off mid-`painPoints`** (last token is `"label":`),
   despite only ~319 output tokens used (nowhere near the 8,000 ceiling) — the model gave up early on
   the richer emotive schema, it did not hit a length limit. It also used the banned word "seamless"
   in `functionalGoal`.

This is the §3c risk made concrete: the emotive persona-card asks the text model to author
per-element strategic content (3 distinct identities, verbatim-sourced 2x2 evidence, AND a
content-true image concept each). Flash collapses on that load even though it sails through the
flat schema-constrained tables in Part A.

### Why Pro passed #personas (image-concept quality is the deciding axis)

Pro emitted 3 distinct, complete personas (The Major Gift Officer / The Annual Giving Director / The
VP of Advancement), 100% structural, every carried quote verbatim-in-corpus with a correct named
source. The **per-persona `brandImage.concept` is content-true and traceable to that persona's own
corpus evidence**, not generic stock:

- **The Major Gift Officer** -> "A focused university advancement officer sitting at a dual-monitor
  desk, analyzing wealth signals and engagement data on an alumni profile dashboard." (traces to the
  persona's verbatim pain "prospect identification often looks like hours spent combing through
  spreadsheets" + "wealth signals" from *Major Donor Fundraising: 6 Best Strategies & How to Use AI*).
- **The Annual Giving Director** -> "An energetic annual giving director in a campus conference room,
  coordinating a 24-hour giving day sprint with digital dashboards displaying real-time donation
  metrics." (traces to *The Giving Day Playbook* + the "1 in 7 first-time donors" retention evidence).
- **The VP of Advancement** -> "A senior university advancement leader in a wood-paneled office,
  reviewing fiscal year-end reports and strategic campaign timelines on a tablet device." (traces to
  *Your Fiscal Year Is Closing. Is Your Advancement Tech Ready for Fall?* + the public-HE revenue
  shortfall evidence).

Each concept names a specific person, setting, attire/props, and activity tied to that persona's
evidence — exactly what §3c requires of an emotive concept-authoring model. Flash never reached the
concept field (truncated first), confirming it cannot be trusted to author it.

### Citation spot-checks (#personas / Pro; quoted, verified verbatim)

1. Major Gift Officer pain: "prospect identification often looks like hours spent combing through
   spreadsheets..." — *Major Donor Fundraising: 6 Best Strategies & How to Use AI* ✓
2. Annual Giving Director pain: "only 1 in 7 first-time education donors makes a second gift, the
   lowest..." — *2026 Virtuous Benchmark Report for Education Nonprofits* ✓ (number correctly carried
   INSIDE a cited quote, not asserted as a bare KPI)
3. VP of Advancement motivation: "Public institutions of higher education are currently faced with
   reven[ue shortfalls]..." — *The Effects of Selected Undergraduate Student Involvement and Alumni
   Characteristics on Alumni Gift-Giving Behavior at the University of Virginia* (a tier-1 academic
   source) ✓

---

## 4. Per-deliverable recommendations

### PART A — all six are Flash-sufficient on this evidence

| Deliverable | Recommendation | Basis |
|---|---|---|
| #blueprint (service-blueprint) | **Flash sufficient** | 100% struct, 0 fabricated, 7 real sources, all 4 lanes + failPoints filled; 12x cost cut. No quality reason for Pro/Opus. |
| #competitive (competitive-matrix) | **Flash sufficient** | 4 named real peers w/ scores+notes+sources; Flash was CLEANER than Pro here (Pro emitted "cutting-edge"). |
| #org (org-chart) | **Flash sufficient** | Correct tiered structure, every node a named source, NO fabricated people, <=1 emphasis; Flash stripped the "SOURCE:" prefix Pro left in. |
| #audit (systems-inventory) | **Flash sufficient** | >=6 named real systems w/ status+risk enums; one raw "serves as" that the post-processor scrubs. |
| #arch (architecture-map) | **Flash sufficient** | 3-4 layers of real named components + flow summary; one raw "serves as" (post-processor scrubs). |
| #roadmap (timeline) | **Flash sufficient** | 3-5 logically sequenced phases, 8 distinct real sources, no naked numbers. |

No Part-A deliverable showed the failure mode §3b flagged (citation degradation on a budget model).
The schema bounds the output shape and Flash fills it faithfully when grounded on real manifest
evidence — the same mechanism the prior #gap/#journey run identified. **Recommend extending the
validated Flash tier to these six**, subject to the §6 caveats (generalize across >=2 more corpora;
seat the Opus baseline after 2026-07-01).

### PART B — #personas mid-tier: GEMINI 3.1 PRO (not Sonnet, not Flash)

- **Flash is NOT acceptable for #personas.** It failed the deliverable outright (1/3 personas, no
  `:::slide` fence, truncated). This is the empirical proof behind the §3c constraint that emotive
  imagery-bearing deliverables may not drop to the budget tier — Flash cannot author the per-element
  content-true image concept because it does not even survive the richer multi-persona schema.
- **Sonnet 4.6 is currently UNUSABLE and does not relieve quota.** It returned HTTP 400 on the
  shared Anthropic key. Even after the cap lifts (2026-07-01), Sonnet does NOT relieve the Anthropic
  monthly quota that motivates tiering off Opus in the first place (it is the same provider/key). So
  for the quota objective, Sonnet is strictly dominated by Gemini Pro.
- **Gemini 3.1 Pro is the recommended #personas mid-tier:** it passed completely (3 personas, 100%
  structural, all quotes verbatim, content-true distinct image concepts), it relieves the Anthropic
  quota (off-Anthropic), and it is cheaper-out than Sonnet ($10.50 vs $15.00 per 1M out). The
  #personas Pro run cost $0.044 for 3 full personas.
- **Caveat on Sonnet:** because Sonnet 400'd, this run does NOT establish whether Sonnet's
  concept-authoring would beat Pro's on quality — only that it is unavailable now and quota-useless
  later. If a future run (post-cap) wants to A/B Sonnet vs Pro purely on concept quality, the harness
  is ready; but the quota argument already favors Pro regardless of that outcome.

---

## 5. Why the split holds (mechanism, not luck)

1. **Schema-constrained deliverables (Part A) are tables/matrices with explicitly typed fields.** The
   model selects + slots evidence; it does not invent narrative or strategic structure. Flash fills a
   bounded shape faithfully. This is the §3b/§3c thesis, now confirmed on 6 more templates.
2. **Cite-by-pointer grounding** makes copying a real source title the cheapest correct move;
   fabrication is harder than faithfulness when the labeled source list is in front of the model.
   This is design-level (anti-RAG manifest grounding), independent of model tier.
3. **The emotive persona-card (Part B) is the opposite:** it demands authored identity, 2x2 evidence
   curation, AND a strategic image concept per persona. That is a generative/synthesis load, not a
   slot-filling load — and the budget model collapses on it. The §3c "do not move an emotive
   deliverable to Flash without a concept-authoring bake-off arm" rule is vindicated by direct
   evidence here.

---

## 6. Honest caveats / confidence

- **n=1 corpus, n=1 run per cell.** One engagement (higher-ed advancement), one generation per cell
  at temp 0. A single clean run per deliverable does not prove robustness across domains (insurance,
  fintech, healthcare corpora may be noisier/sparser). Before flipping routing for the six, repeat on
  >=2 more engagements in different industries (same recommendation the prior run made for the first
  two).
- **Opus baseline missing for Part A.** We showed Flash == Pro, which IS the §3b decision-relevant
  comparison (the proposal floor is Flash-vs-Pro). But there is no Opus output to confirm the premium
  tier is not catching something both Gemini models miss. Re-run the Opus arm after 2026-07-01 (the
  harness probes it; it will just work once the cap lifts).
- **Evidence diversity not stress-tested.** This corpus has **zero client uploads** — all 27 chunks
  are external research. So the ">=40% external / don't over-cite the same 4-5 uploaded PDFs" floor
  was trivially met (100% external) and was NOT genuinely exercised. The diversity risk the rule
  guards against could not occur here; it remains untested for these deliverables on a mixed
  upload+external corpus.
- **Harness is a faithful REPLICA, not the live in-app path.** It reproduces the system prompt, the
  verbatim schema blocks, the grounding contract, and the proxy transport, but does NOT run the full
  multi-turn tool loop, dynamic skill loading (render-contract / quality enhancers), or the runtime
  `slidePostProcessor` sanitization. The in-app path has MORE guardrails, so the few raw anti-slop
  hits counted here ("cutting-edge", "serves as", "seamless") would be scrubbed in production. If
  anything this UNDER-states production quality; it cleanly isolates the model variable, which is the
  point of a bake-off.
- **Part B Sonnet arm is a NON-RESULT on quality.** Sonnet 400'd (quota), so we have no Sonnet
  output to compare concept quality against Pro. The mid-tier recommendation rests on (a) Sonnet's
  current unavailability, (b) Sonnet not relieving the Anthropic quota even when available, and (c)
  Pro's demonstrated full pass — NOT on a head-to-head concept-quality win over Sonnet.
- **Two automated-scorer false positives were hand-corrected** (documented for honesty): the `"jtbd"`
  JSON key triggered the "tbd" QA-annotation matcher (no real "TBD" annotation appears in any
  output), and the competitive-matrix `"World-class"` scaleLabel is schema-PRESCRIBED (copied
  identically by both models, not a model slop choice). After correction, the only real raw banned
  hits are: Pro = 1 (cutting-edge); Flash = 3 (serves-as x2, seamless x1, the last in the
  already-failed persona run).

---

## 7. Recommendation to carry back to §3b / §3c

- **PART A: APPROVE Gemini 3.5 Flash for #blueprint #competitive #org #audit #arch #roadmap** on the
  evidence here (Flash == Pro quality on all six, 11.4x cheaper in aggregate), with the SAME pre-flip
  conditions the prior run set: (a) re-run on 1-2 additional industry corpora, (b) seat the Opus
  baseline after 2026-07-01, (c) add a mixed upload+external corpus to exercise the evidence-diversity
  floor. These six would join #gap + #journey on the `DELIVERABLE_MODEL_TIER` Flash map (reversible
  by deleting the entries -> restores Opus).
- **PART B: #personas mid-tier = Gemini 3.1 Pro.** Flash is disproven for emotive concept authoring;
  Sonnet is unusable now and quota-useless later. This confirms §3c: keep emotive imagery-bearing
  deliverables (#personas, #themes, #case-study, #recommendation, narrative covers) OFF the Flash
  tier. For #personas specifically, the cheapest VIABLE + quota-relieving model is Gemini Pro, not
  Sonnet.
- **Routing remains user-locked.** Per the §3b RI convergence and the canonical routing rule, this is
  a measurement input to a USER decision, not a unilateral downgrade. **No routing code was changed.**

---

### Artifacts (session scratch, not committed)

`scratchpad/bakeoff2/`:
- `buildEvidence.mjs` — rebuilds the 27-chunk grounding block from the engagement `corpus.json`
  (objective-rank + dedupe-by-title + cap), replicating the prior run's method.
- `harness.mjs` — generation harness (faithful prompt + verbatim schema blocks + proxy calls;
  resume + retry).
- `score.mjs` — automated scorer (citation faithfulness, structural completeness, anti-slop,
  naked numbers, tokens, cost, persona image-concept quality).
- `raw/` — `_evidence_block.txt`, `_evidence_chunks.json`, per-deliverable `_prompt_*` files,
  `{deliverable}__{flash,pro,opus,sonnet}.txt` raw outputs + `.parsed.json` + `.meta.json`,
  `_run_summary.json`, `_scores.json`.
