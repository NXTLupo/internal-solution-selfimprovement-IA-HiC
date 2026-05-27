---
title: Orphan Code Audit
type: design-desk
generated_at: 2026-05-24T00:00:00Z
generated_by: orphan-code-auditor v1.0
scope:
  - humans-in-control-research/services/**/*.{ts,tsx}
  - humans-in-control-research/components/**/*.{ts,tsx}
  - humans-in-control-research/design-desk/**/*.{ts,tsx}
exclude:
  - node_modules/
  - dist/
  - build/
  - "*.d.ts"
  - "*.test.ts"
  - "*.spec.ts"
entry_points_exempt:
  - App.tsx
  - index.tsx
  - vite.config.ts
  - design-desk/__fixtures__/vitest.setup.ts (referenced by vitest.config.ts)
total_exports_scanned: 657
total_orphans_found: 47
high_severity_orphans: 11
---

# Orphan Code Report

## Summary

- Total exports scanned: ~657 (function | const | class | type | interface | reexport) across services/, components/, design-desk/
- WIRED: ~610 (93%)
- ORPHAN: 47 (7%)
  - HIGH severity: 11
  - MEDIUM severity: 18
  - LOW severity: 18

## Cross-reference verdict on the 2026-05-23 honest-audit claims

The 2026-05-23 audit (`plans/hic-honest-audit-and-remediation-2026-05-23.md`) named four headline orphans and claimed all but a few were re-wired in the same session. I verified each claim against the current code:

| 2026-05-23 claim | Re-audit verdict | Evidence |
|---|---|---|
| `deliverableChunkers.ts` 7 chunked generators wired into geminiService | VERIFIED for 6 of 7. `chunkedGenerateBlueprint` is still ORPHAN. | `geminiService.ts` imports `chunkedGeneratePRD` (line 2754), `chunkedGenerateRoadmap` (3041), `chunkedGenerateTechArchitecture` (3269), `chunkedGenerateGapAnalysis` (4071), `chunkedGenerateTechAudit` (4260), `chunkedGenerateCompetitive` (4449). No caller for `chunkedGenerateBlueprint` anywhere. |
| `services/reinforcementInference.ts` created and wired into 10 regen sites | VERIFIED. `shouldReinforce`, `buildReinforceFeedbackString`, `appendUncertaintyLedger` imported at `geminiService.ts:8` and used at 10 regen sites (2301, 2617, 3008, 3098, 3237, 4094, 4238, 4283, 4424, 4466). `buildAnchoredReAsk` and `computeUncertaintyScore` from the same file remain ORPHAN exports. |
| `verifyDeliverable` wired into the generation pipeline | VERIFIED. `App.tsx:2248` dynamically imports `verifyDeliverable` and calls it after every deliverable (`auditGeneratedOutput`). |
| `FeedbackReceipt` deleted from CorpusChatPanel import | VERIFIED. `CorpusChatPanel.tsx:31-36` shows the commented-out import with the 2026-05-23 rationale. The component file `components/FeedbackReceipt.tsx` itself is now an ORPHAN module (HIGH severity — 218 LOC, no consumer). |
| `compileWiki` auto-invoked at top of `loadGenerationContext()` | VERIFIED. `wikiService.ts:1546` imports and calls `compileWiki({ incremental: true })`. |
| `findKnowledgeGaps` exists | VERIFIED. Imported at `App.tsx:4550` and called in the post-theme pipeline. `runRemediationForGap` called from `KnowledgeGapsPanel.tsx:19`. |

The audit's remediation claims hold. The remaining honest pattern: the audit fixed the four headline orphans but left a long tail of dormant scaffolding (institution manifest, query fabric, methods registry, coverage scorer, wiki cache loader, narrator subset, etc.) that pre-date the audit and were never named in it.

## High-severity orphans (load-bearing surface, > 50 LOC, no callers)

### `chunkedGenerateBlueprint` in `services/deliverableChunkers.ts:580`

- LOC: ~74 (body) + ~6 (input interface)
- Export kind: function
- Plan-claim cross-reference: 2026-05-23 audit P0.1 claimed ALL 7 chunked generators were wired. They wired 6. Blueprint was missed.
- Suggested action: WIRE into `generateBlueprint` / `generateJourneyMap` in `geminiService.ts:2453` (where the JourneyMap generator runs single-shot and is named in `hic-chunking-and-output-quality-plan.md:3.8` as a chunking target) OR DELETE if the team decided Blueprint stays single-shot.

### `scoreCoverage` + `rollupCoverage` in `services/coverageScorer.ts:49, 305`

