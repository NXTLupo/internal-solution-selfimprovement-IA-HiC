---
url: "https://www.reddit.com/r/deeplearning/comments/1skv8tw/we_built_a_pregeneration_llm_guardrail_that/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "We built a pre-generation LLM guardrail that blocks prompt injection at the residual stream level, before the model outputs anything [Mistral 7B, 0% FP, 100% detection]"
author: "Turbulent-Tap6723"
date: "2026-04-14T02:02:07.000Z"
score: 2
upvote_ratio: 0.67
num_comments: 8
flair: ""
extracted_at: "2026-05-11T17:26:50.044Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# We built a pre-generation LLM guardrail that blocks prompt injection at the residual stream level, before the model outputs anything [Mistral 7B, 0% FP, 100% detection]

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1skv8tw/we_built_a_pregeneration_llm_guardrail_that/)
Posted by **Turbulent-Tap6723** · **2↑** · **8 comments**

Most LLM monitors work like this: the model generates a response, you check if it’s bad, you log it. By the time you alert, the output already exists.

We built something different. Arc Sentry hooks into the residual stream of open source LLMs and scores the model’s internal decision state before calling generate(). Injections get blocked before a single token is produced.

How it works:

	1.	Compute layer delta Δh = h\[30\] − h\[29\] at the decision layer

	2.	Mean-pool over prompt tokens

	3.	Score against warmup baseline using multi-projection centroid distance

	4.	If anomalous, block. generate() never runs.

Results on Mistral 7B:

	•	False positives: 0% on domain-specific traffic

	•	Injection detection: 100% (5/5, confirmed across multiple trials)

	•	Behavioral drift detection: 100% (verbosity shift, refusal style change)

	•	Warmup required: 5 requests, no labeled data

The honest constraint:

Works best on single-domain deployments, customer support bots, internal tools, fixed-use-case APIs. It’s a domain-conditioned guardrail, not a universal detector.

The key property:

The model never generates a response to blocked inputs. Not filtered after. Never generated.

Code: https://github.com/9hannahnine-jpg/bendex-sentry

Papers + website: https://bendexgeometry.com

pip install bendex

Feedback welcome, especially from anyone running open source models in production who has dealt with prompt injection.

## Comments

- **Key-Half1655** (4↑): 100% detection rate is a bold statement with only 5 tests...

How do you fare against any of the OSS benchmarks?
  - **Turbulent-Tap6723** (1↑): To clarify, it’s 5 injection prompts across 5 independent trials with fresh baselines each time (25 total evaluations), zero variance. Still a small test set and the criticism is fair.
On OSS benchmarks: we ran against 100 JailbreakBench harmful behaviors and results hold, but haven’t done a formal HarmBench or AdvBench evaluation with standardized attack strings yet. That’s the next step. Which benchmark would you find most credible? Genuinely asking, we want to evaluate against whatever practitioners actually trust.
    - **Key-Half1655** (2↑): For OSS start with Garak or PyRit, there are options for private testing on hidden benchmarks too if you want to go that route.

Most important thing is to have enough samples in your test to have a confidence interval > 95% and as low margin of error as possible.
- **wahnsinnwanscene** (2↑): Isn't this less about prompt injection and more about a residual stream guardrail?
  - **Turbulent-Tap6723** (1↑): You’re right, residual stream guardrail is the more precise term. Prompt injection is the most obvious use case to demonstrate it, but the signal catches behavioral drift more broadly. The interesting finding is that different behavior types (injection vs verbosity drift vs refusal drift) encode at different depths in the residual stream.
- **Turbulent-Tap6723** (1↑): Update: ran Arc Sentry against Garak promptinject suite. HijackHateHumans, HijackKillHumans, HijackLongPrompt — 192/192 blocked, 100% across all three probes. All blocked before generate() was called.
- **CompelledComa35** (1↑): Blocking at residual stream is clever but attacks are shifting to the supply chain. We've seen prompt injection move to package tampering and training data poisoning.

We use a mix of approaches: runtime guardrails like yours, plus supply chain scanning (we alice's caterpillar) and adversarial testing. Defense needs to be multi‑layer because attackers target the weakest link not the strongest guard.

Your approach plus supply chain monitoring plus human review is the only way to stay ahead.
