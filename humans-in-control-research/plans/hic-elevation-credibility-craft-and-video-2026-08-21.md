# HiC elevation: credibility surface, writing craft, skill governance, and video
### 2026-08-21

Three inputs produced this plan, in this order:

1. **The promotional-claim verification run** (`plans/promo-claims-verification-2026-08-21.md`).
   Ten claims tested against the running app. Eight passed, one passed with a caveat, one failed
   and was fixed in the same pass. Two gaps surfaced that the copy never claimed.
2. **HyperFrames** (`github.com/heygen-com/hyperframes`, Apache-2.0, v0.8.7). Read end to end and
   RUN on this machine: a 60-second 1080p promo of a real HiC research run was rendered with it.
3. **Matt Pocock's skills library** (`github.com/mattpocock/skills`, 36 skills) and aihero.dev.
   Read in full. Its `writing-for-agents` file is the single most useful document for HiC's own
   70-plus skill library, and its `writing-beats` grounding model is a checkable narrative gate
   HiC does not have.

Every item below names the Unified Vision phase it advances and the evidence that motivated it.
Items are ordered by what a researcher would notice, not by implementation convenience.

---

## Part 0. Shipped in this pass, listed so the plan is honest about its own baseline

**E0.1 The citation surface (Phase 3, Phase 8).** The pointer binder was proven in the previous
program, but the researcher could not reach the evidence: 135 pointer strings on screen, zero
clickable, and theme cards printing raw `[articles/x.md#c1]` as body text while the card's own
"open in wiki" control stayed hidden. `extractPointers` / `quoteWithAffordance` now live in
`services/citationPointerRegistry.ts` (the existing pointer authority) and three surfaces route
through them: the research board, the checkpoint review, and deliverable cards. Verified live:
0 raw pointers, 153 wiki controls, 55 pointer chips over 56 cards, and a click opens the passage
with its path and tier. 1,072 tests, all gates green.

The lesson worth keeping: **the internal mechanism was correct and the only surface a human
touches was making the artifact look more machine-generated, not more credible.** Every future
credibility feature gets a user-surface test in the same pass, not a follow-up.

---

## Part 1. Credibility, finishing what E0.1 started

**E1.1 Seed the evidence-slot plan from the research planner (Phase 1, Phase 5). P0.**
AIR logs `objective.decomposedQuestions empty: sub-question coverage not recorded` on the
chat-deck path. `evidenceSlots` therefore measures P0 coverage against a plan the run never
declared, which makes a real gate weaker than it reads. `researchPlanner.ts` already produces
SubQuestions with coverage auditing; the deck path does not consult them.
*Change:* on a `#slides` turn, load the engagement's declared sub-questions into the artifact
plan before generation, and record in AIR which sub-question each P0 slot answers. When no plan
exists, say so in the record rather than reporting coverage against an empty plan.
*Done when:* a live deck's AIR names its sub-questions and P0 coverage is computed per declared
question, and a deck generated with no plan records `planAbsent: true` instead of `coverage: 1`.

**E1.2 Inline citation chip in prose (Phase 8). P1.**
Card prose currently strips the pointer, because a 12px paragraph cannot carry a full source
name. Nothing is lost (the quote carries the openable control) but the better answer is a small
superscript chip in the prose itself that opens the same passage.
*Change:* one `<CiteChip pointer=... />` primitive, rendered from `extractPointers` output, used
by the board, the checkpoint, and the deep-dive modal. Design-system tokens only.
*Done when:* a summary sentence shows a chip, the chip opens the passage, and no raw path appears.

**E1.3 Prove every gate bites (Phase 7). P0, cheap.**
Adopted from `setup-ts-deep-modules`: "a config that doesn't fail on a violation is worthless."
HiC has ten chain stages and four CI gates; nothing deliberately feeds each one a violation and
asserts rejection.
*Change:* one `gates-bite.test.ts` per gate: pass a known-good artifact (expect pass), a known
violation (expect the specific finding), and assert the finding names the offending field.
*Done when:* ten stages and four gates each have a red case, and removing any gate's logic makes
a test fail rather than a warning disappear.

