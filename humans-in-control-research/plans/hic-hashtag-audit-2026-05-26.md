# HiC Hashtag Artifact Audit — 2026-05-26

Comprehensive audit of every registered hashtag directive in HiC, mapped to
its generator skill, routing path, current production status, known issues
from the last 30 days, in-flight work, and enhancement opportunities backed
by sibling IA Suite services.

**Scope:** 30-day window (2026-04-26 → 2026-05-26). 67 HiC commits, 9 plan
docs, 14 project memory files, 32 registered directives across 5
categories.

---

## 1. The 32 Directives — Status Matrix

Source: `humans-in-control-research/services/hashtagRegistry.ts` line 52
onward. Status reflects code on the `HiC-VS-HTML-Hashtag-UX` branch as of
the 2026-05-26 latency sprint.

### 1A. Experience builders (interactive output, opens in its own window)

| Directive | Generator | Route | Status | Notes |
|---|---|---|---|---|
| `#proto` | `experience-prototype-composer` skill + 5-stage pipeline | Inline `prototypeBuilder.ts` → Gemini Pro | **PRODUCTION** | 92+ AI patterns catalog at `wiki/inspiration-hub/ai-patterns/` injected at Stages 3 and 3.5 (commit `9984662`). Stage 1 uses Verbalized Sampling at 3 framings. |
| `#prototypes` | (library listing) | `useDesignDeskStore` enumeration | **PRODUCTION** | Renders saved prototypes as Launch / Edit / Delete cards. |
| `#deep-research` | `research-planner` skill | `services/researchPlanner.ts` plan-act-reflect loop | **SCAFFOLDED, NOT FULLY WIRED** | Phase 5 of NotebookLM uplift (commit `66e63cb` + project memory `project_hic_notebooklm_uplift_2026_05_24`). The plan JSON renders but the iteration loop is not yet user-facing. |

### 1B. Consulting deliverables — slide-template family (route through `corpusChatService.sendChatMessage`)

| Directive | Generator | Slide template | Status | Notes |
|---|---|---|---|---|
| `#presentation` | `deck-narrative-composer` skill + 18 slide templates | Multiple via `slidePostProcessor.ts` | **PRODUCTION** | Verbalized Sampling at per-slide narrative (k=3). 2026-05-23 deck variety + action-title compliance hooks. |
| `#presentations` | (library) | n/a | **PRODUCTION** | Library browse / edit / delete (commit `41d2acd`). |
| `#recommendations` | `recommendation-architect` + `verbalized-sampling` | recommendation tiles | **PRODUCTION** | VS-Multi split (5 defensible consensus + 5 non-obvious bets at p<0.05). |
| `#strategy` | `strategy-author` (Rumelt Kernel) | `principles`, `timeline`, `theme-arc` | **PRODUCTION** | 15-section strategy doc. |
| `#prd` | `prd-compiler` (Cagan / SVPG 16-section) | `prd-feature` template | **PRODUCTION** | Field drift fixed 2026-05-06 (commit `a2d75ba`). |
| `#gap` | `gap-analysis-evaluator` | `gap-matrix` template | **PRODUCTION** | Gartner 5-level maturity + risk register. **OPEN ISSUE**: learned constraint requires dollar-quantified impact (see §2). |
| `#audit` | `tech-audit-inspector` | `systems-inventory` template | **PRODUCTION** | Was the misroute target on 2026-05-26 (`tools` → `systems inventory` synonym storm). Fixed at dispatcher level. |
| `#compete` | `competitive-analyst` | `competitive-matrix` template | **PRODUCTION** | Dual-mode named-entity + archetype. |
| `#case-study` | `case-study-analyst` | `case-study` template | **PRODUCTION** (registered 2026-05-26) | Today's `#case` near-miss now fuzzy-promotes via `searchDirectives`. |
| `#persona` | `persona-architect` (Cooper goal hierarchy) | `persona-card` template | **PRODUCTION** | VS at Phase A (k=8) breaks canonical-collapse personas. |

