---
id: design-system/visualization-families.md
title: Visualization Families (the content-true viz system the model selects from)
type: design-system
updated: 2026-06-25
chunks:
  - id: "design-system/visualization-families.md#c0"
    char_span: [0, 575]
    sentence_count: 4
    key_terms: [visualization, deliverable, nxt-slot-illustrator, figma, dark, slot, design-tokens, deterministic]
    concepts: [visualization, deliverable, figma]
    token_count: 141
  - id: "design-system/visualization-families.md#c1"
    char_span: [638, 2039]
    sentence_count: 1
    key_terms: [highlight, value, ints, friction, ordinal, process, target, model]
    concepts: [highlight, value, friction, ordinal, process]
    section: The 12 base families (skinned with the run industry glyph)
    token_count: 436
  - id: "design-system/visualization-families.md#c2"
    char_span: [2111, 2863]
    sentence_count: 2
    key_terms: [industry, pyramid, family, grid, advancement, candlestick, mortarboard, enrollment]
    concepts: [industry, pyramid, family]
    section: Domain-native signature forms (industry-specific; ~6 per industry)
    token_count: 204
  - id: "design-system/visualization-families.md#c3"
    char_span: [2880, 3222]
    sentence_count: 1
    key_terms: [token-locked, advancement, creative-ai, mortarboard, government, healthcare, higher-ed, insurance]
    section: Iconography
    token_count: 79
  - id: "design-system/visualization-families.md#c4"
    char_span: [3290, 5034]
    sentence_count: 1
    key_terms: [comparisonmatrix, operatingnetwork, capabilitystack, proportionstack, datafield, maturityradar, funnelflow, journeyline]
    concepts: [comparisonmatrix, operatingnetwork, capabilitystack, proportionstack, maturityradar]
    related_chunks: ["design-system/visualization-families.md#c5"]
    section: "Deliverable -> apt families (the audit; pick by content shape)"
    token_count: 512
  - id: "design-system/visualization-families.md#c5"
    char_span: [4809, 6196]
    sentence_count: 1
    key_terms: [comparisonmatrix, instrumentdial, capabilitystack, proportionstack, timelinegantt, operatingnetwork, datafield, funnelflow]
    concepts: [comparisonmatrix, instrumentdial, capabilitystack, proportionstack, operatingnetwork]
    related_chunks: ["design-system/visualization-families.md#c4"]
    section: "Deliverable -> apt families (the audit; pick by content shape)"
    token_count: 399
  - id: "design-system/visualization-families.md#c6"
    char_span: [6220, 6781]
    sentence_count: 5
    key_terms: [visualization-patterns-by-industry, exemplars, brand, deliverable, family, domain-native, per-industry, data-shape]
    concepts: [visualization-patterns-by-industry, exemplars, deliverable, brand, family]
    section: Selection doctrine
    token_count: 141
---
# Visualization Families

The deterministic, token-locked, text-free SVG visualization system rendered by
`services/vizEngine.ts` (skill `nxt-slot-illustrator`). When a hashtag deliverable has an IMAGE
SLOT, the model SELECTS a family + supplies `data` from the deliverable REAL payload; the engine
renders a content-true plate (no AI image-gen, anti-slop by construction). Brand x ground theme
comes from `/api/design-tokens` (NXT chartreuse / NU red x dark|light); the slot `imgGround` picks
dark vs stark-white. The SPA never calls Figma live; Figma holds canon exemplars.

## The 12 base families (skinned with the run industry glyph)
| family | shows | data contract |
|---|---|---|
| `operatingNetwork` | operating model / value network / ecosystem / org graph / stakeholder map | `{n:6-12, layout:spine|mesh|radial|hub2}` |
| `capabilityStack` | layered capability / tech / value stack, tiered model | `{layers:3-6, highlight:0..layers-1}` |
| `maturityRadar` | multi-dimension assessment vs target (spider) | `{scores:[5-7 of 0..1], target:[same len, >=score, <=1]}` |
| `funnelFlow` | funnel / pipeline / conversion drop-off | `{stages:[4-6 ints, DESCENDING, first=100]}` |
| `journeyLine` | journey / lifecycle / process over time with friction | `{stations:5-7, friction:[1-3 idx]}` |
| `dataField` | ranked bar distribution / benchmark / ranking | `{values:[5-9 ints 1..10], sort, mean, highlight?}` |
| `comparisonMatrix` | option x criteria grid, 2x2, BCG/GE, scorecard, heatmap | `{cells:[[0..1]] 3-4 x 3-4}` |
| `instrumentDial` | single-KPI gauge / index | `{value:0..100, segments:10}` |
| `timelineGantt` | roadmap / timeline / phased plan / gantt | `{tracks:[{start,dur}] x3-5, periods:6, now, milestone}` |
| `flowSchematic` | architecture / data flow / process schematic | `{blocks:[[nx,ny,w,h]], links:[[i,j]], highlight}` |
| `proportionStack` | composition / mix / allocation (10x10 waffle) | `{groups:[2-5 ints sum~100]}` |
| `sectionMark` | section divider (op-art + ordinal + industry emblem) | `{ordinal:1-6}` |

