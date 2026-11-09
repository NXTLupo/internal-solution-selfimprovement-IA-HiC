---
id: articles/analytics-vidhya/daba8c08a0.md
url: "https://www.analyticsvidhya.com/blog/2026/09/four-caches-in-llm-serving/"
url_hash: "daba8c08a0"
kind: "article"
source: "analytics_vidhya"
title: "The Four Caches in LLM Serving"
author: ""
date: "Tue, 08 Sep 2026 12:13:31 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-09-10T17:35:18.849051+00:00"
chars: 10000
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:35:18.605Z"
relevance: 0
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "5b8d74916313a7a1"
relevance_by_goal: {"5a163910d68e":0}
chunks:
  - id: "articles/analytics-vidhya/daba8c08a0.md#c0"
    char_span: [0, 134]
    sentence_count: 1
    key_terms: [four-caches-in-llm-serving, analyticsvidhya, serving, caches, source, https, blog, com]
    token_count: 41
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/09/four-caches-in-llm-serving/","kind":"article","date":"2026-09-08"}]
  - id: "articles/analytics-vidhya/daba8c08a0.md#c1"
    char_span: [136, 2714]
    sentence_count: 25
    key_terms: [caching, tokens, model, states, cache, response, token, different]
    concepts: [caching, tokens, model, states, response]
    token_count: 512
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/09/four-caches-in-llm-serving/","kind":"article","date":"2026-09-08"}]
  - id: "articles/analytics-vidhya/daba8c08a0.md#c2"
    char_span: [2384, 5051]
    sentence_count: 25
    key_terms: [request, prefix, prompt, cache, caching, states, system, block]
    concepts: [request, prefix, prompt, cache, caching]
    related_chunks: ["articles/analytics-vidhya/daba8c08a0.md#c3", "articles/analytics-vidhya/daba8c08a0.md#c4", "articles/analytics-vidhya/daba8c08a0.md#c5"]
    token_count: 512
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/09/four-caches-in-llm-serving/","kind":"article","date":"2026-09-08"}]
  - id: "articles/analytics-vidhya/daba8c08a0.md#c3"
    char_span: [4690, 7050]
    sentence_count: 20
    key_terms: [blocks, cache, request, new, prefix, block, states, system]
    concepts: [blocks, cache, request, prefix, block]
    related_chunks: ["articles/analytics-vidhya/daba8c08a0.md#c2"]
    token_count: 512
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/09/four-caches-in-llm-serving/","kind":"article","date":"2026-09-08"}]
  - id: "articles/analytics-vidhya/daba8c08a0.md#c4"
    char_span: [6829, 9522]
    sentence_count: 19
    key_terms: [caching, prompt, provider, prefix, different, image, multimodal, processed]
    concepts: [caching, provider, prompt, different, prefix]
    related_chunks: ["articles/analytics-vidhya/daba8c08a0.md#c2", "articles/analytics-vidhya/daba8c08a0.md#c5"]
    token_count: 512
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/09/four-caches-in-llm-serving/","kind":"article","date":"2026-09-08"}]
  - id: "articles/analytics-vidhya/daba8c08a0.md#c5"
    char_span: [9142, 10137]
    sentence_count: 10
    key_terms: [provider, prompt, caching, previously, reusing, cache, point, state]
    concepts: [provider, prompt, caching, previously, reusing]
    related_chunks: ["articles/analytics-vidhya/daba8c08a0.md#c2", "articles/analytics-vidhya/daba8c08a0.md#c4"]
    token_count: 178
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/09/four-caches-in-llm-serving/","kind":"article","date":"2026-09-08"}]
---
# The Four Caches in LLM Serving

