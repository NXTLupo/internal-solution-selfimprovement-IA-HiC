---
id: articles/reddit-claude/f363edafd7.md
url: "https://reddit.com/r/claude/comments/1spef7j/my_full_claude_code_setup_after_months_of_daily/"
url_hash: "f363edafd7"
kind: "article"
source: "reddit: claude"
title: "My full Claude Code setup after months of daily use — context discipline, MCPs, memory, subagents"
author: ""
date: "2026-04-19T00:44:19.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T13:51:31.452942+00:00"
chars: 4047
industries: [ai_research, saas]
industry_method: llm
chunks:
  - id: "articles/reddit-claude/f363edafd7.md#c0"
    char_span: [0, 2257]
    sentence_count: 28
    key_terms: [claude, memory, context, discipline, session, without, verification-before-completion, hard]
    concepts: [claude, memory, context, discipline, session]
    token_count: 499
    sources: [{"n":"reddit: claude","u":"https://reddit.com/r/claude/comments/1spef7j/my_full_claude_code_setup_after_months_of_daily/"}]
  - id: "articles/reddit-claude/f363edafd7.md#c1"
    char_span: [2259, 4270]
    sentence_count: 23
    key_terms: [claude, verification-before-completion, claude-flow, github, memory, consultation, superpowers, code]
    concepts: [claude, verification-before-completion, claude-flow, github, consultation]
    token_count: 493
---
# My full Claude Code setup after months of daily use — context discipline, MCPs, memory, subagents

Source: [reddit: claude](https://reddit.com/r/claude/comments/1spef7j/my_full_claude_code_setup_after_months_of_daily/)

Stop blaming Claude. Your harness is the problem.

I've been running Claude Code on Opus 4.7 for 8+ hours a day on Max 5x. Zero quota issues. Here's what I actually did.

Most people complaining about Claude "going dumb" or "eating tokens" set it up like this: no memory, no tools, no rules, dump 40 files into one context window, then wonder why it hallucinates. That's not a Claude problem.

Context discipline cuts token usage roughly in half

Put a CLAUDE.md at your repo root. Stack overview, ownership matrix, hard rules — run tsc --noEmit after every edit, max 50 lines per bugfix, one fix per commit, never touch auth/Stripe/middleware without explicit approval. It loads every session. Claude stops asking the same questions.

Persistent memory lives at ~/.claude/projects/yourproject/memory/ — typed markdown files with prefixes like user_, feedback_, project_, reference_. Keep an index in MEMORY.md. You stop re-explaining your project at the start of every conversation.

Biggest single quota win: subagents for grep-work. Spawn an Explore or general-purpose agent to do the file-digging. They burn their own context, return a summary. Your main window stays clean.

Workflow discipline is where most setups fall apart

Auto-retros after every non-trivial session. Save them to docs/retros/YYYY-MM-DD-topic.md. The next session loads the latest retro automatically — continuity without re-briefing.

verification-before-completion as a hard rule. Claude cannot say "done" or "fixed" without running the verify command and showing you the output. Kills hallucinated success completely.

Atomic commits, one fix per commit, hard line limits. Clean history, easy rollback, and it forces Claude to actually scope its work.

For architecture decisions or anything involving security/migrations: one phrase triggers Claude to spawn Gemini Pro + Flash + Sonnet in parallel and synthesize. Three independent reads are better than one confident monologue.

MCP servers — let it act instead of copy-pasting

The ones I actually use:

- supabase — SQL, migrations, schemas directly from chat
- github — PRs, diffs, issues, file reads
- chrome-devtools-mcp + playwright — Claude can browse your deployed site, take screenshots, evaluate JS. It QAs itself.
- context7 — current library docs, not stale training data. Kills a specific class of hallucination entirely.
- firecrawl — on-demand scraping
- sentry — production errors read and triaged from chat
- gemini MCP — powers the multi-model consultation panel

OSS worth actually installing

graphify — takes any input (code, docs, papers, images) and produces a clustered knowledge graph as HTML + JSON. On large repos, Claude reads the graph instead of 200 files. Massive.

claude-flow — swarm orchestration, hooks, memory coordination, SPARC, TDD, code review swarms. github.com/ruvnet/claude-flow

Superpowers skills — search "superpowers skills claude code" on GitHub. The ones I use most: systematic-debugging, verification-before-completion, dispatching-parallel-agents, test-driven-development.

CodeRabbit skill reviews diffs and auto-fixes review comments. Claude Retrospective skill generates the retros mentioned above.

Hooks automate the grunt work

PreToolUse, PostToolUse, SessionStart, PreCompact, Stop. Auto-save memory, auto-run tsc on edits, sync state before compaction. Claude thinks, the harness does the janitor work.

TL:DR!

1. Write CLAUDE.md
2. Turn on persistent memory
3. Install graphify + claude-flow + 6-7 MCPs
4. Auto-retros + verification-before-completion as non-negotiables
5. Subagents for grep and file exploration
6. 50-line limit per bugfix
7. Consultation panel for hard calls

5+ hours a day, ~250 tool calls per session, atomic commits, full deploy → screenshot → verify cycles. Max 5x, no quota hit.

Claude isn't the problem. The harness is!

EDIT: https://github.com/anothervibecoder-s/claudecode-harness

I made a claude.md example based on my CLAUDE.md file, you can tell claude to fill this based on your projects! 

If it helped, just star it!
