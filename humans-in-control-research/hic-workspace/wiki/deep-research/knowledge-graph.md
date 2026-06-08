---
id: deep-research/knowledge-graph.md
title: "Knowledge Graph Architecture"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [knowledgeGraphBuilder.ts]
confidence: high
status: active
tags: [knowledge-graph, evidence-chain, citation, source-tracking]
evidence_count: 0
chunks:
  - id: "deep-research/knowledge-graph.md#c0"
    char_span: [0, 504]
    sentence_count: 4
    key_terms: [evidence, source, graph, knowledge, knowledgegraphbuilder, themes, recommendations, recommendation]
    token_count: 90
  - id: "deep-research/knowledge-graph.md#c1"
    char_span: [522, 2559]
    sentence_count: 13
    key_terms: [metadata, nodes, color, size, evidence, source, fields, label]
    section: Node Types
    token_count: 497
  - id: "deep-research/knowledge-graph.md#c2"
    char_span: [2577, 3330]
    sentence_count: 1
    key_terms: [evidence, links, themes, weight, theme, content, source, edge]
    section: Edge Types
    token_count: 189
  - id: "deep-research/knowledge-graph.md#c3"
    char_span: [3350, 3946]
    sentence_count: 1
    key_terms: [tier, tier-dependent, acacac, fd8e2e, evidence, sources, colors, source]
    section: Color Scheme
    token_count: 186
  - id: "deep-research/knowledge-graph.md#c4"
    char_span: [3971, 6174]
    sentence_count: 13
    key_terms: [evidence, source, create, node, theme, citation, graph, nodes]
    section: Builder Functions
    token_count: 487
  - id: "deep-research/knowledge-graph.md#c5"
    char_span: [6176, 7827]
    sentence_count: 10
    key_terms: [recommendation, string, node, number, source, theme, evidence, edges]
    section: Builder Functions / Evidence Traceability / Graph Data Model
    token_count: 376
  - id: "deep-research/knowledge-graph.md#c6"
    char_span: [7859, 8657]
    sentence_count: 5
    key_terms: [graph, knowledge, wiki, research, chains, accumulated, evidence, provides]
    section: Relationship to the Wiki
    token_count: 157
---
# Knowledge Graph Architecture

The HiC Research platform builds an interactive knowledge graph as each stage
of the analysis pipeline completes. The graph starts with source and evidence
nodes after data collection, then expands incrementally as themes, personas,
and recommendations are extracted. This provides full evidence traceability:
from any recommendation, a user can trace backward through themes to evidence
chunks to the original source document.

Source: `services/knowledgeGraphBuilder.ts`


## Node Types

The graph contains five distinct node types, each representing a different
layer of the research hierarchy.

### 1. Source Nodes

Represent a data source that contributed items to the research corpus. Each
source node is sized proportionally to its item count (base 20, plus 2 per
item, capped at +30). Sources carry a credibility tier (1-3) that determines
their color and the weight given to their evidence downstream.

**Fields**: `id`, `label` (source name without parenthetical notes), `tier`,
`color` (tier-based), `size`, `metadata.itemCount`, `metadata.query`.

### 2. Evidence Nodes

Individual pieces of evidence extracted from a source. Each source contributes
up to 8 evidence nodes in the initial graph build. Evidence nodes are small
(size 8) and inherit their source's tier color.

**Fields**: `id`, `label` (title truncated to 50 chars), `tier`, `url`,
`freshnessScore`, `relevanceScore`, `color` (tier-based), `size`,
`metadata.content` (first 200 chars), `metadata.date`.

### 3. Theme Nodes

Patterns and themes extracted during the THEMES pipeline stage. Theme nodes
are larger (base 25, plus 3 per citation), reflecting their importance as
analytical constructs that aggregate multiple evidence points.

