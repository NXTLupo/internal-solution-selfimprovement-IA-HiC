# Knowledge Graph System — Deep Dive Technical Analysis

**Application**: NXT Humans — Humans in Control Research Generator  
**Date**: 2026-04-14  
**Files Analyzed**:
- `services/knowledgeGraphBuilder.ts` (693 lines) — graph data construction
- `components/ResearchKnowledgeGraph.tsx` (858 lines) — D3 rendering + interaction
- `App.tsx` integration (lines 688-715) — lifecycle + state management

---

## 1. Architecture Overview

The knowledge graph is a **D3.js force-directed visualization** that grows incrementally as the research pipeline produces deliverables. It maps relationships between 9 node types across 5 edge types, rendering as a radial concentric layout with themes at center and sources on the outer ring.

### Data Flow

```
Source Collection (proxy)
        |
        v
buildSourceGraph(sourceResults)        --> creates source + evidence nodes
        |
        v
addThemesToGraph(graph, themes)        --> creates theme nodes, links to evidence/sources
        |
        v
addPersonasToGraph(graph, personas)    --> creates persona nodes, links to themes
        |
        v
addRecommendationsToGraph(graph, recs) --> creates recommendation nodes, links to themes
        |
        v
addJourneyStagesToGraph(graph, stages) --> creates journey_stage nodes
addPRDFeaturesToGraph(graph, features) --> creates feature nodes
addRoadmapToGraph(graph, items)        --> creates roadmap_item nodes
addGapAnalysisToGraph(graph, gaps)     --> creates gap nodes
        |
        v
setKnowledgeGraph(graph) --> triggers D3 re-render
```

### Rebuild Lifecycle (App.tsx, lines 688-715)

A single `useEffect` watches **8 dependencies**:

```typescript
useEffect(() => {
    if (collectionPhase !== 'complete' || liveSourceResults.length === 0) return;
    let graph = buildSourceGraph(liveSourceResults);
    if (themesResult?.themes) graph = addThemesToGraph(graph, themesResult.themes);
    if (personasResult?.personas) graph = addPersonasToGraph(graph, personasResult.personas);
    if (recsResult?.recommendations) graph = addRecommendationsToGraph(graph, recsResult.recommendations);
    if (journeyResult?.stages) graph = addJourneyStagesToGraph(graph, journeyResult.stages);
    if (prdResult?.features) graph = addPRDFeaturesToGraph(graph, prdResult.features);
    if (roadmapResult?.items) graph = addRoadmapToGraph(graph, roadmapResult.items);
    if ((gapResult as any)?.analysis?.gaps) graph = addGapAnalysisToGraph(graph, (gapResult as any).analysis.gaps);
    setKnowledgeGraph(graph);
}, [collectionPhase, liveSourceResults, themesResult, personasResult, recsResult,
    journeyResult, prdResult, roadmapResult, gapResult]);
```

The graph is **completely rebuilt from scratch** every time any dependency changes. There is no incremental patching — the D3 simulation restarts, all node positions reset, and the zoom-to-fit animation replays.

---

## 2. Node Types

### 2.1 Type Definitions (KGNode interface, lines 20-39)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `type` | enum | One of 9 types (see below) |
| `label` | string | Display name |
| `tier` | number? | Source credibility tier (1/2/3) |
| `freshnessScore` | number? | 0-100, evidence freshness |
| `relevanceScore` | number? | 0-100, evidence relevance |
| `url` | string? | External link |
| `imageUrl` | string? | Persona portrait URL |
| `color` | string? | Custom node color |
| `size` | number? | Visual size in px |
| `metadata` | Record? | Arbitrary metadata bag |
| `parentSourceId` | string? | Evidence back-reference to source |
| `isOrphan` | boolean? | Evidence not linked to any theme |
| `isThinTheme` | boolean? | Theme with <3 evidence links |
| `evidenceCount` | number? | Theme: linked evidence count |
| `sourceConcentration` | number? | Theme: 0-1 dominance ratio |
| `dominantSource` | string? | Theme: most-cited source name |

