---
name: meta-themes
version: 1.0
description: Phase 6 of the NotebookLM uplift plan. Activates the cross-engagement-pattern-miner output as a first-class deliverable. Reads all engagements/<slug>/themes.json files + wiki/synthesis/cross-engagement-patterns.md. Surfaces themes that recur across ≥3 engagements as "portfolio patterns" — themes that appear in ≥5 engagements get a special "platform pattern" treatment. The differentiation NotebookLM categorically cannot do because they have no concept of an engagement portfolio. This is HiC's most defensible feature for the consulting partner audience.
thinking: high
category: cross-engagement-synthesis
triggers:
  - "#meta-themes"
  - portfolio patterns
  - cross-engagement themes
  - themes across engagements
---

# Meta-Themes

## You Are

The skill that turns HiC's engagement portfolio into a recurring-pattern view the user cannot get anywhere else. Single-engagement themes answer "what's true about THIS client." Meta-themes answer "what's true across all your work." NotebookLM has no concept of an engagement portfolio; this is uncopyable.

## When to activate

- User invokes `#meta-themes` hashtag
- Knowledge Library "Portfolio Patterns" view loads
- Weekly `/loop` cron schedule (refreshes the underlying pattern file via `cross-engagement-pattern-miner` skill)

Do NOT activate when:
- The engagement count is < 3 (no portfolio yet)
- The user is in single-engagement chat (this is a portfolio-scope feature)

## Input contract

```typescript
type MetaThemesInput = {
    engagement_root: string;     // typically 'hic-workspace/wiki/engagements/'
    cross_engagement_patterns_path?: string;  // 'wiki/synthesis/cross-engagement-patterns.md'
    min_engagement_count_for_pattern?: number;  // default 3
    platform_pattern_threshold?: number;        // default 5 — themes in this many engagements get "platform" treatment
};
```

## Output contract

```typescript
type MetaTheme = {
    canonical_name: string;
    canonical_summary: string;
    engagement_appearances: Array<{
        engagement_slug: string;
        engagement_goal: string;
        theme_name_in_that_engagement: string;
        thematic_relevance: 'exact' | 'close' | 'analogous';
    }>;
    source_types_represented: string[];
    pattern_tier: 'portfolio' | 'platform';   // platform = appears in ≥platform_pattern_threshold
    first_observed_at: string;
    last_observed_at: string;
};

type MetaThemesOutput = {
    portfolio_pattern_count: number;
    platform_pattern_count: number;
    patterns: MetaTheme[];           // sorted by engagement_appearances.length desc
    not_yet_a_pattern: Array<{       // themes in 2 engagements — almost a pattern
        candidate_name: string;
        engagements: string[];
    }>;
};
```

## The 4-step protocol

1. **Load every `engagements/<slug>/themes.json`** under the engagement root
2. **For each pair of themes across engagements:** compute name + summary similarity (Jaccard on tokenized name + embedding cosine on summary)
3. **Cluster equivalent themes:** any theme name appearing in ≥3 engagements (similarity ≥0.7) is a portfolio pattern; ≥5 is a platform pattern
4. **Emit canonical names** for each cluster (use Sonnet 4.6 to pick the clearest of the variants)

## Hard rules

1. **No false equivalences.** A theme in 3 unrelated industries is more meaningful than a theme in 3 engagements with the same client. Cluster by `engagement_slug` distinctness.
2. **No client identifiers in plaintext.** Use engagement slugs throughout.
3. **Convergent-evidence flag propagates.** A pattern is convergent if at least 2 of its constituent themes are convergent.
4. **Reproducibility hash on the output.** Same engagement set → same meta-themes.
5. **No emoji.** Repo-wide rule.

## Composition

- **Reads from:** `engagements/<slug>/themes.json` (per engagement) + `wiki/synthesis/cross-engagement-patterns.md` (background)
- **Calls:** Sonnet 4.6 at temp=0 for canonical naming pass
- **Rendered by:** Knowledge Library "Portfolio Patterns" view (new React component)
- **Surfaced via:** `#meta-themes` hashtag; auto-loaded by `loadGenerationContext()` so individual engagement generations carry "this client's pattern matches portfolio pattern X" context
- **Pairs with:** `cross-engagement-pattern-miner` skill which produces the underlying `wiki/synthesis/cross-engagement-patterns.md` log
