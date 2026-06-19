# Anti-Slop Deck Remediation — 2026-06-15

Triggered by `deck_2026-06-15_15_slides.pptx` exhibiting AI slop. Root-caused by
tracing rendered PPTX -> Opus output (chat transcript) -> console log -> code.
Approved scope: full P1-P6 build, upstream-first enforcement (code scrub as
safety net), checkpoint after each phase. Nothing commits without approval.

## Key finding

Opus 4.8 produced mostly-clean output. HiC's own post-generation code then
damaged it (backfill overwrote good quotes), a silent ingestion failure starved
the corpus, and the field guide's later stages were never wired into the
chat->slide path. The field guide (`anti-slop-field-guide.md`) is the correct
spec; it is under-implemented on this path.

## Root causes (ranked)

- **RC1 (highest)** `services/quoteExtractor.ts backfillSlidesFromWiki`
  (called `components/CorpusChatPanel.tsx:7033`) replaced 3 correct on-topic
  Opus quotes with cross-engagement Reddit noise. Trigger bug: the skip
  condition (`quoteExtractor.ts:597-599`) only treats a theme as healthy if it
  has a non-title `quotes[]` array; Opus emits its verbatim quote in the
  `evidence` *string* with no `quotes[]`, so all 20 themes were flagged
  (`20/20 flagged, 3 upgraded, 17 no-match`). The >=2 content-token overlap
  (`MIN_ANCHOR_OVERLAP=2`, line 610) against the WHOLE wiki archive let 3 wrong
  sentences win and overwrite (`t.evidence = pulled[0].text`, line 677).
- **RC2** Two uploaded PDFs (`intelligence_augmentation.pdf`,
  `humans_in_control.pdf`) produced empty `parsedText` and were silently
  skipped (`wikiService.ts:832`). Retrieval ran on 16 chunks / 1 page / 4
  selected (~1833 tok). Silent-fallback violation; also what made RC1 reach
  outside the engagement.
- **RC3** Lexical + structural slop not enforced on the chat->slide path. Opus
  emitted "value proposition" (in banlist at `slidePostProcessor.ts:872` but the
  chat path at `corpusChatService.ts:3536` runs only a subset, not the
  SLOP_PHRASES scrub), "best of breed", pervasive negative parallelism (R23),
  colon+rule-of-three titles (R24, R43-47). Field-guide Stages 2 (structural)
  and 3 (title craft) are unimplemented.
- **RC4** Renderer twin bugs in `services/slideToStageHtml.ts`: label glued to
  value (`ImplicationEvery...`, `Pattern signalThree...`); mid-word truncation
  of complete Opus fields (slide 15 actionTitle, slide 14 overallPainPoint).
- **RC5** ASR errors in verbatim quotes: "Claude"->"clawed", "yada yada yada".
- **RC6** Opus 4.8 502'd mid-run (`SSL SSLV3_ALERT_BAD_RECORD_MAC`), retried.

## Plan

- **P1** Fix backfill trigger (healthy `evidence` string = skip), make
  non-destructive, scope to engagement, raise overlap bar. Regression test from
  the 3 corrupted themes. `services/quoteExtractor.ts`.
- **P2** Diagnose empty-parsedText PDF path; surface a visible chat notice on
  zero-text uploads.
- **P3** Wire field-guide Stages 1-3 into the slide path (full lexical scrub +
  structural + title-craft), upstream-first via SLIDE OUTPUT PROTOCOL +
  `human-voice-editor`, drift-guarded single lexicon; scrub as safety net.
- **P4** Fix label-glue + truncation in `slideToStageHtml.ts` (+ `web.tsx`
  twin); move source attributions to slide-level `sources[]`.
- **P5** Conservative ASR curation in `quoteExtractor.ts` (clawed->Claude;
  drop yada-filler spans).
- **P6** Surface Opus 502/SSL degradation events.

## Status (2026-06-15) - all code landed, NOT yet live-verified

- **P1** done. `quoteExtractor.ts` trigger fix (real `evidence` string = healthy)
  + overlap bar 2->3; test `quoteExtractor.backfill.test.ts` (2).
- **P2** done. `CorpusChatPanel.tsx` posts an in-chat notice when an upload yields
  empty parsedText (was a silent console.warn). Deeper OCR-fallback parse fix
  deferred (not in scope).
