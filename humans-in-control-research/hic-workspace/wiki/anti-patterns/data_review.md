---
id: anti-patterns/data_review.md
title: "Data Review Anti-Patterns"
type: anti-pattern
created: 2026-05-19
updated: 2026-05-19
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md, .claude/CLAUDE.md]
confidence: high
status: active
tags: [anti-patterns, data-review, source-curation, quality-gates]
evidence_count: 0
chunks:
  - id: "anti-patterns/data_review.md#c0"
    char_span: [0, 2360]
    sentence_count: 9
    key_terms: [sources, source, brief, category, first-person, tier-demoted, alternative, description]
    token_count: 497
  - id: "anti-patterns/data_review.md#c1"
    char_span: [2362, 4031]
    sentence_count: 7
    key_terms: [sources, downstream, retained, marked, source, alternative, description, tier]
    token_count: 399
  - id: "anti-patterns/data_review.md#c2"
    char_span: [4033, 5966]
    sentence_count: 9
    key_terms: [source, summary, journal, resolve, author, higher, verification, alternative]
    token_count: 432
  - id: "anti-patterns/data_review.md#c3"
    char_span: [6007, 6520]
    sentence_count: 3
    key_terms: [patterns, appendlearnedantipattern, added, user, user-correction, auto-appended, consistently, description]
    section: Learned Anti-Patterns (auto-grown)
    token_count: 122
---
# Data Review Anti-Patterns

Known failure modes in the source-review stage where the AI surfaces collected research sources and the user confirms which to include. These are the patterns to steer away from when curating, classifying, or summarizing source documents.

---

### AP-DATAREVIEW-001: Source Monoculture
- **Description**: Source pool is dominated by a single category (e.g., all news articles, all academic, all Reddit). The deliverable downstream will inherit that bias and read as one-sided no matter how the synthesis is framed.
- **Detection Criteria**: One source-type category exceeds 60% of the included pool. Or: zero sources from a category the brief explicitly calls for (e.g., a study-abroad brief with no government / regulatory sources).
- **Severity**: Critical
- **Example of Mistake**: 14 of 16 included sources are higher-ed industry publications; 0 are first-person student accounts.
- **Correct Alternative**: Enforce a diversity floor at curation time. For a higher-ed brief: at least 3 industry, 3 academic, 3 first-person (Reddit / forum / interview), 2 government / regulatory, 2 institutional reports.
- **Root Cause**: Connectors weight their native source type. Without a diversity check, whichever connector returned the most rows wins.

### AP-DATAREVIEW-002: Cherry-Picked Confirmation
- **Description**: Sources retained at review confirm a pre-existing hypothesis; sources that contradict it are tier-demoted or excluded without justification.
- **Detection Criteria**: Excluded sources cluster around a single counter-narrative. Or: the user / AI's exclusion reasons are identical across multiple sources ("not relevant", "off-topic") for sources whose abstracts directly engage the research question.
- **Severity**: Critical
- **Example of Mistake**: Brief asks "is co-op programming worth the cost?" — 4 sources arguing co-op programs have negative ROI are tier-demoted to T3 with reason "tangential", while 11 supportive sources sit at T1.
- **Correct Alternative**: Retain at least 2 sources that argue the strongest counter-position. The deliverable's credibility comes from engaging counter-evidence, not from filtering it out.
- **Root Cause**: The model anchors on the brief's implicit framing and rewards sources that align with it. Active counter-balance is required at curation time, not synthesis time.

### AP-DATAREVIEW-003: Tier Inflation
- **Description**: Every source is tier-1 (highly relevant). The tier system loses signal because nothing is ever demoted, so downstream consumers cannot distinguish primary from supporting evidence.
- **Detection Criteria**: Tier-1 share exceeds 70% of the retained pool. Or: tier-3 contains zero sources.
- **Severity**: Major
- **Example of Mistake**: 22 retained sources, 19 marked T1, 3 marked T2, 0 marked T3. The downstream deliverable cites all 22 with equal weight.
- **Correct Alternative**: Force a realistic distribution — roughly 20–30% T1, 40–50% T2, 20–30% T3. The downstream weight engine relies on the gradient.
- **Root Cause**: The model treats tier as a "is this useful" boolean rather than a relevance ranking. Calibration prompting required.

### AP-DATAREVIEW-004: Stale Source Inflation in Fast-Moving Space
- **Description**: Sources older than 3-5 years dominate in a space where the underlying landscape has materially changed (post-COVID labor markets, post-2023 AI adoption, post-DOJ-2024 antitrust posture, etc.).
- **Detection Criteria**: Median source publication year more than 4 years prior to brief date in a domain known to be in flux.
- **Severity**: Major
- **Example of Mistake**: Strategy brief on AI buyer behavior in 2026 includes 60% sources from before mid-2023.
- **Correct Alternative**: Apply a recency floor scaled to the domain. For AI / labor / consumer-behavior: at least 50% of retained sources from the last 18 months.
- **Root Cause**: Connectors return whatever matches the keyword query; older content has accumulated more citation gravity so it ranks higher even when stale.

### AP-DATAREVIEW-005: Source Summaries That Hallucinate the Source
- **Description**: AI's one-line summary of a retained source asserts a claim, statistic, or named entity that is not present in the source text. The user confirms inclusion based on a summary that misrepresents what's actually there.
- **Detection Criteria**: Summary contains a specific number or named entity that does not appear in the source's parsed text. (Verifiable by string match.)
- **Severity**: Critical
- **Example of Mistake**: Source is a 1,200-word Higher Ed Dive piece on co-op participation; AI summary says "Higher Ed Dive reports 47% of co-op students drop out" — the article never says 47%.
- **Correct Alternative**: Source summaries must be extractive (verbatim phrases or close paraphrases). Reject any summary whose key claim cannot be string-matched back to the source body.
- **Root Cause**: Summarizer is in generation mode by default. Force extractive mode at this stage.

### AP-DATAREVIEW-006: Phantom Citations
- **Description**: Sources are surfaced with author names, publication titles, or DOIs that do not exist. Connector returned a real-looking record from a hallucinated index.
- **Detection Criteria**: DOI does not resolve. Author + title combination returns zero hits on a verification search. Publication name does not exist or is misspelled (e.g., "Journal of Higher Education Strategy" — not a real journal).
- **Severity**: Critical
- **Example of Mistake**: "Patel & Chen, 2024, *Journal of Strategic Workforce Development*, DOI: 10.1234/jswd.2024.0042" — none of these resolve.
- **Correct Alternative**: Run a verification pass (DOI resolve OR title+author search) before any source enters the curated pool. Mark unverifiable sources as "PROVENANCE FAILED" and exclude.
- **Root Cause**: Some AI-routed connectors fabricate plausible-looking metadata. Trust no metadata that hasn't been independently verified.

---

## Learned Anti-Patterns (auto-grown)

Auto-appended by `appendLearnedAntiPattern` when the constraint engine detects 5+ user-correction patterns at this stage. New entries are added below by the runtime; do not delete the marker line.

<!-- LEARNED_AP_MARKER -->

### AP-LEARNED: User consistently correcteds "source_curation"
- **Detection**: 7 edits, 7+ occurrences
- **Description**: "source_curation" requires more accuracy. Review factual claims and specificity in this field.
- **Source**: Learned from user edit patterns
- **Added**: 2026-04-15
