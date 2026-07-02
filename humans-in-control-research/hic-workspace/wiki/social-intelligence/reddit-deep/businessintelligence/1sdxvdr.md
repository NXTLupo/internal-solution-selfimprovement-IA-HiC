---
id: social-intelligence/reddit-deep/businessintelligence/1sdxvdr.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1sdxvdr/how_do_you_explore_raw_data_sources_before/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "How do you explore raw data sources before building anything? Looking for honest opinions on a tool I made for this."
author: "St0nksGoDown"
date: "2026-04-06T12:46:13.000Z"
score: 0
upvote_ratio: 0.35
num_comments: 13
flair: ""
extracted_at: "2026-06-11T18:57:56.375Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1sdxvdr.md#c0"
    char_span: [0, 1515]
    sentence_count: 13
    key_terms: ["what's", businessintelligence, harbingerexplorer, agent, com, tool, governance, building]
    concepts: ["what's", businessintelligence, harbingerexplorer, agent, governance]
    token_count: 352
    sources: [{"n":"reddit-deep: r/businessintelligence","u":"https://www.reddit.com/r/BusinessIntelligence/comments/1sdxvdr/how_do_you_explore_raw_data_sources_before/"}]
  - id: "social-intelligence/reddit-deep/businessintelligence/1sdxvdr.md#c1"
    char_span: [1529, 2304]
    sentence_count: 4
    key_terms: [tools, data, jupyter, etc, llm, look, run, sql]
    concepts: [tools, jupyter]
    section: Comments
    token_count: 205
---
# How do you explore raw data sources before building anything? Looking for honest opinions on a tool I made for this.

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1sdxvdr/how_do_you_explore_raw_data_sources_before/)
Posted by **St0nksGoDown** · **0↑** · **13 comments**

There's always this phase before any dashboard or report where someone has to sit down with the raw sources and figure out what's actually there. APIs, exports, client files — what's usable, what's sensitive, what's garbage.

I've been building a tool around this with an AI agent that auto-catalogs API endpoints from documentation, lets you upload files, and explores everything with natural language or SQL. It detects PII and lets you set per-column governance rules — and the agent respects those rules. If you exclude a column, the agent can't see it. Not "shouldn't" — can't.

Also has source health tracking, BYOK for your own AI keys, and exports to dbt/notebooks/scripts when you're done exploring.

I'm a solo dev and honestly not sure if this is a real gap or something every team just handles ad-hoc and is fine with. Would really value your perspective:

* Do you have a go-to tool for this pre-dashboard exploration, or is it different every time?
* Does governance matter to you this early in the process?
* What's missing?

Take a look if you're curious: [harbingerexplorer.com](https://harbingerexplorer.com/) — totally free to poke around. Roast it if it deserves it.

## Comments

- **OdinsPants** (6↑): ok, so, just being honest. 1) why would I use this LLM tool compared to the hundreds of others that do text to sql, etc. 2) why wouldn’t I just look at openapi specs, use Jupyter to explore things like csv files, etc?

What value does the LLM provide specifically?
- **edimaudo** (1↑): Not sure if it is large need but I can just load the data into a jupyter notebook or run sql on it.  If you are positioning it for non tech users there are tools out there that exist as well
- **Odd-String29** (1↑): I just dump it in BigQuery and take a look.
- **parkerauk** (1↑): Every data person will build their own tools with AI to run python tasks or similar to do this sort of thing. Today it is more about prompt logic than coding or tools for data mapping.
