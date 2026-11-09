---
id: articles/hugging-face-blog/f56bc9bdca.md
url: "https://huggingface.co/blog/ggml-org/model-management-in-llamacpp"
url_hash: "f56bc9bdca"
kind: "article"
source: "Hugging Face Blog"
title: "New in llama.cpp: Model Management"
author: ""
date: "Thu, 11 Dec 2025 15:47:44 GMT"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T18:17:22.687575+00:00"
chars: 2716
engagement: "deliver-a-comprehensive-2026-risk-and-market-analysis-for-th"
collected_at: "2026-07-02T18:17:20+00:00"
content_hash: "ba7fc858d9286ebe"
chunks:
  - id: "articles/hugging-face-blog/f56bc9bdca.md#c0"
    char_span: [0, 132]
    sentence_count: 1
    key_terms: [model-management-in-llamacpp, blog, huggingface, management, ggml-org, hugging, source, https]
    token_count: 36
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ggml-org/model-management-in-llamacpp","kind":"article","date":"2025-12-11"}]
  - id: "articles/hugging-face-blog/f56bc9bdca.md#c1"
    char_span: [134, 2230]
    sentence_count: 9
    key_terms: [model, models, llama-server, llama, cpp, localhost, automatically, http]
    concepts: [model, models, llama-server, llama, localhost]
    related_chunks: ["articles/hugging-face-blog/f56bc9bdca.md#c2"]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ggml-org/model-management-in-llamacpp","kind":"article","date":"2025-12-11"}]
  - id: "articles/hugging-face-blog/f56bc9bdca.md#c2"
    char_span: [1996, 2851]
    sentence_count: 6
    key_terms: [model, models, llama-server, my-model, settings, gguf, web, automatically]
    concepts: [model, models, llama-server, my-model, settings]
    related_chunks: ["articles/hugging-face-blog/f56bc9bdca.md#c1"]
    token_count: 202
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ggml-org/model-management-in-llamacpp","kind":"article","date":"2025-12-11"}]
---
# New in llama.cpp: Model Management

Source: [Hugging Face Blog](https://huggingface.co/blog/ggml-org/model-management-in-llamacpp)

New in llama.cpp: Model Management
Reminder: llama.cpp server is a lightweight, OpenAI-compatible HTTP server for running LLMs locally.
This feature was a popular request to bring Ollama-style model management to llama.cpp. It uses a multi-process architecture where each model runs in its own process, so if one model crashes, others remain unaffected.
Quick Start
Start the server in router mode by not specifying a model:
llama-server
This auto-discovers models from your llama.cpp cache (LLAMA_CACHE or ~/.cache/llama.cpp). If you've previously downloaded models via llama-server -hf user/model, they'll be available automatically.
You can also point to a local directory of GGUF files:
llama-server --models-dir ./my-models
Features
- Auto-discovery: Scans your llama.cpp cache (default) or a custom --models-dirfolder for GGUF files
- On-demand loading: Models load automatically when first requested
- LRU eviction: When you hit --models-max(default: 4), the least-recently-used model unloads
- Request routing: The modelfield in your request determines which model handles it
Examples
Chat with a specific model
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ggml-org/gemma-3-4b-it-GGUF:Q4_K_M",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
On the first request, the server automatically loads the model into memory (loading time depends on model size). Subsequent requests to the same model are instant since it's already loaded.
List available models
curl http://localhost:8080/models
Returns all discovered models with their status (loaded, loading, or unloaded).
Manually load a model
curl -X POST http://localhost:8080/models/load \
  -H "Content-Type: application/json" \
  -d '{"model": "my-model.gguf"}'
Unload a model to free VRAM
curl -X POST http://localhost:8080/models/unload \
  -H "Content-Type: application/json" \
  -d '{"model": "my-model.gguf"}'
Key Options
All model instances inherit settings from the router:
llama-server --models-dir ./models -c 8192 -ngl 99
All loaded models will use 8192 context and full GPU offload. You can also define per-model settings using presets:
llama-server --models-preset config.ini
[my-model]
model = /path/to/model.gguf
ctx-size = 65536
temp = 0.7
Also available in the Web UI
The built-in web UI also supports model switching. Just select a model from the dropdown and it loads automatically.
Join the Conversation
We hope this feature makes it easier to A/B test different model versions, run multi-tenant deployments, or simply switch models during development without restarting the server.
Have questions or feedback? Drop a comment below or open an issue on GitHub.
