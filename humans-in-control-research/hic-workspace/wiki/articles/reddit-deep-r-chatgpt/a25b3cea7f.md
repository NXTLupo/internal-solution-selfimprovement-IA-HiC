---
id: articles/reddit-deep-r-chatgpt/a25b3cea7f.md
url: "https://www.reddit.com/r/ChatGPT/comments/1s8j27e/someone_just_leaked_claude_codes_source_code_on_x/"
url_hash: "a25b3cea7f"
kind: "article"
source: "Reddit Deep: r/chatgpt"
title: "Someone just leaked claude code's Source code on X"
author: ""
date: "2026-03-31T09:56:22.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T16:59:43.790525+00:00"
chars: 3232
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "articles/reddit-deep-r-chatgpt/a25b3cea7f.md#c0"
    char_span: [0, 1991]
    sentence_count: 8
    key_terms: [claude, https, com, sessions, chatgpt, source, conversation, mode]
    concepts: [claude, https, sessions, chatgpt, conversation]
    token_count: 505
    sources: [{"n":"Reddit Deep: r/chatgpt","u":"https://www.reddit.com/r/ChatGPT/comments/1s8j27e/someone_just_leaked_claude_codes_source_code_on_x/"}]
  - id: "articles/reddit-deep-r-chatgpt/a25b3cea7f.md#c1"
    char_span: [1993, 3423]
    sentence_count: 10
    key_terms: [code, map, source, image, r-chatgpt-1050422060352024636, anthropic, subreddit, concerns]
    concepts: [source, image, anthropic, subreddit, concerns]
    token_count: 364
---
# Someone just leaked claude code's Source code on X

Source: [Reddit Deep: r/chatgpt](https://www.reddit.com/r/ChatGPT/comments/1s8j27e/someone_just_leaked_claude_codes_source_code_on_x/)

Went through the full TypeScript source (\~1,884 files) of Claude Code CLI. Found 35 build-time feature flags that are compiled out of public builds. The most interesting ones:

Download Site: [https://ccleaks.com](https://ccleaks.com)

**BUDDY** — A Tamagotchi-style AI pet that lives beside your prompt. 18 species (duck, axolotl, chonk...), rarity tiers, stats like CHAOS and SNARK. Teaser drops April 1, 2026. *(Yes, the date is suspicious — almost certainly an April Fools' egg in the codebase.)*

**KAIROS** — Persistent assistant mode. Claude remembers across sessions via daily logs, then "dreams" at night — a forked subagent consolidates your memories while you sleep.

**ULTRAPLAN** — Sends complex planning to a remote Claude instance for up to 30 minutes. You approve the plan in your browser, then "teleport" it back to your terminal.

**Coordinator Mode** — Already accessible via CLAUDE\_CODE\_COORDINATOR\_MODE=1. Spawns parallel worker agents that report back via XML notifications.

**UDS Inbox** — Multiple Claude sessions on your machine talk to each other over Unix domain sockets.

**Bridge** — claude remote-control lets you control your local CLI from [claude.ai](http://claude.ai) or your phone.

**Daemon Mode** — claude ps, attach, kill — full session supervisor with background tmux sessions.

Also found 120+ undocumented env vars, 26 internal slash commands (/teleport, /dream, /good-claude...), GrowthBook SDK keys for remote feature toggling, and USER\_TYPE=ant which unlocks everything for Anthropic employees.

--- TOP COMMENTS ---
[1↑ AutoModerator] Hey /u/abhi9889420,

If your post is a screenshot of a ChatGPT conversation, please reply to this message with the [conversation link](https://help.openai.com/en/articles/7925741-chatgpt-shared-links-faq) or prompt.

If your post is a DALL-E 3 image post, please reply with the prompt used to make this image.

Consider joining our [public discord server](https://discord.gg/r-chatgpt-1050422060352024636)! We have free bots with GPT-4 (with vision), image generators, and more!

 &#x1F916;

Note: For any ChatGPT-related concerns, email support@openai.com - this subreddit is not part of OpenAI and is not a support channel.


*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/ChatGPT) if you have any questions or concerns.*
[775↑ HenkPoley] That someone who leaked it is Anthropic. They shipped the source code map. 

They’ve also had this accident before, about half a year ago.
[211↑ l057-4n0n] Imagine Anthropic being busted from time to time by their own agents.
[87↑ carbon_dry] Didn't they say they actually use Claude code to build Claude code? So you know
[37↑ SillyAlternative420] They are hoping the coding community identifies and fixes the bugs, add viable features, and improves the UI/UX.... Fo free
[1↑ IamTheEndOfReddit] Hey that’s the reward for being open source, the beauty of tech
[1↑ Bobby_Bobberson2501] Waffle fries!
[8↑ aumtek] In this context what is the 'source code map' ? In embedded software I'm aware the .map file shows the layout of the functions & data in memory for the hex or similar file... What is the map referring to here?
