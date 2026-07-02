---
id: social-intelligence/reddit-deep/dataengineering/1qyrqkz.md
url: "https://www.reddit.com/r/dataengineering/comments/1qyrqkz/data_warehouse_replacement/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Data Warehouse Replacement"
author: "Heyohz"
date: "2026-02-07T22:39:50.000Z"
score: 26
upvote_ratio: 0.94
num_comments: 53
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.209Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1qyrqkz.md#c0"
    char_span: [0, 1051]
    sentence_count: 6
    key_terms: [data, warehouse, database, dataengineering, on-prem, source, presentation, replacement]
    concepts: [warehouse, database, dataengineering, on-prem, presentation]
    token_count: 236
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1qyrqkz/data_warehouse_replacement/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1qyrqkz.md#c1"
    char_span: [1065, 2036]
    sentence_count: 7
    key_terms: [dataengineering, technology, resources, learning, cutting, moist-literature-763, community-submitted, data]
    concepts: [dataengineering, technology, resources, learning, cutting]
    section: Comments
    token_count: 223
  - id: "social-intelligence/reddit-deep/dataengineering/1qyrqkz.md#c2"
    char_span: [2038, 4072]
    sentence_count: 13
    key_terms: [data, constraints, performance, clickhouse, postgresql, reddtomato, technology, employees]
    concepts: [constraints, performance, clickhouse, postgresql, reddtomato]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/dataengineering/1qyrqkz.md#c3"
    char_span: [4074, 6488]
    sentence_count: 19
    key_terms: [warehouse, data, development, sometimes, technical, engine, source, get]
    concepts: [warehouse, development, sometimes, technical, engine]
    section: Comments
    token_count: 511
---
# Data Warehouse Replacement

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1qyrqkz/data_warehouse_replacement/)
Posted by **Heyohz** · **26↑** · **53 comments**

We’re looking to modernize our data environment and we have the following infrastructure:

**Database:** mostly SQL Server, split between on-prem and Azure.

**Data Pipeline:**  SSIS for most database to database data movement, and Python for sourcing APIs (about 3/4 of our data warehouse sources are APIs).

**Data Warehouse:**  beefy on-prem SQL Server box, database engine and SSAS tabular as the data warehouse.

**Presentation**:  Power BI for presentation and obviously a lot of Excel for our Finance group.

We’re looking to replacement our Data Warehouse and pipeline, with keeping Power BI.  Our main source of pain is development time to get our data piepline’s setup and get data consumable by our users.

What should we evaluate?  Open source, on-prem, cloud, we’re game for anything.  Assume no financial or resource constraints.

## Comments

- **AutoModerator** (1↑): You can find a list of community-submitted learning resources here: https://dataengineering.wiki/Learning+Resources

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **Moist-Literature-763** (14↑): Maybe a stupid question, but why do you want to modernize your infrastructure? MSSQL is still state of the art even though it is no longer cutting edge. But does your company really need cutting edge? Do you have performance constraints?

I'm getting the pain of SSIS and SSAS but I would rather replace SSIS with different data pipeline technology like Airflow or similar.

Don't get me wrong, but a new technology is usually not helping to resolve the usual issues behind it. (low data quality, no business ownership and so on)
  - **pimmen89** (6↑): Say the last part louder for the people in the back!

I’ve ran into data quality issues throughout my 10 year career in DE, and technology can only help enforce a culture of data quality. It is no substitute for the company actually caring, you need people to care or it’s just a mever rnding arms race against your own employees because to them, misrepresenting data is how they game the system. If the system is awful and against the values the employees subscribe to, your data will be bonkers.
  - **Nekobul** (2↑): Airflow is just an orchestrator written in Python. It doesn't have the same capabilities or performance as SSIS.
- **reddtomato** (20↑): The obvious answer is Snowflake ❄️.
  - **No_Flounder_1155** (8↑): why should they leave on prem?
    - **reddtomato** (2↑): Have you ever had to do capacity planning and budget approvals for getting capital to buy new hardware on prem? That you are then stuck with for 5 years. It’s a nightmare, be free of that and always have the capacity you need. And so many other reasons to make your life as a data person better, so you can focus on data and solving business problems.
  - **GreyHairedDWGuy** (1↑): agreed
- **Intelligent_Series_4** (3↑): What are your staffing and financial constraints?
  - **Heyohz** (3↑): For this conversation Im assuming no resource or financial constraints (its left to us to justify performance for $).
- **Winterfrost15** (3↑): Stay with Sql Server on-prem. You get a proven technology at a good cost and are able to get great developers for it.
- **cwakare** (2↑): Most of the time one spends goes in building data pipelines. For our use case for a manufacturing (smb) our stack was 1. Clickhouse 2. Airbyte 3. Postgresql 

PS: This was 2024/Early 2025 - We recently saw a blog post of some native Postgresql to clickhouse native tool that might do away with requiring Airbyte
- **Thavash** (5↑): Since you're mostly a Microsoft shop the transition to Fabric makes sense. 
Plus you want to keep Power BI , which is the same service as Fabric, so you'll have it anyway (always avoid moving data). 

You could either go Fabric Warehouse which is closer to your older SQL warehouse )although MPP , or go with Fabric Lake house
  - **No_Election_3206** (2↑): And they can replace SSAS with Direct Lake semantic model
- **Gnaskefar** (3↑): > Our main source of pain is development time to get our data piepline’s setup and get data consumable by our users.

Is that the only reason for replacement?

Is the development slow in the SSIS, and what would a change to fx Databricks change in that regard?


> What should we evaluate? Open source, on-prem, cloud, we’re game for anything. Assume no financial or resource constraints.

Whatever shiny toy you wanna play with.
You give no technical issues, we can suggest anything related to.

With such an open question, expect just to get peoples favorite tool/platform. Not any technical guidance.
- **Independent-Arrival1** (4↑): Hi, 

If you want, you can take a closer look at the pipeline and modelling workflow before replacing the warehouse entirely, if development time is the main issue.

Sometimes, for SQL Server + SSIS environments, the delays can come from onboarding new sources ( e.g. APIs ) and shaping the data into something usable for reporting, rather than the warehouse engine itself. 

Sometimes, teams decide to go with small improvements like standardizing ingestion and transformations, while sometimes they decide it’s a good point to redesign the whole stack.

Where does most of your time go today, getting new data into the warehouse, or shaping it into something usable for reports?

Thank you
  - **Nekobul** (2↑): SSIS has great third-party ecosystem of extensions available. Some of them are state of the art in terms of handling REST APIs and also very affordable.
- **bajams** (3↑): It is important to distinguish a Data Warehouse from a standalone Query Engine (e.g.: a SQL Server). A warehouse acts as your unified source of truth, its efficiency depends on

1. Ingestion Strategy: You must determine if your workload requires real-time streaming, scheduled batch processing, or on-demand triggers.

2. Query Optimization: Choose an engine tailored to your specific access patterns—whether that involves columnar storage for analytical speed, a Data Lakehouse for flexibility, or advanced indexing strategies.

By mapping these technical requirements against your pain points, you will have a solution that makes sense and costs lower.