### 2.2 Node Construction Details

#### Source Nodes (knowledgeGraphBuilder.ts, lines 98-112)

Created from each collected source result. Size is fixed at 12px. Color/stroke determined by tier:

| Tier | Fill | Stroke | Stroke Dash | Interpretation |
|------|------|--------|-------------|----------------|
| T1 (Academic) | `#0D0D0D` (solid black) | none | none | Highest credibility |
| T2 (News/Industry) | `#444444` (dark gray) | `#666666`, 0.5px | none | Mid credibility |
| T3 (Community/UGC) | transparent | `#CCCCCC`, 1px | `4,3` (dashed) | Lowest credibility |

Metadata includes `itemCount` (number of evidence items) and cached `tierStyle`.

#### Evidence Nodes (lines 113-137)

Created from each individual item within a source result. Size scales with relevance:

```
relevanceScore = item.relevanceScore || 50
size = Math.max(6, Math.min(16, Math.round(6 + (relevance / 100) * 10)))
// Range: 6-16px, linear scale
```

- All evidence starts as `isOrphan: true` (line 130)
- Cleared to `false` when linked to a theme or persona
- `parentSourceId` set to parent source's node ID (line 129)
- Edge created: `evidence -> source` with type `from`, weight 0.3

Rendering uses opacity based on freshness: `Math.max(0.2, Math.min(0.6, freshnessScore / 150))`. Orphans render as tan (`#E8D888`), non-orphans as gray (`#CCCCCC`). Enriched evidence gets a teal stroke (`#00B7C3`).

#### Theme Nodes (lines 337-353)

Created from extracted themes. Size based on evidence count. Visual shape: **diamond** (4-point polygon with minimum radius 28px).

- **Thin themes** (evidenceCount < 3): desaturated fill `rgba(184,184,0,0.35)` + dashed stroke `6,3`
- **Strong themes**: solid `#B8B800` fill + `#0D0D0D` stroke
- **Source concentration warning**: if >70% of evidence comes from one source, a red circle (`#E24B4A`, 4px radius) appears at the top-right corner

#### Persona Nodes (lines 371-398)

Created from generated personas. If `imageUrl` exists, renders as a square-cropped grayscale photo with `grayscale(100%) contrast(1.2) brightness(0.95)` filter and `#0D0D0D` 2px border. Otherwise renders as a default circle with `#115054` fill.

#### Recommendation Nodes (lines 466-490)

Shape: **hexagon** (6-point polygon). Fill: `#00B7C3` (teal). Stroke: `#0D0D0D`.

#### Journey Stage Nodes (lines 534-564)

Shape: **rounded rectangle** (rx: 4). Color from emotion metadata (red/orange for negative stages, teal for positive). Opacity: 0.8.

#### Feature Nodes (lines 580-600)

Shape: **pentagon** (5-point polygon). Color based on priority: red for Must-have, amber for Should-have, gray for Could-have.

#### Roadmap Item Nodes (lines 616-636)

Shape: **rounded pill** (shorter rectangle with rx: r/3). Color based on horizon: teal for Now, amber for Next, gray for Later. Opacity: 0.8.

#### Gap Nodes (lines 652-672)

Shape: **triangle** (pointing up). Color based on severity: `#CC6644` (orange-red) for critical, amber for high, gray for medium.

---

## 3. Edge Types

### 3.1 Edge Type Definitions (KGEdge interface, lines 41-47)

| Type | Direction | Meaning | Weight Range |
|------|-----------|---------|--------------|
| `from` | evidence -> source | "This evidence came from this source" | 0.3 |
| `supported_by` | theme -> evidence/source | "This theme is supported by this evidence/source" | 0.15 - 0.8 |
| `experiences` | persona -> theme | "This persona experiences this theme" | 0.2 - 0.8 |
| `addresses` | recommendation -> theme | "This recommendation addresses this theme" | 0.4 - 0.6 |
| `quoted_in` | evidence -> theme | "This evidence is quoted in this theme" | varies |

### 3.2 Weight Values by Creation Context

