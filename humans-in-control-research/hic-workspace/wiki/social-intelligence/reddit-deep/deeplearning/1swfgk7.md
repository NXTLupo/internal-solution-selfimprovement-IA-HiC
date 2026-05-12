---
url: "https://www.reddit.com/r/deeplearning/comments/1swfgk7/speculative_decoding_implementations_eagle3/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Speculative Decoding Implementations: EAGLE-3, Medusa-1, PARD, Draft Models, N-gram and Suffix Decoding from scratch"
author: "shreyansh26"
date: "2026-04-26T18:29:35.000Z"
score: 3
upvote_ratio: 1
num_comments: 2
flair: ""
extracted_at: "2026-05-11T17:26:50.055Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Speculative Decoding Implementations: EAGLE-3, Medusa-1, PARD, Draft Models, N-gram and Suffix Decoding from scratch

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1swfgk7/speculative_decoding_implementations_eagle3/)
Posted by **shreyansh26** · **3↑** · **2 comments**

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

- **TheDailySpank** (1↑): https://www.reddit.com/r/LocalLLaMA/s/pTxlNNiAvi
- **ikkiho** (1↑): Solid scope. Covering EAGLE-3, Medusa-1, PARD, draft models, and the training-free PLD/suffix variants in one repo with a shared eval contract is exactly the layout that makes the proposer vs verifier tradeoff legible.

A few things worth flagging as readers go through it:

1. **Acceptance rate is not the right top-line metric.** What matters is `accepted_tokens_per_step / step_latency`, and step latency decomposes into draft cost + verify cost + tree-attention overhead. Medusa-1's heads cost almost nothing because they piggyback on the target's last forward, so even 50% acceptance can beat EAGLE at 70% if EAGLE's tree is too deep or its single-layer draft is being run at an awkward batch shape. This is also why PARD wins despite lower per-chain acceptance: parallel draft chains overlap wall-clock with verification, you only pay the SM utilization cost.

2. **Verifier cost scales with the batch dim, not just speculation length.** At batch 1 (single user, long context) you're KV-bound, so verifying 1 vs 8 tokens is nearly free and speculation is essentially pure win up to memory pressure. At batch 32+ you're MMA-bound, verify length costs linearly, and a tree of width 4 / depth 4 can actively hurt throughput. Worth running the bench at multiple batch sizes if compute allows.

3. **EAGLE-3 vs EAGLE-1/2 is mostly a training-objective story.** The big change is dropping the feature-regression loss and training the head directly on the next-token objective with multi-layer feature fusion (low + mid + high). It's why EAGLE-3 can ship a much smaller head with similar acceptance. If you train EAGLE-3 from scratch on Qwen2.5-7B, the choice of which encoder layers you fuse is the most impactful hyperparam, more than head depth.

4. **PLD and suffix decoding are workload-specific.** They print on RAG (retrieved spans get echoed), code editing (long literal repeats), and summarization with quoting. They are zero-win on open chat. A small workload tag in the bench table would make this obvious.

5. **One small gotcha for the from-scratch crowd**: tree-attention kernels are not at FlashAttention parity yet on most stacks. If you measure spec speedup using a naive O(L^2) attention on the verify pass and no spec on the baseline, you can paint a misleading picture. Pin both paths to the same attention kernel before comparing.

Bookmarking the repo, especially curious about the PARD KV-clone path since most public impls cut corners there.
