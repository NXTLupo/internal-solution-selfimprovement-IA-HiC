---
id: social-intelligence/reddit-deep/businessintelligence/1nolisc.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1nolisc/cursor_for_metabase_or_powerbi/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Cursor for Metabase or PowerBI?"
author: "harishd30"
date: "2025-09-23T16:07:44.000Z"
score: 2
upvote_ratio: 1
num_comments: 6
flair: ""
extracted_at: "2026-06-11T18:57:56.381Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1nolisc.md#c0"
    char_span: [0, 667]
    sentence_count: 6
    key_terms: [businessintelligence, comments, metabase, cursor, supermetrics, reddit-deep, dashboards, phenomenon]
    concepts: [businessintelligence, comments, metabase, cursor]
    token_count: 166
    sources: [{"n":"reddit-deep: r/businessintelligence","u":"https://www.reddit.com/r/BusinessIntelligence/comments/1nolisc/cursor_for_metabase_or_powerbi/"}]
  - id: "social-intelligence/reddit-deep/businessintelligence/1nolisc.md#c1"
    char_span: [681, 1680]
    sentence_count: 1
    key_terms: [alligatorjunior, context, dax, semantic, specific, chatgpt, measure, filter]
    concepts: [alligatorjunior, context, semantic, specific, chatgpt]
    section: Comments
    token_count: 223
---
# Cursor for Metabase or PowerBI?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1nolisc/cursor_for_metabase_or_powerbi/)
Posted by **harishd30** · **2↑** · **6 comments**

Why hasn't a cursor phenomenon haven't happened yet in this space?

Am I missing something?

Myself a programmer building several indie projects, and I work for my clients (Freelance)

I use metabase + supermetrics + postgres for ad analytics  
  
Time and again, I've seen startups from YC try this and fail.  
  
Do you know what's the reason?  
  
My doubt: These dashboards don't often change as much as a codebase does? or am I wrong?

## Comments

- **AlligatorJunior** (2↑): I am not sure about Metabase, but for PBI context is very important, you have measure that build specific for a chart so it's very hard to make it work without understanding the behind semantic model, the same with SQL, AI still not that great for SQL compare to programing languages.
  - **harishd30** (1↑): Have you tried using claude / chatgpt with some example data and datamodels?
    - **AlligatorJunior** (1↑): We have some poc that connect chatgpt with pbi semantic model using their metadata tables to make chatbot, then use defined prompts to generate result base on the base query, DAX in general summarize everything so that we can give to the AI, it job is just find the correct measure and dimensions fields, okish on simple questions, for harder one like ignore certains filter context or put specific filter it generates wrong DAX which is completely understandable, like I said simply not enough understading on the context or maybe DAX query on overall.
