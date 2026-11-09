---
id: articles/nvidia-ai-blog/dcbfa4975d.md
url: "https://blogs.nvidia.com/blog/local-ai-open-source-models-agents-nemotron/"
url_hash: "dcbfa4975d"
kind: "article"
source: "nvidia_ai_blog"
title: "NVIDIA and Local AI Community Fuel Open Source Models and Intelligent Agents"
author: ""
date: "Tue, 11 Aug 2026 13:00:25 +0000"
tier: 3
method: "source-native"
extracted_at: "2026-08-26T19:15:23.612201+00:00"
chars: 10000
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:15:23.176Z"
relevance: 25
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "ceac0a6f4d76c597"
relevance_by_goal: {"8429cfd39d4f":0,"d21cb50b17ba":25}
chunks:
  - id: "articles/nvidia-ai-blog/dcbfa4975d.md#c0"
    char_span: [0, 180]
    sentence_count: 1
    key_terms: [local-ai-open-source-models-agents-nemotron, nvidia, source, intelligent, community, agents, models, blogs]
    concepts: [nvidia, source]
    token_count: 42
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/local-ai-open-source-models-agents-nemotron/","kind":"article","date":"2026-08-11"}]
  - id: "articles/nvidia-ai-blog/dcbfa4975d.md#c1"
    char_span: [182, 2642]
    sentence_count: 20
    key_terms: [local, nvidia, perplexity, computer, models, agent, portable, rtx]
    concepts: [nvidia, local, perplexity, computer, models]
    related_chunks: ["articles/nvidia-ai-blog/dcbfa4975d.md#c2", "articles/nvidia-ai-blog/dcbfa4975d.md#c5"]
    token_count: 512
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/local-ai-open-source-models-agents-nemotron/","kind":"article","date":"2026-08-11"}]
  - id: "articles/nvidia-ai-blog/dcbfa4975d.md#c2"
    char_span: [2409, 4656]
    sentence_count: 17
    key_terms: [nvidia, local, rtx, qwen3, developers, coding, support, billion-parameter]
    concepts: [nvidia, local, developers, qwen3, billion-parameter]
    related_chunks: ["articles/nvidia-ai-blog/dcbfa4975d.md#c1", "articles/nvidia-ai-blog/dcbfa4975d.md#c3", "articles/nvidia-ai-blog/dcbfa4975d.md#c5"]
    token_count: 512
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/local-ai-open-source-models-agents-nemotron/","kind":"article","date":"2026-08-11"}]
  - id: "articles/nvidia-ai-blog/dcbfa4975d.md#c3"
    char_span: [4381, 6727]
    sentence_count: 20
    key_terms: [billion-parameter, nvidia, model, desktop, open, locally, dgx, video]
    concepts: [billion-parameter, nvidia, model, desktop, locally]
    related_chunks: ["articles/nvidia-ai-blog/dcbfa4975d.md#c2"]
    token_count: 512
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/local-ai-open-source-models-agents-nemotron/","kind":"article","date":"2026-08-11"}]
  - id: "articles/nvidia-ai-blog/dcbfa4975d.md#c4"
    char_span: [6545, 8740]
    sentence_count: 15
    key_terms: [nvidia, video, rtx, generation, ltx-2, dgx, creators, comfyui]
    concepts: [nvidia, video, generation, ltx-2, creators]
    token_count: 512
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/local-ai-open-source-models-agents-nemotron/","kind":"article","date":"2026-08-11"}]
  - id: "articles/nvidia-ai-blog/dcbfa4975d.md#c5"
    char_span: [8470, 10183]
    sentence_count: 8
    key_terms: [glimmer, agents, local, muse, nvidia, tasks, data, use]
    concepts: [glimmer, agents, local, nvidia, tasks]
    related_chunks: ["articles/nvidia-ai-blog/dcbfa4975d.md#c1", "articles/nvidia-ai-blog/dcbfa4975d.md#c2"]
    token_count: 344
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/local-ai-open-source-models-agents-nemotron/","kind":"article","date":"2026-08-11"}]
---
# NVIDIA and Local AI Community Fuel Open Source Models and Intelligent Agents