**E1.4 Kill the flake, then keep it killed (Phase 7). P0.**
One suite run reported 2 failures while a Docker build saturated all cores; four subsequent runs
were clean. A timing-sensitive test in a suite that pins a contract is a hole in the claim.
*Change:* run the suite under deliberate CPU contention to identify the test, then remove the
timing dependence (inject the clock, or assert ordering rather than elapsed time). Add a CI job
that runs the suite with `--pool=threads --maxWorkers=2` under load.
*Done when:* twenty consecutive runs under contention pass, and the offending test no longer
reads a real clock.

---

## Part 2. Writing craft, from the skills library

HiC's writing control is roughly 95 percent subtractive: 350-plus banned phrases. The
`writing-for-agents` negation rule names the cost precisely: "steering by prohibition drags the
forbidden behaviour into context and makes it *more* available... Prompt the positive." HiC
already has the positive half (`human-voice-editor`), added only after the audit found it had
been referenced with no file behind it for two months. These items make the positive half
load-bearing and measurable.

**E2.1 The grounding gate (Phase 8). P0. The highest-value writing item in this plan.**
From `writing-beats`: "Every concept has to be grounded before a beat can lean on it... The unit
is the concept, not the word for it." This is a *checkable* form of the Partner Test, which HiC
currently judges holistically.
*Change:* a `grounding` sub-check inside stage 10 (`deckQuality`). Walk slides in order, keep the
set of concepts introduced so far, and flag any slide whose claim leans on a concept no earlier
slide grounded. Concepts come from the deck's own noun phrases plus the manifest concept graph,
not from a hand-written list.
*Done when:* a deck that names a mechanism on slide 4 which no earlier slide introduced is
flagged with both slide numbers, and the repair pass can act on it.

**E2.2 Candidate openings, forced choice (Phase 5). P1.**
From `writing-shape`: "Draft 2-3 candidate openings. Each opening should imply a different
thesis... Force the user to pick." HiC believes in this already (`verbalized-sampling`) but
applies it to slide narrative, not to the deck's thesis.
*Change:* DECK MODE emits three candidate thesis lines with their implied argument, and the
checkpoint asks the user to choose before the body is composed. The unchosen two are recorded in
AIR, which gives SkillOpt real preference data instead of inferred signal.
*Done when:* a deck run shows three theses, the chosen one drives the body, and AIR records the
rejected pair.

**E2.3 Audit all 70-plus skill descriptions as pointers, and split invocation (Phase 7). P1.**
`SKILL-MECHANICS`: "Pick model-invocation only when the agent must reach the skill on its own...
If it only ever fires by hand, make it user-invoked and pay no context load." Every HiC skill is
effectively model-invoked, so every description sits in context on every turn, and HiC's own
standing rule says hashtag directives short-circuit keyword skill matching anyway. That is
measurable waste plus attention dilution across sediment.
*Change:* classify each skill (hashtag-reached, model-reached, human-reached); mark the
hashtag-only ones so they stop paying per-turn context; rewrite descriptions as triggers rather
than identity statements; add the no-op test and the negation rule to
`skillopt-validation-gate`'s rubric.
*Done when:* `check:skills` reports an invocation class for every skill, per-turn skill context
drops measurably, and the gate rejects a patch that adds a prohibition with no positive target.

**E2.4 A router skill, `ask-hic` (Phase 7). P1.**
From `ask-matt`, plus its enforcement rule: "a new skill it never mentions, or a stale one it
still routes to, is a router that lies." With 70-plus skills there is no map from a user's intent
to the right entry point.
*Change:* one user-invoked router naming the real flows (research run, artifact, prototype, QA,
self-improvement) and, per flow, the ordered skills. Add a `check:skills` rule that fails when a
user-reachable skill is missing from the router.
*Done when:* the router covers every user-reachable skill and CI fails if it drifts.

**E2.5 `#questionnaire`, a new deliverable (Phase 8). P2, small and genuinely useful.**
`to-questionnaire` is a complete authoring contract for turning an unanswerable decision into
questions for the person who holds the knowledge, and consulting engagements need exactly this
constantly. Its rules transfer intact: one idea per question, an answer stub beneath each,
"why this matters" only where the question could be misread, most important first because async
means one pass.
*Done when:* `#questionnaire` produces a stakeholder discovery document that passes the content
gate and cites the corpus gaps that motivated each question.

