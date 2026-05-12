---
url: "https://www.reddit.com/r/Gemini/comments/1rqmtdz/i_built_acploop_a_recurring_prompt_scheduler_for/"
kind: "social-post"
source: "reddit-deep: r/gemini"
subreddit: "gemini"
title: "I built acp-loop: a recurring prompt scheduler for ACP agents"
author: "femtowin"
date: "2026-03-11T07:06:03.000Z"
score: 1
upvote_ratio: 0.6
num_comments: 1
flair: "Derivatives :Derivatives:"
extracted_at: "2026-05-11T17:27:04.757Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# I built acp-loop: a recurring prompt scheduler for ACP agents

Source: [reddit-deep: r/gemini](https://www.reddit.com/r/Gemini/comments/1rqmtdz/i_built_acploop_a_recurring_prompt_scheduler_for/)
Posted by **femtowin** · **1↑** · **1 comments**

Built a small CLI called \`acp-loop\` for recurring agent prompts.

The idea is simple: if you already use Gemini through an ACP-compatible setup, this lets you run the same prompt on an interval or cron schedule, similar to Claude Code's \`/loop\`.

Examples:

* \`acp-loop --interval 5m "check if deploy succeeded" -a gemini\`
* \`acp-loop --cron "\*/10 \* \* \* \*" "summarize new issues" -a gemini\`
* \`acp-loop --until "deploy succeeded" --interval 1m "check deploy status"\`

Current use cases I have in mind:

* periodic health checks
* polling for new issues / PR updates
* scheduled summaries
* long-running workflows with stop conditions

Curious whether this would be useful to anyone here running Gemini in ACP or similar agent workflows.

## Comments

- **johnnyhonda** (1↑): I think you're in the wrong sub dawg. This is Gemini the exchange I think you're looking for r/GeminiAI/
