---
url: "https://www.reddit.com/r/Anthropic/comments/1qxed1y/opus_46_breakdown_1m_context_window_compaction/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "Opus 4.6 breakdown -- 1M context window, Compaction API, adaptive thinking, and the breaking changes"
author: "prakersh"
date: "2026-02-06T10:44:54.000Z"
score: 36
upvote_ratio: 0.86
num_comments: 6
flair: "Announcement"
extracted_at: "2026-05-11T17:26:51.916Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Opus 4.6 breakdown -- 1M context window, Compaction API, adaptive thinking, and the breaking changes

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1qxed1y/opus_46_breakdown_1m_context_window_compaction/)
Posted by **prakersh** · **36↑** · **6 comments**

Went through the docs and announcement. Here's what actually matters in Opus 4.6:


**1M context window (beta)**
76% retrieval accuracy on MRCR v2 (8-needle, 1M variant). Sonnet 4.5 scored 18.5% on the same test. Actual retrieval holds up across the full window. Available on API and Enterprise only -- prompts over 200K tokens cost 2x ($10/$37.50 per M tokens).


**Compaction API**
Auto-summarizes older conversation segments when context approaches the limit. Long agentic tasks keep running instead of dying mid-execution. If you've had Claude Code lose track during a multi-file refactor, this addresses it.


**Adaptive thinking effort levels**
Four levels: low / medium / high / max. Match reasoning depth to the task. A quick classification doesn't need the same compute as debugging a race condition. Replaces the old `budget_tokens` approach (now deprecated).


**Agent teams in Claude Code**
Parallel agents on independent subtasks. Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to enable. One session leads, assigns work, teammates run in separate context windows. Token usage scales with active teammates.


**128K max output**
Doubled from 64K. SDKs require streaming for large `max_tokens` values to avoid HTTP timeouts.


**Breaking changes**
Prefilling assistant messages returns a 400 error. No deprecation period. If your integration uses prefills for JSON output or format steering, migrate to structured outputs or system prompt instructions.


**Benchmarks**
GDPval-AA: 144 Elo ahead of GPT-5.2. Humanity's Last Exam: 53.1% with tools. BrowseComp: 84.0%. Terminal-Bench 2.0: 69.9% (GPT-5.3-Codex leads at 75.1%).


**The tradeoff**
Writing quality took a hit. Multiple threads already calling it nerfed for prose. RL optimizations for reasoning likely came at the cost of writing fluency. Keep 4.5 for long-form writing tasks.

## Comments

- **LoveMind_AI** (8↑): I’m glad I’m not alone on the writing. I’m planning on just switching from 4.5 to 4.6 whenever I hit 200K.
  - **LieutenantStiff** (1↑): Yep. First thing I noticed was the writing feeling..different.
    - **Projected_Sigs** (2↑): Was that with prose style writing or summarization.    

Claude output quality has always been far superior for summarizing complex technical output... when I would lay out the same long,  difficult task in GPT 5.2 and Opus 4.x

I really hope that wasnt lost.  That is huge, but summarization and writing seem like the same machinery.
- **prakersh** (4↑): Wrote a detailed breakdown covering all the benchmarks, pricing tiers (including the 2x long-context surcharge), the GPT-5.3-Codex comparison that dropped 27 minutes later, market impact, and the full API migration guide for prefill removal and adaptive thinking [https://onllm.dev/blog/claude-opus-4-6](https://onllm.dev/blog/claude-opus-4-6)
