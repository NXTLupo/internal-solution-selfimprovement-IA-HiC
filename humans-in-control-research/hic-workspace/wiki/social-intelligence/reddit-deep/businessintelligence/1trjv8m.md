---
id: social-intelligence/reddit-deep/businessintelligence/1trjv8m.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1trjv8m/what_dashboardreporting_tools_are_people_happiest/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "what dashboard/reporting tools are people happiest with right now?"
author: "BoldElara92"
date: "2026-05-29T23:55:28.000Z"
score: 15
upvote_ratio: 0.94
num_comments: 43
flair: ""
extracted_at: "2026-06-11T18:57:56.370Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1trjv8m.md#c0"
    char_span: [0, 854]
    sentence_count: 2
    key_terms: [businessintelligence, dashboarding, tools, automation, reporting, comments, people, power]
    concepts: [businessintelligence, dashboarding, automation, tools, reporting]
    token_count: 182
    sources: [{"n":"reddit-deep: r/businessintelligence","u":"https://www.reddit.com/r/BusinessIntelligence/comments/1trjv8m/what_dashboardreporting_tools_are_people_happiest/"}]
  - id: "social-intelligence/reddit-deep/businessintelligence/1trjv8m.md#c1"
    char_span: [868, 2502]
    sentence_count: 15
    key_terms: [metabase, knime, power, data, database, tables, prem, postgresql]
    concepts: [metabase, knime, power, database, tables]
    section: Comments
    token_count: 380
  - id: "social-intelligence/reddit-deep/businessintelligence/1trjv8m.md#c2"
    char_span: [2504, 4544]
    sentence_count: 9
    key_terms: [data, marketing, reporting, end, together, powerbi, revenue, answer]
    concepts: [marketing, reporting, together, powerbi, revenue]
    section: Comments
    token_count: 467
  - id: "social-intelligence/reddit-deep/businessintelligence/1trjv8m.md#c3"
    char_span: [4546, 5284]
    sentence_count: 3
    key_terms: [databricks, stack, own-bathroom-9258, nullymammoth, deployments, established, integration, prototyping]
    concepts: [databricks, stack]
    section: Comments
    token_count: 174
---
# what dashboard/reporting tools are people happiest with right now?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1trjv8m/what_dashboardreporting_tools_are_people_happiest/)
Posted by **BoldElara92** · **15↑** · **43 comments**

we’re evaluating dashboarding tools and I’m curious what people are actually using beyond the usual recommendations. currently using Power BI, but we’re also looking at platforms that can handle both reporting and some level of automation/data integration in the same stack.

our use case is pretty straightforward: mostly tracking marketing and social performance, not massive enterprise analytics.

for those who’ve used tools like Domo, Sisense, Looker Studio, Power BI, or similar, what ended up being the best balance of ease of use, automation, and dashboarding?

## Comments

- **saaggy_peneer** (4↑): Metabase, sqlmesh, duckdb


Costs us several dollars per month


Highly reliable, performant


The only maintenance we've needed are occasional security patches
  - **meatmick** (1↑): Do you use metabase as a data warehouse or you just pump data to it when ready? I was under the impression it was more of a local single user tool.
- **rinockla** (3↑): My workplace has on prem servers. So, open source tools like KNIME and Metabase have been working well with Power BI. It feels like they work together in the same stack. 

KNIME performs the ETL from various data sources to an Oracle database (which could have been a PostgreSQL database). Metabase can develop dashboards and reports from that database. 

Then, KNIME transforms the Oracle tables to delta tables on prem, and AzCopy can bring these delta tables to Fabric (Power BI). 

In addition to ETL, KNIME is very good at generating Excel files with conditional formatting, unique structure, etc. that are sometimes demanded by my users.

KNIME has stopped the development of their on prem scheduled batch executor though because it cannibalizes their KNIME Pro business. However, NodePit still has a 3rd party batch executor that still works.

Metabase prompts are more user friendly than Power BI. It also has free open source AI & MCP features. I believe they also have transformation features just for PostgreSQL. If I have Power BI reports that require much more than the F4 capacity that I have, I build them in Metabase instead.
- **parkerauk** (6↑): Do you need to be spending money on low value data? AI and a Viz library can see you right.

Or, if the data is worth something treat it to Qlik.
- **latent_signalcraft** (4↑): honestly if Power BI is already working i do need a strong reason to switch. for marketing reporting the bigger challenge is usually data integration and keeping metrics consistent not the dashboard layer itself.
  - **Successful_Pin_3456** (1↑): How's PowerBI catching up to the AI train? Is it easy to get a custom ad-hoc answer from the data models without having to drag and drop things or write DAX?
- **Successful_Pin_3456** (5↑): Omni, Hex, Supersimple are some of the loved ones. 

PowerBI if you have random/messy sources you need to glue together.
- **not_r1c1** (2↑): Obviously it depends on what you're using it for, who the ultimate audience is, etc...


In general though, cheap reporting tool and the savings spent on data remediation/assurance is going to beat the best reporting tool and low quality data every time, so I'd prioritise that if I were you. Especially when half the time it's going to end up being shown to end users a screenshot in a PowerPoint slide anyway....
- **TimmmmehGMC** (2↑): If you're looking for the most furious experience adminstration of a server, look no further than Oracle Analytic.
- **Tulu_One** (2↑): Honest take after evaluating most of these: for pure marketing performance tracking, they split into two problems. The cheaper ones (Looker Studio, Metabase) are good at visualizing data but weak at connecting marketing spend to actual business outcomes - you end up with nice dashboards that still can't answer "which channel is driving revenue." The enterprise stack (Domo, Sisense) can do it, but the price and implementation overhead is built for orgs 10x your size.

The gap in the middle - marketing data connected to CRM and revenue, at a price point that makes sense for SMBs and growth-stage teams - is genuinely underserved. It's actually why I ended up building Tulu rather than continuing to patch together third-party tools. Not pitching it here, just context for why I landed where I did.

For your current stage: Looker Studio will get you through the near term if you're mostly on Google stack. But the "automation + data integration in the same stack" requirement is where most of these fall short fast.
- **Own-Bathroom-9258** (2↑): Databricks AI/BI dashboards are decent if you’re already using Databricks. Still some gaps compared to more established solutions, but rapidly improving and good for quick prototyping
- **nullymammoth** (2↑): Databricks AI/BI fan!

- simple UI & agent (genie code) to help develop
- just JSON files behind the scene to store in source/automate deployments
- metric views upstream to define business metrics so other tools like agents, MCP, SQL, APIs etc can use too not just the dashboard :)
