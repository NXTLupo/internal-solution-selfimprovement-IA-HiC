---
url: "https://www.reddit.com/r/OpenAI/comments/1mj78xy/just_a_reminder_that_the_context_window_in/"
url_hash: "b7e6d4cb5d"
kind: "article"
source: "Reddit Deep: r/openai"
title: "Just a reminder that the context window in ChatGPT Plus is still 32k…"
author: ""
date: "2025-08-06T15:09:50.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:30:33.912984+00:00"
chars: 3873
---

# Just a reminder that the context window in ChatGPT Plus is still 32k…

Source: [Reddit Deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mj78xy/just_a_reminder_that_the_context_window_in/)

gpt-5 will likely have at least a 1M context window; it would make little sense to regress in this aspect given that the gpt-4.1 family has that context. 

the problem with a 32k context window should be self explanatory; few paying users have found it satisfactory. Personally I find it unusable with any file related tasks. All the competitors are offering at minimum 128k-200k - even apps using GPT’s API!

also, it cannot read images in files and that’s a pretty significant problem too.

if gpt-5 launches with the same small context window I’ll be very disappointed…

--- TOP COMMENTS ---
[213↑ Actual_Committee4670] I agree, if Openai won't increase the context window then its gotten to the point where others are simply better tools for the job. Chatgpt has its upsides, but purely as a tool, the context window makes a massive difference in what can be done.
[37↑ recallingmemories] Has a larger context window been shown to be beneficial in the quality of response? I've found that when I do utilize large context windows, I just don't get back the kind of precision I need for the work I'm doing.

From Chroma's "[Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot)":

>Large Language Models (LLMs) are typically presumed to process context uniformly—that is, the model should handle the 10,000th token just as reliably as the 100th. However, in practice, this assumption does not hold. We observe that model performance varies significantly as input length changes, even on simple tasks.  
In this report, we evaluate 18 LLMs, including the state-of-the-art GPT-4.1, Claude 4, Gemini 2.5, and Qwen3 models. Our results reveal that models do not use their context uniformly; instead, their performance grows increasingly unreliable as input length grows.
[23↑ Actual_Committee4670] Yes and no, a larger context still doesn't give perfect recall. 



It will still remember one part better than another and the findings here is correct, it doesn't use the context uniformly. However, a larger context still allows it to use a larger amount of data more efficiently and more accurately than a lower context would. 

But if you're going to use a sizeable amount of the available context, adding too that you will see a rapid degradation in performance. 

That's been my experience from using Chatgpt, Gemini and Claude, never used Grok unfortunately.
[10↑ lordpuddingcup] Gemini 03-25 did damn near it was uniform out to like 400k tokens and then only barely fell off it’s the reason it was so good and even google hasn’t been able to replicate it

It’s why 2.5pro-preview and final were seen as a step back in a big way from the experimental the context went to shit over 32-64k
[6↑ productif] Bear in mind the source may have a *slight* bias in showing how context limits are still a universal limitation.

From experience gemini-2.5 is on a whole new level of comprehension and performs well even at 300k+ tokens.
[3↑ ThatNorthernHag] The first 200k is the smartest, then it starts to decline to 400k - after which it's just totally useless. At 600k you shouldn't be doing anything important anymore. 

But the 32k is ridiculous.. I'm not sure it's still that with gpt 🤔 But I don't know, haven't used it for quite some time (due the sycophancy first and then data retention), been mostly using Gemini & Claude via API.
[5↑ Actual_Committee4670] Hopefully one day we will get perfect recall, but, that I think may still be a while. But there is a difference between context and "What can be recalled perfectly"
[2↑ TheAbsoluteWitter] From my experience it’s kind of the other way around, when you’re so deep into a conversation, it will handle the recent tokens (e.g. the 10,000th) much better than the first ones (the 100th token). It seems to very quickly forget your initial conversation and context.