- LOC: ~257 (scoreCoverage body) + ~30 (rollupCoverage)
- Export kind: function + function
- File total: ~320 lines, ZERO importers. The entire `coverageScorer.ts` module is dead.
- Plan-claim cross-reference: not in any plan; appears to be scaffolding for the evidenceRecord / queryFabric architecture that never landed.
- Suggested action: INVESTIGATE — this is paired with `queryFabric.ts` and `methods/MethodExecutor.ts`. All three look like an unshipped V3 research-fabric refactor. Either ship them together or delete the trio.

### `planAndSelect` + `fabricToQueryMap` in `services/queryFabric.ts:79, 551`

- LOC: ~472 (planAndSelect — substantial logic) + ~12 (fabricToQueryMap)
- Export kind: async function + function
- Plan-claim cross-reference: not named in plans. Companion to `coverageScorer.ts`.
- Suggested action: INVESTIGATE — same unshipped V3 architecture cluster. DELETE if abandoned.

### `getMethodById` + `RESEARCH_METHODS` in `services/methods/MethodExecutor.ts:78, 193`

- LOC: ~115 (RESEARCH_METHODS array) + ~3 (getMethodById)
- Export kind: const + function
- The entire `methods/MethodExecutor.ts` is dead — the `MethodExecutor` interface is referenced in wiki docs (`wiki/methodologies/research-fabric.md`) as if it were live, but no TS file imports it.
- Suggested action: INVESTIGATE — same cluster as coverageScorer + queryFabric. The wiki page is currently telling a lie. Either wire it into `researchFabricOrchestrator.ts` or DELETE both the file and the wiki page section.

### `FeedbackReceipt` (default + named) in `components/FeedbackReceipt.tsx:40, 218`

- LOC: ~178 (component body)
- Export kind: const + default
- Plan-claim cross-reference: 2026-05-23 P2.5 — the audit said "delete unused import OR actually render it." They deleted the import. The component file itself was NOT deleted.
- Suggested action: DELETE the file. Per the audit rationale, `FeedbackWidget` now renders the inline evidence panel that supersedes the standalone receipt.

### `aiRetryClient` convenience helpers in `services/aiRetryClient.ts:176, 181, 187, 192`

- Symbols: `callGemini`, `callOpenAI`, `callAnthropic`, `callGeminiCompat`
- LOC: ~5 each (thin wrappers over `callAIWithRetry`)
- Export kind: 4x async function
- Only `callAIWithRetry` (the underlying function) is imported anywhere. The four named provider helpers are zero-caller.
- Suggested action: DELETE — they are syntactic sugar nobody uses. The four call sites all call `callAIWithRetry('gemini', ...)` directly.

### `narrateConfidenceAssessment`, `narrateIngest`, `narrateDesignSystemEnforcement`, `narrateDesignSystemLearning` in `services/wikiNarrator.ts:154, 262, 331, 369`

- LOC: ~31 + ~38 + ~37 + ~13 = ~119 total
- Export kind: 4x function
- 6 of the 10 narrators in `wikiNarrator.ts` ARE wired (`narratePreGeneration`, `narratePostGeneration`, `narrateSlopDetection`, `narrateQualityAssessment`, `narrateKnowledgeCompounding`, `narrateLensDetection`). These 4 are not.
- Plan-claim cross-reference: none. Was likely written speculatively as the narrator pattern scaled.
- Suggested action: DELETE the 4 unused narrators, or wire them into the Reasoning Stream at the appropriate trigger points (ingest completion, design-system policy hits).

### `wikiCacheLoader` engagement-bundle layer in `services/wikiCacheLoader.ts:148, 179, 190, 248, 296, 394`

- Symbols: `loadEngagementBundle`, `loadEngagementBundles`, `loadSourceArchiveBody`, `resolveEngagementSourceArchive`, `loadSynthesisClustersAsCorpus`, `assembleCachedCorpus`
- LOC: ~31 + ~11 + ~58 + ~48 + ~69 + ~77 = ~294 total
- Export kind: 6x async function
- Only `loadCachedRedditPostsFromWiki` (also in this file) is wired (`App.tsx:3814`). The 6 engagement-bundle / synthesis-cluster / cached-corpus helpers above are zero-caller.
- Suggested action: INVESTIGATE — this is the most substantial single block of dead service code in the audit (~294 LOC). Likely written for a "resume from cached engagement" flow that got reimplemented elsewhere. Cross-check against `ResumeEngagementPanel.tsx` and `findPriorEngagementMatches` — if those subsume the use case, DELETE.

### `extractInstitutionsFromText` + `extractInstitutionsFromTextSync` in `services/institutionEntityExtractor.ts:65, 77`