| Context | Edge Type | Weight | Location |
|---------|-----------|--------|----------|
| Evidence -> Source | `from` | 0.3 | line 137 |
| Theme -> Source (citation match) | `supported_by` | 0.8 | line 188 |
| Theme -> Evidence (citation text overlap) | `supported_by` | 0.6 | line 210 |
| Theme -> Evidence (fallback first evidence) | `supported_by` | 0.4 | line 228 |
| Theme -> Evidence (direct content match) | `supported_by` | 0.7 | line 252 |
| Theme -> Citation Node (synthetic) | `supported_by` | 0.5 | line 282 |
| Theme -> Evidence (keyword fallback) | `supported_by` | overlap * 0.15 (max 0.6) | line 307 |
| Persona -> Theme (keyword overlap) | `experiences` | overlap * 0.2 (max 0.8) | line 390 |
| Persona -> Source | `supported_by` | 0.5 | line 419 |
| Persona -> Evidence (keyword overlap) | `supported_by` | overlap * 0.15 (max 0.7) | line 442 |
| Recommendation -> Theme | `addresses` | 0.6 | line 483 |
| Journey Stage -> Persona | `experiences` | 0.5 | line 546 |
| Journey Stage -> Theme | `supported_by` | 0.4 | line 558 |
| Feature -> Recommendation | `addresses` | 0.5 | line 594 |
| Roadmap -> Recommendation | `addresses` | 0.4 | line 630 |
| Gap -> Theme | `supported_by` | 0.5 | line 666 |

### 3.3 Edge Rendering (ResearchKnowledgeGraph.tsx, lines 236-267)

| Type | Color | Default Opacity | Hover Opacity | Width | Dash |
|------|-------|-----------------|---------------|-------|------|
| `from` | `#E0E0E0` | **Filtered out entirely** (line 246) | 0.8 | weight * 3 | none |
| `supported_by` | `#B8B800` (chartreuse) | 0.5 | 0.8 | weight * 3 (min 1.5) | none |
| `experiences` | `#00B7C3` (teal) | 0.4 | 0.8 | weight * 2 (min 1) | `4,4` (dashed) |
| `addresses` | `#00B7C3` (teal) | 0.4 | 0.8 | weight * 2 (min 1) | none |
| `quoted_in` | `#E0E0E0` | 0.4 | 0.8 | weight * 2 (min 1) | `2,2` (dotted) |

**Critical note**: `from` edges (source-to-evidence) are completely removed from the render set at line 246. They only become visible during hover highlighting. This means users cannot see the source->evidence relationship at rest.

---

## 4. Theme-to-Source Matching Algorithm (3-Tier Strategy)

This is the most complex part of the graph builder (lines 159-317). It processes each theme's `citations` array and attempts to link themes to evidence/source nodes through progressively looser matching.

### Tier 1: Source Name Matching (lines 171-237)

For each citation in `theme.citations`:
1. Extract `citation.sourceName`, lowercase it
2. Search all source nodes: does `sourceLabel.includes(sourceName)` OR `sourceName.includes(sourceLabel)`?
3. If matched: create `theme -> source` edge (weight 0.8)
4. Then find child evidence from that source:
   - Filter evidence where `parentSourceId === sourceNode.id`
   - Limit to first 3 evidence items per source (`.slice(0, 3)`)
   - For each: compute word overlap between citation text and evidence content (words >4 chars)
   - Require >= 2 overlap words OR URL match
   - Create `theme -> evidence` edge (weight 0.6) if matched
   - Mark evidence as `isOrphan = false`
5. Fallback: if no evidence matched but source had items, link to first evidence (weight 0.4)

### Tier 2: Direct Evidence Match (lines 239-262)

If Tier 1 didn't match AND (citation text length > 10 OR URL exists):
1. Search all evidence nodes
2. Match if: URL matches OR evidence content contains citation text substring (first 30 chars)
3. Create `theme -> evidence` edge (weight 0.7)
4. Mark evidence as non-orphan

### Tier 3: Citation Node Creation (lines 264-286)

