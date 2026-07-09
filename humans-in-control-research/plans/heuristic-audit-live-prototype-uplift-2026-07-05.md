# Heuristic Audit + Live-Prototype Uplift (compass blueprint, adapted to the HiC stack)

Date: 2026-07-05. Status: PROPOSED (no code changed). Source proposal:
`compass_artifact_wf-eca33419-...markdown.md` (2026-07-07 technical blueprint: AI UX/accessibility
audit + live-prototype system). Method: verbalized sampling (k=5, VS-CoT, moderate-tail) over
candidate architectures, then reinforcement inference (anchored self-critique) on the winning plan.

Unified Vision phases advanced: (1) objective-first relevance, (3) provenance chunking (scan
evidence as first-class chunks), (5) anti-RAG manifest retrieval for the report generator,
(6) one routing authority, (7) gated self-improvement (uncertainty ledger), (8) tokenized
design-system governance, (9) native editable exports.

---

## 1. What the proposal gets right (adopt)

1. **Deterministic scanners + VLM judgment, evidence-bound.** axe-core produces ground-truth
   WCAG facts (violations + the `incomplete` needs-review set); the model only interprets and
   prioritizes. Every conformance claim binds to an axe rule id or is downgraded to
   `evidence_source='vlm'` + `needs_manual_review=true`. This IS the HiC citation protocol
   applied to accessibility: a WCAG claim without a rule id is a naked number.
2. **WCAG 2.2 AA target, FTC-safe posture.** Never claim automated conformance; position as
   issue detection + expert-augmented recommendations with human sign-off. Goes in the wiki
   framework page so every generation inherits it.
3. **URL capture at three viewports** (390/820/1440, DPR 2) + ARIA snapshot.
4. **Token-constrained, allowlist-constrained prototype generation with a validation loop**
   (compile + lint + axe re-scan, capped self-heal).
5. **LLM severity is advisory; reconcile multiple passes.** We implement this BETTER than the
   proposal: reinforcement inference (uncertainty-TRIGGERED second pass) instead of always-on
   2-3 passes. Cheaper, codified, already a house skill.
6. **Prompt caching + files-once ingestion** for the static rubric/schema.

## 2. What the proposal gets wrong for THIS stack (replace with existing assets)

| Proposal component | Verdict | Existing HiC asset that supersedes it |
|---|---|---|
| New Next.js + Vercel AI SDK chat UI | REJECT | HiC SPA; heuristic appMode intake + Analyst Desk chat already exist |
| Claude Agent SDK orchestrator in-product | REJECT | proxy (FastAPI) + services layer IS the orchestrator; adopting the SDK in-app violates CONVERGE and adds the June-15 metering exposure |
| Live remote Figma MCP at runtime | REJECT (doctrine) | Lego-brick rule: the SPA never calls Figma live. Tokens are mirrored in `hic-workspace/design-system/figma-tokens.json`, served at `/api/design-tokens?brand=NXT|NU`. MCP pulls happen at design time only |
| Style Dictionary build chain | DEFER | `/api/design-tokens` already emits both brand modes as CSS vars; types.ts hydrates renderer TOKENS. DTCG conversion adds nothing v1 |
| Code Connect for the component allowlist | REJECT (owner-confirmed 2026-07-05) | Code Connect maps Figma components to a CODE library, needed only when writing code back from Figma. HiC composes the OTHER direction: FROM the Figma canon (5 `proto/*` pattern pages, ~76 symbols on 403:2 alone, mirrored specs + tokens) INTO an HTML prototype in chat. The `experience-prototype-composer` skill + ai-patterns `_catalog.json` ARE the allowlist, already registered and enforced ("no invented UI shapes") |
| WebContainers / StackBlitz preview | REJECT | `#proto` renders live in-SPA (prototype viewer, compile gate); no third-party sandbox needed |
| Lighthouse in the capture path | DEFER (verified blocker) | research-proxy container has NO Node (verified 2026-07-05). v1 ground truth = axe-core injected into proxy Playwright + CDP metrics. Lighthouse = optional Node sidecar, owner decision |
| Anthropic-first w/ Sonnet default for audits | ADAPT | Routing stays in ONE authority (`aiRouter`). Audit synthesis is artifact-class -> `claude-opus-4-8`. Cheap per-viewport pre-pass may use Gemini Flash vision AFTER the vision-routing fix. Model ids never hardcoded at call sites |