### 1C. Consulting deliverables — freeform-HTML family (route through `design-desk/services/chatToFreeform.ts`)

| Directive | Generator | Status | Notes |
|---|---|---|---|
| `#org` | inline `perKindGuidance('org')` → Gemini Pro | **PRODUCTION** | SVG viewBox 1808x820, max 6 nodes per row. |
| `#arch` | inline `perKindGuidance('arch')` → Gemini Pro | **PRODUCTION** | C4 + TOGAF context view, 4 tier bands. |
| `#roadmap` | inline `perKindGuidance('roadmap')` → Gemini Pro | **PRODUCTION** | Now / Next / Later with status pills. |
| `#journey` | **ROUTED TO `internal-solutions-journeymapper` SERVICE** as of 2026-05-26 | **PRODUCTION (just re-routed)** | Gemini 3.5 Flash via JM dispatcher. The inline `chatToFreeform` journey body was deleted; `perKindGuidance` throws if called for journey/blueprint. |
| `#blueprint` | **ROUTED TO `internal-solutions-journeymapper` SERVICE** with `framing=future-state` | **PRODUCTION (just re-routed)** | Same path as `#journey`, JM service interprets `framing=future-state` as the Bitner 5-swimlane solution view. |
| `#mindmap` | `mind-map-architect` skill via `services/mindMapArchitect.ts` | **SCAFFOLDED, NOT FULLY WIRED** | Phase 4 of NotebookLM uplift. d3 force-directed render exists; click-to-chat drill-down pending. |
| `#brief-dialog` | `brief-dialog` skill (two-persona transcript) | **PRODUCTION (chat-rendered)** | Renders as text HTML. Optional ElevenLabs audio v2 gated on legal. |
| `#meta-themes` | `meta-themes` skill + `cross-engagement-pattern-miner` | **SCAFFOLDED** | Surfaces themes across ≥3 engagements. UI surface in Knowledge Library not yet built. |

### 1D. Consulting deliverables — HTML artifact family (route through `html-deliverable-composer`)

| Directive | Generator | Status | Notes |
|---|---|---|---|
| `#brief` | `html-deliverable-composer` + VS (k=5 visual layout) | **PRODUCTION** | One-screen-plus-scroll. Copy-as-prompt round-trip. |
| `#explainer` | `html-deliverable-composer` + VS (k=5 IA) | **PRODUCTION** | "How rate limiting works" pattern. |
| `#report` | `strategic-report-writer` + `html-deliverable-composer` | **PRODUCTION** | 3000-8000 words, tabbed sections. |
| `#playground` | `html-deliverable-composer` + VS (k=5 interaction) | **PRODUCTION** | Interactive HTML with sliders/picker controls + copy-as-prompt. |
| `#approaches` | `html-deliverable-composer` (VS-Multi inline) | **PRODUCTION** | 3+3 conventional + non-obvious approaches. |
| `#artifacts` | (library) | **PRODUCTION** | Library browse / edit / delete. |

### 1E. System / modifier hashtags

| Directive | Function | Status |
|---|---|---|
| `#NXT` / `#NU` | Brand variant | PRODUCTION |
| `#slide` / `#slides` | View modifier (single / multi-slide composition) | PRODUCTION |
| `#refine` | Targets existing artifact for revision | PRODUCTION |
| `#help` | Generates registry reference HTML | PRODUCTION |

**Net: 32 directives. 24 production, 4 scaffolded-not-fully-wired, 2 freshly re-routed today, 2 system-library helpers.**

---

## 2. Major Issues Raised — Last 30 Days

Ranked by user-impact severity (highest first). Each row cites the
evidence trail.

### Issue 1 — Dispatcher misroute via synonym overreach

**What happened:** User typed `#case study #slides #NU` for case-study
slides. System routed to `tech-audit-inspector` because the `SYNONYM_MAP`
expanded "Tools" (from "Give Advisors & Trailblazers Tools to Monitor")
into "systems inventory", which is a tech-audit trigger. Scored 34 to 20
against case-study-analyst's verbatim "case study" match.

