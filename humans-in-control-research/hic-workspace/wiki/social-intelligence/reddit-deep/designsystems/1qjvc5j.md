---
id: social-intelligence/reddit-deep/designsystems/1qjvc5j.md
url: "https://www.reddit.com/r/DesignSystems/comments/1qjvc5j/how_do_you_categorize_components_in_your_design/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "How do you categorize components in your design system?"
author: "MrAreh"
date: "2026-01-22T14:02:45.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 3
flair: ""
extracted_at: "2026-09-10T17:19:04.809Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1qjvc5j.md#c0"
    char_span: [0, 281]
    sentence_count: 2
    key_terms: [designsystems, comments, reddit-deep, categorize, components, design, mrareh, posted]
    concepts: [designsystems, comments]
    token_count: 77
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1qjvc5j/how_do_you_categorize_components_in_your_design/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1qjvc5j.md#c1"
    char_span: [296, 1441]
    sentence_count: 6
    key_terms: [containers, feedback, overlays, pickers, usually, inputs, modals, system]
    concepts: [containers, feedback, overlays, pickers, usually]
    section: Comments
    token_count: 264
---
# How do you categorize components in your design system?

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1qjvc5j/how_do_you_categorize_components_in_your_design/)
Posted by **MrAreh** · **0↑** · **3 comments**

_(no body - link/image post)_

## Comments

- **Frequent_Emphasis670** (3↑): This is a very common design system problem — and there’s no perfect taxonomy.

What generally works best is grouping by user intent first, then refining by function. The goal isn’t theoretical purity, it’s findability and shared understanding.

A practical approach I’ve seen scale well:

	•	Foundations: colors, typography, spacing, tokens

	•	Inputs: text fields, selects, date pickers, checkboxes (anything that collects data)

	•	Actions: buttons, links

	•	Navigation: tabs, breadcrumbs, pagination

	•	Feedback & status: alerts, toasts, loaders, empty states

	•	Containers / overlays: modals, drawers, popovers, cards

	•	Data display: tables, lists, charts


This helps with edge cases:

	•	Modals aren’t really feedback — they’re containers/overlays

	•	Date pickers belong under Inputs, even though they’re complex


Flat vs nested:
Start flat, and only nest when the system grows and discovery becomes hard. Deep nesting usually hurts more than it helps.


One rule of thumb:
If teammates argue about where a component belongs, that’s usually a sign it needs clear usage guidance, not a new category.
