---
id: design-system/patterns/org.md
title: Pattern · org (#org)
type: design-system
updated: 2026-06-13
chunks:
  - id: "design-system/patterns/org.md#c0"
    char_span: [0, 1288]
    sentence_count: 10
    key_terms: [nxt, org, node, hairline, archivo, tokens, gold, mono]
    concepts: [hairline, archivo, tokens, structure, variables]
    section: Figma exemplars (source of truth) / Anatomy
    token_count: 368
  - id: "design-system/patterns/org.md#c1"
    char_span: [1325, 2104]
    sentence_count: 5
    key_terms: [chat, archivo, dense, graphic-collision, ibm, mono, plex, pptx]
    concepts: [archivo, dense]
    section: Construction rule (1-to-1 PPTX)
    token_count: 186
  - id: "design-system/patterns/org.md#c2"
    char_span: [2148, 2992]
    sentence_count: 6
    key_terms: [org-chart, node, org, emphasis, source, never, tiers, corpuschatservice]
    concepts: [org-chart, emphasis, source, never, tiers]
    section: Runtime template contract (2026-06-13)
    token_count: 218
---
# org pattern (#org)

## Figma exemplars (source of truth)
NU GOLD org frame 178:3 ("GOLD · org (nu) · 01 structure (what exists today)").
Files: NU z2v9Pvhg23hlljEitPBdAt (tokens 97:2, variables 95:2) · NXT iSQhAVM7SI4QHAWB7y9C2z
(tokens 223:2, variables 221:2). Geometry is brand-invariant; the NU frame IS the NXT
geometry, the skin rides on tokens. See brand/figma-node-map for the master index.

## Anatomy
GOLD shell (92px rail, 3x3 dot mark, IBM Plex Mono kicker "ORG STRUCTURE · SUBJECT · AS-IS",
action title in Lora Medium (NU) / Archivo SemiBold (NXT), mono meta row, hairline, takeaway
band). The org chart IS the entire slide body: 2-4 stacked TIER rows, each a horizontal row of
node cards joined by a centered hairline drop. The tier-label gutter (150px) carries
"TIER N · VERB" (DECIDES / DIRECTS / DELIVERS / ADVISES), pairing the number with the tier's
function. Each node card (ecru fill, hairline border) holds a role title (Lora NU / Archivo NXT),
a one-line responsibility (Archivo), a spacer, then a NAMED SOURCE line (IBM Plex Mono, source
teal NU / cyan NXT) pinned to the bottom. The single decision-authority node carries an accent
top border (NU red C8102E / NXT chartreuse B8B800). Add a tier or a node and the matrix reflows;
nothing is absolutely positioned.

## Construction rule (1-to-1 PPTX)
The PPTX export of this artifact must be a fully native, editable twin of the Figma exemplar:
every rail, accent bar, card, dot mark, and band is a real PPTX shape with theme colors from
/api/design-tokens (figma-tokens.json); text in brand fonts (Lora/Archivo/IBM Plex Mono for NU;
Archivo/Bebas/IBM Plex Mono for NXT). The AI chat constructs slides from these tokens and the
anatomy above, never from invented values. Layout is CSS grid/flex only; the graphic-collision
ban forbids SVG absolute positioning for org structures. Density axis: base|dense per DENSITY_SPEC
(components/slideTemplates/types.ts). Modification: analyst chat (#refine, #dense, variant
directives) or designer chat (Design Desk) regenerate against the same pattern; edits feed the
self-improvement loop.

## Runtime template contract (2026-06-13)
`#org` generates `:::slide template=org-chart` (OrgChartData in components/slideTemplates/types.ts):
tiers[] of node cards {title, role, source, emphasis?}, ordered by authority (tier 1 decides, the
last tier delivers); subject for the kicker; keyInsight for the takeaway band. DESCRIPTIVE of the
structure that EXISTS today, never prescriptive. Every node card cites a NAMED source where the
role or reporting line is evidenced; mark at most one node emphasis:true. Twins: web.tsx
OrgChartSlide (960x540 GoldFrame preview), slideToStageHtml.ts renderOrgChart (1920x1080 export
stage), pptx.ts exportOrgChart (legacy fallback). Density: 4 tiers x 4 nodes base, 5 x 5 dense
(DENSITY_SPEC org-chart). Routed via corpusChatService ARTIFACT_TPL (#org -> org-chart) and
HASHTAG_TO_SKILL_ID (#org -> org-chart skill); never the proxy artifact engine.