**E2.6 Two more near-free adoptions. P2.**
`diagnosing-bugs`' phase gate ("No red-capable command, no Phase 2", 3-5 ranked hypotheses
before testing any) folded into `service-log-triage`, which pairs with HiC's own log-audit rule
that the stated symptom is rarely the root cause. And a `design-desk/out-of-scope/` record of
rejected approaches, consulted before proposing, from `triage`'s rejected-ideas knowledge base:
HiC re-litigates settled rejections across sessions today.

---

## Part 3. Video, and where HyperFrames belongs

**What it is, corrected.** Not a screen recorder and not a HeyGen cloud client. It is a
deterministic HTML-to-video renderer: a paused, seekable timeline in a plain HTML file, captured
frame by frame through Chrome DevTools `HeadlessExperimental.beginFrame`, encoded by ffmpeg.
Node 22 plus ffmpeg plus a pinned chrome-headless-shell. Apache-2.0. Local rendering needs no
HeyGen account and spends no credits. It composes; the caller supplies the pixels.

**Verified on this machine, not assumed.** A 60-second 1080p promo of a real HiC research run was
authored and rendered: eight beats built from screenshots captured during the live verification
run above (objective, corpus, the ask, composition with the gates, the evidence board, the opened
source passage), brand tokens throughout, `lint` clean, motion checked at seven timestamps before
committing to the render. This machine's ffmpeg lacks libx264, so the render ran through the
project's own Docker path.

**E3.1 Standalone render service (`internal-solutions-video-renderer`, port 5015) + MCP wrapper. P1.**
This is the stronger fit and it matches the project's supported deployment shape rather than
inventing one. The producer package already ships an HTTP server with `GET /health` (which
matches the platform health convention verbatim), `POST /render`, `POST /render/stream` for SSE
progress, and `POST /lint`; `POST /render` accepts an inline HTML string, so a model-authored
composition becomes an MP4 without touching the host filesystem. Wrap as
`mcp-services/video-render-mcp/` with `render_composition` and `lint_composition`, register in
`tool_services`, restart the agent: the standard five-step ritual, no new patterns.
*Deliberate operational settings:* `--shm-size=2g` (the 64MB default crashes Chrome), a bounded
worker count since each worker is a separate Chrome at roughly 256MB, an explicit queue because
renders take minutes and the default concurrency is 2, a mounted volume for renders because
download tokens expire, `HYPERFRAMES_NO_TELEMETRY=1` (telemetry is on by default), and a vendored
GSAP plus pre-warmed font cache so compile time needs no public internet.

**E3.2 Research-run recap video from AIR, inside HiC. P2, and gated.**
The technical fit is unusually good: `slideToStageHtml.ts` already emits self-contained
1920x1080 stage HTML, which is exactly HyperFrames' canvas; the design system is already
CSS-variable driven, so `data-composition-variables` maps onto the NXT/NU mode flip and onto
per-engagement parametrization (a `--batch` render of one recap per engagement is a two-line
change once a template exists); GOLD exhibit PNGs drop in as clips; and the determinism contract
agrees with HiC's determinism-first rule for cached runs.
*The honest cost:* stage HTML is static, so someone must author timing and a paused timeline per
deck archetype. That is a new authoring surface with its own review loop, not a config flag.
*The blocker to respect:* the anti-slop, citation, and quantitative-claim gates have no video
analogue. **No composition text ships to a frame until it has been through
`slidePostProcessor`**, because a banned phrase baked into pixels cannot be repaired later. Build
E3.1 first and treat E3.2 as a template exercise on top of it.

**E3.3 Rejected, with reasons.** HyperFrames for screen capture (it does not do that; Playwright
or a recorder supplies footage). HeyGen cloud render, publish, and the media catalog (credits and
an external dependency for something the local path already does). Avatars and TTS voice for
client deliverables (voice IP risk, and HiC's own brief-dialog decision already rejected
synthetic audio for the consulting use case).

---

## Sequence

