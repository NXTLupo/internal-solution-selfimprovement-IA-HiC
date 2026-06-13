---
id: social-intelligence/reddit-deep/anthropic/1slo0iu.md
url: "https://www.reddit.com/r/Anthropic/comments/1slo0iu/claude_code_21108_1h_prompt_caching_fix_stop/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "Claude Code 2.1.108+ 1h Prompt Caching Fix – Stop Token Bleeding"
author: "CodeCrusader94"
date: "2026-04-14T22:40:12.000Z"
score: 10
upvote_ratio: 0.86
num_comments: 18
flair: "Improvements :upvote:"
extracted_at: "2026-05-11T17:26:51.913Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, saas]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/anthropic/1slo0iu.md#c0"
    char_span: [0, 929]
    sentence_count: 4
    key_terms: [claude, changelog, code, https, zshrc, com, fix, anthropic]
    token_count: 295
  - id: "social-intelligence/reddit-deep/anthropic/1slo0iu.md#c1"
    char_span: [943, 2111]
    sentence_count: 7
    key_terms: [cache, minutes, session, people, doubtful, change, finish, tokens]
    section: Comments
    token_count: 292
  - id: "social-intelligence/reddit-deep/anthropic/1slo0iu.md#c2"
    char_span: [2113, 3467]
    sentence_count: 4
    key_terms: [api, fe8eef35b22825a2b8555b26ff1e35a5ad8a7e80, minutes, cache, danzarak, bedrock, foundry, minute]
    section: Comments
    token_count: 401
---
# Claude Code 2.1.108+ 1h Prompt Caching Fix – Stop Token Bleeding

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1slo0iu/claude_code_21108_1h_prompt_caching_fix_stop/)
Posted by **CodeCrusader94** · **10↑** · **18 comments**

If you're on Claude Code and your token usage has been brutal lately (60k+ tokens just to resume?), there's a fix in 2.1.108+:

**Problem:** Default 5min cache TTL. Step away, full history reread = wallet pain.

**Fix:** `ENABLE_PROMPT_CACHING_1H=1` for 1-hour cache.

    export ENABLE_PROMPT_CACHING_1H=1
    claude
    

**Permanent:**

    echo 'export ENABLE_PROMPT_CACHING_1H=1' >> ~/.zshrc
    source ~/.zshrc
    

**Gotcha:** `DISABLE_PROMPT_CACHING*` vars kill it. Check:

    env | grep DISABLE_PROMPT_CACHING
    

Comment them out in `~/.zshrc`/`~/.bashrc`.

Changelog: [https://code.claude.com/docs/ja/changelog](https://code.claude.com/docs/ja/changelog)

## Comments

- **Historical-Lie9697** (3↑): What is the benefit to using 5m vs 1h? And it says "**on API key, Bedrock, Vertex, and Foundry**" so does that mean it doesn't work on a max sub?
  - **addiktion** (2↑): Nearly zero for most people as it will balloon your cost and usage to use 5 mins.

1 hr keeps your prompts in cache (their memory) for longer. This allows your  tokens to cost much less while cached as you are getting charged for cache pricing.

5 minutes means the cache gets wiped much sooner and you are requesting new fresh tokens at a higher rate.  I'm doubtful most people can finish a session in 5 minutes for anything serious that isn't  a quick one off change this or that.

It looks like they are giving API users the option to control cache, but sub users are still screwed potentially from this change (1hr to 5min) from their wording.
    - **Norikall** (1↑): "I'm doubtful most people can finish a session in 5 minutes"  
  
if you're sending a prompt every 4:55, then the cache never expires. It only expire if you go 5 full minutes without a single request. For any active session, whether it lasts 10 minutes or 3 hours, you pay the cache write once.

Everyone seems to rage and misunderstand how the cache works even though it's explained in the documentation :(
- **Naive_Lengthiness882** (2↑): One hour is too much, five minutes is too little if this same thing affects Desktop users. It can take me way more than five minutes to read a response that triggers digging around with Google and stuff.
  - **Hir0shima** (1↑): Exactly. 5 minutes is a way to drastic reduction.
- **Ebi_Tendon** (2↑): This config, `ENABLE_PROMPT_CACHING_1H`, is for the API only, I think. Until now, if you used the API, you were fixed with a 5-minute cache.
  - **Danzarak** (1↑): I don't think that's correct, see my comment above.
    - **Ebi_Tendon** (1↑): Added ENABLE_PROMPT_CACHING_1H env var to opt into 1-hour prompt cache TTL on API key, Bedrock, Vertex, and Foundry (ENABLE_PROMPT_CACHING_1H_BEDROCK is deprecated but still honored), and FORCE_PROMPT_CACHING_5M to force 5-minute TTL

from changelog  
API key, Bedrock, Vertex, and Foundry are all API
- **Danzarak** (1↑): https://preview.redd.it/bth7hbs0navg1.png?width=1073&format=png&auto=webp&s=fe8eef35b22825a2b8555b26ff1e35a5ad8a7e80

My browser based cloud terminal auto updated to 108. When I asked it where to enable this setting, it discovered this appears to already been set for the model/method I use - MAX 20 plan (not API) with Opus 4.6 (Max Effort).
