---
id: articles/reddit-designsystems/9f7d9ed9cf.md
url: "https://reddit.com/r/DesignSystems/comments/1ulfxic/i_mapped_how_i_think_ai_design_systems_should/"
url_hash: "9f7d9ed9cf"
kind: "article"
source: "reddit: designsystems"
title: "I mapped how I think AI + design systems should work as one stack (not system)"
author: ""
date: "2026-07-02T11:45:13.000Z"
tier: 
method: "source-native"
extracted_at: "2026-09-10T17:26:47.343732+00:00"
chars: 1833
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:26:46.691Z"
relevance: 42
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "fa1d3bb6d9d5e2ad"
relevance_by_goal: {"5a163910d68e":42}
chunks:
  - id: "articles/reddit-designsystems/9f7d9ed9cf.md#c0"
    char_span: [0, 2049]
    sentence_count: 13
    key_terms: [system, storybook, designsystems, documentation, "i'm", "i've", isolated, diagram]
    concepts: [system, storybook, designsystems, documentation, isolated]
    token_count: 465
    sources: [{"n":"reddit: designsystems","u":"https://reddit.com/r/DesignSystems/comments/1ulfxic/i_mapped_how_i_think_ai_design_systems_should/","kind":"article","date":"2026-07-02"}]
---
# I mapped how I think AI + design systems should work as one stack (not system)

Source: [reddit: designsystems](https://reddit.com/r/DesignSystems/comments/1ulfxic/i_mapped_how_i_think_ai_design_systems_should/)

\# Open to discussion/ideas/learnings  
  
When I was thinking about how to setup an intuitive AI powered DS System, I drew an initial version of this diagram (before any setup)

A lot of the content I see, info from colleagues in the DS space and even my observation within a company I recently worked with, many seem to be using AI to do specific parts of this system in fragmented & isolated ways.

The diagram attached is an example of how I think design systems and AI should work together. A proper stack

The pink boxes are the bet: if the documentation is good enough, AI output should stop looking well...  🫠

I've been building toward this map for a while. A few things I've learned already:

* The brain (ds-brain) sits in the middle - not Storybook, not the component source files
* You maintain docs once - skills, rules, indexes, and Storybook fragments fall out of a generator
* Storybook is a consumer of the brain, not the other way around
* The IDE/Cursor path is where I've shipped and measured the most so far
* AI inside Figma still needs love - I'm exploring options (MCP? CLI?).  This should be interesting. 

For me it's not enough to say "I designed the system - use it." I'm running tests and tracking metrics:

* Scoring outputs against a rubric
* Counting when agents invent components that don't exist
* Accounting for contamination - Running trials in isolated environments so experiments don’t poison retrials.
* ... and much more

So far, some scores made me proud. Some stung. All of them taught me the same lesson:- Don’t start with the AI box. Start with the documentation package. Everything else is plumbing.

I'll share more of what I'm learning over the next few weeks - the wins, the misses, and what actually moved the needle. If you have any ideas, observations, please feel free to share :)
