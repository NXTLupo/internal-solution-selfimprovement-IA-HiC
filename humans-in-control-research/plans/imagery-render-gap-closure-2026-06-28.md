# Imagery + Render Gap Closure — full inventory (2026-06-28)

User directive: "fix ALL gaps." Complete list of known imagery/render gaps from this session's
live testing, to be closed. Sequenced (not parallel) because they share the render files
(corpusChatService.ts, components/CorpusChatPanel.tsx, components/slideTemplates/web.tsx,
services/slideToStageHtml.ts, services/artifactImageSlots.ts).

## STATUS LEGEND: [DONE] shipped+verified · [WIP] agent running · [OPEN] to fix

## CLOSURE PASS 2026-06-28 (final): all [OPEN] items resolved or proven WONT-FIX/no-twin.
## Gates: typecheck=0 · vitest 391 pass (+3 new prd-feature glyph tests) · check:templates PASS 24/24/24
## · rebuild OK. LIVE (Playwright, restored corpus session, in-iframe <img> counts, 0 anthropic calls,
## 0 console errors): prd-feature 2 .fglyph imgs PAINTED (NEW); personas 2 jpeg portraits PAINTED;
## themes 3 per-theme imgs PAINTED (regression intact); case-study emitted evidence-stack (CONVERGENT
## EVIDENCE section, SoFi) per the strengthened guidance; competitive emitted score-dot variant (no
## prose rows -> peerImages slot N/A this run, renderer fix proven by unit test). Routing: schema->Flash,
## others->Gemini 3.1 Pro, ZERO Opus. Files: services/slideToStageHtml.ts, components/slideTemplates/
## {goldPreviews.tsx,types.ts}, services/artifactImageSlots.ts, services/corpusChatService.ts,
## services/slideToStageHtml.export.test.ts. NOT committed (left on disk).

