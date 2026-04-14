# KNOWLEDGE GRAPH — EXPERT ANALYSIS & ELEVATION BLUEPRINT

> **Current assessment**: Solid technical foundation. Impressive progressive-growth animation. But functioning as a visualization novelty, not an analytical instrument.
> **Target state**: The dominant feature on the Research Assembly Board — an interactive synthesis workbench where consultants validate evidence chains, identify coverage gaps, challenge assumptions, and direct the research pipeline.
> **Metaphor shift**: From "pretty picture of the data" → "the consultant's operating table."

---

## PART 1: WHAT'S WORKING (AND WHY IT MATTERS)

Before the critique: this feature has genuine strengths that most knowledge graph implementations get wrong.

**1. Progressive growth is the killer feature.** The graph physically grows in front of the user as the pipeline completes stages — source clusters appear, then theme diamonds materialize and link to evidence, then persona photos appear with dashed connections, then recommendation hexagons attach. This is not just animation; it's a live visualization of the research process itself. Most KG implementations show you a finished graph. This one shows you the *thinking*. That's conceptually brilliant and should be preserved and amplified.

**2. The type system is well-designed.** Five node types (source, evidence, theme, persona, recommendation) mapped to five distinct shapes (circle, rectangle, diamond, circle-with-photo, hexagon) with five edge types (from, supported_by, experiences, addresses, quoted_in). The visual encoding is correct — you can distinguish types at a glance without reading labels. This is better than most D3 graph implementations.

**3. The detail panel on click is the right interaction model.** Clicking a theme node surfaces the description, a supporting quote with the chartreuse left border, and source attribution. This follows Shneiderman's visual information-seeking mantra: overview first, zoom and filter, then details on demand.

**4. The filter buttons work.** The type filters (ALL, SOURCE, EVIDENCE, THEME, PERSONA, RECOMMENDATION) instantly isolate node types — a genuine analytical capability that lets you examine one layer of the synthesis hierarchy at a time.

**5. The Reasoning Stream integration is smart.** The right-side panel showing pipeline stage progress (Detecting, Learning, Intervention) alongside the graph creates a sense of the system "working" — it's transparent about its process, which builds trust.

---

## PART 2: THE FIVE CRITICAL PROBLEMS

### PROBLEM 1: The Evidence View Is Useless

When you click the EVIDENCE (439) filter, you see 439 tiny dots scattered randomly across the canvas. No labels. No clustering. No structure. No color differentiation. Just... noise.

This is the most damning failure in the visualization because **evidence IS the product.** The entire value proposition of the platform is that it gathers and synthesizes evidence. Showing 439 evidence nodes as indistinguishable dots communicates that the system doesn't understand or value its own evidence.

**Why this happens technically**: Evidence nodes are fixed at 8px size with labels hidden (the code only shows labels for nodes with size > 10). They have no clustering force pulling them toward their parent source. The D3 charge force (-200 repulsion) pushes them apart uniformly, destroying any structural relationship.

**What it should be**: Evidence should cluster visibly around its source, forming recognizable constellations. An evidence node pulled from the Hechinger Report should be NEAR the Hechinger Report source node. Evidence cited by a theme should show visible connective tissue to that theme. The evidence view should look like a field of galaxies — dense clusters around sources with connecting filaments to themes — not a random scattering of dust.

### PROBLEM 2: Only 13 Themes for 439 Evidence Nodes

The synthesis ratio is 439:13 — each theme averages 34 evidence nodes. But the screenshots suggest that most evidence nodes have NO theme connection at all. The themes cluster tightly in the center while evidence dots scatter to the periphery with no visible edges between them.

This reveals a pipeline problem, not just a visualization problem: **the theme extraction is under-synthesizing.** 13 themes for 67 sources and 439 evidence items means the AI is producing high-level umbrella themes ("Digital Transformation and AI Integration for Operational Efficiency") instead of granular, actionable insights.

A better synthesis would produce 30-50 themes organized into 5-7 theme clusters (meta-themes). The hierarchy should be: Evidence → Theme → Theme Cluster → Strategic Pillar. Right now it's Evidence → (gap) → Theme, with most evidence orphaned.

### PROBLEM 3: Theme Labels Are Truncated

