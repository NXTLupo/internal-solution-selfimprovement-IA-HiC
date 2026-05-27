---
name: mind-map-architect
version: 1.0
description: Reads BERTopic v2 output (clusters with parent_topic relationships from HDBSCAN hierarchy) + research_goal, emits a nested JSON mind-map (max depth 4, max 7 children per node) where each node carries chunk_ids[] references for click-to-chat drill-down. Convergent-evidence clusters get a visual_treatment flag for the Designer Window renderer. Inspired by NotebookLM's Mind Map deliverable; differentiated by HiC's source-stratification flag that NotebookLM categorically cannot match. The Phase 4 deliverable of the NotebookLM uplift plan.
thinking: high
category: deliverable-composer
triggers:
  - mindmap
  - mind map
  - "#mindmap"
  - cluster hierarchy visualization
---

# Mind Map Architect

## You Are

The skill that turns BERTopic's flat-but-hierarchically-related cluster output into a navigable mind-map artifact. NotebookLM's Mind Map is one of their most-used Studio features after Audio Overview. The deliverable is structurally simple — a nested JSON the renderer can draw as a force-directed tree — but the value comes from picking the right *parent groupings* so the map tells a coherent story.

HiC's mind-map differs from NotebookLM's on two axes:
1. **Source stratification flag.** Each node carries `convergent_evidence: true` if the underlying cluster merged across ≥2 source types. Renderer treats these visually (cyan ring per NXT brand). NotebookLM doesn't categorize sources, so cannot match.
2. **Click-to-chat with parent path context.** Clicking a node calls `sendPrompt('Tell me more about [node label] in the context of [parent path]')`. The parent path provides epistemic context the user needs to drill correctly.

## When to activate

- User invokes `#mindmap` hashtag in Analyst Chat
- Post-collection automatic mind-map generation if `outputMode: 'mindmap'` is set
- Re-generation when a user clicks "regenerate mind-map" on an existing artifact

Do NOT activate when:
- Corpus has < 20 documents (mind-map collapses to a list)
- BERTopic v2 returned < 5 clusters (not enough structure to map)
- The user is in chat workbench iterating; mind-map is a deliverable, not an answer

## Input contract

```typescript
type MindMapInput = {
    topics: Array<{
        id: number;
        name: string;
        summary: string;
        post_count: number;
        top_terms: Array<[string, number]>;
        post_ids: string[];
        centroid: [number, number];
        convergent_evidence: boolean;
        source_types: string[];
        distinct_source_count: number;
        // Optional HDBSCAN parent_topic relationships
        parent_topic?: number | null;
    }>;
    research_goal: string;
    target_depth?: number;       // default 4
    max_children_per_node?: number;  // default 7
};
```

## Output contract

```typescript
type MindMapNode = {
    id: string;                  // node_<topic_id> or synthetic for grouping nodes
    label: string;               // 3-6 words
    summary: string;             // one-sentence description
    type: 'root' | 'theme_group' | 'theme' | 'sub_theme';
    convergent_evidence?: boolean;
    source_types?: string[];
    chunk_ids: string[];          // post_ids from the underlying cluster(s)
    parent_path: string[];       // ancestor labels for click-to-chat context
    children: MindMapNode[];
    visual_treatment?: 'convergent' | 'thin_evidence' | 'standard';
};

type MindMapOutput = {
    root: MindMapNode;           // single root with research_goal as label
    node_count: number;
    max_depth_achieved: number;
    convergent_count: number;
    rendering_hint: {
        layout: 'radial_tree' | 'horizontal_tree';
        recommended_canvas: { width: number; height: number };
    };
};
```

## The 4-step protocol

### Step 1 — Cluster the clusters (grouping pass)

For corpora producing >7 BERTopic clusters, group them. Use top_terms cosine similarity + source_type overlap as grouping signals. Aim for 3-7 top-level groups, each containing 2-5 themes.

This pass uses Sonnet 4.6 in tool-use mode with a strict JSON schema:

```yaml
prompt:
  - Here are 20 themes from BERTopic clustering of {research_goal}.
  - Group them into 3-7 top-level categories by topic family.
  - For each group, write a 3-6 word label and 1-sentence summary.
  - A theme belongs to exactly one group.
  - Return ONLY:
    {
      "groups": [
        {"label": "...", "summary": "...", "theme_ids": [1, 4, 7, 12]},
        ...
      ]
    }
```

### Step 2 — Build the tree

```yaml
root:
  label: <research_goal> (truncated to 6 words)
  type: root
  children: [
    for each group from Step 1:
      theme_group node:
        label: <group label>
        summary: <group summary>
        type: theme_group
        chunk_ids: <union of all chunk_ids from member themes>
        children: [
          for each theme in group:
            theme node:
              label: <theme name>
              summary: <theme summary>
              type: theme
              convergent_evidence: <from topic>
              source_types: <from topic>
              chunk_ids: <topic.post_ids>
              children: []  // depth 3 by default
        ]
  ]
```

### Step 3 — Optional depth 4 split

For themes with >15 supporting chunks AND >2 source types, consider splitting into 2-3 sub-themes by re-clustering the chunks. Use BERTopic again with `min_cluster_size=3` on just those chunks.

Skip this step for the v1 implementation; ship depth-3 first.

### Step 4 — Visual treatment + parent_path

For each node:
- `convergent_evidence` flag propagates from theme → group (true if any child is convergent)
- `visual_treatment`:
  - `'convergent'` if convergent_evidence=true
  - `'thin_evidence'` if distinct_source_count < 2 (warn the renderer)
  - `'standard'` otherwise
- `parent_path` is computed during tree walk: each node's parent_path is its parent's parent_path + parent's label

## Hard rules

1. **Depth cap is mandatory.** No mind-map deeper than `target_depth` (default 4). Visualization complexity grows exponentially.
2. **Children cap is mandatory.** No more than `max_children_per_node` (default 7) children per node. Force grouping when the count would exceed.
3. **Chunk_ids propagate up.** Every grouping node carries the union of its children's chunk_ids so click-to-chat at any level can scope the corpus retrieval.
4. **parent_path is required.** Click-to-chat depends on it.
5. **No emoji.** Repo-wide rule.
6. **Deterministic for the same input.** Given the same BERTopic topics + research_goal, the mind-map must be byte-identical across runs. Use temperature=0 on the Sonnet grouping pass; seed = stable_hash(research_goal, sorted_topic_ids).

## Composition

- **Input from:** `proxy/topic_modeling.py` `run_pipeline_v2` output OR cached topic-cache file
- **Calls:** Sonnet 4.6 at temperature=0 with seed for the grouping pass
- **Output rendered by:** Designer Window using d3-hierarchy + d3-tree (radial layout for depth ≤3; horizontal for depth 4)
- **Click-to-chat target:** `sendPrompt('Tell me more about [node.label] in the context of [node.parent_path.join(" → ")]')`
- **Export:** PNG via existing `export-paint-sync` path
- **Pairs with:** `critic-revise-loop` if user invokes `#mindmap-refine` — `contradiction-finder` critic checks each grouping for internally-contradictory themes
