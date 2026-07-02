---
id: social-intelligence/reddit-deep/dataengineering/1opz0ve.md
url: "https://www.reddit.com/r/dataengineering/comments/1opz0ve/unpopular_opinion_data_quality_is_a_product/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Unpopular Opinion: Data Quality is a product management problem, not an engineering one."
author: "NewLog4967"
date: "2025-11-06T13:33:10.000Z"
score: 215
upvote_ratio: 0.93
num_comments: 75
flair: "Discussion"
extracted_at: "2026-06-29T14:40:47.212Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1opz0ve.md#c0"
    char_span: [0, 1216]
    sentence_count: 10
    key_terms: [data, quality, product, dataengineering, engineers, ownership, building, comments]
    concepts: [quality, product, dataengineering, engineers, ownership]
    token_count: 262
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1opz0ve/unpopular_opinion_data_quality_is_a_product/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1opz0ve.md#c1"
    char_span: [1230, 3341]
    sentence_count: 21
    key_terms: [data, product, business, customer, customers, different, line, quality]
    concepts: [product, business, customer, customers, different]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/dataengineering/1opz0ve.md#c2"
    char_span: [3343, 5397]
    sentence_count: 13
    key_terms: [data, engineers, systems, source, transform, publish, "that's", encapsulated]
    concepts: [engineers, systems, source, transform, publish]
    section: Comments
    token_count: 429
  - id: "social-intelligence/reddit-deep/dataengineering/1opz0ve.md#c3"
    char_span: [5399, 7425]
    sentence_count: 13
    key_terms: [requirements, development, person, data, solution, visible, demonstrate, get]
    concepts: [requirements, development, person, solution, visible]
    section: Comments
    token_count: 440
  - id: "social-intelligence/reddit-deep/dataengineering/1opz0ve.md#c4"
    char_span: [7427, 8038]
    sentence_count: 5
    key_terms: [data, business, issue, odd-string29, investments, capability, constantly, describing]
    concepts: [business, issue]
    section: Comments
    token_count: 130
---
# Unpopular Opinion: Data Quality is a product management problem, not an engineering one.

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1opz0ve/unpopular_opinion_data_quality_is_a_product/)
Posted by **NewLog4967** · **215↑** · **75 comments**

Hear me out. We spend countless hours building data quality frameworks, setting up Great Expectations, and writing custom DBT tests. But 90% of the data quality issues we get paged for are because the business logic changed and no one told us.

A product manager wouldn't launch a new feature in an app without defining what quality means for the user. Why do we accept this for data products?

We're treated like janitors cleaning up other people's messes instead of engineers building a product. The root cause is a lack of ownership and clear requirements *before* data is produced.

Discussion Points:

* Am I just jaded, or is this a universal experience?
* How have you successfully pushed data quality ownership *upstream* to the product teams that generate the data?
* Should Data Engineers start refusing to build pipelines until acceptance criteria for data quality are signed off?

Let's vent and share solutions.

## Comments

- **69odysseus** (52↑): DE is pretty much cleaning up mess at large scale😄
  - **EmotionalSupportDoll** (3↑): We're really all just DJs. Data janitor.
- **naijaboiler** (37↑): That is exactly what it is. But there is little you can do about it. It really depends on how important you are to  the business relative to the data-confusion generators.   
if its a product team with a direct valuable customer-facing, revenue-generating responsibility, and you are just the guy that keeps and maintains data for operational needs, yeah you are effed. They will always be allowed to change their data in any manner that lets them serve customers and make money. You, have to come after and be figuring things out on the fly
- **LargeSale8354** (12↑): I have a few caveats to this. Product owners only care in the context of their product.  Let's suppose they have to capture and use name and address data.
The way in which they do so is perfect for them.

A different line of business also needs name and address data, but for a different purpose. The way they do so is perfect for them.

Marketing want a single customer view. Neither line of business collect the data in a form that allows comparison. You now have a data quality problem.

