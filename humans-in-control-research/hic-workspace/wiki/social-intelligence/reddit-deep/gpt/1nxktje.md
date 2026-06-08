---
id: social-intelligence/reddit-deep/gpt/1nxktje.md
url: "https://www.reddit.com/r/GPT/comments/1nxktje/memory_allocation_vs_chat_length/"
kind: "social-post"
source: "reddit-deep: r/gpt"
subreddit: "gpt"
title: "Memory allocation vs chat length."
author: "dausone"
date: "2025-10-04T04:43:46.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 4
flair: ""
extracted_at: "2026-05-11T17:26:37.727Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/gpt/1nxktje.md#c0"
    char_span: [0, 1348]
    sentence_count: 13
    key_terms: [chat, gpt, different, memory, allocation, beginning, efficient, comments]
    token_count: 336
  - id: "social-intelligence/reddit-deep/gpt/1nxktje.md#c1"
    char_span: [1363, 1855]
    sentence_count: 5
    key_terms: [dausone, specs, definitely, experience, according, extremely, seriously, switching]
    section: Comments
    token_count: 151
---
# Memory allocation vs chat length.

Source: [reddit-deep: r/gpt](https://www.reddit.com/r/GPT/comments/1nxktje/memory_allocation_vs_chat_length/)
Posted by **dausone** · **0↑** · **4 comments**

So I ran into an interesting issue that I am sure we are all familiar with. At some point in our long form chats, the answers from GPT start getting cloudy and unfocused. Almost like the beginning of our chat fails to exist! And in fact, it does!

"Memory" and "context" (GPT calls them 'tokens') are stored and used in a chat. This allocation is limited depending on the model. Different models have different amounts of "context" that they can store and recall before it runs out and is re-allocated. It never disappears, but it is re-used to keep the chat going.

So in the beginning of a chat, GPT can recall all of our chat and have efficient answers and provide efficient replies. But in long form chats once we run out of "memory" the beginnings of the chat are no longer visible or referenced.

I did a quick comparison of different models and their respective limits, in minutes, based on a heavy usage chat such as coding. The results are below and it is clear which experience could be the most fluid and less problematic.

https://preview.redd.it/f08hp0m3x0tf1.jpg?width=1926&format=pjpg&auto=webp&s=98aba10b803f7fc83b4e6467758a9a08b8b0008b

## Comments

- **i_sin_solo_0-0** (1↑): No way 4.1 can seriously go that far in a chat is this real?
  - **dausone** (1↑): According to the specs! But the specs are also cloudy and can be updated at any time so who really knows. But 4.1 definitely seems to have a longer memory spread in my experience.
- **baldy120** (1↑): This is awesome. I'll be switching to 4.1. 

Thanks for sharing!
  - **dausone** (1↑): Be careful about prices for the model you choose. 4.1 is extremely high in costs vs 4.1 Turbo.