Every theme label in the THEME filter view is cut off: "Evolving Donor Demographi...", "Impact of Donor-Advised F...", "AI-Powered Engagement and...", "Digital Transformation an...", "Heightened Scrutiny on Do...". The labels are truncated to 25 characters in the code.

This is the SAME truncation problem that plagues every other deliverable, now affecting the one feature that's supposed to make the research legible. A consultant looking at the theme view can't even read what the themes ARE.

### PROBLEM 4: Source Nodes Show No Credibility Signal

When filtering to SOURCE (67), you see varying-sized gray circles with labels (WIRED AI, europe_pmc, Reddit: r/Nonprofit, Hechinger Report, ecampus, OpenAI, SEC EDGAR, World Bank, ERIC). These are all treated visually the same — dark gray circles — despite having wildly different credibility levels.

Academic databases (ERIC, europe_pmc, CVPR), government sources (SEC EDGAR, World Bank), and specialist publications (Hechinger Report) should look fundamentally different from Reddit subreddits (r/Nonprofit, r/Philanthropy, r/HigherEd, r/Charity, r/Fundraising) and YouTube channels. The tier badge (T1/T2/T3) exists in the data model but has almost no visual expression in the graph.

### PROBLEM 5: No Traversal Across the Synthesis Hierarchy

The graph shows nodes but doesn't let you NAVIGATE the evidence chain. If a consultant sees the theme "Financial Instability and..." and wants to understand:

- What evidence supports this theme?
- Which sources does that evidence come from?
- Which personas experience this pain?
- Which recommendations address it?

...they currently can't. Clicking the theme shows a text panel. But they can't click-through to the evidence, from there to the source, and verify the chain. The graph is a static picture, not an analytical instrument. There's no "follow the thread" capability.

---

## PART 3: THE ELEVATION VISION

### THE GRAPH SHOULD BE THE OPERATING TABLE

Reframe the knowledge graph from "visualization of the data" to "the interface WHERE the consultant works." It should be the primary workspace — not a sidebar feature, not a supplementary view. The Research Assembly Board should CENTER on the graph, with deliverables generated FROM the graph context.

Think of it like this: the current flow is Pipeline → Data → Deliverables (with a graph visualization on the side). The elevated flow is Pipeline → Graph (consultant validates, adjusts, explores) → Deliverables (generated from the validated graph state).

### DESIGN PRINCIPLE: Semantic Zoom

The graph should behave differently at different zoom levels, like a map:

**Zoom level 1 — Strategic landscape (default)**: Show theme clusters as large labeled regions (like countries on a map). Each region contains its member themes as smaller diamonds. Source credibility is visible as a background heatmap. Evidence is aggregated — you see density, not individual dots. Personas float at the edges with connection lines to the theme regions they relate to. Recommendations are badges attached to the themes they address.

**Zoom level 2 — Theme deep-dive (on click or zoom-in)**: One theme expands to show all its supporting evidence as labeled cards. Each card shows: title, source, date, confidence, key data point. Evidence is clustered by source. Connections to other themes are visible as edge bundles leaving the viewport.

**Zoom level 3 — Evidence inspection (on evidence click)**: Full text of the evidence item. Source metadata. Cross-references to every theme and persona that cites it. "Challenge this" button that lets the consultant mark evidence as weak, outdated, or irrelevant. "Promote this" button that flags high-impact evidence for emphasis in deliverables.

### SPECIFIC FEATURE RECOMMENDATIONS

#### F-01: Evidence Clustering by Source

**Current**: Evidence nodes scatter randomly.
**Proposed**: Apply a secondary clustering force that pulls evidence nodes toward their parent source. Use a D3 forceRadial or custom positioning to arrange evidence in a ring or cluster around each source node. When zoomed out, the cluster appears as a dense mass with a source label. When zoomed in, individual evidence cards become visible.

```typescript
// Add to force simulation:
simulation.force('cluster', forceCluster()
  .centers(sourceNodes)  // Pull evidence toward parent source
  .strength(0.3)         // Moderate clustering
  .radius(d => d.type === 'evidence' ? 40 : 0)  // Only evidence clusters
);
```

#### F-02: Source Credibility Tiers as Visual Encoding

**Current**: All sources are gray circles of varying size.
**Proposed**: Three distinct visual treatments by tier:

