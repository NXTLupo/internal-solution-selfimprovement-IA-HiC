---
id: social-intelligence/reddit-deep/chatgptcoding/1vvy9vn.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1vvy9vn/where_does_all_the_token_usage_actually_come_from/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "Where does all the token usage actually come from in coding sessions?"
author: "entelligenceai17"
date: "2026-08-23T05:19:07.000Z"
score: 8
upvote_ratio: 0.91
num_comments: 8
flair: "Resources And Tips"
extracted_at: "2026-10-09T16:37:34.764Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vvy9vn.md#c0"
    char_span: [0, 870]
    sentence_count: 7
    key_terms: [chatgptcoding, comments, sessions, context, coding, output, https, token]
    concepts: [chatgptcoding, comments, sessions, context, coding]
    token_count: 221
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vvy9vn/where_does_all_the_token_usage_actually_come_from/","kind":"social-post","date":"2026-08-23","author":"entelligenceai17","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vvy9vn.md#c1"
    char_span: [885, 1997]
    sentence_count: 6
    key_terms: [already, anything, context, enough, tokens, right-performance-93, model, right]
    concepts: [already, anything, context, enough, tokens]
    section: Comments
    token_count: 238
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vvy9vn/where_does_all_the_token_usage_actually_come_from/","kind":"social-post","date":"2026-08-23","author":"entelligenceai17","subreddit":"chatgptcoding"}]
---
# Where does all the token usage actually come from in coding sessions?

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1vvy9vn/where_does_all_the_token_usage_actually_come_from/)
Posted by **entelligenceai17** · **8↑** · **8 comments**

I've been looking at longer AI coding sessions and it's pretty surprising how much of the token usage isn't actually the final code.

Context, tool output, reasoning and retries can add up quickly.

Some of the obvious ways to cut costs also seem counterproductive. Saving a few tokens by cutting context or output can turn into a much more expensive retry.

Made a breakdown of the biggest ones and what actually seems worth optimizing.

Anyone else tracking this closely? 

https://preview.redd.it/9jo692v872lh1.png?width=1390&format=png&auto=webp&s=9386c03cae6e27d16fed3c80026d7437fc519a26

## Comments

- **itssoocoldhere** (1↑): The forcing every turn onto a cheap model point is the one that actually costs people the most without realizing it. You save fractions of a cent per call and then spend dollars on retries and manual fixes when the output quality tanks on anything that actually matters. The math only works if your tasks are genuinely simple enough that a cheaper model handles them reliably every time which is rarely true in real coding sessions.
- **Right-Performance-93** (1↑): The retry cost is the one that's easy to underestimate until you actually track it. A single failed edit that needs 2-3 correction rounds burns more tokens than just giving the agent enough context to get it right the first time. The other big one for me: agents re-deriving state they already established earlier in the session (re-reading a file they already have in context, re-explaining a decision that was already made). Scripting the deterministic parts, like u/JBO_76 said, helps a lot - anything with a fixed right answer (formatting, running tests, git ops) shouldn't be burning inference tokens on it at all.
