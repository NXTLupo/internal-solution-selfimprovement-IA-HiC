---
id: social-intelligence/reddit-deep/anthropic/1sdarjy.md
url: "https://www.reddit.com/r/Anthropic/comments/1sdarjy/one_opus_prompt_in_claude_code_eats_through_an/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "One Opus prompt in Claude code eats through an entire pro plan session"
author: "PraxisOG"
date: "2026-04-05T18:15:06.000Z"
score: 127
upvote_ratio: 0.78
num_comments: 94
flair: "Complaint:snoo_biblethump:"
extracted_at: "2026-05-11T17:26:51.909Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, saas]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/anthropic/1sdarjy.md#c0"
    char_span: [0, 292]
    sentence_count: 1
    key_terms: [anthropic, comments, reddit-deep, praxisog, session, through, claude, entire]
    token_count: 84
  - id: "social-intelligence/reddit-deep/anthropic/1sdarjy.md#c1"
    char_span: [307, 1518]
    sentence_count: 3
    key_terms: [prompt, usage, hour, screenshot, exactly, limits, comfortable-egg-8680, snoomacaroons4454]
    section: Comments
    token_count: 364
  - id: "social-intelligence/reddit-deep/anthropic/1sdarjy.md#c2"
    char_span: [1520, 2841]
    sentence_count: 7
    key_terms: [usage, send, message, idea, show, maybeliterally, non-documented, transparency]
    section: Comments
    token_count: 332
  - id: "social-intelligence/reddit-deep/anthropic/1sdarjy.md#c3"
    char_span: [2843, 4440]
    sentence_count: 13
    key_terms: [claude, prompt, context, through, usage, documented, multiplier, benchmark]
    section: Comments
    token_count: 434
  - id: "social-intelligence/reddit-deep/anthropic/1sdarjy.md#c4"
    char_span: [4442, 6073]
    sentence_count: 9
    key_terms: [like, pro, issues, limits, people, don, personal, curious]
    section: Comments
    token_count: 446
  - id: "social-intelligence/reddit-deep/anthropic/1sdarjy.md#c5"
    char_span: [6075, 7242]
    sentence_count: 7
    key_terms: [use, limits, get, like, pay, nothing, people, pperiesandsolos]
    section: Comments
    token_count: 285
---
# One Opus prompt in Claude code eats through an entire pro plan session

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1sdarjy/one_opus_prompt_in_claude_code_eats_through_an/)
Posted by **PraxisOG** · **127↑** · **94 comments**

_(no body — link/image post)_

## Comments

- **theeriecripple** (39↑): Show us the prompt
  - **stiky21** (62↑): The Pro users refuse to elaborate. Because they have no tokens to build a retort
    - **Bulbous-Bouffant** (10↑): If those kids could prompt they'd be very upset
    - **SnooMacaroons4454** (-1↑): lol'd
    - **PraxisOG** (-10↑): -session limits reached-
  - **Comfortable-Egg-8680** (12↑): “Run a task that will use up 93% of my usage”
  - **truthputer** (5↑): Exactly, if it was 1 prompt then that means it ran for 1 hour and 11 minutes according to the screenshot.

I swear so many of these posts seem like paid shills for OpenAI.
    - **tiffanytrashcan** (2↑): I don't think you understand how rate limits work or what this screenshot shows.
    - **Frosty-Key-454** (1↑): You truly believe he ran the prompt exactly when the 5 hour usage window started?
  - **JakeIzUndead** (4↑): I'm on a pro plan, this morning my prompt was "hello" on a brand new chat using sonnet 4.6 with no context - this showed as 2% usage on my 5 hour time frame
    - **Neohoyminanyeah** (2↑): One thing I’ve noticed is that the first message I sent takes up more usage then the rest, keep in mind I haven’t had any usage throttling, and I’m on the $20 plan.

But for example, I can send a simple calculus question and it’ll take up 2-3 of my 5 hour usage, and let’s say I send 3 more questions - my usage will have up only gone up to 4%, not 12%. Idk if the first message it sends retrieves memory info and stuff, but yeah, my first message will use anywhere from 3-5% always, and then after that I can send probably 4-5 messages before it goes up another percentage amount
    - **The_BeatingsContinue** (4↑): I don't get it why people combat the idea of token transparency and downvote anyone having trouble retracing non-documented usage limits.
    - **fixano** (1↑): Do you have MCP servers enabled. There's a million reasons why this could happen. You could have an enormous Claude MD file that you load into context.  

