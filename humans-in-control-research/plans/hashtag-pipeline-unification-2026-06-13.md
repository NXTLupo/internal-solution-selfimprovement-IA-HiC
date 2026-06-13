# Hashtag pipeline unification — every artifact on the ONE canonical engine (2026-06-13)

**Goal:** every artifact hashtag in the Analyst Desk must follow the SAME pipeline as
`#journey`: anti-RAG manifest/corpora retrieval → runtime generation from the Analyst/Designer
chat (`corpusChatService.sendChatMessage` slide-mode) → GOLD Figma slide template → Opus 4.8
→ self-improvement grounding. No artifact may route to the legacy proxy artifact-engine (brand-CSS
HTML) or the old `#recommendations` RAG/tile path.

## The canonical engine (what `#journey` already did)
`sendChatMessage` slide-mode: hashtag → `ARTIFACT_TPL` slide template; `HASHTAG_TO_SKILL_ID` loads
the owning skill; evidence grounded via `pickChunksForPrompt` + `resolveChunks` (manifest, anti-RAG);
force-routed to `claude-opus-4-8` (Fable 5 stand-in); rendered as GOLD slides by
`components/slideTemplates/web.tsx` (preview) + `services/slideToStageHtml.ts` (1920×1080 export);
exported native via the gold-stage pipeline (`pptx.ts` is the fallback). Pattern grounding lives in
`hic-workspace/wiki/design-system/patterns/<slug>.md` (manifest-chunked).

## What diverged (before) and the fix
| Hashtag | Was | Now |
|---|---|---|
| `#recommendations` (full word) | intercepted at `CorpusChatPanel.tsx:4882` → RAG `fetchWikiArticles` → `RecommendationTilesGrid`/`emitDeliverable` (the broken `recommendations-nu.pptx`: `[object Object]` steps, unresolved `[...#c1]` pointers) | gate DELETED; falls through to slide-mode `recommendation` template like `#recs` (ends the `#recs`/`#recommendations` engine fork) |
| `#roadmap #prd #gap #compete #arch` | `DELIVERABLE_TAGS` panel gate → proxy `/api/artifact/generate` (brand-CSS HTML, partial grounding) | removed from `DELIVERABLE_TAGS`; fall through to slide-mode (`timeline`/`prd-feature`/`gap-matrix`/`competitive-matrix`/`architecture-map`) |
| `#org` | `DELIVERABLE_TAGS` → proxy artifact engine (no slide template existed) | NEW `org-chart` GOLD slide template built from Figma NU 178:3; `#org` → `org-chart`; `DELIVERABLE_TAGS` now empty, the whole legacy gate is dead |

## org-chart template (built from Figma NU 178:3)
GOLD reporting-tier matrix; the chart IS the slide body. Twins:
- `components/slideTemplates/types.ts` — `OrgChartData` + union + `DENSITY_SPEC` (4×4 base / 5×5 dense)
- `components/slideTemplates/web.tsx` — `OrgChartSlide` (960×540 GoldFrame preview)
- `services/slideToStageHtml.ts` — `renderOrgChart` (1920×1080 export) + KICKERS + takeaway chrome
- `components/slideTemplates/pptx.ts` — `exportOrgChart` (fallback, parity)
- `components/SlideCanvas.tsx` — `orgChart` field + dispatch case + `legacyPptxArgs`
- `services/corpusChatService.ts` — `ARTIFACT_TPL` `#org`→org-chart, `HASHTAG_TO_SKILL_ID` `#org`→org-chart, SLIDE OUTPUT PROTOCOL block + index + trigger
- `hic-workspace/wiki/design-system/patterns/org.md` + `brand/figma-node-map.md` row (manifest-chunked)
Token-driven: one renderer skins both brands (NU navy rail + red accent + Lora; NXT near-black rail +
chartreuse accent + cyan source + Archivo). Verified via screenshot for both brands against 178:3.

## Verified
- `npm run typecheck` — clean (0 errors)
- `npm run check:templates` — PASS (canonical=21 / web=21 / pptx=21)
- `npm run build` — built in ~23s
- Stage-twin render (`slideDataToStageHtml`) for NXT + NU org-chart — 8 nodes, no `[object Object]`,
  correct brand skins, sources resolved; Playwright screenshot audited against Figma 178:3.

## Follow-ups (not blocking)
- Delete the now-dead `if (allDeliverable)` proxy artifact-engine gate + the unreachable
  journey-mapper branch in `CorpusChatPanel.tsx` once a full live run confirms no regressions.
- The orphaned `RecommendationTilesGrid` component + `#recommendations` tile export helpers in
  `CorpusChatPanel.tsx` are now dead (noUnusedLocals is off, so harmless); remove in cleanup.
- Swap `claude-opus-4-8` back to `claude-fable-5` when Anthropic lifts the Fable ban
  (see plans/fable-to-opus-swap-2026-06-13.md).
