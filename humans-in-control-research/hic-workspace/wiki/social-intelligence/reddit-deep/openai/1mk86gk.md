---
id: social-intelligence/reddit-deep/openai/1mk86gk.md
url: "https://www.reddit.com/r/OpenAI/comments/1mk86gk/disappointed_gpt5_still_isnt_unlocking_the_true/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "Disappointed: GPT-5 Still Isn’t Unlocking the True Potential of Larger Context Windows"
author: "krishnajeya"
date: "2025-08-07T18:37:05.000Z"
score: 33
upvote_ratio: 0.83
num_comments: 32
flair: "Discussion"
extracted_at: "2026-05-11T17:27:05.355Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1mk86gk.md#c0"
    char_span: [0, 1121]
    sentence_count: 4
    key_terms: [context, comments, lesson, openai, gpt-5, study, book, "true"]
    token_count: 259
  - id: "social-intelligence/reddit-deep/openai/1mk86gk.md#c1"
    char_span: [1135, 2219]
    sentence_count: 4
    key_terms: [gemini, better, krishnajeya, raffinesse, context, version, timeandspaceandme, open]
    section: Comments
    token_count: 349
  - id: "social-intelligence/reddit-deep/openai/1mk86gk.md#c2"
    char_span: [2224, 4016]
    sentence_count: 13
    key_terms: [window, krishnajeya, gemini, compute, context, million, disappointed, least]
    section: Comments
    token_count: 481
  - id: "social-intelligence/reddit-deep/openai/1mk86gk.md#c3"
    char_span: [4018, 5832]
    sentence_count: 12
    key_terms: [window, use, context, gemini, value, temperature, unsupported, thought]
    section: Comments
    token_count: 481
  - id: "social-intelligence/reddit-deep/openai/1mk86gk.md#c4"
    char_span: [5834, 6414]
    sentence_count: 4
    key_terms: [context, prayers, bible, time, fundamentally, comparable, different, otherwise]
    section: Comments
    token_count: 133
---
# Disappointed: GPT-5 Still Isn’t Unlocking the True Potential of Larger Context Windows

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mk86gk/disappointed_gpt5_still_isnt_unlocking_the_true/)
Posted by **krishnajeya** · **33↑** · **32 comments**

Is anyone else kind of let down by GPT-5’s lack of progress around context window size? I’ve been thinking about how much more these models could do if they could *really* handle massive documents—like loading an entire book or a long PDF in one go.

Just imagine uploading a full textbook, and then being able to:

* **Ask any question** about any chapter or concept instantly
* **Get the AI to teach you lesson by lesson**, tailored to your understanding
* **Create a personalized study plan** based on the whole material
* **Reference earlier or later parts of the book** without the AI “forgetting” context

That’s where the real game-changing use cases are! It’s not just about chatting or answering simple questions anymore—the next leap is making the AI a true study companion, research assistant, or even a co-author on complex projects.

## Comments

- **krishnajeya** (14↑): https://preview.redd.it/i7zzqdoznohf1.png?width=1817&format=png&auto=webp&s=15090a882ad7f5cf3fd784fb1e0a07147e4c6c5a

8k and 32k is a joke
  - **Cartoonist_False** (4↑): This is ridiculous! It's like they want you to go to Gemini
    - **yosofun** (2↑): gemini doesn't seem to do better with a 1M context window tho
- **Raffinesse** (11↑): gemini can already do that
  - **Ghidoran** (1↑): Do you need the pro version or something? When I try to use Gemini and attach chapters, it opens up a new chat after about 12k words and can't reference previous attachments.
    - **Raffinesse** (1↑): yes, i think the free version is quite limited. you can also use aistudio
  - **krishnajeya** (-1↑): I thought Open AI can do it much better.
    - **TimeAndSpaceAndMe** (1↑): Better than the people who are responsible for most of the AI milestones in the past 2 decades including LLMs(transformers & AIAYN) ? highly unlikely.
    - **mothman83** (1↑): Open AI is more " analytical" of the text you give it in  that SPECIFIC prompt. IMHO, but its HORRIBLE at context.

  