There are so many ways for you to screw this up. So tell me that you typed hello is the most irrelevant piece of data there could possibly be. I need to understand your entire setup and finally I want to see the actual pictures all in one continuous window.
  - **MaybeLiterally** (2↑): They never show the prompt.
  - **s0lci70** (1↑): show /doctor output
  - **Matt_Rask** (1↑): fr. no idea how such a moronic post can have no. of likes in the positive range.
  - **RightHabit** (0↑): "What is the ultimate answer to life the universe and everything?"

and Claude solved it within the Pro quota.
  - **PraxisOG** (-4↑): It was for a bug fix for a benchmarking harness for local LLMs. Sonnet messed up implementing MMLU, which as a benchmark is pretty well documented. The prompt was a description of the error and the benchmark logs pasted in.
    - **pperiesandsolos** (3↑): How many lines of an error log
- **myndbyndr** (52↑): “Hey Claude, recreate Salesforce”.
  - **laststan01** (22↑): Hey Claude, recreate Claude
    - **ianxplosion-** (14↑): Make no mistake
    - **PraxisOG** (1↑): Ironically, having opus walk me through training a LLM on my compute server from scratch only took like 30% of a session. It’s pretty well documented
- **TeeRKee** (16↑): Without any context. It is by default a skill issue.
  - **stiky21** (4↑): it's just another AI reposting images for karma to sell the account.
- **Foreseerx** (2↑): I have some prompts that'll eat through the entire usage limit using Opus in one prompt and always have as they're quite complex and involve a lot of steps. Granted they're not your usual prompt but it's not very meaningful to make posts like these without telling us context.

What exact prompt and context did you run? How big is the codebase?
- **EL4CTEO** (2↑): Hes just thirsty
- **Scorp1979** (2↑): They are trying to push out high use pro users. I am one of them. 

The stated peak hour multiplier is not 8am-2pm EST. 

The actual multiplier  window for me is 8am-10pm EST. 

Between 11pm-3am is what my normal daytime workflow token usage was Jan/Feb. 

Even this eats through my weekly allowance in half the usage.

They want people to pay for pro and use it as a chat bot that uses no token effort on haiku.
- **imjitsu** (2↑): https://preview.redd.it/blm2hxrrzhtg1.png?width=888&format=png&auto=webp&s=14730ec9f1289fff2a8aa19c98f2a2a7219cc8b2

I’m paying $200 a month and it’s still playing nanny, deciding when I’m “done” like I’m on the free tier 😅
- **1chriis1** (2↑): Yes sir!  
I gave opus a single prompt which led to it writing about 20-30 lines of code but it cost me 100% of my 5-hour limit. It called tools left and right as if it was trying to waste tokens on purpose
- **Delta_01001101** (6↑): I am curious what these prompts are. I have access to Claude through Bedrock for work so don’t really have issues but I do have a personal pro plan I use for light personal coding hobbies and never have limit issues. 

What I’m not saying is that I don’t believe these posts but that I’m curious to know what the workflow looks like to hit the limits so quickly. 

For some people, it sounds like you may need to consider investing in going API only.
  - **ragamufin** (4↑): Some people claim they are A/B testing new limits and if you aren’t feeling it you are in the A group (where B has the new limits).

Like you I have a pro plan that I mess around with outside of work and even hitting it for a few hours at a time doing research and building stuff I don’t seem to run into issues.
    - **Delta_01001101** (2↑): Interesting idea if they are. I could also see it being more targeted towards individuals who are heavier users of the product. Maybe the reason I am in “A” (if this is a true thing) is because I’m a causal user of Pro. 

Regardless of this, I’ve never seen this technology as consumer. It was a nice to have thing when it was cheaper and you had less limits but now I def see it as an enterprise tool that we get to tinker with out of work. I guess it shocks me people are shocked that you have to pay more for more use on something like this. But I digress on that.

I just know I’m lucky enough to get to use it daily without limits and my company foots the bill no questions asked.
  - **Big_Comfortable4256** (2↑): Some of us use it to help us get things done that we already do for a living. Some people are attempting to use it to do their entire team's job.
  - **airplane001** (0↑): I like to give it really hard math problems when I’ve got a day before weekly limit resets and nothing to ask it
    - **pperiesandsolos** (0↑): ^ This is why limits are a thing lol 

Tbh I think they should just implement pay as you go prompting rather than ‘tokens’ which effectively mean nothing

Make someone pay directly for their video of Donald Trump as a donkey or whatever. That’s the only real solution imo
- **qodeninja** (3↑): yeah i burned through that $200 api credit in like 2 hours
