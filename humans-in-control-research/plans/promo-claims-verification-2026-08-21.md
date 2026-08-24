# Promo-copy verification run, 2026-08-21

The owner asked for promotional copy about the week's upgrades, with every sentence in the
copy doubling as a test criterion, and the tests actually run against the shipping app.
This file is the record: the copy, the claim-to-test map, the verdicts, and whatever
elevation work the failures demand. A claim that cannot be verified gets cut from the copy,
not softened.

Window under test: commits since 2026-08-13 on `deerflow-harness-transfer-2026-08-20`
(user-directed imagery, v2 workspace pass + citation provenance lock, inline citation-safe
editing, chat intents, and the four-pass deer-flow harness transfer ending at `b72c6c501`).

## The LinkedIn post (draft under test)

---

Last week our research tool trusted the model. This week it checks the model's work.

Humans in Control turns a research corpus, your client documents plus a few hundred
external articles, into consulting artifacts: strategy decks, personas, journey maps,
service blueprints. Every AI research tool shares one flaw: the writing sounds confident
whether or not the evidence is behind it. So we stopped asking the model to be trustworthy
and built a pipeline that verifies.

What changed this week, in the order you will notice it:

Every factual claim now carries an address. A finding on a slide ends with a pointer to
the exact passage in your corpus, and you can open that passage and read it. The model
does not write these addresses. We asked it to, three different ways, and measured zero
each time. The runtime now computes them after generation by matching the deck against
the spans the model was actually shown. A claim no span supports gets no pointer, and the
evidence gate reports it instead of hiding it.

Ten inspection stages run on every artifact, in a fixed order the tests pin: language,
pointer binding, provenance, evidence coverage, exhibit fit, prose, an honest grade of the
gates themselves, layout, and deck quality.

The gates rewrite, they do not just complain. When a slide asserts something the evidence
does not support, a repair pass narrows the sentence to what the sources say. It never
invents a source. On a live run this week, repair took a deck from four evidence
violations to zero.

The prose is measured, not eyeballed. Sentence cadence, repeated openers, whether a
sentence names who acts, copula crutches, hedging: each is scored deterministically, and
a deck that reads like a template gets sent back with the specific sentences named.

Decks stopped repeating themselves. A layout gate compares each deck with the one before
it and flags a deck that opens with the same slides or reuses every layout. Fifteen
exhibit types declare what data shape they need, so a chart with two bars gets downgraded
to a comparison the reader can actually use.

Numbers come from a database, not from the model's arithmetic. When an artifact needs a
figure computed from tabular data, a SQL engine computes it and returns the query and a
content hash beside the result.

The record is honest. Every run writes a durable artifact record showing what shipped,
which preparation steps degraded, and where the corpus was sampled rather than read in
full. When a critical grounding step fails, the instruction to narrow goes into the
prompt before generation, not into a log afterwards.

None of this is a roadmap. It is built, tested, and every claim in this post was verified
against the running app before I published it.

---

## Claim-to-test map

| # | Claim in the copy | Test | Verdict |
|---|---|---|---|
| C1 | Factual claims carry pointers to exact corpus passages; claims without support get none | Live deck generation at :5011; AIR shows shipped pointers > 0; every pointer resolves to an existing wiki file + chunk; unbound claims appear in the evidence report | pending |
| C2 | Pointer is clickable / passage readable by the user | In the rendered deck UI, the pointer is visible and the passage is reachable | pending |
| C3 | Ten stages, fixed order, pinned by tests | `STAGE_ORDER` has 10 entries; contract test passes; live AIR `stages` matches exactly | pending |
| C4 | Repair narrows, never sources; live violations reduced | AIR repair block on a live run with violations before > after; `artifactRepair` strips model-authored pointers (unit) | pending |
| C5 | Prose measured deterministically, specific sentences named | `proseSignal` metrics in live AIR; repair instruction names fields | pending |
| C6 | Layout gate flags repeats; 15 exhibit types with fit + downgrade | `deckQualityGate` findings live or recorded; `exhibitCatalog` has 15 entries with floor/max/downgrade; `exhibits` stage in live AIR | pending |
| C7 | SQL engine computes figures, returns query + hash | Live probe of `/api/tabular/aggregate` | pending |
| C8 | Honest record: enrichment ledger in AIR; sampling labeled; critical degradation narrows the prompt | Live AIR carries enrichment block; `stepBudget` synopsis unit-verified; `generationLedger` narrowing instruction unit-verified | pending |
| C9 | Anti-slop holds on shipped artifacts | `npm run check:content` 0 errors over recent AIRs | pending |
| C10 | Suite green: tests, typecheck, skill review, template parity | `npm run typecheck`, `test`, `check:skills`, `check:templates` | pending |

