---
id: social-intelligence/reddit-deep/deeplearning/1rsie5v.md
url: "https://www.reddit.com/r/deeplearning/comments/1rsie5v/built_karpathy_autoresearch_like_agent_but_with/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Built karpathy autoresearch like agent but with Kaggle free compute"
author: "SellInside9661"
date: "2026-03-13T09:11:47.000Z"
score: 22
upvote_ratio: 0.88
num_comments: 7
flair: ""
extracted_at: "2026-05-11T17:26:50.054Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1rsie5v.md#c0"
    char_span: [0, 2098]
    sentence_count: 7
    key_terms: [experiments, agent, kaggle, like, experimentation, compute, across, system]
    token_count: 445
  - id: "social-intelligence/reddit-deep/deeplearning/1rsie5v.md#c1"
    char_span: [2112, 3718]
    sentence_count: 12
    key_terms: [agent, like, sellinside9661, architecture, baselines, notebook, taxonomy, planner]
    section: Comments
    token_count: 385
---
# Built karpathy autoresearch like agent but with Kaggle free compute

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1rsie5v/built_karpathy_autoresearch_like_agent_but_with/)
Posted by **SellInside9661** · **22↑** · **7 comments**

Building an AutoResearch-style ML Agent — Without an H100 GPU

Recently I was exploring Andrej Karpathy’s idea of AutoResearch — an agent that can plan experiments, run models, and evaluate results like a machine learning researcher.

But there was one problem . I don't own a H100 GPU or an expensive laptop

So i started building a similar system with free compute

That led me to build a prototype research agent that orchestrates experiments across platforms like Kaggle and Google Colab.
Instead of running everything locally, the system distributes experiments across multiple kernels and coordinates them like a small research lab.
The architecture looks like this:
🔹 Planner Agent → selects candidate ML methods
🔹 Code Generation Agent → generates experiment notebooks
🔹 Execution Agent → launches multiple Kaggle kernels in parallel
🔹 Evaluator Agent → compares models across performance, speed, 
interpretability, and robustness
Some features I'm particularly excited about:
• Automatic retries when experiments fail
• Dataset diagnostics (detect leakage, imbalance, missing values)
• Multi-kernel experiment execution on Kaggle
• Memory of past experiments to improve future runs

⚠️ Current limitation:
The system does not run local LLM and relies entirely on external API calls, so experiments are constrained by the limits of those platforms.

The goal is simple:
Replicate the workflow of a machine learning researcher — but without owning expensive infrastructure

It's been a fascinating project exploring agentic systems, ML experimentation pipelines, and distributed free compute.

This is the repo link https://github.com/charanvadhyar/openresearch

Curious to hear thoughts from others working on agentic AI systems or automated ML experimentation.



#AI #MachineLearning #AgenticAI #AutoML #Kaggle #MLOps

## Comments

- **Intraluminal** (3↑): Just FYI, LMStudio uses OpenAI's API structure, so all you have to do is point your app toward LMStudio's local LLM and you're all set.
- **benevolent001** (2↑): Can you please explain what sort of things we can ask this autoresearch agent to do? Is it like RL ?
- **BountyMakesMeCough** (2↑): Shouldn’t be this called ‘auto parameter’ or ‘auto model’ tuning?
  - **medisonma** (1↑): Agree. With the current example setup, it seems like more of an "ML fine-tuner". But the potential of expanding to another target makes it sound more like a "researcher".
- **SellInside9661** (1↑): Hey guys added a new data preparation agent to the architecture so that llms can make more informed decison during code generation
- **Otherwise_Wave9374** (0↑): This is a really fun build. The multi-agent split (planner, codegen, executor, evaluator) is basically the "research lab" pattern people are converging on.

How are you handling memory across runs, like tracking what has already been tried, and preventing the planner from re-discovering the same baselines? Also, do you have a failure taxonomy (OOM vs data issues vs notebook errors) so the agent can react differently? Related agent architecture notes here: https://www.agentixlabs.com/blog/
  - **SellInside9661** (3↑): We track past experiments through a memory agent. But currently we don't have hard block on repeating and rediscovering the same baselines. And we implemented a very light taxonomy to detect only script errors in notebook. We will take your suggestions into account and try to fix the issues accordingly. Thank you
