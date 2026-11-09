---
id: social-intelligence/reddit-deep/chatgptcoding/1vyzagg.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1vyzagg/long_codexclaude_runs_were_turning_into/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "Long Codex/Claude runs were turning into unreviewable marathon chats, so I moved the shift state to disk"
author: "orwamahmoud"
date: "2026-08-26T14:51:52.000Z"
score: 10
upvote_ratio: 0.81
num_comments: 10
flair: "Resources And Tips"
extracted_at: "2026-10-09T16:37:34.761Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vyzagg.md#c0"
    char_span: [0, 1913]
    sentence_count: 9
    key_terms: [decisions, shift, run, conversation, working, chatgptcoding, agent, state]
    concepts: [decisions, conversation, shift, chatgptcoding, working]
    token_count: 432
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vyzagg/long_codexclaude_runs_were_turning_into/","kind":"social-post","date":"2026-08-26","author":"orwamahmoud","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vyzagg.md#c1"
    char_span: [1915, 3944]
    sentence_count: 7
    key_terms: [nightshift, stop, recovery, product, shifts, open-ended, evolution, history]
    concepts: [nightshift, recovery, product, shifts, open-ended]
    token_count: 434
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vyzagg/long_codexclaude_runs_were_turning_into/","kind":"social-post","date":"2026-08-26","author":"orwamahmoud","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vyzagg.md#c2"
    char_span: [3959, 6134]
    sentence_count: 9
    key_terms: [nightshift, claude, hook, command, orwamahmoud, guard, already, kantorcodes1]
    concepts: [nightshift, claude, orwamahmoud, command, guard]
    section: Comments
    token_count: 512
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vyzagg/long_codexclaude_runs_were_turning_into/","kind":"social-post","date":"2026-08-26","author":"orwamahmoud","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vyzagg.md#c3"
    char_span: [5858, 6658]
    sentence_count: 5
    key_terms: [review-contract, approval, already, human, scope, shift, idea, too]
    concepts: [review-contract, approval, already, human, scope]
    section: Comments
    token_count: 172
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vyzagg/long_codexclaude_runs_were_turning_into/","kind":"social-post","date":"2026-08-26","author":"orwamahmoud","subreddit":"chatgptcoding"}]
---
# Long Codex/Claude runs were turning into unreviewable marathon chats, so I moved the shift state to disk

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1vyzagg/long_codexclaude_runs_were_turning_into/)
Posted by **orwamahmoud** · **10↑** · **10 comments**

I use coding agents for multi-hour runs, and after a while, I kept hitting the same problem:

The agent may still be working, but I have no clean way to answer basic questions without digging through a huge conversation:

* What is actually finished?
* What is it working on right now?
* What got blocked?
* What decisions did it make?
* What did it try and reject?
* If the session dies, where exactly should the next one continue?

Context compaction makes that worse because the conversation itself becomes a pretty fragile place to keep the run’s state.

So I started treating a long agent run less like a chat and more like an **engineering shift**.

That became **Nightshift**.

The main idea is simple: **the work contract and run state live on disk, not only in the conversation.**

A shift can be:

* **A detailed checklist** that stays open until every contracted item is complete.
* **An open-ended goal with an hour budget** that keeps discovering and working until quitting time.

During the run, I can open the files and see what is done, what is active, what is parked or blocked, and what decisions were made — without scrolling through hours of chat.

After the run, those same files become the reviewable record: commits, decisions, snags, logs, receipts, remaining work, and how the shift ended.

If I accept the branch — or even decide not to merge it — I can archive the shift. Over time that gives me a durable history of previous runs: what changed, what was rejected, what decisions were made, and what happened to each piece of work.

# There is also an enforcement layer around the agent

* A **Stop hook** prevents the session from quietly ending while contracted checklist items remain.
* `AskUserQuestion` is blocked by default during unattended shifts; the model makes its best decision, records it, and keeps working instead of waiting for me.
* Owner-defined safety rules can mechanically deny commands, protected paths, wrong commit identities, or forbidden diff patterns.
* An external watchman handles recovery. On Claude Code, it can detect structured failures such as `API Error: 500` and keep retrying recovery when the API comes back. On Codex, it can recover sessions that are proven dead and resume the recorded session.

# How is this different from /goal or a long prompt?

`/goal` is useful if what you need is:

**keep working toward this objective.**

Nightshift is the harness around that run:

**persistent state, enforcement, recovery, observability, and a reviewable history afterward.**

A prompt can ask the model not to stop.

A Stop hook can actually refuse the stop.

Nightshift also ships reusable shifts for things like:

* test coverage
* defect hunting
* quality debt
* dependency updates
* codebase review
* **Product Evolution**

Product Evolution is an open-ended shift that researches the product, its history, users, and comparable approaches, ranks evidence-backed opportunities, and works on the strongest improvements within a time budget.

A side effect I’ve ended up liking: if I have usage about to reset and no backlog ready, I can give one of these open-ended shifts a few hours instead of simply losing the allowance.

Nightshift runs locally from the same plugin package on **Codex and Claude Code**.  


[GitHub - Free, open source, MIT licensed](https://github.com/orwa-mahmoud/nightshift)     
  
[Official OpenAI Plugin Directory](https://chatgpt.com/plugins/plugins_6a7c58f65d708191b3a705a8625baffe)



I maintain the project, and I’d especially like feedback from people who already leave coding agents running for hours: where does your workflow still fall apart?

## Comments

- **Suspicious_Abroad782** (2↑): Ooh that external watchman for dead sessions is the killer feature I didn't know I needed
  - **orwamahmoud** (1↑): One night Claude hit a 500 right before I was going to sleep and start an overnight run. I ended up watching [status.claude.com](http://status.claude.com/) and retrying until it came back. Next day I added the watchman
  - **Real-Service-8135** (1↑): right? the number of times ive come back to a silently dead session is embarrassing
- **kantorcodes1** (2↑): the command/path deny layer is the bit i'd hook into hol-guard instead of growing a second policy engine. nightshift already owns the command hook, so the integration should live there. have that hook ask guard before exec and keep your recovery/state stuff exactly where it is.
  - **orwamahmoud** (1↑): Thanks — I actually didn’t know about HOL Guard. I’m going to dig into it.  
My main goal with Nightshift was to avoid adding another npm/CLI layer and keep it as a native plugin that augments the Claude Code and Codex ecosystems through their own hooks.
    - **kantorcodes1** (1↑): yeah that's the better fit. don't turn nightshift into a guard extension. if you already see the command in the claude/codex hook, wire guard there and keep the rest of nightshift native.
- **chem0924** (2↑): One extra artifact that might make the shift files even more reviewable: a small review contract that is created at the start and updated at stop time. For each changed surface, list the intended scope, the verification artifact/command that proves it, and anything explicitly out of scope. The disk state answers "what happened"; the review contract answers "is this the change I meant to accept?" That seems especially useful for long unattended runs where an agent may make opportunistic cleanups. I would also split recorded decisions into reversible vs API/data-migration/security-affecting decisions, so the Stop hook can require human approval only for the latter instead of treating every uncertainty the same way.
  - **orwamahmoud** (1↑): I like the review-contract idea. Some of it overlaps with the scope/Verify fields already in the punch list, and owners can already define their own quality checks per item or for the whole shift, but making “intended / verified / explicitly out of scope” a clear end-of-shift review artifact could make the handoff much better.  
The reversible vs high-impact decision split is interesting too. I probably wouldn’t make an unattended shift wait for human approval by default, but since these controls are optional today, it makes sense to add it as another option.  
I’d be very happy if you wanted to contribute the review-contract idea too.
