---
id: articles/arxiv-cs-lg/daeec8e4a0.md
url: "https://arxiv.org/abs/2604.26375v1"
url_hash: "daeec8e4a0"
kind: "article"
source: "arXiv CS.LG"
title: "SG-UniBuc-NLP at SemEval-2026 Task 6: Multi-Head RoBERTa with Chunking for Long-Context Evasion Detection"
author: ""
date: "2026-04-29T07:37:03Z"
tier: 1
method: "source-native"
extracted_at: "2026-08-26T19:33:07.985560+00:00"
chars: 500
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:33:07.178Z"
relevance: 0
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "128cbe7b8307f2eb"
relevance_by_goal: {"d21cb50b17ba":0}
chunks:
  - id: "articles/arxiv-cs-lg/daeec8e4a0.md#c0"
    char_span: [0, 669]
    sentence_count: 3
    key_terms: [semeval-2026, political, responses, chunking, strategy, clarity, evasion, arxiv]
    concepts: [semeval-2026, political, responses, chunking, strategy]
    token_count: 163
    sources: [{"n":"arXiv CS.LG","u":"https://arxiv.org/abs/2604.26375v1","kind":"article","date":"2026-04-29"}]
---
# SG-UniBuc-NLP at SemEval-2026 Task 6: Multi-Head RoBERTa with Chunking for Long-Context Evasion Detection

Source: [arXiv CS.LG](https://arxiv.org/abs/2604.26375v1)

We describe our system for SemEval-2026 Task 6 (CLARITY: Unmasking Political Question Evasions), which classifies English political interview responses by coarse-grained clarity (3-way) and fine-grained evasion strategy (9-way). Since responses frequently exceed the 512-token limit of standard Transformer encoders, we apply an overlapping sliding-window chunking strategy with element-wise Max-Pooling aggregation over chunk representations. A shared RoBERTa-large encoder supplies two task-specifi
