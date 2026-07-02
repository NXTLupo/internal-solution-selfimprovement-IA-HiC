---
id: social-intelligence/reddit-deep/shopify/1t7ngak.md
url: "https://www.reddit.com/r/shopify/comments/1t7ngak/just_a_reminder_to_check_your_backup_rates/"
kind: "social-post"
source: "reddit-deep: r/shopify"
subreddit: "shopify"
title: "Just a reminder to check your Backup Rates"
author: "iron_rings_unite"
date: "2026-05-08T22:55:35.000Z"
score: 1
upvote_ratio: 0.6
num_comments: 7
flair: "Shipping"
extracted_at: "2026-06-24T22:14:23.470Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/shopify/1t7ngak.md#c0"
    char_span: [0, 1542]
    sentence_count: 2
    key_terms: [rates, backup, shopify, customers, shipping, dhl, calculated, rate]
    concepts: [rates, backup, shopify, customers, shipping]
    related_chunks: ["social-intelligence/reddit-deep/shopify/1t7ngak.md#c1"]
    token_count: 351
    sources: [{"n":"reddit-deep: r/shopify","u":"https://www.reddit.com/r/shopify/comments/1t7ngak/just_a_reminder_to_check_your_backup_rates/"}]
  - id: "social-intelligence/reddit-deep/shopify/1t7ngak.md#c1"
    char_span: [1556, 3837]
    sentence_count: 19
    key_terms: [shipping, checkout, rates, backup, margin, international, interesting, customer]
    concepts: [shipping, checkout, rates, international, backup]
    related_chunks: ["social-intelligence/reddit-deep/shopify/1t7ngak.md#c0"]
    section: Comments
    token_count: 487
---
# Just a reminder to check your Backup Rates

Source: [reddit-deep: r/shopify](https://www.reddit.com/r/shopify/comments/1t7ngak/just_a_reminder_to_check_your_backup_rates/)
Posted by **iron_rings_unite** · **1↑** · **7 comments**

I use my own DHL account to ship my international orders.  My rates are calculated by the DHL app in real-time and include duty, VAT, and brokerage fees (DDP)

They're on the high side, but my customers value fast shipping and zero surprises, so no issues there

Shopify sets backup rates to $9.99 by default (at least for my store)

I forgot that when I cleaned up my shipping regions a few months ago and I happened to notice that two customers today received a $10 shipping rate instead of the $80+ shipping rate they were supposed to

Both customers are returning customers and I've shipped to them before, but the backup rates overrode my DHL calculated rates

The Shopify AI said that the reason Shopify makes backup rates mandatory is to protect conversion rates and that they would rather show an imperfect rate than no rate at all (because it increases cart abandonment)

I mean, I kind of agree, but I'm not sure why they would set the default so low, especially when my store has years of transactions to poll

For these two orders today, I'm guessing the DHL app took a little too long to respond, because when I tried it myself, the DHL calculated rates were there right away

And I went back and checked, the backup rates have silently fired 15 times in the last 2 months

Check your backup rates

## Comments

- **Kind-Visit-2488** (2↑): That's a nasty one, and it's exactly why I don't trust fallback settings to sit quietly in the background. Anything labelled 'backup' eventually becomes the live rule when an app hiccups or a zone gets touched. For international shipping, I'd do a 10-minute audit once a week: duplicate the top 5 overseas destinations, add one product from each shipping profile, and make sure checkout still matches the carrier quote. If your normal DHL rate is $80 and Shopify slips to $9.99, you're not losing a bit of margin, you're eating a $70 mistake before pick and pack. Two of those in a day is basically a silent ad spend bill. I'd also export every shipping zone and profile after major edits so you've got a before and after reference when support inevitably says nothing changed.
- **ujay92** (2↑): I have a DHL account as well, but I didn’t continue using calculated shipping rates because I found they increased cart abandonment.

Instead, I built the shipping costs into my product pricing and kept the checkout shipping fee lower. For example, shipping to the US is $35 for orders up to 30kg. I found customers responded much better to lower shipping fees at checkout and didn’t mind paying slightly more for the products themselves.
- **CoryJ0407** (1↑): Totally different discussion but Shopify shipping rates are interesting. For speed, 1-2 days they have really good FedEx and UPS rates. For 3+ day shipping via ground our FedEx account is cheaper. Interesting.
- **Eduthenomad** (1↑): Good reminder. Backup rates are one of those settings that can quietly turn into a checkout and margin problem because the customer experience still looks normal from the outside.

For anyone checking this, I’d also check:

1. Which shipping profiles and regions can fall back to backup rates if the carrier app fails.
2. Whether the displayed rate matches your intended DDP/DDU promise, especially for international orders where duty and brokerage matter.
3. A few test checkouts for returning customer countries, not just the default domestic case.

The bigger lesson is that checkout conversion issues are not always “page design” problems. Sometimes a small operational setting changes trust, margin, or delivery expectations right at the point of purchase.