Source: [nvidia_ai_blog](https://blogs.nvidia.com/blog/local-ai-open-source-models-agents-nemotron/)

The open source ecosystem is making it easier for AI enthusiasts and developers to build, customize and run increasingly capable agents locally.
Throughout August, NVIDIA is celebrating the partners and open source communities moving local AI forward, along with the models, applications and tools emerging across the ecosystem. That includes NVIDIA’s latest open models, software and developer tools, plus the accelerated computing, libraries and educational resources that help users get started.
It’s shaping up to be a big month for agents. Follow along for the latest developments in this special-edition NVIDIA Local AI blog series, with new updates added over the coming weeks.
Follow NVIDIA RTX Spark on X, Instagram, TikTok and Facebook — and stay informed by subscribing to the NVIDIA Local AI newsletter. Follow NVIDIA Workstation on LinkedIn and X.
Tuesday, Aug. 25, 6:00 a.m. PT 🔗
Perplexity Launches Portable Computer Agent Optimized for NVIDIA DGX Spark
Perplexity’s new local agent app — Portable Computer — lets users run a powerful personal AI agent on NVIDIA DGX Spark, enabling local, private workflows that don’t count towards token limits.
Portable Computer is ideal for productivity workers, as a polished, simple-to-use agent with connections to many top apps, including Google Drive, Gmail, Slack and GitHub. The option to switch between local and cloud models allows users to use cloud models for complex work, and local models for everyday tasks.
The agent’s local AI capabilities have been optimized for DGX Spark, which provides fast large language model inference and 24×7 always-on operation, perfect for long-running autonomous agents. Support for GeForce RTX and RTX PRO GPUs is coming soon.
When running locally, Perplexity offers one-click local inference setup and an optimized experience for local NVIDIA hardware — with a specially post-trained Qwen 3.8 27B model. The company is also working on a fine-tuned Nemotron 3.5 Lightning variant for ultra-fast responses, which will be coming soon. Perplexity is also working on support for Windows, as well as DGX Station.
Check out the Perplexity blog to learn more about how to get started with Portable Computer. Download Perplexity Computer directly from the Perplexity App.
Tuesday, Aug. 14, 10:00 a.m. PT 🔗
NVIDIA RTX GPUs Bring Frontier Quality Qwen3.8-27B Coding Agents to Local AI
NVIDIA’s RTX GPUs give developers a high-performance solution to frontier-quality local coding agents with the Qwen3.8-27B.
As the local companion to Qwen3.8-Max, the 27-billion-parameter open model is sized for a single GPU and built for responsive coding workflows with local files, tools and project context. Developers can keep sensitive code, proprietary data and project context on their own systems while using capable AI assistance throughout the development process.
Day-zero support is available now on NVIDIA RTX GPUs, including NVIDIA RTX PRO GPUs and the NVIDIA GeForce RTX 5090. Optimized with multi-token prediction, Qwen3.8-27B reaches 131 tokens per second on a single GeForce RTX 5090 with MTP, giving developers fast local inference for agentic coding, tool use and longer development tasks.
Developers can get started immediately with llama.cpp, Ollama , Unsloth and LM Studio Bionic, all of which support Qwen3.8-27B on NVIDIA RTX GPUs. Together, NVIDIA RTX performance, the CUDA software ecosystem and familiar open-source tools give developers broad support for new models and a strong foundation for responsive local agent coding workflows.
The model is also supported on DGX Spark and DGX Station — with additional optimizations, including NVFP4 support for all NVIDIA local AI devices, coming soon. Qwen3.8-27B brings frontier-quality local coding agents to NVIDIA’s always-on personal AI systems.
Beyond PCs and personal AI systems, NVIDIA Jetson brings day-zero support for Qwen3.8-27B to the edge. We’ve found the model to be incredibly capable, with strong reasoning and agentic capabilities, while speculative decoding through MTP enables fast, responsive local inference at the edge.
Tuesday, Aug. 11, 10:00 a.m. PT 🔗
#ICYMI: New Open Models and More Available Today, Accelerated by NVIDIA GPUs
NVIDIA recently released Cosmos 3 Edge, a 4-billion-parameter open world model for robotics, autonomous vehicles and vision AI. At a quarter the size of Cosmos 3 Nano, it runs on device on NVIDIA DGX Spark and NVIDIA Jetson.
MiniMax-H3 is a 33-billion-parameter open weights model that generates video and natively synchronized stereo audio from text, images, video, audio or a mix of all four. Creators can access it through ComfyUI and run it locally with checkpoints optimized for NVIDIA GPUs.
Poolside AI launched Laguna S 2.1, a 118-billion-parameter open weight agentic coding model that works through hours-long tasks. An NVFP4 checkpoint enables developers to run the model locally on a single NVIDIA DGX Spark with lower compute and memory requirements, without sacrificing accuracy.
DeepSeek recently refreshed DeepSeek-V4-Flash, a 284-billion-parameter MoE model with 13 billion active parameters and a 1 million-token context window. Developers can run it locally on an NVIDIA DGX Station using community-built GGUF versions available today.
Thinking Machines Lab’s Inkling-Small is a frontier-class, open weight multimodal model with native reasoning across text, images and audio, plus adjustable thinking effort. Trained on NVIDIA GB300 NVL72, the 276-billion-parameter model activates just 12 billion parameters per token and runs on a single DGX Station or two DGX Spark systems. An NVFP4 checkpoint optimized for NVIDIA Blackwell is available on Hugging Face.
Unsloth launched Unsloth Desktop on Monday. The product brings local model inference, image and video diffusion, fine-tuning, agent integrations, web research and code execution into one fully open source desktop app. It’s the first desktop app that both trains and runs AI models locally.
Unsloth Desktop brings local AI training and inference into one fully open source desktop app. It’s the first desktop app to train and run AI models locally.
Alibaba recently released Wan-Animate-2, a 14-billion-parameter open weight model that transfers motion and facial expressions from a driving video onto a static character image — human, cartoon, robot or animal. With day-zero support in ComfyUI, it generates up to 26x faster on NVIDIA RTX PRO 6000 Blackwell and 22x faster on an NVIDIA RTX 5090 compared to Apple M3 Ultra.
Tuesday, Aug. 11, 9:00 a.m. PT 🔗
LTX Introduces LTX-2.5
LTX-2.5 is the latest state-of-the-art, open-world video generation model from LTX’s leading research team, providing the foundation for use cases across media and entertainment, robotics and real-time generation, and delivering higher-quality video, stronger prompt adherence and more consistent characters, scenes and voices across generations.
New multishot support enables creators to generate sequences spanning multiple cuts while maintaining continuity, while an upgraded diffusion video decoder improves visual fidelity and reduces artifacts. Creators can also refine existing footage with generative edits, making it easier to fix details and maintain a polished look without starting over.
The new prompt enhancer, featuring Gemma4 E2B and a custom Gemma4 12B text encoder, provides remarkable prompt adherence, giving far greater control over the output.
A new diffusion video decoder complements the variational autoencoder video decoder, improving video quality by giving a second decode path for higher-quality final renders.
LTX-2.5 is optimized for NVIDIA RTX GPUs, DGX Spark and DGX Station systems. On an NVIDIA RTX 6000 PRO GPU, LTX-2.5 delivers up to 20% faster performance and 40% memory savings. Creators can use these NVFP4, FastVideo and ComfyUI enhancements locally through a ready-to-use ComfyUI workflow for text, image and video-to-video generation.
Learn more about LTX-2.5 to learn how to get started with high-quality, local video generation on NVIDIA hardware.
Tuesday, Aug. 11, 9:00 a.m. PT 🔗
NVIDIA Accelerates Meta’s Muse Glimmer for Always-On Local Agentic AI
Today, Meta released Muse Glimmer, a 30-billion-parameter, dense, open weight model with a 120K+ context window. It’s purpose-built for coding and local agentic AI.
Optimized for NVIDIA GeForce RTX PCs, NVIDIA DGX Spark, DGX Station and NVIDIA Jetson, Muse Glimmer delivers over 200 tokens per second on RTX 5090, enabling always-on agents to process data locally and work through complex, multistep tasks on a single system.
Its dense architecture and hybrid attention help keep processing and memory demands manageable as agents take on longer tasks, use tools and maintain context across multiple steps.
Muse Glimmer is a 30-billion-parameter model optimized for always-on local agent workflows. It’s small enough to run on a PC with a single consumer GPU, enabling use cases that range from local agents and function calling to local coding and LLM-as-a-judge evaluation.
AI enthusiasts and developers can build agents using NemoClaw and fine-tune Muse Glimmer locally with NVIDIA NeMo Automodel, using private or specialized data while keeping it on the system. Muse Glimmer is designed for:
- Custom agents: Adapt the model for specific tasks, tools, data and areas of expertise.
- Private data processing: Read, summarize and act on local files, documents, emails and messages.
- Credential handling: Use application programming interface keys, authentication tokens and other sensitive information while keeping inference on the device.
- Multistep tasks: Complete many sequential tool calls and recover from errors or unexpected results.
- Long-running workflows: Break larger projects into steps, track progress and resume interrupted sessions with context intact.
Developers can run Muse Glimmer with popular inference frameworks including vLLM for text generation, image, reasoning and tool use, or llama.cpp for text and image workloa
