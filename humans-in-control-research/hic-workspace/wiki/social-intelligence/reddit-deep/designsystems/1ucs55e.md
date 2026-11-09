---
id: social-intelligence/reddit-deep/designsystems/1ucs55e.md
url: "https://www.reddit.com/r/DesignSystems/comments/1ucs55e/are_design_tokens_enough_for_ai_coding_agents/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "Are design tokens enough for AI coding agents?"
author: "Colorphere"
date: "2026-06-22T18:08:10.000Z"
score: 1
upvote_ratio: 0.6
num_comments: 7
flair: ""
extracted_at: "2026-09-10T17:19:04.801Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1ucs55e.md#c0"
    char_span: [0, 549]
    sentence_count: 4
    key_terms: [design, designsystems, comments, tokens, characteristics, experimenting, personality, reddit-deep]
    concepts: [designsystems, design, comments, tokens]
    token_count: 115
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1ucs55e/are_design_tokens_enough_for_ai_coding_agents/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1ucs55e.md#c1"
    char_span: [564, 1919]
    sentence_count: 11
    key_terms: [context, generic, innovative, mean, adjectives, average, example, website]
    concepts: [context, generic, innovative, adjectives, average]
    section: Comments
    token_count: 295
---
# Are design tokens enough for AI coding agents?

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1ucs55e/are_design_tokens_enough_for_ai_coding_agents/)
Posted by **Colorphere** · **1↑** · **7 comments**

Most design system exports focus on colors, typography, spacing, and components.

We started experimenting with exporting design intent, personality, and inferred characteristics alongside tokens because AI seems to need more context than traditional tooling.

Curious how others are thinking about this.

## Comments

- **h_2575** (2↑): For sure it can do a decent job. I would be careful, if accessibility is a requirement.
- **omerbalyali** (1↑): Intent is important but I wouldn't consider using generic adjectives as "making the intent clear". These adjectives depends on the context, they can be relational, and also vague.

Agents will try to infer what they mean by the average understanding and try to add generic decorative things related to these. And when they conflict, you might find yourself fighting to fix these issues.

For example, "friendly" might mean something else for a cosmetics brand than it might mean for a financial institution. If you are designing a website for a developer tooling, in most cases it will be technical but it can look generic, then what does innovative would mean, or friendliness? This might end up with the usual purple tech website that uses shaders or "tech-y" illustrations and such.

Adding more context is good but if that context is just generic word like "innovative", LLM will just average on the generic thing, instead of being innovative as it doesn't have enough context.
- **bodyakrol** (1↑): Yep, definitely AI needs more context.  To be resize also by the guidelines where to use each token it also needs example where to use each token and where is not.   
This guide perfectly should be written in .md format.
