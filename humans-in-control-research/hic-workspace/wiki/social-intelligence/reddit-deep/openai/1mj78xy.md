---
id: social-intelligence/reddit-deep/openai/1mj78xy.md
url: "https://www.reddit.com/r/OpenAI/comments/1mj78xy/just_a_reminder_that_the_context_window_in/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "Just a reminder that the context window in ChatGPT Plus is still 32k…"
author: "XInTheDark"
date: "2025-08-06T15:09:50.000Z"
score: 549
upvote_ratio: 0.97
num_comments: 123
flair: "Discussion"
extracted_at: "2026-05-11T17:27:05.350Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c0"
    char_span: [0, 827]
    sentence_count: 3
    key_terms: [context, window, comments, problem, openai, gpt-5, disappointed, satisfactory]
    concepts: [context, window, comments, problem, openai]
    related_chunks: ["social-intelligence/reddit-deep/openai/1mj78xy.md#c7"]
    token_count: 204
    sources: [{"n":"reddit-deep: r/openai","u":"https://www.reddit.com/r/OpenAI/comments/1mj78xy/just_a_reminder_that_the_context_window_in/"}]
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c1"
    char_span: [841, 2898]
    sentence_count: 12
    key_terms: [context, performance, larger, uniformly, use, gemini, models, window]
    concepts: [context, performance, larger, uniformly, gemini]
    section: Comments
    token_count: 474
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c2"
    char_span: [2900, 3477]
    sentence_count: 3
    key_terms: [context, thatnorthernhag, comprehension, experimental, experience, limitation, important, productif]
    concepts: [context]
    section: Comments
    token_count: 151
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c3"
    char_span: [3479, 5042]
    sentence_count: 13
    key_terms: [context, conversation, perfectly, perfect, better, humans, recall, "don't"]
    concepts: [context, conversation, perfectly, perfect, better]
    section: Comments
    token_count: 369
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c4"
    char_span: [5044, 7143]
    sentence_count: 9
    key_terms: [context, scripts, large, code, max, documents, multiple, remember]
    concepts: [context, scripts, large, documents, multiple]
    section: Comments
    token_count: 471
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c5"
    char_span: [7145, 8723]
    sentence_count: 8
    key_terms: [context, use, krishnajeya, api, perplexity, questions, chatbot, people]
    concepts: [context, krishnajeya, perplexity, questions, chatbot]
    section: Comments
    token_count: 438
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c6"
    char_span: [8725, 10169]
    sentence_count: 5
    key_terms: [context, pro, lines, users, chat, gpt, because, claude]
    concepts: [context, lines, users, because, claude]
    related_chunks: ["social-intelligence/reddit-deep/openai/1mj78xy.md#c7"]
    section: Comments
    token_count: 373
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c7"
    char_span: [10171, 11872]
    sentence_count: 6
    key_terms: [context, users, free, studio, window, get, plus, pro]
    concepts: [context, users, studio, window, solarka45]
    related_chunks: ["social-intelligence/reddit-deep/openai/1mj78xy.md#c0", "social-intelligence/reddit-deep/openai/1mj78xy.md#c6"]
    section: Comments
    token_count: 491
  - id: "social-intelligence/reddit-deep/openai/1mj78xy.md#c8"
    char_span: [11874, 12480]
    sentence_count: 3
    key_terms: [models, definitely, glokzdnb, context, source, guess, open, complications]
    concepts: [models, definitely, glokzdnb, context, source]
    section: Comments
    token_count: 162
---
# Just a reminder that the context window in ChatGPT Plus is still 32k…

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mj78xy/just_a_reminder_that_the_context_window_in/)
Posted by **XInTheDark** · **549↑** · **123 comments**

gpt-5 will likely have at least a 1M context window; it would make little sense to regress in this aspect given that the gpt-4.1 family has that context. 

the problem with a 32k context window should be self explanatory; few paying users have found it satisfactory. Personally I find it unusable with any file related tasks. All the competitors are offering at minimum 128k-200k - even apps using GPT’s API!

also, it cannot read images in files and that’s a pretty significant problem too.

if gpt-5 launches with the same small context window I’ll be very disappointed…

## Comments

- **Actual_Committee4670** (213↑): I agree, if Openai won't increase the context window then its gotten to the point where others are simply better tools for the job. Chatgpt has its upsides, but purely as a tool, the context window makes a massive difference in what can be done.
  - **recallingmemories** (37↑): Has a larger context window been shown to be beneficial in the quality of response? I've found that when I do utilize large context windows, I just don't get back the kind of precision I need for the work I'm doing.

From Chroma's "[Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot)":

