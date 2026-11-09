---
id: social-intelligence/reddit-deep/chatgptcoding/1pjw3ru.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1pjw3ru/thinking_through_a_good_modern_ai_coding_setup_i/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "Thinking through a good modern AI coding setup. I want to gain 4.5 Opus/Sonnet access but can't decide which approach is best."
author: "michaelsoft__binbows"
date: "2025-12-11T12:17:46.000Z"
score: 2
upvote_ratio: 1
num_comments: 11
flair: "Discussion"
extracted_at: "2026-10-09T16:37:34.769Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1pjw3ru.md#c0"
    char_span: [0, 1963]
    sentence_count: 11
    key_terms: [gemini, coding, "i'm", use, chatgptcoding, usage, via, definitely]
    concepts: [gemini, coding, chatgptcoding, definitely, usage]
    token_count: 485
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pjw3ru/thinking_through_a_good_modern_ai_coding_setup_i/","kind":"social-post","date":"2025-12-11","author":"michaelsoft__binbows","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1pjw3ru.md#c1"
    char_span: [1965, 3347]
    sentence_count: 5
    key_terms: [copilot, context, claude, code, like, subscription, codex, get]
    concepts: [copilot, context, claude, subscription, codex]
    token_count: 317
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pjw3ru/thinking_through_a_good_modern_ai_coding_setup_i/","kind":"social-post","date":"2025-12-11","author":"michaelsoft__binbows","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1pjw3ru.md#c2"
    char_span: [3362, 5206]
    sentence_count: 14
    key_terms: [get, impossible-pea-9260, model, cli, changes, context, always, cursor]
    concepts: [impossible-pea-9260, model, changes, context, always]
    section: Comments
    token_count: 463
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pjw3ru/thinking_through_a_good_modern_ai_coding_setup_i/","kind":"social-post","date":"2025-12-11","author":"michaelsoft__binbows","subreddit":"chatgptcoding"}]
---
# Thinking through a good modern AI coding setup. I want to gain 4.5 Opus/Sonnet access but can't decide which approach is best.

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1pjw3ru/thinking_through_a_good_modern_ai_coding_setup_i/)
Posted by **michaelsoft__binbows** · **2↑** · **11 comments**

I'm looking for some overall guidance from AI coding regulars on what the "meta" is these days. 

I'm interested in getting high quality output without breaking the bank, definitely looking for a sweet spot where I'm not spending more than, say $50 a month in costs. This will preclude the "power user" approach e.g. claude 5x and higher or chatgpt Pro plans and such. 

So far: 

- Codex's limits under Chatgpt Plus sub is enough for my needs. If I'm doing a lot of heavy coding I could potentially use 3x the quota this gives me, but that's only a really rare occurrence because I will never go into "full vibe coding" mode. it always backfires. codex usage is effectively free for me, i use it with my wife's account and she gets plenty of value out of the sub just for the chatbot usage alone.
- Google GCP $300 free credit for 90 days. This gives me hopefully a good deal of Gemini 3.0 usage via API via Vertex AI and I should be able to use this at least via Gemini CLI and plenty of other agent frontends of my choosing. This is a no brainer. 
- I've also had decent results by enabling Gemini Code Review in my github account, which means any PR I create for myself automatically gets some Gemini intelligence flowing over it, which definitely helps catch blunders. I tend to avoid the process overhead of generating PRs however.

I used to use Sonnet 3.5 heavily last year and I've been away from Claude ever since Gemini 2.5 Pro came out, but now Opus 4.5 appears to be worth having access to in some capacity, so this is the final piece of the puzzle I think for me to have a fully fleshed out "team" as it were. 

What I am deliberating now is whether I should try to get a github copilot subscription and put up with vs code in order to get the favorable per-request usage limit model, or if I should just get a Claude Pro subscription and use various stuff like claude code sessions and stuff like that, which I have read pretty great things about. One concern I have is between codex, gemini, and claude code I will have quite a lot of juggling i will need to do to use up these quotas. 


Copilot gives less context to the chat compared to something like claude code. It used to be much worse but now it seems like from what I am reading the difference in available context is no longer huge (128k vs 200k context... which honestly both sound piddly small compared to what codex and gemini offer at 500k to 1M+, though my experience has indicated even with frontier models, exceeding 200k context reliably leads to suffering, so I try hard to avoid that.) I am under the impression as well that the agentic capabilities of copilot lags behind the big three cli coding agent frontends as of today. Codex is a baseline for me as it's what I've been driving for 5+ months at this point (about when gpt-5 originally came out). copilot has a cli offering but it's also lagging behind in capability, so I will be tied to vscode for copilot, which is a small drawback for me since I'm a neovim user.

## Comments

- **iemfi** (2↑): IMO if you're on a budget copilot is still by far the best deal even though it's not the best. If used right you get insane value out of it. And you get to switch between the models as the best model changes every week these days. And maybe it's no longer true because of GPT 5.2, but you never want to have so much context anyway, the models are just dumb dumb when you do that.
- **Impossible-Pea-9260** (1↑): I think you need to determine if you like cli or ide better - and then how you want to use a repo with the ai - I’ve found for $50 you can prolly get a better deal using 3 $20 entry subs
  - **michaelsoft__binbows** (1↑): Yes I think instead of dropping more spending on one platform to try to crank up AI productivity, it makes more sense to get horizontal coverage of more frontier model access so that we can get more brainpower on tap when getting stuck on problems. For now i definitely think my workflow favors cil tools and this is helped by them generally getting more context capability and token quota (except maybe with gemini and github copilot's cli offerings lagging behind a little) compared to their ide counterparts. 

it's just too many damn options out there though. there are just so many options. cursor, cline, roo code, warp, and tons more.
    - **Impossible-Pea-9260** (1↑): Super agree on the cli. Cli ftw Clift W!
- **real_serviceloom** (1↑): The meta changes. Like gpt 5.2 came out. That might be the new meta. I think the framework I use is always use the tool for the model such as codex for gpt and Claude code for opus. Never go through cursor or an intermediary. They curtail context. And always go monthly so you can change as the meta changes. Also deepseek is always a great model.
- **PitchSuch** (1↑): I am fine with Cursor AI for $20. Although, I am planning to test GLM 4.6.
