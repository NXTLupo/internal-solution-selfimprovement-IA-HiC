---
id: social-intelligence/reddit-deep/dataengineering/1qdv3wh.md
url: "https://www.reddit.com/r/dataengineering/comments/1qdv3wh/getting_off_of_fabric/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Getting off of Fabric."
author: "FirefighterFormal638"
date: "2026-01-15T20:39:42.000Z"
score: 91
upvote_ratio: 0.96
num_comments: 106
flair: "Help"
extracted_at: "2026-06-29T14:40:47.212Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c0"
    char_span: [0, 1903]
    sentence_count: 18
    key_terms: [data, fabric, sql, dataengineering, little, server, capacity, comments]
    concepts: [fabric, dataengineering, little, server, capacity]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c2", "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c5"]
    token_count: 432
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1qdv3wh/getting_off_of_fabric/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c1"
    char_span: [1917, 3929]
    sentence_count: 7
    key_terms: [fabric, tcubedgaming, firefighterformal638, pipelines, use, adf, activity, "isn't"]
    concepts: [fabric, tcubedgaming, firefighterformal638, pipelines, activity]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c2"
    char_span: [3931, 6061]
    sentence_count: 18
    key_terms: [sql, capacity, database, fabric, server, copy, data, tables]
    concepts: [capacity, database, fabric, server, tables]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c0", "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c5"]
    section: Comments
    token_count: 479
  - id: "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c3"
    char_span: [6063, 8161]
    sentence_count: 19
    key_terms: [fabric, databricks, data, notebooks, like, functionality, technojoe99, adf]
    concepts: [fabric, databricks, notebooks, functionality, technojoe99]
    section: Comments
    token_count: 493
  - id: "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c4"
    char_span: [8163, 8884]
    sentence_count: 7
    key_terms: [mirroring, on-prem, firefighterformal638, "can't", since, spark, sql, use]
    concepts: [mirroring, on-prem, "can't", since, spark]
    section: Comments
    token_count: 166
  - id: "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c5"
    char_span: [8886, 10618]
    sentence_count: 10
    key_terms: [fabric, microsoft, server, data, like, developers, inherently, mirroring]
    concepts: [fabric, microsoft, server, developers, inherently]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c0", "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c2"]
    section: Comments
    token_count: 439
  - id: "social-intelligence/reddit-deep/dataengineering/1qdv3wh.md#c6"
    char_span: [10620, 11014]
    sentence_count: 4
    key_terms: [toweroutrageous5939, actionorganic4617, especially, microslops, expensive, frequency, mirroring, recommend]
    section: Comments
    token_count: 98
---
# Getting off of Fabric.

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1qdv3wh/getting_off_of_fabric/)
Posted by **FirefighterFormal638** · **91↑** · **106 comments**

Just as the title says. Fabric has been a pretty rough experience.

I am a team of one in a company that has little data problems. Like, less than 1 TB of data that will be used for processing/analytics in the future with < 200 people with maybe \~20 utilizing data from Fabric. Most data sources (like 90 %) are from on-prem SQL server. The rest is CSVs, some APIs.