Source: [analytics_vidhya](https://www.analyticsvidhya.com/blog/2026/09/four-caches-in-llm-serving/)

As LLM applications grow more complex, inference cost and latency become increasingly important. A single request can contain thousands or even millions of tokens from system instructions, conversation history, retrieved documents, tool definitions, and user input. Reprocessing the same information again and again wastes both time and compute.
Caching helps avoid this repeated work. But LLM caching isn’t a single technique. Different caches operate at different stages of the serving stack and solve different problems. In this article, we’ll explore four key techniques: KV caching, prefix caching, prompt caching, and semantic caching.
Let’s start with the cache that is fundamental to every modern autoregressive LLM inference: the KV cache.
When the LLM generates a response, it doesn’t produce the entire response in one shot. It generates one token at a time autoregressively. For example, if the model is generating the sentence “Quantum computing is a new approach to computation,” the model might generate it approximately as: “Quantum” → “computing” → “is” → “a” → “new” → “approach” → … and so on.
At every generation step, the Transformer uses its attention mechanism to determine how the new token should interact with the tokens that came before it. As part of this attention computation, the model produces Key (K) and Value (V) tensors for the tokens it has processed. These tensors are useful for subsequent tokens because future tokens need to attend to the previous context.
Without caching, the model would repeatedly recompute the K/V representations associated with the earlier tokens from scratch. As the generated sequence becomes longer, this repeated work becomes increasingly expensive and highly time consuming. And no one likes a slow response.
The KV cache solves this by storing those previously computed K/V tensors in memory, typically GPU memory which we here call it KV Cache. When the next token needs to be generated, the model can reuse the cached K/V states instead of recomputing them.
The key idea is simple: compute the K/V states once, store them, and reuse them during next upcoming decoding steps.
Consider a prompt containing “I love LLMs.” During the initial prefill phase, the model processes the prompt and produces K/V states for those tokens. Those states are placed into the KV cache. When the model begins generating the response, the cached states can be reused while the newly generated token contributes its own K/V states.
This is one of the reasons KV caching is so important for autoregressive inference. Instead of repeatedly reconstructing the attention state of the entire conversation at every decoding step, the serving system maintains that state and incrementally appends into that state.
There is, however, an important limitation: a traditional KV cache is generally associated with an active sequence or request. Once that request is finished, its KV state isn’t automatically useful to an unrelated future request. And that leads us to the next technique.
If you want to read about KV Caching and how it works in detail: https://www.analyticsvidhya.com/blog/2025/11/kv-caching-guide/
In an active LLM request, the KV cache helps the model avoid recomputing tokens it has already processed. But what happens when a completely new request arrives with the same beginning as an earlier request? The model normally has no reason to recompute that shared prefix from scratch—but without prefix caching, that is exactly what happens.
This is where prefix caching comes in.
Suppose an application sends the following prompt:
You are an AI assistant for Acme. Follow these company policies…Use these tools when necessary…What is the refund policy?
A second user might send:
You are an AI assistant for Acme.Follow these company policies…Use these tools when necessary…How do I cancel my subscription?
The questions are different, but a large portion of the prompt is identical. The system prompt, policies, instructions, and tool definitions may all be shared.
Instead of processing this entire prefix again, a prefix cache allows the serving system to reuse the KV states that were already computed for the shared portion.
Prefix caching typically works by dividing the prompt into fixed-size blocks of tokens. Each completed block corresponds to a portion of the KV cache. For example, imagine a simplified prompt divided into four-token blocks:
The serving system can associate each block with a hash derived from the block’s contents and its position in the prefix. These hashes allow a new request to determine whether the corresponding KV block already exists in the cache. This is important because we don’t want to compare entire prompts character by character every time. Instead, the system can efficiently identify previously computed blocks and determine which portions of the new request can be reused.
Consider a second request:
[A B C D] [E F G H] [I J Y Z] [Q R S T]
The first two blocks are identical to the previous request, while the remaining blocks are different.
The cache lookup therefore looks conceptually like this:
Block 0 → CACHE HIT ✓Block 1 → CACHE HIT ✓Block 2 → CACHE MISS ✗Block 3 → CACHE MISS ✗
The serving system can reuse the K and V states for Blocks 0 and 1 instead of recomputing them. Only the uncached portion needs to go through the model’s computation.
The following animation visualizes this entire process from splitting the prompt into blocks, hashing them, storing their KV states, finding matching blocks in a new request, reusing cache hits, and finally evicting old blocks when the cache becomes full.
The key part to watch is the transition from CACHE HIT → REUSE. The second request doesn’t need to start from zero: it can pick up from the already-computed KV states of its shared prefix.
It is worth making one distinction here. Prefix caching does not simply store the text:
[A B C D]
and return it when the same text appears again.
The useful thing being stored is the model’s computed KV state associated with those tokens. When the prefix is encountered again, those states can be loaded and reused during inference. This is why prefix caching can significantly reduce the amount of prefill computation required for workloads where many requests share a common beginning.
KV cache memory is finite. If the serving system continuously adds new blocks, eventually there will not be enough GPU memory to keep everything. This is where eviction comes into play. A common strategy is LRU (Least Recently Used) eviction. When space is needed, blocks that have not been used recently are removed first, making room for newly computed blocks.
Conceptually:
Cache: [OLD] [OLD] [A] [B] [C] [D] ↑ LRU Need space ↓ Evict old blocks ↓ [NEW] [NEW] [A] [B] [C] [D]
So prefix caching isn’t simply “store everything forever.” A real serving system has to continuously manage which KV blocks are worth keeping and which can be discarded.
The same idea becomes more interesting with multimodal models.
Consider:
“What is shown in this image?”+ Image A
and later:
“What is shown in this image?”+ Image B
The textual portion is identical, but the image is different. A cache therefore cannot treat the requests as identical simply because their text matches. The multimodal input also needs to be represented correctly when determining whether a cached computation is reusable.
This becomes an important consideration for systems serving vision-language models, where prompts may contain text, images, audio, or other multimodal inputs.
The two are closely related, but they solve different problems. KV caching primarily helps within an ongoing autoregressive generation: “I’ve already processed these tokens for this request, so don’t recompute their K/V states.”
Prefix caching extends the idea across different requests: “I’ve already processed this exact prefix for another request, so reuse those K/V states.”
In systems such as vLLM, prefix caching is implemented using block-based KV-cache management, hashing, cache lookup, and eviction mechanisms. The exact implementation details are more involved than the conceptual model presented here, but the underlying idea remains the same: identify a previously computed prefix and reuse its KV blocks instead of performing the same computation again.
Now consider a slightly different scenario from above ones. Instead of hosting the model yourself, you’re using an LLM through an API provider. Your application might repeatedly send a very large system prompt containing documentation, instructions, tool definitions, examples, and other context. The user query only changes every time, but perhaps tens of thousands of tokens of the prompt remains exactly the same in the history.
Processing that repeated context again and again can be wasteful. Some LLM providers therefore offer prompt caching, where frequently reused portions of a prompt can be cached on their infrastructure. When a subsequent request contains the same cacheable content, the provider can reuse the previously processed state rather than treating the entire prompt as new input.
The important point is that the cache is generally managed by the provider. Your application sends the prompt according to the provider’s caching mechanism, while the provider handles storing and reusing the cached representation.
Depending on the provider, prompt caching can reduce both latency and input-processing costs. The exact behavior, cache lifetime, minimum token requirements, and pricing are provider-specific, so these details should always be checked against the particular API you’re using.
At this point, you might be wondering: isn’t prompt caching basically the same thing as prefix caching?
Conceptually, there is indeed a lot of overlap. Both are designed to exploit the repeated prompt content, and both can involve reusing previously computed model state. The difference is primarily in the serving layer and terminology used by the system.
Inference engines and self
