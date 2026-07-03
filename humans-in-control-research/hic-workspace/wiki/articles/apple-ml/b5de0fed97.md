---
id: articles/apple-ml/b5de0fed97.md
url: "https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models"
url_hash: "b5de0fed97"
kind: "article"
source: "apple_ml"
title: "Introducing the Third Generation of Apple’s Foundation Models"
author: ""
date: "Mon, 08 Jun 2026 00:00:00 GMT"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T18:22:33.766405+00:00"
chars: 10000
engagement: "deliver-a-comprehensive-2026-risk-and-market-analysis-for-th"
collected_at: "2026-07-02T18:22:31+00:00"
content_hash: "e2a95b9550bdcf52"
chunks:
  - id: "articles/apple-ml/b5de0fed97.md#c0"
    char_span: [0, 184]
    sentence_count: 1
    key_terms: [introducing-third-generation-of-apple-foundation-models, apple, machinelearning, introducing, foundation, generation, research, models]
    concepts: [apple]
    token_count: 39
    sources: [{"n":"apple_ml","u":"https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models"}]
  - id: "articles/apple-ml/b5de0fed97.md#c1"
    char_span: [186, 2785]
    sentence_count: 16
    key_terms: [models, apple, cloud, afm, foundation, generation, on-device, server-based]
    concepts: [models, apple, cloud, foundation, generation]
    related_chunks: ["articles/apple-ml/b5de0fed97.md#c3"]
    token_count: 512
  - id: "articles/apple-ml/b5de0fed97.md#c2"
    char_span: [2394, 5129]
    sentence_count: 19
    key_terms: [model, models, on-device, advanced, architectures, afm, server-side, foundation]
    concepts: [model, models, on-device, architectures, advanced]
    token_count: 512
  - id: "articles/apple-ml/b5de0fed97.md#c3"
    char_span: [4785, 7597]
    sentence_count: 18
    key_terms: [foundation, model, data, training, cloud, image, models, high-quality]
    concepts: [foundation, model, training, cloud, image]
    related_chunks: ["articles/apple-ml/b5de0fed97.md#c1"]
    token_count: 512
  - id: "articles/apple-ml/b5de0fed97.md#c4"
    char_span: [7205, 9882]
    sentence_count: 16
    key_terms: [percent, afm, evaluations, model, improvement, understanding, cloud, relative]
    concepts: [percent, evaluations, improvement, model, understanding]
    related_chunks: ["articles/apple-ml/b5de0fed97.md#c5"]
    token_count: 512
  - id: "articles/apple-ml/b5de0fed97.md#c5"
    char_span: [9570, 10187]
    sentence_count: 5
    key_terms: [improvement, cloud, afm, percent, relative, overall, pro, feature-specific]
    concepts: [improvement, cloud, percent, relative, overall]
    related_chunks: ["articles/apple-ml/b5de0fed97.md#c4"]
    token_count: 126
---
# Introducing the Third Generation of Apple’s Foundation Models

Source: [apple_ml](https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models)

