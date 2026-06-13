---
id: social-intelligence/reddit-deep/dataengineering/1t7xwta.md
url: "https://www.reddit.com/r/dataengineering/comments/1t7xwta/data_infrastructure_at_mid_sized_company/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Data Infrastructure at Mid Sized Company"
author: "Feeling-Extreme-7555"
date: "2026-05-09T07:21:04.000Z"
score: 36
upvote_ratio: 0.91
num_comments: 53
flair: "Help"
extracted_at: "2026-06-11T18:58:17.201Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c0"
    char_span: [0, 2483]
    sentence_count: 24
    key_terms: [reports, data, reporting, infrastructure, report, manually, dataengineering, company]
    token_count: 497
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c1"
    char_span: [2485, 3488]
    sentence_count: 11
    key_terms: [whether, migration, company, fabric, data, sap, infrastructure, architecture]
    token_count: 192
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c2"
    char_span: [3503, 5490]
    sentence_count: 14
    key_terms: [python, like, erp, overkill, infrastructure, fabric, cron, need]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c3"
    char_span: [5492, 7617]
    sentence_count: 22
    key_terms: [data, per, erp, reporting, platform, infrastructure, manufacturing, month]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c4"
    char_span: [7622, 9808]
    sentence_count: 19
    key_terms: [fabric, data, get, sap, extracts, airflow, change, incremental]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c5"
    char_span: [9810, 11403]
    sentence_count: 10
    key_terms: [reporting, sap, data, system, warehouse, operational, erp, challenges]
    section: Comments
    token_count: 348
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c6"
    char_span: [11405, 12488]
    sentence_count: 7
    key_terms: [analytics, feeling-extreme-7555, excel, notes, data, want, tasrieitservices, infrastructure]
    section: Comments
    token_count: 238
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c7"
    char_span: [12493, 14628]
    sentence_count: 16
    key_terms: [fabric, azure, like, infrastructure, learn, don, need, databricks]
    section: Comments
    token_count: 491
  - id: "social-intelligence/reddit-deep/dataengineering/1t7xwta.md#c8"
    char_span: [14630, 15342]
    sentence_count: 8
    key_terms: [scheduler, data, transformation, separate, exasol, tools, etl, need]
    section: Comments
    token_count: 155
---
# Data Infrastructure at Mid Sized Company

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1t7xwta/data_infrastructure_at_mid_sized_company/)
Posted by **Feeling-Extreme-7555** · **36↑** · **53 comments**

5 days into a data analytics role at a 130-person manufacturer. Is this architecture overkill or am I thinking about this right.

The reporting situation I walked into is what you’d expect but worse than I initially described. We have zero data infrastructure. No data warehouse, no pipelines, no automation, nothing at all. Every single report across the entire company is built the same way - someone manually exports from SAP, pastes it into Excel, applies transformations that only they understand, and sends it out. That is the entire stack.

Just in the finance department alone I’ve identified at least 15 recurring reports done this way on the conservative side. Actuals vs plan, cost center reporting, sales register, board packages, forecasts, aging reports - all of them manual, all of them owned by specific individuals, none of them pulling from a shared data source, none of them guaranteed to reconcile with each other. When two reports reference the same underlying SAP data and show different numbers nobody can immediately explain why because the logic is undocumented and lives inside workbooks that have been manually maintained for years.

And that’s just finance. Other departments are running their own reports the same way and I genuinely don’t know how many exist company wide. Could easily be double. Could be more. Nobody has a full inventory of what reports exist, who owns them, or how they’re built.

Estimated manual reporting hours in finance alone is 60 to 100 hours a month conservatively. That’s not people being inefficient. That’s what happens when Excel is your entire data infrastructure and every reporting cycle depends on tribal knowledge and individual availability. When the person who owns a report is out the report either doesn’t go out or goes out wrong.

The other critical piece of context - we have an ERP migration coming mid to late 2027. Moving off SAP 2017 which has no API to something new TBD. Every manually built report in existence today gets rebuilt from scratch when that happens unless there’s an abstraction layer sitting between the source system and the reports. That’s not a small problem. That’s a massive organizational risk on top of an already complex migration.

I’m basically the only person here thinking seriously about any of this. My instinct is that cleaner spreadsheets aren’t the answer. The problem isn’t the Excel files, it’s that there’s no real infrastructure underneath them.

The architecture I keep coming back to is SAP exports feeding into a Microsoft Fabric lakehouse then into a Power BI semantic model. The appeal is that when the company eventually migrates off SAP the reporting layer survives. You swap the data source not rebuild everything from scratch. Every report that was built before the migration works the day after the migration.

What I’m genuinely unsure about is whether Fabric is overkill for a company this size, whether starting with a small F2 proof of concept makes sense before pushing for anything bigger, or whether I should be more patient and work within what exists until I actually understand the business better.

What y’all think. I’m new to data engineering and would appreciate the help!

EDIT: Added more context.

## Comments

