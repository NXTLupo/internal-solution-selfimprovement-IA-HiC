---
id: social-intelligence/reddit-deep/deeplearning/1srhc9v.md
url: "https://www.reddit.com/r/deeplearning/comments/1srhc9v/opensource_multimodal_studio_on_qwen3635ba3b/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Open-source multimodal studio on Qwen3.6-35B-A3B. Vision reasoning, doc extraction, UI-to-code, with a backend adapter so you can swap OpenRouter / Ollama / llama.cpp"
author: "gvij"
date: "2026-04-21T08:12:25.000Z"
score: 3
upvote_ratio: 0.8
num_comments: 1
flair: ""
extracted_at: "2026-05-11T17:26:50.058Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, enterprise_it]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1srhc9v.md#c0"
    char_span: [0, 1982]
    sentence_count: 11
    key_terms: [qwen3, openrouter, qwen, comments, adapter, ollama, capabilities, deeplearning]
    token_count: 513
  - id: "social-intelligence/reddit-deep/deeplearning/1srhc9v.md#c1"
    char_span: [1984, 2317]
    sentence_count: 2
    key_terms: [qwen-lens-studio, dakshjain-1616, github, https, com, real-world, genuinely, document]
    section: Comments
    token_count: 92
---
# Open-source multimodal studio on Qwen3.6-35B-A3B. Vision reasoning, doc extraction, UI-to-code, with a backend adapter so you can swap OpenRouter / Ollama / llama.cpp

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1srhc9v/opensource_multimodal_studio_on_qwen3635ba3b/)
Posted by **gvij** · **3↑** · **1 comments**

The Qwen3.6-35B-A3B release landed this week and the vision-language side got overshadowed by the coding benchmarks. Putting this up because I think the VL capabilities deserve more attention. It's a multimodal causal LM with a vision encoder, not just a coding model.

What this is: A small studio that exposes the VL capabilities of Qwen 3.6 35B local LLM through five workflows:

* **Visual Reasoning** with a "Show Thinking" toggle so you can see the chain of thought on images
* **Document IQ**: structured JSON extraction from receipts, forms, invoices (KV pairs, tables)
* **Code Lens**: screenshot to React/Vue/Svelte/HTML component
* **Multilingual Describe**: captions in 11 languages, useful for alt-text and localization
* **Dual Compare**: two images side by side for diffs/regression testing

Architecture is nothing exotic. FastAPI backend, React+Vite SPA frontend, thin adapter layer so you can point it at OpenRouter, Ollama, or llama.cpp with one env var.

The whole reason to build it as an adapter is that if you care about running Qwen locally (which is most of the reason to care about Qwen specifically) you don't want to be locked into a cloud provider.

Model IDs wired up:

* OpenRouter: qwen/qwen3.6-plus
* Ollama: qwen3.6:35b
* llama.cpp: qwen3.6-35b

For local inference, the Unsloth Q4\_K\_M GGUF is around 24GB, runs on a 32GB Mac or a 24GB GPU with some offloading. Not cheap but tractable.

GitHub Repo link in the comments below 👇

This project was built by Neo AI Engineer from a spec. Posting it because the timing felt right with the model just landing and most demos being coding-focused.

Genuinely curious whether anyone has pushed Document IQ hard on messy real-world scans. My test set is clean; I suspect it falls over on rotated/low-res receipts.

## Comments

- **gvij** (1↑): Github repo for Qwen lens studio:  
[https://github.com/dakshjain-1616/Qwen-Lens-Studio](https://github.com/dakshjain-1616/Qwen-Lens-Studio)
