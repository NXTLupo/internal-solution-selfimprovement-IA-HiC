---
id: social-intelligence/reddit-deep/openai/1mrydzj.md
url: "https://www.reddit.com/r/OpenAI/comments/1mrydzj/prompt_engineering_for_gpt_5/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "Prompt engineering for GPT 5"
author: "SlowFail2433"
date: "2025-08-16T15:25:55.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 4
flair: "Discussion"
extracted_at: "2026-05-11T16:53:06.861Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1mrydzj.md#c0"
    char_span: [0, 303]
    sentence_count: 1
    key_terms: [engineering, comments, openai, prompt, gpt, particularly, slowfail2433, reddit-deep]
    token_count: 83
  - id: "social-intelligence/reddit-deep/openai/1mrydzj.md#c1"
    char_span: [317, 2329]
    sentence_count: 20
    key_terms: [avoid, description, optional, o1-mini, prompts, full, grimreefer, different]
    section: Comments
    token_count: 500
  - id: "social-intelligence/reddit-deep/openai/1mrydzj.md#c2"
    char_span: [2331, 3469]
    sentence_count: 9
    key_terms: [prompt-optimizer-automated-meta-prompting, ferenczai, substack, example, explain, prompts, expect, prompt]
    section: Comments
    token_count: 284
---
# Prompt engineering for GPT 5

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mrydzj/prompt_engineering_for_gpt_5/)
Posted by **SlowFail2433** · **0↑** · **4 comments**

Early days but has anyone found any particularly good prompts or prompt engineering techniques for GPT 5?

## Comments

- **RequirementItchy8784** (1↑): https://www.reddit.com/r/OpenAI/s/cr6iP5Uq9C

I just made a post with different types of algorithms for different situations check it out.
- **-GrimReefer-** (1↑): Prompting (Theme),

Explaining how to prompt (Title)

\# # # #

(Description)

Gpt 5 is not going to adhere to these.

Openai's models are unable to reliably produce something new.

This is what I used for C++, with Gemini. 

For gpt 5, i would recommend what I had o1-mini using. 

\# # # #

o1-mini (Description, Optional)

That means aim for something that will have been done before.

O1-mini did better with examples. 

Like folder structures, examples of what you expect, etc.

Every token counts.

If you can word it with fewer words, do that.

Space out every sentence with a newline.

It would take me an estimated 20 minutes to per prompt.

\# # # # 

Other tips (Description, Optional)

I reuse most of the parts of past prompts, to speed up sequential prompts.

The biggest mistake is not trying, and going not correcting your prompts.

Every sentence has to be a reasonable length.

Most of the time each task should be the first message.

With the first message, you get the model's full performance.

Ensure consistency in your writing.

Avoid commas or long sentences.
  - **-GrimReefer-** (1↑): \# # # #

(Example)

You want to clearly state what to avoid.

I always paste this or trimmed down variants at the end of my messages.

The full list of avoid options I have used are below. 

{"Avoid":\[ "Not thinking, or not thinking hard enough", "Over commenting with //", "Forgetting the user has a bad memory, and is prone to mistakes in logic", "Blaming the user", "Not providing a full document.", "Over providing parts that no longer need modified! ", "Overcomplicating this or, overanalyzing my request.", "Changes to other documents, that you cannot see (eg, cmake.txt).", "brevity, Incomplete, Extra steps. Cheating", "Failing to adhere to the avoid section"\]}

\# # # #

Example  (Optional)

For coding the biggest issue is you have to explain what you expect the output to look like.

For files, you have to explain the dir structures.

You also have to take into consideration that the model cannot truly see and does better with text.

Below is an example directory tree.

|-- X

    \\--X

\# # # #

Example  (Optional)

Ensure you cover examples of what you expect or the model will fill in the rest

The less effort you put in the worse the outcome

I wrote the entire message in how I word my prompts.

\# # # #

Goals:   (Careful what you put in here.)

All done continuously.

Tied in properly.

Does not break exisitng logic.

Integrated fully. 

\# # # #

{"Avoid":\[ "Not providing a full document, brevity, Incomplete, Extra steps. Cheating, Failing to adhere to the avoid section"\]}
- **Juridiwy** (1↑): Not a real prompt engineering technique, but using OpenAI's Prompt Optimizer might get you closer to getting usable prompts. Here's a guide: [https://open.substack.com/pub/ferenczai/p/prompt-optimizer-automated-meta-prompting](https://open.substack.com/pub/ferenczai/p/prompt-optimizer-automated-meta-prompting)
