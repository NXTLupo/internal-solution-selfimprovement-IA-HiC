---
id: social-intelligence/reddit-deep/businessintelligence/1tg3v0i.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1tg3v0i/first_time_building_a_data_warehouse_going_with/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "First time building a Data Warehouse — going with BigQuery + PostgreSQL for a client-facing app. Anyone done something similar?"
author: "Comfortable_Bus_9781"
date: "2026-05-17T22:25:22.000Z"
score: 10
upvote_ratio: 0.79
num_comments: 7
flair: ""
extracted_at: "2026-06-11T18:57:56.374Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1tg3v0i.md#c0"
    char_span: [0, 2362]
    sentence_count: 17
    key_terms: [data, businessintelligence, postgresql, "we're", warehouse, app, been, here]
    token_count: 509
  - id: "social-intelligence/reddit-deep/businessintelligence/1tg3v0i.md#c1"
    char_span: [2364, 2736]
    sentence_count: 4
    key_terms: [like, experience, genuinely, scheduled, something, anything, headache, honestly]
    token_count: 81
  - id: "social-intelligence/reddit-deep/businessintelligence/1tg3v0i.md#c2"
    char_span: [2751, 4417]
    sentence_count: 14
    key_terms: [postgres, caching, layer, gcs, management, navigating, refreshes, warehouse]
    section: Comments
    token_count: 401
---
# First time building a Data Warehouse — going with BigQuery + PostgreSQL for a client-facing app. Anyone done something similar?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1tg3v0i/first_time_building_a_data_warehouse_going_with/)
Posted by **Comfortable_Bus_9781** · **10↑** · **7 comments**

Hi all B.I friends, first post here hehe

# Context

I've been heads-down designing our company's first real Data Warehouse for the past few months and honestly it's been equal parts exciting and overwhelming. Thought I'd throw our setup out here and see if anyone's been through something similar.

Quick background: we're a mid-sized company in Mexico trying to stop living in spreadsheets and actually centralize our data. We have three main sources — an on-prem ERP (Microsip, probably not well known outside MX), HubSpot for CRM, and Shopify for e-commerce. The idea is to consolidate everything into a Medallion architecture (Bronze/Silver/Gold) and have one actual source of truth.

Worth mentioning — we're not dealing with massive scale here. About 10GB built up over 5 years of operations. Not exactly big data, I know. But we've been burned before by building things that don't scale, so we're trying to do this right from the start even if it feels like overkill right now.

There are two things we need this to do: feed internal dashboards and reporting, and also power a client-facing portal where our customers can log in and see their purchase history, warranty info, product suggestions, promotions — basically a unified view of everything across the three platforms.

# What we're thinking stack-wise:

BigQuery as the core warehouse handling all the Medallion layers and BI stuff. Then Cloud SQL for PostgreSQL as a serving layer for the app — because from what I've read and tested, hitting BigQuery directly for a customer portal with concurrent users is just not a great idea latency-wise.

We'd sync the relevant Gold-layer data over to Postgres and serve the app from there. Still figuring out the sync mechanism, leaning toward Datastream or just a scheduled pipeline.

Where I'm still lost:

Is BQ → PostgreSQL actually the move here or is there a cleaner pattern I'm missing?

Do you sync full Gold models to the serving layer or build separate denormalized tables just for the app?

Anyone dealt with on-prem ERPs in a setup like this? That's honestly our biggest headache right now

CDC vs scheduled batch for the sync — how much does it matter for a portal like this?

And genuinely curious — given we're only at 10GB, is there anything in this stack you'd simplify or replace with something lighter?

Any experience or help will be very useful, thanks!

## Comments

- **renagade24** (4↑): Postgres isn't neccessary. BQ can be just fine, just make sure, however it does warehouse management, it gets a dedicated one.

You should do a proper front-end deployment kubernates or vercel. Build a cache layer so it's not hit 24/7.
- **NationalMyth** (2↑): We've got a stack that is effectively:
GCS >> BigQuery >> RoR (with caching and parameterized query management).  Serving numerous tables with many many millions of records.  The only real costs we incur are data refreshes from GCS and as things percolate up.  BQ is fast, make sure you set up your GCS layer to  be indexed (year=YYYY  for example) and you can pick up to 4 other columns to index on. This will greatly reduce your rows read.  BQ parallelizes reads fairly well, but caching is a must.


ETA: our use case is not high-speed or demand crucial, and our data gets monthly refreshes at most.
- **North_Teacher_7522** (2↑): I think you've got a good setup. Ours is similar 😄 i find having the postgres component more than helpful as well. navigating postgres admin work in GCP is also more straightforward than navigating BQ permissions, especially if you're open towards your team using external connector solutions.
- **ships_on_fridays** (1↑): Your instinct on Postgres as a serving layer is solid. BQ latency and perquery costs aren't great for a concurrent customer portal, no matter what caching you add. Build denormalized, app specific tables in Postgres rather than mirroring Gold models. The portal only needs a fraction of the warehouse, and at 10GB, scheduled batch sync, even hourly, is enough, CDC is overkill unless near real time order statuses are needed.
