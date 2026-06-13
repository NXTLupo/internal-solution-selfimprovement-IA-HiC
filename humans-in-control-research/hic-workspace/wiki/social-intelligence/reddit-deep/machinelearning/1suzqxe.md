---
id: social-intelligence/reddit-deep/machinelearning/1suzqxe.md
url: "https://www.reddit.com/r/MachineLearning/comments/1suzqxe/opensource_9task_benchmark_for_codingagent/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "Open-source 9-task benchmark for coding-agent retrieval augmentation. Per-task deltas +0.010 to +0.320, all evals reproducible [P]"
author: "kalpitdixit"
date: "2026-04-25T02:33:00.000Z"
score: 2
upvote_ratio: 0.63
num_comments: 1
flair: "Project"
extracted_at: "2026-05-31T23:36:38.265Z"
extraction_method: "praw-deep"
research_goal: "Map emerging AI design trends, essential skills, practical tools, platforms, and technical implementations that enable a company's creative team to integrate AI beyond concepting. Focus on applications supporting design production, system testing, asset generation, governance, and stakeholder confidence."
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1suzqxe.md#c0"
    char_span: [0, 2080]
    sentence_count: 14
    key_terms: [task, selection, reproducible, extraction, agent, tasks, benchmark, retrieval]
    token_count: 448
  - id: "social-intelligence/reddit-deep/machinelearning/1suzqxe.md#c1"
    char_span: [2082, 3953]
    sentence_count: 9
    key_terms: [retrieval, techniques, agent, baseline, extraction, delta, per, technique]
    token_count: 486
  - id: "social-intelligence/reddit-deep/machinelearning/1suzqxe.md#c2"
    char_span: [3955, 4881]
    sentence_count: 8
    key_terms: [paper-lantern-challenges, coding-agent-benchmarks, https, paperlantern-ai, paperlantern, agent, retrieval, architecture-incompatible]
    token_count: 204
---
# Open-source 9-task benchmark for coding-agent retrieval augmentation. Per-task deltas +0.010 to +0.320, all evals reproducible [P]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1suzqxe/opensource_9task_benchmark_for_codingagent/)
Posted by **kalpitdixit** · **2↑** · **1 comments**

Sharing an open-source benchmark suite (`paper-lantern-challenges`) that measures coding-agent performance with vs without retrieval-augmented technique selection across 9 everyday software tasks. Disclosure: I'm the author of the retrieval system under test (paperlantern.ai/code); the artifact being shared here is the benchmark suite itself, not the product. Every prompt, agent code path, and prediction file is in the repo and reproducible.

Setup. Same coding agent (Claude Opus 4.6 as the planner, Gemini Flash 3 as the task model), same input data, same evaluation scripts across all 9 tasks: test generation (mutation score), text-to-SQL (execution accuracy), PDF extraction, contract extraction, PR review, text classification, few-shot prompt selection, LLM routing, summarization evaluation. Independent variable: whether the agent could call a retrieval tool over CS literature before writing its solution. One pass per task, no retries, no manual filtering of outputs.

Task selection. Tasks were chosen to span the everyday-engineering surface a coding agent actually faces, not specialized ML scenarios. Selection criteria: (1) unambiguous quantitative metric, (2) baseline performance well below ceiling, (3) standard datasets where they exist, (4) eval reproducible on a free Gemini API key in roughly 10 minutes per task.

Eval methodology. Each task uses its task-standard quantitative metric (mutation score for test\_generation, execution accuracy for text\_to\_sql, F1 on labeled spans for the extraction tasks, weighted F1 for classification, etc.). Full per-task scripts and dataset choices are in the repo - one directory per task, `evaluate.py` as the entry point, `README.md` per task documenting methodology and dataset.

**Retrieval setup**. The "with retrieval" agent has access to three tool calls: `explore_approaches(problem)` returns ranked candidate techniques from the literature, `deep_dive(technique)` returns implementation steps and known failure modes for a chosen technique, `compare_approaches(candidates)` is for side-by-side when multiple options look viable. The agent decides when and how often to call them. Latency is roughly 20s per call; results cache across sessions. The baseline agent has none of these tools, otherwise identical scaffolding.

**Comparability**. Both agents share the same task-specific user prompt; the only system-prompt difference is the retrieval agent's tool-call grammar. Predictions and per-task prompts are diffable in the repo (`baseline/` and `with_pl/` subdirectories per task).

**Results**.

|Task|Baseline|With retrieval|Delta|
|:-|:-|:-|:-|
|extraction\_contracts|0.444|0.764|\+0.320|
|extraction\_schemas|0.318|0.572|\+0.254|
|test\_generation|0.625|0.870|\+0.245|
|classification|0.505|0.666|\+0.161|
|few\_shot|0.193|0.324|\+0.131|
|code\_review|0.351|0.395|\+0.044|
|text\_to\_sql|0.650|0.690|\+0.040|
|routing|0.744|0.761|\+0.017|
|summeval|0.623|0.633|\+0.010|

The test-generation delta came from the agent discovering mutation-aware prompting - the techniques are MuTAP and MUTGEN - which enumerate every AST-level mutation of the target and require one test per mutation. Baseline wrote generic tests from pretrain priors.

The contract extraction delta came from BEAVER (section-level relevance scoring) and PAVE (post-extraction validation), both 2026 techniques that post-date the agent's training.

10 of the 15 most-cited sources across the experiments were published in 2025 or later, which is the conservative argument for why retrieval matters: the agent could not have reached these techniques from parametric memory.

Failure modes. Self-refinement hurt text-to-SQL (the agent second-guessed correct queries after reading work on SQL ambiguity). Two suggested techniques (DyT, SeeDNorm) were architecture-incompatible in the autoresearch experiment and got discarded. Retrieval surfaces better options, not guaranteed wins.

Reproducibility. Every prompt, every line of agent code, every prediction file, every eval script is in the repo. Each task directory has a README documenting methodology and an `approach.md` showing exactly what the retrieval surfaced and which technique the agent chose.

Repo: [https://github.com/paperlantern-ai/paper-lantern-challenges](https://github.com/paperlantern-ai/paper-lantern-challenges)

Writeup with detailed per-task discussion: [https://www.paperlantern.ai/blog/coding-agent-benchmarks](https://www.paperlantern.ai/blog/coding-agent-benchmarks)

Happy to share additional design choices in comments.
