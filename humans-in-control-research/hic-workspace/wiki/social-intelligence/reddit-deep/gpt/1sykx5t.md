---
id: social-intelligence/reddit-deep/gpt/1sykx5t.md
url: "https://www.reddit.com/r/GPT/comments/1sykx5t/how_chatgpt_actually_serves_ads_here_is_the_full/"
kind: "social-post"
source: "reddit-deep: r/gpt"
subreddit: "gpt"
title: "How ChatGPT actually serves ads. Here is the full attribution loop (and why you're burning $5/click)"
author: "TaylorAvery6677"
date: "2026-04-29T01:45:56.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 2
flair: ""
extracted_at: "2026-05-11T17:26:37.722Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/gpt/1sykx5t.md#c0"
    char_span: [0, 2264]
    sentence_count: 29
    key_terms: [targeting, attribution, click, advertisers, ads, loop, comments, chatgpt]
    token_count: 504
  - id: "social-intelligence/reddit-deep/gpt/1sykx5t.md#c1"
    char_span: [2266, 4349]
    sentence_count: 28
    key_terms: [attribution, paying, right, essentially, cpc, get, conversion, discovery]
    token_count: 444
  - id: "social-intelligence/reddit-deep/gpt/1sykx5t.md#c2"
    char_span: [4351, 5500]
    sentence_count: 15
    key_terms: [sponsored, massive, network, privacy-conscious, dns, network-level, ad-blocking, blackholing]
    token_count: 238
  - id: "social-intelligence/reddit-deep/gpt/1sykx5t.md#c3"
    char_span: [5514, 6119]
    sentence_count: 4
    key_terms: [mentiondesk, optimizing, discovery, better, organically, documented, visibility, effective]
    section: Comments
    token_count: 123
---
# How ChatGPT actually serves ads. Here is the full attribution loop (and why you're burning $5/click)

Source: [reddit-deep: r/gpt](https://www.reddit.com/r/GPT/comments/1sykx5t/how_chatgpt_actually_serves_ads_here_is_the_full/)
Posted by **TaylorAvery6677** · **0↑** · **2 comments**

OpenAI just quietly flipped the switch on cost-per-click ads inside ChatGPT. The StackAdapt leaked deck from late March confirmed the pilot, and now we are seeing live deployment in Australia, New Zealand, and Canada. Advertisers are bidding $3 to $5 per click right now. I look at AI from exactly one angle: how much does it cost, and who is getting ripped off. I refuse to pay retail for AI, and I definitely refuse to pay premium rates for a channel that currently operates completely in the dark. 

I did the math. Let’s break down the exact tech stack, the targeting limitations, and the highly anticipated 'attribution loop' that supposedly makes this worth the massive price tag. 

Spoiler alert: the loop doesn't exist. 

First, let's look at what is actually being served. We aren't talking about banner ads or flashy pop-ups. These are static, sponsored responses that appear alongside organic recommendations, complete with a brand favicon. Desktop users are seeing them first. It feels native, which is exactly why the click-through rates are probably high enough to justify the absurd CPC bids out of the gate. 

But here is where the bottom line falls apart. The targeting is practically prehistoric by 2026 standards. You get country-level geographic targeting and plain-language 'context hints' based on the ongoing conversation topic. That’s it. No behavioral graphs. No cross-site tracking. No demographic overlays. If a user asks about heavy-duty tarps, and you bid on tarp-adjacent context, your ad shows up. 

Contextual targeting isn't inherently bad, but it is heavily top-of-funnel. The user is in a discovery phase. They are researching and comparing. They aren't holding a credit card ready to check out like they are on a high-intent Google Search query. Yet, advertisers are paying Google Search bottom-of-funnel prices. Paying $5 a click for exploratory traffic is insane.

Which brings us to the biggest joke of the whole system: the attribution. 

There was a massive thread over on r/pihole this week titled 'How ChatGPT serves ads. Here's the full attribution loop.' It sparked a lot of debate, but if you look at the raw documentation and the recent Digiday reports, the truth is grim. Right now, there is essentially no closed-loop attribution. OpenAI is reportedly trying to build a conversion tracking pixel, but as of this rollout, you get impressions and clicks. That is all. No post-view attribution. No definitive way to track if that $5 click actually turned into a $50 sale three weeks later. 

You are flying completely blind. You are paying a premium CPC for top-of-funnel discovery, and you have zero feedback loop to optimize your campaigns. It is a massive ROI problem. 

Let's run a per-click breakdown. Say you drop $5,000 on a test campaign. At a $4 average CPC, that is 1,250 clicks. Because this is discovery traffic with no behavioral targeting, let's assume a generous 1.5% conversion rate. You just bought 18 customers for $5,000. Your Customer Acquisition Cost is nearly $280. Unless you are selling high-margin enterprise SaaS, you are bleeding money. And worse, because you don't have a reliable pixel, you don't even know which conversational contexts drove those sales. You can't trim the fat. You just keep feeding the machine.

Why are you paying for this? Seriously, why pay $5 a click when you can get the exact same visibility for $0?

The alternative is organic optimization. ChatGPT still relies heavily on clean, structured data and citations for its organic recommendations. The brands winning right now aren't the ones burning cash on StackAdapt pilots. They are the ones who spent the last year structuring their site data, publishing high-density comparison content, and essentially spoon-feeding the LLM exactly what it needs to recommend them naturally. You can literally get the exact same placement—a citation right next to the user's answer—without paying the CPC toll. It just requires doing the actual work on your backend instead of throwing your marketing budget into a black box.

For the privacy-conscious folks trying to block these at the network level, it's getting complicated. Because these aren't injected via third-party iframes, standard DNS blackholing is tough. The sponsored responses are served server-side directly into the chat flow UI. If the payload for the sponsored text comes down the same stream as the actual LLM generation, you can't simply null-route it without breaking the entire interface. You'd need client-side DOM filtering to look for the specific brand favicon wrapper, rather than relying on network-level DNS blocks. This is a massive shift from how we've managed ad-blocking for the last decade.

OpenAI hit an estimated $100M in ad revenue in just six weeks. That means there are a lot of companies out there who haven't done the math. They see 'AI Ads' and throw their budgets at it out of pure FOMO. They are paying the ultimate idiot tax.

Don't pay retail for AI discovery. Let the massive legacy brands fund OpenAI's compute costs with their $5 clicks. We keep our money.

Anyone here actually managing to isolate the ad-serving domains on their network? I want to see the packet captures.

## Comments

- **mentiondesk** (1↑): Focusing on optimizing your content for AI driven platforms is way more cost effective right now than blowing huge budgets on unclear ad channels. Clean site structure and well documented sources really do get you surfaced organically. Just a heads up, I work at MentionDesk, and their tools help brands improve AI search visibility without paying those crazy retail CPCs. Real discovery happens where the answers are already being pulled from.
- **Powerful_Equipment84** (1↑): Optimizing for ai discovery (and overall better SEO) is way better than randomly wasting ad-money yeah.
