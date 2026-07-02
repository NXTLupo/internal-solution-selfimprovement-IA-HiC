---
id: social-intelligence/reddit-deep/dataengineering/1u70qmg.md
url: "https://www.reddit.com/r/dataengineering/comments/1u70qmg/lot_of_fancy_terms_but_nothing_really_has_changed/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Lot of fancy terms, but nothing really has changed"
author: "Complete-Regret-4300"
date: "2026-06-16T02:16:49.000Z"
score: 92
upvote_ratio: 0.92
num_comments: 78
flair: "Discussion"
extracted_at: "2026-06-29T14:40:47.211Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c0"
    char_span: [0, 2054]
    sentence_count: 18
    key_terms: [data, fancy, like, dataengineering, changed, source, datawarehouse, cubes]
    concepts: [dataengineering, fancy, datawarehouse, changed, source]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c3"]
    token_count: 453
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1u70qmg/lot_of_fancy_terms_but_nothing_really_has_changed/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c1"
    char_span: [2056, 2767]
    sentence_count: 6
    key_terms: [data, businesses, explosion, customers, customer, millions, revenue, banks]
    concepts: [businesses, explosion, customers, customer, millions]
    token_count: 134
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c2"
    char_span: [2781, 4413]
    sentence_count: 12
    key_terms: [data, job, company, tools, available, comment, details, moving]
    concepts: [company, tools, available, comment, details]
    section: Comments
    token_count: 411
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c3"
    char_span: [4415, 6482]
    sentence_count: 13
    key_terms: [like, source, system, complete-regret-4300, ssis, business, inside, datawarehouse]
    concepts: [complete-regret-4300, source, system, business, datawarehouse]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c0"]
    section: Comments
    token_count: 452
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c4"
    char_span: [6484, 8281]
    sentence_count: 9
    key_terms: [tools, data, ssis, "you're", got, new, sql, experience]
    concepts: [tools, "you're", experience, changed, nekobul]
    section: Comments
    token_count: 450
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c5"
    char_span: [8283, 10304]
    sentence_count: 15
    key_terms: [lot, data, find, mdx, sql, snowflake, semantic, on-prem]
    concepts: [snowflake, semantic, on-prem, queries, column]
    section: Comments
    token_count: 457
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c6"
    char_span: [10306, 11929]
    sentence_count: 18
    key_terms: [python, lot, mdx, old, use, relational, because, complete-regret-4300]
    concepts: [python, relational, because, liked, table]
    section: Comments
    token_count: 406
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c7"
    char_span: [11931, 13781]
    sentence_count: 21
    key_terms: [python, cdc, fabric, "you're", sainttimothy, doing, get, sql]
    concepts: [python, sainttimothy, fabric, "you're", doing]
    section: Comments
    token_count: 457
  - id: "social-intelligence/reddit-deep/dataengineering/1u70qmg.md#c8"
    char_span: [13784, 15035]
    sentence_count: 7
    key_terms: [tools, processes, changes, garbage, without, layer, table, bad]
    concepts: [tools, processes, changes, garbage, without]
    section: Comments
    token_count: 282
---
# Lot of fancy terms, but nothing really has changed

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1u70qmg/lot_of_fancy_terms_but_nothing_really_has_changed/)
Posted by **Complete-Regret-4300** · **92↑** · **78 comments**

So I started working as a Microsoft Business intelligence developer back in 2007 and I absolutely loved how simple things were. You had source systems like ERP/core banking, they delivered files to FTP sites. We had ETL tool like SSIS that picked up those files loaded into staging area, did transformation and then loaded into datawarehouse. Then we had SSAS cubes are the semantic layer and then business users either used Excel to connect to the cubes or we had SSRS static reports connecting to the cubes or the data warehouse tables/view directly.

I lived under a rock for the last 18 years or so and completely skipped the big data, cloud, ai bandwagons.

Recently I changed my job and initially I was really worried with the advent of data engineering, pipelines, data lake, delta lake, lakehouse and all the new terms.