>Large Language Models (LLMs) are typically presumed to process context uniformly—that is, the model should handle the 10,000th token just as reliably as the 100th. However, in practice, this assumption does not hold. We observe that model performance varies significantly as input length changes, even on simple tasks.  
In this report, we evaluate 18 LLMs, including the state-of-the-art GPT-4.1, Claude 4, Gemini 2.5, and Qwen3 models. Our results reveal that models do not use their context uniformly; instead, their performance grows increasingly unreliable as input length grows.
    - **Actual_Committee4670** (23↑): Yes and no, a larger context still doesn't give perfect recall. 



It will still remember one part better than another and the findings here is correct, it doesn't use the context uniformly. However, a larger context still allows it to use a larger amount of data more efficiently and more accurately than a lower context would. 

But if you're going to use a sizeable amount of the available context, adding too that you will see a rapid degradation in performance. 

That's been my experience from using Chatgpt, Gemini and Claude, never used Grok unfortunately.
    - **lordpuddingcup** (10↑): Gemini 03-25 did damn near it was uniform out to like 400k tokens and then only barely fell off it’s the reason it was so good and even google hasn’t been able to replicate it

It’s why 2.5pro-preview and final were seen as a step back in a big way from the experimental the context went to shit over 32-64k
    - **productif** (6↑): Bear in mind the source may have a *slight* bias in showing how context limits are still a universal limitation.

From experience gemini-2.5 is on a whole new level of comprehension and performs well even at 300k+ tokens.
    - **ThatNorthernHag** (3↑): The first 200k is the smartest, then it starts to decline to 400k - after which it's just totally useless. At 600k you shouldn't be doing anything important anymore. 

But the 32k is ridiculous.. I'm not sure it's still that with gpt 🤔 But I don't know, haven't used it for quite some time (due the sycophancy first and then data retention), been mostly using Gemini & Claude via API.
    - **Actual_Committee4670** (5↑): Hopefully one day we will get perfect recall, but, that I think may still be a while. But there is a difference between context and "What can be recalled perfectly"
    - **TheAbsoluteWitter** (2↑): From my experience it’s kind of the other way around, when you’re so deep into a conversation, it will handle the recent tokens (e.g. the 10,000th) much better than the first ones (the 100th token). It seems to very quickly forget your initial conversation and context.
    - **anthonygpero** (2↑): Regarding long context windows, and not in reply to anybody in particular but just the topic, the issue isn't a matter of perfect recall. The issue is that when humans dump large amounts of context into the context window, that context tends to not be very good. In the sense that humans are really really good at taking a lot of context figuring out what's important in that context and using it. Llm's? Not so much. So if you have a large amount of context that is totally distilled context and perfectly tailored to the task you are trying to achieve, the LLMS are going to do great with it. Way better than if you don't give it a lot of context. This is exactly what context engineering is. It's about making sure that you give the agent the right context. And there can't be too much of the right context. 

Our brains are so good at taking large amounts of context and pulling out the nuggets that are applicable as we process information -- and this all happens in the background -- that we are really bad at intentionally distilling context for others and giving people only what's useful.
    - **tygerwolf76** (2↑): Think of context window as its memory, the smaller it is the less it will remember in the context of a "chat", so code generation would be useless. While it could probably write scripts, it would not hold enough context to remember the script to debug it or revise it.
    - **ExtremistsAreStupid** (2↑): It is absolutely essential for working with large repos where you need to be able to dump multiple large scripts onto the AI and expect it to understand how all the parts work together so it can hunt down errors in pipelines, etc. 

GPT-5 seemed to be doing well for this until about a half a week ago and then either OpenAI did something that busted it completely, or throttled me specifically, I'm not sure which. The whole system is useless now unless I'm spoon-feeding it tiny scripts / segments of code.
    - **PeanutButterApricotS** (1↑): It slows down, it will give wrong info occasionally and need correction but I have filled up multiple Gemini 2.5 flash and pro chats. And if you fill it up it will error out though I stopped having that issue as I refresh chats regularly now as I have context documents.

I have one max size google docs (max size is around 550 pages and it’s a word or character count I forget) and one nearly max doc, that gets loaded into it and it works great. 

I do also give it access to the full context in my google drive and have educated the ai on the file naming structure to pull relevant documents as it needs. Maybe that’s the big part, as once I did that it’s understanding if the context greatly increased.
  - **Tenet_mma** (4↑): That’s not really true. It entirely depends on what you are doing…

If you are trying to dump an entire code base into it then yes but that not really what it’s for - there are many other tools for that. 

90% of the time people are asking simple questions (how do I cook this?, find me xyz, etc..)
    - **Actual_Committee4670** (4↑): If that's the use case then context windows would hardly be an issue, but there are people, myself included who don't just use ai for simple questions and that's the case I'm referring to here. - Oddly enough, for cooking and finding stuff I still use google.
  - **budy31** (1↑): 1 million is too much though since it means hallucination.
