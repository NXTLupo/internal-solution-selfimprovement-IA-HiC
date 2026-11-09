---
id: articles/apple-ml/19bfcbfba1.md
url: "https://machinelearning.apple.com/research/scaling-categorical-flow-maps"
url_hash: "19bfcbfba1"
kind: "article"
source: "apple_ml"
title: "Scaling Categorical Flow Maps"
author: ""
date: "Fri, 07 Aug 2026 00:00:00 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-08-13T17:18:23.375754+00:00"
chars: 2870
engagement: "analyze-the-executive-search-industry-to-map-current-trends"
collected_at: "2026-08-13T17:18:23.470Z"
relevance: 0
engagement_goal: "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points (as well as market research validated industry-wide use cases), producing a structured assessment of targeted AI use cases, their implementation feasibility, and expected efficiency gains to address these challenges."
content_hash: "18d379876f3ea135"
relevance_by_goal: {"bb7e192171b3":0}
chunks:
  - id: "articles/apple-ml/19bfcbfba1.md#c0"
    char_span: [0, 125]
    sentence_count: 1
    key_terms: [scaling-categorical-flow-maps, machinelearning, categorical, research, scaling, source, apple, https]
    token_count: 29
    sources: [{"n":"apple_ml","u":"https://machinelearning.apple.com/research/scaling-categorical-flow-maps","kind":"article","date":"2026-08-07"}]
  - id: "articles/apple-ml/19bfcbfba1.md#c1"
    char_span: [127, 2726]
    sentence_count: 12
    key_terms: [flow, diffusion, matching, distillation, methods, categorical, models, sampling]
    concepts: [diffusion, distillation, matching, categorical, methods]
    token_count: 512
    sources: [{"n":"apple_ml","u":"https://machinelearning.apple.com/research/scaling-categorical-flow-maps","kind":"article","date":"2026-08-07"}]
  - id: "articles/apple-ml/19bfcbfba1.md#c2"
    char_span: [2389, 2998]
    sentence_count: 5
    key_terms: [conditional, distribution, flow, transport, methods, learn, model, reparameterization]
    concepts: [conditional, distribution, transport, methods, learn]
    token_count: 111
    sources: [{"n":"apple_ml","u":"https://machinelearning.apple.com/research/scaling-categorical-flow-maps","kind":"article","date":"2026-08-07"}]
---
# Scaling Categorical Flow Maps

Source: [apple_ml](https://machinelearning.apple.com/research/scaling-categorical-flow-maps)

Scaling Categorical Flow Maps
AuthorsOscar Davis†**, Anastasiia Filippova, Victor Turrisi, Amitis Shidani, Pierre Ablin, Marco Cuturi, Louis Béthune
Scaling Categorical Flow Maps
AuthorsOscar Davis†**, Anastasiia Filippova, Victor Turrisi, Amitis Shidani, Pierre Ablin, Marco Cuturi, Louis Béthune
Continuous diffusion and flow matching models could represent a powerful alternative to autoregressive approaches for language modelling (LM), as they unlock a host of advantages currently reserved for continuous modalities, including accelerated sampling and tilting. Recently, several works have demonstrated the possibility of generating discrete data continuously by a simple flow matching process between a Gaussian and the one-hot encoded data distribution. They have further shown the feasibility of accelerated sampling via Categorical Flow Maps (CFMs), resulting in competitive sample quality in the few-step regime. However, this method had only been evaluated at relatively modest scales (< 1B), leaving the question of its scalability completely open. In this article, we train a 1.7B-parameter base flow model on 2.1T tokens and self-distill it into a CFM that generates diverse, high-quality text in as few as 4 inference steps while maintaining near-data-level token entropy. Furthermore, we introduce a likelihood bound for CFMs in the semi-discrete setting, and show that they can be used to score the model on standard LM benchmarks, achieving results in the same range as discrete diffusion methods. Finally, we uncover some of the challenges that arise from training these models at scale, and we provide prescriptive insights on loss weighting and time scheduling.
Score Distillation of Flow Matching Models
December 16, 2025research area Computer Vision, research area Methods and Algorithms
Diffusion models achieve high-quality image generation but are limited by slow iterative sampling. Distillation methods alleviate this by enabling one- or few-step generation. Flow matching, originally introduced as a distinct framework, has since been shown to be theoretically equivalent to diffusion under Gaussian assumptions, raising the question of whether distillation techniques such as score distillation transfer directly. We provide a…
CAR-Flow: Condition-Aware Reparameterization Aligns Source and Target for Better Flow Matching
November 12, 2025research area Computer Visionconference NeurIPS
Conditional generative modeling aims to learn a conditional data distribution from samples containing data-condition pairs. For this, diffusion and flow-based methods have attained compelling results. These methods use a learned (flow) model to transport an initial standard Gaussian noise that ignores the condition to the conditional data distribution. The model is hence required to learn both mass transport and conditional injection. To ease the…