- **Icy_Clench** (10↑): Why do you need Fabric exactly? If you just need something start simple and scale up. Start with Python and cron schedules and add something more complicated when it fulfills a business requirement.
  - **Feeling-Extreme-7555** (4↑): Love this and I’m actually getting Python + VS Code set up this week. Problem is cron needs somewhere to live and we have literally zero infrastructure - no server, no VM, nothing. Running it on my laptop isn’t a real solution. Fabric gives me managed Python notebooks with scheduling built in and nothing to maintain myself. Once I have more infrastructure to work with I’d revisit this.
    - **Lastrevio** (3↑): Why not just rent a lightweight virtual machine from a cheap prrovider like Hetzner and use Python (pandas/polars) + cron on that VM? From your other comments, it seemed like the data volume is very small so an entire ecosystem like Fabric is overkill.

Regarding migration: this might be overkill, but if you want your pipelines to survive both migrations then you can set up an intermediary layer between Python and SAP/the ERP that uses ODBC to connect and you can query the ERP directly using SQL. I think it's close to a microservices architecture, but not quite, just a de-coupling step. You create your own Python script that uses ODBC driver and the necessary credentials to connect to an ERP, and then simply define multiple connectors in separate files. Then you define your Python ETL logic on top of the data extracted through SQL by your ODBC connector.

If your company ever switches their ERP, then you just create a new connector without needing to change anything from your ETL logic.
    - **PepegaQuen** (-6↑): if you need to "set up" "Python + VS code" then I doubt your chances
- **PeitersSloppyBallz** (8↑): It is overkill, because it seems like you just have some few excel sheets.

Well the layout you have given us it not requirements, it seems more like you want to try some technologies.

You need to add numbers. How much data are there? 
What is the frequencies and what are the sources and how many.
Provide us with amount of rows, storage and the amounts the data is increasing.
  - **Feeling-Extreme-7555** (3↑): Fair, here’s the numbers. 10-15 recurring reports per month minimum for our finance department alone, probably more I haven’t found yet. 6k-12k rows per SAP pull per report. 4-8 manual hours per report per cycle. Estimated 60-100 manual reporting hours per month across the team. SAP 2017 on prem, no API, ERP migration coming 2027, M365 already licensed. It’s not that I want to play with new tech - it’s that Fabric is the only architecture where the reporting layer survives the ERP migration without being rebuilt from scratch. That’s the real driver.
    - **bakochba** (3↑): Why can't you just run a simple automation using Python or R to pull the raw data and apply the transformations and right to the final destination folder. Just a simple data pipeline
- **Gnaskefar** (4↑): No. You mention an F2. It is what.. 2-400$ a month for a fully managed data platform? That is not much money, requiring now real infrastructure/maintenance from your side.

  
The point about using the same platform when you change ERP is very valid. 

  
What is the end game for the data platform? 

You're hired into a manufacturing company with 130 people. What is the plan long term? In Fabric you can make the warehouse, get financial department's reporting to be efficient, and you can switch ERP. It all makes sense. 

When that is established, you have the manufacturing part where you (maybe, depending on the actual work) gather data from the processes and find out how many outages there are, or where the problems most often occur, etc.

  
To me it sounds like a great opportunity to set up all the basic financial/ERP stuff, and then play with shiny IoT/streaming stuff when that is in order. 

  
But sure, you can spin up a few VM's and do the work there, and set up failover, and backup, etc.

And then spin up some more giving you extra infrastructure work when the IoT stuff comes in later.

  
Or you can just use fabric, that for your case supports it all from the get go, and is cheap and you can buy bigger capacities as needed when the data expands.
- **Time-Category4939** (6↑): Fabric for a company that so far has worked only on excel files and was ok with it? It's overkill. Way too overkill.

Spin up an Airflow and a PostgreSQL instance, build a DWH and do the reporting out of it. Most likely you won't need more than that.
  - **Feeling-Extreme-7555** (3↑): I wish. I’m the only person here thinking about any of this. No data engineering team, no DevOps, nobody who’s ever touched Postgres. Airflow needs maintaining and so does a database instance. Fabric is fully managed, already potentially covered by our M365 license, and has a visual pipeline builder my finance team can actually understand. The incremental cost of Fabric is close to zero. The incremental cost of self managed Airflow and Postgres for a one person show is very much not zero.
    - **bakochba** (2↑): Just schedule a transformarion with a simple scheduled Python or R script. If you have to get money for new tech you're going to fail
- **Admirable_Writer_373** (3↑): It’s difficult to get data out of SAP. Not impossible- but you need someone who understands how and also how to architect the systems that it could go into.
- **rotr0102** (2↑): So - couple random thoughts:

1-the current SAP extracts, are they coming from SAP transactions, custom ABAP, or raw tables? If it’s NOT a SE16N raw table extract then you have ADDITIONAL complexity happing on the SAP side inside ABAP or the chosen t-code.

