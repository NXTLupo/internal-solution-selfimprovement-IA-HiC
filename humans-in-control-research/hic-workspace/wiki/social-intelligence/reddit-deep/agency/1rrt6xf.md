---
id: social-intelligence/reddit-deep/agency/1rrt6xf.md
url: "https://www.reddit.com/r/agency/comments/1rrt6xf/how_i_actually_use_ai_to_run_my_agency_without/"
kind: "social-post"
source: "reddit-deep: r/agency"
subreddit: "agency"
title: "How I actually use AI to run my agency (without copy-pasting things 50 times a day)"
author: "funnelforge"
date: "2026-03-12T15:04:23.000Z"
score: 26
upvote_ratio: 0.72
num_comments: 77
flair: "Growth & Operations"
extracted_at: "2026-10-09T16:37:10.375Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/agency/1rrt6xf.md#c0"
    char_span: [0, 2248]
    sentence_count: 16
    key_terms: [use, business, meeting, agency, agents, notion, people, copy-pasting]
    concepts: [business, meeting, copy-pasting, agency, agents]
    related_chunks: ["social-intelligence/reddit-deep/agency/1rrt6xf.md#c1"]
    token_count: 513
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1rrt6xf/how_i_actually_use_ai_to_run_my_agency_without/","kind":"social-post","date":"2026-03-12","author":"funnelforge","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1rrt6xf.md#c1"
    char_span: [2250, 4222]
    sentence_count: 18
    key_terms: [context, business, system, meeting, without, "here's", automatically, built]
    concepts: [context, business, system, automatically, meeting]
    related_chunks: ["social-intelligence/reddit-deep/agency/1rrt6xf.md#c0"]
    token_count: 432
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1rrt6xf/how_i_actually_use_ai_to_run_my_agency_without/","kind":"social-post","date":"2026-03-12","author":"funnelforge","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1rrt6xf.md#c2"
    char_span: [4237, 6245]
    sentence_count: 7
    key_terms: [everything, funnelforge, notion, nicepassenger1747, like, because, data, something]
    concepts: [everything, funnelforge, nicepassenger1747, notion, because]
    section: Comments
    token_count: 485
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1rrt6xf/how_i_actually_use_ai_to_run_my_agency_without/","kind":"social-post","date":"2026-03-12","author":"funnelforge","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1rrt6xf.md#c3"
    char_span: [6247, 8092]
    sentence_count: 8
    key_terms: [sops, working, great, funnelforge, something, platform, context, agents]
    concepts: [working, funnelforge, great, something, platform]
    section: Comments
    token_count: 439
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1rrt6xf/how_i_actually_use_ai_to_run_my_agency_without/","kind":"social-post","date":"2026-03-12","author":"funnelforge","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1rrt6xf.md#c4"
    char_span: [8094, 10411]
    sentence_count: 13
    key_terms: [section, data, here, notion, system, introduction, great, teams]
    concepts: [section, introduction, notion, system, documented]
    section: Comments
    token_count: 509
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1rrt6xf/how_i_actually_use_ai_to_run_my_agency_without/","kind":"social-post","date":"2026-03-12","author":"funnelforge","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1rrt6xf.md#c5"
    char_span: [10413, 11671]
    sentence_count: 5
    key_terms: [context, funnelforge, foundation, founders, problem, layer, using, mammoth-might-2623]
    concepts: [context, funnelforge, foundation, founders, problem]
    section: Comments
    token_count: 295
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1rrt6xf/how_i_actually_use_ai_to_run_my_agency_without/","kind":"social-post","date":"2026-03-12","author":"funnelforge","subreddit":"agency"}]
---
# How I actually use AI to run my agency (without copy-pasting things 50 times a day)

