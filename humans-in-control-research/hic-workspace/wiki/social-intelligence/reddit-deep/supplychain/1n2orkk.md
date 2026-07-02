---
id: social-intelligence/reddit-deep/supplychain/1n2orkk.md
url: "https://www.reddit.com/r/supplychain/comments/1n2orkk/looking_for_platforms_that_do_real_inventory/"
kind: "social-post"
source: "reddit-deep: r/supplychain"
subreddit: "supplychain"
title: "Looking for platforms that do real inventory optimization (DC→stores + store-to-store transfers)"
author: "Interesting_Door_577"
date: "2025-08-28T21:25:02.000Z"
score: 20
upvote_ratio: 0.95
num_comments: 23
flair: ""
extracted_at: "2026-06-24T22:13:50.251Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/supplychain/1n2orkk.md#c0"
    char_span: [0, 1582]
    sentence_count: 6
    key_terms: [optimization, inventory, store-to-store, platforms, replenishment, supplychain, like, allocation]
    concepts: [optimization, inventory, store-to-store, platforms, replenishment]
    related_chunks: ["social-intelligence/reddit-deep/supplychain/1n2orkk.md#c1"]
    token_count: 343
    sources: [{"n":"reddit-deep: r/supplychain","u":"https://www.reddit.com/r/supplychain/comments/1n2orkk/looking_for_platforms_that_do_real_inventory/"}]
  - id: "social-intelligence/reddit-deep/supplychain/1n2orkk.md#c1"
    char_span: [1596, 3696]
    sentence_count: 18
    key_terms: [optimization, capabilities, inventory, approach, scenario, galaadg, looking, product]
    concepts: [optimization, capabilities, inventory, approach, scenario]
    related_chunks: ["social-intelligence/reddit-deep/supplychain/1n2orkk.md#c0"]
    section: Comments
    token_count: 505
---
# Looking for platforms that do real inventory optimization (DC→stores + store-to-store transfers)

Source: [reddit-deep: r/supplychain](https://www.reddit.com/r/supplychain/comments/1n2orkk/looking_for_platforms_that_do_real_inventory/)
Posted by **Interesting_Door_577** · **20↑** · **23 comments**

Hi everyone,  
I’m researching applications/platforms that actually perform **mathematical optimization of inventory**, rather than relying on simple replenishment policies like (s,Q) or min–max.

What I’m looking for:

* **Optimal allocation** of inventory from **distribution centers (DC) to stores** (*optimal inventory mix*).
* Capability for **store-to-store rebalancing/transfer optimization**, considering logistics costs, capacity constraints, fairness, pack sizes, etc.
* Ideally with support for **scenario simulation and comparison** (e.g., testing different objectives: maximize margin, minimize stockouts, reduce logistics costs, etc.).

I’ve come across mentions of solutions like **Solvoyo, Retalon,** [**Invent.ai**](http://Invent.ai)**, Nextail, LEAFIO**, and larger suites like Oracle Retail or Blue Yonder. However, most of these don’t provide open demos or tend to focus more on **replenishment rules** than on a configurable optimization engine.

Does anyone know of platforms (anywhere in the world, including China) that truly implement **inventory allocation optimization + store-to-store transfers**, and have visible material (videos, demos, papers, case studies, screenshots)?

Any leads or experiences would be greatly appreciated 🙏

Thanks in advance!

## Comments

- **GalaadG** (4↑): I would say Lokad. They've got supply chain as a science approach. You can check by yourself the blogs, podcast, Sandbox, it's really well documented.


I remember their CEO debunking case-studies and instead providing real mathematical proof of performance.
  - **Interesting_Door_577** (2↑): Thanks, this was what I was looking for
    - **GalaadG** (2↑): Your welcome. Thanks for the feedback.
For MEIO multi échelon inventory optimisation you can check Inventory Optimization by Nicolas Vandeput. Just got it. If you want some quick modélisation tool for excel and in python, that's really helped me.
- **CarolinaCajun100** (3↑): To add to your list, Sophus X has a YouTube video walking you through an optimization case study. 

Also, RELEX might have similar capabilities as Blue Yonder, with scenario planning capabilities.
- **AdventurousCaptain76** (2↑): Look at Slimstock.
- **[deleted]** (2↑): Kinaxis Maestro (Rapid Response)
- **Aware_Frame2149** (1↑): If you're not beholden to a domestic product, a company called Canary7 had a very easy to use product with a very keen dev team.

Think they're in Ireland.

In the US, if your team is tech savvy, then Manhattan Scale.
- **FakenFrugenFrokkels** (1↑): Blue Yonder has true optimization. You just have to be able to afford it.
- **ParaDuckssss** (1↑): Have you looked into Sour⁤ceday? While it’s often noted for its overall procurement capabilities, I've found that it offers solid support for inventory optimization too. The way it integrates data can help with both DC-to-store allocations and even store-to-store transfers. Plus, their approach to scenario simulations can really help in testing different strategies for logistics costs and stock levels. I’ve seen some users mention its flexibility in adapting to specific needs, which might align well with what you’re looking for. It might be worth checking out their resources to see if they have the depth you need.
- **Majestic_Lime8051** (1↑): Have you looked into Afresh.com?  We implemented it and it works great,  feel free to dm me if you have questions