If previous tiers failed AND URL is available:
1. Create **synthetic evidence node** with id `cit_${themeId}_${edgeCount}`
2. Populate with citation text as content, URL as url
3. Create `theme -> citNode` edge (weight 0.5)
4. This node is NOT linked to any source (orphan by construction)

### Fallback: Keyword Overlap (lines 289-317)

If `linkedSourceIds.length === 0` (no citations matched via any tier):
1. Extract theme keywords: split `theme.name + " " + theme.description` by whitespace
2. Filter words >4 characters
3. For each source node:
   - Find child evidence with keyword overlap >= 3 words
   - Create `theme -> evidence` edge with weight `Math.min(overlap * 0.15, 0.6)`
   - Link only one evidence per source
4. Mark matched evidence as non-orphan

---

## 5. Radial Layout Engine

### Ring Assignments (ResearchKnowledgeGraph.tsx, lines 171-196)

```
maxRadius = Math.min(containerWidth, height) * 0.44
```

| Ring | Radius | Types |
|------|--------|-------|
| Center | 0% | theme |
| Ring 1 | 35% of maxRadius | persona, recommendation, gap |
| Ring 2 | 60% of maxRadius | journey_stage, feature, roadmap_item |
| Ring 3 | 85% of maxRadius | source |
| Ring 4 | 95% of maxRadius | evidence |

Nodes are pre-positioned on their rings with even angular spacing before the simulation starts. A small random jitter (+-10px) prevents exact overlap.

### Force Simulation Parameters (lines 199-232)

**Link Force**:
- `from` edges: distance 25px, strength 0.7 (tight source-evidence coupling)
- `supported_by`: distance 60px, strength 0.15 (loose theme connections)
- `experiences`/`addresses`: distance 80px, strength 0.1 (very loose)

**Radial Force** (pulls nodes toward their assigned ring):
- Themes: strength 0.25 (strong center pull)
- Sources: strength 0.08
- Evidence: strength 0.03 (weakest — floats near sources)
- Others: strength 0.1

**Many-Body Repulsion**:
- Themes: -80 (strongest — spreads themes apart at center)
- Personas: -50
- Sources: -40
- Others: -30
- Evidence: -5 (minimal — clusters near parents)

**Collision Force** (adaptive based on node count):
- Evidence: 5px (tiny)
- Others: adaptive `baseRadius`:
  - >40 non-evidence nodes: 20px base
  - 20-40: 35px base
  - <20: 50px base
- Themes: baseRadius + 10px (extra spacing)

### Auto Zoom-to-Fit (lines 443-459)

After simulation settles (`simulation.on('end')`):
1. Compute bounding box of all nodes (with 40px padding)
2. Calculate scale to fit within viewport (max 1.8x, then * 0.9 for margins)
3. Center the bounding box
4. Animate zoom transition over 800ms

---

## 6. Label System

### Text Truncation Rules

| Type | Max Characters | Suffix |
|------|---------------|--------|
| theme | 35 | ` (N)` evidence count |
| source | 25 | none |
| persona | 20 | none |
| recommendation | 30 | none |
| evidence | 40 | none |
| other | 25 | none |

### Font Sizes

| Type | Size | Weight |
|------|------|--------|
| theme | 10px | 700 (bold) |
| evidence | 8px | 500 |
| all others | 9px | 500 |

### Label Backdrop

Every non-evidence label gets a white backdrop rectangle (`rgba(255,255,255,0.92)`) with 2px border radius, sized to fit the text with 3px horizontal and 1px vertical padding. The backdrop is positioned via `setTimeout(100ms)` to allow the text to render first so `getBBox()` can measure it.

### Zoom-Dependent Visibility

| Type | Visible At | Hidden Below |
|------|------------|--------------|
| theme | Always | Never |
| persona | Always | Never |
| source | 0.8x zoom | <0.8x |
| recommendation, feature, etc. | 1.2x zoom | <1.2x |
| evidence | 1.8x zoom | <1.8x |

---

## 7. Interaction Model

### Hover Behavior

