---
id: articles/nvidia-developer/fc9f535cee.md
url: "https://developer.nvidia.com/blog/run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark/"
url_hash: "fc9f535cee"
kind: "article"
source: "NVIDIA Developer"
title: "Run Local AI Agents with Faster Models and Multi-Node Clustering on NVIDIA DGX Spark"
author: ""
date: "2026-06-01T22:00:00Z"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T18:16:27.428874+00:00"
chars: 9522
engagement: "deliver-a-comprehensive-2026-risk-and-market-analysis-for-th"
collected_at: "2026-07-02T18:16:25+00:00"
content_hash: "0c51100d2bb217f7"
chunks:
  - id: "articles/nvidia-developer/fc9f535cee.md#c0"
    char_span: [0, 235]
    sentence_count: 1
    key_terms: [run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark, nvidia, developer, clustering, multi-node, agents, faster, models]
    concepts: [nvidia, developer]
    token_count: 58
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/fc9f535cee.md#c1"
    char_span: [237, 2880]
    sentence_count: 18
    key_terms: [agents, agent, running, autonomous, developers, nvidia, nemoclaw, streamlined]
    concepts: [agents, agent, autonomous, developers, running]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/fc9f535cee.md#c2"
    char_span: [2535, 4758]
    sentence_count: 11
    key_terms: [nemoclaw, install, agent, spark, local, dgx, confirm, running]
    concepts: [nemoclaw, install, agent, spark, local]
    related_chunks: ["articles/nvidia-developer/fc9f535cee.md#c3", "articles/nvidia-developer/fc9f535cee.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/fc9f535cee.md#c3"
    char_span: [4410, 6868]
    sentence_count: 14
    key_terms: [agent, permissions, local, sandbox, model, different, nvidia, instructions]
    concepts: [agent, permissions, local, sandbox, different]
    related_chunks: ["articles/nvidia-developer/fc9f535cee.md#c2"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/fc9f535cee.md#c4"
    char_span: [6603, 8931]
    sentence_count: 11
    key_terms: [cluster, assistant, sync, nvidia, spark, using, dgx, minimum]
    concepts: [cluster, assistant, nvidia, spark, using]
    related_chunks: ["articles/nvidia-developer/fc9f535cee.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/fc9f535cee.md#c5"
    char_span: [8678, 9760]
    sentence_count: 5
    key_terms: [nemoclaw, spark, dgx, nvidia, building, cluster, documentation, start]
    concepts: [nemoclaw, spark, nvidia, building, documentation]
    related_chunks: ["articles/nvidia-developer/fc9f535cee.md#c2", "articles/nvidia-developer/fc9f535cee.md#c4"]
    token_count: 252
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark/","kind":"article","date":"2026-06-01"}]
---
# Run Local AI Agents with Faster Models and Multi-Node Clustering on NVIDIA DGX Spark

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/run-local-ai-agents-with-faster-models-and-multi-node-clustering-on-nvidia-dgx-spark/)

The rise of autonomous, long-running AI agents has introduced a new class of compute demand, namely tasks that maintain large context windows, spawn concurrent subagents, and iterate continuously without cloud dependency. Security and privacy concerns are also accelerating the shift toward local agents.
Developers, by running autonomous agents on hardware they own with NVIDIA NemoClaw orchestrating execution, can keep sensitive context on-device, retain direct control over what an agent can access and eliminate per-token costs.
NVIDIA DGX Spark is designed to build and run autonomous agents locally. At Computex 2026, NVIDIA is making it significantly easier to get there, introducing a streamlined path from unboxing to running AI agents in minutes (excluding initial model download, which depends on network speed). There are also model performance improvements with Qwen3.6 and a guided multi-node cluster setup for teams that need to scale beyond a single device.
This post will cover what these updates mean for developers building agentic AI systems, including how to install NVIDIA NemoClaw, what it sets up, and how to build and run your first agent with OpenClaw on DGX Spark.
Prerequisites
- Active internet connection for the initial model download
- Familiarity with a terminal for optional configuration steps
From unboxing to running a local agent
Getting a local AI agent running has historically involved sourcing the right model, configuring an inference backend, installing a runtime, and wiring them together. That process could take the better part of a day even for experienced developers. The new streamlined NemoClaw installation path changes that.
For new systems, the experience begins with unboxing and first-time setup of DGX Spark. The latest version of the DGX Spark system software, the June 2026 release, delivers the most streamlined out-of-box experience (OOBE) yet so users can reach local agents faster. With this release, over-the-air updates are no longer installed by default during initial setup, reducing setup time and getting users to the Ubuntu desktop sooner.
NemoClaw is an open source blueprint that packages three things into a single install: open models, an agent harness, like Hermes Agent or OpenClaw, and the NVIDIA OpenShell runtime. OpenShell is a secure, sandboxed execution environment designed for running autonomous agents more safely. It adds access controls, privacy protections, and operational guardrails to the agent loop. Combined with on-device inference, this gives developers a stronger default security and privacy posture for agentic workloads.
Step 1: Install NemoClaw
Figure 1, below, shows the full path from OOBE completion to a running NemoClaw agent on DGX Spark.
After completing OOBE, DGX Spark reboots and opens build.nvidia.com/spark with the NemoClaw playbook prominently displayed for a guided walkthrough. Run this single command to install Node.js (if needed), install OpenShell, clone the latest stable NemoClaw release, build the CLI, and run the onboard wizard to create a sandbox.
curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash
The installation wizard walks you through setup:
- Accept NemoClaw and OpenClaw licenses — Confirm by entering yes
- Run express install — Confirm by entering Y
- Local Ollama is set up along with Qwen3.6-35B automatically downloaded
Learn more about how to install NemoClaw on your DGX Spark/GB10 system: Start with NemoClaw on DGX Spark →
Step 2: Access your agent
Once the install completes, you are ready to customize your agents.
First, interact using WebUI:
nemoclaw <sandbox name> gateway-token --quiet
Then open the tokenized URL in a browser: http://127.0.0.1:18789/#token=<WEBUI_TOKEN>. Use 127.0.0.1 exactly — the gateway origin check requires it (not localhost).
Send a quick test message — "hello” or “what can you do?” — to confirm the full stack is up. The local Ollama model is already selected; NemoClaw configures this automatically during onboarding.
Step 3: Build your first agent
With your sandbox running, the NemoClaw Applications playbook offers four ready-to-run agents to get started — each with policy setup, a starter prompt, and personalization guidance:
- Daily Personal News Digest — a scheduled morning briefing that sweeps your topics and posts a structured digest to Telegram
- Software Development Agent — reads a local project directory, builds a plan, writes and reviews its own code, all with no outbound network beyond local inference
- Deck and Document Reviewer — red-teams a file before it goes out, returning a severity-ranked punch list of inconsistencies, unsourced claims, and accessibility issues
- Calendar Negotiator — a scheduling chief-of-staff that turns “when can we meet?” threads into a confirmed calendar event
Step 4: Further customizations
With the sandbox running, the main levers for shaping agent behavior are:
- System prompt — Edit the agent’s instructions from the dashboard to shape how it responds and what it should ask before acting. More specific prompts produce more reliable agents.
- Tool permissions — OpenShell network policies control which external destinations the agent can call. Narrower permissions reduce unexpected behavior.
- Integrations — If you enabled a messaging channel during onboarding, the agent is already reachable there. Send it a message from your phone and it responds using the same local model.
Developers can further customize by swapping in different models, adjusting OpenShell permissions, and connecting the agent to local workflows. To spin up a new sandbox with a different model, run nemoclaw onboard --fresh --gpu and select a different model during the wizard. Note that —fresh destroys and recreates the existing sandbox — use --name <new-name> to create an additional sandbox without affecting existing ones. The full NemoClaw install instructions and model catalog are available on NVIDIA NGC.
Tip: Start narrow. Give the agent a single, well-scoped task on your first run, such as “summarize a file” or “answer a question” from a local document. Verify that the response and tool calls look right before expanding its permissions.
A few commands worth keeping handy as you iterate:
DGX Spark agents using Qwen3.6-35B
Developers can experience up to 2.6x faster inference with top agentic models like Qwen 3.6 35B on vLLM with NVIDIA’s NVFP4 quantized checkpoint using MTP optimizations. Additional improvements to vLLM CUDA Graph support for MTP with FlashInfer, BF16 autotuning across FlashInfer MoE kernels, TinyGEMM and cuBLAS BF16 paths.
Scaling up: The cluster assistant in NVIDIA Sync
For developers who need more memory or throughput than a single DGX Spark can provide, the cluster assistant in NVIDIA Sync automates the process of connecting two to four DGX Spark units into a high-bandwidth cluster.
Clustering matters at the model level: two DGX Spark nodes provide 256 GB of unified memory (sufficient for ~400B-parameter models), and four nodes provide 512 GB. That’s enough to run large MoE models, multi-agent pipelines with multiple concurrent inference instances, or fine-tuning jobs that benefit from distributed memory.
Setting up the cluster requires configuring the ConnectX-7 networking. Each DGX Spark has ConnectX-7 NICs that support 200 Gbps RoCE, but using them correctly requires configuring netplan, setting up node-to-node SSH trust, verifying bandwidth across each link, and knowing the right IP assignment scheme for the target topology. The cluster assistant simplifies the network configuration through a guided workflow inside Sync.
What Sync configures
Starting from devices already enrolled in Sync, the cluster assistant walks through: system readiness checks (OTA version, sudo access),CX-7 topology detection using a probe that runs on each node in parallel and combines LLDP/BPDU evidence with interface and IP checks, IP planning and deconfliction and netplan application, bandwidth and latency validation via ib_write_bw / ib_write_lat, and inter-node SSH setup using keys routed over the CX-7 fabric.
Supported physical configurations are two-node direct connection (single QSFP cable, no switch), three-node ring (three QSFP cables, both CX-7 ports active per node), and two-to-four nodes via a QSFP switch with the minimum requirements shown here:
- Minimum 4 ports QSFP56-DD
- Breakout to 25/50/100/200/400 G
- Recommended max port speed of 200G-400G per port
- One 1/10GbE management Ethernet port
- Supports RoCE v2
- Switching capacity/throughput: Minimum 0.8 -1.6 Tbps
For documentation on the NVIDIA Sync cluster assistant and supported topologies, see the NVIDIA Sync documentation.
Explore more on DGX Spark
All three capabilities are available now:
- NemoClaw streamlined install: Start with NemoClaw on DGX Spark →
- Example NemoClaw Applications: Setup Example NemoClaw Agents →
- Bring DGX Spark to NVIDIA Brev: Register your DGX Spark on NVIDIA Brev →
Start building
The DGX Spark updates at Computex 2026 reduce the two biggest blockers to building production-quality local agents: time to first agent and access to the compute needed to run large models.
The streamlined NemoClaw install gets developers from unboxing to a running OpenClaw agent with Qwen3.6-35B as the default model and a built-in secure execution environment. For teams that need more, the cluster assistant in Sync removes the expertise barrier to spinning up a multi-node cluster with full ConnectX-7 performance.
Start building on NVIDIA DGX Spark →
