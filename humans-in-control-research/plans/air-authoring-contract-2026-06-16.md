# AIR Authoring Contract — converge the colleague's proposal onto HiC (2026-06-16)

Owner asked: critically evaluate the `nxt-consulting-artifact-architect` bundle; is our system
overly complex and why do we still ship slop; should we adopt it (noting #proto differs); how does
it feed self-improvement; keep the UNIFIED VISION. This plan is the answer + the first drafts.

## Verdict
He diagnosed the disease correctly and handed us the ONE primitive we lacked: an **upfront
authoring contract (AIR)**. Our slop never came from missing format rules; it came from enforcing
quality AFTER weak thinking. Adopt AIR — but as a **convergence onto our existing system**, never a
parallel skill tree (dropping his 22 skills beside our 77 would commit his own diagnosis #1:
runtime-vs-contract drift / fragmentation, which the owner explicitly forbade). Keep `#proto` on its
pod pipeline (its orchestrator `AppShellContract` IS its AIR-equivalent).

## Why we still ship slop (root causes, all confirmed by his deck autopsy + our memory)
1. No upfront spine — Minto/Rumelt/SCQA live as prose advice in CLAUDE.md the model ignores, so it
   dumps research instead of making a choice.
2. Template chosen by hashtag, not narrative role — hence 7 persona slides in a row, duplicate org
   variants, an `Untitled Slide`. Each slide passed its local validator while the deck failed as a story.
3. Validators target format tells (em-dash, emoji), not cognition (weak synthesis, generic recs,
   missing trade-offs, bad executive sequencing).
4. Self-improvement optimizes for fewer hook failures — so the system learns to HIDE slop, not think.

Our complexity is on the wrong end: heavy post-hoc machinery. BUT some complexity is load-bearing
and must stay: the em-dash/emoji/lone-surrogate scrub (fixed a real 502), anti-RAG manifest
grounding, the Figma COMPONENT REGISTRY (Track B), and the headless render gate. Cut the post-hoc
machinery that *pretends to fix cognition*; keep runtime safety + grounding.

## Adopt / Merge / Reject
- ADOPT: AIR as a mandatory IR before output; narrative-role -> template selection; evidence ledger
  with claim_ids; objective-only quality gate; his self-improvement DOCTRINE.
- MERGE (don't replace): his Figma layer is a CONTRACT (MCP was blocked for him, returned no
  vars/styles). We already have the real thing — the COMPONENT REGISTRY + figma-tokens.json + render
  gate. Graft `render_plan.slide_role` onto OUR registry; ignore his empty manifest.
- REJECT: his `experience-prototype` stub (treats #proto as a slide artifact — would regress our
  pod build). The 22-skill count doesn't actually shrink (the win is uniform thin skills + one
  schema, not fewer files). His `propose_skill_patch.py` is a trivial string counter — weaker than
  our SkillOpt; use only as an issue-aggregator front-end to skillopt-validation-gate.

## How it feeds self-improvement (UNIFIED VISION)
AIR is the substrate our loop was missing. Today SkillOpt mines noisy signals (hook failures,
banned-phrase hits) and optimizes symptoms. AIR makes every artifact a structured, scoreable object;
`score_artifact.py` yields a real cognition vector (evidence linkage, external %, action-title rate,
spine completeness, missing claim links, repeated roles, density). That is a far better RHO/SkillOpt
training signal than "did it contain an em-dash." AIR also satisfies Meta-Harness (it IS the
structured reasoning trace). His weekly loop (regression set >=10 real artifacts, before/after
scoring, ONE small patch, human gate, merge only if no regression, optimize for usefulness not fewer
banned words) maps 1:1 onto our RHO (S>0) + SkillOpt (bounded edits + held-out gate). Wire his
scorer + doctrine into our EXISTING skillopt-validation-gate; do not run his patcher.

## What this commit drafted (converged onto our repo)
- `.claude/skills/_shared/air.schema.json` — canonical AIR schema (our payload types + a slide_role
  enum drawn from `components/slideTemplates/types.ts` + the registry).
- `.claude/skills/_shared/air-authoring-contract.md` — the shared contract; THIN pointers to our
  canon (.claude/CLAUDE.md doctrine/anti-slop, gold-visual-language.md, figma-node-map.md) + the
  per-artifact payload/slide_role table. No duplicated doctrine.