It sucks, because what you described is PRECISELY the Use case that first sprang into my  mind when I heard of this tech.
- **swegamer137** (3↑): Compute costs make you choose between a larger window with less effect, or a smaller window with more prominent effect. Compute runtime complexity for self-attention is O(n\^2) barring internal breakthroughs. Moving from 64k to 256k requires 16x the compute resources for that part of the system.
  - **krishnajeya** (3↑): but 32k seriously 1million compared to 32k
  - **Original-Vanilla-222** (1↑): 32k is a freaking joke
- **Fit_Cranberry_7543** (3↑): Yes, less hallucinations and less forgetting is good. But come on, you could have at least pushed the context window to 96k for Plus users.
  - **krishnajeya** (1↑): It is still 32k and for free users it is 8k
  - **yosofun** (1↑): isn't it 128k for pro
- **ZeroEqualsOne** (5↑): Yeah.. I’m pretty disappointed. I didn’t have huge expectations for performance gains. But I was hoping for at least a 1 million token context window given Gemini has had it for a while. It’s actually what’s made me shift most of my working collaboration to Gemini. ChatGPT is mainly for random conversations and stuff now.
  - **krishnajeya** (1↑): Honestly, I’m pretty disappointed with the 1 million token window. I was really expecting at least 2 million, especially since I thought GPT-5 would need that to actually beat Gemini. I kind of feel like I got duped by all the rumors, to be honest 😂
- **Actual_Committee4670** (2↑): I reached the need to have a higher context window quite some time ago, this was sort make it or break it for me. I guess I'll hang around and see what exactly else they did, doesn't seem luck much at the moment, other than that it will be Gemini.

I just can't do much with 32k

I was cautious with my expectations and somehow I still walked away disappointed. I don't want to know how the guys who thought the world was changing tonight feel right now.
- **hhh333** (2↑): Still can't even use it ... I get this error:

>Request Failed: 400 { "error": { "message": "Unsupported value: 'temperature' does not support 0.1 with this model. Only the default (1) value is supported.", "type": "invalid\_request\_error", "param": "temperature", "code": "unsupported\_value" } }

Tried to find where I can set that value to no avail, upgraded to latest vscode, still don't work.

I thought it was a problem with VSCode, but when I use my work provided github account it (gpt5) works just fine.

Kinda sucks.
- **[deleted]** (2↑): That's why I use ChatGPT at the beginning. To build up a flow for the chat.  
\- Copy that chat and paste it in a text file.   
\- Attach the text file to Gemini and tell it to keep the same flow and format. 

Gemini will pretty much keep up. And ofc, 1M tokens!
  - **krishnajeya** (1↑): Sam said there is no demand of high token window
- **JamesBieBoe1** (1↑): wait so what is the context window? when i ask it across different chats (in the app) it says it either has 1million, then 400k, then 128k...

128k would really suck ngl but im really just confused.
  - **Low_Entrepreneur_530** (1↑): This is the context window they give you inside the webapp the true context window from the api is 400k. They do it becuause the price of each aditinal token cost them compute costs and they cant afford it if you are on a 20$ a month plan. If you use the api you can do whatever you want
- **hopeseekr** (1↑): Gemini read the entire Bible I uploaded and can do comperehensive studies on it.

For instance, there is no where in the bible where God answered a silent prayer. 

One guy, one time, whispered a prayer in duress, but otherwise, most of the time God answers shouted prayers (70%) more than normal prayers (30%) and only Satan responded when Jesus prayed by himself (out loud).
  - **[deleted]** (1↑): that is not comparable to what OP talks about, because the bible is already in the models training data, and not treated as external context that needs to be brought into the session. It is fundamentally different in how that works. However, Gemini 2.5 Pro does have a 1000000token context window! The bible would have more than 1000000 tokens.
