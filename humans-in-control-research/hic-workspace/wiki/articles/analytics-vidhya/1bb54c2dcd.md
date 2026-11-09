---
id: articles/analytics-vidhya/1bb54c2dcd.md
url: "https://www.analyticsvidhya.com/blog/2026/06/sakana-fugu-multi-agent-system-as-a-model/"
url_hash: "1bb54c2dcd"
kind: "article"
source: "analytics_vidhya"
title: "Sakana Fugu: Multi-Agent System as a Model"
author: ""
date: "Tue, 23 Jun 2026 12:30:56 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-07-03T01:20:39.927664+00:00"
chars: 9311
engagement: "deliver-a-2026-risk-and-market-analysis-report-evaluating-ho"
collected_at: "2026-07-03T01:20:40.011Z"
relevance: 0
engagement_goal: "Deliver a 2026 risk and market analysis report evaluating how emerging property risks (climate extremes, aging equipment, outdated practices, AI and technological assets) and macroeconomic factors (inflation, interest rates) impact agricultural underwriting viability and farm solvency. Analyze these dynamics across distinct modern farmer personas, detailing their technological adoption barriers, educational needs, and generational shifts."
content_hash: "d7a87cfe0a73075c"
relevance_by_goal: {"c5a2d58d1be7":0}
chunks:
  - id: "articles/analytics-vidhya/1bb54c2dcd.md#c0"
    char_span: [0, 161]
    sentence_count: 1
    key_terms: [sakana-fugu-multi-agent-system-as-a-model, analyticsvidhya, multi-agent, sakana, source, system, https, model]
    token_count: 45
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/06/sakana-fugu-multi-agent-system-as-a-model/","kind":"article","date":"2026-06-23"}]
  - id: "articles/analytics-vidhya/1bb54c2dcd.md#c1"
    char_span: [163, 2786]
    sentence_count: 25
    key_terms: [fugu, model, orchestration, verification, multi-agent, agents, sakana, system]
    concepts: [model, orchestration, verification, multi-agent, agents]
    related_chunks: ["articles/analytics-vidhya/1bb54c2dcd.md#c2", "articles/analytics-vidhya/1bb54c2dcd.md#c4"]
    token_count: 512
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/06/sakana-fugu-multi-agent-system-as-a-model/","kind":"article","date":"2026-06-23"}]
  - id: "articles/analytics-vidhya/1bb54c2dcd.md#c2"
    char_span: [2470, 5091]
    sentence_count: 32
    key_terms: [fugu, agents, model, orchestrator, agent, tasks, ultra, different]
    concepts: [agents, model, orchestrator, different, agent]
    related_chunks: ["articles/analytics-vidhya/1bb54c2dcd.md#c1"]
    token_count: 512
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/06/sakana-fugu-multi-agent-system-as-a-model/","kind":"article","date":"2026-06-23"}]
  - id: "articles/analytics-vidhya/1bb54c2dcd.md#c3"
    char_span: [4778, 7272]
    sentence_count: 29
    key_terms: [fugu, sakana, ultra, pricing, pay-as-you-go, subscription, benchmarks, model]
    concepts: [sakana, pricing, ultra, pay-as-you-go, subscription]
    token_count: 512
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/06/sakana-fugu-multi-agent-system-as-a-model/","kind":"article","date":"2026-06-23"}]
  - id: "articles/analytics-vidhya/1bb54c2dcd.md#c4"
    char_span: [7016, 9257]
    sentence_count: 17
    key_terms: [sakana, model, openai, api, fugu, multi-agent, https, response]
    concepts: [sakana, model, openai, multi-agent, orchestration]
    related_chunks: ["articles/analytics-vidhya/1bb54c2dcd.md#c1"]
    token_count: 512
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/06/sakana-fugu-multi-agent-system-as-a-model/","kind":"article","date":"2026-06-23"}]
  - id: "articles/analytics-vidhya/1bb54c2dcd.md#c5"
    char_span: [8973, 9475]
    sentence_count: 11
    key_terms: [model, models, fugu-ultra-20260615, openai-compatible, use, orchestration, applications, completions]
    concepts: [model, models]
    token_count: 118
    sources: [{"n":"analytics_vidhya","u":"https://www.analyticsvidhya.com/blog/2026/06/sakana-fugu-multi-agent-system-as-a-model/","kind":"article","date":"2026-06-23"}]