But I realized all these are fancy terms and we arent really doing anything different, lol.

So, the place where we work, it is supposed to be a cutting edge technology place. They are using ERP systems like SAP, Oracle Fusion as source. Those sources push files into S3 bucket in AWS which is kind of replacement for the ftp/file landing zone. Then we have snowflake for the datawarehouse. Again a fancy tool, that is now more expensive than what we did in on prem SQL Server. Instead of SSIS, we have Mattilion in the cloud and for semantic layer we have SSAS still and the plan is to migrate this to Tabular/Fabric very soon. The reporting layer is Pyramid analytics.

So, basically nothing much has changed. I refuse to learn python or databricks or any other programming language. I am happy with my SQL, MDX skills and I am okay to learn DAX. I am glad we still have implementations like these rather than all those fancy big data, no sql and stuff. 

I understand there is data explosion after advent of social media, we need unstructured data. However, not every business process out there is using explosive amounts of data. Maybe some businesses who have direct individual customers, low revenue per customer, but millions of them, yeah you have data explosion. But if there are businesses with few customers but millions of dollars of revenue per customer, there is no data explosion, think about investment banks, private banks etc They have simple core banking systems which have structured data sources and a datawarehouse with dimensional modelling is good enough for these businesses. 

I am curious, if there are still people like me in 2026.

Cheers 😄

## Comments

- **loconessmonster** (76↑): The whole job of a "data person"
Is the following
- moving data from one spot to another
- organizing it
- displaying it in useful ways

The rest is "just" details. Tools and methods. The "just details" part is where us as professionals come in and its on us to know whether or not to use new tools yet.
  - **SuitableKangaroo6050** (3↑): This is an underrated comment that deserves a thousand upvotes
    - **Fluffy_Somewhere4305** (1↑): In a perfect vacuum that comment describes the job.  
In reality, there are huge power struggles and people with vested interests in various tools and vendors and endless brand wars going on and a huge portion of the job is managing costs.
  - **Secure_Luck_5796** (2↑): And the 4th vital point: how soon can you make it available.   
The whole ambush of new tech stack runs on 2-3 core utilities: Performance of models, data latency and the cost associated with it. With the advent of AI, now making data available for AI consumption has also become a factor.
  - **s1renetta** (2↑): May I add: "Scheduling the frequency of the moving job. And ensuring that it can run again relatively easily when it breaks."
- **Brief-Knowledge-629** (19↑): I unironically wish this were me. I was working at a boomer dinosaur corp SAP, DB2, MSSQL, no git, no unit tests. I upskilled a ton and left for a "tech" company. Snowflake, Airflow, dbt.....and I do absolutely nothing of value. My company is a "use AI for literally everything" company so I have been slopping out code for like 6 months. Literally none of it works together and it's a gust of wind away from collapsing.

Also nobody asked for the product I have been building. We have zero requirements. Like plug me back into the boomer matrix, I don't want to remember a thing
  - **Complete-Regret-4300** (4↑): Coming from traditional BI, I like working for banks, retailers and those kind of companies. They have predictables source systems, business processes. Usually the source system is an ERP/Core banking system and the business process is either MIS reporting or financial reporting. Those tech stacks dont change a lot. The technology may change, for example, SQL datawarehouse become Snowflake datawarehouse SSIS becomes DBT/Matillion. But the core still remains bringing data from source systems and presenting them to business users in the form of self service BI reports.
    - **Brief-Knowledge-629** (3↑): Impact is real and immediate at places like this. Someone in a position that affects revenue needs something. Unfortunately, it's always the same thing. They need some kind of report to spit numbers out into excel.

These places also tend to have the worst kind of DE work "add new functionality to an internal system we have to use", which is out of scope for DE so you end up having to build a dashboard that replicates the source system for them to have open on a second screen
- **lightnegative** (87↑): > I am curious, if there are still people like me in 2026

