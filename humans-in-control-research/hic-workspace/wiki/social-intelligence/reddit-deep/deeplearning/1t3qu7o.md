---
id: social-intelligence/reddit-deep/deeplearning/1t3qu7o.md
url: "https://www.reddit.com/r/deeplearning/comments/1t3qu7o/p_i_built_a_triton_kvcache_compression_engine/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "[P] I built a Triton KV-cache compression engine: 3.37x compression, 0.69ms P99 on an A10"
author: "Superb_Housing9628"
date: "2026-05-04T18:49:36.000Z"
score: 2
upvote_ratio: 1
num_comments: 0
flair: ""
extracted_at: "2026-05-11T17:26:50.057Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, enterprise_it]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1t3qu7o.md#c0"
    char_span: [0, 1932]
    sentence_count: 6
    key_terms: [compression, omnistack-rs, users, benchmark, kernel, deeplearning, personalized, quantization]
    concepts: [compression, omnistack-rs, benchmark, users, deeplearning]
    token_count: 500
    sources: [{"n":"reddit-deep: r/deeplearning","u":"https://www.reddit.com/r/deeplearning/comments/1t3qu7o/p_i_built_a_triton_kvcache_compression_engine/"}]
  - id: "social-intelligence/reddit-deep/deeplearning/1t3qu7o.md#c1"
    char_span: [1934, 2365]
    sentence_count: 5
    key_terms: [e0e0c9f092a84a00c56754322a66c07b457e1497, recommender-style, int4, png, a99y8bs9m7yg1, compression, convincing, benchmark]
    token_count: 130
---
# [P] I built a Triton KV-cache compression engine: 3.37x compression, 0.69ms P99 on an A10

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1t3qu7o/p_i_built_a_triton_kvcache_compression_engine/)
Posted by **Superb_Housing9628** · **2↑** · **0 comments**

I built **OmniStack-RS**, a KV-cache compression and personalized inference experiment for LLM-style recommendation systems.

The basic problem I wanted to explore: if every user/session carries a context cache or personalized adapter state, GPU memory becomes the bottleneck very quickly. BF16 KV cache is expensive, and scaling concurrent users usually means scaling GPU count.

So I built a compressed serving path using:

* INT4 Lloyd-Max quantization for KV cache values
* 1-bit Rademacher QJL residual to recover some quantization error
* A fused Triton attention kernel that does dequantization, softmax, and output in one pass
* O(1) Multi-LoRA dispatch for per-user personalization
* Nsight Compute profiling, not just Python timers

Benchmark setup:

* NVIDIA A10
* Criteo Day 23 ad interaction data
* 256 users loaded
* batch size: 64 users/query
* sequence length: 50 tokens
* 100 timed queries

Results:

* P99 kernel latency: **0.69 ms**
* P99 end-to-end latency with Poisson arrivals: **1.13 ms**
* Throughput: **1,633.93 queries/sec**
* User-context throughput: **104,571 users/sec**
* Compression: **3.37x**, BF16 to 4.75 bits/element
* Max error vs FP32: **0.002403**
* Numerical parity: **PASS**

Important clarification: this is not claiming an official closed MLPerf submission. It is an Open/custom server-style benchmark harness for this kernel and serving path.

Repo with code, benchmark scripts, raw outputs, and screenshots:  
[https://github.com/deepsheth3/Omnistack-RS](https://github.com/deepsheth3/Omnistack-RS)

I’d love feedback from people working on inference systems, GPU kernels, or recommender infra:

1. Does the INT4 + 1-bit QJL residual tradeoff make sense compared with pure INT4 or INT8?
2. What would be the most fair baseline to compare against next?
3. What benchmark setup would make this more convincing?
4. Any obvious issues in how I’m thinking about KV cache compression for recommender-style serving?

https://preview.redd.it/a99y8bs9m7yg1.png?width=2940&format=png&auto=webp&s=e0e0c9f092a84a00c56754322a66c07b457e1497
