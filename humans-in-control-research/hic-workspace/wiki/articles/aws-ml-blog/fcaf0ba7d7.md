---
id: articles/aws-ml-blog/fcaf0ba7d7.md
url: "https://aws.amazon.com/blogs/machine-learning/preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies/"
url_hash: "fcaf0ba7d7"
kind: "article"
source: "aws_ml_blog"
title: "Preparing data for supervised fine-tuning Part 2: Advanced data strategies"
author: ""
date: "Wed, 26 Aug 2026 16:24:05 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-08-26T19:18:33.551634+00:00"
chars: 10000
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:18:33.175Z"
relevance: 10
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "9fefa53c2a3ef547"
relevance_by_goal: {"d21cb50b17ba":10}
chunks:
  - id: "articles/aws-ml-blog/fcaf0ba7d7.md#c0"
    char_span: [0, 221]
    sentence_count: 1
    key_terms: [preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies, data, machine-learning, fine-tuning, strategies, supervised, preparing, advanced]
    token_count: 53
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies/","kind":"article","date":"2026-08-26"}]
  - id: "articles/aws-ml-blog/fcaf0ba7d7.md#c1"
    char_span: [223, 2985]
    sentence_count: 23
    key_terms: [data, evaluation, dataset, training, fine-tuning, supervised, preparing, task]
    concepts: [evaluation, dataset, training, fine-tuning, supervised]
    related_chunks: ["articles/aws-ml-blog/fcaf0ba7d7.md#c2"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies/","kind":"article","date":"2026-08-26"}]
  - id: "articles/aws-ml-blog/fcaf0ba7d7.md#c2"
    char_span: [2621, 5355]
    sentence_count: 24
    key_terms: [training, data, selection, set, dataset, quality, scaling, performance]
    concepts: [training, selection, performance, dataset, quality]
    related_chunks: ["articles/aws-ml-blog/fcaf0ba7d7.md#c1", "articles/aws-ml-blog/fcaf0ba7d7.md#c3"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies/","kind":"article","date":"2026-08-26"}]
  - id: "articles/aws-ml-blog/fcaf0ba7d7.md#c3"
    char_span: [4997, 7766]
    sentence_count: 19
    key_terms: [data, selection, training, samples, augmentation, subset, diagnostic, model]
    concepts: [selection, training, augmentation, samples, diagnostic]
    related_chunks: ["articles/aws-ml-blog/fcaf0ba7d7.md#c2"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies/","kind":"article","date":"2026-08-26"}]
  - id: "articles/aws-ml-blog/fcaf0ba7d7.md#c4"
    char_span: [7441, 10204]
    sentence_count: 21
    key_terms: [data, reasoning, mixing, augmented, training, general, customization, capabilities]
    concepts: [reasoning, mixing, augmented, training, customization]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies/","kind":"article","date":"2026-08-26"}]
  - id: "articles/aws-ml-blog/fcaf0ba7d7.md#c5"
    char_span: [9920, 10224]
    sentence_count: 2
    key_terms: [percent, code, general-data, outperformed, token-length, benchmarks, conversely, imbalance]
    concepts: [percent]
    token_count: 70
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies/","kind":"article","date":"2026-08-26"}]
---
# Preparing data for supervised fine-tuning Part 2: Advanced data strategies

Source: [aws_ml_blog](https://aws.amazon.com/blogs/machine-learning/preparing-data-for-supervised-fine-tuning-part-2-advanced-data-strategies/)

Artificial Intelligence
Preparing data for supervised fine-tuning Part 2: Advanced data strategies
Data preparation for supervised fine-tuning (SFT) doesn’t end when your dataset is clean and correctly formatted. The harder questions come next. How much data do you actually need? Should you collect more, or select a better subset of what you have? How do you generate high-quality examples when human annotation doesn’t scale? And how do you specialize a model without erasing its general capabilities? This post assumes you have prepared a quality-checked, schema-compliant SFT dataset and are ready to optimize it for training. The first post in this series, Preparing data for supervised fine-tuning Part 1: Formatting and quality, covers that groundwork: the conversational format Amazon Nova expects, the quality checks that catch malformed and low-signal examples, and how to split train and evaluation data without leakage. If your dataset hasn’t been through those steps, start there.
This second post covers four advanced strategies: evaluating data readiness with learning curve analysis, data subset selection and filtering, data augmentation, and data mixing. We reference Amazon Nova customization findings throughout, and the guidance applies to any model you choose.
Data readiness evaluation
After your data is cleaned and formatted, assess whether you have enough signal to train effectively.
Volume and distribution assessment
As a general starting point, plan for roughly 2,000 high-quality training samples for a typical SFT task. Treat this as a ballpark estimate: the right size varies with task difficulty and how far the model’s current behavior is from your goal. A simple format or style change can work with as few as 500 samples, while a complex multi-step reasoning task might require 10,000 or more. Every task and domain has different saturation characteristics.
Before running those experiments, one prerequisite matters more than anything else: a clearly defined evaluation benchmark. This means an evaluation set that’s representative of production traffic, with metrics that reflect what good means for your use case. Most teams find this harder than preparing the training data itself. If you don’t yet have one, build it first. Amazon Bedrock evaluations supports evaluating models against your own datasets and metrics, and Evaluate large language models for quality and responsibility on the AWS Machine Learning Blog walks through building an evaluation pipeline.
With the benchmark in place, determine your dataset size empirically through a learning curve analysis:
- Train once, evaluate checkpoints. Run a single training job on your full dataset and save intermediate checkpoints, for example every 10–20 percent of training. Evaluate each checkpoint on your held-out evaluation set. During the first epoch, a checkpoint at step N has seen roughly N/total_steps of your unique data, so this approximates a data scaling curve without multiple training runs.
- Plot performance against data scale. Chart your downstream metric against training tokens consumed. You’re looking for the saturation point, where doubling data yields less than 1–2 percent improvement on your primary metric.
- Stop when gains diminish. If the curve is flattening, more data of the same type won’t help. Either stop training early and save compute, or add data that’s qualitatively different, specifically targeting failure cases the model still gets wrong. Figure 1 shows how successive checkpoint gains distinguish a flattening curve from one that is still improving.
Why more data doesn’t always mean better performance
SFT doesn’t follow the same monotonic power-law scaling as pretraining. SFT scaling research shows that data volume alone doesn’t guarantee proportional gains. What matters is coverage and depth of the instruction set. Data Repetition Beats Scaling demonstrated this strikingly. Under a fixed compute budget, 128 epochs on 400 reasoning examples beat single-epoch training on 51,200 examples by 12–26 percentage points on AIME and GPQA. A smaller, high-quality dataset trained to full memorization can outperform a larger dataset the model sees only once. Training token accuracy serves as a practical stopping criterion, because gains plateau after the model achieves near-perfect training accuracy.
Data subset selection and filtering
When diminishing returns set in, intelligent data selection can outperform training on the full set. Methods like DEITA, DELIFT, and coreset selection identify the smallest subset that covers your task space while maintaining quality and diversity. These methods score candidates on quality, diversity, and how much each example actually teaches the model. Two benefits stand out:
- Matching or exceeding full-data performance with fewer samples. Removing redundant or low-quality examples provides cleaner gradient signal. AlpaGasus showed that filtering to the top 20 percent by quality trained faster and scored higher than the full set. Rethinking Data Selection demonstrates that subset selection can outperform full-dataset training.
- Reduced catastrophic forgetting. Fewer, more targeted samples mean fewer gradient updates pulling the model away from its pretrained capabilities. This makes subset selection a natural complement to data mixing: you get task specialization with less forgetting, potentially reducing the need for mixing at all.
A practical workflow ties readiness evaluation and selection together. The learning curve is a diagnostic (one training run with saved checkpoints), so you reach these decisions without repeated full-scale training runs:
- Run the learning-curve diagnostic on your full dataset.
- Identify the saturation point.
- If it saturates early, the tail of your dataset is adding little signal. Curate a high-value subset (quality and diversity filtering) and make that your training set going forward. This is not repeating the diagnostic run for the same result: a curated subset trains faster on every future retraining cycle, and quality filtering often scores higher than the full set by removing low-value examples that add noise to the gradient (the AlpaGasus result cited earlier in this section).
- If it’s still improving at 100 percent, data volume is the bottleneck. Collect more data targeting failure cases from error analysis, not more of the same distribution.
- If targeted data is expensive, consider reinforcement fine-tuning with programmatic verification as a more efficient path.
Data augmentation
When your dataset is too small or too narrow, augmentation can expand it without proportional annotation cost. The most impactful form of augmentation for modern SFT is generating reasoning traces and synthetic demonstrations. In practice, most teams source augmented data one of three ways:
- Distill from a stronger model. Generate traces or responses from a capable teacher such as DeepSeek-R1 or a frontier commercial model, verify the final answer, and keep the outputs on correct samples. This is how most open reasoning datasets are built.
- Self-generate and filter. Have the base model you’re fine-tuning produce multiple candidate responses per problem at high temperature, then keep only those whose final answers are correct or whose reasoning is self-consistent across samples. This is the core idea behind STaR.
- Amplify human-authored data for high-stakes domains. When correctness matters more than volume, in medical, legal, or safety-critical settings, expert-written examples remain the gold standard. You can amplify them by using a large language model (LLM) to paraphrase expert reasoning into multiple styles while preserving the logical steps.
Beyond reasoning traces, classic augmentation techniques expand instruction datasets directly. Self-Instruct bootstraps new instruction-response pairs from a small seed set, and Evol-Instruct evolves existing instructions along controlled dimensions such as added constraints or deeper reasoning requirements. Simpler transformations also help: paraphrasing prompts to cover phrasing variation, and reformatting responses to match your target output style. These techniques directly address the coverage and depth properties that predict SFT generalization.
Two quality principles govern augmented data. First, diversity in style matters, not just content. Two correct but differently structured solutions are more useful than two copies of the same solution, a pattern MAmmoTH exploits. Second, verification is non-negotiable. Every augmented example should pass the same quality bar as human-curated data, because synthetic generation is one of the most common sources of duplicates and subtle errors. Apply the deduplication and filtering steps from the first post to augmented data before it enters your training set.
Data mixing patterns
When you fine-tune a model for a specific task, you risk degrading its performance on other capabilities, a phenomenon known as catastrophic forgetting. Data mixing addresses this by blending your target-task data with samples that preserve the model’s existing strengths. For Amazon Nova customization, Amazon Nova Forge supports this pattern, so you can blend proprietary data with Amazon-curated training data at each stage of customization.
An important nuance: Data mixing doesn’t always help your target task. Its primary purpose is to retain general capabilities alongside specialization, and mixing in general data often comes at a direct cost to your domain metrics, because every general-data token displaces a domain-data token. Positive transfer does occur when data sources share underlying reasoning patterns: Qwen2.5-Coder found that a 70:20:10 ratio of code, text, and math outperformed training on 100 percent code, even on coding benchmarks.
Conversely, mixing can hurt when token-length imbalance lets general data dominate the loss: even a 5 percent general-data mix by sample count can represent over 80 percent of grad
