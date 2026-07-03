---
id: articles/nvidia-developer/a37bffd51a.md
url: "https://developer.nvidia.com/blog/deploy-long-context-reasoning-and-agentic-workflows-with-minimax-m3-on-nvidia-accelerated-infrastructure/"
url_hash: "a37bffd51a"
kind: "article"
source: "NVIDIA Developer"
title: "Deploy Long-Context Reasoning and Agentic Workflows with MiniMax M3 on NVIDIA Accelerated Infrastructure"
author: ""
date: "2026-06-12T14:43:17Z"
tier: 2
method: "source-native"
extracted_at: "2026-07-03T01:22:57.232820+00:00"
chars: 5373
engagement: "deliver-a-2026-risk-and-market-analysis-report-evaluating-ho"
collected_at: "2026-07-03T01:22:57.093Z"
relevance: 0
engagement_goal: "Deliver a 2026 risk and market analysis report evaluating how emerging property risks (climate extremes, aging equipment, outdated practices, AI and technological assets) and macroeconomic factors (inflation, interest rates) impact agricultural underwriting viability and farm solvency. Analyze these dynamics across distinct modern farmer personas, detailing their technological adoption barriers, educational needs, and generational shifts."
content_hash: "52a78a95243306b0"
relevance_by_goal: {"c5a2d58d1be7":0}
chunks:
  - id: "articles/nvidia-developer/a37bffd51a.md#c0"
    char_span: [0, 276]
    sentence_count: 1
    key_terms: [deploy-long-context-reasoning-and-agentic-workflows-with-minimax-m3-on-nvidia-accelerated-infrastructure, nvidia, developer, infrastructure, long-context, accelerated, reasoning, workflows]
    concepts: [nvidia, developer]
    token_count: 65
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/deploy-long-context-reasoning-and-agentic-workflows-with-minimax-m3-on-nvidia-accelerated-infrastructure/"}]
  - id: "articles/nvidia-developer/a37bffd51a.md#c1"
    char_span: [278, 2864]
    sentence_count: 15
    key_terms: [nvidia, minimax, blackwell, performance, developers, multimodal, attention, inference]
    concepts: [nvidia, minimax, blackwell, performance, developers]
    related_chunks: ["articles/nvidia-developer/a37bffd51a.md#c3"]
    token_count: 512
  - id: "articles/nvidia-developer/a37bffd51a.md#c2"
    char_span: [2564, 4656]
    sentence_count: 9
    key_terms: [deploying, sglang, tensorrt, vllm, serving, dynamo, nvidia, minimax-m3]
    concepts: [deploying, sglang, tensorrt, serving, minimax-m3]
    token_count: 512
  - id: "articles/nvidia-developer/a37bffd51a.md#c3"
    char_span: [4342, 5652]
    sentence_count: 9
    key_terms: [minimax, nvidia, developers, nemo, dynamo, framework, sequence, tensorrt]
    concepts: [minimax, nvidia, developers, dynamo, framework]
    related_chunks: ["articles/nvidia-developer/a37bffd51a.md#c1"]
    token_count: 272
---
# Deploy Long-Context Reasoning and Agentic Workflows with MiniMax M3 on NVIDIA Accelerated Infrastructure

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/deploy-long-context-reasoning-and-agentic-workflows-with-minimax-m3-on-nvidia-accelerated-infrastructure/)

