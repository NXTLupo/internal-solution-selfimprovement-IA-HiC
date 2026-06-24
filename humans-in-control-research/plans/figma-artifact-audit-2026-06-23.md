# Figma ↔ #artifact corroboration audit (2026-06-23)

Goal: verify each #artifact's registry node refs against the LIVE Figma file
(`iSQhAVM7SI4QHAWB7y9C2z`, NXT) via Figma MCP, and flag every renderer template
that has NO corresponding Figma component. Driven by the user's theory that
#themes and #proto don't use the real Figma patterns.

## Method
- Registry of record: `wiki/brand/figma-node-map.md` COMPONENT REGISTRY.
- Renderer templates: `components/slideTemplates/types.ts` SlideTemplate union +
  `services/slideToStageHtml.ts` dispatch (21 templates).
- Figma truth: `get_metadata` per page (live).

## Live-verified pages (pulled from Figma, matched registry EXACTLY)
| Page | Figma name | Registry claim | Result |
|---|---|---|---|
| 69:2 | GOLD · themes (nxt) | overview 590:9 · detail 590:11 · theme-arc 590:12 · theme-mosaic 590:13 (+NU 625:654/722) | ✅ EXACT — all 4 nodes + names + NU twins present |
| 403:2 | GOLD · #proto patterns (nxt) | page 403:2, 74 proto/<Name> | ✅ 75 real proto/<Name> symbols w/ node ids (Composer 404:2, List 454:2, Timeline 455:34, …) |
| 324:2 | GOLD · slides (nxt) | 14 archetypes 609:2..609:15 | ✅ EXACT — all 14 + 14 NU instances 626:x |

Registry node-anchoring is reliable (3/3 exact). The remaining deliverable rows
below are taken from the registry (high confidence given 3/3) unless marked
VERIFIED; full live-verification of every page is a follow-up if desired.

## THE HEADLINE FINDING — renderer templates with NO Figma component
The renderer (`slideToStageHtml` dispatch) has 21 templates. Several have no
Figma source — they are renderer-invented layouts that only *wear* the correct
brand tokens. This is exactly the user's theory.

| Renderer template | Figma component | Status |
|---|---|---|
| theme-cluster | — (Figma themes page has overview/detail/arc/mosaic, NO cluster) | ❌ NO FIGMA — **CONFIRMED live (69:2)**. This is the default #themes layout. |
| theme-spotlight | — (same) | ❌ NO FIGMA — **CONFIRMED live (69:2)** |
| principles | no `principles` page or deliverable entry | ❌ NO FIGMA (inferred: absent from page list + registry) |
| timeline | roadmap is 599:2; renderer has a SEPARATE renderTimeline | ⚠️ AMBIGUOUS — confirm if 'timeline' == roadmap 599:2 or an orphan |
| systems-inventory | no `systems-inventory` page or deliverable entry | ❌ NO FIGMA (inferred) |
| executive-brief | 366:2 is a RAW FRAME, not a component (registry self-flags) | ⚠️ not componentized |

REVERSE gap — Figma theme layouts the renderer does NOT implement:
- `overview` (590:9) and `theme-detail` (590:11) — no renderer twin. The
  renderer ships cluster/spotlight instead of the two real Figma theme layouts.

## Renderer templates WITH a verified/claimed Figma component (OK)
persona-card (614:10/602:2) · recommendation (614:5) · theme-arc (590:12 ✅) ·
theme-mosaic (590:13 ✅) · competitive-matrix (603:2) · block-quote (614:8 +
609:7) · case-study (585:2/588:x) · stat-row (614:6 + 609:6 ✅) · section-divider
(609:4 ✅) · service-blueprint (608:2) · gap-matrix (598:2) · architecture-map
(606:2) · org-chart (610:2) · prd-feature (607:2) · journey-map (595:6).

## #proto specifics
- Page 403:2 real, 75 components, names match the manifest. ✅
- BUT `proto-component-manifest.md` is NOT node-anchored: 74 entries, only 2
  carry a ref and both just repeat the PAGE id (403:2), not per-component nodes
  (Composer=404:2, List=454:2, …). No link to detect drift from the real
  component anatomy.
- The orchestrator/pod prompt asked for a `p-*` "pattern_ids" catalog that does
  NOT exist → the model fabricated 21 p-* ids. (Prompt fix already applied:
  switched to the real proto/<Name> vocabulary; node-anchoring + anatomy verify
  is the pending Task #13.)

## Recommended remediations (for user decision)
1. **#themes**: build renderer twins for the REAL Figma `overview` (590:9) +
   `theme-detail` (590:11) via get_design_context; retire or remap
   theme-cluster/theme-spotlight (or re-point them to the real components).
2. **#proto** (Task #13): node-anchor the manifest to the 75 real node ids; pull
   anatomy via get_design_context for the components each screen uses; add a
   fidelity check that the pod actually used a declared proto/<Name>.
3. **Orphans**: decide principles / timeline / systems-inventory — either add a
   Figma component or mark them explicitly renderer-only in the registry.
4. **executive-brief 366:2**: componentize (registry already flags this).

## Coverage honesty
Live-verified: themes 69:2, proto 403:2, slides 324:2 (3/3 exact). The other
~17 deliverable rows rely on the registry (proven accurate on the 3 sampled).
Pull every page if 100% live coverage is required.
