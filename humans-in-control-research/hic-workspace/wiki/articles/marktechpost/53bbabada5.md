---
id: articles/marktechpost/53bbabada5.md
url: "https://www.marktechpost.com/2026/10/09/meet-the-underdog-saluki-27b-a-2-bit-qwen3-8-27b-that-beats-the-original-at-tool-calling/"
url_hash: "53bbabada5"
kind: "article"
source: "MarkTechPost"
title: "Meet the Underdog Saluki 27B: A 2-bit Qwen3.8-27B That Beats the Original at Tool Calling"
author: ""
date: "Fri, 09 Oct 2026 07:23:36 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:48:20.145124+00:00"
chars: 3595
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:48:18.815Z"
relevance: 30
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "138059298e73cfb3"
relevance_by_goal: {"aa6916010743":30}
chunks:
  - id: "articles/marktechpost/53bbabada5.md#c0"
    char_span: [0, 246]
    sentence_count: 1
    key_terms: [meet-the-underdog-saluki-27b-a-2-bit-qwen3-8-27b-that-beats-the-original-at-tool-calling, marktechpost, original, underdog, calling, saluki, source, beats]
    concepts: [marktechpost]
    token_count: 85
    sources: [{"n":"MarkTechPost","u":"https://www.marktechpost.com/2026/10/09/meet-the-underdog-saluki-27b-a-2-bit-qwen3-8-27b-that-beats-the-original-at-tool-calling/","kind":"article","date":"2026-10-09"}]
  - id: "articles/marktechpost/53bbabada5.md#c1"
    char_span: [248, 1985]
    sentence_count: 17
    key_terms: [underdog, model, qwen3, full, saluki, versus, retention, file]
    concepts: [underdog, model, qwen3, saluki, versus]
    related_chunks: ["articles/marktechpost/53bbabada5.md#c2"]
    token_count: 512
    sources: [{"n":"MarkTechPost","u":"https://www.marktechpost.com/2026/10/09/meet-the-underdog-saluki-27b-a-2-bit-qwen3-8-27b-that-beats-the-original-at-tool-calling/","kind":"article","date":"2026-10-09"}]
  - id: "articles/marktechpost/53bbabada5.md#c2"
    char_span: [1750, 3738]
    sentence_count: 24
    key_terms: [saluki, underdog, model, full, scores, llama, cpp, tool]
    concepts: [saluki, underdog, model, scores, llama]
    related_chunks: ["articles/marktechpost/53bbabada5.md#c1"]
    token_count: 512
    sources: [{"n":"MarkTechPost","u":"https://www.marktechpost.com/2026/10/09/meet-the-underdog-saluki-27b-a-2-bit-qwen3-8-27b-that-beats-the-original-at-tool-calling/","kind":"article","date":"2026-10-09"}]
  - id: "articles/marktechpost/53bbabada5.md#c3"
    char_span: [3441, 3844]
    sentence_count: 4
    key_terms: [science, data, telegram, michal, professional, transforming, engineering, statistical]
    concepts: [science, telegram, michal]
    token_count: 82
    sources: [{"n":"MarkTechPost","u":"https://www.marktechpost.com/2026/10/09/meet-the-underdog-saluki-27b-a-2-bit-qwen3-8-27b-that-beats-the-original-at-tool-calling/","kind":"article","date":"2026-10-09"}]
---
# Meet the Underdog Saluki 27B: A 2-bit Qwen3.8-27B That Beats the Original at Tool Calling

Source: [MarkTechPost](https://www.marktechpost.com/2026/10/09/meet-the-underdog-saluki-27b-a-2-bit-qwen3-8-27b-that-beats-the-original-at-tool-calling/)

Underdog, the on-device assistant from Conway Research, has released Saluki 27B under Apache 2.0. Underdog Saluki 27B is a 2-bit GGUF of Qwen3.8-27B that fits in 7.89 GB. The full BF16 model needs 54 GB. Underdog tuned the compression to protect tool calling, the skill that turns a chat model into an agent. For developers, that means a 27B-class agent model that runs in stock llama.cpp.
TL;DR
- Size: 27B dense parameters. 7.89 GB GGUF versus 54 GB for BF16.
- Runs on: stock llama.cpp and apps built on it, with full GPU offload. Optional 629 MB or 928 MB vision add-on.
- Performance: 96% average retention across 9 benchmarks versus full Qwen3.8-27B.
- Best: Parallel tool calls, 42 versus 35 for the full model (120% retention).
- Worst: AIME 2025, 79.2 versus 96.7 (about 82% retention).
- Bottom line: 
  - Best: beats the 54 GB original at tool calling in a sub-8 GB file.
  - Worst: competition math and multi-step reasoning drop 12 to 18 points.
What is Underdog Saluki 27B?
Saluki 27B is a 2-bit, mixed-precision GGUF of Qwen3.8-27B built for local agents. It stacks 3 layers of work:
- The base is Qwen3.8-27B, a dense 27B model from the Qwen team. It has 64 layers, mixes Gated DeltaNet linear attention with gated attention, and supports 262,144 tokens natively.
- The second layer is ISTA-DASLab’s Qwen3.8-27B-GSQ-RCO-GGUF. GSQ learns accurate low-bit scalar grids per tensor. RCO assigns a quantization type to each tensor under a fixed size budget. ISTA’s smallest file, IQ2_XS, is 8.4 GB at 2.50 bits per weight.
- The third layer is Underdog’s own pass. It shrank the file to 7.89 GB and targeted tool calling. The file is named IQ2-mix and carries an imatrix tag. Underdog has not published the full recipe for this pass.
How does Saluki perform on benchmarks?
Underdog splits its results into 2 groups.
The first group ran both models in the same harness:
- Underdog Bench: 120 tasks from BFCL v4, frozen before testing. Thinking off, temperature 0. Saluki scores 88, the full model 84, and PrismML’s Bonsai 2 scores 70.
- Parallel tool calls: 100 BFCL v4 parallel tasks with the official checker. Saluki 42, full model 35.
- SWE-bench Verified: 50 issues. Saluki fixes 30, the full model 33.
The second group compares Saluki with public full-size scores:
How does Saluki compare with other compact Qwen3.8-27B builds?
Bonsai 2 is smaller and reports 98.2% retention across 14 thinking-mode benchmarks. It also posts stronger math, including 95.00 on AIME25. However, it needs PrismML’s llama.cpp fork, since stock llama.cpp rejects its packing formats. Saluki runs on stock llama.cpp. Each vendor uses its own harness, so cross-vendor scores are not directly comparable.
Key Takeaways
- Saluki 27B fits Qwen3.8-27B into 7.89 GB, down from 54 GB.
- It beats the full model on tool calling: 88 versus 84.
- Parallel tool calls rise to 42 from 35.
- Math and reasoning take the biggest hit, down to about 82 to 85%.
- It runs in stock llama.cpp under Apache 2.0.
Check out the Model Card on Hugging Face, the Underdog launch page and the announcement on X. All credit goes to the researcher of this project. Also, feel free to follow us on Twitter and don’t forget to join our 150k+ML SubReddit and Subscribe to our Newsletter. Wait! are you on telegram? now you can join us on telegram as well.
Michal Sutter is a data science professional with a Master of Science in Data Science from the University of Padova. With a solid foundation in statistical analysis, machine learning, and data engineering, Michal excels at transforming complex datasets into actionable insights.
