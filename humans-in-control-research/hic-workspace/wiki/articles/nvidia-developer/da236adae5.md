---
id: articles/nvidia-developer/da236adae5.md
url: "https://developer.nvidia.com/blog/build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills/"
url_hash: "da236adae5"
kind: "article"
source: "NVIDIA Developer"
title: "Build Applications on NVIDIA BlueField Faster with NVIDIA DOCA Agent Skills"
author: ""
date: "2026-10-01T18:13:29Z"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:49:43.193835+00:00"
chars: 10000
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:49:41.283Z"
relevance: 15
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "54c31299880dfbef"
relevance_by_goal: {"aa6916010743":15}
chunks:
  - id: "articles/nvidia-developer/da236adae5.md#c0"
    char_span: [0, 217]
    sentence_count: 1
    key_terms: [build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills, nvidia, developer, applications, bluefield, faster, skills, source]
    concepts: [nvidia, developer]
    token_count: 48
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills/","kind":"article","date":"2026-10-01"}]
  - id: "articles/nvidia-developer/da236adae5.md#c1"
    char_span: [219, 2907]
    sentence_count: 23
    key_terms: [doca, agent, skills, development, agents, infrastructure, general-purpose, constraints]
    concepts: [agent, skills, development, agents, infrastructure]
    related_chunks: ["articles/nvidia-developer/da236adae5.md#c2", "articles/nvidia-developer/da236adae5.md#c3", "articles/nvidia-developer/da236adae5.md#c4", "articles/nvidia-developer/da236adae5.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills/","kind":"article","date":"2026-10-01"}]
  - id: "articles/nvidia-developer/da236adae5.md#c2"
    char_span: [2567, 5122]
    sentence_count: 17
    key_terms: [skills, prompts, agent, doca, hardware, agents, code, real]
    concepts: [skills, prompts, agent, hardware, agents]
    related_chunks: ["articles/nvidia-developer/da236adae5.md#c1", "articles/nvidia-developer/da236adae5.md#c3", "articles/nvidia-developer/da236adae5.md#c4", "articles/nvidia-developer/da236adae5.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills/","kind":"article","date":"2026-10-01"}]
  - id: "articles/nvidia-developer/da236adae5.md#c3"
    char_span: [4783, 7232]
    sentence_count: 19
    key_terms: [agent, skills, doca, code, capability, prompt, developer, real]
    concepts: [agent, skills, capability, prompt, developer]
    related_chunks: ["articles/nvidia-developer/da236adae5.md#c1", "articles/nvidia-developer/da236adae5.md#c2", "articles/nvidia-developer/da236adae5.md#c4", "articles/nvidia-developer/da236adae5.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills/","kind":"article","date":"2026-10-01"}]
  - id: "articles/nvidia-developer/da236adae5.md#c4"
    char_span: [6936, 9432]
    sentence_count: 20
    key_terms: [agent, skills, firmware-level, doca, hardware, changes, code, mlxconfig-class]
    concepts: [agent, skills, firmware-level, hardware, changes]
    related_chunks: ["articles/nvidia-developer/da236adae5.md#c1", "articles/nvidia-developer/da236adae5.md#c2", "articles/nvidia-developer/da236adae5.md#c3", "articles/nvidia-developer/da236adae5.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills/","kind":"article","date":"2026-10-01"}]
  - id: "articles/nvidia-developer/da236adae5.md#c5"
    char_span: [9125, 10219]
    sentence_count: 11
    key_terms: [agent, with-skills, doca, agents, skills, versus, build, code]
    concepts: [agent, with-skills, agents, skills, versus]
    related_chunks: ["articles/nvidia-developer/da236adae5.md#c1", "articles/nvidia-developer/da236adae5.md#c2", "articles/nvidia-developer/da236adae5.md#c3", "articles/nvidia-developer/da236adae5.md#c4"]
    token_count: 234
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills/","kind":"article","date":"2026-10-01"}]
---
# Build Applications on NVIDIA BlueField Faster with NVIDIA DOCA Agent Skills

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/build-applications-on-nvidia-bluefield-faster-with-nvidia-doca-agent-skills/)

