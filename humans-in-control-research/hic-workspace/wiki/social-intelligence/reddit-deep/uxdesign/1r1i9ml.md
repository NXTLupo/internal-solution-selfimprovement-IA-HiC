---
id: social-intelligence/reddit-deep/uxdesign/1r1i9ml.md
url: "https://www.reddit.com/r/UXDesign/comments/1r1i9ml/do_we_have_any_ai_to_simulate_user_touchpoints/"
kind: "social-post"
source: "reddit-deep: r/uxdesign"
subreddit: "uxdesign"
title: "Do we have any AI to simulate user touchpoints, and highlight gaps in the UX/UI"
author: "OldOpportunity3469"
date: "2026-02-11T00:25:31.000Z"
score: 0
upvote_ratio: 0.2
num_comments: 12
flair: "Tools, apps, plugins, AI"
extracted_at: "2026-09-10T17:19:34.952Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/uxdesign/1r1i9ml.md#c0"
    char_span: [0, 530]
    sentence_count: 2
    key_terms: [gaps, comments, simulate, uxdesign, oldopportunity3469, opportunities, improvement, reddit-deep]
    concepts: [comments, simulate, uxdesign]
    token_count: 136
    sources: [{"n":"reddit-deep: r/uxdesign","u":"https://www.reddit.com/r/UXDesign/comments/1r1i9ml/do_we_have_any_ai_to_simulate_user_touchpoints/"}]
  - id: "social-intelligence/reddit-deep/uxdesign/1r1i9ml.md#c1"
    char_span: [545, 2546]
    sentence_count: 8
    key_terms: [heatmaps, humans, oldopportunity3469, detrio, users, dumb, "it's", patterns]
    concepts: [heatmaps, oldopportunity3469, humans, detrio, users]
    section: Comments
    token_count: 487
  - id: "social-intelligence/reddit-deep/uxdesign/1r1i9ml.md#c2"
    char_span: [2548, 2997]
    sentence_count: 3
    key_terms: [factorhour2173, something, thinking, predictive-heatmaps, https, oldopportunity3469, com, attentioninsight]
    concepts: [factorhour2173, something, thinking, https]
    section: Comments
    token_count: 116
---
# Do we have any AI to simulate user touchpoints, and highlight gaps in the UX/UI

Source: [reddit-deep: r/uxdesign](https://www.reddit.com/r/UXDesign/comments/1r1i9ml/do_we_have_any_ai_to_simulate_user_touchpoints/)
Posted by **OldOpportunity3469** · **0↑** · **12 comments**

I know, getting it to test with the real users, is the right approach to measure the gaps. I am just wondering, if AI is smart enough to simulate the app usage, record them as heatmaps, and tell us where the gaps are, and opportunities for improvement.

## Comments

- **detrio** (16↑): No, it categorically is not good enough to do any of those things with any kind of real value.

There are \*some\* tools that can generate heatmaps, but it's going to be obvious right away that you could've caught the same issues, and it's still largely AI bullshit.
  - **OldOpportunity3469** (-1↑): Saw a post from Shopify CEO on Twitter, that they have these heatmaps feature introduced to test the UX, that's why I was curious.
    - **detrio** (4↑): Shopify's CEO is an AI nutjob who forces his people to use AI.  He needs a means to juice his stock price.

It generates things that \*look\* like heatmaps, but that doesn't mean they're realistic heatmaps.
- **BeePuns** (15↑): We design for people, not LLMs
- **sabre35_** (5↑): I’ve sat through countless user tests, and what you come to realize is that humans are dumb, and often the humans designing for other humans are just as dumb. It becomes a back and forth of dumbing things down until it’s obvious for both humans. 

Not entirely sure anyone’s trained a model to be dumb lol.
- **coffeeebrain** (2↑): this is the same trap as synthetic users

ai cant tell you where the gaps are because it doesnt get frustrated, confused, or have actual goals. it just follows patterns

real users mess up in ways you'd never predict. they misread things, bring wrong assumptions, try to do tasks in backwards order. thats where you find actual problems

seen too many teams try to automate their way out of talking to users. always ends the same way, they ship something that technically works but nobody actually wants to use
- **OldOpportunity3469** (1↑): Just tried to pull it up.

This is the simulator they built to mimic user actions 

https://apps.shopify.com/simgym
  - **detrio** (2↑): It's worth mentioning that ecommerce is defacto the most overly optimized, commoditified bits of UX design in the entire world.  It practically doesn't matter which category of products you have, the same patterns work in the same way.

Having something 'browse' a ecommerce site is stupid and a parlor trick.
- **FactorHour2173** (-4↑): Yes
  - **OldOpportunity3469** (-1↑): Do you use any tool?
    - **FactorHour2173** (1↑): I was thinking more so about some of the new features for Playwright with their agents. This might be venturing too far into code though.

Are you thinking something like this?:

https://clarity.microsoft.com/predictive-heatmaps

https://attentioninsight.com