- LOC: ~7 (async wrapper) + ~110 (sync body)
- Export kind: 2x function
- Both are called internally (within the same file) by `tierZeroUrlsForGoal`, `youtubeRssUrlsForGoal`, `unitIdsForGoal` — but no external module imports them. Of those three, only `tierZeroUrlsForGoal` is actually wired (App.tsx:3614). The other two (`youtubeRssUrlsForGoal`, `unitIdsForGoal`) are also orphan.
- Suggested action: DEMOTE the two extract functions from `export` to module-internal (since they have no cross-module consumer). DELETE `youtubeRssUrlsForGoal` and `unitIdsForGoal` if not part of an active plan.

### `loadInstitutionManifest` + `resolveInstitution` + `resolveInstitutions` + `expandWithPeers` + `collectTierZeroSources` in `services/institutionManifest.ts`

- LOC: ~61 + ~50 + ~22 + ~13 + ~17 = ~163
- Export kind: 5x function
- All five are called only WITHIN `institutionManifest.ts` or `institutionEntityExtractor.ts` (the closely-paired file). No other module imports any of them. The whole institution-manifest subsystem has one live entrypoint (`tierZeroUrlsForGoal`) and ~163 LOC of supporting code that nothing else touches.
- Plan-claim cross-reference: `institutionManifest.ts:14` says "S2 will wire `resolveInstitution()` into the brief parser" — that wiring never happened.
- Suggested action: INVESTIGATE — if you want the institution-aware brief parsing the comment promised, ship S2. Otherwise INTERNALIZE the supporting functions (drop `export`).

### `_isChunkLoadError` in `services/chunkLoadGuard.ts:242`

- LOC: ~10
- Export kind: function
- Underscore prefix says "internal" but it is exported. No external caller. `installChunkLoadGuard` is wired (`index.tsx:5`).
- Suggested action: DELETE the `export` keyword (turn into module-internal), or DELETE the function entirely if the guard never needs to introspect chunk-load errors externally.

## Medium-severity orphans (10-50 LOC, mostly under services/)

| Symbol | File:line | LOC | Suggested action |
|---|---|---|---|
| `summarizeBrief` | services/briefParser.ts:295 | ~32 | DELETE — no caller; `parseBrief` is the live entrypoint |
| `parseBrief` | services/briefParser.ts:61 | ~206 | INVESTIGATE — only `fallbackBrief` is exported and called; the whole async pipeline is orphan |
| `fallbackBrief` | services/briefParser.ts:267 | ~28 | INTERNALIZE (only called within briefParser.ts) |
| `getRecentCalls` | services/costMeter.ts:102 | ~3 | DELETE (cost meter exposes resetRun/getRunTotals/subscribeRunTotals — getRecentCalls has no consumer) |
| `formatUSD` | services/costMeter.ts:218 | ~9 | DELETE — no external caller |
| `formatModelName` | services/costMeter.ts:242 | ~7 | DELETE — no external caller |
| `MODEL_DISPLAY_NAMES` | services/costMeter.ts:227 | ~14 | DELETE — referenced only via `formatModelName` (also orphan) |
| `cleanDisfluencies` | services/transcriptQuoteCleaner.ts:97 | ~9 | INTERNALIZE — used only within file by `cleanTranscriptQuote` |
| `isTranscriptIntroNarration` | services/transcriptQuoteCleaner.ts:106 | ~16 | INTERNALIZE — same module-only usage |
| `getLensPersonaExtensions` | services/analyticalLensService.ts:339 | ~7 | INVESTIGATE — referenced in wiki docs but no TS caller; wiki page is stale |
| `getLensJourneyStages` | services/analyticalLensService.ts:346 | ~7 | INVESTIGATE — same as above |
| `getActiveStyle` | services/visualizationStyles.ts:144 | ~5 | DELETE — `getStyleById` is the live entrypoint |
| `VISUALIZATION_STYLES` (array) | services/visualizationStyles.ts:129 | ~2 | DELETE — file comment says "contains exactly one entry"; iteration never happens |
| `computeUncertaintyScore` | services/reinforcementInference.ts:34 | ~16 | INTERNALIZE — used only inside `shouldReinforce` |
| `buildAnchoredReAsk` | services/reinforcementInference.ts:71 | ~40 | INVESTIGATE — exported alongside the wired `buildReinforceFeedbackString`. Either redundant or the original API that was superseded |
| `validateCompleteness` exports | services/outputCompletenessValidator.ts | — | (WIRED — confirmed in chunkDispatcher, deliverableChunkers, slideDeckChunker) |
| `getDismissedConstraints`, `getLineageLog` | services/improvementDiscriminator.ts:281, 292 | ~10 ea | INVESTIGATE — only `discriminate`, `snapshotActiveConstraints`, `getLatestLineageFor` are externally consumed. The two log readers are dead. |
| `getEditLog`, `getPatterns`, `getImprovements`, `getStats`, `resetAll`, `logEdit`, `detectPatterns`, `approveConstraint`, `dismissConstraint` | services/promptImprovementEngine.ts (multiple) | varies | INVESTIGATE — only `loadWikiConstraints`, `getActiveConstraints`, `logChatFeedback`, `lookupChatRule`, `exportConstraintsToWiki` show external callers in code. The 9 above appear only in `window.__hicSelfImprovement` debug hooks per `hic-honest-audit-and-remediation-2026-05-23.md` — same anti-pattern as the originally-orphan `runLearningPass`. |

