---
id: articles/nvidia-developer/9afb63cdcc.md
url: "https://developer.nvidia.com/blog/reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading/"
url_hash: "9afb63cdcc"
kind: "article"
source: "NVIDIA Developer"
title: "Reducing High-Bandwidth Memory Bottlenecks in JAX-Based LLM Training with Host Offloading"
author: ""
date: "2026-07-10T18:17:40Z"
tier: 2
method: "source-native"
extracted_at: "2026-08-13T17:17:51.867141+00:00"
chars: 10000
engagement: "analyze-the-executive-search-industry-to-map-current-trends"
collected_at: "2026-08-13T17:17:52.073Z"
relevance: 0
engagement_goal: "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points (as well as market research validated industry-wide use cases), producing a structured assessment of targeted AI use cases, their implementation feasibility, and expected efficiency gains to address these challenges."
content_hash: "626a7df945300f58"
relevance_by_goal: {"bb7e192171b3":0}
chunks:
  - id: "articles/nvidia-developer/9afb63cdcc.md#c0"
    char_span: [0, 245]
    sentence_count: 1
    key_terms: [reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading, developer, nvidia, high-bandwidth, bottlenecks, offloading, jax-based, reducing]
    concepts: [developer, nvidia]
    token_count: 61
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading/","kind":"article","date":"2026-07-10"}]
  - id: "articles/nvidia-developer/9afb63cdcc.md#c1"
    char_span: [247, 2719]
    sentence_count: 21
    key_terms: [offloading, nvidia, host, activations, activation, memory, blackwell, model]
    concepts: [offloading, nvidia, activations, activation, blackwell]
    related_chunks: ["articles/nvidia-developer/9afb63cdcc.md#c2", "articles/nvidia-developer/9afb63cdcc.md#c3", "articles/nvidia-developer/9afb63cdcc.md#c4", "articles/nvidia-developer/9afb63cdcc.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading/","kind":"article","date":"2026-07-10"}]
  - id: "articles/nvidia-developer/9afb63cdcc.md#c2"
    char_span: [2427, 4948]
    sentence_count: 20
    key_terms: [batch, offloading, activation, deepseek-v3, moe, throughput, configurations, selected]
    concepts: [batch, offloading, activation, deepseek-v3, throughput]
    related_chunks: ["articles/nvidia-developer/9afb63cdcc.md#c1", "articles/nvidia-developer/9afb63cdcc.md#c3", "articles/nvidia-developer/9afb63cdcc.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading/","kind":"article","date":"2026-07-10"}]
  - id: "articles/nvidia-developer/9afb63cdcc.md#c3"
    char_span: [4690, 6864]
    sentence_count: 15
    key_terms: [offloading, batch, activations, device, memory, configuration, throughput, gpu]
    concepts: [offloading, activations, batch, configuration, device]
    related_chunks: ["articles/nvidia-developer/9afb63cdcc.md#c1", "articles/nvidia-developer/9afb63cdcc.md#c2"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading/","kind":"article","date":"2026-07-10"}]
  - id: "articles/nvidia-developer/9afb63cdcc.md#c4"
    char_span: [6617, 9227]
    sentence_count: 18
    key_terms: [offloading, communication, memory, host, nvidia, overlap, rematerialization, qkv]
    concepts: [offloading, communication, memory, nvidia, rematerialization]
    related_chunks: ["articles/nvidia-developer/9afb63cdcc.md#c1", "articles/nvidia-developer/9afb63cdcc.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading/","kind":"article","date":"2026-07-10"}]
  - id: "articles/nvidia-developer/9afb63cdcc.md#c5"
    char_span: [8856, 10248]
    sentence_count: 9
    key_terms: [offloading, jax, memory, nvidia, host, used, activation, container]
    concepts: [offloading, memory, nvidia, activation, container]
    related_chunks: ["articles/nvidia-developer/9afb63cdcc.md#c1", "articles/nvidia-developer/9afb63cdcc.md#c2", "articles/nvidia-developer/9afb63cdcc.md#c4"]
    token_count: 285
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading/","kind":"article","date":"2026-07-10"}]
---
# Reducing High-Bandwidth Memory Bottlenecks in JAX-Based LLM Training with Host Offloading

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/reducing-high-bandwidth-memory-bottlenecks-in-jax-based-llm-training-with-host-offloading/)