A little about my skillset - I came from a software engineering background (SQLite, SQL Server, C#, WinForms/Avalonia). I’m intermediate with Python and SQL now. The problem. Fabric hasn’t been great, but I’ve learned it well enough to understand the business and their actual data needs.

The core issues:

* Random pipeline failures or hangs with very little actionable error output
* Ingestion from SQL Server relies heavily on Copy Data Activity, which is slow and compute-heavy
* ETL, refreshes, and BI all share the same capacity
* When a pipeline hangs or spikes usage, capacity shoots up and Power BI visuals become unusable
* Debugging is painful and opaque due to UI-driven workflows and preview features

The main priority right now is stable, reliable BI. I'm open to feedback on more things I need to learn. For instance, better data modeling.

Coming from SWE, I miss the control and being granular with execution and being able to reason about failures via logs and code.

I'm looking at Databricks and Snowflake as options (per the Architect that originally adopted Fabric) but I think since we are still in early phases of data, we may not need the price heavy SaaS.

DE royalty (lords, ladies, and everyone else), let me know your opinions.

  
EDITED: Because there was too much details and colleagues.

## Comments

- **TCubedGaming** (133↑): Looking for the guys that told me fabric is the future
  - **No_Lifeguard_64** (27↑): I have a friend that is all eggs in the Fabric basket and to him Fabric is the best thing since Jesus.
    - **FirefighterFormal638** (30↑): He got lost in the sauce of the msft eco-system.
    - **TCubedGaming** (5↑): Even when our org tested it out, the pipelines would stall out all the time. We have system critical pipelines that run on ADF and have never failed for a "hang up"

I would never feel comfortable about putting those pipelines on "PowerBi.com" rather than a dedicated engine whose only purpose is to ship data
    - **SOLID_STATE_DlCK** (3↑): Maybe he's making an omelette.  In that case, Fabric is the solution.
    - **ab624** (-1↑): but even Jesus the DE consultant won't recommend fabric
  - **VarietyOk7120** (3↑): Fabric is fine, not perfect but not what this thread says either. 
This guy wants a code heavy ETL by the sounds of it, for his preference of debugging. 
1) If you look at Snowflake , people are also using ADF and the Copy Activity as a pattern 
2) The issue here is the on Prem source , there isn't a way to connect - perhaps a shortcut would work and then a notebook on that to do transformations in his language of choice ?
    - **TCubedGaming** (6↑): Why not just use ADF for a fraction of the cost?
- **silentlegacyfalls** (34↑): Fabric is fine for the right use case, but it sure as hell isn't low-code / no-code if you want good, cost-conscious, efficient performance.
  - **FirefighterFormal638** (4↑): Agreed. A huge limitation is connecting to the on-prem SQL servers. Being forced to use their copy data activity for it eats up CUs. Wishing I could just use python scripts for the ingestion into the warehouse.
    - **sjcuthbertson** (13↑): Have you explored mirroring the DBs into Fabric first (standalone workspace and capacity _solely_ for mirror objects) and then ingesting further if needed into your standard medallion or equivalent process?

Re your capacity woes - you _could_ address that by just running two smaller capacities instead of one big one; one for all the DE stuff, the other for end user BI. Then the BI experience is insulated from any spikes upstream. If you are still doing import mode for BI reports then you could even just have them in Pro workspaces, based on your user count.

Ultimately if you don't like Fabric and want to move to something different, you do you - but those small wins _might_ make it less painful and less necessary to rebuild on a different stack.

Fwiw we've not had any "random" pipeline failures that we couldn't debug and understand the reason for. There have been a few (very few) examples of python notebooks misbehaving for _odd_ reasons - what feels like problems happening on the level of the underlying Azure infrastructure running Fabric. But for us, those are a fair trade-off for the benefits we're getting. YMMV of course. Not trying to convince you, just offering my experience.
    - **silentlegacyfalls** (2↑): I use python scripts to consume 3rd party data into my Fabric SQL Database.  Haven't had to integrate with on-prem yet.  Are you seriously stuck with Copy?
    - **JBalloonist** (1↑): How big are your tables? How many tables? 

I copy just the tables I need (about 60) daily (some hourly) from an on-premise SQL server and rarely have problems. I’m only using one F4 capacity for everything (not best practice I know but trying to manage cost). The copy activity is definitely the highest usage but it is consistently below 50 percent capacity. 

I haven’t tried using a pure Warehouse; my entire architecture is on Lakehouses. That might where the difference is. Every time I spin up a Warehouse it seems to use a lot of capacity, even if there is little to no data.
- **babygrenade** (9↑): >Ingestion from SQL Server relies heavily on Copy Data Activity