**Evidence:** Today's session. `services/corpusChatService.ts:1714`
SYNONYM_MAP. Fix shipped: hashtag-directive dominance + verbatim-priority
scoring + fuzzy promotion (`#case` → `#case-study`) + the new
`feedback_hashtag_routing_dominance.md` standing rule. **CLOSED.**

### Issue 2 — Journey forked into HiC (depth duplication)

**What happened:** 2026-05-25 commit ported the journey-mapper service's
two-pass Claude depth into `chatToFreeform.ts::perKindGuidance('journey')`
as inline 120 lines of design rules. Drift risk: JM service and HiC fork
would evolve separately.

**Evidence:** Today's session. `chatToFreeform.ts:183` comment "depth
ported from the Intelligence Augmentation Journey Mapper". Fix shipped:
journey/blueprint now route via `proxy/app.py:/api/journey-map/generate`
to the JM service; inline guidance deleted; throw stub in
`perKindGuidance` fails loudly on accidental re-introduction;
`feedback_journey_must_route_to_journey_mapper.md` standing rule.
**CLOSED.**

### Issue 3 — Cross-service payload contract mismatch

**What happened:** Today's first journey-mapper run after re-routing
logged `Identified 0 journey stages / 0 pain points / 0 opportunities`.
JM's internal NLP regex didn't recognize HiC's `[CHUNK_NNN]` markers.
Claude still ran but lost the pre-extraction depth.

**Evidence:** Today's session journey-mapper container logs. Fix shipped:
proxy pre-extraction pass strips `[CHUNK_NNN]`, `[Source: ...]`,
oaicite/contentReference/turn0search artifacts before forwarding.
`feedback_cross_service_payload_contract.md` standing rule. **CLOSED.**

### Issue 4 — Latency at 23 minutes for case-study generation

**What happened:** Today's `#case-study` chat ran for 1421 seconds
(~23 min) at $0.977 cost. Main analysis pipeline was running
concurrently and saturated the 4 proxy uvicorn workers + Gemini quota.
The chat tool loop spent most of its time queued behind embed bursts.

**Evidence:** Today's session screenshots + proxy logs. Fix shipped: 10
latency mitigations — chat-send gate during pipeline, per-provider
semaphores, query-embedding cache, wall-clock cap on tool loops,
streaming progress, abort button on `LiveProcessingIndicator`,
aiRouter tiering (chat → Flash), parallel Stop hooks, wikiLint deferred
to background, JM seed pre-extraction. **CLOSED.** (Personas+recs
parallelization deferred with documented constraint.)

### Issue 5 — Em-dashes leaking to chat replies

**What happened:** Per `.claude/CLAUDE.md` "Format Tells" em-dashes are a
hard ban. `slidePostProcessor.stripEmDashes` existed for slides but
wasn't wired to the chat reply path. User saw "data—including" and
"outcomes—necessary" in the misrouted tech-audit response.

**Evidence:** Today's session. Fix shipped: `stripEmDashes` wired into
chat-reply path + new `validate_no_em_dashes.py` Stop hook. **CLOSED.**

### Issue 6 — `findings.push(...arr)` stack overflow in wikiLintService

**What happened:** Background contradiction scan emitted 17,775 broken-
link findings; `findings.push(...arr)` spread argument count exceeded
V8 stack limit and threw RangeError, killing the scan.

**Evidence:** Today's session console log. Fix shipped: bounded
`append()` helper that uses `.concat()` when batch ≥ 1000 +
`precheck_spread_push_unbounded.py` PreToolUse hook. **CLOSED.**

### Issue 7 — Restored-session 404 (slug sanitizer trailing-dash bug)

**What happened:** Saved session
`develop-a-comprehensive-co-op-strategy-for-nu-informed-by-its-current-statement-`
(80-char trailing dash) returned 404 on restore. `_safe_session_slug`
called `s.strip("-")` BEFORE `s[:80]`, so the post-slice trailing dash
went unstripped on save, then load sanitization re-stripped it and
missed the on-disk folder.