Yeah there's a dude on here that keeps trying to convince people that SSIS is not a steaming pile of garbage and unironically recommending it in 2026

Once you've experienced non-Microsoft tools, it's hard to go back
  - **Complete-Regret-4300** (10↑): Lol, for a long time SSIS purists would argue that you must do all the transformations inside the ETL pipeline, while those that didn't like SSIS would use it only for loading into staging tables and then do everything inside stored procedures.

Now with this new cloud and data pipeline tools like DBT, essentially everything happens inside the database(snowflake) and the ETL tools job is just relegated to load the files into staging tables.

So essentially SQL won and SSIS lost.
    - **Nekobul** (1↑): You can do both approaches in SSIS. However, there are things you can't easily do in sprocs if at all. For example, how do you parse XML in SQL ?
  - **Nekobul** (0↑): I have experienced the non-Microsoft tools and keep going back to SSIS.
    - **lightnegative** (12↑): There he is!
- **SevereRunOfFate** (8↑): I'm on the vendor side and have worked for major players in this space since the mid 2000s, so know exactly what you're talking about. 

I like to whiteboard things, so if I have a good relationship with the folks in the room I'll jokingly draw 3 data sources on the left.. three arrows all converging to a central box/data store in the middle, and then another couple arrows to the right of that feeding dashboards and other sources.. and I'll say "stop me if you've seen this before"

- it's literally all the same, just faster and updated 

Sure, some of the data science /ML stuff is new but yea.. it's all the same.
- **Karl_mstr** (6↑): The new vocabulary just helps to land a job if you're Jr, LinkedIn is full of those terms used by HHRR to seek for applicants who know those terms. 

And after the pandemic, YouTube got a lot of Data Scientist showing off those new tools, that's how I got started on this, and I agree that the process keeps the same as before, just using different tools which some could be useful for some context, that's where experience helps to choose which one to use.
- **Eleventhousand** (4↑): I've got twenty-four years' experience.  I hear what you're saying, and I agree to an extent, but not completely.

When I first started, I did a lot of SQL transformations.  Then it changed to GUI ETL tools like SSIS.  Now its changed back to mostly SQL-based, but even more extreme than before.

I find data warehouses such as Snowflake and BigQuery to be vastly different than on-prem SQL Server.  While on-prem SQL Server has had the ability to integrate with external scripts for machine learning for a while now, its a lot clunkier than something that is just built in and part of the SQL dialect.

When it comes to analytics, I'm not one to say that MDX is dead, but I used to do a lot of ad-hoc MDX queries that I can now solve through windowing functions.  That's a big shift there.

I don't really like the shift from dimensional modeling to OBT, and I think that its feasible for many companies to move back.

Data Engineering and integration has changed a lot, and I think its more than just new fancy names.  There used to be more ODBC pulls from other databases and .csv imports.  Now its more common to find kafka integrations.

I am a little bit disappointed that semantic layers have taken a back seat.  There are newer tools which allow MDX compatibility, that scale more than SSAS can, but I feel as though they are not as widespread.   And the old Microstrategy/Business Objects semantic layers seem to be on their last legs.  I spend a lot more time comparing queries with others due to incorrect results than I did 10, 15, 20 years ago.

Adding to all of that, I still love programming after all of these years.  I would recommend to not "refuse to learn Python."  You never know when you'll need to find a new opportunity, and it can only help to be familiar with common languages.
  - **Complete-Regret-4300** (1↑): It is funny you mention OBT(One big table?), this morning our SSAS cube wouldnt process in UAT and the reason was, for a particular attribute, 1 code column value had 2 name column values! Our company has a separate master data team and they keep making changes and I am not sure what tool they are using, they dont seem to have integrity checks in place, it flows into snowflake datawarehouse and all the way until the cube processing fails with the classic duplicate key error.