- Refactored **19 owning skills in place** (AIR-FIRST block after frontmatter, preserving their
  domain content): deck-narrative-composer, strategy-author, recommendation-architect,
  service-blueprint-mapper, tech-arch-generator, roadmap-builder, org-chart, persona-architect,
  prd-compiler, gap-analysis-evaluator, tech-audit-inspector, competitive-analyst, case-study-analyst,
  theme-analyst, html-deliverable-composer, strategic-report-writer, mind-map-architect,
  research-planner, meta-themes. (#proto / experience-prototype-composer deliberately untouched.)
- `.claude/hooks/scripts/score_artifact.py` (cognition scorer) + `air_quality_gate.py` (objective
  defect gate). Smoke-tested against the sample AIR.

## Runtime wiring — increment 1 DONE (2026-06-16), increment 2 staged

**Increment 1 (gate primitive) — DONE + verified, no live deploy needed:**
- `proxy/air_gate.py` — CANONICAL runtime gate+scorer (`gate_air` objective defects / `score_air`
  cognition vector). Verified standalone: passes the clean sample AIR; a broken AIR fails with
  precise errors (missing fields, topic title, unlinked claim_id). QA-annotation class detected by
  regex (no banned literal in source).
- `proxy/app.py` `POST /api/ai/air-gate` — `{air}` -> `{gate, score}`. (Goes live on next proxy
  restart; deferred so as not to interrupt the in-flight #proto run.)
- `services/airGate.ts` — thin TS client (FAIL-OPEN: never blocks generation on transport failure)
  + AIR types + `airRepairNote()`. Logic stays canonical in the proxy = no TS/Python drift, exactly
  like the render gate. `services/airGate.test.ts` 5/5.
- `.claude/hooks/scripts/{score_artifact,air_quality_gate}.py` remain the DEV/offline SkillOpt
  mirrors of the same rules.

**Increment 2 (generation-loop wiring, #strategy/#presentation pilot) — IMPLEMENTED 2026-06-16:**
`corpusChatService.sendChatMessage`:
- `airArtifact = slideModeActive && /#strateg|#presentation/` (scoped to the deck pilot).
- System prompt now requires a `:::air {json}` block (full AIR shape, with render_plan.slides) BEFORE
  the `:::slide` blocks, each slide realizing a render_plan entry + citing evidence_ledger claim_ids.
- After generation (after the slide-fence RI, before the budget pass): extract the `:::air` block ->
  `gateAir` (live proxy `/api/ai/air-gate`) -> on `fail`, ONE bounded re-ask with `airRepairNote`
  (accept only if defects strictly fewer) -> log the cognition score to `synthesis/air-log.md`
  (SkillOpt feed) -> STRIP the `:::air` block so the renderer only sees `:::slide`.
- FAIL-OPEN everywhere: missing/unparseable/unreachable AIR never blocks the deliverable; absent AIR
  falls through to the prior behavior (no regression). tsc 0; `/api/ai/air-gate` verified live.

Two refinements intentionally NOT bundled (lower value / higher risk, deferred):
2. slide_role->template: effectively satisfied by design - the model plans slide_roles in AIR then
   emits matching `:::slide template=...` blocks the existing renderer already dispatches; no renderer
   rewrite needed. (Gate checks slide<->render_plan consistency.)
4. Demote post-hoc validators to a format-only scrub: a separate cleanup that would risk regressions;
   keep the validators as belt-and-suspenders until AIR proves out in production. Then prune.

Rollout: extend `airArtifact` to #recommendations -> #gap -> #roadmap after the #strategy pilot is
verified live; #proto stays on its own pod pipeline.

## Migration sequence (his advice is right)
strategy-deck FIRST (exercises research->evidence->synthesis->recommendation->template), then
strategic-recommendation -> capability-gap -> transformation-roadmap. Prove on the engagement that
produced the autopsy deck; compare before/after on his axes. #proto stays on the pod pipeline.

## Acceptance
A #strategy run emits valid AIR (passes air_quality_gate), score_artifact shows action-title-rate up
+ external-evidence >=50% + spine complete, and the deck renders distinct slide_roles (no 7-persona
run, no Untitled Slide) through the existing registry + render gate.
