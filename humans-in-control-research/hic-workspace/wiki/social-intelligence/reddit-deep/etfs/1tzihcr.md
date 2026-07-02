---
id: social-intelligence/reddit-deep/etfs/1tzihcr.md
url: "https://www.reddit.com/r/ETFs/comments/1tzihcr/im_a_european_investor_with_holdings_across/"
kind: "social-post"
source: "reddit-deep: r/etfs"
subreddit: "etfs"
title: "I’m a European investor with holdings across multiple brokers, and no tool showed me my real gains after currency moves. So I built one."
author: "pgulyas"
date: "2026-06-07T17:35:46.000Z"
score: 3
upvote_ratio: 0.67
num_comments: 0
flair: ""
extracted_at: "2026-06-11T15:26:36.780Z"
extraction_method: "praw-deep"
research_goal: "Produce the definitive guide to personal investing in 2026 by analyzing the current state of the fintech and financial industries. Evaluate retail investor behaviors, emerging asset classes, and platform shifts using 2026 market news, industry reports, and social media trends to identify actionable investment strategies and market opportunities."
engagement: "produce-the-definitive-guide-to-personal-investing-in-2026-b"
chunks:
  - id: "social-intelligence/reddit-deep/etfs/1tzihcr.md#c0"
    char_span: [0, 2069]
    sentence_count: 17
    key_terms: [across, different, portfolio, brokers, currency, european, multiple, gains]
    concepts: [different, portfolio, across, brokers, currency]
    token_count: 450
    sources: [{"n":"reddit-deep: r/etfs","u":"https://www.reddit.com/r/ETFs/comments/1tzihcr/im_a_european_investor_with_holdings_across/"}]
  - id: "social-intelligence/reddit-deep/etfs/1tzihcr.md#c1"
    char_span: [2071, 2877]
    sentence_count: 6
    key_terms: [foliopal, everything, https, month, never, app, card, data]
    concepts: [foliopal, everything, https, month, never]
    token_count: 178
---
# I’m a European investor with holdings across multiple brokers, and no tool showed me my real gains after currency moves. So I built one.

Source: [reddit-deep: r/etfs](https://www.reddit.com/r/ETFs/comments/1tzihcr/im_a_european_investor_with_holdings_across/)
Posted by **pgulyas** · **3↑** · **0 comments**

Like a lot of European investors, I hold positions across multiple brokers — different platforms for different purposes, different currencies, different account types. Every broker shows you your portfolio in isolation, and almost none of them correctly account for FX when calculating your gains.

That bothered me more than it probably should have. My USD ETF is up 12% — but the dollar fell 6% against EUR over my holding period. My real gain is not 12%. My broker doesn’t tell me that, and most portfolio trackers don’t either.

After about 7 years of investing across Lightyear and IBKR, I got frustrated enough to build something myself. It took a couple of years of evenings and weekends, but Foliopal is now live.

It’s a portfolio tracker built specifically for European investors who hold across multiple brokers and currencies. Here’s what it does:

* Multi-broker consolidation — import directly from Interactive Brokers, Revolut, DEGIRO, and Lightyear via statement files. No API keys, no bank connections, no third-party access to your accounts.
* Real FX-adjusted gains — every position is split into market gain and FX impact, calculated per transaction using historical ECB rates. You see what you actually made, in your currency.
* FIFO-accurate cost basis — applied per transaction, in your reporting currency.
* Infinite customisation — this is the part I’m most proud of. You set your own categories, themes, regions, and tax labels for every asset. If I set up a “Space industry” theme, that filter flows through every single chart and table in the app — I can drill into just that theme across my entire portfolio in one click, or zoom back out to the full picture just as easily. It follows your personal taxonomy, not a generic one.

On data and privacy, since this is financial data: everything is stored in the EU (Ireland), encrypted at rest and in transit, never shared with third parties. Full GDPR compliance, and you can export or permanently delete everything at any time. Payments go through Stripe — Foliopal never sees or stores your card details.

Pricing is €5/month, and you get 1 month free if you subscribe for a year. 14-day free trial and no card required. I had three people help me test it before launch and the feedback was genuinely encouraging — but I’m well aware that real-world users will find things testers don’t, so I’m committed to iterating fast.

Happy to answer any questions about how it works, what’s under the hood, or why I made certain design decisions.

[https://foliopal.app/](https://foliopal.app/)