I am like, lets go back to 3NF form,  lets have a seperate table for the just the code and name column for every attribute of every dimension. These guys are not even able to maintain integrity with 2NF, I wonder what a nightmare OBT will be.
- **Dan1480** (3↑): Ah the halcyon days of SSAS, SSRS and SSIS! 2008 R2 was peak BI!
But seriously, you still use your MDX skills? You're running SSAS multidim?
Yeah, a lot of the old ideas have received new names. The Landing, Staging and Reporting schemas of old became "the medallion architecture".  That didn't really change. 
But the tools have changed, there's no getting around that. 
I'd recommend learning python. I use it almost everyday.  Honestly, I wouldn't be able to do my job now if I only new SQL, DAX and SSIS expressions (I wrote a lot of MDX but never liked it).
All the best to you, my friend. 
Here's to another member of the old guard!
  - **Complete-Regret-4300** (1↑): Thanks mate. I actually liked MDX a lot because I found it quite intuitive tuples sets traversing hierarchies etc scope statement to overwrite a part of the cube freeze etc. DAX on the other hand is all table and columns and I hate it. But now we have chatgpt/copilot so it is easy to get it working, but it is not fun because I have no idea what it is doing.

By python you mean data frames right? By why should I learn it, if I can use SQL and do most things with it as long as we have relational datasources?
    - **lightnegative** (2↑): Python is useful as a glue language for reading things from non relational / external sources and sticking them into your data lake / warehouse.

If you're reading data out of your db, transforming it in Python and then writing it back to the same db, and those transformations could easily be described by a SQL query instead, then you're doing it wrong
    - **Dan1480** (2↑): Haha scope statements did my head in!
There is a guy in our team who is a similar vintage to you and I. He also refuses to learn python and to be fair, he gets by just fine. But he is limited in the tools he can use. We work in Microsoft Fabric.  A good chunk of the tools in Fabric require python. Yes, in python we're using pandas, but we're also calling REST APIs, processing flat files and doing maintenance on the delta tables. You can get by in an environment like Fabric with just SQL but your options become more limited.
Python's kinda fun once you get the hang of it. And it's much easier than MDX 😉
- **SaintTimothy** (2↑): You might get a stock set of python scripts IF they make snowflake happy.


Ain't snowflake bees knees for speed?


Are you doing CDC from SAP?


I am same boat, came out of college in '04. Watched MS swear up-and-down they'd never compete with Crystal Reports/Business Objects, and then immediately did.


SSIS, RS, AS, T-SQL
  - **Complete-Regret-4300** (1↑): Yes, we do CDC, although I dont know how it actually works. The CDC part is what I find interesting and would like to learn more about it.
    - **SaintTimothy** (2↑): Start from just generally SQL Server CDC.


Bare-bones basics, CDC process reads T-logs and populates a separate set of change tables (one table per real table) with all inserts/updates/deletes.


Retention is 3 days by default, up to a maximum of 100 years (dang! I thought it was 6 weeks).


In any case, 2 benefits are


1. You're querying a smaller dataset, and, to us, it's much richer, because these all have been changes - what DW needs to know.


2. You aren't locking the table that the front-end processes are using for transactional Insert/update/delete, and CDC is asynchronous from this, as resources allow.
- **lakica96** (2↑): I think that your position is absolutely right since there were no substantial changes in the architecture..in my view, the semantic layer would be the place where some changes may really happen as far as my experience goes.. tools like Databricks Genie to ask natural language questions for governed tables even if there are no cubes created before without having an own security layer because of Unity Catalog..of course, its not magic and bad table names/docs, poor UC metadata will give you bad results (garbage in garbage out)
- **joseph_machado** (2↑): Same same, but different.

As long as it works for your use case, I don’t think the tech matters as much (except for your resume, in case you want to switch).

I have worked with SSIS and SSAS for a bit. But I do prefer the convenience of modern tools (testing, debugging, etc). 

The caveat is when tools are used without thought for the SDLC, with people just yeeting 1000s of dbt models into production. As long as SDLC processes are followed (as much as one can), I don’t think tools matter that much.
