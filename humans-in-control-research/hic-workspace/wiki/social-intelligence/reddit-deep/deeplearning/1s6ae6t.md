---
id: social-intelligence/reddit-deep/deeplearning/1s6ae6t.md
url: "https://www.reddit.com/r/deeplearning/comments/1s6ae6t/gave_a_claude_code_agent_access_to_2m_cs_papers/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Gave a Claude Code agent access to 2M CS papers during autoresearch — it found techniques from 2025 papers and beat the baseline agent by 3.2%"
author: "kalpitdixit"
date: "2026-03-28T20:01:06.000Z"
score: 75
upvote_ratio: 0.92
num_comments: 5
flair: ""
extracted_at: "2026-05-11T17:26:50.047Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, education]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1s6ae6t.md#c0"
    char_span: [0, 1816]
    sentence_count: 13
    key_terms: [papers, techniques, agent, paper, without, access, agents, autoresearch]
    concepts: [papers, techniques, agent, paper, without]
    token_count: 436
    sources: [{"n":"reddit-deep: r/deeplearning","u":"https://www.reddit.com/r/deeplearning/comments/1s6ae6t/gave_a_claude_code_agent_access_to_2m_cs_papers/"}]
  - id: "social-intelligence/reddit-deep/deeplearning/1s6ae6t.md#c1"
    char_span: [1830, 2605]
    sentence_count: 4
    key_terms: [hindsight, vectorize-io, kalpitdixit, scholarship, literature, relevant, access, github]
    concepts: [hindsight, vectorize-io, kalpitdixit, scholarship, literature]
    section: Comments
    token_count: 200
---
# Gave a Claude Code agent access to 2M CS papers during autoresearch — it found techniques from 2025 papers and beat the baseline agent by 3.2%

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1s6ae6t/gave_a_claude_code_agent_access_to_2m_cs_papers/)
Posted by **kalpitdixit** · **75↑** · **5 comments**

Ran a simple experiment: two Claude Code agents optimizing a small GPT on TinyStories using autoresearch. Same everything except one agent could search 2M+ CS research papers before trying each technique.

**Without papers:** standard ML playbook. Batch size tuning, weight decay, gradient clipping, SwiGLU. 3.67% improvement.

**With papers:** agent searched the literature before each idea. 520 papers considered, 25 techniques tried:

- AdaGC — adaptive gradient clipping (Feb 2025 paper, not in Claude's training data)
- sqrt batch scaling rule
- REX learning rate schedule
- WSD cooldown

4.05% improvement. 3.2% better. Gap was still widening at the 2-hour mark.

Best part: both agents tried halving the batch size. Without papers, it didn't adjust the learning rate and diverged. With papers, it found the sqrt scaling rule, applied it first try, then halved again successfully.

Not everything worked — DyT and SeeDNorm were incompatible with the architecture. But the techniques that did work were unreachable without paper access.

This was on a 7M param model in the most well-explored setting in ML. On less-explored problems the gap would likely be bigger.

The paper search tool is an MCP server I built called Paper Lantern. Free to try: https://code.paperlantern.ai

Full writeup with all 15 citations: https://www.paperlantern.ai/blog/auto-research-case-study

Has anyone else experimented with giving LLM agents access to literature during training runs?

## Comments

- **reddit_wisd0m** (9↑): Nice. Great experience. I would give you a scholarship if I had one.
  - **kalpitdixit** (4↑): haha - thanks u/reddit_wisd0m 

we'd love a scholarship :)

in case you try it out - we'd also love any feedback - to make things better :)
- **nicoloboschi** (2↑): That's an impressive jump in performance by providing the agent with access to relevant literature. Since you're already exploring memory-augmented agents, it's worth comparing your approach to Hindsight, a fully open-source memory system that is designed to keep context relevant over long runs. [https://github.com/vectorize-io/hindsight](https://github.com/vectorize-io/hindsight)
  - **kalpitdixit** (1↑): interesting
- **snekslayer** (1↑): How do you give the agent literature access?
