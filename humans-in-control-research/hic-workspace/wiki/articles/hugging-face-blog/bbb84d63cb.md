---
id: articles/hugging-face-blog/bbb84d63cb.md
url: "https://huggingface.co/blog/helmet"
url_hash: "bbb84d63cb"
kind: "article"
source: "Hugging Face Blog"
title: "Introducing HELMET: Holistically Evaluating Long-context Language Models"
author: ""
date: "Wed, 16 Apr 2025 00:00:00 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-07-03T01:19:37.578618+00:00"
chars: 10000
engagement: "deliver-a-2026-risk-and-market-analysis-report-evaluating-ho"
collected_at: "2026-07-03T01:19:37.621Z"
relevance: 1
engagement_goal: "Deliver a 2026 risk and market analysis report evaluating how emerging property risks (climate extremes, aging equipment, outdated practices, AI and technological assets) and macroeconomic factors (inflation, interest rates) impact agricultural underwriting viability and farm solvency. Analyze these dynamics across distinct modern farmer personas, detailing their technological adoption barriers, educational needs, and generational shifts."
content_hash: "dbc1c21083695433"
relevance_by_goal: {"c5a2d58d1be7":1}
chunks:
  - id: "articles/hugging-face-blog/bbb84d63cb.md#c0"
    char_span: [0, 140]
    sentence_count: 1
    key_terms: [helmet, blog, holistically, long-context, huggingface, introducing, evaluating, language]
    concepts: [helmet]
    token_count: 34
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/helmet"}]
  - id: "articles/hugging-face-blog/bbb84d63cb.md#c1"
    char_span: [142, 2512]
    sentence_count: 13
    key_terms: [models, helmet, language, long-context, lclms, evaluating, context, benchmarks]
    concepts: [models, helmet, language, long-context, evaluating]
    related_chunks: ["articles/hugging-face-blog/bbb84d63cb.md#c4"]
    token_count: 512
  - id: "articles/hugging-face-blog/bbb84d63cb.md#c2"
    char_span: [2195, 4605]
    sentence_count: 11
    key_terms: [models, tasks, lclms, synthetic, evaluate, benchmarks, downstream, evaluating]
    concepts: [models, tasks, lclms, synthetic, evaluate]
    related_chunks: ["articles/hugging-face-blog/bbb84d63cb.md#c3", "articles/hugging-face-blog/bbb84d63cb.md#c4"]
    token_count: 512
  - id: "articles/hugging-face-blog/bbb84d63cb.md#c3"
    char_span: [4314, 6957]
    sentence_count: 17
    key_terms: [models, length, tasks, evaluation, input, diverse, applications, benchmarks]
    concepts: [models, length, evaluation, tasks, applications]
    related_chunks: ["articles/hugging-face-blog/bbb84d63cb.md#c2", "articles/hugging-face-blog/bbb84d63cb.md#c4"]
    token_count: 512
  - id: "articles/hugging-face-blog/bbb84d63cb.md#c4"
    char_span: [6614, 9329]
    sentence_count: 21
    key_terms: [models, performance, different, tasks, long-context, open-source, helmet, using]
    concepts: [models, performance, different, tasks, long-context]
    related_chunks: ["articles/hugging-face-blog/bbb84d63cb.md#c1", "articles/hugging-face-blog/bbb84d63cb.md#c2", "articles/hugging-face-blog/bbb84d63cb.md#c3"]
    token_count: 512
  - id: "articles/hugging-face-blog/bbb84d63cb.md#c5"
    char_span: [9019, 9605]
    sentence_count: 4
    key_terms: [using, endpoint, "huggingface's", launch, model, machine, helmet, transformerslibrary]
    concepts: [using, "huggingface's", endpoint, launch, model]
    related_chunks: ["articles/hugging-face-blog/bbb84d63cb.md#c6"]
    token_count: 129
  - id: "articles/hugging-face-blog/bbb84d63cb.md#c6"
    char_span: [9615, 10143]
    sentence_count: 6
    key_terms: ["huggingface's", config, transformers, endpoint, library, option, using, tgi]
    concepts: ["huggingface's", config, transformers, endpoint, library]
    related_chunks: ["articles/hugging-face-blog/bbb84d63cb.md#c5"]
    token_count: 120
