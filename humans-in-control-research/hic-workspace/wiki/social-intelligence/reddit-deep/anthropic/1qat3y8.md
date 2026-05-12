---
url: "https://www.reddit.com/r/Anthropic/comments/1qat3y8/how_claude_code_context_is_structured_main/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "How Claude Code context is structured (main context, sub-agents, tools)"
author: "SilverConsistent9222"
date: "2026-01-12T12:03:13.000Z"
score: 7
upvote_ratio: 0.89
num_comments: 2
flair: "Resources"
extracted_at: "2026-05-11T17:26:51.920Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# How Claude Code context is structured (main context, sub-agents, tools)

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1qat3y8/how_claude_code_context_is_structured_main/)
Posted by **SilverConsistent9222** · **7↑** · **2 comments**

I kept getting confused about how Claude Code decides what to do when using CLAUDE MD, sub-agents, and tools.

This diagram helped me think about it as layers:  
– main project context  
– task routing with sub-agents  
– commands and execution tools

Posting it here in case it helps others.

If anything here is off, happy to correct it.

https://preview.redd.it/std054p2swcg1.png?width=850&format=png&auto=webp&s=f37f8ef01dc84a943af5aa19f2af8e3c4aaadaaa

## Comments

- **cartazio** (1↑): claude code injects strings thst say your claude md isnt super impirtant :)
- **SilverConsistent9222** (1↑): There’s a longer breakdown with CLI, sub-agents, hooks, and MCP examples.  
Sharing here in case it’s useful:  
[https://youtube.com/playlist?list=PL-F5kYFVRcIvZQ\_LEbdLIZrohgbf-Vock&si=8Sv2IB64T1fhcU-7](https://youtube.com/playlist?list=PL-F5kYFVRcIvZQ_LEbdLIZrohgbf-Vock&si=8Sv2IB64T1fhcU-7)
