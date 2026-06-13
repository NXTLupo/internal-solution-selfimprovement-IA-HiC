---
id: known-gaps/README.md
title: Known Gaps - Cross-Engagement Shortfall Log
type: synthesis-index
created: 2026-05-23
exclude_from_compile: true
chunks:
  - id: "known-gaps/README.md#c0"
    char_span: [0, 1440]
    sentence_count: 6
    key_terms: [engagements, shortfalls, topics, topic, scheduler, shortfall, detected, cross-engagement]
    token_count: 298
---
# Cross-Engagement Knowledge Shortfalls

This directory accumulates coverage shortfalls detected across engagements. Each file in this directory is a topic (e.g., `donor-retention-rates.md`, `first-year-advisor-experience.md`); each occurrence inside a file is a session that hit the shortfall.

The `learningEngine.getRecurringShortfallTopics()` function reads these files and reports topics with 2+ occurrences to the source-discovery scheduler. The scheduler then biases future engagements' research-fabric searches toward these topics so they get covered up front instead of repeatedly being detected as shortfalls.

## How entries are written

`services/knowledgeGapFinder.ts:persistGapsToKnownGaps` writes to `known-gaps/<topic-slug>.md` after every gap-finding pass. The topic slug is derived from the question's noun-phrase signature (first 3-4 meaningful tokens, kebab-cased).

## How entries are consumed

1. **Source discovery scheduler** — reads recurring topics, adjusts source weights
2. **`loadGenerationContext`** — prepends a "Prior engagements have repeatedly hit shortfalls on: ..." block to the system prompt
3. **Knowledge Library UI** — surfaces a "Recurring shortfall topics" tab that links cross-engagement patterns

## How to retire an entry

When a topic is fully covered (i.e., not detected as a shortfall in 3+ consecutive engagements), delete the file. Or move it to `_resolved/<topic>.md` if you want a history.
