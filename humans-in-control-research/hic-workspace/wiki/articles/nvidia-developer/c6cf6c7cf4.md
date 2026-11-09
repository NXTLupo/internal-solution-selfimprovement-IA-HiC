---
id: articles/nvidia-developer/c6cf6c7cf4.md
url: "https://developer.nvidia.com/blog/where-security-fits-in-an-ai-agent-stack/"
url_hash: "c6cf6c7cf4"
kind: "article"
source: "NVIDIA Developer"
title: "Where Security Fits in an AI Agent Stack"
author: ""
date: "2026-08-21T13:00:00Z"
tier: 2
method: "source-native"
extracted_at: "2026-08-25T23:41:46.870073+00:00"
chars: 10000
engagement: "identify-high-converting-email-design-patterns-and-product-m"
collected_at: "2026-08-25T23:41:46.649Z"
relevance: 0
engagement_goal: "Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics and skincare brand targeting Gen Z."
content_hash: "a87948addb495c46"
relevance_by_goal: {"8429cfd39d4f":0}
chunks:
  - id: "articles/nvidia-developer/c6cf6c7cf4.md#c0"
    char_span: [0, 147]
    sentence_count: 1
    key_terms: [where-security-fits-in-an-ai-agent-stack, developer, nvidia, security, source, agent, https, stack]
    concepts: [developer, nvidia]
    token_count: 36
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/where-security-fits-in-an-ai-agent-stack/","kind":"article","date":"2026-08-21"}]
  - id: "articles/nvidia-developer/c6cf6c7cf4.md#c1"
    char_span: [149, 2988]
    sentence_count: 20
    key_terms: [agent, security, agents, infrastructure, controls, actions, harness, behavioral]
    concepts: [agent, security, agents, infrastructure, controls]
    related_chunks: ["articles/nvidia-developer/c6cf6c7cf4.md#c2", "articles/nvidia-developer/c6cf6c7cf4.md#c3", "articles/nvidia-developer/c6cf6c7cf4.md#c4"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/where-security-fits-in-an-ai-agent-stack/","kind":"article","date":"2026-08-21"}]
  - id: "articles/nvidia-developer/c6cf6c7cf4.md#c2"
    char_span: [2623, 5412]
    sentence_count: 27
    key_terms: [agent, harness, controls, infrastructure, model, environment, policy, boundary]
    concepts: [agent, harness, controls, infrastructure, model]
    related_chunks: ["articles/nvidia-developer/c6cf6c7cf4.md#c1", "articles/nvidia-developer/c6cf6c7cf4.md#c4"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/where-security-fits-in-an-ai-agent-stack/","kind":"article","date":"2026-08-21"}]
  - id: "articles/nvidia-developer/c6cf6c7cf4.md#c3"
    char_span: [5054, 7783]
    sentence_count: 22
    key_terms: [agent, runtime, security, control, boundary, harness, data, runtimes]
    concepts: [agent, runtime, security, control, boundary]
    related_chunks: ["articles/nvidia-developer/c6cf6c7cf4.md#c1", "articles/nvidia-developer/c6cf6c7cf4.md#c4"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/where-security-fits-in-an-ai-agent-stack/","kind":"article","date":"2026-08-21"}]
  - id: "articles/nvidia-developer/c6cf6c7cf4.md#c4"
    char_span: [7453, 10150]
    sentence_count: 27
    key_terms: [controls, agent, boundary, security, authority, access, policy, below]
    concepts: [controls, boundary, security, agent, authority]
    related_chunks: ["articles/nvidia-developer/c6cf6c7cf4.md#c1", "articles/nvidia-developer/c6cf6c7cf4.md#c2", "articles/nvidia-developer/c6cf6c7cf4.md#c3"]
    token_count: 501
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/where-security-fits-in-an-ai-agent-stack/","kind":"article","date":"2026-08-21"}]
---
# Where Security Fits in an AI Agent Stack

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/where-security-fits-in-an-ai-agent-stack/)

As AI agents become more capable and operate over longer horizons, building security and trust into the applications they power becomes increasingly important. Drawing on work with NVIDIA OpenShell, agent developers, open-source projects, and partners across the ecosystem, AI safety and security teams at NVIDIA offer their perspective on the emerging agent stack—including the role of each layer and where security should live.
Recent reports underscore why the placement of security controls matters. Within a few weeks this summer, OpenAI, Anthropic, and the UK AI Security Institute each reported frontier agents operating beyond their intended boundaries. The reported behaviors included exploiting an unexpected path out of lab environments to the open internet, gaining unauthorized access to other companies’ systems, and taking unsanctioned actions involving people and infrastructure. These cases involved long-horizon agents running with reduced model safeguards. But they point to the same design challenge: the capabilities that enable agents to solve problems creatively and pursue complex goals can also help them find paths that their original instructions did not anticipate.
Recent NVIDIA research underscores the importance of the harness layer in the agent stack. Using Agentic Variation Operators (AVO), researchers achieved a 100% score on ARC-AGI-3, an interactive reasoning benchmark that places agents in unfamiliar environments without instructions, explicit rules, or stated goals. Learn more about the AVO research.
This post maps the main layers of the emerging agent stack—models, harnesses, meta-harnesses, secure runtimes such as OpenShell, and inference infrastructure—and explains how each layer can help reduce risk. You’ll also learn which security properties become critical as these layers grow more capable and composable, including where authority should live, how access should be scoped, and how the runtime can contain and record an agent’s actions.
Behavioral and infrastructure controls for AI agents
Securing agents doesn’t require reinventing security. Decades of systems security provide durable principles, including least privilege, defense in depth, isolation, explicit authorization, and auditability. The challenge is determining where to apply them in an agent stack.
Prompts, model safeguards, and harness logic all shape what an agent is likely to do, but they don’t create a hard boundary around what it can do. This distinction leads to two different kinds of control: behavioral controls that guide the agent and infrastructure controls that limit its authority.
Behavioral controls influence agent actions
The model and agent propose actions, and the harness directs them. Together, the model, agent, and harness interpret goals, work through ambiguity, and propose actions. The harness is the natural control point: it owns the loop, the context, the tools, and the session, and it can steer behavior toward what the operator intends. That steering is valuable, but every control implemented at this level still depends on how the model will behave.
Infrastructure controls determine what an agent can do
Final authority belongs to the environment in which the agent runs in. That environment holds identity, enforces policy, contains failures, records what happened, and reaches the same authorization decision every time, given the same approved policy and verified state. It doesn’t estimate what an agent will do. It determines what an agent can do.
The harness guides what an agent tries. The infrastructure controls what an agent can do. Both are necessary; only one is authoritative.
Infrastructure enforcement is not infallible. It means approved policy and verified configuration produce repeatable outcomes, and the agent cannot choose whether to comply. Policy can still be wrong, and external outcomes can remain uncertain.
Mapping security controls
This division maps onto the layers the open-source ecosystem is already converging on:
These layers describe functional roles. One product may combine several roles, and a deployment may split one role across multiple services. Here, each layer names a responsibility. The security boundary is defined by the effect paths that the agent cannot bypass.
The model supplies intelligence; the harness turns that intelligence into an agent; the runtime determines what that agent is allowed to do.
The harness layer is a spectrum rather than a fixed category. Codex and Claude Code are opinionated harnesses, while Pi and DeepSeek Harness (DSH) expose more of the harness as a programmable substrate. Through Cordis, DSH enables core behaviors that can be composed and replaced as plugins. This programmability makes the harness a poor place for a security guarantee: a layer designed to be modified cannot reliably enforce controls against its own modification. The alternative—relying on harness logic for safety—encodes assumptions about model behavior, and those assumptions go stale as models improve.
A narrowly scoped credential limits potential harm, but keeping the raw credential out of the agent’s reach creates a stronger boundary enforced by the environment.
Establish the AI agent runtime boundary before launch
Models, harnesses, runtimes, policies, and inference deployments are increasingly selected independently. This approach only works if the runtime’s guarantees hold regardless of which components operate above it. That means a security boundary must be established when the agent launches.
An orchestrator asks OpenShell to create a runtime and enforce policies and governance. The selected harness starts inside that runtime, and its plugins, Model Context Protocol (MCP) processes, tools, and other model-directed code run inside the same boundary. Subagents receive delegated child runtimes with ceilings they can’t exceed, while the orchestrator operates inside a runtime governed by its own policy.
This approach is different from treating the runtime as another tool that a harness can invoke once it’s already running. A control that the agent can decline to invoke is not an effective security control.
Common security gaps in agent stacks
Many agent stacks share the same flaw: authorization decisions can be influenced by the agent or by untrusted data it reads.
- Unclear boundaries. Rules are split across prompts, models, agents, harnesses, runtimes, and infrastructure, so the authoritative version is hard to find.
- Excessive access. The agent receives standing, often long-lived credentials or permissions beyond what the current task needs.
- Untrusted data as control. Documents, messages, tool results, and memory can redirect action without being authorized as instructions.
- Uncontrolled external effects. An allowed API can move data, create compute, or trigger effects outside the intended controls.
- Compounding failures. Agents delegate, share memory, and call peers, so one mistake can become a fast cascade.
- Incomplete audit evidence. Approvals are vague, access is slow to revoke, and the record is not sufficient to explain an incident or support recovery.
Design rules for enforceable agent security
Five design rules help keep security decisions outside the agent’s control.
- Above proposes; below decides. No model, agent, harness, tool, or memory system grants itself authority.
- Authoritative policy location. Keep policy below the line. Policy-aware planning above the line is useful, but advisory.
- Check every effect. Control every file, process, network request, API call, data operation, resource allocation, communication, and device action.
- Just-in-time access. Credentials and capabilities should be narrow, short-lived, and easy to remove.
- Isolation and recovery. Isolate each agent, revoke access quickly, recover, and preserve the record.
A layered security model for agents
Like the OSI model, this agent stack assigns each layer one job and a clear interface. Higher layers can change without redefining the control layer below them.
How the security boundary works
The boundary is effective only if every request is evaluated consistently. Three requirements make this possible.
- Treat every component above the boundary as untrusted. It may be mistaken, compromised, or adversarial, and its requests carry no authority on their own.
- Make the controls below the boundary authoritative. These layers bind each request to an identity, apply policy, and enforce the decision.
- Use risk signals only to reduce authority. Signals such as anomaly scores may trigger tighter controls, but they must never grant additional access.
Every action that changes the external state must pass through the policy and enforcement layers below the boundary. Any path that allows Layers 5-7 to bypass those controls is an architectural defect.
Four security profiles for agent workloads
All four profiles use the same stack, boundary, and interfaces. Each applies different controls based on the authority granted, the potential impact, and the likelihood of adversarial behavior.
Important. Production access for a red-team agent should be exceptional and narrower, not broader, than access granted to an ordinary production agent.
How agent security controls change as risk increases
As an agent gains more authority and the potential impact of its actions grows, strengthen controls in five areas.
- Narrower authority. Grants should become shorter-lived as risk rises.
- Fresh decisions. Reevaluate policy closer to each action.
- Stronger oversight. Add live supervision for high-impact work.
- Faster recovery. Plan for access revocation, quarantine, and rollback.
- Independent evidence. Keep immutable records below the security boundary.
Security requirements at every risk level
Although controls become stricter as risk increases, the following security requirements should remain consistent across every profile.
- The agent never grants itself access. Controls are enforced outside the agent proces