**On Mouse Over** (lines 490-508):
1. Hovered node gets `#B8B800` stroke at 3px width
2. Connected edges brighten to 0.8 opacity, thicken to `weight * 3`
3. Unconnected edges dim to 0.05 opacity, thin to 0.5px
4. Connected nodes stay at full opacity (1.0)
5. Unconnected nodes dim to 0.15 opacity

**On Mouse Out** (lines 509-521):
1. All strokes restore to original (tier-based for sources, type-based for others)
2. All edges restore to default opacity/width
3. All nodes restore to opacity 1.0

### Click Behavior

Clicking any node opens the **floating detail panel** (position: absolute, top-right corner of graph, width 340px, z-index 20). The panel contains:

1. **Breadcrumb trail** — clickable hierarchy path (see Section 8)
2. **Close button** — 26x26px square, top-right
3. **Type label** — uppercase with tier indicator
4. **Node title** — 15px bold
5. **Description** — from `metadata.description`
6. **Quote** — italic with chartreuse left border
7. **Content** — evidence body text
8. **Role** — persona role description
9. **Quick stats** — for themes: evidence count + source count
10. **Source link** — "View Original Source" with external link
11. **Connected nodes** — up to 20 related nodes, clickable to navigate

### Drag Behavior

All nodes support D3 drag:
- Drag start: pin node (`fx`/`fy`), restart simulation at alphaTarget 0.3
- Drag: update position
- Drag end: unpin node, stop simulation

---

## 8. Breadcrumb Navigation System

### Hierarchy Definition

```
PARENT_EDGE_MAP:
  evidence   -> traces 'from' edges      -> finds source
  theme      -> traces 'supported_by'    -> finds source or evidence
  persona    -> traces 'experiences'     -> finds theme
  recommendation -> traces 'addresses'   -> finds theme
  journey_stage  -> traces 'supported_by'/'experiences' -> finds theme or persona
  feature    -> traces 'addresses'       -> finds recommendation or theme
  roadmap_item -> traces 'addresses'     -> finds recommendation or theme
  gap        -> traces 'supported_by'    -> finds theme
```

### Algorithm (buildBreadcrumbs, lines 81-133)

```
function buildBreadcrumbs(node, graph):
    crumbs = []
    visited = Set()
    current = node

    while current AND current.id not in visited:
        visited.add(current.id)
        crumbs.prepend({ node: current, label: current.label[0:30] })

        parentConfig = PARENT_EDGE_MAP[current.type]
        if not parentConfig: break

        // Shortcut: evidence nodes have parentSourceId
        if current.type === 'evidence' AND current.parentSourceId:
            find source node by parentSourceId
            if found: current = source; continue

        // General: scan all edges for parent
        for each edge in graph.edges:
            if edge.type not in parentConfig.edgeTypes: skip
            find the "other" node (not current)
            if other.type in parentConfig.parentTypes: foundParent = other; break
            // Special: themes also accept direct source connections
            if current.type === 'theme' AND other.type === 'source': foundParent = other; break

        current = foundParent (or null if none found)

    return crumbs  // ordered root -> leaf
```

### Example Breadcrumb Trails

- **Clicking a Recommendation**: `PIE News / Regulatory Framework Theme / Reduce Visa Barriers`
- **Clicking a Theme**: `Semantic Scholar / International Co-op Mobility`
- **Clicking Evidence**: `Higher Ed Dive / Study Abroad Enrollment Data`
- **Clicking a Source**: `Higher Ed Dive`

Each ancestor crumb is underlined and clickable (navigates the panel to that node). The current node is shown in its type color, non-clickable.

---

## 9. GraphStats Computation (lines 494-513)

```typescript
{
    totalSources: sources.length,
    totalEvidence: evidence.length,
    totalThemes: themes.length,
    totalPersonas: personas.length,
    totalRecommendations: recs.length,
    orphanEvidence: evidence.filter(n => n.isOrphan).length,
    thinThemes: themes.filter(n => n.isThinTheme).length,
    avgEvidencePerTheme: themes.length > 0
        ? Math.round(evidence.length / themes.length)
        : 0
}
```