## Low-severity orphans (< 10 LOC OR type/interface-only)

| Category | Examples | Action |
|---|---|---|
| Type/interface orphans (no consumer outside defining file) | `DeskTheme`, `DeskStageKey`, `STAGE_TO_DESK`, `DeskSize`, `PipelineActivity` (AnalystDeskKnowledgeGraph.tsx) | INTERNALIZE — drop `export` |
| Same | `RetryProgress`, `AIEndpointId`, `CallAIOptions` (aiRetryClient.ts) — only `CallAIOptions` is referenced via `import type` once | KEEP `CallAIOptions`, drop others |
| Color helper | `hex` in components/slideTemplates/types.ts:378 | INVESTIGATE (1 line) |
| Internal-only function exported | `narrativeComposerExecutor.wrapWithTracker` (line 709) | WIRED (used by narrativeComposer.ts) — false alarm |
| `sanitizeRationale` | services/verbalizedConfidence.ts:235 | INTERNALIZE — called only inside `normalizeSelfAssessment` |
| `MODELS_FOR_CATEGORY` | services/aiRouter.ts:393 | INVESTIGATE — exported but no external reference; `getAvailableModels` uses it internally |
| `getModelSummary` | services/aiRouter.ts:487 | DELETE — no caller |
| 3 `slideValidator.ts` exports | `CORPUS_META_PHRASES` | INTERNALIZE |
| Several brand/preset constants in `slideTemplates/brands.ts` | `BRAND_METADATA`, `DEFAULT_BRAND_ID` | INVESTIGATE — `BRAND_METADATA` is exported but only `getBrand`, `nxtBrand`, `nuBrand`, `BRANDS` are consumed |

## Newly-introduced orphans since last audit

No prior orphan-code-report.md exists in `design-desk/`, so this is the baseline. Subsequent runs will diff against this file's `total_orphans_found: 47` and surface deltas.

## Resolved orphans since last audit

N/A — first run.

## Hypotheses about the cluster patterns

Three distinct orphan clusters showed up:

1. **The unshipped V3 research-fabric refactor**: `coverageScorer.ts` + `queryFabric.ts` + `methods/MethodExecutor.ts` + `evidenceRecord.ts` (partially) + `verticalRegistry.ts` (partially). Together these are ~1,200+ LOC of scaffolding that REARCHITECTURE_DEVELOPMENT_PLAN.md describes as the next architecture, but `researchFabricOrchestrator.ts` is still the live orchestrator and never imports any of them.

2. **The aspirational institution-manifest pipeline**: `institutionManifest.ts` + `institutionEntityExtractor.ts` — only `tierZeroUrlsForGoal` is wired. The other ~163 LOC + extractor helpers wait for the "S2 brief-parser wiring" that the source comment promised.

3. **The wikiCacheLoader engagement-bundle resume flow**: 6 functions, ~294 LOC, zero callers. Likely superseded by the engagement-cache layer in `wikiService.ts` (`writeEngagementManifest` / `readEngagementManifest` / `findPriorEngagementMatches`) that the HANDOFF_2026_05_14 doc describes.

If those three clusters were deleted, the orphan count drops from 47 to ~10.

## Method note

This is a conservative scan. For each candidate export I ran a literal name grep across all `*.ts`/`*.tsx` files under `humans-in-control-research/` excluding test/spec files. A symbol is classified ORPHAN only when it has zero importers AND zero loose string matches outside its defining file (per the agent rule: false-positives over false-negatives). Where the only "caller" is the defining file's own internal use, I called it INTERNALIZE rather than ORPHAN (the export keyword is the orphan; the code is alive).

## Next actions for the user

1. Decide the fate of the three orphan clusters above (V3 fabric, institution manifest, cache loader). Each is a single PR to either ship or strike.
2. Delete `chunkedGenerateBlueprint` or wire it into `generateBlueprint` / `generateJourneyMap` — this is the most actionable orphan because the rest of the chunked-generator pattern is already wired.
3. Delete `components/FeedbackReceipt.tsx` — the 2026-05-23 audit named this and only completed half the fix (deleted the import, not the file).
4. Delete the 4 unused `aiRetryClient` convenience helpers + the 4 unused `wikiNarrator` narrators — quick wins.
5. Internalize the 8 type-only and module-internal exports flagged LOW severity — drop `export` keyword.