AI agents are becoming a standard part of development workflows, but general-purpose agents weren’t built with specialized infrastructure software such as NVIDIA DOCA in mind. Without domain-specific knowledge, agents may fall back on guesswork. This is an issue in infrastructure development because every correction cycle takes time away from deployment.
DOCA is the unified software platform that unlocks the full potential of NVIDIA BlueField data processing units (DPUs) for agentic AI infrastructure. It spans accelerated networking, AI-native storage, in-silicon security, telemetry, and lifecycle management. It’s the development platform for teams building on NVIDIA BlueField.
DOCA AI agent skills are now available on GitHub. These skills provide a structured, verified foundation to address where general-purpose AI agents fall short on DOCA development. They provide agents with verified API signatures, hardware capability requirements, and build constraints.
This post explains what DOCA AI agent skills are and how they perform across four impactful DOCA development scenarios. It includes a side-by-side demo and how to get started using DOCA agent skills to build faster and ship more stable code on BlueField infrastructure.
What are DOCA AI agent skills?
DOCA AI agent skills are a standardized way to give AI agents new capabilities and expertise. The lightweight, open format is built around a SKILL.md file containing real API signatures, hardware capability requirements, and build constraints. Together, the skills provide agents with a reasoning and operational framework for DOCA.
Skills span the full DOCA library, including Flow, GPUNetIO, PCC, and more. They don’t replace the agent, but give it the domain knowledge to reason like an experienced DOCA developer.
Each skill is scoped to a specific DOCA component or workflow. When an agent loads a skill for DOCA Flow, for example, it gets the real function signatures, the correct pkg-config module names, the build-container constraints, and the common failure modes and their mitigations. The skills are not just a summary of documentation, but a machine-readable specification the agent can reason against directly.
Why do AI agents need a foundation for DOCA development?
When you ask a general-purpose AI agent to set up a DOCA Comch (Comm Channel), configure an RDMA context, or debug a link failure in a DOCA Flow program, the agent is working from pattern-matching across general training data—not from verified DOCA API contracts, hardware capability manifests, or build system specifications. The DOCA library surface is large, rapidly evolving, and hardware-specific in ways that general training data does not capture. There is no machine-readable contract for agents to reason from, no guaranteed stable interface between what the agent knows and what the hardware and software actually support.
To quantify the gap, the NVIDIA team ran 65 real DOCA developer prompts comparing agent performance with and without the skills. These prompts ranged from a one-line question to detailed multi-requirement prompts, graded against a required-answer checklist (a specific set of pass/fail criteria for each task). Without the skills, agents consistently made the same mistakes, including:
- Misuse of APIs and flags: 59/65 prompts
- Hardware capability not verified: 46/65 prompts
- Wrong tool routing: 39/65 prompts
- Skipped smoke tests: 34/65 prompts
- Guessed versions: 30/65 prompts
These are consistent failures. Without skills, agents satisfied only 19% of graded checklist items on real DOCA tasks. With skills, they satisfied 100% across all 65 prompts. Without the skills, every agent mistake becomes a developer debugging session, and a longer path to working code.
What are the benefits of DOCA agent skills for developers?
DOCA agent skills allow you to equip agents with domain expertise. This means you can build faster, ship more stable code, and deploy with fewer unknowns.
- Build faster: Skills give the agent verified API calls from the start, so you can focus on writing code, not corrections.
- Ship more stable code: With skills, the agent checks what the device actually supports before writing a single line, not after running it on real hardware.
- Deploy with fewer unknowns: The agent applies preflight checks, rollback plans, and cold power-cycle awareness before touching hardware, not after something goes wrong.
The combined effect is fewer correction cycles between task and working code. For teams using AI agents on DOCA applications at scale, that reduction compounds across every developer, task, and deployment.
Use agent skills to accelerate DOCA development
Each of four capabilities are detailed in the following sections. Each capability is illustrated with a real prompt from our 65-prompt evaluation and the benefits of using the skill.
Build faster with real APIs
What DOCA AI agent skills address: Misuse of APIs: agents inventing functions, flags, and image tags that don’t exist.
This was the most frequent failure mode in our evaluation, affecting 59 of 65 prompts. Without skills, agents generate code referencing DOCA functions that don’t exist in the library, flags with incorrect names, and image tags that fail at runtime. As the developer, you end up debugging an error you didn’t introduce (the agent’s invention).
Prompt: “I have a host with a BlueField-3 DPU and DOCA installed. I want to set up a DOCA Comch (Comm channel) between a host-side process and a DPU-side agent so they can exchange small control messages (under 4 KiB each, a few times per second).”
The AI agent with skills uses only real DOCA Comch API calls: correct argument order, verified flags and lifecycle sequence, nothing invented.
When the agent’s first response uses the correct API surface, you can move directly to integration rather than starting with a debugging session. Across 63 prompts that tested API accuracy, the with-skills result was better every time.
Verify hardware before writing any code
What DOCA AI agent skills address: Agents writing code for features the device doesn’t support.
Hardware capability verification was missed in 46 of 65 prompts without skills. The failure pattern is consistent: the agent assumes a capability is present, generates code against it, and the developer discovers the mismatch only when running on real hardware. At that point, the fix requires understanding which capability check was skipped, reworking the code path, and retesting.
Prompt: “I have two hosts wired together with a high-speed InfiniBand fabric. Each host has one NVIDIA GPU and one ConnectX NIC, and DOCA is installed on both. I want to measure the latency of an RDMA WRITE work request when the WR (work request) is posted from a CUDA kernel on the GPU (not from a host CPU thread) so I can decide whether to commit my application to the GPUNetIO Verbs interface.”
The AI agent with skills checks what the device actually supports before writing any code. It verifies GPU-NIC PCIe topology, confirms GPUNetIO support before committing, and names alternative API surfaces and when each applies.
The AI agent with skills validates the preconditions for the answer against the actual hardware in use, before any code is written.
Ship code that compiles and links
What DOCA AI agent skills address: Agents producing code that won’t compile or link in the DOCA container.
Build correctness was tested on 10 of 65 prompts. This is a smaller subset, but when it applies, development cannot proceed.
Prompt: “I’m trying to build a DOCA Flow program from one of the shipped samples. The compile step works but the link fails: undefined reference to doca_flow_init. How do I debug this?”
The AI agent with skills identifies the undefined reference as a link-time failure, uses the build tool (pkg-config) to look up the correct linker flags for doca-flow.
An agent that generates an incorrect linker flag sends the developer down a path that won’t resolve. The with-skills agent immediately names the correct diagnostic approach and the right tool to retrieve the correct flags.
Execute changes that affect hardware safely
What DOCA AI agent skills address: Agents applying firmware-level changes on live hardware without preflight checks, rollback plans, or knowledge of cold power-cycle requirements.
The more complex the task, the more the skills matter. In our 65-prompt evaluation, the largest performance gap appeared in the highest-complexity scenario: firmware-level changes on live hardware.
Prompt: “I have a production BlueField-3 DPU running a DOCA workload. I loaded the DOCA AI agent skill for my service, and the next step is to write an mlxconfig-class firmware-level parameter.”
The AI agent with skills applies the full discipline required for firmware-level changes to meet every requirement. This includes preflight inventory, assuming an out-of-band (OOB) path as a precondition, an explicit maintenance window, a rollback plan, and notes that mlxconfig-class writes take effect only on a cold power cycle, not warm reboot.
The with-skills agent met every requirement. The without-skills agent met none. On a live production DPU, none of these misses are recoverable debugging steps. The skills carry the knowledge of what can go wrong and why, turning a risky firmware change into a disciplined, safe procedure.
Across all 65 prompts, AI agents with DOCA skills reached the correct answer every time. This means fewer correction cycles and faster time to working code.
The demo in Video 1 puts the efficiency gain in concrete terms. Two agents were given the same task: build a program using NVIDIA DOCA to send real RDMA traffic on BlueField-3. Both succeeded, but the with-skills agent used 73% less handwritten code (189 lines versus 695) and roughly half the hardware commands (20 versus 37, a 46% reduction). That’s the difference between an agent that rediscovers DOCA APIs and build requirements by trial and error, and one that already has
