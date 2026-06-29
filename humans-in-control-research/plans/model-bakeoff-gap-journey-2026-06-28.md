# Model Bake-off: #gap + #journey (schema-constrained deliverables) — 2026-06-28

Companion to `model-usage-optimization-vs-ri-2026-06-28.md` §3b. That plan PROPOSES dropping the
eight schema-constrained deliverables (#journey #blueprint #gap #competitive #org #audit #arch
#roadmap) from Opus 4.8 to **Gemini 3.5 Flash**, with an explicit gate: *"citation-faithfulness on
a budget model -> MITIGATE with the post-processor + AIR gate + an empirical bake-off before
committing; if Flash citations degrade, step up that deliverable to Gemini Pro."* This is that
bake-off, scoped to the two named schema-constrained deliverables **#gap** and **#journey**.

**Bottom line:** On identical grounded evidence, **Gemini 3.5 Flash matched Gemini 3.1 Pro on
every measured dimension** for both deliverables — zero fabricated citations, 100% structural
completeness, zero anti-slop violations, zero naked numbers — at **~9x lower cost than Pro and
~18x lower than Opus-equivalent**. The Opus arm could not run (Anthropic key at its monthly cap
until 2026-07-01), but the decision-relevant Flash-vs-Pro delta is conclusive: **Flash is
sufficient for #gap and #journey.** Confidence: **MEDIUM-HIGH** (caveats in §6).

---

## 1. Method (how fairness was enforced)

- **Grounding (identical for every model):** real evidence from the saved engagement
  `sessions/analyze-emerging-higher-education-advancement-trends-for-2026-focusing-on-ai-dri/`
  (research goal: AI-driven alumni engagement + fundraising for higher-ed advancement; 1,153
  source results, 1,480 items). Items were objective-ranked (keyword relevance to the goal domain +
  credibility tier + content richness), deduped by title, and capped at **28 chunks (28,021 chars,
  12 distinct sources)** — mimicking the app's manifest-chunk retrieval (cite-by-pointer, not bulk
  RAG injection). The same 28-chunk block was fed to all models.
- **System prompt (identical):** a faithful condensation of the `corpusChatService` deliverable
  contract — SLIDE MODE protocol, the **verbatim `gap-matrix` and `journey-map` JSON schema
  blocks** lifted from `corpusChatService.ts` (lines ~1248 and ~1432), the citation protocol,
  the Quantitative Claim Rule, and the anti-slop bans. Only the schema block differed per
  deliverable; it was identical across models for a given deliverable.
- **User directive (identical):** `#gap ...` then `#journey ...` plus the research goal.
- **Sampling:** Gemini `config.temperature = 0` (deterministic). Opus strips temperature at the
  proxy chokepoint (so it would have run at its default). `max_tokens = 8000` for all.
- **Transport:** POST to the live proxy `http://localhost:5012` (`/api/ai/gemini`,
  `/api/ai/anthropic`) — same path the app uses; NOT quota-blocked for Gemini.
- **No routing code was changed.** This is measurement only. Harness + scorer + raw outputs live
  in the session scratch dir (`scratchpad/bakeoff/`).

Models: `gemini-3.5-flash` ($0.30/$1.20), `gemini-3.1-pro-preview` ($3.50/$10.50),
`claude-opus-4-8` ($5/$25, attempted).

**Opus arm DEFERRED to quota reset.** The single Opus attempt returned HTTP 400:
`"You have reached your specified API usage limits. You will regain access on 2026-07-01 at
00:00 UTC."` (request_id `req_011CcVnSs5315ptgYoGgzmRh`). This is the expected cap, not a request
defect — the same body shape succeeded for Gemini. Re-run the Opus arm after 2026-07-01 to close
the premium baseline.

---

## 2. Scoring table

| Dimension | gap / Flash | gap / Pro | journey / Flash | journey / Pro | gap+journey / Opus |
|---|---|---|---|---|---|
| HTTP status | 200 | 200 | 200 | 200 | **400 (quota cap)** |
| JSON parse OK | yes | yes | yes | yes | n/a |
| **1. Citation faithfulness** (slide sources[]) | **7/7 (100%)** | **5/5 (100%)** | **11/11 (100%)** | **7/7 (100%)** | deferred |
| Fabricated sources | **0** | **0** | **0** | **0** | deferred |
| Inline evidence cites faithful | 7/7 | 6/6 | 6/6 | 6/6 | deferred |
| Evidence quotes verbatim-in-corpus | **7/7** | **6/6** | n/a* | n/a* | deferred |
| **2. Structural completeness** | **42/42 fields (100%)** | **36/36 (100%)** | all req fields | all req fields | deferred |
| — rows / stages | 7 rows (5-7 ok) | 6 rows (ok) | 5 stages (ok) | 4 stages (ok) | — |
| — every row/lane complete | 7/7 rows | 6/6 rows | 3/3 lanes aligned | 3/3 lanes aligned | — |
| — per-phase pains >=3 | n/a | n/a | 5/5 phases | 4/4 phases | — |
| **3. Evidence diversity** (external) | 100%** | 100%** | 100%** | 100%** | deferred |
| distinct sources cited | 7 | 5 | 11 | 7 | — |
| **4. Anti-slop** (em-dash / banned / meta) | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | deferred |
| Naked numbers in title/insight/KPI | **0** | **0** | **0** | **0** | deferred |
| **5. Output tokens** | 1,097 | 770 | 1,455 | 1,149 | — |
| Latency (ms) | 28,034 | 24,625 | 27,299 | 50,875 | — |
| **Cost (this call)** | **$0.0034** | $0.0321 | **$0.0039** | $0.0370 | — |
| Cost vs Opus-equivalent | **18.3x cheaper** | 1.7x cheaper | **18.5x cheaper** | 1.7x cheaper | 1.0x |
| Flash cost vs Pro cost | — | **9.5x cheaper (Flash)** | — | **9.5x cheaper (Flash)** | — |

