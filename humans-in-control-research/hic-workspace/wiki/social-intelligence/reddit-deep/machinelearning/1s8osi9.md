---
id: social-intelligence/reddit-deep/machinelearning/1s8osi9.md
url: "https://www.reddit.com/r/MachineLearning/comments/1s8osi9/d_the_problem_with_comparing_ai_memory_system/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] The problem with comparing AI memory system benchmarks — different evaluation methods make scores meaningless"
author: "Efficient_Joke3384"
date: "2026-03-31T14:20:50.000Z"
score: 0
upvote_ratio: 0.27
num_comments: 5
flair: "Discussion"
extracted_at: "2026-05-11T17:27:06.580Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1s8osi9.md#c0"
    char_span: [0, 1147]
    sentence_count: 7
    key_terms: [memory, evaluation, machinelearning, systems, scores, system, performance, different]
    token_count: 241
  - id: "social-intelligence/reddit-deep/machinelearning/1s8osi9.md#c1"
    char_span: [1161, 2938]
    sentence_count: 2
    key_terms: [eval, running, locomo, memory, comparisons, informative, own, benchmarks]
    section: Comments
    token_count: 387
---
# [D] The problem with comparing AI memory system benchmarks — different evaluation methods make scores meaningless

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1s8osi9/d_the_problem_with_comparing_ai_memory_system/)
Posted by **Efficient_Joke3384** · **0↑** · **5 comments**

I've been reviewing how various AI memory systems evaluate their performance and noticed a fundamental issue with cross-system comparison.

Most systems benchmark on LOCOMO (Maharana et al., ACL 2024), but the evaluation methods vary significantly. LOCOMO's official metric (Token-Overlap F1) gives GPT-4 full context 32.1% and human performance 87.9%. However, memory system developers report scores of 60-67% using custom evaluation criteria such as retrieval accuracy or keyword matching rather than the original F1 metric.

Since each system measures something different, the resulting scores are not directly comparable — yet they are frequently presented side by side as if they are.

Has anyone else noticed this issue? How do you approach evaluating memory systems when there is no standardized scoring methodology?

## Comments

- **Kiseido** (3↑): To top that off, there was a recent post about how something like 6% of the answers in LOCOMO are wrong. Meaning a tester that performs perfectly can only get around an 93% on the test.

r/LocalLLaMA/comments/1s1jb94/we_audited_locomo_64_of_the_answer_key_is_wrong/
- **RoggeOhta** (2↑): this is the same problem you see across most ML benchmarks tbh. everyone cherry-picks the metric that makes their system look best. the trick is to always look at the eval methodology section first, not the headline numbers.

for memory systems specifically I've found that just running your own eval on your actual use case is way more informative than any published benchmark. make 20-30 test cases from your real data, score them manually, and you'll know more than any LOCOMO comparison will tell you.
  - **micseydel** (2↑): >running your own eval on your actual use case is way more informative than any published benchmark


Oh, I wish this was so much more common 🙃
- **RandomThoughtsHere92** (1↑): this is a real issue, especially with benchmarks like LOCOMO where teams switch from token-overlap f1 to retrieval accuracy or keyword matching, making comparisons misleading. it’s similar to what happened with MMLU and HellaSwag, where slight evaluation tweaks produced inflated results that looked comparable but weren’t.

most mature teams now evaluate memory systems across multiple axes: retrieval recall, answer correctness, latency, and cost, instead of relying on a single score. another practical approach is running your own task-specific eval set, since memory usefulness is highly dependent on workload patterns. without standardized evaluation pipelines, cross-system leaderboard comparisons are mostly marketing rather than meaningful benchmarking.