| Tier | Appearance | Example Sources |
|---|---|---|
| T1 (Academic/Gov) | Solid black fill, white label, crisp 1px border | ERIC, europe_pmc, SEC EDGAR, World Bank, CVPR, ACL |
| T2 (Industry/News) | Dark gray fill (#444), white label | Hechinger Report, WIRED AI, ecampus, Higher Ed Dive |
| T3 (Community/UGC) | Light gray outline (#CCC), gray label, dashed border | Reddit subreddits, YouTube, yt_lex_fridman |

The visual hierarchy instantly communicates: "This claim rests on a T1 source" vs "This claim rests on Reddit r/Fundraising."

Additionally, the source detail panel should show:
- Total evidence items contributed
- How many themes cite this source
- Credibility tier with explanation
- Date range of evidence items
- "Flag for review" action if credibility is questionable

#### F-03: Theme Hierarchy (Themes → Theme Clusters → Strategic Pillars)

**Current**: 13 flat themes, all the same visual weight.
**Proposed**: Three levels of synthesis:

**Level 1 — Strategic Pillars (3-5)**: These map to the Rumelt-style strategy. "Data Unification," "AI-Powered Personalization," "Trust & Governance." Visualized as large semi-transparent regions on the graph canvas — like colored continents.

**Level 2 — Themes (20-40)**: Current theme nodes, but more granular. Each theme belongs to exactly one pillar and is positioned within that pillar's region. Size encodes evidence density. Color encodes the pillar.

**Level 3 — Evidence (existing)**: Clusters around their source AND connects to their theme(s).

This creates a navigable hierarchy: Pillar → Theme → Evidence → Source.

To generate more granular themes, the theme extraction prompt needs revision:

```
"Extract 30-50 specific themes from the evidence base. Each theme must be:
1. Specific enough to be falsifiable (not 'Digital Transformation')
2. Connected to at least 3 evidence nodes
3. Tagged to one of 3-5 strategic pillars
4. Named as a complete finding: 'Donor retention drops 18% when communications
   aren't personalized' NOT 'Personalization Challenges'"
```

#### F-04: Full-Text Labels with Progressive Disclosure

**Current**: Labels truncated to 25 characters.
**Proposed**: Three-level label system:

- **Zoom level 1**: Short label (25 chars) — current behavior
- **Zoom level 2**: Medium label (60 chars) — shows on mild zoom or hover
- **Hover tooltip**: Full label + subtitle + evidence count + confidence badge

For themes specifically, the label should be the FINDING, not the topic:
- BAD: "Evolving Donor Demographi..."
- GOOD: "Millennial donors prioritize impact over loyalty (7 sources)"

```typescript
// Dynamic label rendering based on zoom:
const labelText = zoomLevel > 1.5
  ? node.label.slice(0, 60)
  : node.label.slice(0, 25);
```

#### F-05: Evidence Chain Traversal (Click-Through Navigation)

**Current**: Click a node → see a text panel.
**Proposed**: Click a node → graph REFOCUSES on that node, showing its full neighborhood.

When you click a Theme:
1. The graph smoothly animates to center on that theme
2. All connected evidence nodes expand from the cluster to show labels
3. Source nodes for those evidence items highlight
4. Connected persona and recommendation nodes pull closer
5. All unrelated nodes fade to 10% opacity
6. A breadcrumb appears: "All → Theme: Evolving Donor Demographics"
7. Clicking an evidence node refocuses again: "All → Theme → Evidence: BofA Study 2025"

This is the "follow the thread" capability. The consultant can trace any claim from recommendation → theme → evidence → source, validating the entire chain.

```typescript
// On theme node click:
const neighbors = getConnectedNodes(clickedNode);
const fadeNodes = allNodes.filter(n => !neighbors.includes(n));

// Animate fade
fadeNodes.transition().duration(300).attr('opacity', 0.1);
neighbors.transition().duration(300).attr('opacity', 1);

// Zoom to fit neighborhood
const bounds = getBoundingBox(neighbors);
svg.transition().duration(500).call(zoom.transform, fitBounds(bounds));
```

#### F-06: Coverage Gap Detection

**Current**: No indication of which source areas are under-represented.
**Proposed**: The graph should visually signal gaps:

- **Orphan evidence** (evidence connected to a source but no theme): Show as orange/amber dots with a subtle pulsing animation. These are evidence items the AI didn't synthesize into any theme — they might contain overlooked insights.
- **Thin themes** (themes with <3 evidence connections): Show with a dashed border instead of solid. These are hypotheses, not findings.
- **Missing perspectives** (pillars with no persona connections): The pillar region gets a warning indicator: "No persona experiences this pillar's themes — possible blind spot."
- **Source concentration risk** (a theme where >70% of evidence comes from 1 source): Show the theme with a caution marker. Single-source themes are fragile.

This transforms the graph from a display into a diagnostic tool. The consultant can instantly see: "This theme is well-supported across 6 sources" vs "This theme rests entirely on one Reddit post."

#### F-07: Consultant Interaction Layer

**Current**: The graph is read-only (except for drag/zoom).
**Proposed**: Add three consultant actions:

**1. Challenge**: Right-click or long-press an evidence node → "Challenge this evidence." Marks it with a red indicator. Challenged evidence is excluded from deliverable generation until resolved. The consultant can add a note: "This stat is from 2023 — verify if still current."

**2. Promote**: Right-click → "Promote to key finding." Marks it with a chartreuse star. Promoted evidence gets priority placement in deliverables — it appears in executive summaries, strategy decks, and recommendation cards.

**3. Merge/Split themes**: Drag one theme onto another to merge them. Or right-click → "Split theme" to break a too-broad theme into sub-themes. This lets the consultant refine the AI's synthesis directly in the graph.

These actions create a feedback loop: the consultant's judgment improves the knowledge base, and subsequent deliverable generation reflects that judgment.

#### F-08: Graph-to-Deliverable Connection

**Current**: The graph and deliverables are separate features in separate tabs.
**Proposed**: Bidirectional linking.

**Graph → Deliverable**: Select a set of themes and evidence in the graph → click "Generate strategy section from selection." The system generates a focused deliverable section using ONLY the selected evidence, properly cited.

**Deliverable → Graph**: Every evidence citation in a deliverable is a clickable link that highlights the corresponding node in the knowledge graph. The consultant can verify any claim by clicking it and seeing the evidence chain in context.

This makes the graph the SOURCE OF TRUTH for all deliverables, not just a parallel visualization.

---

## PART 4: VISUAL DESIGN WITHIN NXT HUMANS BRAND

The knowledge graph should use NXT Humans brand elements without compromise:

### Color System

| Node Type | Fill | Stroke | Label Color |
|---|---|---|---|
| Source (T1) | #0D0D0D (black) | none | #FFFFFF |
| Source (T2) | #444444 | #666666 0.5px | #FFFFFF |
| Source (T3) | transparent | #CCCCCC 1px dashed | #999999 |
| Evidence | #F5F5F0 (panel) | #E0E0E0 0.5px | #666666 |
| Evidence (orphan) | #FFF8E1 (warning) | #B8B800 0.5px | #666666 |
| Theme | #B8B800 (chartreuse) | #0D0D0D 1px | #0D0D0D |
| Theme (thin) | transparent | #B8B800 1px dashed | #B8B800 |
| Persona | (photo w/ grayscale filter) | #0D0D0D 2px | #FFFFFF |
| Recommendation | #00B7C3 (cyan) | #0D0D0D 1px | #0D0D0D |

### Edge System

| Edge Type | Color | Width | Pattern |
|---|---|---|---|
| from (source→evidence) | #E0E0E0 | 0.5px | solid |
| supported_by (theme→evidence) | #B8B800 | 1.5px × weight | solid |
| experiences (persona→theme) | #00B7C3 | 1px | dashed 4,4 |
| addresses (rec→theme) | #00B7C3 | 1.5px | solid |
| challenged (consultant flag) | #E24B4A | 1px | dotted 2,2 |

### Typography
- Graph header: Bebas Neue 14px, letter-spacing 3px
- Node labels: Archivo 10px, max-width 150px
- Detail panel: Archivo 13px body, Bebas Neue for section labels
- Filter buttons: Archivo 11px, uppercase, letter-spacing 1px
- Stats/counts: JetBrains Mono 11px

### Layout
- The graph should occupy at minimum 60% of the Research Assembly Board viewport width
- Detail panel slides in from the right (320px wide) over the graph, not beside it
- Filter bar is fixed at the top of the graph viewport
- Legend is fixed at the bottom
- Breadcrumb navigation appears between the filter bar and the graph when drilling down

---

## PART 5: TECHNICAL CHANGES

### Change 1: Increase theme granularity (pipeline change)

The theme extraction prompt must produce 30-50 themes, not 13. Each theme must be a specific finding, not a broad topic. Group themes into 3-5 strategic pillars.

### Change 2: Add hierarchical clustering forces

Replace the single flat force simulation with a hierarchical one:

```typescript
// Pillar-level: gentle attraction to pillar centroid
simulation.force('pillar', forcePillar(pillarAssignments, 0.05));

// Source-level: evidence clusters around parent source
simulation.force('sourceCluster', forceRadial(
  d => d.type === 'evidence' ? 60 : null,  // radius
  d => getParentSource(d).x,                // cx
  d => getParentSource(d).y                 // cy
).strength(0.3));

// Keep existing: charge, collision, center, link
```

### Change 3: Implement semantic zoom

Use D3 zoom events to show/hide label detail:

```typescript
zoom.on('zoom', (event) => {
  const k = event.transform.k;
  // Level 1: k < 1.2 — short labels, evidence hidden
  // Level 2: k 1.2-2.5 — medium labels, evidence labels visible
  // Level 3: k > 2.5 — full labels, evidence content preview
  updateLabelDetail(k);
  updateNodeVisibility(k);
});
```

### Change 4: Add breadcrumb navigation state

```typescript
const [focusPath, setFocusPath] = useState<FocusNode[]>([]);
// [] = full graph view
// [{ type: 'theme', id: '...' }] = focused on theme neighborhood
// [{ type: 'theme', id: '...' }, { type: 'evidence', id: '...' }] = drilled into evidence
```

### Change 5: Add consultant action handlers

```typescript
const handleChallenge = (nodeId: string, note: string) => {
  updateNode(nodeId, { status: 'challenged', challengeNote: note });
  // Propagate: if evidence is challenged, themes citing it lose confidence
  recalculateThemeConfidence(nodeId);
};

const handlePromote = (nodeId: string) => {
  updateNode(nodeId, { status: 'promoted' });
  // Promoted evidence gets priority in deliverable generation
};
```

---

## PART 6: IMPLEMENTATION PRIORITY

### Phase 1 — Fix What's Broken (1 week)
1. Fix label truncation — show full theme names in theme view
2. Source credibility visual tiers (T1/T2/T3 distinct appearances)
3. Evidence clustering around parent source (forceRadial)
4. Orphan evidence highlighting (amber for unconnected)

### Phase 2 — Build the Analytical Workbench (2-3 weeks)
5. Click-to-focus with neighborhood expansion
6. Breadcrumb navigation
7. Semantic zoom (3 levels of label detail)
8. Theme hierarchy (pillars → themes → evidence)
9. Coverage gap indicators

### Phase 3 — Consultant Interaction Layer (2-3 weeks)
10. Challenge/Promote actions on evidence
11. Graph-to-deliverable selection
12. Deliverable-to-graph citation linking
13. Theme merge/split

### Phase 4 — Pipeline Enhancement (ongoing)
14. Increase theme granularity to 30-50
15. Theme-to-pillar automatic grouping
16. Source concentration risk detection
17. Cross-source convergence scoring

---

## THE BOTTOM LINE

The knowledge graph is the single feature that DIFFERENTIATES Humans in Control from every other research automation tool. Anyone can generate personas and strategy decks with an LLM. But a live-growing, interactive evidence graph that lets consultants trace every claim from recommendation → theme → evidence → source? That's an analytical instrument. That's what makes a VP of CX trust the output — not because the deliverables look pretty, but because they can SEE the evidence chain and validate it themselves.

Right now it's a novelty sidebar. It should be the centerpiece. Build toward the vision where a consultant can:

1. Watch the graph grow as research streams in
2. See which themes are well-supported (solid chartreuse diamonds) vs thin (dashed outlines)
3. See which evidence is from T1 academic sources vs T3 Reddit posts
4. Click a theme to see its full evidence neighborhood
5. Challenge weak evidence, promote strong evidence
6. Select a cluster of themes and say "generate the strategy section for these"
7. Open the resulting strategy deck, click any citation, and see it highlighted in the graph

That's not a visualization. That's a competitive moat.
