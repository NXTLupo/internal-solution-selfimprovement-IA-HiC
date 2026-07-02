---
id: social-intelligence/reddit-deep/etfs/1t0smkc.md
url: "https://www.reddit.com/r/ETFs/comments/1t0smkc/massive_broker_data_glitch_28000_in_taxes/"
kind: "social-post"
source: "reddit-deep: r/etfs"
subreddit: "etfs"
title: "Massive Broker / Data Glitch: 28,000€ in taxes deducted for a 15k€ position (Invesco S&P 500). Has anyone experienced this?"
author: "DonH00lio"
date: "2026-05-01T12:54:26.000Z"
score: 2
upvote_ratio: 0.6
num_comments: 1
flair: ""
extracted_at: "2026-06-11T15:26:36.782Z"
extraction_method: "praw-deep"
research_goal: "Produce the definitive guide to personal investing in 2026 by analyzing the current state of the fintech and financial industries. Evaluate retail investor behaviors, emerging asset classes, and platform shifts using 2026 market news, industry reports, and social media trends to identify actionable investment strategies and market opportunities."
engagement: "produce-the-definitive-guide-to-personal-investing-in-2026-b"
chunks:
  - id: "social-intelligence/reddit-deep/etfs/1t0smkc.md#c0"
    char_span: [0, 2075]
    sentence_count: 10
    key_terms: [data, anyone, broker, tax, clearing, provider, invesco, europe]
    concepts: [anyone, broker, clearing, provider, automatically]
    token_count: 514
    sources: [{"n":"reddit-deep: r/etfs","u":"https://www.reddit.com/r/ETFs/comments/1t0smkc/massive_broker_data_glitch_28000_in_taxes/"}]
  - id: "social-intelligence/reddit-deep/etfs/1t0smkc.md#c1"
    char_span: [2077, 2453]
    sentence_count: 3
    key_terms: [international, kontrollbank, screenshots, americans, complaint, compliant, populated, processed]
    section: Comments
    token_count: 83
---
# Massive Broker / Data Glitch: 28,000€ in taxes deducted for a 15k€ position (Invesco S&P 500). Has anyone experienced this?

Source: [reddit-deep: r/etfs](https://www.reddit.com/r/ETFs/comments/1t0smkc/massive_broker_data_glitch_28000_in_taxes/)
Posted by **DonH00lio** · **2↑** · **1 comments**

Hi everyone,

I had quite a shock today (public holiday in Europe) and wanted to ask if anyone has experienced a similar data glitch or holds the same fund and got hit today.

**The Facts:**

• **Broker:** Flatex (Austria / Europe)

• **ETF:** Invesco S&P 500 UCITS ETF Acc (ISIN: IE00B3YCGJ38)

• **Invested:** approx. 15,600 € (1,275 shares)

**Context for non-EU investors:**

In Austria, brokers automatically calculate and deduct capital gains tax on accumulating ETFs once a year (based on deemed distributions reported by a central clearing house).

**The Problem:**

My total portfolio value is correct, but my cash balance suddenly dropped by roughly 30,000 €. At the same time, the performance dashboard for my Invesco ETF shows an absurd -87% and a loss of -110,000 €.

**The Cause:**

I checked my broker's document archive and found the annual tax statement (Record date: April 30, 2026). There is an obvious, massive data error from the data provider:

It states a **"gross distribution per share" of 101.59 USD!**

My broker's system blindly processed this flawed data feed (probably a misplaced decimal point from the clearing house/fund provider). It calculated a fictitious yield of over 129,000 USD and automatically deducted **28,037.48 EUR** in taxes straight from my cash account. This absurd fictitious tax value is also what completely broke the performance UI in my dashboard.

**My Questions for the community:**

1.	Is anyone else holding IE00B3YCGJ38 (especially in Europe) and received this totally flawed tax deduction today?

2.	Has anyone ever dealt with such an extreme data provider error (like a misplaced decimal) at their broker? How long does it usually take for the clearing house/broker to issue a reversal (storno) and refund the cash?

I already sent a formal complaint with screenshots to my broker, but since it's May 1st, nothing will be processed until next week.

Thanks for your insights!

## Comments

- **quintavious_danilo** (1↑): This is an international subreddit, mainly populated by Americans. I doubt that they hold UCITS compliant ETFs, let alone have trouble with the Österreichische Kontrollbank.
