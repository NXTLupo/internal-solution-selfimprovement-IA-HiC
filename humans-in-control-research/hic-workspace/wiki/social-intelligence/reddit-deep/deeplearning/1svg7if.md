---
id: social-intelligence/reddit-deep/deeplearning/1svg7if.md
url: "https://www.reddit.com/r/deeplearning/comments/1svg7if/three_lessons_from_finetuning_a_5b_code_assistant/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Three lessons from fine-tuning a 5B code assistant — bad outputs from 5% → 0%"
author: "Zealousideal-Yard328"
date: "2026-04-25T16:07:50.000Z"
score: 4
upvote_ratio: 0.75
num_comments: 1
flair: ""
extracted_at: "2026-05-11T17:26:50.057Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, enterprise_it]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1svg7if.md#c0"
    char_span: [0, 1854]
    sentence_count: 9
    key_terms: [fine-tuning, model, training, outputs, inference-time, deeplearning, wrong, bad]
    token_count: 506
  - id: "social-intelligence/reddit-deep/deeplearning/1svg7if.md#c1"
    char_span: [1856, 3288]
    sentence_count: 7
    key_terms: [fine-tuning-5b-code-assistant-three-lessons, instruction, https, wrong, microgpt, correct, deliberately, pretraining]
    token_count: 333
---
# Three lessons from fine-tuning a 5B code assistant — bad outputs from 5% → 0%

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1svg7if/three_lessons_from_finetuning_a_5b_code_assistant/)
Posted by **Zealousideal-Yard328** · **4↑** · **1 comments**

Spent a week doing LoRA fine-tuning on **Gemma 4 E2B** (gemma-4-e2b-it, \~5.1B total params, \~2B active in the text decoder) for a narrow Python code-generation task.

**Setup:**

* Model: Gemma 4 E2B, bf16, language\_model only (vision + audio towers frozen)
* LoRA: rank 32, alpha 64, on text decoder q/k/v/o + gate\_proj/up\_proj/down\_proj
* Training: \~5,000 examples
* Hardware: M-series Mac, \~30 sec per query

**Final results across 134 test generations:**

|Setting|Bad outputs|
|:-|:-|
|Deterministic (greedy)|**0 / 69 (0.0%)**|
|Sampled (temp=0.7)|1 / 65 (1.5%)|
|Baseline before interventions|\~5% on diverse stress tests|

Three observations from instrumenting the model token-by-token:

**1. Watching probabilities surfaces data leaks.**

I instrumented top-K candidates at every generation step. On one bad output, the wrong answer had 55.3% probability and the right answer had 38.0%. Tracked it back to a small fraction of training rows that slipped through my data filter with old (Python 2) syntax. The model learned them faithfully — surfaced in test outputs at almost exactly the training frequency.

**2. Prompt signal can outweigh adapter bias (inference-time, not fine-tuning).**

Without changing weights, adding "prefer X, not Y" to the prompt flipped the same decision point to 56.2% right / 34.1% wrong. A 22-point swing.

Not really a fine-tuning lesson — more an inference-time observation that shaped how I designed prompts for the deployed system.

**3. Fine-tuning made the model context-compliant — including with wrong context.**

Same query, two models, deliberately misleading instruction:

* **Fine-tuned:** followed the misleading instruction, wrote \~60 lines of confidently wrong code
* **Base Gemma 4 E2B:** ignored the bad signal, reverted to safer patterns from pretraining

The training corpus was almost entirely "clean instruction → correct code" pairs. No examples where the instruction was wrong and the correct response was to ignore it. So the adapter has no representation for "instruction is wrong, push back." Base model has more of that distribution because pretraining includes Stack Overflow corrections, blog critiques, etc.

Likely mitigation (untested): include adversarial examples in fine-tuning — deliberately wrong instructions paired with correct code that ignores them.

The retrieval-confidence gate (use specialist when retrieval is confident, fall back to base when it isn't) ended up mattering more than the adapter itself.

**Stack:** Hugging Face transformers + PEFT + TRL, sentence-transformers for retrieval.

Inspired by Karpathy's MicroGPT post: [https://karpathy.github.io/2026/02/12/microgpt/](https://karpathy.github.io/2026/02/12/microgpt/)

Full writeup with charts: [https://aiexplr.com/post/fine-tuning-5b-code-assistant-three-lessons](https://aiexplr.com/post/fine-tuning-5b-code-assistant-three-lessons)

## Comments

- **Downtown_Finance_661** (1↑): What are rank and alpha? And what exact layers did you lora-ed?