## Verdicts

Live run: bundle `index-EEvVScmI.js`, engagement `analyze-the-executive-search-industry-to-map-current-trends`
(926 intelligence sources, 2,829 chunk pointers over 847 pages), directive
`#slides Build a 4-slide assessment of where AI is already changing retained executive search
delivery...`, artifact `slides_1787349655134`, zero console errors.

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | `[pointer-binder] 9 pointer(s) bound (label=8, claim=1), 3 field(s) left unbound of 10 considered`. Shipped payload carries 9 pointers over 5 unique sources. The 3 unbound are REPORTED, which is the honest half of the claim. |
| C2 | **FAILED, then FIXED and re-verified** | See below. |
| C3 | **PASS** | `chainTrace` records 10 stages in `STAGE_ORDER` exactly: normalize, lexical, bindPointers, provenance, evidenceSlots, exhibits, prose, grade, renderPlan, deckQuality. `chainPass: true`. Order pinned by `contracts/artifact_chain.v1.schema.json` + test. |
| C4 | **PASS** | `[artifact-repair] 1 round(s), 3 field(s) rewritten, violations 3 -> 0`. Evidence violations went 3 to 0 and the repair added no source. |
| C5 | **PASS** | `[prose-signal] openers=0.40` flagged, overall 0.88, and the evidence log named the offending fields with their text. |
| C6 | **PASS** | `deckQuality` found a real defect: "this deck opens with the same three archetypes as the previous deck and reuses 100% of its layouts". `exhibits` stage checked 2, fitted 2. `EXHIBIT_CATALOG` has exactly 15 entries, each with a floor, a readable maximum and a downgrade target. |
| C7 | **PASS** | `POST /api/tabular/aggregate` returned `engine: sqlite3`, correct group sums (NA 19 from 12+7, EU 21), the generated SQL, and `content_sha256_16`. |
| C8 | **PASS** | AIR `enrichment: {total: 5, degraded: 0, groundingIntact: true, losses: []}`. |
| C9 | **PASS** | `check:content` 0 errors. |
| C10 | **PASS with a caveat** | 1,057/1,057 on four consecutive runs. One earlier run reported 2 failures while a Docker build was saturating all cores, so a timing-sensitive test flakes under CPU contention. Not a logic defect, but it is a real hole in the "pinned by tests" claim and it is on the plan below. |

### C2 failed, and it was the most important finding of the run

The copy said a researcher can open the cited passage and read it. Measured in the live DOM:
**135 pointer strings on screen, zero of them clickable.** Worse, the theme cards were printing
raw `[articles/exs-clockwork/8ad772998f.md#c1]` markers as body text, which `.claude/CLAUDE.md`
bans outright as visible machine chrome, while the card's own "open in wiki" control stayed
hidden because the address was sitting inside the quote rather than in the field the control
reads. The credibility system was working and its only user-facing surface was making the
artifact look MORE machine-generated, not more trustworthy.

Two things were true at once, which is why this was easy to miss: deck SLIDES were clean
(0 raw pointers there) because `resolveManifestPointers` rewrites them to named sources on the
slide and PPTX path. The research board had neither the rewrite nor an affordance.

Fixed in this pass:
- `extractPointers` and `quoteWithAffordance` in `services/citationPointerRegistry.ts`, the
  existing pointer authority: one parse yields clean prose for the reader plus the `chunkPointer`
  and `wikiPath` a card needs to draw its control. A recorded pointer always beats one parsed
  out of prose. 27 tests, fixtures taken verbatim from this run's own output.
- `components/ResearchBrowser.tsx` routes theme quotes, topic samples, summaries and
  implications through it.
