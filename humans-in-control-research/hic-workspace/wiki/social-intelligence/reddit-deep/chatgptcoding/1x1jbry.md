---
id: social-intelligence/reddit-deep/chatgptcoding/1x1jbry.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1x1jbry/i_tested_16_ai_modelreasoning_combinations_on_the/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "I tested 16 AI model/reasoning combinations on the same real Unity task and allowance use ranged 1-20%"
author: "AlexXx52"
date: "2026-10-09T11:51:57.000Z"
score: 2
upvote_ratio: 1
num_comments: 0
flair: "Discussion"
extracted_at: "2026-10-09T16:37:34.765Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1x1jbry.md#c0"
    char_span: [0, 2518]
    sentence_count: 9
    key_terms: [investigation, whether, project, integration, model, unity, allowance, real]
    concepts: [investigation, whether, integration, project, allowance]
    token_count: 524
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1x1jbry/i_tested_16_ai_modelreasoning_combinations_on_the/","kind":"social-post","date":"2026-10-09","author":"AlexXx52","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1x1jbry.md#c1"
    char_span: [2520, 3007]
    sentence_count: 5
    key_terms: [subscription, allowance, compute, pro, necessarily, percentages, comparison, equivalent]
    concepts: [subscription, allowance, compute]
    token_count: 100
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1x1jbry/i_tested_16_ai_modelreasoning_combinations_on_the/","kind":"social-post","date":"2026-10-09","author":"AlexXx52","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1x1jbry.md#c2"
    char_span: [3009, 4164]
    sentence_count: 4
    key_terms: [approx, min, claude, medium, high, gpt-6, sol, sonnet]
    concepts: [approx, claude, medium, gpt-6, sonnet]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1x1jbry.md#c3"]
    token_count: 508
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1x1jbry/i_tested_16_ai_modelreasoning_combinations_on_the/","kind":"social-post","date":"2026-10-09","author":"AlexXx52","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1x1jbry.md#c3"
    char_span: [4166, 5251]
    sentence_count: 3
    key_terms: [claude, medium, models, best, opus, asset, value, deep-investigation]
    concepts: [claude, medium, models, asset, value]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1x1jbry.md#c2"]
    token_count: 241
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1x1jbry/i_tested_16_ai_modelreasoning_combinations_on_the/","kind":"social-post","date":"2026-10-09","author":"AlexXx52","subreddit":"chatgptcoding"}]
---
# I tested 16 AI model/reasoning combinations on the same real Unity task and allowance use ranged 1-20%

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1x1jbry/i_tested_16_ai_modelreasoning_combinations_on_the/)
Posted by **AlexXx52** · **2↑** · **0 comments**

Hi. Did not find any similar test so I did my own. Maybe usefull to someone else too. I wanted to figure out which AI model/reasoning mode actually makes sense for everyday coding work not based on synthetic benchmarks or API token prices but on *how much useful work I can get from a normal paid subscription*.

I mainly work on a fairly large Unity 6 projects so I used one real project investigation as the benchmark.

**The three subscriptions I tested were:**

\- ChatGPT Plus

\- Claude Pro

\- Google AI Pro

All of them are roughly in the same **\~€20/month** consumer price range.



My goal was simple: *If I pay roughly the same amount for each service, which models give me the best combination of quality, speed and included usage allowance for real coding/agentic work?*



**## The task**

Every model received essentially the same read-only investigation task on the same Unity project. The project uses Unity 6 and several third-party assets.



The task was to:

\- investigate how resource harvesting currently works

\- trace how the equipped tools interact with resources

\- inspect integration

\- locate and inspect files

\- determine whether a direct integration or adapter was needed

\- identify the exact relevant scripts, prefabs and components

\- recommend the minimal integration architecture

\- point out unknown assumptions and risks

\- not modify anything



This was intentionally not a small "write me a function" prompt. I wanted something closer to the kind of repository investigation I actually use coding agents for.



**## What I measured**

For each run I recorded:

\- **Allowance used** \- percentage of that subscription's own usage limit consumed

\- **Time** \- approximate wall-clock completion time

\- **Quality** \- my subjective rating of the final investigation



For quality I looked mainly at:

\- correctness

\- depth of project-specific investigation

\- hallucinations

\- whether the model distinguished facts from assumptions

\- whether it found the actual files/components involved

\- whether the proposed architecture matched the real project

\- whether it discovered relevant things outside the obvious search path



**## Important caveat**

The allowance percentages are not equivalent units of compute between providers. For example 4% of Claude Pro is not necessarily the same amount of compute as 4% of ChatGPT Plus or Google AI Pro. That is not what I was trying to measure. What I wanted to know was:

If I pay roughly €20/month for this subscription, how much useful coding work can I get from the included allowance?

So this is primarily a subscription value / practical workflow comparison not an API pricing benchmark.

|Model|Mode|Allowance|Time|Quality|
|:-|:-|:-|:-|:-|
|Claude Sonnet 5.5|Medium|approx. 1%|5 min|8.3/10|
|GPT-6.1 Sol|Medium|approx. 3%|3 min|9.0/10|
|Claude Opus 5.5|Medium|approx. 4%|8 min|9.7/10|
|Claude Opus 4.8|Medium|approx. 3%|4 min|8.6/10|
|Gemini 3.1 Pro|High|approx. 4%|16 min|8.6/10|
|Claude Sonnet 4.6|Medium|approx. 4%|4 min|7.8/10|
|Claude Sonnet 5.5|High|approx. 4%|7 min|8.9/10|
|GPT-6.1 Sol|High|approx. 5%|5 min|9.2/10|
|Claude Opus 5.5|High|approx. 5%|12 min|9.8/10|
|Claude Opus 4.8|High|approx. 6%|11 min|8.2/10|
|Claude Sonnet 4.6|High|approx. 9%|6 min|8.0/10|
|GPT-5.6 Sol|Medium|approx. 12%|13 min|9.2/10|
|GPT-6 Astra|Medium|approx. 14%|5 min|9.0/10|
|GPT-6.1 Sol|Ultra|approx. 17%|7 min|9.3/10|
|GPT-5.6 Sol|High|approx. 18%|16 min|9.3/10|
|GPT-6 Astra|High|approx. 20%|14 min|9.3/10|



One reason I found this test interesting is that the models did not just differ in "how smart" the final answer looked. They also chose very different investigation strategies.

Somem asset mentioned in the task was not actually imported into the Unity project. Most models searched the repository, confirmed it was missing and stopped there.

Claude Opus 5.5 (medium and high) independently searched the local Unity Asset Store cache, found the downloaded .unitypackage, unpacked a copy outside the project, inspected the real source files and prefabs and changed its recommendation based on what the asset actually did.

That kind of agentic behavior was one of the biggest differences I noticed between models.

  
**## Models I did not test**

I would have liked to include Fable and Gemini 4 but they were not included in the normal subscription allowance available to me or would have required separate paid usage/credits.

Since the point of this comparison was to compare what I actually get from roughly €20/month consumer subscriptions, I left separately billed models out.

# My practical takeaways

* **Best everyday default:** GPT-6.1 Sol Medium
* **Best deep-investigation value:** Claude Opus 5.5 Medium
* **Cheapest useful scout:** Claude Sonnet 5.5 Medium
* **Best critical / forensic option:** Claude Opus 5.5 High
* Older Claude models, GPT-5.6 Sol and Astra were generally poor value in this particular test.
