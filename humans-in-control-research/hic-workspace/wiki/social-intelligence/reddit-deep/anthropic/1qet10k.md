---
id: social-intelligence/reddit-deep/anthropic/1qet10k.md
url: "https://www.reddit.com/r/Anthropic/comments/1qet10k/how_do_teams_manage_shared_context_on_claude_code/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "How do teams manage shared context on Claude Code"
author: "Creepy-Row970"
date: "2026-01-16T21:37:51.000Z"
score: 12
upvote_ratio: 0.93
num_comments: 11
flair: "Other"
extracted_at: "2026-05-11T17:26:51.916Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, enterprise_it, workforce]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/anthropic/1qet10k.md#c0"
    char_span: [0, 2154]
    sentence_count: 16
    key_terms: [across, context, claude, shared, https, code, sessions, memory]
    concepts: [across, context, claude, shared, https]
    related_chunks: ["social-intelligence/reddit-deep/anthropic/1qet10k.md#c2"]
    token_count: 491
    sources: [{"n":"reddit-deep: r/anthropic","u":"https://www.reddit.com/r/Anthropic/comments/1qet10k/how_do_teams_manage_shared_context_on_claude_code/"}]
  - id: "social-intelligence/reddit-deep/anthropic/1qet10k.md#c1"
    char_span: [2168, 3787]
    sentence_count: 12
    key_terms: [context, chunkhound, burning, deleted, through, claude, demand, notion]
    concepts: [context, chunkhound, burning, deleted, through]
    section: Comments
    token_count: 384
  - id: "social-intelligence/reddit-deep/anthropic/1qet10k.md#c2"
    char_span: [3789, 4568]
    sentence_count: 6
    key_terms: [markdown, claude, folder, shared, file, mutationobserver, documentation, local-first]
    concepts: [markdown, claude, folder, shared]
    related_chunks: ["social-intelligence/reddit-deep/anthropic/1qet10k.md#c0"]
    section: Comments
    token_count: 156
---
# How do teams manage shared context on Claude Code

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1qet10k/how_do_teams_manage_shared_context_on_claude_code/)
Posted by **Creepy-Row970** · **12↑** · **11 comments**

From last year, we have been a heavy Claude Code users in our organization. We do use a lot of powerful features of CC including sub/parallel agents, MCP, Agent Skills. In addition, the planning mode has greatly improved to help with spec driven development.

In our company, we’re trying to standardize how Claude Code is used and identify how its context is preserved or shared across different teams, and across repos. I was going through multiple approaches about it and here are a few of them which I felt were worth sharing:

1. I found [this](https://x.com/ashpreetbedi/status/2010131000886436037?s=20) from the tweet from Agno's founder directly using markdown files. The idea was to treat CC like a collaborator who reads structured docs, not chat history. They have a git repo containing these md files, which is symlinked into the actual codebase, but gitignored. Thus, it is invisible to Git but visible to CC as context.
2. [claude-mem](https://github.com/thedotmack/claude-mem) approach was opposite. It captures everything Claude does during coding sessions, compresses it using an agent, and reinjects relevant memory into future sessions. I found this interesting because there is almost zero manual effort involved in setting it up and it is pretty straightforward for individual workflows. But I didn't find any team-wide feature which catered to our team's usecase.
3. I also came across [ByteRover](https://www.byterover.dev/) which is a shared, self-improving memory system for AI coding agents. It caught our team's attention because it treats context as a first-class, shared asset across, projects, repos, engineers and sessions. So it was more suitable for our team since it can be shared across the different teams and not just act as an individual memory.

WOuld love to know how you folks manage context for Claude Code across your team, or if there are any better approaches.

## Comments

- **fynn34** (2↑): Skills. They are designed to have all the info you need in reference files with progressive disclosure. I have my entire component library and every shared repo with different skills it can access on demand as needed
- **[deleted]** (1↑): Following. Just got started on Notion MCPs. The connectivity is amaaazing for centralizing stuff and our PM system but I’m burning through context like crazy.
  - **jcumb3r** (3↑): Since you mentioned burning through context… a tip, Notion’s MCP is a giant context hog and insanely verbose.  It’s a lot more efficient to ask Claude to write itself a skill with their API for common actions and avoid the MCP.  It doesn’t take long and is good enough for most activities.
    - **[deleted]** (1↑): Thx!
- **sfboots** (1↑): You might check out Beads.  It’s new way of managing Claude todos for spec driven development.  . I’ve not used it.
- **Impossible_Hour5036** (1↑): What sort of team-wide feature should you be looking for exactly?
- **Funny-Anything-791** (1↑): You might want to give [ChunkHound](https://chunkhound.github.io/) a try. It's an open source local-first codebase intelligence that enables extracting "core-dev-level" insights on demand which means they're always up to date with the current code.
- **pbalIII** (1↑): Ran into the maintenance ceiling with markdown docs last quarter. It works for a few repos, but keeping those files updated manually eventually slows down the workflow as the mental load climbs. Automated tools like ByteRover solve the manual toil, though the history can get noisy if you don't have a solid pruning strategy.

Try letting Claude fetch semantic chunks through a custom Skill instead of shoving everything into one file. It turns your documentation into a dynamic index that only pulls relevant snippets based on the task intent. This keeps your shared context fresh without the chore of syncing markdown docs across repos.
- **StudyOk2682** (1↑): Since you’re already in the Anthropic ecosystem, you might find that a local-first approach sidesteps the plugin headaches entirely. I keep a folder of Markdown files generated by ChatGPT Toolbox, and its MutationObserver ensures I never miss a critical reasoning step. That folder acts as a single source of truth that Claude can read directly via file import, no MCP required. For teams, we just stash it on a shared drive and symlink it in.
