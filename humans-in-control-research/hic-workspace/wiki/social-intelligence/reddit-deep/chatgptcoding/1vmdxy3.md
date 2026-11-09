---
id: social-intelligence/reddit-deep/chatgptcoding/1vmdxy3.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1vmdxy3/whats_your_actual_system_for_two_agents_on_one/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "whats your actual system for two agents on one repo, because mine just failed"
author: "Specialist_Agent3599"
date: "2026-08-12T13:19:17.000Z"
score: 10
upvote_ratio: 1
num_comments: 14
flair: "Resources And Tips"
extracted_at: "2026-10-09T16:37:34.760Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vmdxy3.md#c0"
    char_span: [0, 1658]
    sentence_count: 10
    key_terms: [chatgptcoding, agent, file, repo, worktrees, comments, because, neither]
    concepts: [chatgptcoding, agent, worktrees, comments, because]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1vmdxy3.md#c1"]
    token_count: 368
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vmdxy3/whats_your_actual_system_for_two_agents_on_one/","kind":"social-post","date":"2026-08-12","author":"Specialist_Agent3599","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vmdxy3.md#c1"
    char_span: [1673, 3786]
    sentence_count: 10
    key_terms: [agent, agents, shared, worktrees, contract, file, ownership, change]
    concepts: [agent, worktrees, agents, shared, contract]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1vmdxy3.md#c0"]
    section: Comments
    token_count: 475
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vmdxy3/whats_your_actual_system_for_two_agents_on_one/","kind":"social-post","date":"2026-08-12","author":"Specialist_Agent3599","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1vmdxy3.md#c2"
    char_span: [3788, 4536]
    sentence_count: 7
    key_terms: [memory, agent, file, searches, audaxic, touches, agents, claude]
    concepts: [memory, agent, searches, audaxic, touches]
    section: Comments
    token_count: 160
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1vmdxy3/whats_your_actual_system_for_two_agents_on_one/","kind":"social-post","date":"2026-08-12","author":"Specialist_Agent3599","subreddit":"chatgptcoding"}]
---
# whats your actual system for two agents on one repo, because mine just failed

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1vmdxy3/whats_your_actual_system_for_two_agents_on_one/)
Posted by **Specialist_Agent3599** · **10↑** · **14 comments**

I finally tried the thing everyone talks about, claude code on the backend task and codex on the frontend task, same repo, same afternoon, and it went fine for about two hours and then it went extremely not fine.

Codex refactored a types file that claude was mid-way through using. Neither of them errored. They just kept going, each convinced the file was what they last saw, and I merged the first branch without noticing the second one had quietly built on a version that no longer existed. Took me most of the next morning to untangle which changes were real.

The dumb part is I knew this could happen and did it anyway because the speed is genuinely addictive when it works.

What ive tried since. Separate worktrees, which fixes the overwriting but now neither agent knows what the other one did, so they duplicate stuff. A little shared markdown file both agents are told to update, which works until one forgets. And ive been running them inside coldtea ai this week, which does the coordination part properly since thats kind of its whole thing, though its mac only and the qa agent it ships with flags more than i want on a prototype repo.

honestly none of these feel like the obvious winner yet.

so what are you all actually doing? one agent at a time and accepting the speed loss? worktrees and eating the duplication? or is there a setup i havent found

## Comments

- **michal-rd** (2↑): Worktrees solve file collisions, but not coordination. I think the missing piece is explicit ownership of shared contracts.

Before parallelizing, I’d have one agent define the API/types first, review and commit them, then give each agent a separate worktree with non-overlapping file ownership. Shared files have one designated owner; the other agent can propose changes but not edit them.

Before merging, rebase the second branch onto the first and make that agent rerun tests and review its diff against the updated contract.

It reduces some parallelism, but still seems faster than letting both agents independently “coordinate” through a markdown file. If both tasks need to modify the same types, they probably aren’t independent enough to run concurrently.
- **popiazaza** (1↑): Just let your main agent control two (or more) sub agents.
- **BarracudaMean9308** (1↑): honestly i just do one at a time and accept the speed loss. having two agents loose in the same repo just turns you into a full-time git conflict referee for bots.
- **SSShken** (1↑): Worktrees fix the file collisions and leave the real one alone: neither agent has a durable record of what the shared contract currently is, so both are working from a snapshot taken whenever their session started. What helped me was keeping the contract in a file that neither agent writes to, and treating a change to it as a separate step that happens before either of them runs. Slow, but the alternative is finding out at merge. Was yours a type change, or did the two just diverge on what the shape was supposed to be?
- **Ill_Dragonfruit_3547** (1↑): Two agents, one cup
- **clamshell_dev** (1↑): worktrees stop the collision, but you still need ownership. define the shared types first, commit them, then give each agent a disjoint path list. if both tasks need to change the same contract, they probably aren't ready to run in parallel yet
- **efebilici** (1↑): I have not run two agents on one repo at the same time myself, but based on what fixed single agent forgetting for me, I would do worktrees plus shared memory.

For a single agent I always use continue compacted, but it was not feeling like continuing the same session, so I built a persistent memory outside chat that the agent searches before it touches a file. That is what stopped the quiet rebuilds.

For two agents I would give both the same memory. Before Claude touches types it searches, if Codex already refactored that file and saved it as a memory, Claude sees it instead of building on a version that no longer exists. That is how I would suggest handling your types file case.

I built that memory layer for my own coding agent work as Audaxic Memory (https://memory.audaxic.com). I have not tested the two at once part myself yet, but it is designed to follow both agents so they share context.
