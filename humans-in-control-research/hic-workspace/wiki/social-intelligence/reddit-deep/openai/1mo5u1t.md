---
id: social-intelligence/reddit-deep/openai/1mo5u1t.md
url: "https://www.reddit.com/r/OpenAI/comments/1mo5u1t/gpt5_thinking_is_confirmed_to_have_196k_context/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "GPT-5 Thinking is confirmed to have 196k context window for Plus Users"
author: "obvithrowaway34434"
date: "2025-08-12T11:13:37.000Z"
score: 79
upvote_ratio: 0.9
num_comments: 22
flair: "News"
extracted_at: "2026-05-11T17:27:05.355Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1mo5u1t.md#c0"
    char_span: [0, 296]
    sentence_count: 1
    key_terms: [comments, openai, obvithrowaway34434, reddit-deep, confirmed, thinking, context, posted]
    token_count: 90
  - id: "social-intelligence/reddit-deep/openai/1mo5u1t.md#c1"
    char_span: [311, 933]
    sentence_count: 4
    key_terms: [tokens, model, capabilities, angelfirela, aggresive, mescallan, paperzach, reasoning]
    section: Comments
    token_count: 168
  - id: "social-intelligence/reddit-deep/openai/1mo5u1t.md#c2"
    char_span: [935, 2735]
    sentence_count: 9
    key_terms: [context, tokens, reasoning, prompts, conversation, input, model, like]
    section: Comments
    token_count: 433
  - id: "social-intelligence/reddit-deep/openai/1mo5u1t.md#c3"
    char_span: [2737, 4101]
    sentence_count: 8
    key_terms: [queries, query, reasoning, messages, thinking, context, blank, been]
    section: Comments
    token_count: 372
---
# GPT-5 Thinking is confirmed to have 196k context window for Plus Users

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mo5u1t/gpt5_thinking_is_confirmed_to_have_196k_context/)
Posted by **obvithrowaway34434** · **79↑** · **22 comments**

_(no body — link/image post)_

## Comments

- **Exarch_Maxwell** (13↑): So every prompt will start with #think deeply# because people are not happy with the smaller versions.
Then they will make the router more aggresive.
Back and forth until google wins. Calling it.
- **Mescallan** (35↑): "we are removing the model picker"

"if you want certain capabilities, pick \[xyz\] model"
- **paperzach** (6↑): Not to get too down on GPT-5, but I have noticed that it forgets the context within the message it’s replying to.
- **AngelFireLA** (7↑): it's not 196k input tokens

you can't even give it 80k tokens

the 196k tokens include all the tokens reserved for reasoning

so no it's not a \*true\* 196k contetx length that you can use like you can with Gemini's
  - **i0xHeX** (7↑): It is true that 196k is not just input tokens but a combination of everything. Why do you think Gemini's 1M context window is different? If you go to the playground, you have exactly a 1M token counter, and it counts everything: your input, the model's reasoning, and the model's final output. That is the same as 196k, but 1M.
    - **AngelFireLA** (1↑): Sorry I mustn't have worded it right
In Gemini, in ai studio at least, you can send the full 1M tokens as input. Yes it will count the reasoning tokens but that's after it answered 
Where are here the space reserved for reasoning is already "reserved" before the model even answered 
So yes it does have the full 196k tokens context window 
But it's not fully usable like gemini is
- **ComprehensiveLie6170** (4↑): Can someone please explain it to me like I’m five?
  - **Novel_Wolf7445** (7↑): Context could be simply defined as 'a portion of all of the information that can be gleaned from your conversation, including any prompts or files in the thread.'  What the thread is about, any details that exist outside of training data, and so forth. Long, file-based prompts and conversation type threads, as well as generating code, all require a lot of meta thinking about what came before. As prompts and threads get longer, you can run out of context. This can make the model forget, repeat itself, or hallucinate. 

Regardless of the size of the training set or number of parameters, regardless of how well a model performs on benchmarks, user satisfaction is significantly influenced by how an LLM manages context. 

4o was genius level at context management, which led to many online parasocial relationships now being mourned. 

Typically the bigger the token number, the better the context handling. Sam is making a classic silicon valley blunder here assuming that context is only interesting to coders. He irl gave us a screenshottable quote akin to the probably apocryphal clunker attributed to Bill Gates: “640K ought to be enough for anybody.”
- **Hir0shima** (1↑): How many thinking queries do plus users have? Thinking model not inferior to API?
  - **woobchub** (2↑): 3k/week
    - **marrow_monkey** (5↑): Pretty sure they said it was 200/week at release?
    - **nexion-** (1↑): I'm slow, is that like 3k messages we can send?
- **PP-NYC** (1↑): The voice chat in 5.0 cuts me off so often that I need 5x tries to get a full statement out, so I get messages that I've had a lot of queries (how about a break? it suggests)

Simple questions in text-based chat go to deep reasoning where the AI is still treating actions from hours/days ago as relevant, so I need to stop it, re-query 3x and then normal reasoning mode kicks back in.

And of course today the MacOS app has no text window, so it is difficult to query it for anything. The Chrome version does not display ChatGPT's replies, only my queries, so it is query > blank query > blank.

Fun times. So glad I'm paying for Plus, oh yeah. 🤡
- **i0xHeX** (-3↑): Always has been
- **shadows_lord** (-2↑): It's been like this since O1
