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


## Dimensional Extensibility Contract

The hand-authored exemplar for this deliverable is a FLOOR, not a ceiling. It shows the
minimum viable shape; a real engagement should grow the artifact to the depth the data
and the client conversation justify. Treat every dimension below as an axis to populate
when there is evidence, and to expand on request.

### Dimensions this artifact can carry
- meta-theme name
- constituent themes rolled up
- cross-cutting evidence
- the unifying tension
- where it diverges
- synthesis statement
- citations

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
Your reference twin(s): `meta-themes-nu.html` / `meta-themes-nxt.html` in `hic-workspace/wiki/design-system/gold/`.

Layout: Column per portfolio pattern: num + recurrence tag (RECURS ACROSS N ENGAGEMENTS / PLATFORM PATTERN) + name + mechanism. Takeaway names the platform pattern.

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
