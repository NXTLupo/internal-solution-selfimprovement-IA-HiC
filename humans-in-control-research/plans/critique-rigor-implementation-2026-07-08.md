# Critique-Rigor Implementation Plan (heuristic analysis structural layer)

Date: 2026-07-08. Status: PROPOSED (no code changed). Supersedes nothing; EXECUTES
`critique-rigor-augmentation-2026-07-08.md` (items 20-31) + its delta
(`...2026-07-08b-reconciliation.md`), grounded in `failure-taxonomy.md` (R1-R20),
`severity-and-fidelity.md`, `reasoning-runbook.md`, and the Farm Risk Ready teardown.
Method: verbalized sampling (k=5, VS-CoT, moderate-tail) over implementation
architectures + reinforcement inference on the winner. Doctrine unchanged: CONVERGE,
lego-brick (no live Figma at runtime), one routing authority, evidence-bound, HiC.

## 0. The verdict I accept

Rounds 1-3 closed the cosmetic + coverage layer and then SELF-VERIFIED against that
same layer: single author, cosmetic tests, victory declared, structurally broken deck
shipped. The delta's meta-point stands: 553/553 pinned the cosmetic contract, not the
taxonomy. The worked fidelity score is the sharpest indictment: current Screen 01 ~2,
my proposed ~0.5 - the "after" argued in pictures for a downgrade, while my
"no fabricated numbers" rule was misapplied to DROP real source values ($3.8T / >50% /
4th) that binding would have preserved. And I evaluated pitch-deck slides as
interfaces (R1), which manufactured half the noise ("no CTA on a slide").

## 1. Verbalized-sampling trace (k=5, moderate-tail; modal named first)

