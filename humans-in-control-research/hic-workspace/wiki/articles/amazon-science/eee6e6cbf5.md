---
id: articles/amazon-science/eee6e6cbf5.md
url: "https://www.amazon.science/blog/making-llms-faster-without-sacrificing-accuracy"
url_hash: "eee6e6cbf5"
kind: "article"
source: "amazon_science"
title: "Making LLMs faster without sacrificing accuracy"
author: ""
date: "Fri, 15 May 2026 13:00:00 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-08-26T19:21:49.227897+00:00"
chars: 6975
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:21:49.183Z"
relevance: 5
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "f8757c4a287891df"
relevance_by_goal: {"8429cfd39d4f":0,"d21cb50b17ba":5}
chunks:
  - id: "articles/amazon-science/eee6e6cbf5.md#c0"
    char_span: [0, 157]
    sentence_count: 1
    key_terms: [making-llms-faster-without-sacrificing-accuracy, sacrificing, accuracy, science, without, amazon, faster, making]
    token_count: 41
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/making-llms-faster-without-sacrificing-accuracy"}]
  - id: "articles/amazon-science/eee6e6cbf5.md#c1"
    char_span: [159, 2827]
    sentence_count: 17
    key_terms: [scaling, attention, representation, token, architecture, model, accuracy, deepmind]
    concepts: [scaling, representation, attention, architecture, token]
    related_chunks: ["articles/amazon-science/eee6e6cbf5.md#c2"]
    token_count: 512
  - id: "articles/amazon-science/eee6e6cbf5.md#c2"
    char_span: [2474, 5074]
    sentence_count: 16
    key_terms: [attention, token, hidden, parameters, throughput, model, ratio, key-value]
    concepts: [attention, token, parameters, throughput, hidden]
    related_chunks: ["articles/amazon-science/eee6e6cbf5.md#c1"]
    token_count: 512
  - id: "articles/amazon-science/eee6e6cbf5.md#c3"
    char_span: [4742, 7072]
    sentence_count: 15
    key_terms: [models, accuracy, model, billion, llama-3, mlp-to-attention, gains, optimal]
    concepts: [models, accuracy, mlp-to-attention, billion, llama-3]
    token_count: 512
  - id: "articles/amazon-science/eee6e6cbf5.md#c4"
    char_span: [6702, 7135]
    sentence_count: 2
    key_terms: [parameters, billion, million, across, architecture, conditional, exploration, generalizes]
    concepts: [parameters, billion, million, across]
    token_count: 79
---
# Making LLMs faster without sacrificing accuracy

