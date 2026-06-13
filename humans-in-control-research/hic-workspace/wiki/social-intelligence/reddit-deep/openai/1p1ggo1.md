---
id: social-intelligence/reddit-deep/openai/1p1ggo1.md
url: "https://www.reddit.com/r/OpenAI/comments/1p1ggo1/gpt51_codex_max_no_more_context_window_limit/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "GPT-5.1 Codex Max - No more context window limit"
author: "TemperatureNo3082"
date: "2025-11-19T18:59:45.000Z"
score: 104
upvote_ratio: 0.9
num_comments: 33
flair: "News"
extracted_at: "2026-05-11T17:27:05.352Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1p1ggo1.md#c0"
    char_span: [0, 601]
    sentence_count: 1
    key_terms: [codex, gpt-5, max, comments, context, openai, window, temperatureno3082]
    token_count: 159
  - id: "social-intelligence/reddit-deep/openai/1p1ggo1.md#c1"
    char_span: [615, 2414]
    sentence_count: 13
    key_terms: [high, windows, performance, medium, codex, auto-compaction, without, model]
    section: Comments
    token_count: 442
  - id: "social-intelligence/reddit-deep/openai/1p1ggo1.md#c2"
    char_span: [2416, 3282]
    sentence_count: 5
    key_terms: [agent, windows, around, code, full, better, issues, codex]
    section: Comments
    token_count: 225
  - id: "social-intelligence/reddit-deep/openai/1p1ggo1.md#c3"
    char_span: [3285, 5223]
    sentence_count: 15
    key_terms: [windows, codex, wsl, works, context, coding, understanding, real]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/openai/1p1ggo1.md#c4"
    char_span: [4978, 5455]
    sentence_count: 3
    key_terms: [use, dumb, tool, panic-compact, understanding, auto-compact, explorations, satoshinotme]
    section: Comments
    token_count: 118
---
# GPT-5.1 Codex Max - No more context window limit

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1p1ggo1/gpt51_codex_max_no_more_context_window_limit/)
Posted by **TemperatureNo3082** · **104↑** · **33 comments**

2 major updates:

1. **Compaction**: GPT-5.1 Codex Max can now manage its own context window, extending the size of code projects it can handle, and the work duration required to complete the task.

2. **xhigh reasoning effort**: GPT-5.1 Codex Max can now think for *even longer*, doubling the output token compared to high to achieve slightly better results.

## Comments

- **sdmat** (39↑): It has exactly the same context window limit. This is about auto-compaction.

The previous model could auto-compact too but doing so badly broke performance so they deemphasized this. OAI seems to have worked out how to get auto-compaction working properly with the new model.
  - **askep3** (5↑): Badly broke it as in much worse than how Claude models performed after compaction? Or a similar amount of performance degradation, which is now much improved with the new model?
  - **reelznfeelz** (2↑): Do we know does 5.1 codex max have higher token usage or burn through your Plus limits faster than 5.1 'normal'?  

I find that 5.1 on medium reasoning can get me pretty far just on Plus plan.  It's really not bad at all.  But claude pro I tend to hit limits more often, and that's with judicious use of "compact".
    - **sdmat** (1↑): The codex team claims usage is lower if you compare medium vs medium and high vs. high but that extra high uses more tokens (makes sense).

The performance difference with extra high isn't large, so if usage is a problem  just stick to medium/high.
- **rroj671** (14↑): Awesome. If only I could run Codex on Windows without having to approve 15 actions per prompt and having it fail at calling its own tools every 39 seconds.
  - **Sensitive_Song4219** (3↑): Latest version of the Codex CLI fixes a bunch of Windows issues when run natively (without wsl)!

Not sure about the VS Code extension (it was bad last time I tried it under Windows) but definitely update your CLI and give that a try - its pretty good now.

I had it searching through files, running MSBuilds, hitting my SQL DB etc under Windows without issues, saw almost no tool call failures in my testing. I had to do 2 or 3 approves in total, similar to when running under wsl.

Nearly as good as natively running Claude Code (though CC is still the better CLI at present.)
  - **kfug18** (1↑): That's because you're not using the full agent mode. You can sélect between chat, agent and full agent in Codex (in VS Code).
    - **Pharaon_Atem** (1↑): What do you mean please, i'm new to that ?
  - **fourfiftyfiveam** (1↑): This model is the first one ever to be trained on Windows. Try it, its much better at Windows now
  - **FinancialMoney6969** (1↑): I absolutely hate codex
  - **CompanyLow8329** (1↑): I had the same issues on Windows about 2 months or so ago, most of the issues around this were fixed in some updates around then. The VS Code extension was really bad around its release time.


I'd make sure everything is up to date and I'd run it in full agent mode with all permissions and even use it to help configure itself properly.


They even gave it its own built in wsl so you don't have to install it, to my understanding.
  - **reelznfeelz** (1↑): I'm sure you know this but if you don't, developing in wsl2 is really a very fine experience.  I do it pretty much exclusively, and not just b/c of codex.   But, I know there are reasons why someone may want to stay on the windows side.  I just can't think of any right now lol.  I guess .NET projects maybe?
  - **adam2222** (1↑): Install wsl
    - **iBzOtaku** (3↑): claude code works butter smooth in windows without wsl, there's no excuse for codex to demand wsl.
    - **rroj671** (3↑): I have WSL but my files and all my coding environment lives in Windows. It doesn’t make sense to move everything just for Codex. Claude Code works perfectly on Windows. Antigravity works great too. GPT5 does a decent job coding, but Codex is just terrible.
  - **TheAccountITalkWith** (1↑): Is this a Windows thing? When I use Codex on Mac there is an option for auto approval.
    - **rroj671** (2↑): Yeah, it’s a Windows thing.
- **[deleted]** (2↑): the old compaction feature was useless as it loses all key information when it summarizes the context. but this new one is trained e2e in rl so it should be much better. I hope to see some real examples tho.
- **schnibitz** (1↑): I’m very curious as to how well this works with real world coding tasks. I have a fairly large-scale project that could benefit. I suppose what would be importantly to me would be the ability to uncompact older context once it becomes necessary to do so. I hope this new compaction technique isn’t just a gimmick and actually results in real benefit.
- **evilRainbow** (1↑): Dunno, still turns into a dumb dumb if you use more than 50% of the context. Would be grreat to choose when to auto-compact.
- **SatoshiNotMe** (1↑): My understanding is that they trained it to explicitly use a self-prune/self-edit tool that trims/summarizes portions of its message history (e.g. use tool results from file explorations, messages that are no longer relevant, etc) during the session, rather than "panic-compact" at the end. In any case, it would be good if it does something like this.
