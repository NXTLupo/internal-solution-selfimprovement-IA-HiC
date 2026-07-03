---
id: articles/meta-ai-blog/aed965de1d.md
url: "https://engineering.fb.com/2026/06/25/security/privacy-aware-infrastructure-in-the-ai-native-era-an-asset-classification-case-study/"
url_hash: "aed965de1d"
kind: "article"
source: "Meta AI Blog"
title: "Privacy-Aware Infrastructure in the AI-Native Era: An Asset Classification Case Study"
author: ""
date: "Thu, 25 Jun 2026 22:30:51 +0000"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T18:15:01.372469+00:00"
chars: 10000
engagement: "deliver-a-comprehensive-2026-risk-and-market-analysis-for-th"
collected_at: "2026-07-02T18:14:59+00:00"
content_hash: "1824d1ef0dcf80d5"
chunks:
  - id: "articles/meta-ai-blog/aed965de1d.md#c0"
    char_span: [0, 246]
    sentence_count: 1
    key_terms: [privacy-aware-infrastructure-in-the-ai-native-era-an-asset-classification-case-study, classification, infrastructure, privacy-aware, engineering, ai-native, security, source]
    token_count: 59
    sources: [{"n":"Meta AI Blog","u":"https://engineering.fb.com/2026/06/25/security/privacy-aware-infrastructure-in-the-ai-native-era-an-asset-classification-case-study/"}]
  - id: "articles/meta-ai-blog/aed965de1d.md#c1"
    char_span: [248, 2971]
    sentence_count: 18
    key_terms: [classification, asset, deterministic, enforcement, production, downstream-sharing, retention, data]
    concepts: [classification, deterministic, asset, enforcement, downstream-sharing]
    related_chunks: ["articles/meta-ai-blog/aed965de1d.md#c2"]
    token_count: 512
  - id: "articles/meta-ai-blog/aed965de1d.md#c2"
    char_span: [2606, 5474]
    sentence_count: 28
    key_terms: [classification, context, asset, pipeline, signals, enforcement, fields, classifier]
    concepts: [classification, context, pipeline, asset, enforcement]
    related_chunks: ["articles/meta-ai-blog/aed965de1d.md#c1"]
    token_count: 512
  - id: "articles/meta-ai-blog/aed965de1d.md#c3"
    char_span: [5099, 7948]
    sentence_count: 25
    key_terms: [classifier, evaluation, deterministic, context, optimization, stable, model, contract]
    concepts: [classifier, evaluation, deterministic, optimization, context]
    related_chunks: ["articles/meta-ai-blog/aed965de1d.md#c4"]
    token_count: 512
  - id: "articles/meta-ai-blog/aed965de1d.md#c4"
    char_span: [7582, 10249]
    sentence_count: 23
    key_terms: [context, classifier, decision, evidence, signal, data, signals, supporting]
    concepts: [classifier, context, decision, evidence, signal]
    related_chunks: ["articles/meta-ai-blog/aed965de1d.md#c3"]
    token_count: 510
---
# Privacy-Aware Infrastructure in the AI-Native Era: An Asset Classification Case Study