320 is adequate.
- **Hir0shima** (21↑): Perplexity doesn't seem to offer more than 32k context and forgets context frequently.
  - **BYRN777** (1↑): Yes precisely. 

Also because perplexity is not an LLM or AI chatbot. It’s an AI search engine with some chatbot capabilities. It’s search and research oriented as opposed to thinking, reasoning and writing.
- **krishnajeya** (20↑): I thought gpt 4.1 have 1m context window but later came to know it is for api not in app or web ui
  - **AndySat026** (13↑): Is it also 32k in chatGPT GUI?
    - **OlafAndvarafors** (11↑): Yes, it is 32K regardless of which model you use. The limits specified in the documentation are available only via API. In the app and web it is 32K.
    - **krishnajeya** (2↑): Yes
  - **teosocrates** (9↑): Yea this is insane. Like they have it, it exists, but we can’t use it in the product we pay for. I’d have to build a tool with the Api to get results close to what competitors already offer.
- **SnooWalruses7800** (43↑): You programmed yourself for disappointment
- **Michigan999** (27↑): Do Pro users have larger context window?

I was thinking the same for gpt-5. Gemini and claude are far better because they can output, for me, up to 1,000 lines of code in one go, whereas chat gpt (pro plan) refuses to give anything greater than 200... and truncates everything
  - **Thomas-Lore** (49↑): Pro users get 128k, Plus users 32k, free users a measly 8k. And it comes without warnings - the models will just hallucinate if you try to aks them about something that does not fit in their context.
    - **Michigan999** (18↑): damn so the truncation is bad even for Pro. I think GPT-5 is my last resort, if not, I'll just switch for Gemini Ultra or Claude Max... I have company funds for AI subscriptions and so far Chat GPT has been useless for me as I require many new different codes, usually up to 1,000 lines long and for these tasks it is simply frustrating to have chat gpt write 200 lines and tell you to write the rest yourself
  - **lordpuddingcup** (2↑): It’s not even that I was troubleshooting a issue with some docker configs and the fact that half way through it was just completely forgetting the original problem because of context is atrocious 

Having hazy memory in the older context is one thing just falling out of context as if it didn’t exist ever is so much worse
- **miz0ur3** (9↑): i’m from the future and nope, there’s no 1m context window whatsoever. it’s 400k.

and guess what? free stilll has 8k, plus/ team have 32k, and pro/ enterprise have 128k.

i don’t know how to react to this. at least let the poor plus tier have their 64k or wen gpt 5-turbo?
  - **xtremzero** (5↑): Where do u see the context window size? All the places  ive looked at seem to suggest gpt5 having 256000 tokens for context size
    - **miz0ur3** (2↑): it’s on the pricing page, there’s a comparison table below the marketing between the tiers.
  - **teosocrates** (2↑): It’s 400k in the api only, so the $200 plan is still bullshit if I can’t use it in ChatGPT and have to build an api tool to get quality results….
- **magnus-m** (4↑): A relevant point and often overlooked.  
Pro subscription offer more context, so I don't expect gpt-5 to have any thing near 1M for plus users.
  - **Solarka45** (5↑): Even if it's 256k for Pro and 128k for Plus, it is already a big upgrade and the difference between being able to consume a whole book or not.
- **AcanthaceaeNo5503** (18↑): Ya gpt web is kinda unusable nowadays. Now I'm only pasting my full code base to Gemini studio
- **Pimue_com** (13↑): Google Gemini has 1m context window even in the free version
  - **Ok_Argument2913** (8↑): Actually the 1M context is for pro and ultra users only, the free users get 32K.
    - **howchie** (10↑): The free window on AI studio shows a count out of 1 million
    - **Solarka45** (4↑): In the app, yes. AI studio users get full 1m.
    - **Pimue_com** (2↑): Hmm I’m on the free version and it definitely feels like a lot more than 32k
- **GlokzDNB** (7↑): Open source models deployed by openai this month have 128k if I found correct information.

Yes expect at least double of that since those models are roughly level of o3 and they need to deliver beyond that for profitability

I'm not sure what are complications beyond scaling context window indefinitely but 1m is kinda too much to expect I guess ?
  - **HildeVonKrone** (8↑): The models can support long context length, but it doesn’t help much if you are hard limited to 32k as a Plus user or 8k as free.
    - **GlokzDNB** (2↑): Those models are open source models. To be installed on your devices
  - **Big_al_big_bed** (0↑): Those open source models are definitely not the level of o3. Maybe tuned to a few specific benchmarks they can match, but definitely not overall
    - **GlokzDNB** (0↑): I guess we need to wait and see