Displayed in the analytics header bar at the top of the graph:
- `{sources} sources` — teal badge
- `{utilization}% utilized` — gray (calculated as `(totalEvidence - orphanEvidence) / totalEvidence * 100`)
- `{themes} themes ({strong} strong)` — chartreuse badge
- `{personas} personas` — teal (if >0)
- `{recs} recs` — teal (if >0)
- `{orphan} orphan` — red badge (if >0)

---

## 10. Readability & Usability Challenges

### 10.1 Visual Density and Overlap

**Problem**: With 30+ sources and 100+ evidence items, the outer rings become extremely crowded. The adaptive collision radius drops to 20px when >40 non-evidence nodes exist, which is often insufficient to prevent label overlap.

**Symptoms**:
- Source labels overlap at the 85% ring
- Evidence clusters merge into an undifferentiated gray band at the 95% ring
- Theme diamond labels at center can overlap when 5+ themes share similar angular positions

**Root cause**: The radial layout distributes nodes evenly by angle within each ring, but label width varies dramatically (a 25-character source name vs. a 10-character one). No label collision avoidance exists beyond the white backdrop.

### 10.2 Evidence Invisibility at Default Zoom

**Problem**: Evidence nodes render at 2-4px radius with 0.2-0.6 opacity, and their labels only appear at 1.8x zoom. At default zoom (auto-fit, typically 0.6-1.0x), evidence is effectively invisible — just a faint ring of dots.

**Impact**: The most numerous node type (often 100-300 items) provides no information at the zoom level where users first see the graph. Users must know to zoom in 1.8x+ to see what data supports the analysis.

### 10.3 `from` Edges Hidden by Default

**Problem**: Source-to-evidence edges (type `from`) are completely filtered out of the render set (line 246). They only appear during hover highlighting. This means the visual link between "where data came from" and "what data was collected" is invisible at rest.

**Impact**: The graph appears to have disconnected evidence floating near (but not visually connected to) their parent sources. The radial force keeps them close, but there's no visual line connecting them.

### 10.4 Edge Direction Inconsistency

**Problem**: Edge source/target fields are not consistent across types:
- `from`: evidence (source field) -> source (target field)
- `supported_by`: theme (source) -> evidence/source (target)
- `experiences`: persona (source) -> theme (target)
- `addresses`: recommendation (source) -> theme (target)

The "source" field of an edge does not always mean "the parent" — sometimes the child is in the source field. The breadcrumb algorithm handles this by checking both directions, but it adds fragility.

### 10.5 Full Graph Rebuild on Every State Change

**Problem**: The useEffect at line 715 rebuilds the entire graph from scratch whenever ANY of its 8 dependencies changes. During the analysis pipeline, deliverables complete one at a time (themes, then personas, then recs, etc.), causing 5-8 full rebuilds. Each rebuild:
- Reconstructs all nodes and edges from scratch
- Restarts the D3 force simulation (nodes scatter then re-converge)
- Triggers the zoom-to-fit animation
- Resets the selected node state (panel closes)

**Impact**: The graph visibly "jumps" multiple times during analysis. If a user is inspecting a node when a new deliverable arrives, the panel closes and the graph re-renders.

### 10.6 Keyword Fallback Matching Noise

**Problem**: When citation-based matching fails, the fallback (lines 289-317) uses keyword overlap with a threshold of just 3 words >4 characters. Theme names/descriptions often contain generic words like "experience", "learning", "international", "student" that match many evidence items.

**Impact**: Themes may appear well-supported (high evidence count) when the connections are actually noise from generic keyword matches. The weight is low (0.15 per word), but the visual edge still appears and the evidence is marked non-orphan.

### 10.7 Evidence Linking Bottleneck

**Problem**: In Tier 1 matching, evidence items from a source are limited to the first 3 (`.slice(0, 3)` at line 198). High-volume sources (e.g., Reddit subreddits with 50+ items) have most of their evidence ignored during theme linking.