\* Journey evidence rides in `(Named Source)` attributions on pain/opportunity items, not as long
verbatim quotes, so the verbatim-in-corpus check applies to the gap `evidence` fields (which DO
carry verbatim quotes). All journey source attributions matched real evidence sources.

\** This engagement's corpus contains **no client uploads** — all 28 grounding chunks are external
research items. So the ">=40% external" floor is trivially met (100%) but was NOT genuinely
stress-tested (see §6 caveat).

---

## 3. Citation spot-checks (3 per output, quoted)

All quoted evidence below was verified to appear **verbatim** in the grounding chunk set.

**gap / Flash**
1. *Unified Campus Data Integration* (L2->L5, high): "One piece of a donor's story, perhaps a
   high-intent interaction with an AI chatbot, might be locked in a siloed student services
   platform, while updated career info is trapped in a departmental spreadsheet..." —
   Source: *A Guide to Managing Complex Campus Data* ✓ real chunk
2. *First-Time Donor Retention* (L1->L4, critical): "only 1 in 7 first-time education donors makes
   a second gift, the lowest conversion rate in the sector." — Source: *2026 Virtuous Benchmark
   Report for Education Nonprofits* ✓ real chunk (number correctly carried INSIDE the cited quote)
3. *AI-Driven Major Donor Prospecting* (L2->L5, high): "prospect identification often looks like
   hours spent combing through spreadsheets, guessing at capacity..." — Source: *Major Donor
   Fundraising: 6 Best Strategies & How to Use AI* ✓ real chunk

**gap / Pro**
1. *Cross-platform data unification* (L1->L4, critical): "One piece of a donor's story... might be
   locked in a siloed student services platform" — *A Guide to Managing Complex Campus Data* ✓
2. *AI-driven prospect identification* (L2->L5, high): "AI transforms prospect identification by
   analyzing behavioral patterns, wealth signals, and engagement data your team would never have
   time to review manually" — *Major Donor Fundraising...* ✓
3. *Automated recurring giving conversion* (L1->L4, critical): "only 1 in 7 first-time education
   donors makes a second gift..." — *2026 Virtuous Benchmark Report* ✓

**journey / Flash**
1. overallPain: "Fragmented data silos across campus platforms" — *A Guide to Managing Complex
   Campus Data* ✓
2. overallPain: "Extremely low conversion rates for first-time donors" — *2026 Virtuous Benchmark
   Report for Education Nonprofits* ✓
3. opportunity: "Erosion of donor trust due to poor data hygiene" — *What Nobody Tells You About
   Being a Nonprofit DBA* ✓

**journey / Pro**
1. "Data silos hide insights" — *A Guide to Managing Complex Campus Data* ✓
2. "Email outreach is saturated" — *40 Fundraising Text Message Examples for Every Occasion* ✓
3. "Retention falls to historic lows" — *Major Giving Must Be Central* ✓

**Finding:** Across 26 cited sources and 13 inline evidence fields spanning both Flash outputs,
**zero fabricated sources, zero fabricated URLs, zero hallucinated quotes.** Every source name
maps to a real chunk in the grounding set; every gap `evidence` quote is verbatim corpus text with
correct attribution. Pro is identical in faithfulness — but cited FEWER distinct sources on both
deliverables (5 vs 7 on gap; 7 vs 11 on journey), i.e. Flash showed marginally BETTER evidence
breadth here, not worse.

---

## 4. Per-deliverable recommendation

### #gap (gap-matrix) -> **Gemini 3.5 Flash is SUFFICIENT.**
Flash produced 7 capability rows (Pro: 6), every row carrying current+target maturity (ints 1-5),
a severity tier, an impact clause, and a verbatim-sourced evidence field — 100% schema completeness,
100% citation faithfulness, qualitative action title, no naked numbers, no slop. No quality reason
to spend 9x on Pro or ~18x on Opus. **Recommend Flash; no step-up needed.**

