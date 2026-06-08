---
id: social-intelligence/reddit-deep/machinelearning/1swfftl.md
url: "https://www.reddit.com/r/MachineLearning/comments/1swfftl/speculative_decoding_implementations_eagle3/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "Speculative Decoding Implementations: EAGLE-3, Medusa-1, PARD, Draft Models, N-gram and Suffix Decoding from scratch [P]"
author: "shreyansh26"
date: "2026-04-26T18:28:51.000Z"
score: 18
upvote_ratio: 0.92
num_comments: 3
flair: "Project"
extracted_at: "2026-05-11T17:27:06.579Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1swfftl.md#c0"
    char_span: [0, 2264]
    sentence_count: 13
    key_terms: [decoding, speculative, draft, methods, implementation, proposer, shreyansh26, speculative-decoding]
    token_count: 488
  - id: "social-intelligence/reddit-deep/machinelearning/1swfftl.md#c1"
    char_span: [2279, 3171]
    sentence_count: 6
    key_terms: [implementation, been, like, east-muffin-6472, architectures, thedailyspank, wise-dust8070, interesting]
    section: Comments
    token_count: 202
---
# Speculative Decoding Implementations: EAGLE-3, Medusa-1, PARD, Draft Models, N-gram and Suffix Decoding from scratch [P]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1swfftl/speculative_decoding_implementations_eagle3/)
Posted by **shreyansh26** · **18↑** · **3 comments**

I’ve been working on an educational implementation repo for speculative decoding:

[https://github.com/shreyansh26/Speculative-Decoding](https://github.com/shreyansh26/Speculative-Decoding)

The goal is not to wrap existing libraries, but to implement several speculative decoding methods from scratch behind a shared decoding/evaluation contract so that the differences between proposer designs are easier to study.

Implemented methods so far:

* EAGLE-3
* Medusa-1
* standard draft model speculation
* PARD / parallel draft models
* n-gram prompt lookup
* suffix decoding

The repo has both training and inference paths where applicable. For learned proposers, I use Qwen/Qwen2.5-7B-Instruct as the target model and small learned/speculative heads or draft models, depending on the method. For training-free methods, the proposer is built from the prompt/generated context.

A few things I wanted the repo to make explicit:

1. The distinction between proposer quality and verifier cost.
2. Why a high acceptance rate does not always imply higher throughput.
3. Why methods like PARD can be faster despite lower acceptance than an autoregressive draft model.
4. How EAGLE/Medusa-style learned heads differ from draft-model speculation.
5. How simple methods like n-gram and suffix decoding behave when the prompt contains a reusable structure.

The repo includes benchmark summaries, command lines, checkpoints/exports, and implementation notes. Some results are intentionally on small train-overlap eval slices due to compute constraints, so I would treat the numbers as implementation/behavioral benchmarks rather than broad generalization claims.

I built this mostly as a learning resource for people who want to understand speculative decoding at the algorithm + systems boundary: how the proposer is trained, how draft tokens are generated, how target verification works, what gets cached, and where the speedups actually come from.

## Comments

- **East-Muffin-6472** (2↑): This is good
  - **Wise-Dust8070** (-1↑): Your implementation looks really solid! I've been diving deep into speculative decoding for work lately and having everything in one place like this is super helpful. The part about acceptance rate vs throughput is something that trips up lot of people - I was explaining this to my team just last week and wished I had resource like this to point them to.

  
Really appreciate that you included the training paths too, most repos just give you the inference side. The EAGLE vs Medusa comparison should be interesting to study, especially since the head architectures are quite different. Going to clone this tonight and try it with some of our internal benchmarks, curious how the PARD implementation performs compared to what we've been using.
- **TheDailySpank** (1↑): https://www.reddit.com/r/LocalLLaMA/s/pTxlNNiAvi