2-If you know a ERP change is happening your best to wait. Direction could change, or the role of BI might change (ie: finance might use new ERP better and not require extracts). Also data might not be apples to apples. Trying to get out ahead of this might cause waste and rework. However, if the project goes forward, and extracts are needed, fight for visibility in the project plan. The way these things work is you’ll be an afterthought and they will only consider you a month before go live AND they will say its mission critical to “just move the spreadsheets over” before go-live.

3-if you stay with SAP do some research on SAP DB replication. There are a few tools, but you can have your DBA replicate all that SAP data into an accessible reporting database that your BI tools can query - or you can first model into a star. You can move the logic out of excel into a data warehouse (ish) environment.
  - **OptimisticMartian** (1↑): Admittedly it’s probably been 15 years since I have used SAP, but why does he need a BI platform at all?  Doesn’t sap come with standard reporting?    He is describing basic forecast vs actual reporting - which would literally be a prebuilt report in any sap system I used, complete with field names in German.    

And if you get fancy and use a bit of ABAP, which should take about 15 minutes to learn - then you can have CUSTOM reports.
    - **rotr0102** (2↑): Using the source system to do reporting can suffer from several challenges. One of them is when you need gain a perspective that the source system does not offer - like when you have multiple systems in play (like a ERP, CRM, Warranty, etc., etc.) or multiple instances/systems (many ERPs). Hence the idea of data warehouse as a data centralization tool. Another classic example is challenges of reporting against your operational database (ie: load), or that history may be purged from the operational system when it is desired for analytics. The many more parts to this answer, but in general the ERP is to execute certain business processes, while the data warehouse (analytics) is to understand business processes in the organization (which not be covered by said ERP). 

Edit:  Reading the question, I focused on the tons’ of complicated spreadsheets part, which tells me there is something not being said about the amount of data and analytics (ie: they are building a Excel spread-mart). Now, to your point, if the scope is narrowed to financial statements that SAP can generate, and that is satisfactory, then they should go that route. BI/DW adds a layer that this org probably doesn’t want.
- **tasrieitservices** (2↑): F2 POC makes total sense for your size. Start there.
Inventory the reports first, pick the messiest one and land it in Fabric. That one working semantic model surviving a source swap is your business case for everything else.
We’ve helped teams move through this exact setup faster if you ever want to compare notes.
  - **Feeling-Extreme-7555** (2↑): I would love guidance and comparing notes, I have about 4 years of experience in data analytics(mainly PowerBI Dashboards, excel analysis) but my previous company had their shit together when it came to infrastructure and pipelines so I was never exposed to learning any of it.

  
I am also starting a Masters in Data Science program this fall, hoping to learn as much as I can. Data Engineering is honestly really cool even if I am stressed. Automating shit I don't want to do also is very appealing to my brain.
    - **tasrieitservices** (2↑): Good position to be in actually. Power BI background means you already understand what the pipeline needs to produce, that’s half the battle.
For the infrastructure side, Fabric has decent free learning resources and the F2 SKU is cheap enough to just spin up and break things. Best way to learn it.
We do this kind of setup professionally if it ever gets beyond what you can handle solo, but for now just DM if you get stuck on anything specific
- **joe9439** (1↑): I think Databricks is an easy sell if they have something like azure already because it’s just pay as you go.
  - **Feeling-Extreme-7555** (1↑): We’re on Microsoft 365 but honestly not sure if we have Azure set up. Would that be a blocker or is Databricks accessible without it? Either way I’m probably better served starting with Fabric since it’s native to M365 and I don’t have to go figure out our Azure situation on top of everything else I’m dealing with on day 5.
    - **joe9439** (2↑): It’s true that if you don’t know Cloud infrastructure like azure you will either need help setting it up or need to learn more than you would need to just going with Fabric. I’ve used both. I think that fabric is more annoying to deal with a less capable. They have the credit system with whatever plan is chosen which has created awkward situations for me before where it’s like sorry you can’t open reports anymore today because the company has had too many meetings and used the credits up.
- **ugamarkj** (1↑): I’d use the free community edition of Exasol. Do a POC with it on your own PC. Costs you nothing but your time and it is a very solid EDW platform. You could use Excel with a direct connection for some quick wins. It works really well with Tableau as a front end with live queries so you don’t have to run extracts to a visualization tool if you want to migrate to something like that later. 

You don’t need separate ETL tools or data transformation tools. Just create connections to SAP and other systems via ODBC in Exasol and do your ETL with a script in Exasol or just use virtual schemas. Materialized views can handle any data transformations faster than a separate data transformation tool. You will need an external scheduler, but that can be done with cron jobs or even Windows task scheduler. We actually use Jupyter Hub as our scheduler now.
- **Speedbird_** (1↑): One battle at a time is my advice. Sounds like you’ve a lot of work ahead of you. 

Good luck on the SAP side of things, they are cracking down on data extraction and replication. They changed their policies just a few weeks ago.