The only way I have found to improve the data quality is to fix it at source. You do this by making the down stream data vital to the earnings of both lines of business.  Customers get pissed off because, as far as they are concerned they are buying from company X. They couldn't give 2 hoots for the fact they bought product line A which is different from product line B. 
As customer retention is far easier than customer recruitment,  anything that looses customers is very much frowned upon.
  - **naijaboiler** (6↑): this is the way, align data cleaning to dollars, and then everyone pays attention.

But if they are closer to customer $$ than your team is, yes you will be a data janitor.
- **kenfar** (23↑): I don't think data quality is purely owned by product managers any more than security, availability, and scalability are.

The biggest issues in my opinion are:

   * Data & software engineers and product managers have little understanding of the impacts and contributing factors to data quality issues.
   * Data engineers build systems in which they copy the encapsulated schemas from source systems into their warehouse to then transform them.  Well, yeah, that's a solution that is pretty much guaranteed to cause a ton of DQ problems.  As opposed to having the source system publish domain objects that are locked down with data contracts.
   * Data engineers build almost no quality-control tests, no unit testing, no reconciliation checks, no anomaly-detection, and no field transform audits to track changes over time.  dbt and great expectations are generally poor tooling that only address a fraction of this.
   * Product managers, given zero push from engineering, leave out all considerations of data quality - no SLOs, no dashboards, no investment.  Which means it falls 100% on the engineer's heads.

It doesn't have to be that way.  But data engineers need to be better informed about DQ and push hard for architectures, tools, and processes they need.
  - **mo_tag** (5↑): >Data engineers build systems in which they copy the encapsulated schemas from source systems into their warehouse to then transform them.  Well, yeah, that's a solution that is pretty much guaranteed to cause a ton of DQ problems.  As opposed to having the source system publish domain objects that are locked down with data contracts.

Exactly. We get requests to publish data from our massive application+reporting db that's been ever evolving for the last 20 years and when we ask for the requirements the DEs are like "everything please" lmao.
- **danioid** (6↑): Change is unavoidable. This is a soft-skill issue. 

Developing relationships with upstream teams can be helpful. If this is happening a lot, maybe try to get a short monthly call going with whoever owns that data just to talk about what's going on and what's expected to change from the business end that might have an impact on your downstream processes. 

One large org I used to work for had biweekly calls with representatives from each of our source systems and the warehouse team for that purpose. If a significant change is happening and you're the last to know about it, ask yourself who else knew ahead of time and how you can get in sync with pending changes moving forward.
- **almost_special** (4↑): There is no point in refusing to build the pipelines. 
We solved most of your pain points by integrating DQ and QA checks in the development phase. 

For example, we are adding a new API for our customers. Before the project kickoff we all sit together, revise the solution architect proposal, discuss business logic, etc. On that pre-development meeting we have a dedicated QA person, DQ person, lead developer etc.  

After or during the meeting, me as an owner of the DQ step, have a chance to raise any concerns, ask questions, change some part of the solution and in the end plan the initial and continuous DQ check. 

And we have iterations of the DQ checks during development until the data is not "good enough". So we fix almost all data issues in parallel with development process.
- **ResidentTicket1273** (3↑): I think the solution to this general problem is to identify the person who wrote/communicated the requirements, and then demonstrate how the pipeline is adhering exactly to those requirements, and to the person who signed off on UAT. Make the tests visible, the lineage visible, everything visible and transparent so that you can demonstrate exactly why. If they want to update their requirements, then let them, charge them, and (work permitting) start a new round of build. But no, without them doing their duty, you shouldn't be made responsible for doing someone else's job.
- **Charlotte1309** (3↑): True, that's what the "shift left" trend is about. Having data quality rules and requirements defined before the data is produced.
- **dadadawe** (2↑): \>> we get paged   
Your framework found it, the root cause is clear, you should get a cookie

The issue your describing is familiar but the good news is that this changing with the advent of data governance and data as a business capability. Sounds to me like you business sponsor either isn't heard, or doesn't understand. Once the problems are identified, the investments should go where the issue is. In large orgs, this can take a long time
- **Odd-String29** (1↑): Duh, that's why I work with our product manager to get the source system data as correct as possible. We constantly look at how we can optimise business processes to improve data quality and stop users from doing things they shouldn't.