Source: [reddit-deep: r/agency](https://www.reddit.com/r/agency/comments/1rrt6xf/how_i_actually_use_ai_to_run_my_agency_without/)
Posted by **funnelforge** · **26↑** · **77 comments**

Lot of talk about how founders are trying to use AI. I see 3 buckets:

1. People who jump on every trend (complex N8N workflows, Claude Code) then move on to the next thing
2. People who always have Claude and ChatGPT tabs open, constantly copy-pasting to do random tasks
3. People who want to use AI but aren't sure how, want their teams to use it more but don't know where to start, not sure if they should tell clients they use it

Most fall into bucket 2.

They open ChatGPT, copy-paste their brand voice, paste the email they're replying to, paste the SOP for how they handle this situation, then ask it to help.

**Heres what I do:**

I stopped treating AI like a tool we go to when we need help and started treating it like a layer that sits on top of our operations.

Everything about our business lives in one place (Notion): strategy, client pipeline, SOPs, roles, meeting notes, marketing campaigns, brand voice, financials, all of it.

If its not in notion it doesnt exist. 

All my business context is organized in one system, so AI isn't something I feed information to, it's something that already knows my business.

**How it actually works:**

**1. AI agents that already have context**

Built agents inside Notion that handle stuff we used to do manually.

One agent takes sales call transcripts, cross-references our sales process SOP, pulls prospect data, and writes a custom follow-up email in my voice within 10 minutes of the call ending.

Another agent watches our weekly metrics review meeting, extracts every number we mentioned (cost per lead, ad spend, appointments, pipeline value), and automatically updates our dashboard. No spreadsheets, no manual data entry.

These only work because the agents have access to everything: our SOPs, our meeting transcripts, our client data.

If that stuff was scattered across Google Drive and Slack we'd need some complex Zapier workflow that breaks every other week. Don't have the time or patience for that.

**2. Infinite context without switching tabs**

In Chat/Claude you're constantly reintroducing yourself to the AI. Here's my brand voice again, here's what we do again, here's how we handle this situation again.

Yes there are context windows. And yes, those windows run out.

In our setup I just ask: "Pull our LinkedIn SOP and draft a post about our new offer in my voice."

It references the SOP page, looks at past posts for voice, and drafts it. One query, full context.

Or: "What did we discuss in last week's leadership meeting about Q2 hiring?"

It pulls the answer from meeting notes without me telling it where to look.

I can use any AI model (Claude, GPT, Gemini) all inside the same system without switching tabs, no context window limits, no copying and pasting.

**3. The system gets smarter automatically**

Every meeting we run gets transcribed and saved: leadership meetings, client calls, team standups.

The more we use the system, the more it learns about us. Six months from now it'll know more about our business than it does today, automatically.

**Why am i telling you this?**

Because most companies chase the next shiny AI tool thinking that's the answer.

But if your business data is scattered across ten different places, AI will always feel like extra work.

The companies winning with AI aren't using the latest trend, they're the ones who built a foundation first. They organized their business into one system, then layered AI on top.

**The hard part:**

This requires actually organizing your business first. You can't skip to the AI layer if your operations are chaos.

But once it's built, you stop being the human who explains context to AI fifty times a day and AI becomes something that actually knows how your business works.

I broke down the full setup (how the agents work, how the context system is structured, how it learns over time) in [this video](https://youtu.be/FgXym1t2lUA) if you want to see exactly how it's built.

## Comments

- **ad-tech** (2↑): yeah this is exactly it. i was spending like 3 hours a day just answering where stuff is or forwarding support emails because nobody else had access. the moment we centralized everything in one spot it changed everything - suddenly the team could find what they needed without asking me, and i could actually automate the repetitive stuff instead of just feeding info to chatgpt over and over. sounds like youre doing something similar with the notion setup. the key insight is treating it like the ops layer sits on top of a unified knowledge base, not treating ai like a separate tool you go beg for help from.
  - **funnelforge** (1↑): Bingo, you get it
- **manjit-johal** (2↑): You’ve touched on the biggest hurdle for enterprise AI, the 'Context Debt' that comes from scattered data. Building an agentic platform, we’ve found that the real shift happens when you move from a chat mindset to a state management mindset, where the AI doesn't just process text but actively maintains a live map of your operations. It turns the AI from a tool you have to manage into a utility that simply knows what to do next because it’s tethered to your single source of truth.
- **NicePassenger1747** (2↑): What is this built on ?
  - **funnelforge** (1↑): Notion
    - **NicePassenger1747** (0↑): And you just connect it into. Gpt?
- **Dalbot** (2↑): This tracks, but I'm wondering if all the business data can be stored in ClickUp instead. ClickUp has always felt more intuitive to me than Notion. (Though lately, I've been trying to build something similar to a "Agency Brain" with Claude and .MD files.)
  - **DearAgencyFounder** (2↑): Of course, anything with an API. Get Claude Code to build the scripts that connect and use the data.
  - **funnelforge** (-1↑): I know click up is popular, but I avoid it because I find it inferior
- **greekhop** (2↑): I need to do this. Ive got everything pretty well organuzed in a platform called fusebase, don't love the idea of moving everything Notion.

How does the AI get access to the data, does your platform with SOPs need to be able to expose everything via some API? My platform can share pages publicly or behind a login or a password, would that work?

I've noted to watch your video, but am on vacation now, this is not something to handle over the phone. I would love to get some pointers though to understand if its something I could make work without changing the entire way I store and share info. 

In general though, this way of working is the future, I believe that. Im already in group 2, copy pasting too much into chat windows, that's better than nothing but is no way to be working long term.
  - **funnelforge** (2↑): You can tag whatever context you want..individual sops, whole databases of sops, just like you tag people on slack. I have a couple of breakdowns of the whole system in my channel that should provide more clarity.
    - **greekhop** (1↑): That sounds great, will check it out
- **Exciting_Boot_6929** (2↑): half the replies in this thread read like they were written by the same chatgpt prompt lol. "Context Debt" ok buddy

anyway actual useful thing if you're doing the notion agent setup, watch out for stale SOPs. we had agents pulling from outdated process docs because someone updated the page but the linked db view hadn't refreshed. ended up adding a "last verified" date field to filter on, hacky but it works

also if you add multiple agents make sure they can't both act on the same trigger. we had two bots email the same client within an hour after closing a deal lol. not a great look
  - **funnelforge** (1↑): Great points and advice
- **MigorRortis96** (2↑): I have several things to say about this as a techie, as this is my bread and butter. i will not promote my own startup here but working on it has taught me some things about your ideas.

1. Really cool that youre focusing on automating away manual bs. There are ALOT of areas of improvement here and great job on the writeup and video as well.
2. notion/clickup etc are systems of record. the best usecase would be a system of reasoning (why did this occur? why did X event lead to Y outcome? and so on.). As you grow, you have to figure out how to capture the logic between the tasks, not just the final documents. Otherwise youll be operating on a 20% of the real data.
3. one of the biggest issues here is to overengineer a single source of truth (like notion). your system works great if the people are meticulous about recording the data, putting data into notion, formatting it properly and so on. over time, this becomes a full time job (theyre literally called knowledge management engineers). the key here is to automate input, make passive listeners to pull data from multiple sources of truth (ie. email, your crm, your leadgen platform, linkedin, slack, teams, whatever) and engineer a decent retrieval system (whether graph or vector space or just semantic, case by case). This will let your agent base itself on your teams natural exhaust and wont shift your teams focus to documenting and change the way they work.

There are 40 more things I can say, but these should give you an idea for the future.

Also, protip, dont use TASK: xyz, CONTEXT: xyz in your prompts. Wrap them with xml tags. The LLM will adhere to these better. and makes it more coherent when you want to reference another section (ie. remember to follow your persona in the <persona> section). Heres an example.

    <introduction>
    you do xyz abc
    </introduction>
    
    <some section>
    some text
    </some section>

Great post and thank you for your insights :)
  - **funnelforge** (1↑): Thank you so much for the thoughtful feedback, a lot to think about here
