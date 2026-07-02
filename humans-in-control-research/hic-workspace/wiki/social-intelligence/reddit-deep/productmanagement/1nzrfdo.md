---
id: social-intelligence/reddit-deep/productmanagement/1nzrfdo.md
url: "https://www.reddit.com/r/ProductManagement/comments/1nzrfdo/openai_dev_day_keynote_summary/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "OpenAI Dev Day Keynote - Summary"
author: "amohakam"
date: "2025-10-06T18:39:52.000Z"
score: 82
upvote_ratio: 0.93
num_comments: 15
flair: "Tech"
extracted_at: "2026-06-14T15:28:02.846Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1nzrfdo.md#c0"
    char_span: [0, 2104]
    sentence_count: 17
    key_terms: [developers, agent, productmanagement, chatgpt, keynote, agents, coding, openai]
    concepts: [developers, productmanagement, agent, chatgpt, keynote]
    token_count: 495
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1nzrfdo/openai_dev_day_keynote_summary/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1nzrfdo.md#c1"
    char_span: [2106, 2473]
    sentence_count: 4
    key_terms: [industry, directionally, integrating, enterprise, executing, execution, everyone, relative]
    concepts: [industry]
    token_count: 74
  - id: "social-intelligence/reddit-deep/productmanagement/1nzrfdo.md#c2"
    char_span: [2487, 4628]
    sentence_count: 14
    key_terms: [thanks, agent, astronomy, agents, integrated, amohakam, critical, example]
    concepts: [thanks, astronomy, agent, agents, integrated]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/productmanagement/1nzrfdo.md#c3"
    char_span: [4630, 6311]
    sentence_count: 15
    key_terms: [monetization, app, business, platform, booking, mention, through, did]
    concepts: [monetization, business, platform, booking, mention]
    section: Comments
    token_count: 385
---
# OpenAI Dev Day Keynote - Summary

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1nzrfdo/openai_dev_day_keynote_summary/)
Posted by **amohakam** · **82↑** · **15 comments**

OpenAI had their Dev Day Keynote today in San Francisco with 1500 people in live attendance. You can catch the whole thing on YouTube. I am sharing a quick summary here. 

In 2023, they had 2Million developers on platform and 300M Tokens / Minute. 

In 2025, they had 4 Million developers and 6 Billion Tokens/Minute 

Perhaps OpenAI remains the only company that has scaled so fast in such a short time in terms of its user base! 

Key Takeaways: 

1. Agent SDK in ChatGPT - you can now talk to @zillow and ask it questions about housing or talk to @canva and ask it to design a pitch deck — all from within ChatGPT. 

Developers that have MCP servers can easily expose their agent to ChatGPT to benefit from the Scale of Open AI’s distribution channel. 

This is powerfull and seems to model an AppStore distribution business model. 

2. Agent Kit - Automate workflows with AgentKit and have agents do work! 

Similar to N8N and Microsoft PowerAutomate + Copilot, AgentKit allows a low code / no code experience to build workflows that help agents take actions. integrate agents that do work into your apps. 

They have guard rails and HITL integrated nodes for human in the loop actions. Microsft has Approvals in Power Automate while N8N has specific HITL nodes you can integrate in flows. 

3. Codex - Coding Agent 
A true coding assistant for entrepreneurs and anyone with an idea.  

4. Model Updates GPT5-Pro in API, Sora2 for video generation and Realtime-mini-gpt for audio 

Overall best demo was the CodexDemo where without writing code, they connected to a Sony Camera in the dev days keynote room using a very old API layer that Codex could research. Then they connected a XBox remote controller to control the camera live and then had it take a picture - all through a real time audio interface they built just then. 

As live coding demos go, it was mind blowing! 

Good stuff overall for the industry, directionally similar to others but they have a better chance of executing as a startup relative to the big company execution. 

As PMs in AI space, these industry trends are helpful to follow, but we often lack the time. Sharing here, hoping a summary may benefit everyone. 

How are you integrating your enterprise apps into AI?

## Comments

- **Shannon_Vettes** (13↑): Thanks for the summary :) saved me some time!
- **Glad-Operation-3051** (6↑): Wow, thanks for the thorough overview (so I don't have to watch on 2x speed and miss roughly 1/2 of what's said)...

>HITL integrated nodes for human in the loop actions

This intrigues me.
  - **amohakam** (6↑): Yes. N8N had added them just a quarter or so ago. 

in my view this is critical for enterprise adoption and governance. Even in full automation situations, you want a canary for monitoring the outliers. 

these types of human interventions were critical in the development of the base model tuning and with Metas acquisition of scale AI it maybe interesting to see how they “productize” HITL for enterprises.
- **Palashistic79** (5↑): Thanks for the summary. They definitely redeemed themselves with today’s demo after a disastrous demo for GPT-5.
- **robust_nachos** (3↑): Thank you for the write up!
- **air-benderr** (1↑): Thanks for the write up. Need to understand how this works:

>Developers that have MCP servers can easily expose their agent to ChatGPT to benefit from the Scale of Open AI’s distribution channel.
  - **amohakam** (6↑): Me too. Need to get my hands on it and play with it. 

In theory, though, If you have an MCP server for your product, you have an array of tools, memory and agentic support integrated into it.

On stage they briefly talked about exposing an API that wraps your agents responses in HTML. Am sure there is more to this like registering your agents, allowing discovery of your agents on key topics / terms / attributions used in chat like @myawesomeapp, security and licensing. 

This is powerful extensibility for an app developer to instantly expose their apps to 800+ million users. For example: 

@astronomy - what is an event horizon? 

This example use your awesome astronomy app that is rich in domain knowledge and deep in astronomy and exposes hundreds of “Tools” )used in agent context) and serve up an answer to 800+ million people with a simple extension. 

This is how token explosion can happen. Agent to Agent communication becomes key and a new platform is born! 

We are seeing the birth of a new platform across all these technologies and that is thrilling!
    - **air-benderr** (1↑): I read through their docs:  
1. ChatGPT suggesting your app is algorithmic. Based on how well you can reverse engineer user prompt they might suggest your app.  
2. At this point they are looking for apps that can answer user query directly without involving multiple step. Like book me a cab, or plan my meal etc.  
3. Monteization will come later through agentic commerce.
- **aakash-pm** (1↑): I’m super excited about the evals built into AgentKit! But overall the solution seems kind of half-baked right now.
- **Afton11** (1↑): I swear they already launched app integrations in 2023?
- **[deleted]** (1↑): I hate these connections to these businesses who came into existence because they were a data aggregator. Like Booking.com. 
Offers no real value apart from a MCP equivalent to their calender and payment. 
Why is chat gpt connecting to Booking instead of the hotels own websites?
- **Generton** (1↑): Thank you for the summary, did they mention anything about the Codex code quality & security?
- **SuperUltraPlus** (1↑): On the AppStore distribution business model, did they mention how monetization would work? Or was it focused on MCP and getting the plumbing to work?
  - **amohakam** (1↑): Not much on monetization. Tokens will keep eating the world until they get so big they can demand a fee for developers being and distributing on their platform, eventually. Most modern B2C companies have not worried about monetization too early. Good chance the existing business models on App Stores will be disrupted. Lot of room for innovation here.
