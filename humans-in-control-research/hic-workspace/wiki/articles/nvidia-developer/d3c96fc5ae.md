---
id: articles/nvidia-developer/d3c96fc5ae.md
url: "https://developer.nvidia.com/blog/deploy-an-open-model-from-checkpoint-to-inference-in-two-commands-with-nvidia-tensorrt-model-connect/"
url_hash: "d3c96fc5ae"
kind: "article"
source: "NVIDIA Developer"
title: "Deploy an Open Model from Checkpoint to Inference in Two Commands with NVIDIA TensorRT Model Connect"
author: ""
date: "2026-08-28T17:06:28Z"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:51:03.106893+00:00"
chars: 7061
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:51:00.499Z"
relevance: 10
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "f5237d1449c09df4"
relevance_by_goal: {"aa6916010743":10}
chunks:
  - id: "articles/nvidia-developer/d3c96fc5ae.md#c0"
    char_span: [0, 267]
    sentence_count: 1
    key_terms: [deploy-an-open-model-from-checkpoint-to-inference-in-two-commands-with-nvidia-tensorrt-model-connect, nvidia, developer, model, checkpoint, inference, commands, tensorrt]
    concepts: [nvidia, developer, model]
    token_count: 59
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/deploy-an-open-model-from-checkpoint-to-inference-in-two-commands-with-nvidia-tensorrt-model-connect/","kind":"article","date":"2026-08-28"}]
  - id: "articles/nvidia-developer/d3c96fc5ae.md#c1"
    char_span: [269, 2787]
    sentence_count: 16
    key_terms: [model, connect, tensorrt, bundle, native, post-processing, model-specific, preprocessing]
    concepts: [model, connect, tensorrt, bundle, native]
    related_chunks: ["articles/nvidia-developer/d3c96fc5ae.md#c2", "articles/nvidia-developer/d3c96fc5ae.md#c3"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/deploy-an-open-model-from-checkpoint-to-inference-in-two-commands-with-nvidia-tensorrt-model-connect/","kind":"article","date":"2026-08-28"}]
  - id: "articles/nvidia-developer/d3c96fc5ae.md#c2"
    char_span: [2463, 5379]
    sentence_count: 22
    key_terms: [model, connect, implementation, tensorrt, inference, application, open, implementations]
    concepts: [model, implementation, connect, tensorrt, inference]
    related_chunks: ["articles/nvidia-developer/d3c96fc5ae.md#c1", "articles/nvidia-developer/d3c96fc5ae.md#c3"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/deploy-an-open-model-from-checkpoint-to-inference-in-two-commands-with-nvidia-tensorrt-model-connect/","kind":"article","date":"2026-08-28"}]
  - id: "articles/nvidia-developer/d3c96fc5ae.md#c3"
    char_span: [4976, 7331]
    sentence_count: 19
    key_terms: [model, tensorrt-model-connect, tensorrt, connect, inference, implementation, build, complete]
    concepts: [model, tensorrt-model-connect, tensorrt, connect, implementation]
    related_chunks: ["articles/nvidia-developer/d3c96fc5ae.md#c1", "articles/nvidia-developer/d3c96fc5ae.md#c2"]
    token_count: 457
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/deploy-an-open-model-from-checkpoint-to-inference-in-two-commands-with-nvidia-tensorrt-model-connect/","kind":"article","date":"2026-08-28"}]
---
# Deploy an Open Model from Checkpoint to Inference in Two Commands with NVIDIA TensorRT Model Connect

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/deploy-an-open-model-from-checkpoint-to-inference-in-two-commands-with-nvidia-tensorrt-model-connect/)

Open AI models are evolving faster than ever, but bringing them into native applications can still require model-specific conversion, preprocessing, post-processing, and runtime code.
NVIDIA TensorRT Model Connect open collection of reference implementations helps to address this challenge. TensorRT Model Connect shows you how to run supported models with NVIDIA TensorRT in native C++ applications. You can use, inspect, modify, and extend the implementations. Model Connect is designed to support the open model ecosystem wherever TensorRT runs.
This post explains what NVIDIA TensorRT Model Connect is and how to deploy a model from Hugging Face model ID to native C++ inference in two commands. It also covers the two API levels TensorRT Model Connect provides, how to integrate custom GPU kernels, and how the project is built to keep pace with the open model ecosystem.
How to deploy a model from model ID to native C++ inference in two commands
Getting a model into production should not require deep compiler expertise. Model Connect splits deployment into two phases with a single artifact between them.
1. Build the bundle (Python CLI)
For a supported model, the first phase is building a deployment bundle from a Hugging Face model ID or local checkpoint:
trtmc build Qwen/Qwen3-0.6B -o qwen3-0.6B.bundle
The bundle contains the TensorRT engines and the model-specific assets needed at runtime.
2. Load and run (C++)
In the second phase, a native C++ application then loads the bundle and works with task-level inputs and outputs:
#include <trtmc/pipeline.h>
auto pipeline = trtmc::load("qwen3-0.6b.bundle");
auto result   = pipeline->generate("Explain why native inference matters.", {.max_new_tokens = 20});
std::cout << result.text << std::endl;
Model Connect handles checkpoint mapping, TensorRT engine construction, preprocessing, runtime orchestration, and post-processing. You start with a complete working implementation instead of rebuilding this integration for every model family.
You can use Python to prepare the model, but the deployed application runs natively without requiring PyTorch or a Python interpreter in its production runtime.
Two API levels, one starting point
Model Connect provides two levels of C++ APIs. With the semantic API, you can work with familiar inputs and outputs, such as prompts, images, and audio, while Model Connect handles model-specific preprocessing, execution, and post-processing.
If you need more control, the module-level API allows you to work directly with named tensors and individual TensorRT components to customize the inference pipeline. Both APIs use the same Model Connect implementations, so you can start with a simple task-level interface and customize the pipeline only when needed.
Extend TensorRT Model Connect with custom kernels
TVM FFI provides a language-agnostic interface for invoking GPU kernels without tightly coupling the calling system to the kernel’s implementation framework or runtime. Using TVM FFI through TensorRT Model Connect, you can replace a targeted portion of a model with a custom GPU kernel while TensorRT continues to execute the rest of the inference pipeline. This makes it easier to integrate specialized or newly developed kernels without rebuilding the application around a separate runtime. See the Bring Your Own Kernel tutorial for a worked example.
Reference implementations for the open model ecosystem
Model Connect is not a new inference framework or a replacement for TensorRT. It is a bridge between the end-to-end inference experience for open models and the ability of TensorRT to translate a computation graph into an accelerated engine on GPU.
Each model’s implementation serves three purposes:
- Running a supported open model in a native TensorRT-enabled application
- Learning from a complete, inspectable implementation of the model and its inference pipeline
- Extending the implementation for a related architecture, custom checkpoint, or application requirement
This provides the broader ecosystem with a clearer path to TensorRT deployment from a model ID. Application developers can begin with working code. Community contributors can reuse existing patterns to add support for new models instead of starting from zero.
The goal is straightforward: wherever TensorRT is available, you should have a consistent Model Connect path for supported open models.
Built AI-natively to keep pace with open models
The open model ecosystem changes quickly. New architectures and checkpoints appear continuously, so a reference library must evolve just as quickly.
Model Connect is built as an AI-native software project. Coding agents generate implementation code, tests, integrations, and documentation under human direction and review. This enables the project to develop and validate multiple model implementations in parallel while maintaining a consistent architecture and user experience.
Model Connect uses nightly releases to shorten the path from a new model, user report, or contribution to an available implementation. Automated validation remains the release gate. The faster cadence helps new model support, fixes, and UX improvements reach you sooner.
Delivering the complete TensorRT workflow
Model Connect is built on TensorRT, so performance remains central. For supported and validated workloads, Model Connect can deliver faster inference than torch.compile, and each implementation is continuously tested and optimized as the project evolves.
Performance should not come at the expense of usability. Model Connect brings the complete workflow together: find the model ID, build the model, load it from C++, and adapt it when needed. You get an accessible path to high-performance TensorRT inference while retaining the ability to inspect, customize, and optimize the underlying inference pipeline.
Get started with NVIDIA TensorRT Model Connect
Visit the NVIDIA/TensorRT-Model-Connect GitHub repo to find supported implementations and build a model bundle. Use an implementation as-is, adapt it for your application, or contribute support that helps the next developer bring another open model to TensorRT.
Want to use an AI-native quick start that doesn’t require a complicated setup? Open a terminal in any folder you can access, then paste the following prompt into a coding agent. You should have a complete deployment in minutes.
/goal Clone https://github.com/NVIDIA/TensorRT-Model-Connect.git into 
a new TensorRT-Model-Connect directory in the current workspace. Detect 
the current GPU compute capability, modify the repository development Docker 
image, build and start the container, install TensorRT-Model-Connect, compile 
the CLI, TensorRT backend, and all native model DSOs only for that SM, then 
build and run an end-to-end Qwen/Qwen3-0.6B smoke test. Do not commit or push 
changes. Report the result of the test, show exact command, input and output of 
the inference run.
For more about model coverage, architecture details, and a full developer guide, see the TensorRT Model Connect documentation.