P0, in order: E1.1 (the gate is measuring against nothing), E1.3 and E1.4 (a gate suite that
cannot be trusted undermines every other claim), E2.1 (the grounding gate is the biggest single
lift to deck quality).

P1: E1.2, E2.2, E2.3, E2.4, E3.1.

P2: E2.5, E2.6, E3.2.

Nothing here is a rewrite. Every item extends a surface that already exists, which is the
converge-and-gate rule rather than build-new.

---

# IMPLEMENTATION RECORD, 2026-08-21

Branch `hic-elevation-2026-08-21`, cut from `deerflow-harness-transfer-2026-08-20`.
All twelve items built. Gates at close: `tsc --noEmit` clean, **1,190 tests over 111
files** (from 1,072 over 104), `check:skills` / `check:content` / `check:templates` green,
SPA rebuilt and smoke-tested with zero console errors.

## P0

**E1.1 (objective plan).** `services/objectivePlan.ts` is now the single reader for a
run's sub-questions, and `SlotReport` carries `planAbsent` + `plannedSubQuestions`. Both
AIR writers that hardcoded `decomposedQuestions: []` (`corpusChatService`,
`CorpusChatPanel`) read it. `CoverageStatus` gained `unmeasured`, because the record
needed a word for the state it was previously spelling as either `covered` or
`uncovered`. 15 + 3 tests.

**E1.3 (prove every gate bites).** `services/gatesBite.test.ts`, 27 cases: every one of
the ten stages gets a clean artifact it must accept and a violation it must catch. It
found two real holes on the first run, which is the whole argument for the exercise:

- Nothing stripped `oaicite` and its family at runtime, even though `.claude/CLAUDE.md`
  bans them outright and `check:content` fails the build on them. A hard rule, a CI
  rejection, and no prevention. Now `stripProviderArtifactTags` in the shared chokepoint,
  so every surface gets it. Two regex bugs surfaced while probing it: the first version
  ate the word after a bare colon, and the second fused the words either side of a
  removed tag.
- The chain's lexical stage stripped em-dashes and cliches but never checked the banned
  lexicon, so a phrase that survived generation shipped. Now `services/slopDetector.ts`
  DETECTS and routes to repair rather than deleting: removing "utilize" from "firms
  utilize a comprehensive approach" leaves broken grammar, which is worse than the slop.
  Verbatim quote fields stay exempt.

Two of my own mistakes are recorded in that module's header because they are instructive:
the detector first reached across an import cycle with `require()`, which is undefined in
this ESM build, so it threw, the catch fell back to titles only, and it reported zero
sites on a deck with two. A silent fallback inside a gate is the exact failure this pass
existed to remove.

**E1.4 (the flake).** Reproduced under deliberate CPU contention: `userImagery.test.ts`
failing at 5015ms. Not a clock dependence at all, which was my hypothesis; a large module
pulled in with `await import()` INSIDE the test body blew the default 5s per-test
timeout. Hoisted those imports (the file went from a timeout to 1.07s), raised
`testTimeout` to 20000 for the seven other files with the same shape, and added
`npm run test:contended`. Verified: **1,090 passing with 2 workers under 8 busy cores**,
the exact conditions that produced the failure.

**E2.1 (the grounding gate).** `services/groundingCheck.ts`, wired into stage 10. Walks
the deck in order and flags a slide arguing from a concept no earlier slide introduced,
which mechanizes the Partner Test. Three precision passes were needed, and each is worth
recording: generic composites like "research phase" slipped through until a phrase had to
carry a word that is both long AND not common; overlapping n-grams reported one problem
twice under two names; and verb phrases like "enrichment shortens" read as concepts until
a determiner test was added, on the logic that a concept the reader must be taught gets
referred to with "the" or "a". 14 tests, most of them refusals to fire.

## P1

**E1.2 (inline citation chip).** `splitProseWithPointers` keeps position where
`extractPointers` throws it away, and `components/CiteChip.tsx` renders prose with chips
in place. Card summaries stopped being stripped. LIVE on bundle `index-ByRN6ewe.js`:
**80 chips, 0 raw pointers**, each chip titled with its source, and clicking one opened
"Best Executive Search Software for 2026" at `ARTICLES/EXS-CLOCKWORK/8AD772998F.MD`.