Large language model (LLM) training workloads increasingly run into GPU memory limits before compute is fully used. Model weights, gradients, optimizer states, communication buffers, and intermediate activations all compete for GPU high-bandwidth memory (HBM). As model size, sequence length, and batch size grow, HBM capacity often becomes the primary scaling bottleneck.
This post explains how host offloading in the open source Python library JAX reduces HBM pressure. This process, which is especially advantageous on NVIDIA Blackwell, moves selected activations to pinned host memory during the forward pass and streams them back when needed in the backward pass. Host offloading is an alternative to activation rematerialization. Instead of recomputing selected activations, the training step reloads them from host memory.
Why is host offloading advantageous on NVIDIA Grace Blackwell systems?
Host offloading is especially advantageous on NVIDIA Grace Blackwell systems. The NVIDIA Grace CPU and NVIDIA Blackwell GPU are connected through NVLink-C2C with 900 GB/s of bidirectional bandwidth, making pinned host memory a practical staging area for selected activations. The Vera CPU and Rubin GPU further improve on this by doubling the bidirectional speed to 1.8 TB/s of coherent bandwidth.
High-bandwidth CPU-GPU connectivity helps make host offloading practical, but bandwidth alone is not enough. To improve performance, activation transfers must overlap with useful GPU work.
Performance results on MaxText workloads
The experiments use MaxText, a JAX LLM training framework that uses the Accelerated Linear Algebra (XLA) compiler for training at scale on NVIDIA GPUs. All results were measured on NVIDIA GB200 NVL72 systems using 128 GPUs.
The evaluation uses two MaxText workloads. Llama 3.1 405B is a dense decoder-only transformer model used to study targeted query, key, and value (QKV) activation offloading at a fixed batch size. DeepSeek-V3 671B is a sparse mixture-of-experts (MoE) model with multihead latent attention (MLA), used to study both throughput and memory-capacity effects.
DeepSeek-V3 671B offloading policy
DeepSeek-V3 671B has 61 decoder layers: the first three use dense multilayer perceptron (MLP) blocks, while the remaining layers use MoE blocks.
Figure 1 shows the activation offloading policy for the repeated MoE decoder layer, which dominates the stack. The first three dense MLP layers are not shown; they use a similar policy, with selected up and down projection outputs offloaded.
In the MoE layer shown in Figure 1, the policy offloads selected MLA query and key/value projection intermediates and selected MoE up projection intermediates. These activations are large enough to impact whether larger batch configurations fit.
Training throughput improvements
MaxText reports throughput as TFLOPs/s/device, computed from model FLOPs per training step divided by measured step time.
DeepSeek-V3 671B
Figure 2 compares DeepSeek-V3 671B throughput across activation placement policies. With offloading, LHS, and pipelined transfers enabled, the workload reached 908.2 TFLOPs/s/device. This was 57% faster than activation rematerialization at the same batch configuration and 67.7% faster than offloading without LHS or pipelining.
Unlike the dense Llama workload where LHS alone was sufficient to hide latency, the massive activation footprint of DeepSeek-V3 MoE and MLA layers means that enabling pipelined transfers provides a distinct, positive impact on total throughput.
These performance leaps highlight a fundamental NVIDIA advantage: the tight co-design of software and hardware. In a typical commodity cluster, streaming massive MoE activation layers to host memory would stall the entire training pipeline. On Blackwell, XLA custom scheduling flags work hand-in-hand with the hardware to ensure data is moved asynchronously over dedicated copy streams.
This enables NVIDIA platforms to unlock massive batch configurations that remain completely out of reach for architectures lacking this tight compiler-to-interconnect integration.
Increasing feasible batch size
Host offloading can also change which batch configurations are feasible. Table 1 shows DeepSeek-V3 671B results across activation placement policies.
Rows 4 and 5 show the capacity comparison. Saving selected activations on device fit micro batch 2 and global batch 256, while optimized host offloading fit micro batch 8 and global batch 1024. Without using either offloading or rematerialization, the device will hit an Out-of-Memory (OOM) error when attempting to use a micro batch size of 8 and global batch size of 1024.
Host offloading made the micro batch 8, global batch 1024 configuration feasible by moving selected activation storage out of GPU memory. In this DeepSeek configuration, the offload policy targets large intermediate activations from MLA, MoE, and MLP blocks. Keeping those activations on device limits the feasible batch configuration, while offloading them leaves more HBM available for model state, communication buffers, runtime workspaces, and active computation.
With LHS and pipelined transfers enabled, the offload run uses 165.2 GiB of GPU memory, compared with 145.6 GiB without those optimizations. The increase comes from keeping more copy buffers and prefetched activations in GPU memory while transfers overlap with computation. This extra HBM use trades some memory capacity for better overlap and higher throughput.
Llama 3.1 405B
The Llama 3.1 405B experiment ran 10 steps on synthetic data with batch size 2, sequence length 8,192, fully sharded data parallelism (FSDP) set to 128, and bfloat16 activations with NVFP4 4-bit weight quantization.
As shown in Table 2, QKV activation offloading with Latency Hiding Scheduler (LHS) improved throughput from 2,669 to 2,746 TFLOPs/s/device, a 2.9% increase over the baseline without offloading. Disabling LHS reduced QKV offload throughput to 2,569 TFLOPs/s/device, highlighting that host offloading depends on effective overlap with other GPU work.
For this Llama 3.1 405B run, LHS alone provided the best throughput: 2,746 TFLOPs/s/device without pipelining compared with 2,718 TFLOPs/s/device with pipelining. In this configuration, LHS already hides most transfer latency behind compute and communication, leaving little exposed latency for pipelining to hide.
The 70.9 GiB host memory value is the total QKV activation storage across all 126 layers, not the amount of GPU memory saved at a single moment. At batch size 2 and sequence length 8,192, one layer’s bfloat16 QKV activations require about 576 MiB: 512 MiB for query and 32 MiB each for key and value.
With the scan loop enabled for layers (scan_layers=True), the backward pass processes one layer at a time, so QKV activations of only one layer are needed on the GPU at once. In this workload, QKV offloading is mainly a performance optimization: it replaces backward pass QKV rematerialization with transfers that can overlap with compute and communication. GPU peak memory remains dominated by model state, communication buffers, and runtime workspaces.
Llama 3.1 405B provides a dense-model fixed-batch example. The gain is smaller than DeepSeek V3 671B, but it shows the same mechanism: targeted QKV offloading replaces backward-pass rematerialization with transfers that overlap with compute and communication.
When is host offloading most useful?
Host offloading is most useful when GPU memory limits model size, sequence length, or batch size, and when selected tensors are large enough to reduce HBM pressure. It is especially useful when offloading can replace expensive activation rematerialization or make a larger batch configuration feasible.
Performance depends on overlap. Host offloading works best when the workload has enough compute, communication, or other independent work to hide transfer latency. On NVIDIA GPUs, XLA helps create this overlap by using dedicated copy streams, scheduling transfers with LHS, and enabling pipelined host offloading.
This pipeline is particularly advantageous on platforms like the NVIDIA Blackwell GB200 and NVIDIA Blackwell Ultra GB300, which leverage dedicated NVLink-C2C interconnect to bypass traditional PCIe bottlenecks entirely. With the NVIDIA Vera Rubin platform delivering even higher interconnect performance, host offloading provides a predictable architectural lever for decoupling training throughput from strict physical memory limits.
Host offloading is less likely to help when tensors are small, when little independent work is available to overlap transfers, or when the workload is bottlenecked somewhere other than memory. Runtime memory should still be validated with real runs because static estimates may not include NVIDIA Collective Communications Library (NCCL) communication scratch space, NVIDIA cuDNN attention workspace, and framework-managed buffers.
How to get started with host offloading
Start with a small representative JAX training run. Choose large activations from expensive forward paths, enable offloading, and measure runtime GPU memory, host memory use, and end-to-end step time.
For open source JAX APIs, see the JAX host offloading tutorial. It covers activation offloading with jax.remat, checkpoint policies, and memory_kind=”pinned_host”, as well as parameter and optimizer state offloading with jax.device_put().
The MaxText experiments in this post used the NGC JAX container. The DeepSeek-V3 671B runs used ghcr.io/nvidia/jax:deepseek_v3_maxtext, a customized container with additional MaxText integration for Transformer Engine MoE permutation optimizations.
The optimized offload configurations used the following XLA flags:
--xla_gpu_enable_latency_hiding_scheduler=true
--xla_gpu_enable_pipelined_host_offloading=true
--xla_gpu_experimental_parallel_async_compute_limit=8
The last setting increases the amount of asynchronous work that can be in flight, giving LHS more room to overlap activation copies and NCCL collect
