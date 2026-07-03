---
id: social-intelligence/reddit-deep/saas/1m0wsi4.md
url: "https://www.reddit.com/r/SaaS/comments/1m0wsi4/looking_for_feedback_building_a_customer_facing/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "Looking for feedback: building a customer facing voice + screen AI onboarding/success tool to guide users inside SaaS products"
author: "StraightUse1820"
date: "2025-07-15T23:09:50.000Z"
score: 1
upvote_ratio: 1
num_comments: 2
flair: ""
extracted_at: "2026-07-03T00:08:07.169Z"
extraction_method: "praw-deep"
research_goal: ""
engagement: "misc"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1m0wsi4.md#c0"
    char_span: [0, 1498]
    sentence_count: 8
    key_terms: [success, users, building, saas, product, customer, support, inside]
    concepts: [success, building, users, product, customer]
    token_count: 319
    sources: [{"n":"reddit-deep: r/saas","u":"https://www.reddit.com/r/SaaS/comments/1m0wsi4/looking_for_feedback_building_a_customer_facing/"}]
  - id: "social-intelligence/reddit-deep/saas/1m0wsi4.md#c1"
    char_span: [1513, 2770]
    sentence_count: 10
    key_terms: [voice, tickets, import, never, quick, voice-plus-screen, data, full]
    concepts: [voice, tickets, import, never, quick]
    section: Comments
    token_count: 275
---
# Looking for feedback: building a customer facing voice + screen AI onboarding/success tool to guide users inside SaaS products

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1m0wsi4/looking_for_feedback_building_a_customer_facing/)
Posted by **StraightUse1820** · **1↑** · **2 comments**

Hey everyone, I’m working on an idea and would love your input!

We’re building a customer-facing onboarding and success tool that lives inside SaaS products. Users interact via screen share and voice, similar to a Zoom call with a success manager. The AI guides them through voice and live visuals on screen step by step in real time to get users unstuck, learn features, and use the product with confidence.

The goal is to lower churn by helping users go from green to power user without hunting through FAQs, support docs, or emailing teams.

Important to note that we are not building backend support agents or chatbots, this is more like a digital customer success manager embedded inside the product, focused on activation, feature discovery, and long-term adoption.

We’ve been speaking with industry professionals but wanted to get honest feedback from the Reddit community too. If you’re building a SaaS product or work in customer success would love to chat about any of the below topics, thanks in advance!

* Where do users tend to get stuck in your product?
* Would this reduce support load or improve retention for your team?
* Anything you’d want it to do (or not do)?

## Comments

- **IslamGamalig** (1↑): I've personally had a good experience with VoiceHub by DataQueue when working on voice related features. It's cool to see more innovation in this area.
- **Key-Boat-7519** (1↑): Making voice-plus-screen guidance feels powerful, but it only helps if it kicks in at the exact friction point and never blocks the flow. In our CRM, most drop-offs happen after users import data: the file mapping screen has too many choices. A quick tooltip and a one-click sample import fixed 30 % of tickets; a full video would have been overkill. So I’d let the AI listen for specific UI events, nudge with a sentence, then offer the richer voice walkthrough only if the user hesitates. Give them an easy mute/close button and store consent to avoid nagging. Capture path data so success teams can see where the bot steps in and whether the user finished the task-otherwise you can’t prove retention impact. Privacy matters: record only the active tab, redact sensitive fields, and provide a transcript for audit. I’ve used WalkMe and Intercom guides, but Pulse for Reddit’s subreddit monitoring keeps surfacing real onboarding pain points that never show up in support tickets. Quick, context-aware nudges win before layering a full voice concierge.
