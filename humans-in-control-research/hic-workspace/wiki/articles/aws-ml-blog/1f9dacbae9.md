---
id: articles/aws-ml-blog/1f9dacbae9.md
url: "https://aws.amazon.com/blogs/machine-learning/icymi-what-landed-for-ai-builders-in-september-2026/"
url_hash: "1f9dacbae9"
kind: "article"
source: "aws_ml_blog"
title: "ICYMI: What landed for AI builders in September 2026"
author: ""
date: "Fri, 09 Oct 2026 15:38:39 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:46:27.946592+00:00"
chars: 7261
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:46:28.021Z"
relevance: 45
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "e984f7b476e5fe11"
relevance_by_goal: {"aa6916010743":45}
chunks:
  - id: "articles/aws-ml-blog/1f9dacbae9.md#c0"
    char_span: [0, 177]
    sentence_count: 1
    key_terms: [icymi-what-landed-for-ai-builders-in-september-2026, machine-learning, september, builders, amazon, landed, source, blogs]
    token_count: 53
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/icymi-what-landed-for-ai-builders-in-september-2026/","kind":"article","date":"2026-10-09"}]
  - id: "articles/aws-ml-blog/1f9dacbae9.md#c1"
    char_span: [179, 2921]
    sentence_count: 21
    key_terms: [agents, bedrock, amazon, agentcore, enterprise, model, build, strands]
    concepts: [agents, bedrock, amazon, agentcore, enterprise]
    related_chunks: ["articles/aws-ml-blog/1f9dacbae9.md#c4"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/icymi-what-landed-for-ai-builders-in-september-2026/","kind":"article","date":"2026-10-09"}]
  - id: "articles/aws-ml-blog/1f9dacbae9.md#c2"
    char_span: [2603, 5087]
    sentence_count: 22
    key_terms: [gpt-6, coding, astra, model, available, decisions, workloads, sol]
    concepts: [gpt-6, coding, available, decisions, workloads]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/icymi-what-landed-for-ai-builders-in-september-2026/","kind":"article","date":"2026-10-09"}]
  - id: "articles/aws-ml-blog/1f9dacbae9.md#c3"
    char_span: [4750, 7346]
    sentence_count: 22
    key_terms: [knowledge, claude, enterprise, coding, bedrock, long-running, amazon, connectors]
    concepts: [knowledge, claude, enterprise, coding, long-running]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/icymi-what-landed-for-ai-builders-in-september-2026/","kind":"article","date":"2026-10-09"}]
  - id: "articles/aws-ml-blog/1f9dacbae9.md#c4"
    char_span: [6985, 7441]
    sentence_count: 5
    key_terms: [bedrock, support, amazon, build, automatically, documentation, conversation, incremental]
    concepts: [bedrock, support, amazon, build]
    related_chunks: ["articles/aws-ml-blog/1f9dacbae9.md#c1"]
    token_count: 82
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/icymi-what-landed-for-ai-builders-in-september-2026/","kind":"article","date":"2026-10-09"}]
---
# ICYMI: What landed for AI builders in September 2026

Source: [aws_ml_blog](https://aws.amazon.com/blogs/machine-learning/icymi-what-landed-for-ai-builders-in-september-2026/)

Artificial Intelligence
ICYMI: What landed for AI builders in September 2026
A recap of the latest Amazon Bedrock, Amazon Bedrock AgentCore, and Strands updates from September 2026
At AWS, we believe the fastest path to enterprise AI is giving builders real choice at every layer: model, runtime, and tooling. That belief shapes how we invest across Amazon Bedrock, AgentCore, and Strands. Amazon Bedrock continues expanding access to leading frontier models so you can build and scale AI applications securely. Amazon Bedrock AgentCore provides the managed infrastructure to build, connect, and deploy enterprise agents using any framework or model. Strands gives you an open source toolkit to build agents and run anywhere.
As AI models become more capable and model choice expands, the industry conversations are shifting. Model performance is no longer the only question. Customers now weigh cost against benefit for their specific use case, and those decisions matter when delegating work to agents in production. AI agents are already moving into workflows that require them to reason over enterprise knowledge, operate across long-horizon tasks, and act in systems where security, accuracy, and governance matter. The focus is now shifting beyond the model itself to the broader system around it, including the context agents can access, the actions they can take, and how enterprise data is governed and protected.
In September, updates across Amazon Bedrock, AgentCore, and Strands strengthened those foundations. New capabilities expanded model choice, made agent operations more efficient and measurable, and created more direct ways to connect AI applications with current business information.
Run faster agents and evaluate what matters
Build agents optimized for OpenAI models. Amazon Bedrock Managed Agents, powered by OpenAI, is now available in public preview, helping you build production-ready AI agents without sacrificing enterprise security. You can now use OpenAI models while keeping data within AWS, reuse existing AWS Identity and Access Management (IAM) permissions, and maintain full auditability through AWS CloudTrail. Durable sessions and built-in human approval workflows help reduce development overhead and mitigate risk.
Agents now start faster with less infrastructure overhead. The latest AgentCore runtime, a capability of Amazon Bedrock AgentCore, has more efficient memory management and lower cold start latency for serverless agents, so you pay for actual usage rather than the peak memory. You can run agents faster at lower cost with pay-as-you-go pricing and no need to pre-provision capacity. Sessions scale to zero when idle and run in hardware-isolated environments.
Lower your token cost with frontier performance. Strands harness is a new open source agent harness that matches popular harnesses on accuracy while using 28 percent fewer tokens. You can spin up a production-ready agent in a single line of Python or TypeScript, with built-in context management, prompt caching, and memory, then deploy it anywhere.
Let your models make big decisions safely, locally. Strands Decider 2B is a small, open source, 2B-parameter decision model that picks between predefined options (instead of generating text), delivering answers in ~115ms locally. It’s optimized for agentic AI tasks like tool selection, routing, and guardrails, with all code, data, and weights available on GitHub and Hugging Face.
Find the right model for each workload
Choose from a broader set of OpenAI models for your everyday work. OpenAI’s Astra, Sol, and Luna models are now generally available on Amazon Bedrock, with options for demanding projects, recurring complex work, and high-volume tasks.
GPT-6 Astra is the flagship model for your most ambitious work, bringing deeper reasoning to complex decisions, document analysis, and software development with up to 1 million input tokens. It brings stronger reasoning and more precise judgment to complex business decisions, operates across software and files, and delivers professional-quality output aligned with organizational voice, templates, and standards. GPT-6 Astra Ultrafast adds a premium speed tier for GPT-6 Astra, built for workloads where speed matters most. It delivers up to 6x faster inference in the API, with up to 300 tokens per second.
Sol brings near-Astra intelligence to coding, computer use, and professional workloads that run frequently. Both GPT-6.1 Sol and GPT-6 Sol are available on Amazon Bedrock. GPT 6.1 Luna is designed for high-volume tasks such as extraction, summarization, classification, and routing. Together, they help you balance intelligence, latency, and cost across workloads.
Take on long-running coding and research with Claude. Model choices for Claude now include the latest versions to advance your coding and scientific work. Claude Fable 5.1 expands options for coding, scientific research, and enterprise workflows. Claude Opus 5.5 is built for agentic coding, knowledge work, and long-running tasks. It uses adaptive thinking to gauge how much reasoning a task needs and an effort parameter to set an upper bound on reasoning depth. Claude Sonnet 5.5 is a smarter, more efficient Sonnet suited to focused coding and knowledge work, delivering 30 percent lower cost per task at 30 percent faster speed than Claude Sonnet 5.
Reason through complexity with a broader model portfolio. Moonshot AI’s Kimi K3 is now available on Amazon Bedrock. According to Moonshot AI, Kimi K3 is its most capable model and the first open model to reach 2.8 trillion parameters. With a 1-million-token context window, native vision, and built-in prompt caching, it helps you build smarter apps 2.5x faster at lower cost than previous versions.
xAI’s frontier models Grok 4.6 and Grok 4.7 offer a 500K token context window and support configurable reasoning effort and self-verification for more reliable long-running tasks.
Together, these additions give you more flexibility when matching models to your requirements such as context length, latency, throughput, and cost.
Get more control over your enterprise AI agents
Keep agent knowledge current. With new automatic sync scheduling in Amazon Bedrock Managed Knowledge Base, you can now configure daily, weekly, and monthly refresh options for all native data-source connectors. As a result, your enterprise AI agents retrieve the latest information. The user-managed setup for SharePoint, OneDrive, and Confluence reduces reliance on admin-managed service accounts when you already have the access you need.
Connect more enterprise sources without maintaining custom ingestion pipelines. Amazon Bedrock Managed Knowledge Base now supports ServiceNow, Confluence Data Center, Salesforce, and Zendesk as native connectors to handle data crawling, metadata extraction, and incremental sync automatically. These connectors reduce the amount of custom ingestion code you need to build and maintain support content, internal documentation, and operational knowledge.
Get started
Explore Amazon Bedrock, deploy agents with the AgentCore CLI, or build your first agent with the Strands Harness SDK.
Interested in learning how Amazon Bedrock can support your team? Connect with us to start the conversation.
