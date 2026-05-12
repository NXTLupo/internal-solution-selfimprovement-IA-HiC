---
url: "https://www.reddit.com/r/OpenAI/comments/1n3tsg9/gpt_5pro_context_window/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "GPT 5-Pro Context Window"
author: "austeane"
date: "2025-08-30T05:41:44.000Z"
score: 3
upvote_ratio: 0.81
num_comments: 5
flair: "Question"
extracted_at: "2026-05-11T17:27:05.361Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# GPT 5-Pro Context Window

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1n3tsg9/gpt_5pro_context_window/)
Posted by **austeane** · **3↑** · **5 comments**

[https://help.openai.com/en/articles/11909943-gpt-5-in-chatgpt](https://help.openai.com/en/articles/11909943-gpt-5-in-chatgpt) shows the context window for all the 5 models other than Pro.   
And for me, when I submit a 100k token prompt to Thinking it works, but when I submit to Pro, it says it's too long. Can anyone else confirm their token windows for 5-Pro?

## Comments

- **sdmat** (1↑): 60-70K, they changed it several times recently so hard to be sure of exactly what the hell is going on.
  - **austeane** (1↑): Have you seen those numbers posted officially, or like analysis on discord?
    - **sdmat** (1↑): No, that's my own testing using texts put through OAI's tokenizer.
- **terretta** (1↑): On Help page, *Pro* is listed for both **Fast** and **Thinking**:

**Context windows**

**Fast**
* Free: 16K
* Plus / Business: 32K
* Pro / Enterprise: 128K

**Thinking**
* All\* paid tiers: 196K

When getting less than these in the Chat apps, remember their system prompt, personalization prompt, memory prompts, etc., are all using tokens.  That leaves fewer tokens for the conversation context.

\* *Pro* is one of *All*.
  - **austeane** (1↑): THat's the wrong categorization unfortunately. 

There is subscription category  
Free  
Plus  
Pro

And model category  
Fast  
Thinking  
Pro

They are saying here that for the Thinking model category, all subscription categories get 196k context; for the Fast model category, you get 16/32/128k context;   
It says nothing about the Pro model category.
