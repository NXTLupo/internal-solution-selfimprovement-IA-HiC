---
id: social-intelligence/reddit-deep/machinelearning/1ou77gn.md
url: "https://www.reddit.com/r/MachineLearning/comments/1ou77gn/r_unvalidated_trust_crossstage_vulnerabilities_in/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[R] Unvalidated Trust: Cross-Stage Vulnerabilities in LLMs"
author: "DirkN1"
date: "2025-11-11T11:37:29.000Z"
score: 182
upvote_ratio: 0.99
num_comments: 7
flair: "Research"
extracted_at: "2026-05-11T17:27:06.579Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1ou77gn.md#c0"
    char_span: [0, 1026]
    sentence_count: 8
    key_terms: [llms, machinelearning, https, shows, commands, comments, execute, output]
    token_count: 262
  - id: "social-intelligence/reddit-deep/machinelearning/1ou77gn.md#c1"
    char_span: [1040, 3238]
    sentence_count: 20
    key_terms: [model, reasoning, patterns, shifts, don, like, evaluation, automated]
    section: Comments
    token_count: 443
---
# [R] Unvalidated Trust: Cross-Stage Vulnerabilities in LLMs

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1ou77gn/r_unvalidated_trust_crossstage_vulnerabilities_in/)
Posted by **DirkN1** · **182↑** · **7 comments**

I found in another reddit forum a research paper that is interesting. It shows that LLMs handle output data not neutrally and that it's possible to execute commands. The author shows over 35 ways to do it, that's scary for everyone using LLMs in automated workflows or for Tool calls. I never thought the LLMs were so susceptible to semantics.

Also, he shows a way that you can execute commands just based on the form of the prompt or use a "prompt shell" to hijack the context in LLMs. There is also a way to bypass the CoT monitoring that jailbreaks the LLM.

I reconstructed some patterns on an offline model and I must say it worked, but the output code was not useful.

  
Here the paper: [https://arxiv.org/abs/2510.27190](https://arxiv.org/abs/2510.27190)

## Comments

- **drc1728** (8↑): Yeah, this line of research is becoming more important. A lot of people assume LLM outputs are “just text,” but models absolutely don’t treat structure neutrally. Small shifts in semantics, formatting, or role‑like phrasing can change how the model interprets intent. That’s exactly why automated workflows and tool-calling chains are so fragile.

The “prompt shell” idea in the paper isn’t surprising once you think of LLMs as pattern completers. If a model has seen enough examples where certain structures act like execution blocks, it will naturally fall into that pattern even if there is no explicit instruction. Same with the CoT bypass. CoT is just a reasoning style, not a sandbox, so you can often redirect or suppress it with the right structural cues.

From an engineering standpoint, the key takeaway is that you can’t rely on surface-level checks. Guardrails that look safe in isolation fall apart once you introduce multi-turn state, memory, or compositional prompts. This is why production agent systems need deeper evaluation than simple jailbreak tests. You have to look at how models behave across tool calls, context accumulation, and semantic shifts, not just the final answer.

We’ve seen the same issues when evaluating agentic pipelines: tool-call schemas get hijacked, validation relies on brittle string patterns, and control tokens bleed into the model’s reasoning. Modern systems need semantic monitors that understand behavior patterns, not just syntax. That’s where platforms like CoAgent (coa.dev) focus, continuous checks across reasoning steps, not just the output.

It’s good that you tested some of the patterns offline. A lot of these exploits trigger behavioral shifts but don’t produce useful code, which shows the model is susceptible but not fully “executable.” Still, susceptibility alone is enough to cause problems in automated workflows.

In short: this paper reinforces what many practitioners are already seeing. LLMs don’t just predict words, they predict behavior implied by structure. And that makes safety dependent on evaluation and monitoring, not just prompt hardening.
- **Electronic-Tie5120** (1↑): \>LLM prompting

i sleep