**Fields**: `id`, `label` (theme name), `color` (lime #caca20 for active,
gray #e5e5e5 for skipped), `size`, `metadata.description`, `metadata.quote`,
`metadata.status` (priority, active, or skipped).

### 4. Persona Nodes

Research-grounded user archetypes synthesized during the PERSONAS stage.
All persona nodes use a consistent blue color and size 22.

**Fields**: `id`, `label` (persona name), `imageUrl` (AI-generated portrait),
`color` (blue #00b1eb), `size`, `metadata.role`, `metadata.quote`,
`metadata.bio`.

### 5. Recommendation Nodes

Actionable recommendations generated during the RECOMMENDATIONS stage.
Green-colored with size 18.

**Fields**: `id`, `label` (recommendation title), `color` (green #0CCE6B),
`size`, `metadata.description`, `metadata.impact` (impact level),
`metadata.actionItems`.


## Edge Types

Five edge types connect the node layers into a traversable graph.

| Edge Type | Direction | Weight | Purpose |
|---|---|---|---|
| `from` | evidence -> source | 0.3 | Links evidence chunks to their originating data source |
| `supported_by` | theme -> evidence | 0.5-0.7 | Links themes to the evidence that supports them; weight 0.7 for direct matches, 0.5 for citation-created evidence |
| `experiences` | persona -> theme | 0.2-0.8 | Links personas to themes they experience; weight scales with keyword overlap (capped at 0.8) |
| `addresses` | recommendation -> theme | 0.6 | Links recommendations to the themes they propose to address |
| `quoted_in` | citation -> content | varies | Links inline citations to the content blocks where they appear |


## Color Scheme

### Tier Colors (Source and Evidence nodes)

| Tier | Color | Hex | Meaning |
|---|---|---|---|
| Tier 1 | Teal | #115054 | Peer-reviewed, government, or institutional sources |
| Tier 2 | Orange | #fd8e2e | Established news media, industry reports |
| Tier 3 | Gray | #acacac | Community sources, forums, social media |

### Node Type Colors

| Node Type | Color | Hex |
|---|---|---|
| Source | Tier-dependent | #115054 / #fd8e2e / #acacac |
| Evidence | Tier-dependent | #115054 / #fd8e2e / #acacac |
| Theme | Lime | #caca20 |
| Persona | Blue | #00b1eb |
| Recommendation | Green | #0CCE6B |


## Builder Functions

The graph is constructed incrementally through four builder functions, each
called as its corresponding pipeline stage completes.

### buildSourceGraph(sourceResults)

Called after data collection. Creates the initial source -> evidence graph.

**Input**: Array of source results, each containing `items[]`, `sourceId`,
`source` (display name), and `credibilityTier`.

**Process**:
1. For each source with at least one item, create a source node
2. For each item (up to 8 per source), create an evidence node
3. Connect each evidence node to its source with a `from` edge (weight 0.3)

**Output**: `KnowledgeGraph` with source and evidence nodes only.


### addThemesToGraph(graph, themes)

Called after theme extraction. Expands the graph with theme nodes and
`supported_by` edges.

**Process**:
1. For each theme, create a theme node sized by citation count
2. For each citation in the theme:
   - Search existing evidence nodes for a content match (by source name or
     text substring match on the first 30 characters)
   - If found: create a `supported_by` edge (weight 0.7) to that evidence node
   - If not found but citation has a URL: create a new evidence node for the
     citation, then connect with `supported_by` (weight 0.5)

This two-pass approach ensures that themes with strong citation chains build
dense subgraphs, while themes with weaker citations still have traceability
through dynamically created evidence nodes.


### addPersonasToGraph(graph, personas)

Called after persona synthesis. Adds persona nodes and `experiences` edges.

**Process**:
1. For each persona, create a persona node with image URL and metadata
2. For each existing theme node, compute keyword overlap between the theme
   label and the persona's bio + pain point labels
3. If overlap is 2 or more significant words (length > 3), create an
   `experiences` edge with weight proportional to overlap (capped at 0.8)

The keyword overlap heuristic provides a lightweight semantic linking
mechanism that avoids the cost of an AI call for every persona-theme pair.


### addRecommendationsToGraph(graph, recommendations)

Called after recommendation generation. Adds recommendation nodes and
`addresses` edges.

**Process**:
1. For each recommendation, create a recommendation node
2. For each theme node, compute keyword overlap between the theme label and
   the recommendation's title + description
3. If overlap is 2+ significant words, create an `addresses` edge (weight 0.6)


## Evidence Traceability

The graph architecture enables full-chain traceability. Starting from any
recommendation node, a user can:

1. Follow `addresses` edges to see which themes the recommendation targets
2. From each theme, follow `supported_by` edges to the evidence chunks
3. From each evidence chunk, follow `from` edges to the original data source
4. At the source node, inspect the credibility tier and query metadata

This chain -- recommendation -> theme -> evidence -> source -- is the
foundation of the platform's evidence-based decision support. Every
strategic recommendation can be validated against its supporting data.


## Graph Data Model

```typescript
interface KnowledgeGraph {
    nodes: KGNode[];
    edges: KGEdge[];
}

interface KGNode {
    id: string;
    type: 'source' | 'evidence' | 'theme' | 'persona' | 'recommendation';
    label: string;
    tier?: number;
    freshnessScore?: number;
    relevanceScore?: number;
    url?: string;
    imageUrl?: string;
    color?: string;
    size?: number;
    metadata?: Record<string, any>;
}

interface KGEdge {
    source: string;      // originating node ID
    target: string;      // destination node ID
    type: 'supported_by' | 'experiences' | 'addresses' | 'from' | 'quoted_in';
    weight: number;      // 0.0-1.0 strength
    label?: string;      // optional annotation (e.g., chunk ID)
}
```


## Relationship to the Wiki

The knowledge graph is the runtime, session-scoped representation of
research relationships. The wiki is the persistent, accumulated knowledge
store. The two systems are complementary:

- **Graph = live session**: built fresh for each research run, reflects the
  exact evidence chains for that specific analysis
- **Wiki = accumulated knowledge**: persists across sessions, grows over time,
  supports cross-study comparison and contradiction detection

When a research session completes, key graph structures (themes, evidence
chains, source attributions) should be persisted to the wiki for long-term
retention. The graph provides the citation chains; the wiki provides the
durable institutional memory.

Cross-references: [[deep-research/research-modes]], [[sources-registry/credibility-tiers]]