### #journey (journey-map) -> **Gemini 3.5 Flash is SUFFICIENT.**
Flash produced a 5-stage / 3-lane matrix with stage-aligned cells, >=3 evidenced pains per phase
(5/5 phases), arc-ordered personas/opportunities/KPI tiles, and a qualitative keyInsight — fully
schema-conformant. It cited 11 distinct sources vs Pro's 7. KPI tile values are qualitative words
("Low Conversion", "High Open", "Siloed Records"), correctly keeping numbers in the cited sublines.
**Recommend Flash; no step-up needed.**

Neither deliverable showed the failure mode the §3b RI flagged (citation degradation on a budget
model). The schema genuinely bounds the output shape, and Flash fills it faithfully when grounded
on real manifest evidence.

---

## 5. Why Flash held up (mechanism, not luck)

1. **The schema does the heavy lifting.** Both deliverables are tables/matrices with explicitly
   typed fields. The model selects and slots evidence; it does not have to invent narrative
   structure. This is exactly the §3b thesis ("the template bounds the output shape").
2. **Cite-by-pointer grounding.** Evidence arrived as labeled `[CHUNK] SOURCE: <title>` blocks, so
   the cheapest correct move for the model is to copy a real title — fabrication is harder than
   faithfulness when the source list is in front of it. This is the anti-RAG manifest-grounding
   design paying off independent of model tier.
3. **Anti-slop is mostly prompt-followable for short structured fields.** Flash respected the
   em-dash ban, banned-phrase list, and naked-number rule cleanly. (The runtime `slidePostProcessor`
   is a second net on top of this anyway.)

---

## 6. Honest caveats / confidence

Confidence in "Flash is sufficient for #gap and #journey": **MEDIUM-HIGH.** Reasons to not call
it HIGH:

- **n=1 corpus, n=1 run per cell.** One engagement (higher-ed advancement), one generation each at
  temp 0. A single clean run does not prove robustness across domains (insurance, fintech,
  healthcare corpora may be noisier or sparser). Recommend repeating on >=2 more engagements before
  flipping routing for all eight schema-constrained deliverables.
- **Opus baseline missing.** We showed Flash == Pro, and the §3b proposal floor is Flash-vs-Pro
  anyway, so the decision-relevant comparison IS covered. But we have no Opus output to confirm the
  premium tier isn't catching something both Gemini models miss. Re-run the Opus arm after
  2026-07-01 (harness is ready; it will just work once the cap lifts).
- **Evidence diversity not stress-tested.** This corpus has zero client uploads, so the
  ">=40% external" floor was trivially 100%. The real risk the rule guards against — a model
  over-citing the same 4-5 uploaded PDFs — could not occur here and remains untested for these two
  deliverables on a mixed upload+external corpus.
- **Harness is a faithful REPLICA, not the live in-app path.** It reproduces the system prompt,
  schema blocks, grounding contract, and proxy transport, but does NOT run the full multi-turn tool
  loop, dynamic skill loading (quality enhancers), or `slidePostProcessor` output sanitization. The
  in-app path has MORE guardrails, so if anything this UNDER-states Flash quality (post-processing
  would scrub residual slop the harness counts raw). It is a clean isolation of the model variable,
  which is what the bake-off needs.
- **Generalization to the other six.** This validates #gap and #journey only. #competitive, #org,
  #audit, #arch, #roadmap, #blueprint are also schema-constrained and likely behave similarly, but
  were not measured. Treat the §3b proposal for those six as still pending their own check.

---

## 7. Recommendation to carry back to §3b

- **APPROVE Flash for #gap and #journey** on the evidence here (Flash == Pro quality, ~9x cheaper).
  No step-up to Pro required for these two.
- **Before flipping the full eight-deliverable tier:** (a) re-run this harness on 1-2 additional
  engagements (different industry), (b) re-run the Opus arm after 2026-07-01 to seat the premium
  baseline, (c) add a mixed upload+external corpus case to genuinely exercise the evidence-diversity
  floor, (d) extend the bake-off to the remaining six schema-constrained deliverables.
- **Routing remains user-locked.** Per the §3b RI convergence and the canonical routing rule, this
  is a measurement input to a USER decision, not a unilateral downgrade. No routing code changed.

---

### Artifacts (session scratch, not committed)
- `scratchpad/bakeoff/harness.mjs` — generation harness (grounding builder + faithful prompt + proxy calls)
- `scratchpad/bakeoff/score.mjs` — automated scorer (citation faithfulness, structural completeness, anti-slop, naked numbers)
- `scratchpad/bakeoff/raw/` — raw model outputs (`{gap,journey}__{flash,pro,opus}.txt`), parsed JSON, per-call meta, `_evidence_chunks.json`, `_evidence_block.txt`, `_prompt_*`, `_scores.json`, `_run_summary.json`
