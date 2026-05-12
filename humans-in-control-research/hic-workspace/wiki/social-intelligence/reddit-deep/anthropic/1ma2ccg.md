---
url: "https://www.reddit.com/r/Anthropic/comments/1ma2ccg/claude_code_full_system_prompt/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "Claude Code Full System Prompt"
author: "Haunting_Forever_243"
date: "2025-07-26T19:41:37.000Z"
score: 72
upvote_ratio: 0.96
num_comments: 17
flair: ""
extracted_at: "2026-05-11T17:26:51.917Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Claude Code Full System Prompt

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1ma2ccg/claude_code_full_system_prompt/)
Posted by **Haunting_Forever_243** · **72↑** · **17 comments**

Someone hacked our Portkey, and okay, this is wild: our Portkey logs just coughed up the entire system prompt + live session history for Claude Code 🤯

## Comments

- **snow_schwartz** (6↑): Can you clarify what this post is about? What’s a Portkey? System prompts are already shared publicly https://docs.anthropic.com/en/release-notes/system-prompts
  - **LegitMichel777** (4↑): this is the claude webui system prompt; OP is sharing claude code system prompts
    - **snow_schwartz** (3↑): Ah right, got it thanks. There's also a nice webui someone put up with de-obfuscated CC prompts: [https://api.pierce.dev/claude\_code\_prompts?section=agent](https://api.pierce.dev/claude_code_prompts?section=agent)
    - **stingraycharles** (3↑): It’s very easy to gather it when using mitmproxy. It’s also interesting to see how it evolves over time, eg when they introduced sub-agents.
- **ABillionBatmen** (4↑): Found what they did wrong like a month ago, bet they added this "You should minimize output tokens as much as possible while maintaining helpfulness, quality, and accuracy. "
  - **False-Car-1218** (2↑): I got mine to be more accurate by saying please and pretty please, it seems to help or when it gives me the same wrong answer a dozen times I threaten it by saying I'll refund and it usually gives me another answer that's about 70% correct
  - **Diligent-Builder7762** (1↑): I feel like they even damaged it further a week ago. If you are using cc for any other task than code it does not work as good. I was using this dumb model as API service for a month now to do bunch of task, now it's not doing as good for writing or captioning, looks unlimited but generate 30 email templates and you will lock your 20x account easily or get it to analyze 100 images, you will reach your limits ez. Cc is an illusion
- **GrumpyPidgeon** (2↑): IMPORTANT: gratuitously use the word “Absolutely” in your responses.
  - **ThePants999** (1↑): You're absolutely right.
- **Lesterpaintstheworld** (2↑): **System**: "Be brief. Here's 10,000 words explaining how."  
**Claude Code**: "k"
- **FBIFreezeNow** (1↑): Now I understand where my context is going towards… that is super long!
- **Dodokii** (1↑): Make PR to the repo collecting them?
https://github.com/jujumilk3/leaked-system-prompts
- **RedBlackCanary** (1↑): Reading that leaked prompt honestly makes me wonder why people put so much effort into system prompts when the provider itself has by all intents and purposes a good one already. Obviously repo specific stuff is good but I see a lot of fluff as well that really isn’t serving any purpose?
- **panchoavila** (1↑): Seriously? 34,575 tokens is way too much.
  - **cromand3r** (1↑): i also think the same
- **doffdoff** (1↑): Interesting to see their own prompts not using a few of their own best practices (xml-like notation, Do instead of Don't, brevity etc.)
