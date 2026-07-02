---
id: social-intelligence/reddit-deep/shopify/1pm79vl.md
url: "https://www.reddit.com/r/shopify/comments/1pm79vl/postscripts_doesnt_have_a_single_popup_for/"
kind: "social-post"
source: "reddit-deep: r/shopify"
subreddit: "shopify"
title: "Postscripts doesnt have a single popup for SMS/EMAIL. Klayvio, Yotpo Or Shopify Forms?"
author: "BobbyJohnson31"
date: "2025-12-14T06:26:24.000Z"
score: 4
upvote_ratio: 1
num_comments: 17
flair: "Apps"
extracted_at: "2026-06-24T22:14:23.471Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/shopify/1pm79vl.md#c0"
    char_span: [0, 1113]
    sentence_count: 9
    key_terms: [shopify, postscript, email, popup, sms, forms, customers, platforms]
    concepts: [shopify, postscript, email, popup, forms]
    related_chunks: ["social-intelligence/reddit-deep/shopify/1pm79vl.md#c1"]
    token_count: 257
    sources: [{"n":"reddit-deep: r/shopify","u":"https://www.reddit.com/r/shopify/comments/1pm79vl/postscripts_doesnt_have_a_single_popup_for/"}]
  - id: "social-intelligence/reddit-deep/shopify/1pm79vl.md#c1"
    char_span: [1127, 2418]
    sentence_count: 6
    key_terms: [shopify, postscript, community, hellohobi, contact, klaviyo, using, good]
    concepts: [shopify, postscript, community, hellohobi, contact]
    related_chunks: ["social-intelligence/reddit-deep/shopify/1pm79vl.md#c0"]
    section: Comments
    token_count: 305
  - id: "social-intelligence/reddit-deep/shopify/1pm79vl.md#c2"
    char_span: [2420, 3779]
    sentence_count: 5
    key_terms: [sms, popup, step, compliance, checkout, homepage, numbers, usually]
    concepts: [popup, compliance, checkout, homepage, numbers]
    section: Comments
    token_count: 294
---
# Postscripts doesnt have a single popup for SMS/EMAIL. Klayvio, Yotpo Or Shopify Forms?

Source: [reddit-deep: r/shopify](https://www.reddit.com/r/shopify/comments/1pm79vl/postscripts_doesnt_have_a_single_popup_for/)
Posted by **BobbyJohnson31** · **4↑** · **17 comments**

I’m trying to collect both email and SMS in a single popup for my Shopify store.

I originally set up Postscript, but realized they only allow email and SMS collection through a two-step / two-popup flow, which feels annoying for customers. So I tried Shopify’s native Forms app, which does let customers enter both email and phone number in one popup.

The issue is that phone numbers collected through Shopify Forms don’t sync to Postscript. I asked Postscript’s AI chatbot, and it said I’d need to use Zapier to send form submissions into Postscript — which means paying for another tool just to make this work.

I know platforms like Yotpo (and I think Klaviyo) can collect email + SMS in one popup natively.

Is there a clean way to send Shopify Form data to Postscript without Zapier, or is switching platforms the better move here?

## Comments

- **AutoModerator** (1↑): To keep this community relevant to the Shopify community, store reviews and external blog links will be removed. Users soliciting personal contact, sales, or services in any form will result in a permanent ban.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/shopify) if you have any questions or concerns.*
- **HelloHOBI** (1↑): I haven't done it myself but I guess you could connect Shopify Forms and Postscript using Shopify Flow and avoid the Zapier tax. 

That said, I don't like the idea of having mutiple platforms for the same thing. I have a lot of experience with email marketing on Klaviyo and it's great platform, albeit a bit expensive than competitors.
  - **BobbyJohnson31** (2↑): Yeah I think I’ll just pay for klayvio honestly, I have good revenue coming from TikTok shop I’m just trying to move to meta now so setting everything up
    - **HelloHOBI** (1↑): That's a good call. What are you using for designing your emails, btw?
- **Eileen_woman** (1↑): You can either switch to an esp that captures both natively like klaviyo or keep postscript and run capture through a popup layer. that second route gives you control and lets you a b test single vs two step.

There are popup tools like alia that let you use ai to segment audience and real time triggers so you can show different popups based on customer interactions on the site rather than being tied to one sms vendor.
  - **Gullible_Income6457** (2↑): I hear you and had the same reaction at first too. The 2step flow is basically a compliance thing honestly, sms needs its own clear opt-in so you can actually prove someone agreed to texts. If a tool lets you grab email + phone in one step, it’s usually cutting corners… which can come back to bite you later. I know it's kinda annoying UX-wise, but makes more sense once you realize it protects you long term. I’d avoid duct-taping it with Zapier if sms is a priority.
    - **kerblamophobe** (1↑): hard agree on the compliance issue. forcing both into one step usually leads to bad deliverability anyway because people just type fake numbers to get the discount code. if your main goal for collecting sms is just to recover abandoned carts you can actually bypass the popup stress entirely. shopify grabs their phone number natively at the first checkout step. a buddy of mine just collects emails on the homepage popup and uses txtcart for the backend. the ai automatically texts the numbers left at checkout if they bounce. you avoid the clunky two step popup on your homepage but still get the sms recovery.