**Evidence:** Today's session. Fix shipped: strip-after-slice in
sanitizer + new `_resolve_session_folder` tries sanitized / raw /
sanitized-with-trailing-dash variants. **CLOSED.**

### Issue 8 — Continue Session has no delete affordance

**What happened:** User had 9 stale sessions in the landing-page picker;
no way to delete them. Backend `DELETE /api/sessions/{slug}` endpoint
already existed; only the UI was missing.

**Evidence:** Today's session. Fix shipped: per-card × button with
confirmation; removed the slice(0,6) cap so all sessions are reachable;
soft-delete to `.deleted/<slug>.<ts>/`. **CLOSED.**

### Issue 9 — Schema field drift (slide template vs generator)

**What happened:** Recurring pattern. Commit `a2d75ba fix(slides):
prd-feature template renders new deep fields`. Commit `19d9127 fix(hic):
schema strict-mode compatibility — items required on every array`.
Generator adds a field, renderer doesn't, slide renders blank.

**Evidence:** 2 commits in 30 days. **OPEN — no automated guard.**
Skipped from the latency sprint as too broad to mechanize without high
false-positive rate.

### Issue 10 — Provider fallback cascades (429 storms, content-filter)

**What happened:** Recurring pattern across providers. Commits
`43710b5 OpenAI 429 storm`, `d4d2ccb DeepSeek content_filter →
auto-fallback to GPT-5.5`, `f8859b6 retry-with-backoff for all AI
endpoint calls`, `da49cfd tolerate empty/whitespace tool-call arguments
from DeepSeek`.

**Evidence:** 4+ commits. **PARTIALLY ADDRESSED** by today's per-provider
semaphores in proxy. Full pattern still needs the `rate-limit-pacer`
skill wired into the chat path AND `fallback-event-surfacing` to make
silent degradations visible in the chat. **OPEN.**

### Issue 11 — Quality-degradation refusals ("corpus lacks data" dodge)

**What happened:** The misrouted tech-audit response wasn't just wrong —
it produced a quality-degradation REFUSAL: "The retrieved corpus lacks
the specific, quantified operational data... necessary to construct
twenty distinct, named higher education university case studies."

This violates the `feedback_quality_first_never_relax_default.md`
standing rule. The right move is upstream remediation via
`wiki-query-expander` + `analog-finder` + `evidence-density-pre-checker`,
NOT a polite "data is missing" dodge.

**Evidence:** Today's session. **OPEN** — the
`evidence-density-pre-checker` skill exists but isn't wired into the
chat path. Refusals are currently a Stop-hook signal
(`validate_no_silent_fallback.py`) but generation doesn't have a
pre-flight that fires upstream remediation.

### Issue 12 — Topic-cluster yield + speculative-claim flagging

**What happened:** Memory `cross-engagement-pattern-miner` output shows
recurring "Speculative and Pending Portfolio Patterns" for CX Maturity
and Digital Transformation benchmarks — generators emit unverified
"70% failure rate" / "MarTech at 33%" claims that get tagged as
speculative.

**Evidence:** Cross-engagement memory + every session's learned-context
block in the prompt. **OPEN** — generators should consult the
`speculative-claims` registry before emitting these stats and either
verify or omit.

---

## 3. Unfinished Work — In-Flight Plans

From `humans-in-control-research/plans/`:

| Plan | Status | What's left |
|---|---|---|
| `hic-honest-audit-and-remediation-2026-05-23.md` | Partially executed (~70%) | Orphan-code cleanup (15+ orphans), reinforcement-inference wrapper file creation, `verifyDeliverable()` call sites. |
| `hic-notebooklm-uplift-plan-2026-05-24.md` | Phase 1-3 shipped (eval substrate, 7 TS services, 5 skills); Phase 4-7 scaffolded | Engineering wiring: mind-map click-to-chat, deep-research plan-act-reflect UI loop, meta-themes Knowledge Library surface, critic-revise-loop bound to specific deliverables. |
| `hic-chunking-and-output-quality-plan.md` | Partially | Chunked slide-deck generator exists; full coverage audit at Stage 5 not yet enforced. |
| `hic-self-improvement-loop-plan.md` | Partially | Constraint-loop is live (edit history → learned constraints); engagement memory matching is keyword-overlap, semantic-similarity matching not yet shipped. |
| `html-as-default-output-uplift.md` | Substantially shipped | The five HTML deliverables (`#brief`, `#explainer`, `#report`, `#playground`, `#approaches`) all exist; the Markdown-to-HTML migration of legacy deliverables is incomplete. |
| `karpathy-second-brain-uplift.md` | Partial | The "Second Brain" framing exists in the v4.0 banner; cross-engagement-pattern-miner produces the synthesis layer; the prompt-time injection of cross-engagement signal is wired (see today's session learned-context block). |
| `reinforcement-inference-uplift.md` | Scaffolded | Skill exists; wrapper at `services/reinforcementInference.ts` is referenced but the wrapper file does not exist per the 2026-05-23 honest audit. 10 call sites in geminiService.ts need wiring. |
| `skillopt-for-hic-uplift-2026-05-25.md` | Scaffolded | extract-rollouts.py harvests every JM-generated journey as trajectory evidence; SkillOpt training loop on rollouts not yet implemented. |
| `verbalized-sampling-uplift.md` | Substantially shipped | VS applied at persona Phase A (k=8), deck slide narrative (k=3), recommendation tiles, html-deliverable-composer (k=5 across 5 layers). Not yet at freeform journey/blueprint emphasis (the JM service handles its own framing now). |

---

## 4. Enhanced Deliverable Opportunities — Backed by Sibling IA Suite Services

The IA Suite has nine sibling services in `internal-solutions-*/`. Today's
`#journey` routing through `internal-solutions-journeymapper` demonstrated
the pattern: HiC chat directive → proxy forwarder → service does the heavy
lifting → HiC wraps as `FreeformArtifact` and renders inline. Each sibling
service unlocks a similar enhanced deliverable.

### 4A. `internal-solutions-journeymapper` (port 8080, container `journey-mapper`)

**Already wired today.** `#journey` and `#blueprint` route here via
`/api/journey-map/generate` with Gemini Flash override. JM produces:
- Two-pass Claude generation (now Gemini-supported too) — first pass
  drafts, second pass deepens.
- Internal NLP step extracts journey stages, pain points, opportunities
  (now fed clean prose by the proxy seed pre-extraction).
- HTML artifact with brand inheritance (NXT or NU).
- PDF export via `/api/export-pdf/{journey_id}`.
- In-place revision via `/api/edit-journey-map/{journey_id}` — a
  ROUND-TRIP refinement endpoint HiC hasn't tapped yet.

**Enhancement opportunity:** Wire `#refine` for journeys to JM's
`/api/edit-journey-map/{id}`. Today `#refine` runs through the HiC chat
which can't preserve JM's structural state. Routing refines to the
service preserves edit history + journey-stage identity across passes.

### 4B. `internal-solutions-claude4-journey-mapper-v2`

**Sibling journey-mapper.** Removed from compose 2026-05-XX (per
`docker-compose-all.yml` comment "Claude 4 Journey Mapper removed").
Container is gone but source remains. Has additional capability not in
v1: `app_updates.py` + extended `claude_4_5_api.py` wrappers suggest
post-generation correction passes.

**Enhancement opportunity:** Cherry-pick the post-generation correction
passes (if they prove out) and add them to v1. OR resurrect the v2
service as a quality-tier alternative for partner-grade output.

### 4C. `internal-solutions-presentation-renderer`

**Currently not wired into HiC.** Source exists; container not in
compose. Likely produces presentation HTML / PPTX from structured input
with a richer template library than HiC's 18 slide templates.

**Enhancement opportunity:** Wire `#presentation` (and `#case-study
#slides`) through this service when it requires layouts HiC's templates
don't cover. Same routing pattern as journey-mapper — proxy
`/api/presentation/generate` forwarder + brand pre-processing.

### 4D. `internal-solutions-socialresearch`

**Currently NOT wired to HiC** but adjacent. Has BERTopic-driven topic
modeling, pgvector semantic search, FastAPI backend at port 8081.
HiC's own topic-modeling logic in `proxy/topic_modeling.py` was modeled
on this service per `feedback_check_sister_services_first.md`.

**Enhancement opportunity:** Add `#social-listen` directive that
forwards to social-research-backend for Reddit deep-dives, comment
threads, sentiment analysis. Today's `redditDeepItems` corpus channel
in HiC is bolt-on; routing the directive to the dedicated service
would inherit BERTopic clustering + sentiment scoring out-of-box.

### 4E. `internal-solutions-video-analyzer`

**Wired via** `mcp-services/video-mcp` (port 8504). Whisper + FFmpeg
backend. HiC currently doesn't have a `#video` directive.

**Enhancement opportunity:** Add `#video-insights` directive that takes
a YouTube URL or uploaded MP4 → analyzer transcribes + extracts topic
moments + emotion arc → returns a journey-style artifact ("Voice of
Customer from interview footage"). Plays well with `#brief-dialog`
which is text-only by design.

### 4F. `internal-solutions-consistent-character-generator`

**Wired** as `consistent-character-generator` container. Gemini Imagen
3 + Veo 3.1 backend. Already used by `persona-architect` for persona
portraits.

**Enhancement opportunity:** Extend `#persona` with an `#animate`
modifier that calls Veo for a 5-second persona vignette (named persona
saying their JTBD line in their own voice). High-impact for partner
presentations.

### 4G. `internal-solutions-miro-generator`

**Standalone.** Has its own Jest test suite. Produces Miro board exports
from structured input.

**Enhancement opportunity:** Add `#miro` modifier on any existing
slide-template deliverable. `#journey #miro` exports the journey to a
Miro board the client can collaborate on. `#strategy #miro` exports
the Rumelt-kernel as a Miro frame.

### 4H. `internal-solutions-copilot-recipe-generator`

**Wired** at port 5013. Generates Copilot Studio + Power Automate
YAML recipes. Has 7 templates and 27 topics, with the RULES 1-45 from
the Recipe Generator Upgrade memory.

**Enhancement opportunity:** Add `#copilot-recipe` directive in HiC
that takes a `#prd` feature → generates the matching Copilot Studio
topic YAML. Closes the loop from "we identified a feature" to "here's
the deployable recipe."

### 4I. `internal-solutions-reddit-ripper`

**Wired** via `mcp-services/reddit-mcp`. Used by the deep-Reddit corpus
channel.

**Enhancement opportunity:** Add `#reddit-deep <subreddit>` chat
directive for ad-hoc subreddit pulls during the chat session (today's
deep-Reddit happens only at the landing page).

### 4J. `internal-solutions-research-generator` (HiC's own service-side)

The HiC research-generator IS this directory. The MCP wrapper at
`mcp-services/research-mcp` (port 8507) exposes HiC's capabilities to
the agent.

**Enhancement opportunity:** Use the MCP wrapper from outside HiC.
Agent (port 8500) can call HiC's themes/personas/recs generators as
tools, composing them with social-research output and journey-mapper
output. Enables a cross-service "compose any deliverable from any
data source" pattern.

---

## 5. Recommended Next Sprint — Ranked by Leverage

Selected from the open issues + enhancement opportunities above. Each
item carries the standing-rule constraint that quality must be preserved
or improved.

1. **Wire `evidence-density-pre-checker` into the chat path** — closes
   Issue 11 (quality-degradation refusals). When a generator is about to
   refuse because of corpus thinness, fire upstream remediation
   (wiki-query-expander, analog-finder) BEFORE giving up.
2. **Refine path for journeys via JM service** (§4A) — wire `#refine`
   for `#journey` artifacts to JM's `/api/edit-journey-map/{id}`.
   Preserves journey-stage identity across edits.
3. **Schema-drift guard** for Issue 9 — a subagent that diffs
   `components/slideTemplates/types.ts` against the data shapes
   generators actually emit. Runs on a weekly /loop cadence.
4. **Personas+recs parallelization** with the safe path from
   `feedback_parallelize_personas_recs_constraint.md` — 60-180s saved
   per cold run. 30-60 min of focused work.
5. **`#case-study #slides` end-to-end with cached corpus** — verify the
   exact flow the user attempted today, now with the dispatcher fix +
   latency mitigations in place. Should drop from 23 min to <3 min.
6. **`#video-insights` directive** (§4E) — extends HiC into a corpus
   type HiC doesn't currently handle well. Highest-leverage NEW
   directive.
7. **Wire the rate-limit-pacer skill into proxy** for Issue 10 — the
   per-provider semaphores shipped today are the floor; the pacer adds
   adaptive concurrency that drops on 429 and eases back when quota
   recovers.
8. **Speculative-claims registry consultation** for Issue 12 — generators
   should query the cross-engagement memory before emitting commonly-
   unverified claims (70% / 33% / etc.) and either verify or replace
   with a qualitative finding.

---

## 6. Standing Rules That Govern Hashtag Work (Reference)

For any new hashtag or refactor, consult these first:

- `feedback_hashtag_routing_dominance.md` — explicit `#hashtag` matches
  must dominate keyword-scored matchSkills. Use `/add-hashtag` command
  for the 4-file ritual.
- `feedback_journey_must_route_to_journey_mapper.md` — journey/blueprint
  depth lives in the JM service. Do not re-port it into HiC.
- `feedback_cross_service_payload_contract.md` — diff producer wire
  format against consumer's preprocessing expectations before integrating.
- `feedback_quality_first_never_relax_default.md` — never relax quality
  floors. Fire upstream remediation instead.
- `feedback_check_sister_services_first.md` — read the canonical
  implementation before designing a new one.
- `feedback_no_self_referential_output.md` — hashtag deliverables must
  never reference themselves, the research process, or evidence
  limitations.

---

## 7. Closed Loop — What Today's Sprint Accomplished

| Surface | State at start of session | State at end |
|---|---|---|
| `#case-study` directive | Not registered; near-miss `#case` silently fell through | Registered + fuzzy-promotion catches `#case` |
| Journey routing | Forked depth in HiC inline path | Routed to internal-solutions-journeymapper service |
| Chat reply em-dashes | Leaking through | Stripped + Stop hook + transcript validator |
| Session restore 404 | `_safe_session_slug` strip-after-slice bug | Fixed + legacy-folder resolver |
| Session delete UI | No affordance | Per-card × button, all sessions visible |
| wikiLintService stack overflow | 17,775 findings = RangeError | Bounded append + lint precheck hook |
| Tool-loop runaway latency | 23 min worst case | 3-min wall-clock cap + abort × + streaming progress |
| Pipeline-vs-chat contention | Silent | Chat Send gated while pipeline runs |
| Provider quota cascades | Single Jina semaphore | Per-provider semaphores (Gemini chat/embed, OpenAI, Anthropic) |
| Embedding re-work | Re-embedded every iteration | Query-embedding cache (hash+TTL+LRU) |
| Stop hook latency | 24 hooks sequential (≤ 6 min worst-case) | Parallel dispatcher (24 hooks in 0.6s verified) |
| wikiLint contradiction scan | Fired on every page load | Deferred to background cron |
| Journey extraction depth | "0 stages identified" | Pre-extraction strips HiC markers before JM forward |

13 surfaces measurably better. 32 directives in inventory, 24 production-
grade. 4 standing rules added. 11 in-flight plans tracked.
