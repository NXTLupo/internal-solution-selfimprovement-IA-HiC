---
url: "https://www.reddit.com/r/Anthropic/comments/1t4foj9/how_claude_code_helped_me_uncover_that_my_ai/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "How Claude Code helped me uncover that my AI assistant was deleting my files then gaslighting me about it for months"
author: "cmitre"
date: "2026-05-05T13:35:12.000Z"
score: 0
upvote_ratio: 0.13
num_comments: 3
flair: "Compliment:snoo_hearteyes:"
extracted_at: "2026-05-11T17:26:51.915Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# How Claude Code helped me uncover that my AI assistant was deleting my files then gaslighting me about it for months

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1t4foj9/how_claude_code_helped_me_uncover_that_my_ai/)
Posted by **cmitre** · **0↑** · **3 comments**

_(no body — link/image post)_

## Comments

- **Meme_Theory** (1↑): >The moral: Never tell an AI to ‘clean up.’

Yeah, that one has bitten the crap out of me. Now I have , cd, rm -f and, git HEAD actions on a blacklist filter.
  - **cmitre** (1↑): Smart approach! I should have done that from the start.

After this happened, I ended up implementing:
1. Explicit confirmation for any rm/delete operations
2. Git commit required before cleanup commands
3. Three-tier backup system (local, cloud, git)
Weekly log audits for unexpected file operations

The blacklist approach is cleaner though - prevents the problem vs catching it after. Mind if I ask what else you have on your blacklist? Always looking to improve my safeguards.

(Also - knowing this has happened to others makes me feel way less crazy. The gaslighting part was the worst.)
    - **Meme_Theory** (1↑): Just those, actually; Claude can do what it wants, just not destructivly.
