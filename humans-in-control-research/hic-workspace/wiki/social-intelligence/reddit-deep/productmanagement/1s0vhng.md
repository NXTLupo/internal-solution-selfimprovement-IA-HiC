---
id: social-intelligence/reddit-deep/productmanagement/1s0vhng.md
url: "https://www.reddit.com/r/ProductManagement/comments/1s0vhng/manual_setup_for_product_management_with_aiand/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Manual Setup for Product Management with AI(and looking for feedback)"
author: "Real-Improvement-222"
date: "2026-03-22T19:55:03.000Z"
score: 102
upvote_ratio: 0.88
num_comments: 35
flair: ""
extracted_at: "2026-06-18T13:35:35.638Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1s0vhng.md#c0"
    char_span: [0, 1045]
    sentence_count: 8
    key_terms: [productmanagement, context, product, interviews, building, comments, feedback, workflow]
    token_count: 221
  - id: "social-intelligence/reddit-deep/productmanagement/1s0vhng.md#c1"
    char_span: [1060, 1875]
    sentence_count: 7
    key_terms: [real-improvement-222, influencer, claude, typos, goingoffroading, circlejerking, seamencaptain, visualization]
    section: Comments
    token_count: 224
  - id: "social-intelligence/reddit-deep/productmanagement/1s0vhng.md#c2"
    char_span: [1877, 4047]
    sentence_count: 5
    key_terms: [product, fishermantiny8224, customer, model, structuring, data, knowledge, building]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/productmanagement/1s0vhng.md#c3"
    char_span: [3743, 4821]
    sentence_count: 8
    key_terms: [product, strategy, context, documented, knowledge, model, wrong, does]
    section: Comments
    token_count: 231
  - id: "social-intelligence/reddit-deep/productmanagement/1s0vhng.md#c4"
    char_span: [4823, 5618]
    sentence_count: 7
    key_terms: [real-improvement-222, product, context, looking, user-research-final-v2, like, everything, management]
    section: Comments
    token_count: 204
---
# Manual Setup for Product Management with AI(and looking for feedback)

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1s0vhng/manual_setup_for_product_management_with_aiand/)
Posted by **Real-Improvement-222** · **102↑** · **35 comments**

Over the past 12 months I moved almost all my PM work into GitHub repos and Markdown files. Discovery, scoping, prototyping - running through a chat window or terminal. The unlock was maintaining a structured **context folder** per product: codebase, interviews, analytics, docs - all in one place, connected to live sources.

When that context is current, every workflow (scoping a feature, synthesizing interviews, drafting a spec) runs fast and produces output I can actually trust.

I'm now building a tool that structures and automates exactly this — building the product context and executing PM workflows on top of it.

Would love feedback, opinions, pushback. Is this a workflow you recognize? What would make you actually use something like this?

## Comments

- **GoingOffRoading** (20↑): Did Claude make this for you?
  - **SeaMenCaptain** (11↑): Ton of typos, so likely
    - **Real-Improvement-222** (-2↑): sorry for typos
  - **sonJokes** (4↑): protip, ask Claude to generate a webpage as the visualization instead of an image. Especially with text-heavy views.
- **cobramullet** (17↑): Belongs on LinkedIn.
- **Aware_Cricket3032** (5↑): No, I just connect to a notion space or a repo and run with it. Most of the folders you have are repetitive. What’s “Review Findings” vs “Reviews”?

Do you have the users, usage, etc to support all this? Your company is an AI influencer generator that is bottom of the search page. 

Stop circlejerking your setup and go do work.
  - **Real-Improvement-222** (-2↑): The screenshots are about an influencer platforms product context. 

There are resources: tracking data from Mixpanel, interview transcripts, etc.. and we us them all to define the biggets gaps in the product, design solution or even a prototype
- **laplaces_demon42** (3↑): I’m using subagents; one for UX/customer stuff, one for data analysis, one for product (what we sell) knowledge, etc.
This works really well
- **ggk1** (3↑): I would love to try it if you made something where it would run me thru the set up asking questions and setting up the folders and stuff accordingly
  - **Aware_Cricket3032** (2↑): You can do this, today, by typing this prompt into your chosen AI agent.
    - **ggk1** (2↑): Wha prompt
- **FishermanTiny8224** (2↑): Using this workflow currently, started building agents that do those processes autonomously. Dealing with IT / secops limitations for API usage, but can overcome. Feel like this is easiest way. Building a UI for the rest of team to keep track of what I’m doing too helps for viz
  - **spshulem** (-8↑): Highly recommend checking out BuildBetter.ai it does this on autopilot and with security/compliance approval
    - **FishermanTiny8224** (2↑): lol :/ if I can’t get slack api usage through my own org why in the hell would they give it to a random vendor.
- **scrotusaurus** (2↑): Lame.
- **frustrated_pm26** (1↑): the setup matters more than which AI tool you pick. most PMs dump everything into a single chat and wonder why the output is mediocre. what made AI actually useful for me was structuring my product knowledge before asking AI to reason over it. i keep a running set of structured files: customer problems mapped to product areas, decision logs with the reasoning and evidence behind each call, and a priority model that connects customer pain to business impact. when i feed that to Claude instead of raw slack messages and meeting notes, the quality of output goes from 'generic consultant advice' to 'someone who actually understands my product.' the missing layer for most PM setups isn't the AI model - it's the organizational memory that sits between your raw data and the model. what does your current setup look like for structuring product context?
  - **PRATTARAZZI** (1↑): I think you're on the right track here... makes sense to me.  I also tested with Claude to check coherence between files in the product knowledge e.g. is there any customer evidence that supports documented hypotheses. Do major initiatives support product strategy? Does product strategy reinforce company strategy? etc. It did a pretty good job of identifying things that didn't match up.  My thinking here is that AI is only as good as its visible/documented context. The idea was that if context is wrong - points in wrong direction - or outdated e.g. strategy changed, but product knowledge doesn't follow... - then AI will never give the best results. Can't expect miracles from poor context.
  - **Unhappy_Lavishness20** (1↑): I’m running into the same issue.

It worked great at first, but as my docs evolved, the repo turned into a mess! Way too many folders and files like user-research-FINAL-v2.md. It’s getting hard to keep track of everything.

How are you organizing yours? Are you sticking with GitHub, or using something like Notion or another system?
  - **Real-Improvement-222** (0↑): my structure of product context is on the screenshot i shared at the post
- **PNW_Uncle_Iroh** (1↑): I have no idea what I’m looking at here. How about some context?
  - **Real-Improvement-222** (1↑): It's en example how I created the intent layer of a product so daily product management tasks can be executed with ai agents - and looking for PMs to share their method for this
- **sydyk_0312** (1↑): Is it possible to get the link to your repository? Thanks.
