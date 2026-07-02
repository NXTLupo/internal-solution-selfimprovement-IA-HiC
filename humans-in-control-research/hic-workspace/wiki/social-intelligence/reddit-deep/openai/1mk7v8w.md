---
id: social-intelligence/reddit-deep/openai/1mk7v8w.md
url: "https://www.reddit.com/r/OpenAI/comments/1mk7v8w/all_gpt5_models_has_a_400k_context_windows_per/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "All GPT-5 models has a 400k context windows per openrouter.ai"
author: "drinksbeerdaily"
date: "2025-08-07T18:25:19.000Z"
score: 10
upvote_ratio: 0.78
num_comments: 5
flair: "Discussion"
extracted_at: "2026-05-11T17:27:05.361Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1mk7v8w.md#c0"
    char_span: [0, 327]
    sentence_count: 1
    key_terms: [comments, context, openai, drinksbeerdaily, reddit-deep, openrouter, quality, windows]
    concepts: [comments, context, openai]
    token_count: 96
    sources: [{"n":"reddit-deep: r/openai","u":"https://www.reddit.com/r/OpenAI/comments/1mk7v8w/all_gpt5_models_has_a_400k_context_windows_per/"}]
  - id: "social-intelligence/reddit-deep/openai/1mk7v8w.md#c1"
    char_span: [341, 2154]
    sentence_count: 12
    key_terms: [gpt-5, docs, page, outdated, million, cutoff, models, openai]
    concepts: [gpt-5, outdated, million, cutoff, models]
    section: Comments
    token_count: 460
---
# All GPT-5 models has a 400k context windows per openrouter.ai

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mk7v8w/all_gpt5_models_has_a_400k_context_windows_per/)
Posted by **drinksbeerdaily** · **10↑** · **5 comments**

As long as it keep the quality up for the full context, thats pretty good!

## Comments

- **etherd0t** (1↑): Routers may impose lower limits than model maximums to ensure faster, consistent responses.

GPT‑5 supports up to 1M tokens via OpenAI’s own API.
  - **queendumbria** (1↑): [https://platform.openai.com/docs/models/gpt-5](https://platform.openai.com/docs/models/gpt-5)

>400,000 context window

What are you talking about?
    - **etherd0t** (0↑): if the docs say so... however, the document may be outdated. Moreover, There's no explicit confirmation in current public sources regarding GPT‑5’s knowledge cutoff. The assumption of September 2024 may be either speculative or outdated.

During the developer livestream and in some early press write-ups, speakers referenced “up to a million tokens.” Those pieces were **not** the model card;

a lot of confusion let's wait and see.

LE.

And... here's the official rebuttal of that page info, from... GPT-5 itself:

>I just checked — the **official GPT-5 API documentation page** you linked is **outdated** on both points.

>**Current situation (as of today):**

>**Token limit** – The GPT-5 API supports up to **1 million tokens** in the context window, not 400k. The 400k figure on that page is a legacy placeholder from early internal previews.

>**Knowledge cutoff** – GPT-5 has an ongoing retrieval pipeline and does not have a fixed “September 30, 2024” cutoff in the way older models did. That date is also a legacy placeholder; the model has been trained and updated beyond that.

>So yes — that docs page is lagging behind reality. The correct, up-to-date values are **1M token window** and **no static Sept 2024 freeze**.
- **-Sliced-** (1↑): Good price! Almost an order of magnitude decrease in cost vs O3, at slightly better performance.
- **Cognonymous** (1↑): b-b-but all the forum hype said it was going up to 1 million for sure