## Domain-native signature forms (industry-specific; ~6 per industry)
Replace the generic family where an industry has a signature chart. Same `data` as the base family.
| form | industry | depicts |
|---|---|---|
| `hc_ecg` | Healthcare | vitals/ECG trace |
| `fx_candlestick` | Fintech | OHLC candlestick |
| `fs_waterfall` | Financial Services | waterfall bridge |
| `rt_planogram` | Retail | planogram shelf grid |
| `ai_chiptopo` | AI Industry | chip/compute topology |
| `in_losstri` | Insurance | actuarial loss triangle |
| `he_enrollfunnel` | Higher Ed | enrollment funnel w/ mortarboard |
| `adv_giftpyr` | Advancement | donor gift pyramid |
| `wf_orgpyr` | Workforce | org pyramid of people |
| `gov_servicegrid` | Government | digital service grid |
| `cai_pipeline` | Creative AI | asset production pipeline |

## Iconography
Each industry has a flat angular token-locked glyph (healthcare cross, fintech coin, FS bank,
government dome, insurance shield, retail bag, workforce person, higher-ed mortarboard, advancement
gift, ai chip, creative-ai spark) skinning network nodes/hub, dial center, funnel/stack caps, the
section emblem, and a corner badge on every plate.

## Deliverable -> apt families (the audit; pick by content shape)
| #deliverable | apt families |
|---|---|
| `arch` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `timelineGantt` |
| `audit` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `instrumentDial`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `sectionMark`, `timelineGantt` |
| `blueprint` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `instrumentDial`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `timelineGantt` |
| `case-study` | `dataField`, `proportionStack` |
| `competitive` | `capabilityStack`, `comparisonMatrix`, `dataField`, `funnelFlow`, `instrumentDial`, `maturityRadar`, `operatingNetwork`, `proportionStack` |
| `gap` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `instrumentDial`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `timelineGantt` |
| `journey` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `timelineGantt` |
| `org` | `capabilityStack`, `comparisonMatrix`, `dataField`, `funnelFlow`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `timelineGantt` |
| `personas` | `comparisonMatrix`, `dataField`, `funnelFlow`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack` |
| `prd` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `instrumentDial`, `journeyLine`, `operatingNetwork`, `proportionStack`, `timelineGantt` |
| `recommendations` | `capabilityStack`, `comparisonMatrix`, `dataField`, `funnelFlow`, `instrumentDial`, `proportionStack`, `timelineGantt` |
| `report` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `instrumentDial`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `sectionMark`, `timelineGantt` |
| `roadmap` | `capabilityStack`, `comparisonMatrix`, `funnelFlow`, `instrumentDial`, `maturityRadar`, `operatingNetwork`, `timelineGantt` |
| `slides` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `instrumentDial`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `sectionMark`, `timelineGantt` |
| `strategy` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `instrumentDial`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `sectionMark`, `timelineGantt` |
| `tech-audit` | `capabilityStack`, `comparisonMatrix`, `dataField`, `flowSchematic`, `funnelFlow`, `instrumentDial`, `journeyLine`, `maturityRadar`, `operatingNetwork`, `proportionStack`, `timelineGantt` |
| `themes` | `comparisonMatrix`, `dataField`, `instrumentDial`, `proportionStack` |

## Selection doctrine
1. Brand from the run; ground from the slot `imgGround`.
2. Family by content shape: prefer the industry domain-native form when one fits, else the base
   family per the deliverable audit.
3. `data` is built from the DELIVERABLE REAL payload (scores/stages/tracks the model produced), NOT
   from the exemplars.
4. Exemplars in `visualization-patterns-by-industry.md` are FEW-SHOT seeds for selection + data-shape.

Per-industry pattern index (1,100 exemplars): see
[brand/visualization-patterns-by-industry.md](../brand/visualization-patterns-by-industry.md).