## 3. Verbalized sampling trace (k=5, moderate-tail)

Modal answer named per VS-CoT: "port the proposal 1:1 into a new service with its own chat,
orchestrator, and preview sandbox." Rejected: triple CONVERGE violation.

| # | Candidate architecture | p | Disposition |
|---|---|---|---|
| A | Port proposal phases into the proxy + existing heuristic module (fix vision routing, add capture endpoints, extend schema, reuse #proto) | 0.35 | BACKBONE (modal but correct skeleton) |
| B | Audit as an Analyst-Desk hashtag (`#audit <url>`), delete the separate heuristic appMode | 0.12 | ADOPT PARTIALLY: keep intake v1 (screenshot-upload UX is good); add `#audit` routing later, owner decision |
| C | Scan evidence as MANIFEST CHUNKS: axe JSON + screenshots + ARIA snapshots written to the wiki as provenance-typed evidence pages; the report generator retrieves them manifest-first (anti-RAG) | 0.08 | ADOPT: this is what makes the audit AIR-native instead of a bolt-on |
| D | Remediation-loop-first: invest in the audit -> #proto bridge (findings seed a prototype that FIXES them, verified by axe re-scan) before deepening the audit itself | 0.07 | ADOPT as Phase 2 headline (the differentiator no scanner vendor has) |
| E | Standalone client-facing audit product in its own container (like presentation-renderer) | 0.03 | REJECT: violates CONVERGE; revisit only if audit becomes a sellable standalone |

Synthesis: A's phasing + C's evidence grounding + D's remediation bridge + B's routing
convergence as a later step.

## 4. The plan

### Phase 0: un-break + deterministic core (proxy-only, zero new UI)
1. **Fix `routeVisionAnalysis`** (aiRouter.ts ~741): add `anthropic` and `google` branches that
   POST through the proxy `/api/ai/{anthropic,gemini}` with interleaved image blocks (mirror the
   OpenAI shape at openaiService.ts:181). Heuristic runs resolve through `aiRouter` per the
   canonical rule (artifact-class -> `claude-opus-4-8`; proxy strips temperature for Opus 4.8).
   `handleHeuristicSubmit` passes real prefs, not hardcoded DEFAULT_MODELS.
2. **Failure UX**: on error stay on the intake screen with an inline error banner; NEVER
   `AppState.IDLE` (the reset-to-landing bug destroys the user's brief + screenshots).
3. **`POST /api/audit/capture-url`** in proxy/app.py, reusing the installed Playwright:
   per-viewport (390x844 / 820x1180 / 1440x900, DPR 2) full-page PNG + axe-core run
   (vendored `axe.min.js`, executed via `page.evaluate` in Playwright's isolated world so page
   CSP cannot block it; tags wcag2a/wcag2aa/wcag21aa/wcag22aa; capture BOTH `violations` and
   `incomplete`) + `aria_snapshot` + CDP timing metrics. No Lighthouse v1 (no Node in
   container, verified).
4. **`POST /api/audit/ingest-files`**: GIF frame split + downscale long edge to 1568px (PIL,
   present in the proxy). CORRECTION (2026-07-05 implementation): PDF rasterization is NOT
   possible with what's installed - PyPDF2 is text-only. The rasterizer choice (PyMuPDF is
   AGPL-licensed; pdf2image needs the poppler apt package in the image) is an OWNER DECISION
   recorded for Phase 1; until then PDFs return a clear per-file skip reason.

### Phase 0 implementation status (2026-07-05)
- SHIPPED in code (uncommitted): routeVisionAnalysis anthropic+google branches
  (aiRouter.ts), heuristic-audit routing via artifactModelFor('heuristic-audit')
  (heuristicAnalysisService.ts), inline-error failure UX with form state preserved
  (App.tsx + HeuristicBriefIntake.tsx), proxy /api/audit/capture-url +
  /api/audit/ingest-files (app.py + audit_capture.py + vendored axe.min.js 4.10.3).
- VERIFIED: tsc clean; 545/545 unit tests incl. new visionRouting.test.ts (5 tests);
  py_compile clean; CSP GATE PASSED on 3 real sites via in-container module exec
  (example.com 2 violations / github.com strict-CSP 49 passes + truncation cap engaged /
  stripe.com 46 passes) - bypass_csp=True injection confirmed working.
- PENDING: container rebuild (research-proxy + research-generator) blocked by a LIVE
  research session on the proxy at implementation time (standing rule: never rebuild
  under a live session); SPA smoke test + live intake round-trip after rebuild.

### Phase 1 implementation status (2026-07-07, owner-directive build)
- SHIPPED in code (uncommitted): `slides:screen-critique` archetype (slideComposer, 17
  registered archetypes); deterministic critique-deck composer + audit chat corpus
  (services/auditCritiqueDeck.ts, 6 tests); URL-capture merge + axe evidence-binding rule
  in the run (App.tsx handleHeuristicSubmit + heuristicAnalysisService
  deterministicEvidence param); designer chat as the default result surface (isolated
  CorpusChatPanel seeded with the deck; #proto grounded on the audit corpus +
  PROTOTYPE DIRECTIVE); cleanResponseText attribute-fence strip fix (pre-existing bug);
  arrival-open effect + reopen button (bottom-24, clears the cost meter).
- LIVE-VERIFIED (real run, ~$0.19 Opus 4.8): 3 uploads + https://example.com captured at
  3 viewports; report findings cite REAL axe rule ids (landmark-one-main, region) with
  per-screen refs; SLIDES:COVER card renders the actual screen full-bleed under the scrim
  in the auto-opened chat; the transient-502 first attempt landed on the inline
  "brief preserved" error banner (Phase 0 failure UX confirmed in the wild).
- OPEN: root cause of the open-flag flip the arrival-open effect papers over; live
  #proto remediation build from the critique chat not yet exercised (wiring in place);
  PPTX export of a critique deck not yet exercised; wiki persistence of the report
  (Phase 1 item 12) and the framework/anti-pattern pages (items 9-10) still to build.

### Critique-elevation build (2026-07-08, owner goal after the first real export)
Live-deck audit of deck_2026-07-08_13_slides.pptx found: (1) findings repeated on every
screen in their screenshotRefs (the "wrong screens" complaint - v1 placed by includes());
(2) description text overran the fix line (4-at-186px pitch); (3) slide titles duplicated
finding 1 verbatim; (4) the cover scrim was PRESENT and correct in the PPTX XML
(0D0D0D @52%, above the picture - verified via PowerPoint COM: fillTransparency 0.48)
but a bright dashboard screenshot can never carry white display type; (5) no numbered
annotations; (6) no proposed-experience comparison.
SHIPPED in code (uncommitted):
- Schema: HeuristicFinding.marker {x,y percent}; HeuristicScreenSummary (verdict +
  proposedSections from the proto/* pattern catalog + rationale); ref sanitation.
- Prompt: plain-English contract (business-owner register, jargon once in parens max),
  primary-ref discipline, marker coords, per-screen verdict + proposed sections chosen
  ONLY from the renderable proto/* catalog subset (16 pattern names).
- Deck composer v2: findings render on their PRIMARY screen only, numbered per screen;
  luminance-aware cover (bright -> framed hero panel, dark -> full-bleed scrim);
  verdict as the slide action title; 3 findings/slide at 240px pitch (collision-free
  worst case); side-by-side slides:screen-redesign when a proposed render exists.
- Composer: annotated-image treatment (top-left anchored at exact drawn size from the
  measured aspect; numbered accent discs clamped + de-collided per the graphic-collision
  ban); screen-redesign archetype (CURRENT annotated vs PROPOSED + WHAT CHANGES band).
- Proxy: /api/audit/render-proposed + proposed_screen_render.py - the proposed experience
  as a NATIVE token-locked composition of the proto/* patterns (palette hydrated from
  figma-tokens.json; Chromium HTML render; NEVER diffusion UI). 16 block renderers;
  metric tiles use neutral value bars (no fabricated numbers).
- App seam: aspect+luminance measurement per screen; per-screen proposed-render calls
  (all fail-open); screen names passed to the vision call.
- Dashboard: new "By Screen" tab - per-screen verdict + numbered findings matching the
  deck's callout discs.
VERIFIED: tsc clean; 552/552 unit tests (deck tests extended to the v2 contract:
numbering, markers, luminance cover, redesign slide); py_compile clean. PENDING: container
rebuild (live session on the proxy at build time) + live re-run + export re-audit.

### Round-2 fixes (2026-07-08, after the elevated live run + export re-audit)
The elevated run PROVED the core loop (verdict titles, per-screen numbering, plain-English
findings, live native PROPOSED side-by-side from the vision pass's pattern picks) and
exposed four residual defects, all fixed:
1. META-NARRATION reached slides (user-flagged): my own deterministic strings (redesign
   takeaway "Every numbered issue on the current screen maps to... the proposed one",
   process source line "proposed composition from...", cover subtitle "critique of...")
   plus the model's rationale phrased as design-process narration ("Darkens headings and
   rebrands rows..."). Fixed at the root: clean() now pipes removeMetaNarration over every
   string; all composer-authored strings rewritten subject-focused; the redesign takeaway
   falls back to the findings' own imperative fixes; the process source line is deleted;
   the prompt adds an OUTPUT VOICE ban + requires proposedRationale as a USER-FACING
   judgment. LESSON: deterministic composer strings are outputs too - they get the same
   anti-slop discipline as model text.
2. Numbered discs were INVISIBLE in the PPTX (visible in the SPA): the GEO walker places
   pictures after rects, so the screenshot buried the overlay discs and only the wrapped
   numerals leaked through. Fixed by BAKING the discs into the screenshot pixels
   (annotateImageWithMarkers canvas composite, token colors from brandTokens; pure-geometry
   markerPositions exported + tested). Baked pixels survive every surface identically.
3. Fix-lines still overlapped descriptions: the prose readable-floor clamp inflated
   3-line bodies past dy168. Fixed: body is a TIGHT TABULAR cell (caption, non-prose -
   the documented density/tabular exemption) at retuned geometry (baseY 236 / pitch 248 /
   heading dy32 / body dy106 / fix dy182) + tighter GENERATION budgets (title <=8 words,
   description ONE sentence 12-20 words, fix <=12 words - compression, never truncation).
4. Boxed cover title collided with its subtitle (HERO_PANEL narrowing squeezed the base
   hero-size title). Fixed: dedicated cover variant when=heroImage (numeral-size title at
   y250 w900, subtitle y840, framed 760x840 panel) + coverTitle capped at 88 chars.
Tests: 553/553 incl. marker geometry (clamp + de-collide) and a no-meta-narration
assertion on the redesign payload.

### Round-3 fixes (2026-07-08, user-flagged on the round-2 export)
1. SWAPPED ANNOTATION NUMBERS (user screenshot: disc 02 on the bold stat, disc 01 on the
   MEANS label - each finding's disc on the OTHER's element). TWO root causes, both fixed:
   (a) numbering followed SEVERITY order, so numbers could appear in arbitrary spatial
   order on the image -> ONE ordering authority orderFindingsForScreen numbers findings by
   READING POSITION (marker y, then x; unmarked findings after, severity-ordered) shared by
   the deck builder, disc baker, and dashboard - 01..N now always descend the image;
   (b) the de-collision NUDGE relocated a colliding disc ~48px straight DOWN onto the next
   element's content -> markerPositions now CLUSTERS side-by-side at the shared anchor
   (map-pin convention; right then left, single-row drop only as last resort).
2. Redesign slide showed discs with NO decode (user-flagged): a numbered LEGEND (same
   reading-order numbers + short finding titles) renders under the CURRENT image
   (images 560->500h to make room).
3. Proposed screens now for EVERY screen with findings (user directive): prompt makes
   proposedSections REQUIRED per screenSummaries entry, and the App seam composes a
   deterministic CONTENT-TRUE fallback from the screen's own verdict + fixes (hero +
   list-of-fixes + cta-row) when the model omits sections; per-screen render failures log
   loudly instead of silently skipping.
Tests updated to the reading-order contract (553/553).

### Phase 1: evidence-bound analysis engine (AIR-native)
5. **Schema extension** (types.ts HeuristicFinding): `evidence_source: 'axe'|'vlm'`,
   `axe_rule_id: string|null`, `wcag_sc: string[]`, `viewport`, `needs_manual_review`,
   per-claim `confidence` + deliverable `selfAssessment` envelope (RI contract). KEEP the
   existing 8 dimensions (superset of the proposal's 4: they add agentic-AI patterns, trust,
   agentic commerce, social commerce, GEO; these are HiC differentiators).
6. **Evidence-binding prompt rule** (heuristicAnalysisService SYSTEM_PROMPT): any WCAG pass/fail
   MUST cite an axe rule id; vlm-only findings are advisory + `needs_manual_review=true`.
   Axe/ARIA JSON rides as text blocks beside the screenshots.
7. **RI wiring**: verbalized-confidence directive in the prompt; composite trigger threshold 1.0
   (evidence-heavy deliverable); RI-Replace anchored re-ask; every invocation logged to
   `wiki/synthesis/uncertainty-ledger.md`. This replaces the proposal's always-on multi-pass.
8. **VS wiring**: `modernization_opportunities` generated under VS k=5 moderate-tail (kills the
   "add a chatbot" modal answer).
9. **Evidence as manifest chunks (candidate C)**: capture writes
   `wiki/evidence/audits/<slug>/{axe-results.md, aria-snapshot.md}` with per-type provenance
   frontmatter + screenshot files; the manifest journal chunks them; the report generator
   retrieves manifest-first like every other deliverable.
10. **Wiki framework pages**: `wiki/frameworks/heuristic-audit.md` (WCAG 2.2 AA operative
    target, EAA enforcement facts, FTC/accessiBe posture, evidence-binding rule, severity
    calibration) + `wiki/anti-patterns/heuristic-audit.md` (overlay claims, automated-conformance
    claims, naked severity). `loadGenerationContext()` then injects them for free.
11. **Prompt caching**: static SYSTEM_PROMPT + schema behind the proxy `cache_control`
    chokepoint (all-or-nothing rule per memory); SQLite exact-match cache covers identical
    re-runs.
12. **Persistence + surfaces**: report saved to session + wiki; HeuristicReportView gains
    "Export HTML" via html-deliverable-composer (brand-locked, print stylesheet). Findings can
    emit `:::slide` evidence-table/stat-row fences for deck reuse (tool scores are CITED
    evidence: "axe-core: 14 violations", never naked numbers).

### Phase 2: the audit -> #proto remediation bridge (candidate D, the differentiator)
13. **"Generate remediation prototype" action** on the report: seeds a `#proto` Stage 1 brief
    from the top findings + the findings->token fix map (contrast -> color tokens; WCAG 2.5.8
    target size -> spacing tokens; type scale -> typography tokens; every fix references the
    Figma variable NAME from `/api/design-tokens`).
14. **Allowlist = the 5 `proto/*` pattern pages** (403:2 et al., ~76 symbols/page family) +
    ai-patterns catalog, enforced by experience-prototype-composer exactly as today.
15. **Extend the #proto compile gate with an axe re-scan**: after pod assembly, the proxy
    renders the prototype HTML in Playwright, injects axe, and feeds violations back into the
    existing Opus repair loop (cap 3 iterations, then flag remaining). This closes the
    proposal's self-heal loop with machinery that already exists (Babel gate + criticReviseLoop
    pattern), and makes the claim demonstrable: "the prototype passes the same scanner that
    flagged your site."
15b. **Preview + delivery are ALREADY DONE**: the remediation prototype renders in the existing
    in-chat prototype viewer and downloads via the existing `exportPrototypeAsZip`
    (PrototypeLaunchCard, CorpusChatPanel.tsx ~1314: runnable Vite project zip with
    package.json, vite.config, src/App, README, brief.json, critique.json). Zero new preview or
    export code; the proposal's WebContainers/StackBlitz section is fully superseded.

### OWNER DIRECTIVE 2026-07-07 (supersedes items 12's report surface + reshapes Phase 1/2)
The result surface for the heuristic audit is the DESIGNER DESK AI CHAT, opened as the
DEFAULT after the AI-powered analysis of the uploaded graphics + supplied website URL:
1. The Designer Desk chat renders a nicely formatted `#slides` CRITIQUE DECK: one slide
   per screen (each upload + each captured website viewport) carrying THAT screen's
   screenshot as the slide image plus a per-screen critique (evidence-bound findings,
   severity, recommendation). Screenshots ride the existing composer image lanes so the
   PPTX export ships them as native swappable pictures.
2. If the user then enters `#proto` at runtime in that same chat, the model compiles an
   INTERACTIVE PROTOTYPE - a better, more modern, accessible version of what the mockups
   or website implied - composed from the componentized/tokenized Figma design-system
   patterns (the 5 `proto/*` pattern pages + /api/design-tokens, per the unified vision),
   reusing the Analyst Desk `#proto` machinery end-to-end (pods, compile gate, in-chat
   viewer, zip export), seeded with the critique findings + reference screenshots.
Implementation notes: per-screen critique slide = a `slides:screen-critique` archetype
SPEC entry (Method A geometry, image region + findings anatomy; Figma canon frame
write-back follows); HeuristicReportView remains as a summary tab, not the default.

### Phase 3: optional depth (owner decisions)
16. Lighthouse via a small Node sidecar container (perf/SEO corroborator) - yes/no.
17. RESOLVED by the 2026-07-07 owner directive: the audit converges into the DESIGNER
    Desk chat (not Analyst); the intake screen remains the capture/upload front door.
18. Agentic UX walkthrough via the NXT-Agency computer-use backend (8201/noVNC) as a
    "friction pass" appended to the report.
19. `.claude/skills/ux-audit/SKILL.md` packaging the workflow recipe (served at `/skills/`).

## 5. Reinforcement inference trace (self-critique of this plan)

selfAssessment: overallConfidence = medium.
leastDefensibleClaims:
1. "axe via page.evaluate is CSP-immune on arbitrary client sites." Playwright's evaluate runs
   in an isolated world, which bypasses page CSP for execution, but axe must inspect the real
   DOM (it does; isolated world sees the DOM). REVISED: kept, with a fallback noted (CDP
   `Runtime.evaluate` in main world, or serve axe from the proxy origin) and a Phase-0
   verification task against 3 real sites before building Phase 1 on it.
2. "Opus 4.8 for every audit pass is cost-appropriate." The proposal argues Sonnet-tier for
   audit passes. HELD with a narrowing: the canonical routing rule owns this; if per-audit cost
   observed in costMeter exceeds ~$0.50, add a Gemini-Flash pre-pass per viewport and reserve
   Opus for the synthesis pass. Flagged as owner-tunable, not a plan assumption.
3. "Keep the separate heuristic appMode." Candidate B scored it for deletion. HELD for v1
   (screenshot upload UX has no chat equivalent) but the convergence direction is recorded in
   Phase 3 so the mode does not fossilize.
4. Lighthouse deferral loses perf/SEO corroboration v1. KEPT: axe is the defensible a11y core;
   perf scores without Node are approximable via CDP metrics; sidecar is a bounded Phase-3 add.

## 6. Verification gates (before "shipped")
- `npm run typecheck` clean; vitest suite green including new heuristicAnalysisService tests.
- Phase-0 CSP verification: axe injection succeeds on 3 real external sites (one WAF-fronted).
- Live run: intake -> URL capture -> report renders with evidence-bound findings; failure path
  keeps the user on the intake screen.
- Remediation prototype passes its own axe re-scan with 0 violations on the fixed criteria.
- Full SPA smoke test after Docker rebuild (no console errors); no commit without approval.
