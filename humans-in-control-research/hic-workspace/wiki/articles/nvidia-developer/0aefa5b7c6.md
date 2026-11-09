---
id: articles/nvidia-developer/0aefa5b7c6.md
url: "https://developer.nvidia.com/blog/advancing-ai-infrastructure-for-agentic-ai-with-nvidia-doca-in-silicon-security/"
url_hash: "0aefa5b7c6"
kind: "article"
source: "NVIDIA Developer"
title: "Advancing AI Infrastructure for Agentic AI with NVIDIA DOCA In-Silicon Security"
author: ""
date: "2026-06-01T04:21:42Z"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T18:16:33.561063+00:00"
chars: 10000
engagement: "deliver-a-comprehensive-2026-risk-and-market-analysis-for-th"
collected_at: "2026-07-02T18:16:31+00:00"
content_hash: "d41b34dc76d9d934"
chunks:
  - id: "articles/nvidia-developer/0aefa5b7c6.md#c0"
    char_span: [0, 225]
    sentence_count: 1
    key_terms: [advancing-ai-infrastructure-for-agentic-ai-with-nvidia-doca-in-silicon-security, nvidia, developer, infrastructure, in-silicon, advancing, security, agentic]
    concepts: [nvidia, developer]
    token_count: 56
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/advancing-ai-infrastructure-for-agentic-ai-with-nvidia-doca-in-silicon-security/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/0aefa5b7c6.md#c1"
    char_span: [227, 3238]
    sentence_count: 18
    key_terms: [infrastructure, security, bluefield, nvidia, traditional, compute, system, factories]
    concepts: [infrastructure, security, bluefield, nvidia, traditional]
    related_chunks: ["articles/nvidia-developer/0aefa5b7c6.md#c2"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/advancing-ai-infrastructure-for-agentic-ai-with-nvidia-doca-in-silicon-security/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/0aefa5b7c6.md#c2"
    char_span: [2892, 5709]
    sentence_count: 19
    key_terms: [security, doca, factory, across, nvidia, argus, bluefield-4, runtime]
    concepts: [security, factory, across, nvidia, bluefield-4]
    related_chunks: ["articles/nvidia-developer/0aefa5b7c6.md#c1"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/advancing-ai-infrastructure-for-agentic-ai-with-nvidia-doca-in-silicon-security/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/0aefa5b7c6.md#c3"
    char_span: [5301, 8558]
    sentence_count: 17
    key_terms: [memory, behavior, monitoring, runtime, system, activity, continuously, argus]
    concepts: [memory, behavior, monitoring, runtime, continuously]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/advancing-ai-infrastructure-for-agentic-ai-with-nvidia-doca-in-silicon-security/","kind":"article","date":"2026-06-01"}]
  - id: "articles/nvidia-developer/0aefa5b7c6.md#c4"
    char_span: [8180, 10228]
    sentence_count: 11
    key_terms: [execution, argus, doca, management, visibility, workloads, activity, network]
    concepts: [execution, argus, management, visibility, workloads]
    token_count: 341
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/advancing-ai-infrastructure-for-agentic-ai-with-nvidia-doca-in-silicon-security/","kind":"article","date":"2026-06-01"}]
---
# Advancing AI Infrastructure for Agentic AI with NVIDIA DOCA In-Silicon Security

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/advancing-ai-infrastructure-for-agentic-ai-with-nvidia-doca-in-silicon-security/)

The AI era is driving a new class of infrastructure: AI factories that transform data into intelligence for autonomous AI agents operating at unprecedented scale. Powered by accelerated computing, AI factories enable enterprises to train, fine-tune, and deploy AI with greater speed and efficiency.
This new class of infrastructure also introduces a fundamentally new attack surface spanning infrastructure, software supply chains, models, data, and autonomous agents with increasing authority to act. As agentic AI adoption accelerates, adversaries are increasingly targeting both AI infrastructure and the applications it powers, creating new risks to the confidentiality, integrity, and availability of mission-critical systems.
Traditional security architectures were not designed for the scale, complexity, and performance demands of AI factories. Securing this new infrastructure requires security that is distributed, full-stack, and accelerated.
This post explains how NVIDIA BlueField data processing units (DPUs) and NVIDIA DOCA secure AI factories through runtime detection, data access control, and accelerated network enforcement to protect AI infrastructure, workloads, agents, and data at AI scale.
How does in-silicon security change the traditional security model?
Purpose-built for AI infrastructure, NVIDIA BlueField DPUs combine high-performance networking, programmable compute, hardware acceleration, and advanced security capabilities into a single platform embedded into every AI factory compute node. Unlike traditional security approaches that rely on host system software, BlueField establishes a hardware-enforced, in-silicon, and workload-independent security layer.
Operating within its own trusted execution domain, BlueField isolates infrastructure and security services from the host system. Monitoring, policy enforcement, and telemetry operate even if the host or workloads become compromised. Because security functions remain isolated from the system they protect, attackers cannot tamper with or bypass BlueField-enforced infrastructure security policies.
This architecture fundamentally changes the traditional security model. Conventional endpoint protection shares the same trust boundaries and system resources as the environments it secures, making security software vulnerable to tampering, evasion, or disablement when a host is compromised. By offloading security processing to the BlueField silicon, it delivers resilient, full-stack protection without consuming host computing resources or competing with AI workloads—preserving peak infrastructure efficiency and AI performance.
How NVIDIA BlueField and DOCA protect the entire AI factory
With the NVIDIA Vera Rubin platform, security becomes distributed across the entire AI factory and built directly into the infrastructure layer. NVIDIA BlueField-4 processors are embedded in every compute and storage system—including NVIDIA Vera Rubin NVL72 compute trays, Vera CPU compute trays, LPX systems, and Vera BlueField-4 STX storage systems. This establishes a consistent, hardware-enforced security foundation across the platform.
Built on BlueField-4 silicon, a new class of NVIDIA DOCA security capabilities extends protection across the full AI lifecycle and the Vera Rubin platform. Whether safeguarding AI models, context memory, datasets, or runtime interactions, BlueField secures any data type, any workload, and any agent. This includes protecting autonomous agents themselves—and defending the AI factory from increasingly privileged agents operating across inference, training, and emerging agentic AI workflows.
The NVIDIA DOCA security stack provides a unified framework for protecting the entire AI factory. Leveraging BlueField-4 acceleration, DOCA enables runtime threat detection up to 1,000x faster than software-only agentless approaches, while enforcing network and file access policies at speeds up to 800 Gb/s. This enables security to operate at AI speed and scale.
The DOCA security stack includes DOCA Argus, DOCA Vault, and DOCA Flow which provide specialized capabilities spanning runtime threat detection, zero-trust access for file-based storage, and high-speed policy network enforcement. Together, these frameworks establish a robust security architecture for protecting AI infrastructure, workloads, agents, and data across the AI factory.
Integrated with NVIDIA AI, BlueField streams telemetry and security data to GPU-accelerated systems for AI-powered analysis, generating actionable security intelligence that can dynamically adapt protections and enforce policies directly on the DPU. The result is a continuously learning security architecture built for the speed, scale, and complexity of agentic AI.
How does DOCA Argus detect threats in AI workloads?
DOCA Argus is the runtime threat detection microservice that provides real-time visibility and situational awareness across the AI factory. Argus is the foundation of the DOCA security stack.
Running on BlueField data and storage processors, DOCA Argus continuously observes workload behavior at runtime using advanced memory analysis, enabling organizations to detect threats, monitor integrity, and understand operational state without impacting AI workload performance.
Unlike traditional host-based security approaches, DOCA Argus operates independently from the compute node it protects. By leveraging the BlueField hardware-isolated and attestable execution environment and DOCA direct memory access capabilities, Argus securely accesses specific snippets of volatile host memory—the authoritative source of truth for system activity—without relying on software agents or consuming host CPU resources. Through zero-copy memory access techniques, this inspection occurs without disrupting application or AI performance.
DOCA Argus automatically identifies the Linux kernel version running on the host system and applies kernel-specific memory maps to locate the precise memory structures required for analysis. Supporting both x86 and Arm64 architectures, the platform collects low-level telemetry directly from host memory structures and translates raw memory data into meaningful operational context, including visibility into processes, threads, execution states, workload activity, and system behavior.
A policy engine continuously analyzes collected telemetry to identify meaningful operational and security signals while filtering irrelevant activity. This enables real-time visibility into system behavior, indicators of attack, and anomalous runtime conditions. Security findings are categorized into events, which provide operational awareness and contextual visibility, and alerts, which indicate immediate threats or suspicious behavior requiring investigation or response.
By continuously analyzing memory for state changes and behavioral anomalies, DOCA Argus provides persistent runtime monitoring without relying on traditional host-based agents. Because security controls operate independently from the host, detection capabilities remain intact even if workloads or the operating system become compromised. At the same time, the continued collection of forensics evidence enables investigation of potential incidents and supports post-incident analysis.
Runtime integrity monitoring for AI
AI applications are commonly deployed as containers, where workloads instantiated from the same image are expected to exhibit consistent and predictable behavior. DOCA Argus leverages this consistency to establish behavioral profiles for AI workloads, enabling real-time monitoring for deviations that may indicate compromise, unauthorized activity, or malicious behavior.
DOCA Argus continuously validates runtime integrity by monitoring what is executing, how it is executing, and what it’s interacting with at runtime. This includes comparing the behavior and properties of binaries against expected runtime manifests, validating integrity through SHA-256 hashes, analyzing execution context such as command-line arguments and execution paths, and monitoring interactions with threads, libraries, the file system, network, and memory to verify workloads are operating as intended.
The platform provides process-level visibility into file access and network activity, continuously monitoring which files are accessed, by which processes, and what actions are performed. Inbound and outbound network connections are analyzed to ensure workloads maintain expected communication patterns and do not exhibit suspicious behavior.
By comparing live runtime activity against established behavioral baselines, DOCA Argus can identify integrity violations and indicators of compromise in real time. Detection capabilities include, for example, unauthorized process execution, unauthorized library usage, drift detection, bash shell execution, reverse shell activity, and other runtime anomalies associated with compromise or malicious behavior.
AI discovery and exposure management
DOCA Argus also provides a foundational visibility layer for AI discovery and exposure management across the AI factory. The platform continuously identifies, maps, and contextualizes AI infrastructure, workloads, and their relationships in real time.
This includes workload posture awareness across containers (including Kata containers), virtual machines, and bare-metal systems, as well as mapping relationships between infrastructure components such as container-to-POD, container-to-VM, and container-to-operating-system dependencies.
Using container image hashes, DOCA Argus can help identify deployed AI software, models, and autonomous agents by correlating runtime artifacts against publicly available repositories and internal enterprise software inventories. Leveraging DOCA Argus telemetry, organizations gain visibility into which AI components are running, where they are deployed, and how they interact across the environment.
DOCA Argus can also support passive vulnerability management by analyzing the SH