As enterprise AI adoption scales, developers are increasingly forced to stitch together fragmented pipelines—separate models for text, vision, and code—leading to added complexity, higher costs, and slower iteration.
MiniMax M3—available on NVIDIA accelerated infrastructure, including NVIDIA Blackwell—changes this by enabling a single multimodal system capable of long-context reasoning, agentic workflows, and creative tasks.
The 428B parameter MoE supports up to 1M tokens and native multimodal input. Developers can build applications like long video understanding, extended coding sessions (8+ hours), and high-quality design workflows—all with a unified model and production-ready deployment paths on NVIDIA platforms.
MiniMax M3’s core architectural innovation is MiniMax Sparse Attention (MSA), which replaces standard quadratic attention with a pre-filtering stage that identifies relevant context blocks and attends only to those. At the operator level, each KV cache block is read once with contiguous memory access—more than 4x faster than existing sparse attention implementations. This yields 1/20th the per-token compute of M2 at 1M-token context, with 9x faster prefill and 15x faster decoding, all without compressing key-values or sacrificing precision. The model also trains text, images, and video natively from step 0 across ~100 trillion interleaved tokens, rather than adding multimodality post-training.
NVIDIA Blackwell performance insights
MiniMax M3 is built for a new class of multimodal, long-context inference, and NVIDIA Blackwell provides the scale and low-latency performance to serve it efficiently. On MiniMax M3, NVIDIA Blackwell Ultra delivers up to 10x higher throughput than the prior-generation NVIDIA Hopper shown in Figure 1, doubling interactivity and increasing AI factory throughput.
These gains are driven by a combination of hardware and software for extreme co-design. With speculative decoding, MTP, and accuracy-preserving NVFP4 acceleration, Blackwell is positioned to push MiniMax M3 performance even further as the stack continues to optimize across NVIDIA Dynamo and NVIDIA CUDA kernels.
Open source inference
Developers can use accelerated computing with their open source inference engine of choice, such as NVIDIA TensorRT LLM (text-only), SGLang, or vLLM.
Deploying with NVIDIA TensorRT LLM
The optimizations are available on the NVIDIA TensorRT LLM GitHub repository. Follow the quick start guide to stand up a high-performance server—it covers downloading model checkpoints from Hugging Face, a ready-to-run Docker container, and configuration options for both low-latency and max-throughput serving. NVIDIA also collaborated on the developer experience through the Transformers library.
Deploying with SGLang
Users deploying models with the SGLang serving framework can use the following instructions. See the SGLang documentation for more information and configuration options.
# 8 GPUs node case 
$ python -m sglang.launch_server \ 
    --model-path MiniMaxAI/MiniMax-M3 \ 
    --dtype bfloat16 \ 
    --tp-size 8 \ 
    --ep-size 8 \ 
    --trust-remote-code \ 
    --mem-fraction-static 0.8 \ 
    --enable-multimodal \ 
    --quantization mxfp8 \ 
    --attention-backend flashinfer \ 
    --mm-attention-backend flashinfer_cudnn \ 
    --moe-runner-backend deep_gemm \ 
    --chunked-prefill-size 8192 \ 
    --reasoning-parser minimax-m3 \ 
    --tool-call-parser minimax-m3-nom 
--tr 
Deploying with vLLM
When deploying models with the vLLM serving framework, use the following instructions. For more information, see the vLLM Recipe.
vllm serve MiniMaxAI/MiniMax-M3 \ 
  --tensor-parallel-size 8 \ 
  --enable-expert-parallel \ 
  --block-size 128 \ 
  --mm-encoder-attn-backend FLASHINFER \ 
  --mm-processor-cache-type shm \ 
  --tool-call-parser minimax_m3 \ 
  --enable-auto-tool-choice \ 
  --reasoning-parser minimax_m3 \ 
  --trust-remote-code 
Scaling with NVIDIA Dynamo
Dynamo is an open source distributed inference serving platform for developers to deploy frontier models like MiniMax M3 for large-scale applications. Deploying MiniMax M3 using Dynamo with TensorRT LLM improves performance for long input sequence lengths without sacrificing throughput or increasing GPU budget.
Dynamo integrates with all major inference engines and frameworks, including PyTorch, SGLang, TensorRT LLM, and vLLM, and offers LLM-aware routing, elastic autoscaling, and low-latency data transfer. Developers can follow the deployment guide to run MiniMax M3 with Dynamo.
Customize with NVIDIA NeMo Framework
MiniMax M3 can be customized and fine-tuned with the open source NVIDIA NeMo Framework. Users can:
- Use NVIDIA NeMo AutoModel for out-of-the-box fine-tuning (both SFT and LoRA) over Hugging Face checkpoints without any conversion, with high-throughput acceleration from full N-D parallelism. Specifically, context parallel support is available for sequence lengths up to 128k.
- Use NVIDIA NeMo RL to conduct reinforcement learning on top of Minimax M3, referencing the following sample accuracy curves.
These libraries provide developers with a suite of lightweight tools for rapid experimentation on the latest frontier models.
Get started today
Developers can prototype and evaluate MiniMax M3 by using the GPU-accelerated API on build.nvidia.com or by downloading the weights from Hugging Face.
