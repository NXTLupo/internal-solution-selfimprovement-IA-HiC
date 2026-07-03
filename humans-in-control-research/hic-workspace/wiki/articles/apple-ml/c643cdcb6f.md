---
id: articles/apple-ml/c643cdcb6f.md
url: "https://machinelearning.apple.com/research/balcaprl-mllm-image-captioning"
url_hash: "c643cdcb6f"
kind: "article"
source: "apple_ml"
title: "BalCapRL: A Balanced Framework for RL-Based MLLM Image Captioning"
author: ""
date: "Mon, 11 May 2026 00:00:00 GMT"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T17:18:26.840367+00:00"
chars: 3019
engagement: "deliver-a-2026-risk-and-market-analysis-report-evaluating-ho"
collected_at: "2026-07-02T17:18:24+00:00"
content_hash: "9d2d4599b110c83a"
chunks:
  - id: "articles/apple-ml/c643cdcb6f.md#c0"
    char_span: [0, 163]
    sentence_count: 1
    key_terms: [balcaprl-mllm-image-captioning, machinelearning, captioning, framework, balanced, balcaprl, research, rl-based]
    token_count: 44
    sources: [{"n":"apple_ml","u":"https://machinelearning.apple.com/research/balcaprl-mllm-image-captioning"}]
  - id: "articles/apple-ml/c643cdcb6f.md#c1"
    char_span: [165, 2586]
    sentence_count: 12
    key_terms: [captioning, image, reinforcement, models, framework, balanced, learning, vision-language]
    concepts: [captioning, image, reinforcement, models, framework]
    token_count: 512
  - id: "articles/apple-ml/c643cdcb6f.md#c2"
    char_span: [2231, 3185]
    sentence_count: 5
    key_terms: [models, foundation, multimodal, captions, pre-training, synthetic, caption, algorithmsconference]
    concepts: [foundation, multimodal, models, captions, pre-training]
    token_count: 170
---
# BalCapRL: A Balanced Framework for RL-Based MLLM Image Captioning

Source: [apple_ml](https://machinelearning.apple.com/research/balcaprl-mllm-image-captioning)

BalCapRL: A Balanced Framework for RL-Based MLLM Image Captioning
AuthorsShaokai Ye, Vasileios Saveris, Yihao Qian, Jiaming Hu, Elmira Amirloo, Peter Grasch
BalCapRL: A Balanced Framework for RL-Based MLLM Image Captioning
AuthorsShaokai Ye, Vasileios Saveris, Yihao Qian, Jiaming Hu, Elmira Amirloo, Peter Grasch
Image captioning is one of the most fundamental tasks in computer vision. Owing to its open-ended nature, it has received significant attention in the era of multimodal large language models (MLLMs). In pursuit of ever more detailed and accurate captions, recent work has increasingly turned to reinforcement learning (RL). However, existing captioning-RL methods and evaluation metrics often emphasize a narrow notion of caption quality, inducing trade-offs across core dimensions of captioning. For example, utility-oriented objectives can encourage noisy, hallucinated, or overlong captions that improve downstream question answering while harming fluency, whereas arena-style objectives can favor fluent but generic descriptions with limited usefulness. To address this, we propose a more balanced RL framework that jointly optimizes utility-aware correctness, reference coverage, and linguistic quality. In order to effectively optimize the resulting continuous multi-objective reward formulation, we apply GDPO-style reward-decoupled normalization to continuous-valued captioning rewards and show that it improves performance over vanilla GRPO. Additionally, we introduce length-conditional reward masking, yielding a more suitable length penalty for captioning. Across LLaVA-1.5-7B and Qwen2.5-VL 3B and 7B base models, our method consistently improves caption quality, with peak gains of +13.6 DCScore, +9.0 CaptionQA, and +29.0 CapArena across different models.
RubiCap: Rubric-Guided Reinforcement Learning for Dense Image Captioning
March 16, 2026research area Computer Vision, research area Data Science and Annotation
Dense image captioning is critical for cross-modal alignment in vision-language pretraining and text-to-image generation, but scaling expert-quality annotations is prohibitively expensive. While synthetic captioning via strong vision-language models (VLMs) is a practical alternative, supervised distillation often yields limited output diversity and weak generalization. Reinforcement learning (RL) could overcome these limitations, but its…
Revisit Large-Scale Image–Caption Data in Pre-training Multimodal Foundation Models
April 8, 2025research area Computer Vision, research area Methods and Algorithmsconference ICLR
Recent advancements in multimodal models highlight the value of rewritten captions for improving performance, yet key challenges remain. Notably, the role of synthetic captions and their interaction with original web-crawled AltTexts in pre-training is still unclear. Additionally, different multimodal foundation models may have distinct preferences for specific caption formats while the efforts of studying the optimal captions for each foundation…