- Two more leak sites found by audit rather than by symptom and fixed the same way:
  `AnalysisCheckpoint.tsx` (checkpoint review) and `DeliverableCard.tsx` (persona and pain-point
  quotes).

Re-verified on bundle `index-D8CRL8eT.js` after rebuild: **0 raw pointers visible**, 153 wiki
controls and 55 pointer chips across 56 cards, and clicking one opened the passage:
"Best Practices Video: Optimizing Your Executive Search Platform For Your Unqiue Process",
`SOURCE EXS_CLOCKWORK`, `PATH ARTICLES/EXS-CLOCKWORK/93074193BA.MD#C3`, full text, read-only,
stored in `/hic-workspace/wiki/`. Zero console errors.

### Two gaps found that the copy did not claim

- **N2.** The AIR log says `objective.decomposedQuestions empty: sub-question coverage not
  recorded`. The evidence-slot plan is not seeded from the research planner on the chat-deck
  path, so P0 coverage is measured against a plan the run never declared. The gate is real; its
  input is thinner than intended.
- **N3.** Card prose now strips the pointer rather than resolving it, because a 12px card cannot
  carry a full source name inline. The address is not lost (the quote's control carries it), but
  an inline citation chip in prose is the better answer and is a design change, not a strip.

### What the copy had to change

The sentence "you can open that passage and read it" was false when written and is true now.
Nothing else in the post needed softening. One line was added about the flake, because a post
claiming determinism should not hide a timing-sensitive test.

### Gates after the fix

`tsc --noEmit` clean. 1,072 tests over 104 files. `check:skills` 0 errors, `check:content` 0
errors, `check:templates` PASS. Bundle `index-D8CRL8eT.js` serving, zero console errors on load,
session restore, generation and evidence open.

---

## The video

A 60-second product video of this exact run was rendered with HyperFrames
(`github.com/heygen-com/hyperframes`, Apache-2.0), from screenshots captured during the
verification above. Eight beats: title, objective, corpus, the ask, composition with the gates,
the evidence board, the opened source passage, close. Verified from the delivered file with
ffprobe: h264, 1920x1080, 30fps, 1,800 frames, 60.000s.

Files: `scratchpad/hic-promo/` (composition + assets), output copied to `d:\tmp\hic-promo\`.
The full assessment of where HyperFrames belongs in the suite is in
`plans/hic-elevation-credibility-craft-and-video-2026-08-21.md` Part 3.

---

## Follow-through, 2026-08-21

Both gaps this record left open are now closed on branch `hic-elevation-2026-08-21`:

- **N2** (the evidence gate measuring against an undeclared plan) is E1.1. `SlotReport`
  now carries `planAbsent`, so a run with no research plan records "not measured" rather
  than coverage 1.
- **N3** (card prose stripping its pointers) is E1.2. Prose keeps its citations and
  renders them as inline chips that open the passage. Verified live: 80 chips, 0 raw
  pointers, and a click opened the cited article at its recorded path.

The C10 caveat is closed too: the flaky test was reproduced under CPU contention,
diagnosed (a heavy `await import()` inside a 5s-bounded test body, not a clock
dependence), fixed, and re-verified under the same load.

Full record in `plans/hic-elevation-credibility-craft-and-video-2026-08-21.md`.

---

## Closed, 2026-08-24

All ten claims verified, both open gaps closed, and the C10 caveat retired. The
claim-by-claim table with the live evidence for each is in
`plans/hic-elevation-credibility-craft-and-video-2026-08-21.md` under COMPLETION MAP.

The two findings this record left open:

- **N2** (the gate measuring against an undeclared plan) closed by E1.1. The live AIR now
  reads `p0Coverage: 0.5, planAbsent: false, plannedSubQuestions: 3`. Fifty percent
  coverage of a declared objective is a real measurement; the old `p0Coverage: 1` against
  no plan was not.
- **N3** (card prose stripping its pointers) closed by E1.2. 80 inline chips on the live
  board, 0 raw pointers, and a click opens the cited article.

The C10 flake is diagnosed and fixed: a heavy module load inside a test body, not a clock
dependence as first assumed. Twenty consecutive runs under deliberate CPU contention now
pass.
