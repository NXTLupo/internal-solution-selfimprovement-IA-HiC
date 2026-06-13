---
id: social-intelligence/reddit-deep/dataengineering/1tislkl.md
url: "https://www.reddit.com/r/dataengineering/comments/1tislkl/cheapest_possible_full_analytics_stack/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Cheapest possible full analytics stack?"
author: "tomtombow"
date: "2026-05-20T17:27:38.000Z"
score: 24
upvote_ratio: 0.87
num_comments: 42
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.205Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1tislkl.md#c0"
    char_span: [0, 1570]
    sentence_count: 11
    key_terms: [data, analytics, dataengineering, company, warehouses, business, cheapest, comments]
    token_count: 342
  - id: "social-intelligence/reddit-deep/dataengineering/1tislkl.md#c1"
    char_span: [1585, 3406]
    sentence_count: 16
    key_terms: [airflow, duckdb, postgres, saltedappleandcorn, data, use, prefect, like]
    section: Comments
    token_count: 494
  - id: "social-intelligence/reddit-deep/dataengineering/1tislkl.md#c2"
    char_span: [3408, 5514]
    sentence_count: 19
    key_terms: [iceberg, warehouse, migrate, entire, fabric, close, data, like]
    section: Comments
    token_count: 474
  - id: "social-intelligence/reddit-deep/dataengineering/1tislkl.md#c3"
    char_span: [5516, 7618]
    sentence_count: 24
    key_terms: [data, azure, going, using, adaptable, warehouse, database, prestodb]
    section: Comments
    token_count: 488
  - id: "social-intelligence/reddit-deep/dataengineering/1tislkl.md#c4"
    char_span: [7620, 9714]
    sentence_count: 16
    key_terms: [data, already, simple, everything, companies, ecommerce, microsoft, platform]
    section: Comments
    token_count: 471
  - id: "social-intelligence/reddit-deep/dataengineering/1tislkl.md#c5"
    char_span: [9716, 11519]
    sentence_count: 11
    key_terms: [cloud, data, google, business, platform, storage, studio, orchestration]
    section: Comments
    token_count: 357
---
# Cheapest possible full analytics stack?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1tislkl/cheapest_possible_full_analytics_stack/)
Posted by **tomtombow** · **24↑** · **42 comments**

Hello! I am a relatively experieced a analytics engineer and I kind of have an idea of the price range of the architecture i am suggesting, but i want to know your take!

The exercise here is to suggest a business setting and try to come up with thecheapest possible production ready set of tool to run it. 

Imagine a traditional wholesale company, in the fashion good industry. 2 warehouses (physical, not data warehouses), around 3000 incoming orders per month, 30000 outgoing. Data sources are mainly ERP, provider offers, ticketing system for client complaints, CRM, some supply chain data like delivery times, wayslips...

So the goal here is to have a star schema with all the data needed to understand the business. Nothing fancy, no ML, no AI. Just a good data warehouse, reporting built on top.

The condition is to centralise all data, have full analytics visibility, and use only Cloud resources (all company systems are in the cloud)

So my question is, with the existing available Data tools (ETL, Visualisation...) and without ever running stuff locally (so a notebook with hardcoded API keys does not count), what is the cheapest you could run the analytics stack on this company (excluding headcount)?

PS: i now see this question could seem like i am looking to buy tooling. i am not and this is purely hypothetical.

## Comments

- **dereckgcc** (14↑): I’d say prefect/airflow, Postgres and Superset in a cloud VM.
  - **tomtombow** (3↑): where does the cleaning happen? inside prefect? so pure ETL? I see some value in storing raw data and then running a transformation pipeline like dbt...
    - **dereckgcc** (2↑): Maybe Garage S3? To store the raw data
    - **Equivalent_Effect_93** (2↑): At that amount of data postgres should be good, run elt, just land it in and then run stored proc on the orchestrator (airflow, prefect, dagster) to do the cleaned and serving tables. And if postgres is having trouble, you can always play with columnar extension. If it's still not performing, object storage with iceberg, use duck db as the query engine.
