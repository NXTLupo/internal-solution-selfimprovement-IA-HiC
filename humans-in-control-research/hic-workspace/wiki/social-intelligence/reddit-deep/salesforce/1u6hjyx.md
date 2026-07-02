---
id: social-intelligence/reddit-deep/salesforce/1u6hjyx.md
url: "https://www.reddit.com/r/salesforce/comments/1u6hjyx/data_cloud_implementation/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Data Cloud Implementation"
author: "zekeflo"
date: "2026-06-15T14:03:55.000Z"
score: 3
upvote_ratio: 1
num_comments: 3
flair: "help please"
extracted_at: "2026-06-25T15:21:44.739Z"
extraction_method: "praw-deep"
research_goal: "Identify how peer large private universities without medical schools are implementing AI across advancement workflows—including fundraising, alumni relations, and donor communications—to define our own adoption roadmap that balances ethical guardrails, staff readiness, and ROI."
engagement: "identify-how-peer-large-private-universities-without-medical"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1u6hjyx.md#c0"
    char_span: [0, 1397]
    sentence_count: 5
    key_terms: [data, cloud, account, financial, segments, starting, implementation, salesforce]
    concepts: [cloud, account, financial, segments, starting]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1u6hjyx.md#c1"]
    token_count: 302
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1u6hjyx/data_cloud_implementation/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1u6hjyx.md#c1"
    char_span: [1411, 2960]
    sentence_count: 14
    key_terms: [account, dmo, financial, data, individual, standard, understanding, segmentation]
    concepts: [account, financial, individual, standard, understanding]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1u6hjyx.md#c0"]
    section: Comments
    token_count: 333
---
# Data Cloud Implementation

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1u6hjyx/data_cloud_implementation/)
Posted by **zekeflo** · **3↑** · **3 comments**

I’m starting to work through a Data Cloud implementation and wanted to see how others have approached this.

Right now, we’re keeping the initial scope pretty tight and just planning to bring in **Account and Financial Account object data** as our starting point (banking use case). The goal is to build a solid foundation before we layer in transactions, digital behavior, etc.

What I’m trying to figure out is:

* What’s the best way to model and ingest **Account + Financial Account data** into Data Cloud so it actually sets us up well for segmentation later?
* How are you handling **identity resolution** when you’re starting with mostly CRM/financial relationship data?
* Has anyone had success using **Einstein / AI in Data Cloud to generate segments automatically** based on this type of data (balances, product mix, relationships, etc.)?
* What’s the cleanest way to **activate those segments into Marketing Cloud** for journeys?

I’m especially interested in how people are:

* **AI-driven segments**
* Designing things early so you don’t have to redo everything once you add more data sources later

Appreciate any real-world lessons learned, gotchas, or patterns that worked well for you.

## Comments

- **Andyrtha** (3↑): Just bring in all the CRM standard data bundles. Makes understanding the ootb data model much easier when you can see what automatically maps to where. Then read up on those things and they start making sense so when you add new sources you know what to do with them and you get an understanding of things that take 15 minutes vs weeks
- **Weedcultist** (1↑): Identity resolution is your make or-break decision at this stage. Start with a deterministic ruleset only, fuzzy matching on financial data is a compliance headache you don't want before you've even proven the foundation. For the Account + Financial Account model, map Financial Account to an Individual DMO relationship early even if you're not activating on individuals yet, otherwise segmentation rewrites are painful later.

On AI segments, they're more reliable once you have balance and product mix data enriched, not raw. For the deal context layer carrying sales data into this cleanly, I used SalesAssistIQ when our CRM records were too stale to trust for segmentation inputs
  - **zekeflo** (1↑): Thank you. Your response helps me out a lot. I was researching the Individual DMO and saw it was considered a legacy DMO and to move to using their standard DMOs. My question is what would be the standard DMO equivalent to the legacy individual DMO?

Also, do I map the account + financial account into the same DMO? This is where I am getting confused on. Each object contains the Tax ID. If I could figure out this part everything would make a lot more sense.
