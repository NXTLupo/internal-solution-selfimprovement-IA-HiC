---
id: social-intelligence/reddit-deep/supplychain/1sw7l4i.md
url: "https://www.reddit.com/r/supplychain/comments/1sw7l4i/supply_chain_fulfillment_strategies_for_brands/"
kind: "social-post"
source: "reddit-deep: r/supplychain"
subreddit: "supplychain"
title: "Supply chain fulfillment strategies for brands manufacturing in china and selling dtc"
author: "Truthishere1"
date: "2026-04-26T13:29:48.000Z"
score: 6
upvote_ratio: 0.81
num_comments: 13
flair: ""
extracted_at: "2026-06-18T13:35:09.835Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/supplychain/1sw7l4i.md#c0"
    char_span: [0, 1828]
    sentence_count: 15
    key_terms: [fulfillment, domestic, per, production, china, order, warehouse, sellable]
    concepts: [fulfillment, domestic, production, warehouse, china]
    token_count: 422
    sources: [{"n":"reddit-deep: r/supplychain","u":"https://www.reddit.com/r/supplychain/comments/1sw7l4i/supply_chain_fulfillment_strategies_for_brands/"}]
  - id: "social-intelligence/reddit-deep/supplychain/1sw7l4i.md#c1"
    char_span: [1842, 2563]
    sentence_count: 5
    key_terms: [apples, cost, real, accountengineer, truthishere1, integration, lost-mekuri, transition]
    concepts: [apples]
    section: Comments
    token_count: 178
---
# Supply chain fulfillment strategies for brands manufacturing in china and selling dtc

Source: [reddit-deep: r/supplychain](https://www.reddit.com/r/supplychain/comments/1sw7l4i/supply_chain_fulfillment_strategies_for_brands/)
Posted by **Truthishere1** · **6↑** · **13 comments**

Still seeing brands run the same supply chain fulfillment model they used in 2023 and just... absorbing the damage. Container to US 3pl, 10 to 12 weeks production to sellable, $80k+ frozen while the clock runs. And when you ask them why they're still doing it the answer is basically "that's how fulfillment works." It's not.

Traditional (ocean to US warehouse): container from factory to US 3pl, 10 to 12 weeks production to sellable, massive capital locked upfront. Delivery is fast (2 to 3 days) but real total cost once you add freight, storage, bulk duties, and capital carry is usually 30 to 40% higher than whatever your 3pl quoted you. The per order rate on the invoice is basically fiction.

Direct from china (air freight per order): warehouse near the factory, individual orders ship by air. 48 hours production to sellable, no ocean, no US warehouse, duties per order via type 11. Customer gets 6 to 10 business days with domestic carrier tracking. Per shipment runs about 20% more but total landed cost usually comes out lower for anything under 500g.

Hybrid: hero skus domestic for speed, long tail and new launches from china for cash efficiency. shopify routing handles the split automatically. Best of both without fully committing either way.

The supply chain fulfillment question isn't which model, it's which skus go where. We ran the numbers comparing our domestic 3pl against Portless, a china 3pl. Domestic looked cheaper per order until we added freight, storage, receiving, and 12 weeks of locked capital. It wasn't.

## Comments

- **AccountEngineer** (1↑): 30 to 40% gap between quoted and real 3pl cost... we hit 38% on our first provider. Nearly killed our margins before we figured out what was happening.
- **lost-mekuri** (1↑): Transition approach?
  - **Truthishere1** (1↑): Month of parallel operation. Started with lowest velocity skus, worked up. By the time we moved higher volume stuff we trusted the integration and SLA. Don't do a hard cutover
- **Positive_Cyborg** (1↑): Switched to Fulfyld after dealing with that exact hidden cost nightmare on the ocean freight side, and having a dedicated account͏ manager who actually breaks down the real numbers instead of burying fees in line items made it way easier to compare apples to apples