Source: [Meta AI Blog](https://engineering.fb.com/2026/06/25/security/privacy-aware-infrastructure-in-the-ai-native-era-an-asset-classification-case-study/)

Privacy controls — systems that enforce retention, access, allowed-purpose, downstream-sharing, or anonymization policies — require a reliable understanding of data to function. Before such a control can operate effectively, it must know exactly what it is looking at. This can be complex, as demonstrated by a field simply named “age“: In one context, it might describe a person and require strict protections, while in another, it could be a cache time-to-live (TTL) numerical value in an infrastructure pipeline.
This is the everyday problem behind privacy-aware infrastructure (PAI): The inputs are noisy and probabilistic, but the outputs need to be precise enough to drive enforcement.
AI-native products make that problem harder. They introduce new data modalities, faster iteration cycles, derived features, embeddings, multimodal inputs, and changing policy interpretations. Manual review remains important for judgment and accountability, but it cannot keep up with the volume and pace of change.
At Meta, we apply a hybrid pattern for asset classification at scale:
- Build a rich context before asking a model to reason.
- Use LLMs to handle ambiguity, cold start, and novelty.
- Keep human-reviewed labels separate from model-generated recommendations.
- Distill stable behavior into deterministic, versioned rules for routine enforcement.
The end goal is not “LLMs everywhere.” Instead, it is a system that can learn from ambiguous signals while moving production enforcement toward logic that is low latency, replayable, and easier to audit.
The LLM does not make the production decision in the common case, deterministic rules do. We use LLMs deliberately and narrowly, to interpret novel or ambiguous assets, and then to distill what they learn into versioned human-reviewed deterministic rules, which steadily shrinks the LLM’s role in production over time. Humans stay in the loop where it matters most. People adjudicate the reviewed reference labels, and they review and approve rule promotions that could change how protection is enforced.
PAI addresses four operational concerns:
- Understand what data exists and how it is governed.
- Discover which data flows are relevant to a policy question.
- Enforce retention/access/purpose/sharing constraints.
- Demonstrate compliance through verifiable evidence.
Asset classification sits at the understand layer. It provides the foundation that every downstream concern depends on.
Why Asset Classification Matters
Asset classification is the foundation for many privacy controls. Before a system can enforce retention, access, allowed-purpose, downstream-sharing, or anonymization policies, it needs a reliable view of what the asset is and how it should be governed.
An asset can be more than a table or column. It can be a nested field inside a payload, a log key, an event parameter, an API field, a machine learning (ML) feature, an embedding, or a derived dataset produced by an intermediate pipeline. That breadth matters because AI-native systems often transform data across many representations. A single source signal can move through pipelines, become a feature, appear in a model-training workflow, or be joined with other derived signals. Classification has to follow the meaning of the data, not just its shape.
There are four recurring challenges:
First, noisy and weak signals: Dozens of context fields are fetched per asset, which forces the model to rediscover what matters each time. High token usage dilutes attention, and decision boundaries get buried in irrelevant or misleading fields. A field called age in a caching pipeline is a concrete example: Without code resolution and lineage analysis, a classifier will trigger false restrictions on the entire pipeline.
Second, the relevant context is distributed. Code, lineage, ownership, semantic annotations, documentation, and usage patterns often live in different systems. A good classifier needs to assemble that context before making a decision.
Third, requirements evolve. Product teams move quickly, and policy interpretation can change as new product capabilities appear. A static rule set or periodic manual review process can leave gaps between reviews.
Fourth, classification is only useful if it feeds enforcement. A false positive can trigger unnecessary restrictions downstream. A false negative can leave a protection gap. The classifier sits near the front of the enforcement pipeline, so its error profile affects every system that depends on it.
This creates the central tension: Classification needs to reason under ambiguity, but enforcement needs decisions that can be explained and reproduced later.
The Pattern
Our approach is built around three principles that emerged from building and operating the system:
First, context beats prompts. Most classification failures were not caused by weak instructions; they were caused by weak or missing evidence. Hours of prompt optimization produced marginal improvement when the model was reasoning over raw, noisy fields. Structuring context into evidence briefs, with supporting signals, contradicting signals, provenance, and masked circular fields, produced much larger accuracy improvements. The practical lesson is simple: Focus on what goes into the model before optimizing how you ask.
Second, decouple evaluation from optimization. LLM outputs are useful recommendations, but they cannot become their own ground truth. The evaluation loop needs to stay independent from the classifier: different models, different prompt strategies, frozen reference sets, human-reviewed labels, and regression gates. If evaluation and optimization share the same loop, the system can end up measuring drift instead of progress.
Third, distill stable behavior into deterministic rules. LLMs are useful for ambiguity, cold start, and new patterns. They are not the right default enforcement mechanism at scale. When the system finds stable, validated patterns, those patterns should become versioned, auditable rules that run without the LLM. Over time, the classifier should progressively shrink its own LLM surface area, leaving model inference for novel or ambiguous assets while routine enforcement becomes deterministic, low-latency, and replayable.
These principles translate into a concrete operating pattern: Define a stable classification contract, build a context mesh, route decisions through a deterministic-first funnel, and keep the learning loop safe with independent evaluation and reviewed labels.
To execute on this pattern, we break the work down into seven practical stages. These stages transform the high-level architecture into a concrete, repeatable process.
The rest of this post walks through those pieces using asset classification as the case study.
1.) Start With the Contract
A classifier should behave like a platform service. That means its contract should be small, explicit, and stable. For each asset, the classifier receives an identifier and a bundle of context. It returns a structured result with:
- A category from the classifier’s taxonomy.
- A confidence score – a raw model self-assessment whose calibration we evaluate against reviewed labels (see below).
- A decision trace showing which evidence influenced the result.
- The rule that matched, if the decision came from deterministic logic.
- Version information for the context, rules, and prompt used to make the decision.
The taxonomy is domain-specific. One classifier might distinguish user data from operational data. Another might classify whether an asset is eligible for a particular AI-training use case. We avoid forcing every classifier into one universal taxonomy. Instead, each classifier owns one scoped question, and downstream systems compose the answers when they need multiple facets.
That scoping is important. A narrow classifier is easier to evaluate, easier to debug, and easier to govern. It also makes the decision trace more meaningful because the classifier is explaining one decision, not trying to solve every policy question at once.
2.) Build Context Before Prompting
Most classification failures are not prompt failures. They are context failures. If the only signal is a field name, the model has to guess. If the system can also provide code references, lineage, ownership, semantic annotations, and nearby usage, the model can reason from better evidence.
In practice, the context mesh may include:
- Source-code resolution, including where a field is defined or used.
- Ownership and organizational metadata.
- Semantic annotations, such as data type or origin.
- Lineage signals that show where data came from and where it flows.
- ML heuristic outputs from scanners or embedding-based classifiers.
- Code search results that show references, logging declarations, or call sites.
The point is not to pass everything to the LLM. More context is not automatically better. Some fields are redundant. Some are noisy. Some can create circular reasoning if they already encode the label we are trying to predict.
So the system creates an evidence brief – a compact summary of the strongest supporting signals, contradicting signals, and provenance chains. Instead of asking the model to sift through raw context, we ask it to reason over the evidence that is most relevant to the classification decision.
Without this structuring, the model receives dozens of raw fields per asset and must rediscover what matters leading to high token consumption, diluted attention, and decision boundaries buried in noise. The evidence brief solves this by pre-ranking signals. For a field like user_payload.email_address, an evidence brief might say:
- Supporting signal: Lineage connects the asset to a user-facing logging pipeline (weight 0.8).
- Supporting signal: Semantic annotation indicates EMAIL-like data (weight 0.9).
- Contradicting signal: Ownership metadata points to an infrastructure team, not a user-facing product (weight 0.3).
- Suppressed signal: An existing privacy lab
