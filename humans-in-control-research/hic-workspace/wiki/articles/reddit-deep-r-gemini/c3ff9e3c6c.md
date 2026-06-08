---
id: articles/reddit-deep-r-gemini/c3ff9e3c6c.md
url: "https://www.reddit.com/r/Gemini/comments/1rqmtdz/i_built_acploop_a_recurring_prompt_scheduler_for/"
url_hash: "c3ff9e3c6c"
kind: "article"
source: "Reddit Deep: r/gemini"
title: "I built acp-loop: a recurring prompt scheduler for ACP agents"
author: ""
date: "2026-03-11T07:06:03.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:33:48.812573+00:00"
chars: 895
industries: [ai_research, saas]
industry_method: llm
chunks:
  - id: "articles/reddit-deep-r-gemini/c3ff9e3c6c.md#c0"
    char_span: [0, 1095]
    sentence_count: 4
    key_terms: [gemini, acp-loop, interval, deploy, recurring, succeeded, workflows, comments]
    token_count: 287
---
# I built acp-loop: a recurring prompt scheduler for ACP agents

Source: [Reddit Deep: r/gemini](https://www.reddit.com/r/Gemini/comments/1rqmtdz/i_built_acploop_a_recurring_prompt_scheduler_for/)

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

--- TOP COMMENTS ---
[1↑ johnnyhonda] I think you're in the wrong sub dawg. This is Gemini the exchange I think you're looking for r/GeminiAI/
