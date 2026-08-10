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


## Dimensional Extensibility Contract

The hand-authored exemplar for this deliverable is a FLOOR, not a ceiling. It shows the
minimum viable shape; a real engagement should grow the artifact to the depth the data
and the client conversation justify. Treat every dimension below as an axis to populate
when there is evidence, and to expand on request.

### Dimensions this artifact can carry
- root / unifying theme
- major branches
- sub-nodes (depth <=4)
- per-leaf evidence citation
- cross-links between branches
- forest vs single-root decision

### When to add or deepen a dimension
1. EVIDENCE-DRIVEN (default). For each dimension above, populate it when the corpus /
   manifest contains supporting evidence (a named source plus a verbatim quote or named
   entity). More evidence means more dimensions populated and more items per dimension:
   volume of insight is proportional to volume of data (see the yield ledger). Never pad
   to fill a dimension; if the evidence is not there, omit the dimension rather than
   fabricate (No-Fabrication rule), and record it as available-on-future-data.
2. REQUEST-DRIVEN. When the user asks for changes or additions in the AI Analyst Desk
   chat or the Designer Chat, treat the request as authoritative. Add or expand the named
   dimension, re-grounding it in corpus evidence. If the user asks for a dimension the
   corpus cannot support, say so plainly and offer to ingest sources that would; do not
   invent content to satisfy the request.
3. SURGICAL RE-GENERATION. A chat-driven update is additive and anchored: preserve the
   approved content the user has not asked to change, modify only the named dimension
   (the reinforcement-inference anchored re-ask pattern). Do not silently rewrite the
   whole artifact on a scoped request.

### Invariants every added dimension must still satisfy
- Citation protocol: named sources, verbatim quotes; numbers only inside cited quotes
  (Quantitative Claim Rule).
- No slop, no meta-narration, no reporting-depth chrome.
- Purposeful color (red = pain, teal = need/fix, neutral = structure), block anchoring,
  AA contrast: the house style holds at any depth.
- The deliverable stays on-objective; added dimensions serve the engagement goal.

This is what makes the exemplars elegantly extensible: the same skill renders a thin
first pass on sparse data and a deep, multi-dimensional artifact on a rich corpus or an
engaged analyst, without a different code path.


## Representative-Content Firewall (exemplar vs real artifact)

A gold-standard EXEMPLAR for this deliverable lives in `hic-workspace/wiki/eval/exemplars/`. It uses
REPRESENTATIVE content to demonstrate the artifact's full dimensional depth, layout, and house style.
The exemplar's specific values (names, quotes, ratings, numbers, peer entities) are ILLUSTRATIVE
samples, NOT facts to reuse.

When generating a REAL artifact:
- Query the MANIFEST first to know what the corpus actually holds; populate every dimension ONLY from
  corpus-evidenced material (named source + verbatim quote or named entity).
- NEVER copy the exemplar's sample values, and NEVER invent data to match the exemplar's depth. If the
  corpus does not support a dimension, OMIT it or mark it explicitly (e.g. the competitive matrix marks
  a silent cell "No signal") -- do not hallucinate to fill the shape (No-Fabrication rule).
- Match the exemplar's STRUCTURE, dimensional coverage, and house style; do not match its CONTENT.
- Depth is proportional to evidence: a thin corpus yields a smaller (still honest) artifact; a rich
  corpus fills more dimensions and more items. Representative depth in the exemplar is the ceiling of
  FORM, never a quota to fabricate toward.

## Visual Output (GOLD design language)

Render to the canonical GOLD visual language. Full spec: `hic-workspace/wiki/design-system/gold-visual-language.md`.
Your reference twin(s): `mindmap-nu.html` / `mindmap-nxt.html` in `hic-workspace/wiki/design-system/gold/`.

Layout: Central hub (cool top-border) + hairline bus + drops to 4-5 branch nodes (accent top-border), each with 3 leaf items. Click-to-chat note in takeaway. CSS grid, no SVG absolute coords.

Invariants (from the spec): 1920x1080 stage, brand rail + 3x3 dot mark, IBM Plex Mono kicker,
serif(NU)/Archivo(NXT) action-title h1, dark takeaway band with exactly one accent-bold phrase.
Color is meaning (accent = pain/critical/diagnosis; cool = need/target/fix/source; neutral = structure).
NO eyebrow microlabels that color/position already convey (WHAT FRUSTRATES THEM, WHAT THEY NEED,
DESIGN RESPONSE, PROOF IT WORKED, PEAKS). NO em-dash. Content is data-dependent; the language is fixed.

---

## Cached-selection contract (2026-06-06, MANDATORY)

When the engagement manifest carries `cached_selection.theme_cluster_ids[]` or
`cached_selection.engagement_slugs[]` (the user explicitly selected prior
artifacts via the Knowledge Library), the `assembleEnhancedPrompt()` function
injects a `PRIOR CACHED SELECTION` block into your system prompt.

1. For each emitted item, set a `source` field:
   - `"cached"`   — carried forward unchanged from the user's selection
   - `"extended"` — carried forward with refinement on the new corpus
   - `"new"`      — from the new corpus, not in the selection

2. **NO FLOORS, NO OMISSIONS — 100% coverage required.** EVERY one of
   the user's selected items below MUST appear in your emission tagged
   `source: cached` or `source: extended`. The user explicitly curated
   them via the Knowledge Library; the manifest is the binding contract;
   silent omission of any selected id is rejected by the Stop hook
   `validate_cached_selection_honored.py` (coverage threshold raised
   from 60% to 100% on 2026-06-06). New corpus discoveries go in IN
   ADDITION to the cached set as `source: new`.


3. **Why this matters.** The user curated the Knowledge Library selection
   deliberately. Regenerating from scratch ignores their curation and breaks
   the recursive self-improvement loop. The product is
   `{cached + extended + new}`, not `{new alone}`.

4. **Trace + frontier.** The per-deliverable auditor reads `items[].source`
   and computes `cached_selection_coverage_pct` as a qualityFrontier dim
   (direction: maximize, floor: 100). Epoch proposer mines low-coverage
   patterns as candidate skill-edit interventions.

## THE ACTOR RULE (anti-slop, 2026-08-07, binding on every generated sentence)

Two tests every user-visible sentence must pass, on top of the banned-phrase lexicon in
`.claude/CLAUDE.md`:

1. NAME THE ACTOR. Every claim states who or what acts: a named team, system, person, or
   audience. Abstract nouns (engagement, advancement, alignment, transformation, adoption)
   never act; dramatic verbs (leaks, dies, bleeds, unlocks, erodes, cannot see) never
   substitute for the mechanism. Ground cause and effect: X fails because Y, so Z happens.
   BAD: "Engagement leaks at three stages advancement cannot see."
   GOOD: "Alumni drop off at three stages the advancement team cannot see."

2. READ IT ALOUD. If a real person would not say the sentence out loud, rewrite it. Kill
   broken grammar, buzzwords forced into the wrong part of speech, and word-salad
   compression. Plain subject, direct verb, concrete object; delete every word that adds no
   fact or step.