**E2.2 (forced thesis choice).** `services/thesisOptions.ts` plus a DECK MODE contract, an
AIR record, and a chooser in the panel. The rejected candidates are recorded, which is
preference data SkillOpt has never had: it infers preference from edits after the fact.
The validator rejects three restatements of one idea, because a menu with no real choice
on it is worse than no menu. 15 tests.

**E2.3 (context budget and invocation class).** `check-skills` now enforces a 300-char
description budget, a negation-heavy check, and an `invocation` class. 16 runtime-only
skills marked `disable-model-invocation: true`, which reclaims about 1,159 tokens of
per-turn context; HiC's own loader reads `hic-workspace/skill-manifest.json` by path, so
generation is untouched. The SkillOpt rubric gained check 9 (no-op) and check 10
(negation, HARD).

**E2.4 (`ask-hic` router).** Eight named flows across the model-reachable library, plus a
`router.unrouted-skill` / `router.stale-entry` CI rule so it cannot lie. Building that
rule exposed two of its own bugs: a flat-layout assumption reported seven nested skills as
stale, and a Windows path split returned full paths instead of basenames.

**E3.1 (render service + MCP wrapper).** `internal-solutions-video-renderer` (port 5015)
and `mcp-services/video-render-mcp` (8508), registered in compose and in the agent's
`tool_services`. Verified live end to end: health, the content gate refusing an em-dash
and a banned phrase and passing clean copy, a real render (h264 1920x1080, 90 frames,
3.000s) served over `/outputs`, and the MCP wrapper reporting its downstream healthy and
exposing three tools. The gate runs BEFORE the queue because a refusal should cost
nothing and a pixel has no repair path. 13 tests.

## P2

**E2.5 (`#questionnaire`).** `questionnaire-author` skill plus all four registration
points. The artifact for a decision the corpus cannot settle: ask the person who holds
the answer, instead of writing that evidence is limited, which the house rules forbid.

**E2.6.** The `diagnosing-bugs` phase gate (no red-capable command, no Phase 2; three to
five ranked hypotheses before testing any; tagged instrumentation) into
`service-log-triage`. And `design-desk/out-of-scope/` with three seeded rejections, each
carrying the line that matters most: what would change the answer.

**E3.2 (recap from AIR).** `services/recapComposition.ts` builds a beat sequence from
what the run recorded, refuses to compose one carrying a banned phrase, and omits a beat
the run never recorded rather than inventing it. Verified end to end through the live
service: 660 frames, 22.000s, four beats, pointers stripped, brand tokens applied.

## Still open, honestly

- The 300-char description budget is a WARNING on 52 existing skills. Turning it red
  would get the gate bypassed; those descriptions want rewriting one at a time by someone
  reading each skill, which is a separate pass.
- `check:skills` reports 73 warnings. Every one is now a measured, named thing rather
  than an unknown, which was the point.
- E2.2's chooser recomposes by prefilling a follow-up directive. A true in-place
  regeneration would be better and is a panel change, not a service change.

---

# COMPLETION MAP, 2026-08-24

Every item in this plan and in `plans/promo-claims-verification-2026-08-21.md`, mapped to
the artifact that closes it. Branch `hic-elevation-2026-08-21`. Gates at close: typecheck
clean, 1,212 tests over 112 files, `check:skills` / `check:content` / `check:templates`
green, twenty consecutive suite runs under deliberate CPU contention with zero failures.

## promo-claims-verification-2026-08-21.md