Source: [amazon_science](https://www.amazon.science/blog/making-llms-faster-without-sacrificing-accuracy)

Large language models (LLMs) keep getting bigger and better. But the cost of running them — generating text, answering questions, powering real-time applications — is scaling up, too. Obviously, model accuracy is important, but for real-time AI-based web applications, it can’t come at the expense of efficiency.
In a paper we presented at the International Conference on Learning Representations (ICLR), we provide a framework for navigating this accuracy-versus-efficiency tradeoff, by connecting scaling laws directly to architectural-design decisions.
The gap in current scaling laws
In 2022, Google DeepMind announced the results of a study involving an experimental LLM called Chinchilla. The DeepMind researchers demonstrated a scaling law that enabled joint optimization of model size and training data to achieve a desired loss level, given a particular computational budget.
More precisely, the law relates the model loss (L) to the number of model parameters (N) and the number of tokens in the training dataset:
The other variables in this equation — E, A, B, α, and β — are all learnable coefficients. The DeepMind researchers did extensive experimentation to tune those coefficients.
This "Chinchilla law" doesn't specify architectural choices, such as the size of the model's internal representations — the "hidden size" — or the relative number of parameters allocated to attention layers and multilayer perceptron (MLP) layers. However, two models, each with the same billion-parameter count, trained on the same data, with the same accuracy, can differ by up to 40% in inference-time throughput, depending on additional architectural choices. We set out to deduce scaling laws that can help predict those choices.
The Transformer architecture
The Transformer architecture — which lies at the heart of all LLMs — consists largely of stacked attention and MLP blocks. Attention blocks determine how much weight to give each prior token (word or word part) when updating the current token's representation; MLP blocks transform that representation further and are where much of the model's learned knowledge is stored. A separate output layer at the end of the stack converts the final representation into a probability distribution over the next token.
Architecture is not an afterthought. The right configurations can unlock large efficiency gains with no accuracy cost.
The attention mechanism uses three matrices, with names borrowed from information retrieval: the query matrix encodes what each token is looking for in the rest of the sequence; the key matrix encodes what each token has to offer; and the value matrix holds the content each token can contribute when it's attended to. Comparing queries against keys tells the model how relevant each token is to each other token.
Most LLMs use multihead attention: several attention computations run in parallel, each with its own query, key, and value projections. Different heads tend to specialize in different aspects of the input, letting the model capture a richer set of relationships than a single head would.
Our approach: Architecture as a first-class variable
In our ICLR paper, we introduce a scaling law that augments the Chinchilla framework with three architectural factors: the hidden size (the dimension of the vectors that flow through the embedding, attention, and MLP blocks); the ratio of the number of MLP parameters to the number of attention parameters; and grouped-query attention (GQA), in which groups of attention heads, while preserving distinct query matrices, share key and value matrices.
Each factor has a direct impact on inference throughput:
- Hidden size (d_model): Under a fixed parameter budget, larger hidden sizes reduce total inference FLOPs and shrink the key-value cache, improving throughput.
- MLP-to-attention ratio (r_mlp/attn): A higher ratio allocates more parameters to the MLP and fewer to attention, shrinking the key-value cache and reducing memory-bandwidth bottlenecks.
- Grouped-query attention (GQA): Compressing key-value heads further cuts input/output costs during generation.
Adjusting these factors purely for higher throughput comes at a cost of accuracy. Both hidden size and MLP-to-attention ratio exhibit U-shaped loss curves: there is an optimal point for each, and pushing too far in either direction has a negative effect on model accuracy. GQA has a more erratic effect on loss, so we treat it as a discrete hyperparameter tuned through local search.
We deduce our scaling law in two stages. First, we fit the standard Chinchilla law to the model under investigation, calculating values for the coefficients E, A, B, α, and β. This establishes an optimal reference loss. Then we calibrate how each architectural choice — differences in the three factors we consider — affects that loss. Effectively, we learn a correction surface over the design space. Because the effects of hidden size and MLP-to-attention ratio on loss turn out to be separable, each factor can be optimized independently.
Two model families: Panda and Surefire
This scaling law enabled us to develop a search framework that identifies Pareto-optimal architectures for any given accuracy target. The result of that search was two model families: Panda (which maximizes accuracy) and Surefire (which is Pareto optimal on the accuracy–efficiency frontier).
To validate the framework and identify our families of optimal models, we trained more than 200 models with varying architectures (80 million to three billion parameters, eight billion to 100 billion tokens). The results of our experiments are below (throughput measured on H200 GPU with batchsize-128-4096-input-1024-output tokens):
- The billion-parameter Panda model gains 2.1% over LLaMA-3.2-1B, and the three-billion parameter model gains 0.6% over LLaMA-3.2-3B — at the cost of lower throughput.
- Surefire models match or exceed LLaMA-3.2 accuracy while improving throughput by 12-47%, with gains reaching up to 42% on A100 (vLLM) and 47% on H200 (SGLang) under different model size and batch size configurations.
Key takeaways
- Architecture is not an afterthought. The optimal MLP-to-attention ratio of LLaMA-3.2-style models is around 1.0, far lower than that of existing open-weight versions (e.g., 4.8 for LLaMA-3.2-1B). Current models overallocate to MLP layers. The right configurations of hidden size, MLP-to-attention ratio, and GQA configuration can unlock large efficiency gains with no accuracy cost.
- Small-scale experiments predict large-scale outcomes. The conditional scaling law, calibrated on models with as few as 80 million to 297 million parameters, reliably predicts the best architecture at one billion and three billion parameters, enabling low-cost exploration before expensive full-scale training.
- The framework generalizes across hardware and serving systems. Efficiency gains are consistent across A100/H200 GPUs and vLLM/SGLang, making the results directly actionable.