- **P3** done. Upstream SLIDE OUTPUT PROTOCOL anti-slop title+quote block
  (corpusChatService.ts ~1478, fixed the stale naked-number title example);
  field-level `scrubSlideFields` (slidePostProcessor.ts) wired post-parse in
  CorpusChatPanel - replaces Tier-1 lexical, detects structural, never touches
  verbatim quotes; lexicon: comma-antithesis regex + "best of breed"; "value
  proposition" DEMOTED to Tier-2/detect-only per user. Tests (4) + drift guard.
- **P4** done. `slideToStageHtml.ts` label separator (7 sites) + `stripInlineSource`
  on journey list items + actionTitle budget 110->120; web.tsx twin synced; tests (3).
- **P5** done. `correctTranscriptArtifacts` (clawed->Claude, drop yada) in the
  theme path + upstream protocol rule; tests (4).
- **P6** done. junk-guard salvage now surfaces the gemini-3.5-flash model swap
  for plain chat (artifact turns already covered by the RI fence notice).

Gates: `tsc --noEmit` 0, `vitest` 112/112, `check:templates` PASS, drift-guard OK.
NOT yet done: Docker rebuild of research-generator + Playwright live re-export +
PPTX text diff vs the 2026-06-15 baseline. Build/tests are NOT live verification.
Nothing committed.

## P7 + P8 (added during live verification, 2026-06-15)

- **P7 (wikiCompanions crash) - DONE + LIVE-VERIFIED.** `loadSkillContext`
  (corpusChatService ~2443/2450) iterated `skill.wikiCompanions`/`benchmarks`
  unguarded; the `human-voice-editor` manifest entry lacked both, so it threw
  "wikiCompanions is not iterable" on every artifact turn, aborting BEFORE the
  Opus force-route -> #slides ran on gemini-3.5-flash. Fix: `|| []` guards + the
  manifest entry given `skillReferences/wikiCompanions/benchmarks: []` + a 3rd
  assertion in matchSkills.triggers.test. VERIFIED live: proxy `Anthropic proxy:
  model=claude-opus-4-8`, console `[chat][route] ... -> claude-opus-4-8`, 0 errors.

- **P8 (no-truncation + 1:1 preview).**
  - **P8d/Option A - DONE + LIVE-VERIFIED.** `SlideCanvas` preview now renders the
    EXACT export stage HTML (`slideToStageHtml`) in a style-isolated iframe scaled
    0.5x; the goldPreviews React path is fallback-only. Preview == export by
    construction (kills the clamp + all preview/export drift). PNG/PDF rasterize
    the same stage HTML via an off-screen iframe. Export pipeline UNCHANGED ->
    PPTX stays native + editable. Verified: theme-spotlight slide renders complete
    in preview AND export (diffed: "pick the right deployment...", "...their
    infrastructure", "de-risks enterprise procurement", "protections they want").
  - **P8a - DONE.** `services/slideFieldBudgets.json` (single source, mirrors
    web-layouts.md) + `findOverBudgetFields()`.
  - **P8b - DONE.** corpusChatService: after the deck is emitted, over-budget
    fields trigger ONE bounded summarize-to-budget re-ask (same model); fail-safe
    (keeps original unless re-ask parses to same slide count + strictly fewer
    over-budget). Runtime enforcement of the no-truncation contract.
  - **P8c - DONE.** `.claude/hooks/scripts/validate_no_truncation.py` (reads the
    same budget JSON) flags over-budget + trailing-ellipsis fields, exit 2 (block);
    wired into dispatch_validators UNIVERSAL_VALIDATORS. Dev-time/regression guard.

Gates after P7+P8: tsc 0, vitest 117/117 (1 flake on a live-service test, green on
re-run), drift-guard OK, hook tested both directions. Note: designer is
concurrently re-componentizing the Figma NXT/NU design systems + manifest; the
1:1 renderer reads tokens at runtime so it auto-reflects their work (no Figma/
manifest data files were touched by this work). Nothing committed.

## Verification (every phase)

`npm run typecheck` (0) + `npm run test` (relevant) -> rebuild
research-generator -> Playwright load :5011 -> drive `#slides #NXT` ->
re-export PPTX -> diff text vs baseline. Four-row pre-claim checklist. Build
success / HTTP 200 are NOT verification.