| Claim | Verdict at close | Where it was proven |
|---|---|---|
| C1 pointers bound, unbound reported | PASS | live AIR `binding: {bound, unbound, byStrategy}`; shipped payload carries the pointers |
| C2 the passage is openable | PASS after the fix this plan's E0.1 and E1.2 cover | live bundle: 80 inline chips, 0 raw pointers, click opened `ARTICLES/EXS-CLOCKWORK/8AD772998F.MD` |
| C3 ten stages, fixed order, pinned | PASS | `STAGE_ORDER` + `contracts/artifact_chain.v1.schema.json` + `gatesBite.test.ts` order case; live AIR records 10 |
| C4 repair narrows, never sources | PASS | live AIR `repair: {rounds: 1, fieldsEdited: 5, violationsBefore: 5, violationsAfter: 0}` |
| C5 prose measured, fields named | PASS | live `[prose-signal]` output plus the named fields in the evidence log |
| C6 layout gate flags repeats; 15 exhibits | PASS | live `sequence_repeat` finding; `EXHIBIT_CATALOG` has 15 entries with floor, maximum and downgrade |
| C7 figures from SQL with query and hash | PASS | live probe of `/api/tabular/aggregate`: `engine: sqlite3`, correct group sums, SQL and `content_sha256_16` returned |
| C8 honest record | PASS | live AIR `enrichment` block; `planAbsent` and `plannedSubQuestions` now travel in `evidence` |
| C9 anti-slop holds on shipped artifacts | PASS | `check:content` 0 errors, plus `ciGatesBite.test.ts` proving it REJECTS a violation |
| C10 suite green | PASS, caveat closed | 1,212 tests; the flake is diagnosed and 20 contended runs pass |
| N2 gate measured against an undeclared plan | CLOSED | E1.1 below |
| N3 card prose stripped its pointers | CLOSED | E1.2 below |

## hic-elevation-credibility-craft-and-video-2026-08-21.md

**E1.1 seed the evidence-slot plan.** `services/objectivePlan.ts` (one reader),
`planAbsent` + `plannedSubQuestions` on `SlotReport`, both AIR writers switched off their
hardcoded empty list, `CoverageStatus` gained `unmeasured`, and the flag threaded into the
AIR record. The live run then exposed a deeper cause the plan had not anticipated: the
research plan existed only in a browser global set during collection, so a RESTORED
session could never measure against its own objective. The snapshot now persists
`research_plan_sub_questions` and `restoreSessionSnapshot` rehydrates it.
LIVE PROOF: `decomposedQuestions: 3`, `evidence: {p0Coverage: 0.5, planAbsent: false,
plannedSubQuestions: 3}`. Coverage of 50 percent against a declared objective is the
number the item existed to produce; the old record said 1 and meant nothing. 18 tests.

**E1.2 inline citation chip.** `splitProseWithPointers` + `components/CiteChip.tsx`.
LIVE PROOF: 80 chips, 0 raw pointers, click opened the cited article at its path.

**E1.3 prove every gate bites.** `gatesBite.test.ts` (29 cases, ten stages) and
`ciGatesBite.test.ts` (11 cases, both scanning CI gates, roots made overridable so a
fixture can be rejected). Found and fixed two real holes: no runtime stripper for
`oaicite` and family, and no banned-lexicon check in the chain's lexical stage.
LIVE PROOF of the second: `[lexical] "best practices" in ...rows[1].prove` fired three
times on a real deck and routed to repair.

**E1.4 kill the flake.** Reproduced under contention as `userImagery.test.ts` failing at
5015ms; cause was a heavy `await import()` inside a test body, not a clock dependence.
Imports hoisted, `testTimeout` raised for the seven files with the same shape,
`npm run test:contended` added. PROOF: 20 of 20 contended runs clean.

**E2.1 the grounding gate.** `services/groundingCheck.ts` wired into stage 10, with the
repair instruction separated from the layout block so an ungrounded concept is not
described as a layout defect.
LIVE PROOF: `ungrounded_concept: slide 2 argues from "finalist stages" before any earlier
slide introduces it`.

**E2.2 candidate theses.** `services/thesisOptions.ts`, the DECK MODE contract, the AIR
record, the panel chooser, and a dedicated fallback call after the embedded contract was
ignored live. STILL NOT PROVEN END TO END, honestly: see the open item below.

**E2.3 context budget and invocation class.** `check-skills` enforces a 300-char budget,
a negation-heavy check and an invocation class, and reports the distribution: 53 model,
32 runtime, 6 human across 91 packages, where previously all 91 paid per-turn context.
The gate caught two of my own misclassifications while I was applying them. SkillOpt
rubric gained check 9 (no-op) and check 10 (negation, HARD).

