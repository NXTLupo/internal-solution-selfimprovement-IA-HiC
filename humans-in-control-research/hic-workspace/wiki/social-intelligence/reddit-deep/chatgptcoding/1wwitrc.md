---
id: social-intelligence/reddit-deep/chatgptcoding/1wwitrc.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1wwitrc/claude_chatgpt_working_together/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "Claude + ChatGPT working together"
author: "Any-Expert-3285"
date: "2026-10-03T09:17:52.000Z"
score: 6
upvote_ratio: 1
num_comments: 12
flair: "Question"
extracted_at: "2026-10-09T16:37:34.759Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1wwitrc.md#c0"
    char_span: [0, 1958]
    sentence_count: 6
    key_terms: [claude, working, projects, together, chatgpt, chatgptcoding, subscription, considering]
    concepts: [claude, working, projects, together, chatgptcoding]
    token_count: 456
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1wwitrc/claude_chatgpt_working_together/","kind":"social-post","date":"2026-10-03","author":"Any-Expert-3285","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1wwitrc.md#c1"
    char_span: [1973, 3564]
    sentence_count: 19
    key_terms: [claude, task, use, folder, odysseus, chatgpt, workers, agents]
    concepts: [claude, folder, odysseus, chatgpt, workers]
    section: Comments
    token_count: 391
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1wwitrc/claude_chatgpt_working_together/","kind":"social-post","date":"2026-10-03","author":"Any-Expert-3285","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1wwitrc.md#c2"
    char_span: [3566, 5138]
    sentence_count: 9
    key_terms: [claude, agents, weekly, requests, context, copying, right-performance-93, codex]
    concepts: [claude, agents, weekly, requests, context]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1wwitrc.md#c3"]
    section: Comments
    token_count: 388
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1wwitrc/claude_chatgpt_working_together/","kind":"social-post","date":"2026-10-03","author":"Any-Expert-3285","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1wwitrc.md#c3"
    char_span: [5140, 6271]
    sentence_count: 7
    key_terms: [claude, codex, plus, account, "doesn't", weekly, new-to-reddit-accoun, worth]
    concepts: [claude, codex, account, "doesn't", weekly]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1wwitrc.md#c2"]
    section: Comments
    token_count: 268
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1wwitrc/claude_chatgpt_working_together/","kind":"social-post","date":"2026-10-03","author":"Any-Expert-3285","subreddit":"chatgptcoding"}]
---
# Claude + ChatGPT working together

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1wwitrc/claude_chatgpt_working_together/)
Posted by **Any-Expert-3285** · **6↑** · **12 comments**

So I have been using the Claude max x5 plan to work on my projects, recently I have been hitting usage limits pretty quick and have to be 1 or 2 days without working every week. To solve this I am considering getting a chatgpt Plus subscription - this was something i was already considering a while back because tbh i dont like to be 100% locked in to a company and i would like some adversarial reviews from different models - I am also very interested in integrating chatGPT subscription with Hermes and exploring that as an orchestrator/manager for my projects

I have a few questions:   
1 - is this the best way in terms of value/money to solve my current problem? I also considered the max 20x Claude but I think that might be overkill and using both providers appeals way more to me tbh

2 - If i do get both Codex and Claude code working together won't they trip over each others work and degrade quality in some ways i might not be seeing right now? And do I just create [AGENTS.md](http://AGENTS.md) files reflecting my current [CLAUDE.md](http://CLAUDE.md) files?   
  
3 - What about all the context that Claude has on my projects from me working solely with him for months? and the Skills in Claude's folder? Is that all transferrable?  
  
Ideally I want both Claude Code and Codex working together seamlessly and driving each other's work quality up, not down  
  
Btw I am not a programmer at all I just got really interested in AI and vibe coding when it started coming out to the public and now i've learned a few things and have a few projects running - The way i use AI is always in VSCode , i am open to the terminal experience as well if that makes any difference but i prefer the more visual interface for now.

## Comments

- **Onesand0** (1↑): For where your at. Yes I suggest having both models. They will walk over eachother if they are unable to communicate effectively. 

I use paperclip for orchestration and dashboard and Odysseus as my "front end"

Claude/gpt code CLI will be more than enough for your current use case. If you dont want to use Odysseus then you can use Hermes, who cares. 

Yes. The Claude files are transferable. They are just text files. Usually its in a Claude folder. If you copy it to an agents folder ALL ai systems will be able to read the skills. 

This is all grossly simplified but I think it helps you move forward
- **xqianliu** (1↑): On #2, yeah they will step on each other if they share one working folder. What fixed it for me was one task per git worktree, so each agent has its own checkout and its own branch, and each task ends as one PR. Nothing gets mixed. For the adversarial review part, I wouldn't have them chat with each other. Let one write, then open a fresh session with the other model and give it only the final diff and what done was supposed to mean for that task. Write that down in the task before anyone starts, otherwise the reviewer just checks whether the code looks nice. On #3, CLAUDE.md is just text, copying the content into AGENTS.md works fine.
- **dvduval** (1↑): What I do is I set Claude opus as the coordinator and then it has a place where it drops off work to be done for ChatGPT Sol workers. The ChatGPT workers are set on timers to check every 20 minutes to see if any work has been replenished in their file. Claude also has a timer. 

The ChatGPT workers create pull requests, but don’t commit them. The Claude coordinator will round up several pull requests and merge them all together at once.
- **Right-Performance-93** (1↑): for the claude.md question, symlink it to agents.md instead of copying so the two never drift apart. then both tools read the same rules
- **MostlyHelpfulLinks** (1↑): Keep them off the same files at the same time: one builds, the other reviews the diff. Copying your CLAUDE.md into an AGENTS.md is a fine start, and have Claude write a project summary file so Codex gets the backstory.
- **Dredyltd** (1↑): 1. Depends One month GPT usage sucs, one month claudes, and mostly both.

2. They will have hard time with ACL on windows - but you will figure that out. I would recommend using both, if one goes in the loop, the other one will find a way. 

3. Both cc and codex have `migrate from another agents` togle or settings
- **Opposite_Might6896** (1↑): Before adding a second provider, find out where the weekly is actually going, because "1-2 days a week without working" usually has a cheaper fix. The weekly charges by cost, and most of the cost is re-reading context: every turn re-sends the whole session. Three checks: how long your sessions run before you compact (past 150k gets expensive per turn), how many subagents you spawn (each is a fresh context written to cache, the priciest token type), and whether the top model is doing work Sonnet could do; on Max it has its own weekly window separate from the all-models one, so you can be out of one and not the other.

On the actual question: a second subscription from any provider gives you a second set of windows that refill independently, so yes, it works as wall-clock relief. What doesn't transfer is context; a task started on one side finishes there. And for adversarial review specifically, a different model family is worth more than a second Claude account would be, so Plus is a reasonable buy for that even if it doesn't fix the limits.
- **Malenx_** (1↑): I like having a lower codex plan for reviews of my claude workers.
- **tianyes** (1↑): We run the same pair, Max 5x for Claude Code and Plus for Codex. One thing worth knowing for your dead days: our Plus account has a few one-off full resets on the usage page, each with an expiry date. Pressing one clears both the 5-hour and the weekly meter, and the weekly clock restarts from that moment. So burn the week first and press one when you're actually stuck, before it expires. The worktree-per-task advice above is what keeps the two from colliding.
- **new-to-reddit-accoun** (1↑): I use Computer Use in the ChatGPT app to have Codex talk to Claude Code VS Extension in Cursor.