---
# Introducing HELMET: Holistically Evaluating Long-context Language Models

Source: [Hugging Face Blog](https://huggingface.co/blog/helmet)

Introducing HELMET: Holistically Evaluating Long-context Language Models
Paper: https://arxiv.org/abs/2410.02694
Website: https://princeton-nlp.github.io/HELMET
Code & Data: https://github.com/princeton-nlp/HELMET
Since we first released HELMET last October, there has been more development on long-context language models than ever before, and we are thrilled to see the adoption of HELMET by the community, such as Microsoft's Phi-4 and AI21's Jamba 1.6. After the initial release, we have added more models to our evaluation suite and conducted additional analyses. We are excited to share our new results and present HELMET at ICLR 2025!
In this blog, we will describe the construction of HELMET, our key findings, and how practitioners can use HELMET to differentiate between various LCLMs in future research and applications. Finally, we will conclude with a quickstart guide for using HELMET with HuggingFace.
Evaluating long-context language models is challenging but important
From summarizing numerous legal documents to learning new tasks on the fly, long-context language models (LCLMs) have immense potential to change the way we use and interact with language models. Language models have been limited by their context window, which is around 2K to 8K tokens (e.g., ChatGPT, Llama-2/3). Recently, model developers have been constantly increasing the context window of their models, with recent models like GPT-4o, Claude-3, and Gemini-1.5 supporting context windows of up to millions of tokens.
However, with longer context windows, previous natural language benchmarks (e.g., Scrolls) are no longer suitable for evaluating LCLMs. Consequently, perplexity and synthetic tasks (e.g., needle-in-a-haystack) emerged as the most popular evaluation metrics for recent LCLMs, but they often do not reflect real-world performance. Model developers may also evaluate on other arbitrary datasets, which complicates model comparisons. Furthermore, existing benchmarks for LCLMs may show confusing and counterintuitive results, making it difficult to understand the strengths and weaknesses of different models (Figure 1).
In this work, we propose HELMET (How to Evaluate Long-Context Models Effectively and Thoroughly), a comprehensive benchmark for evaluating LCLMs that improves upon existing benchmarks in several ways—diversity, controllability, and reliability. We evaluate 59 recent LCLMs and find that it is crucial to evaluate models across diverse applications to understand their capabilities and frontier LCLMs are still limited on complex tasks.
Existing evaluations overly rely on synthetic tasks
With the development of LCLMs across both industry and the open-source community, it is crucial to have a reliable method for evaluating and comparing these models. However, current models are often evaluated on different benchmarks (Table 1).
A common practice for evaluating long-context language models is to use perplexity or synthetic tasks, such as needle-in-a-haystack (NIAH). However, recent works have shown that perplexity does not correlate well with downstream performance (Fang et al., 2024). In Figure 2, we show that synthetic tasks like NIAH do not correlate with real-world performance, but the more complex synthetic tasks achieve higher correlation with real-world tasks.
Among the existing benchmarks with realistic applications, such as ZeroScrolls (Shaman et al., 2023), LongBench (Bai et al., 2024), and InfiniteBench (Zhang et al., 2024), there are still crucial limitations:
- Insufficient coverage of downstream tasks: often focused on specific domains
- Inadequate lengths for testing frontier LCLMs: older QA datasets are often limited to <32K tokens (e.g., QASPER, QuALITY)
- Unreliable metrics: N-gram matching metrics like ROUGE are noisy—they do not correlate with human judgments (Goyal et al., 2023) and do not distinguish between models
- Incompatibility with base models: require instruction-tuning, which means they cannot be used for base model development
Thus, we propose HELMET to address these limitations and provide a comprehensive evaluation of LCLMs.
Crafting diverse, controllable, and reliable evaluation for LCLMs
We design HELMET with the following desiderata:
- Diverse coverage of downstream tasks
- Controllable length and complexity
- Reliable evaluation for base and instruction-tuned models
Table 2 shows an overview of the benchmark. In our experiments, we evaluate on input length from 8K to 128K tokens, but HELMET can be easily extended to even longer context lengths.
Key improvements over existing benchmarks
Diverse coverage: HELMET includes a diverse set of tasks, such as retrieval-augmented generation with real retrieval passages, generation with citations, and summarization. We carefully select datasets with naturally long contexts that reflect real-world applications. These datasets are complemented with reliable evaluation settings, such as model-based evaluations and human studies.
Controllable length and difficulty: An important dimension to consider when evaluating LCLMs is the input length, as longer inputs can provide more information while challenging the model's ability to process noisy contexts. In our tasks, we can control the input length by changing the number of retrieved passages (RAG, Cite, Re-rank), the number of demonstrations (ICL), or the length of the input document (LongQA, Summ). Although LongQA and Summ cannot be easily extended to longer contexts, we intentionally chose datasets with natural documents of length far greater than 100K tokens, such that they can still be used to evaluate frontier LCLMs.
Reliable evaluation: Many existing benchmarks still use n-gram-based metrics, such as ROUGE, despite their poor correlation with human judgments (Goyal et al., 2023). We employ model-based evaluations that show better distinguishability between models and different input lengths (Figure 3). Furthermore, our human studies show that our metrics have a high agreement with human judgments.
Robust prompting: Existing long-context benchmarks often require models to follow instructions, but many model developments revolve around base models, which have to rely on synthetic tasks or perplexity for evaluation. Thus, we support base models for a subset of our tasks via in-context learning examples. This substantially improves the performance of base models, which is more reflective of real-world applications.
LCLMs still have a long way to go on real-world tasks
Our experiments and analyses include a comprehensive set of 59 LCLMs. To our knowledge, this is the most thorough and controlled comparison of long-context models on diverse applications. These models cover both leading proprietary and open-source models, and we also consider models with different architectures (e.g., full-attention transformers, hybrid architectures) and positional extrapolation techniques. In this section, we will highlight a few key findings from our experiments.
Diverse evaluation is needed for assessing long-context abilities
Long-context benchmarks are often constructed with specific applications in mind, such as summarization or question answering, which limits the understanding of LCLMs in a broader context. We examine model performance over a wide range of real tasks and find that different categories do not always correlate with each other (Figure 4).
While some tasks moderately correlate with each other (e.g., RAG and MS-MARCO) due to their retrieval-based nature, others show little correlation (e.g., Summ and Cite). Notably, ICL has the lowest correlation with other tasks, which suggests that it is a unique task that requires different capabilities from the model. Therefore, model developers should evaluate across these distinct axes to draw a more holistic picture of the model's capabilities.
Models degrade with increasing lengths and task complexity
We present the results of the frontier proprietary models as well as a few open-source models on HELMET. Additional results can be found in the paper and the website.
First, we observe that open-source models lag behind closed-source models on complex tasks. Although the gap appears small on simpler tasks, such as Recall, the gap widens on more complex ones, such as Cite.
Furthermore, performance degradation with increasing lengths is category-dependent. Even the most advanced models, such as GPT-4o and Gemini, experience a significant decrease in performance on tasks like re-ranking. This change in performance cannot be observed from simply looking at the synthetic task performance.
Finally, there is no clear winner across all categories, thereby calling for evaluation across different axes. Additional analysis, such as the performance of different positional extrapolation methods and the lost-in-the-middle phenomenon, can be found in the paper.
Using HELMET for future developments
How to run HELMET
Using HELMET is easy! Simply clone our GitHub repository, and everything is ready to go after setting up the environment!
We provide many different ways for loading models, which can be configured in the config file:
- using HuggingFace's transformerslibrary
- using HuggingFace's TGI to launch a model endpoint in your machine
- using HuggingFace's Inference Endpoints to launch a remote model endpoint
- using vllm to launch a model endpoint in your machine. Note: You can launch vllm endpoint on Intel Gaudi accelerators.
- using model provider's APIs
	
		
	
	
		Option 1. Using HuggingFace's transformers library
	
Just use the config yamls in our repo and run these evaluations with
python eval.py --config configs/rag.yaml --model_name_or_path <model_name>
Behind the scenes, HuggingFace's transformers library is used, and both local and remote models are automatically supported.
Option 2. Using HuggingFace's TGI
First, follow the instructions on TGI github to launch a model endpoint. Then in your config file, specify the endpoint url. For example, you can have a config.yaml like