| # | Architecture | p | Disposition |
|---|---|---|---|
| A | Execute delta F.4 as written (25 -> 21 -> 22 -> 20 -> 23/24 -> 26-31), each at its named seam | 0.30 | BACKBONE (the docs are already prescriptive; ordering adopted) |
| B | R1/R2 as HUMAN INTAKE inputs: per-screenshot artifact-type chips (slide / mockup / live screen) + a required one-line task field in the brief; dimension applicability derives from artifact type | 0.12 | ADOPT: HiC-native framing. The human declares the frame once; slides get the communication lens, interfaces get interaction heuristics; NO-TASK-MODEL dies at the source, not in a re-ask |
| C | Measurement-first tool-forcing: contrast/target-size/nav/GEO computed wherever inputs exist; the model only judges | 0.10 | ADOPT where cheap now: axe already computes contrast + landmarks on captures (REUSE, don't re-measure); nav_present derived from the ARIA snapshot; pixel-sampled contrast for uploads at marker positions (with honest confidence); target-size from capture DOM in P2 |
| D | Gate-spine: implement Section C's gate JSON as `auditGate.ts` (schema + pure INVARIANT functions) FIRST; every rule lands as an invariant; pipeline, Critic, fixtures, and dashboard all consume the same functions | 0.08 | ADOPT as the backbone's skeleton: the rules get a machine-checkable home before the Critic exists, exactly the delta's "rules before critic" |
| E | Per-dimension evaluator pods (multi-agent, #proto-style) | 0.03 | REJECT: contra CONVERGE; the runbook's same-model two-pass is explicitly sufficient |

Synthesis = A's ordering x D's gate-spine x B's intake framing x C's measurement tier.

## 2. Build plan (phases, seams, acceptance)

### P0-a. Gate spine: `services/auditGate.ts` (new, pure) + gate emission (items 26, 21-25 schema)
- Section C JSON contract as TypeScript types + PURE invariant functions, one per rule:
  `checkSeverityMapped`, `checkSubsumption`, `checkAdvisoryDiscipline` (vlm => manual-review,
  severity<=2, never cover/title), `checkNavFlagged`, `checkFloor` (5 axes +
  proposed>=current), `checkStandardScope`, `checkPreserve`. Same functions consumed by the
  pipeline gate, the Critic rubric, the vitest fixtures, and the dashboard badge - single
  source of truth (VS candidate D).
- heuristicAnalysisService assembles `auditGate` per run; written to the session AND
  `wiki/evidence/audits/<slug>/gate.md` (manifest-chunked). Downstream gates on
  `gate.status` + reason codes, never prose.
- Acceptance: a deliberately-broken fixture run emits the expected reason codes; every live
  run writes gate.md.

### P0-b. Item 21: severity 0-4 + subsumption (deterministic, no model call)
- types.ts: `severity: 0|1|2|3|4` integer stays source of truth (already integer);
  ADD `severity_basis: string` (frequency x impact x persistence rationale) +
  `subsumes: string[]` + `dependsOn?: string` (model hints the parent; the collapse is
  deterministic). Labels become derived display strings via ONE map (severity-and-fidelity
  table); the CRITICAL/COSMETIC drift dies.
- `collapseAndScore(findings)` runs in heuristicAnalysisService AFTER ref-sanitation and
  BEFORE anything consumes findings (deck, dashboard, gate) - one authority upstream of
  every surface (deviation from the addendum's "in auditCritiqueDeck" placement,
  RI-justified in §4). Merge identical fix+heuristic into one finding with `instances[]`;
  fold children under parents (blank-page rule: any finding on a screen whose root
  `severity 4` "page does not exist" finding exists collapses into it); re-raise parent
  severity on absorption. `orderFindingsForScreen` then numbers the survivors (the seam
  the delta names).
- Prompt: one score per defect everywhere; severity_basis required; same-defect-same-score.
- Acceptance (delta): example.com capture -> ONE root finding + subsumes list, not 3 peers,
  in deck AND By Screen tab.

### P0-c. Item 25: proposal fidelity floor - TOTAL CONTENT PARITY + FULL-FIDELITY FIGMA UI
(OWNER HARD REQUIREMENT, 2026-07-08: "ALL proposed screens in every heuristic analysis deck
MUST include ALL details shown in the current screens ALONG WITH full-fidelity UI from
Figma." This is R15 read at full strength - real copy, real data, real components - and the
teardown's own bar: a pixel-credible screen assembled from real components, populated with
the real numbers, fidelity 4. Value-binding alone is PARTIAL parity and does not satisfy it.)

**c-1. Content inventory (the parity substrate).**
- Per screen the pipeline extracts a structured `contentInventory`: every visible detail -
  headings, stats WITH their values, captions, source attributions, table rows, list items,
  persona names, quotes, button labels. Captured URLs: derived DETERMINISTICALLY from the
  DOM in audit_capture.py (heading/text/landmark walk - no model). Uploads: the vision pass
  emits it (a new schema block; the model is already reading the screen).
- proposedSections binding rule: EVERY inventory item maps into a proposed section slot, or
  appears in `omitted[]` with a one-line justification (R13's "deliberate trade" clause -
  the only legal way to drop a detail). Silence is a violation.
- Gate invariant `checkContentParity`: coverage = bound items / (inventory - justified
  omissions); anything < 100% -> `PROPOSAL-BELOW-FLOOR` with the MISSING ITEMS NAMED in
  gate.md. The fidelity `content` axis IS this coverage (1 only at full parity), not
  merely "has some real values".

**c-2. Full-fidelity Figma component mirrors - BUILT THE WAY #PROTO BUILDS (owner
instruction, repeated: mirror #proto generation; use ACTUAL FIGMA TOKENS).**
- NAMED DEFECT in the current proposed_screen_render: it flattens tokens into a palette
  dict and then hand-codes INVENTED sizes inline (13px labels, 14px/18px paddings, ad-hoc
  radii) - violating the standing typographic constraint ("sizes come from the scale,
  hydrated from /api/design-tokens - never invent sizes") and the lego-brick doctrine.
  Token-tinted wireframes are not token-BOUND components. The module is rewritten, not
  patched.
- The rewrite mirrors the #proto generation contract exactly:
  - The render document carries the FULL actual Figma token set as CSS variables - the
    same token carrier #proto injects into built prototypes: `/api/design-tokens?brand=`
    hydrates `var(--color/*)`, `var(--font/*)`, `var(--type/scale/*)`, `var(--space/*)`,
    `var(--radius/*)` into the page root. EVERY style in every partial resolves through
    a variable; ZERO literal hex / px / font names in the module (grep-enforceable, and
    a vitest/py fixture asserts it).
  - DESIGN-TIME HARVEST via Figma MCP of the renderable proto/* subset with the teardown's
    node ids (NavBar 440:2, Breadcrumb 441:2, Tabs 441:8, BottomNav 442:19, Footer 444:2,
    MegaMenu 444:26, Hero 465:57, Stat 454:39, Card 454:27, List 454:2, FormCard 448:25,
    Field 448:2, Stepper 441:36, Button 462:21, Alert 450:6, Cite 408:2, Accordion 455:2,
    Bar 460:2, Line 460:11, Cmd 462:34, Pricing 465:20): `get_design_context` +
    `get_variable_defs` per node, capturing the component's anatomy WITH ITS VARIABLE
    BINDINGS (which token each fill/size/gap resolves to), not just resolved values -
    so the partial re-expresses the component as token references, exactly like
    slideComposer's ARCHETYPE_SPECS re-express the 609 archetypes ("every size references
    SCALE, never a raw px"). Brand flip (NXT/NU) is then a token-set swap, free.
  - Partials registered with pattern name + node id in the mirrored catalog
    (figma-node-map "PROPOSED-RENDER REGISTRY", manifest-chunked). Runtime NEVER calls
    Figma; re-harvest on library change - identical lifecycle to figma-tokens.json.
  - MANIFEST-DRIVEN COMPONENT IDENTIFICATION (owner instruction 2026-07-08): the model
    does NOT pick from a static 16-name list pasted into the prompt. Each registry entry
    carries {pattern, node, anatomy summary, content-slot spec, use-when} and is CHUNKED
    INTO THE MANIFEST like every other wiki page. At generation time the seam retrieves
    the entries matched to the screen's contentInventory SHAPE (stat values -> proto/Stat;
    tabular rows -> table anatomy; form fields -> proto/FormCard + proto/Field; source
    attributions -> proto/Cite; multi-screen -> proto/NavBar; ...) - a deterministic
    shape-based shortlist first, the model confirming and binding second - and injects
    ONLY those matched entries. This mirrors #proto Stage 3.5 catalog injection (anti-RAG
    phase 5: manifest-first retrieval, never a prompt-embedded allowlist dump). Any chosen
    pattern absent from the registry -> `NO-COMPONENT-BINDING` in the gate.
  - fidelity `components` axis = 1 ONLY when every section rendered from a mirrored,
    token-bound partial (approximated/bespoke block or any literal style -> 0 -> floor
    failure).
- VALUE + COPY BINDING into those components: the inventory's real values ($3.8T, >50%,
  4th), real captions, real sources populate the component slots (Stat value slot, Cite
  source slot, table cells). "No fabricated numbers" RECONCILED, not repealed: a neutral
  bar is legal ONLY where the inventory has no value for that slot, and renders visibly
  marked as sample. A bar where the inventory has a value = parity failure by c-1.

**c-3. Floor mechanics (unchanged from the delta, now on the stronger axes).**
- proposed_screen_render emits `fidelity {content(=parity), components(=mirrored),
  nav, primary_action, responsive}` + `floor_met`; `current_fidelity` scored conservatively
  from evidence (blank capture ~0; rich upload >=2); proposed >= current binds when
  unambiguous.
- Floor/parity failure routes into the EXISTING repair loop (criticReviseLoop pattern,
  cap 3) with the missing axes AND the missing inventory items as the brief; after cap ->
  flagged in gate.md and the redesign slide WITHHELD (an honest critique-only screen beats
  an anti-recommendation in pictures).
- The round-3 App-seam fallback goes through the SAME parity + floor gate and gains nav
  (item 22) + preserve carry-over (item 23); it can no longer ship a screen that carries
  less than the current screen shows.
- Acceptance (delta F.5, strengthened): Farm re-run slide-5-equivalent carries EVERY
  current-screen detail (three stats with values, their captions AND source attributions),
  rendered from mirrored proto/* components with a nav pattern and a stated-state primary
  CTA - or is withheld with the missing items and axes named. Fixture: the c-1 parity
  check catches a proposal that drops any one caption.

### P0-d. Item 22: navigation dimension
- audit_capture.py: `nav_present` per viewport from the ARIA snapshot (role=navigation /
  <nav> / skip-link) - a derivation, not new capture. Attached to evidence + gate.
- Prompt: nav absence on a live/mockup multi-screen experience MUST emit a wayfinding
  finding (axe-bound when a landmark rule fired; else vlm+advisory). Never silent.
- proposedSections for page-type screens MUST include one nav pattern
  (nav-bar/tabs/footer/breadcrumb from the catalog subset); enforced in the renderer's
  fidelity.nav axis.

### P1-a. Item 20: Evaluator/Critic split (RI upgraded, not a new loop)
- The existing RI-Replace re-ask BECOMES the Critic: system directive = the R1-R20 fast
  checklist + the auditGate invariant results (the rules exist by now, per the delta's
  ordering). KILL-ONLY POWERS: downgrade / merge / subsume / mark-advisory / block; may not
  add findings. Enforced by assertion: post-Critic id set is a subset of pre-Critic ids.
- Every Critic action logs `{finding_id, reason_code, action}` to the uncertainty-ledger
  (existing sink) + the gate's critic_log. Provenance (item 30): evaluator/critic model ids
  via `artifactModelFor('heuristic-audit')`, tool calls, evidence tokens.
- Stop conditions per runbook: one Evaluator, one Critic, one fidelity gate; one reason-coded
  re-run on block; second block on the same code -> surface to the chat with the rule cited
  (existing inline-error surface), human decides. Item 29 verbatim.

### P1-b. Items 23 + 24: preserve/non-issues + FP guard
- Schema: HeuristicScreenSummary += `preserve: string[]`, `non_issues: string[]` (prompt:
  >=1 preserve where a strong element exists, >=1 non_issue per screen). Redesign proposals
  must carry every preserve item (fidelity content axis); dashboard renders both.
- FP-contrast: correct thresholds in the prompt (4.5:1 body; 3:1 large >=24px or >=18.66px
  bold; 3:1 UI); vlm-only contrast => needs_manual_review + severity<=2 + BARRED from
  cover/action titles (gate invariant `checkAdvisoryDiscipline`). MEASUREMENT TIER: for
  captures, axe's color-contrast results are the authority (already in the wcag2aa tag set;
  bind, don't re-guess); for uploads, a pixel-sampling `measureContrastAtMarker` helper
  (two dominant colors in the marker region; ratio + confidence) - reported as measured
  only at high confidence, else advisory. Honesty over coverage.

### P1-c. Intake framing (VS candidate B; implements R1/R2 at the human layer)
- HeuristicBriefIntake: per-screenshot artifact-type chip (Live screen / Mockup / Slide) +
  one required task line ("a grower checks flood risk for their county and gets a quote").
- Dimension applicability derives from artifact type: slides are evaluated for
  COMMUNICATION (hierarchy, evidence, legibility) and never emit interface findings
  (CTA/landmarks/nav); interfaces get the full set. The task line anchors severity impact.
- Captured URL viewports auto-type as live screens. Prompt receives the frame verbatim
  (task model header, R2) - no model inference of what the human already knows.

### P2. Items 27, 28, 31 (+ routing table + fixtures)
- Wiki pages: frameworks/heuristic-audit.md (0-4 table + basis rule, subsumption procedure,
  fidelity floor, task-model + nav requirements, WCAG claim-scoping copy: claim exactly what
  was checked - "landmarks and computed contrast" until the 2.2 checklist actually runs);
  anti-patterns/heuristic-audit.md (reason codes as named smells). loadGenerationContext
  injects both for free.
- Reason-code routing exactly per the addendum item-28 table (all rows map to existing
  seams; PROPOSAL-BELOW-FLOOR -> existing repair loop).
- Item 31 fixtures: the nine taxonomy fixtures from the runbook seeded as vitest cases
  against the auditGate invariants + the DONE-map invariants (primary-ref, reading-order,
  no-meta-narration) so neither layer regresses silently. Target >=561 tests.

## 3. Doctrine reconciliations (the docs assume things HiC forbids or already has)
- R12/R16 "open the library over MCP": at RUNTIME the SPA never calls Figma live. Binding
  uses the MIRRORED catalog: KNOWN_PATTERNS in proposed_screen_render + the figma-node-map
  registry gain the node ids the teardown cites (NavBar 440:2, Cite 408:2, Stat 454:39,
  Hero 465:57, Button 462:21, Accordion 455:2...). Recommendations bind
  `{pattern: 'proto/NavBar', node: '440:2', figma_var}` from the mirror - R12 satisfied,
  lego-brick intact.
- R5 "compute contrast": for captures this is ALREADY DONE by axe (bind it); only uploads
  need the new sampler. Don't rebuild what the deterministic core computes.
- The runbook's Evaluator/Critic maps onto the house RI skill (same-model anchored re-ask,
  kill-only) - no second model, no new loop; distinct-model Critic recorded as the escalation
  if the id-subset assertion ever fails in the wild (addendum E.1).

## 4. Reinforcement-inference trace (self-critique of this plan)
selfAssessment: overallConfidence = high.
leastDefensibleClaims:
0. (owner-corrected before v1 shipped) "Value binding + preserve[] satisfies R15." KILLED:
   that was partial parity. Replaced by c-1 total content parity (inventory-driven, justified
   omissions only) + c-2 full-fidelity Figma component mirrors via design-time harvest. The
   under-translation happened because I anchored on the delta's F.5 example (three stats)
   instead of the rubric's own words ("real copy, real data, real components"). Lesson
   consistent with the self-verification memory: read the rubric at full strength, not at
   the strength of the nearest example.
1. "collapseAndScore belongs in heuristicAnalysisService, not auditCritiqueDeck (deviates
   from the addendum)." HELD: the dashboard, gate, corpus serialization, and deck ALL
   consume findings; collapsing at the single upstream producer is the same one-authority
   argument that fixed the numbering bug. The addendum's stated seam constraint (runs before
   orderFindingsForScreen) is preserved.
2. "Pixel-sampled contrast for uploads is reliable enough to call measured." PARTIAL:
   antialiasing/gradients will fool it; shipped with a confidence gate and advisory
   fallback, and the FP invariant does not depend on it (threshold discipline + advisory
   bar are prompt+gate rules regardless).
3. "Intake artifact-type chips are in-scope." HELD: three chips + one text field on an
   existing form vs. an entire failure class (R1/R2) killed deterministically; the frame is
   knowledge the human already has - HiC by design. Fail-open default (mockup) when unset.
4. "Withholding a below-floor proposal after repair-cap beats shipping it flagged." HELD:
   an anti-recommendation in pictures is worse than an honest critique-only screen; the
   gate.md still records the failure for the human.
5. "The v3 deck still fails the gate" (delta E/F claim). HELD and adopted as the null
   hypothesis: the acceptance run in §5 is the only thing allowed to flip it.

## 5. Verification gates (self-verification is no longer sufficient by rule)
- tsc clean; vitest green incl. collapseAndScore units + the nine taxonomy fixtures +
  DONE-map invariants (>=561).
- Live Farm Risk Ready re-run: gate.md written; example.com subsumption (1 root + subsumes);
  advisory contrast absent from every cover/title; slide-5-equivalent proposal carries
  EVERY current-screen detail (stats + values + captions + sources) rendered from mirrored
  proto/* component partials with nav + stated-state CTA, or is withheld with the missing
  items and axes named; preserve list kept in proposals; Critic log shows >=1 action with a
  reason code and no new finding ids.
- TOTAL PARITY proven live (owner hard requirement): checkContentParity = 100% (or justified
  omissions listed) on every proposed screen; fidelity.components = 1 only via the mirrored
  Figma partials - the design-time harvest of the ~22 proto/* nodes is a P0-c prerequisite
  and its registry entry (figma-node-map PROPOSED-RENDER REGISTRY) is re-chunked into the
  manifest.
- THE GATE, not the author, declares the run verified: the deck ships only on
  `gate.status=pass`. My own report to the owner must lead with the gate result.
- No commit without approval; SPA smoke + guarded rebuild discipline unchanged.
