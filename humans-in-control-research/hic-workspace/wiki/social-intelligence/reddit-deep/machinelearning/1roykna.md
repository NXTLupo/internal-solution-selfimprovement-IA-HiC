---
id: social-intelligence/reddit-deep/machinelearning/1roykna.md
url: "https://www.reddit.com/r/MachineLearning/comments/1roykna/r_seeking_arxiv_endorsement_for_csai_memento_a/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[R] Seeking arXiv Endorsement for cs.AI: Memento - A Fragment-Based Memory System for LLM Agents"
author: "Flashy_Test_8927"
date: "2026-03-09T12:13:47.000Z"
score: 0
upvote_ratio: 0.12
num_comments: 8
flair: "Research"
extracted_at: "2026-05-11T17:27:06.580Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1roykna.md#c0"
    char_span: [0, 1968]
    sentence_count: 9
    key_terms: [https, endorsement, agents, memory, arxiv, comments, machinelearning, memento]
    concepts: [https, endorsement, agents, memory, arxiv]
    token_count: 453
    sources: [{"n":"reddit-deep: r/machinelearning","u":"https://www.reddit.com/r/MachineLearning/comments/1roykna/r_seeking_arxiv_endorsement_for_csai_memento_a/"}]
  - id: "social-intelligence/reddit-deep/machinelearning/1roykna.md#c1"
    char_span: [1982, 3737]
    sentence_count: 15
    key_terms: [fragments, retrieval, activation, fragment-based, interesting, time, importance, critical]
    concepts: [fragments, retrieval, activation, fragment-based, interesting]
    section: Comments
    token_count: 356
---
# [R] Seeking arXiv Endorsement for cs.AI: Memento - A Fragment-Based Memory System for LLM Agents

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1roykna/r_seeking_arxiv_endorsement_for_csai_memento_a/)
Posted by **Flashy_Test_8927** · **0↑** · **8 comments**

Hi everyone,

I'm looking for an arXiv endorsement in [cs.AI](http://cs.AI) for a paper on persistent memory for LLM agents.

The core problem: LLM agents lose all accumulated context when a session ends. Existing approaches — RAG and summarization — either introduce noise from irrelevant chunks or lose information through lossy compression.

My approach (Memento) treats memory as atomic, typed "fragments" (1–3 sentences each) rather than monolithic document chunks. The key design choices are a 6-type taxonomy (Facts, Decisions, Errors, Preferences, Procedures, Relations), biologically-inspired decay rates modeled on Ebbinghaus's forgetting curve, a three-tier hybrid retrieval stack (Redis → PostgreSQL GIN → pgvector HNSW with RRF), and an asynchronous pipeline that handles embedding and contradiction detection without blocking the agent's critical path.

The system is deployed in a personal production environment supporting software engineering workflows. I'd describe the density improvement over standard chunk-level RAG as substantial, though the evaluation is qualitative at this stage — formalizing benchmarks is on the roadmap.

Paper title: Memento: Fragment-Based Asynchronous Memory Externalization for Persistent Context in Large Language Model Agents

GitHub: [https://github.com/JinHo-von-Choi/memento-mcp](https://github.com/JinHo-von-Choi/memento-mcp)

If you're a qualified endorser and the work looks reasonable to you, the endorsement link is [https://arxiv.org/auth/endorse?x=ZO7A38](https://arxiv.org/auth/endorse?x=ZO7A38) (code: ZO7A38). Happy to discuss the fragment-level approach or take technical feedback in the comments.

## Comments

- **Ni2021** (1↑): Fragment-based memory is an interesting decomposition. One challenge with fragment retrieval: how do you rank which fragments are most relevant when you have thousands?



In cognitive science, ACT-R (Anderson 1993) solves this with base-level activation: B = ln(Σ t\_k\^(-0.5)) where each t\_k is time since the k-th access. Fragments accessed frequently and recently get higher activation — it's a power law, not a linear decay, so the ranking is robust across different time scales.



The other piece that helps: Hebbian associations between fragments. When two fragments are co-retrieved repeatedly, they form a link. Next time one is activated, the other gets a spreading activation boost. This surfaces contextually related fragments that keyword search alone would miss.



Have you considered adding any temporal dynamics to the retrieval scoring?
- **eyepaqmax** (1↑): The fragment-based approach is interesting. One gap I keep seeing in memory papers is how they handle importance. In practice, not all fragments are equal and retrieval quality drops fast if you treat them that way.

In production agent systems the biggest pain points I've hit are: (1) contradictions accumulating silently when the user updates information, (2) critical facts getting buried under trivial ones because the retrieval is pure similarity, and (3) old but important context decaying away because there's no way to mark something as "never forget this".

Would be curious if Memento addresses any of those. The fragment structure seems like it could help with contradiction detection if you track provenance, but the paper abstract doesn't mention importance weighting or decay immunity for critical data.

Good luck with the arXiv endorsement.