- **MasterOS_Architect** (2↑): This is the right framework. The "hard part" you named is exactly where most agency founders get stuck they can't organize operations first because their operations are currently founder-dependent chaos with no documented logic anywhere.

The sequencing that works in practice: structured decision protocols first (what gets decided, by whom, using what inputs), then layer AI on top of that documented foundation.

Most founders try to skip straight to the AI layer and wonder why it keeps feeling like extra work. The foundation has to exist first.
  - **funnelforge** (2↑): Exactly
    - **MasterOS_Architect** (2↑): Most founders I've seen try to fix this by adding more AI tools. The ones who actually get out of the loop document the decision logic first what gets decided, by whom, using what criteria then the AI just executes it.

Once that foundation exists the whole thing runs without the founder in every conversation.
- **Mammoth-Might-2623** (2↑): Great piece of work there. Couldnt have thought of that perspective, glad to move from 3 to 2!
  - **funnelforge** (1↑): Awesome!
- **ContentGenio** (2↑): this is just my take, but the real win here isn’t “using AI more.” it’s reducing context switching.

once the business context is structured properly, AI stops being another tab you have to feed and starts acting more like an ops layer.

what usually matters most is:

\- clean core docs first, not everything at once

\- clear ownership of what gets updated

\- one place for context that people actually use

\- guardrails so stale SOPs don’t quietly break the workflow

most teams don’t have an AI problem. they have a context and system design problem.
