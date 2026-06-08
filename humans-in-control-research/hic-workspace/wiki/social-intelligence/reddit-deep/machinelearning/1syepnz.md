---
id: social-intelligence/reddit-deep/machinelearning/1syepnz.md
url: "https://www.reddit.com/r/MachineLearning/comments/1syepnz/the_structured_output_benchmark_sob_validates/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "The Structured Output Benchmark (SOB) - validates both JSON parse and value accuracy [R]"
author: "404llm"
date: "2026-04-28T21:22:09.000Z"
score: 6
upvote_ratio: 0.87
num_comments: 0
flair: "Research"
extracted_at: "2026-05-11T17:27:06.581Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1syepnz.md#c0"
    char_span: [0, 1733]
    sentence_count: 3
    key_terms: [json, png, value, overall, structured, https, benchmark, accuracy]
    token_count: 476
  - id: "social-intelligence/reddit-deep/machinelearning/1syepnz.md#c1"
    char_span: [1735, 2568]
    sentence_count: 3
    key_terms: [interfaze, introducing-structured-output-benchmark, https, structured-output-benchmark, leaderboards, blog, full, dataset]
    token_count: 186
---
# The Structured Output Benchmark (SOB) - validates both JSON parse and value accuracy [R]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1syepnz/the_structured_output_benchmark_sob_validates/)
Posted by **404llm** · **6↑** · **0 comments**

Current structured output benchmarks only validate pass rate for json schema and types, however more commonly the issue tends to be inaccurate json values.

For example hallucinated \`total\_price\` number when extracting value from a invoice or an array ordered wrongly because of inaccurate date mapping.

The Structured output benchmark measures 7 key metrics instead of json schema.

* Value Accuracy (primary): exact leaf-value match against verified ground truth
* JSON Pass Rate, Type Safety, Path Recall, Structure Coverage (structural)
* Faithfulness: are values grounded in context or hallucinated?
* Perfect Response: every single leaf value correct
* Modalities: text, image and audio

**Overall results**

[Overall benchmark results](https://preview.redd.it/05c2exsrwzxg1.png?width=2304&format=png&auto=webp&s=ee43a0e0691c6c7dda8e03feb72ec31e3bc982f6)

Open source is doing pretty well with GLM 4.7 coming number 2 right below GPT 5.4.

**JSON-pass vs Value-Accuracy gap**

[JSON-pass vs Value-Accuracy gap](https://preview.redd.it/zjxkuysuwzxg1.png?width=2304&format=png&auto=webp&s=4a686ffc0ad38edb710d452a1c42ad4bf2d36262)

What's interesting here is that while most models hit 90%+ on JSON schema pass, all of them drop significantly on value accuracy.

**Overall best by modality**

[Overall best by modality](https://preview.redd.it/ghasera2zzxg1.png?width=1344&format=png&auto=webp&s=558b28e889a168ddd6a8ea5935202fb2c7e435ec)

Full breakdown blog: [https://interfaze.ai/blog/introducing-structured-output-benchmark](https://interfaze.ai/blog/introducing-structured-output-benchmark)  
Full leaderboard: [https://interfaze.ai/leaderboards/structured-output-benchmark](https://interfaze.ai/leaderboards/structured-output-benchmark)  
Paper: [https://interfaze.ai/sob\_paper.pdf](https://interfaze.ai/sob_paper.pdf) (Pending arXiv)

The full break down goes deeper into different modalities, how we designed the dataset, and how we performed the benchmark. All code and dataset is open source 😄

Our goal is to be the best general model for deterministic tasks and a key aspect of determinism is controllable and consistent output structure. The first step to making structured output better is to measure it and hold ourselves and the industry against the best.