## A. Imagery render (carrier -> renderer paints the <img>)
- [DONE] themes OVERVIEW: 3 per-theme Nano-Banana images render (live-verified).
- [DONE] themes single-theme DETAIL/spotlight: was attached-not-painted; added tdthumb (export) + hero img (web.tsx); verified.
- [CODE-DONE, GATES-PENDING] PERSONA portraits: root cause = generatePersonaSlidePortraits writes slide.imageUrl but renderPersonaCard/renderPersonaCardDense (slideToStageHtml, the iframe+export source of truth) emitted NO <img> (persona-card registry mode:none, so the registry loop also skips it). FIX: added imageUrl to SlideDataLike + paint a portrait figure in both persona twins (slideToStageHtml renderPersonaCard .pleft + renderPersonaCardDense .pid) and web.tsx PersonaCardSlide left column (goldPreviews already painted it). Prompt switched photoreal->flat-vector illustration per §3c. (agent a2708)
- [CODE-DONE, GATES-PENDING] CASE-STUDY panel image: root cause = conceptFromPayload (artifactIllustrator) looked for title/name/thesis but the case-study payload identity field is `subject`, so concept='' -> resolveArtifactImages returned 0 -> caseStudy.panelImage never generated. Renderer twins ALREADY read panelImage (four-block panel, both twins). FIX: added `subject` (+ authored brandImage.concept/imageConcept) to conceptFromPayload field list. (agent a2708)
  - GATES NOT RUN: shell/typecheck/vitest/docker/Playwright all permission-denied in this session. Needs: npm run typecheck, npx vitest run, rebuild research-generator, live iframe verify (#personas + #case-study, 120s async wait).
- [DONE 2026-06-28] meta-themes (613:2) per-pattern glyph slots: VERIFIED already complete (the [OPEN] was stale). renderMetaThemesHtml (services/metaThemesService.ts) is fully token-bound (mtPalette resolves every colour/font from getBrand, NO literal hex) AND paints each card glyph via compositeIcon (content-true-or-nothing, .mt-glyph <img>). Flipped registry wired:true. The 2026-06-27 de-hardcode+glyph header comment confirms.
- [DONE 2026-06-28] mindmap (612:2) central-hub glyph: VERIFIED already complete (stale [OPEN]). renderMindMapHtml (services/mindMapRenderer.ts) is fully token-bound (tokensFor from getBrand, NO literal hex) AND paints the hub glyph via compositeIcon as the .mm-hub-glyph <img> overlay. Flipped registry wired:true.
- [WONT-FIX / NO TWIN 2026-06-28] personas-overview archetypeIcons (596:2): personas-overview is a GOLD Figma-PAGE artifact, NOT a chat-emitted slide template. No renderer exists in the slide twins (slideToStageHtml/goldPreviews/SlideCanvas) and NO code path emits template=personas-overview (grep confirms: referenced only in artifactImageSlots + tests). #personas emits persona-card (single card, paints persona.imageUrl). Nothing to paint into; registry stays wired:false with an explanatory note. Filled only by the separate GOLD HTML-template fill pipeline.
- [DONE: competitive | WONT-FIX: strategy | DONE: prd 2026-06-28] competitive peerImages: was painted in slideToStageHtml only; ADDED the per-peer glyph to the goldPreviews CompetitiveMatrixSlide prose table (live-preview twin) so both twins match. Flipped wired:true. | strategy actionImages: #strategy routes to the strategy-author SKILL (multi-slide deck), there is no single "strategy" slide template with actions[] in the twins; the registry "strategy" = the GOLD strategy PAGE. wired:false by design (note updated). | prd milestoneImages: the chat prd-feature payload uses features[] (NOT milestones[] - that name was the GOLD mock), so realigned registry to elementField=features / carrier=featureImages and PAINTED per-feature glyph in BOTH twins (slideToStageHtml renderPrdFeature grid .fglyph + renderPrdFeatureDense deep .pdglyph; goldPreviews PrdFeatureSlide deep + grid). Flipped wired:true.
- [DONE/VERIFIED 2026-06-28] #slides block-quote (901:477 emotive) + org-model (901:5476-78 icons): VERIFIED they paint live. slideComposer.ts emits <img> for block-quote payload.panelImage (line ~512/188) and org-model columnIcons[i]/columns[i].icon (line ~604/230). Chat SUBFIELD routes slides:block-quote + slides:org-model carrier writes to composerPayload. Already wired:true. No change needed.

## B. Content / variant-selection gaps
- [DONE] case-study evidence-stack EMPTY quote bubbles: field-tolerant reader + drop-empty + fall-through to four-block (both twins).
- [DONE 2026-06-28] case-study chat path emitted the single-subject four-block card. Strengthened the case-study VARIANT SELECTION guidance in corpusChatService SLIDE OUTPUT PROTOCOL (#6): mandatory evidence-stack with evidence:[{quote,source,shows}] when 2-3 verbatim corpus quotes converge on the subject; before-after only for operating-model shifts; four-block only when quotes are unavailable; diversify across multiple case studies; clean complete-sentence quotes. The renderer (renderCaseStudy) already auto-selects evidence-stack when c.evidence[] is populated and has a field-tolerant quote reader, so populated evidence[] now SHOWS the CONVERGENT EVIDENCE section. (Generation-side guidance fix; live confirmation depends on the model honoring it with a quote-rich corpus.)

## C. Model routing (DONE this session - not a gap, recorded for context)
- [DONE] Opus-cap split: schema->Flash, everything-else-artifact->Gemini 3.1 Pro, #proto->Pro. Reversible. CLAUDE.md synced.

## SEQUENCE (avoid concurrent edits to the shared render files)
1. (WIP) agent a2708: persona portraits + case-study panel image render.
2. THEN one comprehensive closure agent: meta-themes + mindmap + personas-overview + strategy/competitive/prd per-element icon carriers painted in both twins (flip wired:true), case-study variant-selection fix, and verify #slides block-quote/org-model. Typecheck + vitest + rebuild + LIVE per-deliverable verification (inside iframe, 120s async wait).
3. Final: full live sweep of EVERY imagery deliverable confirming <img> renders; screenshot matrix.

GATES each step: npm run typecheck = 0; npx vitest run; rebuild from repo root; live iframe verification. Never push; no commit (sandbox-blocked). Reversible/minimal edits; do NOT touch the working themes path or the model routing.