**Impact**: Only the first 3 evidence items per source can be linked to a theme. The remaining items stay orphaned even if they're highly relevant, inflating the orphan count and deflating theme evidence counts.

### 10.8 Missing Node Types in Stats

**Problem**: `computeStats()` only counts sources, evidence, themes, personas, and recommendations. Journey stages, features, roadmap items, and gaps are not tracked.

**Impact**: The analytics header bar shows incomplete totals. A graph with 5 journey stages, 8 features, and 12 roadmap items shows none of these in the stats.

### 10.9 Connected Nodes Truncation

**Problem**: The connected nodes list in the detail panel is capped at 20 items (`.slice(0, 20)` at line 574) with no indication that the list is truncated.

**Impact**: A popular theme with 40+ evidence connections shows only 20 in the panel. Users may not realize they're seeing an incomplete picture.

### 10.10 Orphan Evidence Visual Distinction

**Problem**: Orphan evidence differs from non-orphan only by fill color (#E8D888 tan vs #CCCCCC gray). At evidence's small size (2-4px) and low opacity (0.2-0.6), this color difference is nearly imperceptible.

**Impact**: Orphan evidence — which represents data that couldn't be connected to any theme — goes unnoticed. The red "orphan" badge in the stats header shows the count, but users can't visually locate which evidence items are orphans.

### 10.11 Source Concentration Warning Subtlety

**Problem**: When >70% of a theme's evidence comes from a single source, the only visual indicator is a 4px red circle at the corner of the theme diamond. This is very easy to miss, especially when multiple themes are clustered at center.

**Impact**: Single-source bias in themes — a significant analytical risk — goes undetected unless users happen to notice the tiny red dot or hover over the theme.

### 10.12 Breadcrumb Tracing Fragility

**Problem**: The `buildBreadcrumbs()` algorithm traces edges in arbitrary order (first match wins) and uses a `visited` set to prevent infinite loops. Because edge directions are inconsistent (see 10.4), the algorithm may trace to an unexpected parent — e.g., a theme could trace to an evidence node rather than a source node if a `supported_by` edge happens to be encountered first.

**Impact**: Breadcrumb paths may not always show the most meaningful ancestry chain. A recommendation might show `Evidence X / Theme Y / Recommendation Z` instead of the more useful `Source A / Theme Y / Recommendation Z`.

### 10.13 Legend Incompleteness

**Problem**: The legend bar only shows 7 items: Source T1, Source T2, Source T3, Evidence, Orphan, Theme, Rec. Missing from the legend: Persona, Journey Stage, Feature, Roadmap Item, Gap, and the edge type meanings (solid vs dashed vs dotted lines).

**Impact**: Users encountering pentagons, triangles, or rounded rectangles have no visual guide explaining what they represent.

### 10.14 No Edge Type Legend

**Problem**: Edges use 3 different visual styles (solid, dashed `4,4`, dotted `2,2`) with 2 colors (chartreuse for `supported_by`, teal for `experiences`/`addresses`), but there is no legend explaining what these line styles mean.

**Impact**: Users cannot distinguish "theme supported by evidence" from "persona experiences theme" from "recommendation addresses theme" without hovering.

---

## 11. Summary of Key Metrics

| Metric | Value |
|--------|-------|
| Node types | 9 |
| Edge types | 5 |
| Concentric rings | 5 (center + 4 rings) |
| D3 forces | 4 (link, radial, charge, collision) |
| Label zoom thresholds | 4 levels (always, 0.8x, 1.2x, 1.8x) |
| Theme matching tiers | 4 (source name, direct evidence, citation node, keyword fallback) |
| Max evidence per source in Tier 1 | 3 |
| Keyword overlap threshold | 3 words (>4 chars each) |
| Connected nodes panel limit | 20 |
| Breadcrumb label truncation | 30 characters |
| Thin theme threshold | <3 evidence links |
| Source concentration warning | >70% from single source |
| Graph rebuild triggers | 8 dependencies |
| Auto zoom-to-fit duration | 800ms |
| Collision radius adaptive range | 20-50px base (based on node count) |