If most of the data is from on prem SQL Server (I'm assuming this is your transaction database) why aren't you mirroring the SQL server database into fabric (or into an Azure SQL database)?


>I'm looking at Databricks and Snowflake as options

If you have small to medium data, why are you looking at big data platforms?
  - **wubalubadubdub55** (-3↑): This OP guy just wants to hate on fabric and suffers from severe skill issue.
- **technojoe99** (7↑): My company uses ADF to load data into Fabric. From there, we transform the data as needed via Notebooks written in Python and SQL. It works very well, and is stable unless there's an update that borks the self-hosted integrated runtime. 

I think moving your ingestion from Fabric to ADF while keeping fabric for everything else would get you the most bang for your buck. Databricks provides similar functionality with their notebooks, but it would be a larger effort to move to them.
  - **TCubedGaming** (1↑): Why put fabric in between adf and databricks? What value is added?
    - **technojoe99** (2↑): I don't have databricks at all. I was merely speaking to him considering switching to Databricks, by saying Databricks provides comparable functionality.
- **Weekly_Activity4278** (6↑): Another one of these. 

You know you can put your ETL items like notebooks and pipelines in a separate capacity right? So it doesn’t affect your BI items like reports and semantic models. Feels like more of an implementation issue rather than the product itself. 

Also have looked into mirroring which is free for upto 5TB of storage? 

I get it’s cool to hate on Fabric or whatever and I am ok with criticism of Microsoft but this just screams lazy to me.
- **AtypiclAvngr** (8↑): OP, reading your context was like looking in a mirror. I'm basically in the same situation across the board regarding history and experience. However, I've had a totally different Fabric experience. Never had anything fail, been working super efficiently, and easy to debug. Granted, coming from a 3rd party tool with zero visibility. 

My data complexity, scale, and user base is a little higher than what you listed, but my entire backend fits easily on an F4.

For my approach, I only used Spark (pyspark or spark sql) and a medallion approach. All the cdc pipelines work great, and I haven't had any issues.

I have to ask, how come you can't use mirroring for your on-prem sql? Or at least spark if not mirroring.

For the front end, I just approached it via segmentation of capacity. So, each business domain only throttles themselves. But that doesn't happen much since nobody uses paginated reports, and the data models are pretty clean.

Honestly, I'd still rather use Databricks, but my problem is I can't justify it to my organization since I made the Fabric site work too well on its own...
  - **FirefighterFormal638** (1↑): Last I researched, it was not possible to route directly from a Spark Notebook to an on-prem SQL Server. I have the medallion approach implemented and it did teach me a lot stepping into the role.

I believe the last time that I looked into it, mirroring had it's limitations as well.
    - **AtypiclAvngr** (6↑): Not out of the box. I have spark environments with jdbc drivers to different systems set up. Used that for sql server to start, but mirroring with an on prem sqp server gateway just worked way better and had even less capacity usage. Someone else on my infrastructure team set that up though, so I don't know what it entails, but it made the ELT much easier
- **Nekobul** (3↑): Why not use SSIS to push your data from on-premises? In this way you will use your local server computing capacity.
- **Vw-Bee5498** (4↑): I used to build data warehouse on Fabric and agree debugging was cumbersome. The Data Factory within Fabric portal didn't have the same features as DF on standalone Azure. But I find the UI better than Databricks though.
- **vikster1** (20↑): my heart jumps for joy each time i read about fabric being bad. third year now and i cherish every post. thank you and i hope microslop tanks 50% in value over the next 2 years.
  - **RemarkableCompote517** (6↑): I read that fabric lost 4% of a cloud market last year (32 -> 27%), so your dreams come true
    - **EcoEng** (3↑): Source?
    - **splynta** (1↑): Is that size of pie or size of slice in terms of market share? Like did the pie get bigger but their slice stayed the same or they lost?
  - **wubalubadubdub55** (2↑): It’s interesting how Redditors think everything out of Microsoft is inherently bad and anything else is inherently good. 

I mean aren’t the developers at Microsoft just like you and I trying to build and ship something great? 

As a fellow dev, I can’t put other developers down like that just because they work at Microsoft. 

Judge a product based on its features not where it comes from.
  - **TowerOutrageous5939** (1↑): It’s makes zero sense to pick fabric. You are locking yourself into microslops road map. Yah f that noise.
- **ActionOrganic4617** (3↑): I found the copy activity, especially for high frequency jobs more expensive than ADF. To make the best of the platform, I’d recommend mirroring for SQL tables.