---
# Sakana Fugu: Multi-Agent System as a Model

Source: [analytics_vidhya](https://www.analyticsvidhya.com/blog/2026/06/sakana-fugu-multi-agent-system-as-a-model/)

For years, AI progress has centered on scaling individual foundation models: larger parameters, longer context windows, stronger reasoning, and better tool use. Sakana AI’s Fugu points elsewhere, behaving like one model from the outside while coordinating multiple expert agents internally.
A single API call can trigger direct answering, specialist delegation, intermediate verification, and final synthesis, hiding orchestration complexity behind a normal LLM interface. In this article, a practical guide to Fugu’s architecture, variants, pricing, benchmarks, access, code, tests, enterprise fit, trade-offs, and use cases.
Sakana Fugu is an OpenAI-compatible managed model API that looks like a single LLM but works as a multi-agent system internally. Developers send a prompt to one model ID, such as fugu or fugu-ultra, while Fugu handles agent selection, role assignment, coordination, verification, and final response.
Instead of manually building planner, coder, reviewer, researcher, or supervisor agents with frameworks like LangGraph, AutoGen, or CrewAI, teams get orchestration packaged into the model itself. This reduces the need to manage prompts, routing, retries, memory, state, monitoring, and failure recovery.
The name “Sakana” means fish in Japanese. The company often frames its research around collective intelligence, similar to how a school of fish can behave as one coordinated system. Fugu follows that idea. Many agents coordinate behind one interface.
Most production AI systems today fall into one of three patterns:
Single-model prompting is simple, but it can fail on complex tasks that require planning, execution, verification, and iteration.
Tool-augmented LLMs improve usefulness by connecting models to search, databases, code execution, APIs, or business systems. But the model still usually acts as the central reasoning engine.
Multi-agent workflows go further. They divide work across specialized agents. For example:
This can improve reliability on difficult tasks, but building it well is hard. Teams must answer many system design questions:
Fugu attempts to make this easier by turning multi-agent orchestration into a model-level capability. The developer does not need to design every agent interaction manually.
Sakana Fugu comes in two main model options: Fugu and Fugu Ultra.
Fugu is the default model for everyday work. It balances performance and latency. It is suitable for coding support, code review, chatbots, internal assistants, document analysis, and interactive workflows where response time matters.
A key point is that Fugu can route to the best model based on the task. It also allows users to opt specific agents out of the model pool, which can help with data, privacy, compliance, or organizational requirements.
Fugu Ultra is optimized for maximum answer quality. It coordinates a deeper pool of expert agents and is intended for hard, high-stakes, multi-step problems. According to the Sakana, Fugu Ultra can route between one to three agents depending on the problem.
Fugu Ultra is better suited for workloads where accuracy, depth, and persistence matter more than latency. Examples include:
Fugu’s architecture can be understood as a managed orchestration layer wrapped inside a model API.
From the outside, the flow looks like this:
Internally, the system is closer to this:
Sakana Fugu exposes a single API while internally coordinating a pool of specialized models. The user sends one request, and Fugu handles routing, delegation, verification, and synthesis.
The developer interacts with a standard API surface. This matters because Fugu supports OpenAI-compatible endpoints, so teams can reuse existing OpenAI SDK clients with a different base URL and API key.
The orchestrator is the core intelligence layer. It decides how the task should be handled. For simpler tasks, it may answer with minimal orchestration. For complex tasks, it can coordinate multiple expert agents.
Fugu has access to a pool of underlying models or agents. These agents may have different strengths across coding, reasoning, research, long-context analysis, or other specialized tasks.
Instead of hardcoding a workflow, Fugu dynamically selects which agent or agents to use. This is important because model strengths are often task-specific. One model may perform better at code generation, another at mathematical reasoning, another at long-context synthesis.
The orchestrator can break down a complex task into subtasks. It can send focused instructions to different agents and control what context each agent receives.
For difficult tasks, the system can use verification-style behavior. One agent may solve, another may critique or validate, and the orchestrator may combine the results.
The final answer is returned as a single response. The user does not see the full internal agent graph. .
Fugu has two pricing modes: pay-as-you-go and subscription plans.
Pay-as-you-go
Pay-as-you-go is designed for heavier production workloads. Sakana says consumption-based tokens are served at higher priority than monthly-plan tokens.
Fugu pricing
Fugu pricing depends on the active agent setup.
This is important because many multi-agent systems become expensive when each model call is billed separately. Fugu’s pricing model tries to avoid stacking model fees across agents.
Fugu Ultra pricing
Fugu Ultra has fixed pricing for fugu-ultra-20260615 per 1M tokens. 
Subscription plans
Subscription plans are designed for individuals and everyday hands-on use. Every tier includes both Fugu and Fugu Ultra.
Sakana reports Fugu and Fugu Ultra benchmark scores across coding, reasoning, science, agentic tasks, long-context reasoning, and cybersecurity-style evaluation.
Sakana Fugu and Fugu Ultra compared with frontier baseline models across coding, reasoning, science, long-context, and agentic benchmarks.
Benchmarks are useful, but they should not be treated as direct production guarantees. Fugu’s benchmark profile suggests three practical insights.
1. Fugu is strongest when tasks require orchestration
The strongest use case is not a simple one-shot answer. The model is designed for tasks that benefit from decomposition, expert selection, verification, and synthesis.
Examples:
2. Ultra is not always automatically better
Fugu Ultra is optimized for answer quality, but Fugu can outperform it on some benchmarks. Developers should benchmark both models on their own workload before standardizing.
A practical routing strategy could be:
Use fugu for interactive work.
Use fugu-ultra for complex, high-value tasks.
Fallback to fugu when latency or cost matters.  
3. Multi-agent performance comes with hidden complexity
Even though Fugu hides orchestration complexity from the developer, the underlying system still performs additional work. This can affect latency, cost, and observability.
Teams should monitor:
Sakana fugu documentation: https://console.sakana.ai/get-started
Go to the Sakana console API key page login and create API: https://console.sakana.ai/api-keys
Create an API key and store it securely. The key is shown only once.
export FUGU_API_KEY="your_api_key_here"
export FUGU_BASE_URL="https://api.sakana.ai/v1"
pip install openai  import os
from openai import OpenAI
client = OpenAI(
    api_key=os.environ["FUGU_API_KEY"],
    base_url=os.environ.get("FUGU_BASE_URL", "https://api.sakana.ai/v1"),
)
response = client.responses.create(
    model="fugu",
    input="Explain Sakana Fugu in simple terms for a software engineer.",
)
print(response.output_text)import os
from openai import OpenAI
client = OpenAI(
    api_key=os.environ["FUGU_API_KEY"],
    base_url=os.environ.get("FUGU_BASE_URL", "https://api.sakana.ai/v1"),
)
response = client.responses.create(
    model="fugu-ultra",
    instructions="You are a senior AI architect. Be precise and technical.",
    input="""
Compare single-agent LLM systems, manually designed multi-agent workflows,
and Sakana Fugu-style multi-agent systems as a model.
Focus on architecture, cost, latency, observability, and governance.
""",
)
print(response.output_text)Sakana Fugu stands out because it shifts the abstraction layer. Instead of offering just another large model, it packages multi-agent orchestration behind a model API.
For developers, this means easier access to agentic workflows without building complex orchestration systems from scratch. For technical leaders, it offers a managed way to improve reasoning, coding, research, and analysis while reducing dependence on a single model provider.
Fugu is best suited for complex, ambiguous, high-value tasks rather than simple chatbot prompts. Still, teams should adopt it carefully, given its limited routing transparency, possible latency, unclear token accounting, and regional constraints.
The simplest way to think about Fugu is this: it is not just a model you prompt. It is a model that manages other models. That makes it an important step toward the next generation of AI applications.
A. It is exposed as a single model API, but internally it behaves as a multi-agent orchestration system.
A. Use fugu for standard work and fugu-ultra for complex, high-value tasks. Use fugu-ultra-20260615 if you want to pin a specific Ultra version.
A. Yes. It supports OpenAI-compatible Responses, Chat Completions, and Models APIs.