**E2.4 `ask-hic` router.** Eight flows over the model-reachable library, with
`router.unrouted-skill` and `router.stale-entry` in CI. 0 unrouted, 0 stale.

**E2.5 `#questionnaire`.** `questionnaire-author` skill plus all four registration points.

**E2.6.** The `diagnosing-bugs` phase gate into `service-log-triage`, and
`design-desk/out-of-scope/` with three seeded rejections.

**E3.1 render service and MCP wrapper.** `internal-solutions-video-renderer` (5015) and
`mcp-services/video-render-mcp` (8508), in compose and in the agent's `tool_services`.
Verified live: health, the content gate refusing an em-dash and a banned phrase and
passing clean copy, a real render (h264 1920x1080, 90 frames, 3.000s) served over
`/outputs`, and the wrapper reporting its downstream healthy with three tools. Fresh-clone
breaks fixed (tracked `fonts/README.md` and `renders/.gitkeep`, plus a `.gitignore`) and
the image rebuilt from tracked files only to prove it.

**E3.2 recap from AIR.** `services/recapComposition.ts`, verified through the live service
at 660 frames, 22.000s, four beats, pointers stripped.

## E2.2 CLOSED, 2026-08-24

Proven live on bundle `index-DPyX4KSS.js`, artifact `slides_1787580978928`:

```
"chosen":  "AI already reshapes four parts of the retained search research phase"
"rejected": [
  "The true risk of AI adoption in retained search research is data leakage rather
   than execution speed."
     implies: secure, ring-fenced data environments over general-purpose tools
  "The primary barrier to scaling search firm margins is manual workflow integration
   rather than candidate matching quality."
     implies: connect existing calendars and project spaces before buying AI agents
]
"valid": true, "problems": []
```

The panel renders it: header, the CHOSEN marker on the deck's own thesis, and two working
"argue this instead" buttons. Same run also recorded
`evidence: {p0Coverage: 1, planAbsent: false, plannedSubQuestions: 2}`, so E1.1 is
confirmed a second time.

**Three separate causes had to be found, and only the first was the one I guessed.**

1. The contract embedded in DECK MODE was ignored, twice. That is the pointer-instruction
   failure repeating: one paragraph inside a very large prompt loses. Fixed by giving the
   alternatives their own call, where they are the only ask, and reading the CHOSEN thesis
   off the deck rather than generating it, which makes that entry true by construction.
2. The dedicated call then returned nothing, and my `catch` swallowed the reason. Probing
   the identical request against the live proxy directly returned two good alternatives in
   about two seconds, which proved the function was correct and the environment was not.
   The call fires immediately after a full deck generation, the busiest the proxy ever is,
   and a 25 second budget was too thin. Now 60 seconds with three attempts, and every
   failure path logs why.
3. The run that was meant to confirm it never reached the code at all: the clarification
   gate had intercepted the turn as underspecified and was waiting for input. That is
   DF-F working correctly, and it cost two runs before I read the console carefully enough
   to notice the turn had ended in a question rather than a deck.

The lesson worth keeping is the second one. A silent catch inside a feature makes the
feature undiagnosable, and I wrote one two days after criticizing exactly that in the slop
detector. The fix that mattered was not the timeout, it was making the failure speak.

## Previously open, now closed

**E2.2 does not work end to end.** Its Done-when asks for a live deck showing three theses
with the rejected pair in AIR. Two live runs recorded
`no thesis-options block was emitted`: the model ignored the contract embedded in DECK
MODE, which is the same failure the pointer instruction hit, and the dedicated fallback
call then returned nothing usable. The parser, the validator, the AIR record and the panel
chooser are all built and tested (21 tests), and the record honestly captures the
non-compliance rather than hiding it. What is missing is a working generation path.

The fallback now logs WHY it produced nothing, which the first version swallowed. That was
the same silent-catch mistake this program criticized in the slop detector, made by me,
two days apart.

The precedent says what to do next and it is recorded in memory: three measured prompt
attempts at zero means stop writing prompts and compute the thing deterministically. A
thesis is a judgment, so it cannot be computed, which leaves the dedicated call as the
right shape. The next step is to read its logged failure reason and fix that specific
cause rather than write a fourth prompt.
