---
id: social-intelligence/reddit-deep/openai/1otatxl.md
url: "https://www.reddit.com/r/OpenAI/comments/1otatxl/chatgpt_pro_context_window_bug_forgets_after_6k/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "ChatGPT Pro: Context Window Bug? -Forgets after ~6k words"
author: "Volition_Maximus"
date: "2025-11-10T10:59:53.000Z"
score: 7
upvote_ratio: 0.89
num_comments: 6
flair: "Discussion"
extracted_at: "2026-05-11T17:27:05.358Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1otatxl.md#c0"
    char_span: [0, 1305]
    sentence_count: 7
    key_terms: [chatgpt, context, openai, pro, comments, messages, earlier, window]
    concepts: [chatgpt, context, openai, comments, messages]
    related_chunks: ["social-intelligence/reddit-deep/openai/1otatxl.md#c1"]
    token_count: 318
    sources: [{"n":"reddit-deep: r/openai","u":"https://www.reddit.com/r/OpenAI/comments/1otatxl/chatgpt_pro_context_window_bug_forgets_after_6k/"}]
  - id: "social-intelligence/reddit-deep/openai/1otatxl.md#c1"
    char_span: [1319, 3272]
    sentence_count: 13
    key_terms: [context, like, chatgpt, pro, tokens, app, text, getting]
    concepts: [context, chatgpt, tokens, getting, secret]
    related_chunks: ["social-intelligence/reddit-deep/openai/1otatxl.md#c0"]
    section: Comments
    token_count: 487
  - id: "social-intelligence/reddit-deep/openai/1otatxl.md#c2"
    char_span: [3274, 3714]
    sentence_count: 3
    key_terms: [probably, issues, memory, words, full, technically, beginning, something]
    concepts: [probably, issues, memory, words]
    section: Comments
    token_count: 102
---
# ChatGPT Pro: Context Window Bug? -Forgets after ~6k words

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1otatxl/chatgpt_pro_context_window_bug_forgets_after_6k/)
Posted by **Volition_Maximus** · **7↑** · **6 comments**

Hey everyone — I’m on a ChatGPT Pro subscription using GPT-4o. I upgraded specifically to take advantage of the 128K token context window, since I often run long-form sessions (multi-hour, 1:1 journaling, high-depth text reflection, etc.).

But here’s the problem:

* My earlier messages are being forgotten extremely early — like, within 30–40 messages or \~6,000 words.
* I’m not even close to 128K tokens, but I’ve confirmed that entire sections of my chat history from earlier in the same session are completely gone from memory.
* This behavior is very different from what I used to experience months ago. Previously, I could run *full-day* conversations and ask for summaries from start to finish with no issue.

So my questions are:

* Is anyone else on Pro or Plus noticing this?
* Are we *actually* getting 128K context in practice, or is the UI trimming it silently?
* Has OpenAI acknowledged this somewhere and I just missed it?

I’m not using the API — just the standard ChatGPT app. If this is a widespread issue, I think it needs visibility.

## Comments

- **Amazing_Tart6125** (2↑): Could you try this - go to https://platform.openai.com/tokenizer, paste some text until it reaches let's say 35k tokens (for example a book like https://www.gutenberg.org/files/11/11-h/11-h.htm) then preface the text with "The secret word is banana" or something and give the text to 4o. Ask it what the secret words is. It's a bit dumb but I remember confirming like this what has since become well known - that 4.5 on pro has 32k tokens context window. I used to use 4.5 extensively and would switch to 4o if I needed to fetch some information beyond those 32k tokens. It never had any problems getting it. However I cancelled my pro subscription recently so I'm unable to help directly.
  - **Amazing_Tart6125** (1↑): Also, if you're using ChatGPT just for 4o, you could consider using the API instead, I think it will be cheaper than pro, even with long context conversations. You will have more power over the settings like temperature, there is no rerouting afaik and there will be less "hidden" changes like what you are describing. And with modern clients you can still have a nice UI and memory like on ChatGPT though it will take a bit of time to set up.
- **dhamaniasad** (1↑): Can you try with GPT-4.1 ? This is likely just the model paying less attention to past context. If you want a model that is more faithful to prior context, Claude I think does this better. 

Also, how did you confirm the sections from chat history are gone?
- **Ok-Calendar8486** (1↑): I think in the main app you're not getting the full context, I use API as I used to be pro, but wanted more features than the chatgpt gave.

I have sent above the 128k before and gotten the error back before. 

I think in the main app you wouldn't get the full 128k as you'd need to take into account the custom instructions, the memories, if reference other chats is on, the thread itself and then whatever openai's system prompt is in chatgpt app.

So technically you probably aren't getting the full 128k, but in saying that you should loose after 6k words as 128k is something like 96k words. I have heard of memory problems lately alot in chatgpt and not just pro subs, from free to plus they've been having issues.

So while at the beginning you'd probably not get the full 128k there's issues with memory and what not anyway so you're working with a hand tied behind your back I think