Introducing the Third Generation of Apple’s Foundation Models
Our next generation of Apple Intelligence is centered around our users, integrated deeply into our operating systems, and powered by a bold new architecture with privacy at its core.
At the heart of this architecture is our third generation of Apple Foundation Models (AFM), a family of five foundation models custom-built in collaboration with Google. These span from on-device models to server-based models running on Private Cloud Compute.
Apple Foundation Models are built to unlock a wide range of helpful experiences for our users, like an entirely new Siri and intelligent tools that make everyday apps smarter and more useful.
This family of models includes two on-device models:
- AFM 3 Core, the next generation of our 3-billion-parameter dense model that delivers a step up in quality.
- AFM 3 Core Advanced, our most powerful on-device model. It’s natively multimodal, enabling helpful features like expressive voices and higher-accuracy dictation. Built on cutting-edge Apple research, this 20-billion-parameter model uses a sparse architecture, activating just 1 to 4 billion parameters at a time depending on the request. AFM 3 Core Advanced is unlocked by and optimized for our most capable Apple silicon systems.
Our latest Apple Foundation Models also include three server-based models running on Private Cloud Compute, which ensures that user data is never stored or shared with anyone, including Apple. These models are:
- AFM 3 Cloud, our server-side workhorse, optimized for speed, efficiency, and performance.
- ADM 3 Cloud (Image), for image generation and editing, which unlocks advanced photo-editing tools, the all-new Image Playground, and more.
- AFM 3 Cloud Pro, our most capable server-based model, which powers our most demanding use cases, like agentic tool use and complex reasoning.
AFM 3 Core, AFM 3 Core Advanced, and AFM 3 Cloud, along with ADM 3 Cloud, are all purpose-built for Apple silicon.
For AFM 3 Cloud Pro, we worked with Google and NVIDIA to extend Private Cloud Compute to NVIDIA GPUs in Google Cloud, while maintaining the same guarantees to protect our users’ privacy. More details are available on our Security Research Website.
Our third generation of Apple Foundation Models delivers significant advancements across capabilities and quality. In the following overview, we’ll dive deeper to explore the scalable architectures powering our on-device and server-based models, our training methodologies, and more.
Model Architectures
We designed the architectures for both our on-device and server-side models to enable powerful Apple Intelligence experiences for our users, and we integrated our latest models deep into our operating systems.
Maximizing on-device AI capabilities
One area of deep innovation is our most powerful on-device model, AFM 3 Core Advanced. Traditional large language models—whether dense or sparsely activated—require all weights to reside in active memory (DRAM), creating a massive footprint that limits scalability on consumer hardware. To break this barrier, AFM 3 Core Advanced introduces a novel sparsely activated architecture built on Instruction-Following Pruning (IFP), a technique developed by Apple researchers (see Figure 1).
Instead of forcing the entire model into DRAM, the full model is stored in flash memory (NAND). Because NAND-to-DRAM bandwidth is too slow to swap weights token by token, as standard MoE models require, AFM 3 Core Advanced makes routing decisions per prompt. A lightweight, dense block selects a fixed set of experts during initial processing, periodically reselecting them during generation. To minimize data movement, the model relies on a high percentage of always-active “shared experts” alongside input-dependent “routed experts” swapped into DRAM only when needed.
This design also introduces crucial inference-time elasticity. Rather than using a single model for all tasks or managing an ensemble of smaller models, AFM 3 Core Advanced uses a predetermined number of active parameters tailored to each specific use case. This allows weights to be loaded incrementally across requests of varying difficulty, scaling the model size far beyond traditional DRAM limits while minimizing latency.
Scaling the server foundation
In addition to innovation across on-device AI, we’re also taking a big step forward for our server-based models. For instance, our server-side model, AFM 3 Cloud, represents a substantial step forward in multimodal reasoning powered by Private Cloud Compute. To achieve this, we implemented several key upgrades to the Parallel-Track Mixture-of-Experts (PT-MoE) foundation we introduced last year. These architectural refinements stabilize training and improve the model’s ability to reason over and accurately recall information within its context window for complex server-side queries.
Creating and editing images with ADM 3 Cloud
Another example where we advanced our model architecture is our latest image model, ADM 3 Cloud. To power high-quality image creation (see Figure 2), editing, and Genmoji, we developed ADM 3 Cloud to deliver strong controllability and parameter efficiency. It generalizes across different aspect ratios and resolutions, and draws on the broader Apple Foundation Model family to guide both creation and editing. While the base model natively handles image creation, editing, and Genmoji, we also use specialized adapters to power specific downstream editing experiences, such as Spatial Reframing in Photos, along with touch-based image modifications and personalization in Image Playground.
Training Data
Capable foundation models require diverse, high-quality data. To train our foundation models, we use a mixture of data that includes publicly available information, data licensed or purchased from third parties, open-sourced data, data obtained through dedicated studies, and synthetic data. We do not use our users’ private personal data or user interactions when training our foundation models. We also respect the rights of web publishers to opt out of foundation model training.
Training Recipe
To support our new Apple Intelligence experiences, we significantly scaled pre-training on the latest generation of cloud TPU accelerators. All models shared a common initial foundation before specializing for their respective architectures and use cases, adding multimodal capabilities like audio, image understanding, long-context reasoning, and high-quality visual generation. We then expanded our post-training process, combining supervised fine-tuning with multi-stage reinforcement learning.
Finally, we optimized each model for its target hardware. AFM 3 Core, AFM 3 Core Advanced, AFM 3 Cloud, and ADM 3 Cloud (Image) were optimized to run efficiently on Apple silicon, while AFM 3 Cloud Pro was optimized for NVIDIA GPUs. Using Quantization Aware Training, we compressed our models substantially while maintaining high accuracy, together delivering the responsive, high-quality experiences our users expect.
Evaluation
Our third-generation Apple Foundation Models are designed to power integrated Apple Intelligence experiences that make our operating systems smarter and more helpful, and we conduct quality evaluations at both the model and feature levels.
Below, we detail our model-level evaluations first, followed by results for features unlocked by our models. These evaluations reflect our models at their current stage of development. During the beta period, we’ll continue improving them to deliver great experiences for our users.
Model-level evaluations
To ensure an exceptional experience, in-house human graders assess model responses along key dimensions, including Instruction Following, Truthfulness, and Presentation. For image-based prompts, we also evaluate Image Understanding, measuring the model’s ability to successfully identify, extract, and reason about visual content.
Across these dimensions, our on-device models demonstrate substantial generational progress. For general text capabilities, the updated AFM 3 Core model improved upon its predecessor, earning preference on 45.6 percent of prompts compared to 23.3 percent for the 2025 baseline (see Figure 3). This progress extends to visual inputs; for image understanding, in cases where users preferred one over the other, they preferred AFM 3 Core over the previous generation more than 61 percent of the time (see Figure 4).
Our server model, AFM 3 Cloud, also significantly improved upon its predecessor. In side-by-side human evaluations for general text capabilities, it was preferred on 64.7 percent of prompts compared to only 8.7 percent for the 2025 AFM Server model, a generational leap consistent across all locale regions. We also see consistent gains in our single-sided evaluations, which score responses independently along multiple dimensions: AFM 3 Cloud delivers a roughly 36 percent relative improvement in overall response satisfaction and a 21 percent relative improvement in instruction following performance over the 2025 AFM Server model. Further, for image understanding, where the model interprets and reasons over visual inputs, AFM 3 Cloud showed significant improvement over its predecessor from last year, earning preference on 37.8 percent of prompts compared to just 9.6 percent for its 2025 baseline.
Finally, AFM 3 Cloud Pro provides an even further improvement over our AFM 3 Cloud, achieving a relative improvement in overall response satisfaction of roughly 10 percent for text and 14 percent for image understanding overall. AFM 3 Cloud Pro excels in specific task categories such as Math, showing a relative 14 percent improvement over AFM 3 Cloud.
Feature-specific evaluations
Beyond model-level evaluation, we also evaluate all of the features powered by our foundation models. Below, we highlight a few of these results.
To measure the quality of our new expressive voices, human evaluators graded AFM 3 Core Advanced a
