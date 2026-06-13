---
id: social-intelligence/reddit-deep/businessintelligence/1pfyqen.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1pfyqen/sole_dev_moving_from_nodemongo_to_bi_for_a_small/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Sole dev moving from node/mongo to BI for a small company. Is this a standard path?"
author: "andydon447"
date: "2025-12-06T20:10:36.000Z"
score: 4
upvote_ratio: 0.84
num_comments: 10
flair: ""
extracted_at: "2026-06-11T18:57:56.379Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1pfyqen.md#c0"
    char_span: [0, 2357]
    sentence_count: 17
    key_terms: [mongo, metabase, company, businessintelligence, data, postgres, service, small]
    token_count: 512
  - id: "social-intelligence/reddit-deep/businessintelligence/1pfyqen.md#c1"
    char_span: [2359, 2812]
    sentence_count: 4
    key_terms: [sql, responsibility, maintenance, underlying, direction, expecting, generally, pipelines]
    token_count: 95
  - id: "social-intelligence/reddit-deep/businessintelligence/1pfyqen.md#c2"
    char_span: [2827, 4612]
    sentence_count: 13
    key_terms: [stack, tools, like, sql, reporting, semaphor, because, changes]
    section: Comments
    token_count: 421
  - id: "social-intelligence/reddit-deep/businessintelligence/1pfyqen.md#c3"
    char_span: [4617, 6801]
    sentence_count: 15
    key_terms: [layer, metrics, financial, metabase, architecture, expectations, self-service, tools]
    section: Comments
    token_count: 466
---
# Sole dev moving from node/mongo to BI for a small company. Is this a standard path?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1pfyqen/sole_dev_moving_from_nodemongo_to_bi_for_a_small/)
Posted by **andydon447** · **4↑** · **10 comments**

Hi everyone,

TL;DR I’m evaluating self service analytics flow (Mongo → Postgres → Metabase) but BI tools feel limiting for common metrics. Is this stack appropriate for a ~50-person company, are my expectations for GUI tooling unrealistic, and how do small teams typically handle BI if known?

This might be a bit wordy and naive.

Im the sole developer at a small sized company (around 50). Our stack is mostly Node and Mongo + React. Currently, I am massive bottleneck for reporting. Due to short sighted development decisions early on when it came to structuring data, it’s become a big pain point with anything analytical. Masses is done with brittle at best spreadsheets and in house KPIs that are constantly questioned to how they actually aggregate the data. 

I want to move toward a more self service model where non-technical stakeholders can view and create dashboards, export and analyse data without me necessarily being relied upon fully. Even if it’s just something minimal.

What i’ve done so far:
- Recognised that our operational mongo database isn’t optimised for analytics
- Spun up a Postgres instance and (tried) migrated minimal data into a star schema structure. This included a seeded date dimension, a booking fact and a customer/team member dimension too.
- Trialed metabase (looks promising!) and apache superset (our CRM has used echarts from apache before)

My main problem 
While the stack feels “rightish” in theory, i’m struggling with the implementation. For example, recreating a “Paid bookings by financial week” KPI with various filters applied to it in metabase felt surprisingly limited compared to writing a mongodb aggregation in code. Perhaps this is just a fundamental hole in my knowledge but I struggled with what I would assume is pretty common stuff? Like handling date gaps (showing weeks with 0 bookings in it) without writing complex SQL which I feel defeats the purpose of “easy self service”

My questions are basically:
- is Mongo -> ETL -> Postgres -> Metabase the standard MVP for a company this size?

- Am I expecting too much from the GUI of these tools? Is it normal to have the responsibility on me to be writing a lot of the underlying SQL instead?

- How do small teams generally manage stuff like BI?

I think a “desired end state” would be that I want a low maintenance path for business users to explore data without me rewriting pipelines or SQL for every new metric. Whether that’s possible is sort of what i’m asking

Thanks for any direction!

## Comments

- **Key_Friend7539** (4↑): Using Postgres is a great choice. Metabase might not be. We have found it to be surprisingly limited as well. There are other tools that will give you more sophisticated controls on filters. Writing SQL is not the end of the world. It in fact is a superpower, because AI can help you get to the right syntax quickly.
  - **slashnirdla** (1↑): Which tool do you prefer?
    - **Key_Friend7539** (1↑): We use [Semaphor](https://semaphor.cloud) for white-labeled self-service reporting within our product. 

We like it because our business users can do things like create their own reports, share among themselves, set up email schedules, download pdfs - all this boring stuff, without involving our customer success team. Our big pain was slotting our CS team for ad hoc reporting, which we no longer have to.
- **parkerauk** (2↑): Tools not the problem, governed and automated pipeline is. Nail that and you have a home run.
- **latent_signalcraft** (1↑): for a company that size your stack is pretty normal. the real bottleneck is the semantic layer, not the bi tool. small teams usually write some sql up front to bake in things like fiscal calendars and table grain so the gui is not fighting you. once the models are clean self service gets a lot easier.
- **copacati_ai** (1↑): It isn't a bad stack, it's always a build vs buy discussion.  I've been at several places (of various sizes) that have a similar stack.  I think it might be less a hole in your knowledge vs expectations for free tools.  Typically, the "correct" approach is to drop to sql, write it once, and never look again.  If you aren't making radical changes to the underlying layers the changes will flow through transparently - unless any new fields are now needed for a calculation.  

  
There may also be a mismatch between your expectations of what an end user can do any reality.  Having designed dashboard, charts, etc most users struggle even with simple actions.  This shouldn't be a huge surprise given it's a pretty different domain even vs spreadsheets.
- **Comfortable_Long3594** (1↑): You’re running into a pretty common tension: BI tools promise “self-service,” but they still depend heavily on well-modeled data and a layer of curated metrics. Without that, the GUI starts to feel restrictive fast,  especially when you’re coming from flexible Mongo aggregations.

A couple of points based on what you described:

**1. Your overall architecture is fine, but the bottleneck isn’t the tools - it’s the modeling effort.**  
Mongo → ETL → Postgres → Metabase is a perfectly normal setup for a 50-person org. The difficulty you’re seeing (date gaps, financial periods, custom KPIs) is usually solved by building a clear semantic layer or metrics layer on top of the warehouse. Metabase’s GUI isn’t designed to do all that logic automatically.

**2. Yes, most teams still maintain SQL-backed models for complex metrics.**  
Self-service typically means *exploring* curated datasets and metrics - not building them from scratch. You’d still define things like financial weeks, booking rules, and gap-filling logic in your SQL or ETL layer.

**3. If you’re trying to reduce your personal load, you probably want tooling that helps manage that semantic layer.**  
This is where something like **Epitech Integrator** can help: it lets you build repeatable pipelines and metric definitions in a low-code way, then publish cleaned, business-friendly tables to your warehouse. Your stakeholders would see consistent fields (“Financial Week,” “Paid Bookings,” “Customer Type”), and the tool would handle the boring step-logic you’d normally encode in SQL by hand. It doesn’t replace Metabase, it feeds it better inputs so the GUI becomes genuinely usable.

In short: your architecture is on track, your expectations aren’t crazy, but the missing layer is a maintainable way to define and standardize metrics. Once that’s in place, BI tools suddenly feel a lot less limited.
