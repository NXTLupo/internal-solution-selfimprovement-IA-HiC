# Composable icon system — ~2,040 icons with manifest context (2026-06-26)

> User scope (locked): ~170 UNIVERSAL icons + ~170 PER INDUSTRY x 11 = ~2,040 addressable icons,
> each with CONTEXT in the manifest. Production model (locked via AskUserQuestion): a COMPOSABLE
> ENGINE + a 2,040-entry contextual manifest — NOT 2,040 hand-drawn glyphs. This is the icon
> parallel to the 1,100-pattern viz library (compact engine + large catalog).

## Architecture (mirrors vizEngine: compact engine + large catalog)
1. **Base glyph set** (`services/iconLibrary.ts`, the runtime authority): ~250-350 hand-authored,
   token-pure primitive glyphs (currently 104). These are the visual vocabulary.
2. **Industry modifiers**: 11 small affix marks (the existing industry signature glyphs, reused as a
   corner/badge modifier) so a concept rendered for healthcare differs from the same concept for
   fintech.
3. **Composition**: `compositeIcon(concept, industry)` = pick the best base glyph for `concept`
   (keyword match over the base set) + overlay the industry modifier (corner badge) when an industry
   is given. Deterministic, token-pure (colour from the brand token mirror), cached.
4. **Concept taxonomy** (the data): 170 universal + 170 per-industry concept strings, each authored
   by a domain expert with usage / suits / synonyms / suggested base-glyph. Lives in
   `hic-workspace/design-system/icon-taxonomy.json`.
5. **Manifest** (`icon-catalog.json` + `wiki/design-system/icon-library.md`): 2,040 entries =
   taxonomy x resolution. Each id (`universal/<concept>` or `<industry>/<concept>`) carries context
   (usage, suits, synonyms) + the resolved base glyph + industry modifier.
6. **Figma canon**: the BASE set as components on the Icons page (796:2); the 2,040 manifest is the
   catalog (we do NOT place 2,040 components — composition is the runtime path, matching viz).
7. **Runtime**: `selectIcon` / the router resolve a concept (+run industry) to a composite via the
   manifest; renders token-pure SVG into the slot carrier or embeds in a diagram (`viz.icons`).

## Phases
- P1 Concept taxonomy (170 x 12) — fan out 12 domain-expert subagents (parallel). [in progress]
- P2 Expand base glyph set 104 -> ~300 (hand-authored, batched, screenshot-QA'd).
- P3 Composition engine: `compositeIcon(concept, industry)` + industry modifier overlay + tests.
- P4 Manifest generation: taxonomy x engine -> 2,040-entry icon-catalog.json + icon-library.md.
- P5 Figma: ensure base components on Icons page cover the base set; manifest = canon catalog.
- P6 Wiring: selectIcon/router resolve composites; gallery sample QA; native PPTX path unchanged.

## Vision compliance (every phase)
- Never-hardcode: colour from `/api/design-tokens` (currentColor / brand accent). No hex in glyphs.
- SPA never calls Figma live: base components are canon; runtime renders from code + token mirror.
- Anti-slop: geometric single-concept marks; no text-in-image; no faces.
- Converge: extend `iconLibrary.ts` + the visual router; no parallel system.
- Determinism: composite render is seed-free + cached.

## Status (2026-06-26, end of session)
- DONE P1: 12 taxonomy files, **2,741 concepts** (200-266 each, all >=170), every entry with
  usage/suits/synonyms/baseGlyph; valid JSON, zero dups. `hic-workspace/design-system/icon-taxonomy/`.
- DONE P3: `compositeIcon` + `resolveBaseId` + `BASE_ALIAS` (~250 noun->base mappings) + industry
  modifier badge (token-sourced disc); 19 engine tests. Resolver chain exact>alias>tag>concept>
  industry-fallback>default.
- DONE P4: **`icon-manifest.json` = 2,741 entries**, each with context + resolved base + resolvedBy.
  Coverage: object/base 22%, concept 48% (= ~70% meaningful), industry-fallback ~30%.
- DONE P6 (runtime): `artifactIconResolver.oneIcon` -> `compositeIcon(concept, run-industry)`;
  `#img=icon` override; NU stark-white supported (ground=light). registry.icons.composable updated.
  Full suite 368/368, typecheck 0.
- DONE base-in-Figma: **ALL 549** components on Icons page (796:2 / grid 796:3), token-bound to
  color/accent (221:5, flips NXT/NU by mode), created from exact code SVG (zero drift), 0 failures.
- DONE P2: base expanded **104 -> 549** (+445 generated via 9 domain agents: tech-web/ai-ml/data/
  architecture/cloud/security/governance/mobile/chatbot), all UNIVERSAL/shareable, merged into
  CONTENT_POOL so the composition engine resolves tech concepts to real glyphs (cut the fallback).
  typecheck 0, vitest 368/368.
- Gallery (sample, 4 token contexts incl NU stark-white): icon-composite-gallery.html (artifact).

## ADDENDUM 2026-06-27 — per-container audit + type-vs-size fixes (was a real gap)
Earlier "GOLD audit" was a per-ARTIFACT branch guess off the mirror. Now did the real per-CONTAINER
live-Figma audit: every GOLD page + every #slides variant image container read for true bounds/aspect.
Fixes shipped (typecheck 0 / vitest 371): journey 150x150 emotive->ICON; slides portrait panels render
diagrams CENTRED landscape (no stretch/crop); thin-banner chart slots constrain vizFamilies to flow;
meta-themes+mindmap registry claimed slots that don't exist -> corrected to none. artifactImageSlots.ts
now carries bounds+fit+vizFamilies; registry.json.containerAudit_2026_06_27 + figma-node-map mirror it.

## ADDENDUM 2026-06-27b — meta-themes + mindmap glyph slots ADDED to live Figma
Per user "add the meta-themes/mindmap Figma slots first". On inspection the slots already EXISTED in
live Figma (added after the audit snapshot by the icon rollout): meta-themes component 613:2 carries 4
per-pattern glyph slots (683:5501-5504, 72x72) and mindmap component 612:2 carries 1 central-hub glyph
slot (683:5509, 120x120) — both empty metadata-bearing frames (imgKind=glyph, imgRole, imgAspect=1)
nested in the component so the NU twins (626:687 / 626:615) inherit. Re-pointed registry none->icon
(meta-themes per-element patternImages[], mindmap single hubImage); extended artifactIconResolver
concept keys (canonical_name / research_goal); flipped the 3 audit tests. typecheck 0, vitest 372.
Renderer paint (renderMetaThemesHtml / renderMindMapHtml) + de-hardcode of their hex/stale fonts is the
wired:false follow-on, same pending state as the other 5 icon artifacts.