- **saltedappleandcorn** (12↑): duckdb on ECS tasks via step functions. No fixed costs. Very cheap. Surprisingly fast
- **magoju** (14↑): DuckDB + Airflow running on AKS/EKS or whatever cloud provider you have. That’s it.
  - **Outrageous_Let5743** (6↑): Does duckdb work? Cause you can only have one connection at the time because of file locking.
    - **hornyforsavings** (12↑): You can run DuckDB as a server now with the new quack extension. No locking
    - **dangerbird2** (2↑): Duck lake is shockingly easy to set up. Just use need a Postgres database for the catalog and either file or s3 storage. And it installs itself on the fly with a duckdb \`attach\` statement
  - **tomtombow** (3↑): Isn't airflow overkill for this setup? we use airflow on composer at work and the cheapest is like 300$ per month... For 5/6 api pulls and 1/2 dbt runs per day this feels like a lot...
    - **saltedappleandcorn** (9↑): Yeah. We use duckdb on ECS tasks via step functions in prod for our data lake. Very cheap
    - **NotDoingSoGreatToday** (5↑): Yeah literally no reason to suggest EKS or airflow lol

Cron and ec2
- **Omar_88** (3↑): You could probably run the entire thing close to free as possible.

GitHub runners for CI
Aws lamdas for ingest.
Paid prefect I'm sure the lowest saas tiers are like 10 USD a month
Postgres instance with dbt lowest tiers are like 15 USD or less.
Use secrets managers for all your keys 
Create IAM roles and delegate access accordingly
Setup network rules. Disable password Auth only allow IAM based authentication.

Terraform the entire stack, tbf other than the data modelling you could probably stand this up in less than 2-3 days.
- **k00_x** (2↑): Shell, postgres and streamlit on an old laptop.
- **Immediate-Pair-4290** (1↑): Im going to start with a caution here before giving an answer. I think it’s a mistake to build a warehouse exclusively for the needs of today without planning for the needs of tomorrow. You are saying “no frills, just BI.” This is at odds with the state of the market as all vendors are pouring R&D into to disrupting traditional BI. By designing your warehouse strictly around BI requirements you risk the warehouse being too inflexible to adapt to a world where LLMs and agents become primary consumers of the data.

That brings me to what I think is the best cheap warehouse option for 2026: Iceberg on object storage + open source tooling. Iceberg is the first class citizen of adaptable data warehouses and it’s not even close. Did you know that your iceberg tables can be read AND written to by Databricks, Snowflake, Fabric, BigQuery, Trino, DuckDB, Polars, and Spark (just to scratch the surface). Iceberg is your unchanging foundation. Assume that the rest is going change. Let’s contrast this with a bad decision: “We built our entire warehouse on Fabric because our BI team uses Power BI”. If your BI tool goes out of style you will need to migrate. If there is a major breakthrough in AI agents that Fabric cannot integrate you will need to migrate. By building on Iceberg you won’t have to migrate. Although I really like DuckLake I cannot recommend it over Iceberg today because the level of flexibility here is not even close.

Finally I want to briefly address the “open source tooling”. For the rest of the stack there is not a clear winner and you can make an argument for one tool over another. Out of these the most impactful for an adaptable compute layer would be dbt or SQLMesh where dbt is the safe pick of the two. Other notable mentions include DuckDB for compute and dlt (data load tool) for data ingestion. You will also want to use a data catalog on top of iceberg. Polaris or Nessie are probably the top 2 picks here. Dagster or Prefect for orchestration. By using SQLMesh you can possibly avoid one altogether.

By making your warehouse adaptable you effectively build the “cheapest” warehouse by not having to rebuild it in 2 years. Labor and maintenance are a big part of the cost!
  - **soullesseal** (1↑): Question on your iceberg choice. Would that answer largely depend on how much and frequently data is retrieved from cold storage? I was going research on this last month for a company and in my assessment determined just using intelligent tiering would actually save on processing costs for how often then would need to retrieve “cold data”.  And when you bring up agents and LLMs full data scans will be more likely and increasing the amount of times you would need to pull the data. 

Assuming it’s a new business it’s likely not going to include enough data for that to really matter. 

I’m by no means poopooing your idea. I believe we are still going with glacier but I have no idea why. So I thought I’d ask here since you brought it up. :)
- **Holiday_Hat_8605** (1↑): You can checkout Open Source Presto for querying data: [https://prestodb.io/](https://prestodb.io/)
- **Mordalfus** (-4↑): A company like this is probably in Microsoft already.  That means you're using Azure. 

Azure SQL Database with 2x vCores starts about $400/month.  It's the managed cloud offering so backups and such are handled for you.  The management overhead is minimal and you can easily scale it up as your database grows. 

Azure Data Factory for ETL.  The cost is usage based.  Use only the copy data task in ADF. 

You may also need an Azure Windows VM for some reason, and you can run the ADF integration runtime on the VM to lower cost. You would use the VM for your custom python jobs that you can't do with ADF. Trigger your dbt models from the VM, if you're using dbt. 

Reporting is PowerBI.  If your employees have E5 Microsoft licenses, then they already have PowerBI Pro and there is basically no cost here. 

I know this works because it's what I built three years ago at my company. We have since scaled way up, but that's still the core of the platform.  Being based on SQL Server, this setup looks understandable to old hands but is flexible and modern.

PS: Accessory services include vNets, Key Vault, blob storage. The company may already have these, so they may or may not be needed.
  - **tomtombow** (5↑): so 400 baseline, + Data Factory + Power BI (E5 gives explorer permissions but you still need some licences for development iirc)... That sounds crazy expensive for such a simple stack, and also very "interface-first"... 

Even with the "already in Microsoft" assumption, I would be very weary going that route...
- **uncertainschrodinger** (0↑): I just did a very similar stack a few weeks ago for an ecommerce client. The client wanted something very simple and cheap that they can maintain themselves, so instead of stitching different tools together, we set up bruin to handle the data ingestion, transformation, and orchestration.

At first they wanted to run everything on an EC2 instance but then decided to go with bruin cloud, the free tier will cover the costs for almost a few months and then after than maybe $15-20 per month.
- **dknconsultau** (0↑): My hot take is that companies like this usually only have one proper data person, so they end up doing everything: architecture, data engineering, analytics, dashboards… and fixing the odd printer lol.

To keep things simple, I’d pick one cloud platform and mostly use the tools inside that ecosystem. For these kinds of requests, GCP is often the best entry point, especially for ecommerce companies in the $5–10m range.

It works well with Google Sheets (which ecommerce teams love), you get basic BI capability with Looker Studio/Data Studio, and BigQuery gives you a fast path into a reasonably enterprise-grade cloud data warehouse. You also get solid IAM/security controls plus enough orchestration and scheduling tools inside GCP to get started without overengineering things.

Another advantage is the API flexibility. If the company uses some lesser-known SaaS platform, you can usually build lightweight integrations fairly easily.

If you really want to simplify the ELT side, just use Fivetran. Yes, it costs money, but for a one-person data team, reducing maintenance overhead is often worth it. You can always evolve and upgrade the stack later as the business grows.

One thing I’d strongly recommend is including cost modelling in the exec presentation. Leadership needs to understand that cloud analytics is a “pay-to-play” model. Bad queries, poor dashboard design, and always-on infrastructure can create unexpected costs very quickly. You don’t want the first cloud bill causing sticker shock.

* Google Workspace — Business productivity suite
* Gmail — Business email platform
* Google Drive — Cloud file storage and CSV landing zone
* Google Sheets — Operational reporting and manual data input
* GCP — Core cloud platform
* BigQuery — Cloud data warehouse
* Looker Studio — BI dashboards and reporting
* Fivetran — ELT/ETL data ingestion
* dbt Core — Data transformation and modelling
* Cloud Storage — Raw file and backup storage
* Cloud Scheduler — Job scheduling and orchestration
* Cloud Run — Serverless compute for scripts and integrations
* IAM — Security and access management
* GitHub — Version control and code repository
* Monitoring & Billing Alerts — Cost control and operational monitoring
