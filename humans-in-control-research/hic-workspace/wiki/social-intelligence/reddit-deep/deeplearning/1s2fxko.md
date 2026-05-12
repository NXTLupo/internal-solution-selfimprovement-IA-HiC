---
url: "https://www.reddit.com/r/deeplearning/comments/1s2fxko/promptfoo_autoresearch_autoprompter_autonomous/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "PromptFoo + AutoResearch = AutoPrompter. Autonomous closed-loop prompt optimization."
author: "gvij"
date: "2026-03-24T14:50:44.000Z"
score: 10
upvote_ratio: 0.86
num_comments: 5
flair: ""
extracted_at: "2026-05-11T17:26:50.056Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# PromptFoo + AutoResearch = AutoPrompter. Autonomous closed-loop prompt optimization.

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1s2fxko/promptfoo_autoresearch_autoprompter_autonomous/)
Posted by **gvij** · **10↑** · **5 comments**

The gap between "measured prompt performance" and "systematically improved prompt" is where most teams are stuck. PromptFoo gives you the measurement. AutoResearch gives you the iteration pattern. AutoPrompter combines both.



To solve this, I built an autonomous prompt optimization system that merges PromptFoo-style validation with AutoResearch-style iterative improvement.



The Optimizer LLM generates a synthetic dataset from the task description, evaluates the Target LLM against the current prompt, scores outputs on accuracy, F1, or semantic similarity, analyzes failure cases, and produces a refined prompt. A persistent ledger prevents duplicate experiments and maintains optimization history across iterations.



Usage example:

    python main.py --config config_reasoning.yaml



What this actually unlocks for serious work: prompt quality becomes a reproducible, traceable artifact. You validate near-optimality before deployment rather than discovering regression in production.



Open source on GitHub:

[https://github.com/gauravvij/AutoPrompter](https://github.com/gauravvij/AutoPrompter)



FYI: A problem to improve right now: Dataset quality is dependent on Optimizer LLM capability. 

Curious how others working in automated prompt optimization are approaching either?

## Comments

- **bonniew1554** (3↑): promptfoo had a kid with autoresearch and now the optimizer llm is raising a synthetic dataset like a proud parent who grades their own kid's homework.
- **SeeingWhatWorks** (1↑): Closed-loop prompt optimization only really holds up if your evaluation data is grounded in real task distributions, otherwise you’re just overfitting to synthetic benchmarks and calling it progress.
