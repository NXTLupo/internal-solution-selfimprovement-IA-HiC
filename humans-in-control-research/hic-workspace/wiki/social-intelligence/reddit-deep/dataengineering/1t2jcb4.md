---
id: social-intelligence/reddit-deep/dataengineering/1t2jcb4.md
url: "https://www.reddit.com/r/dataengineering/comments/1t2jcb4/new_and_only_de_startup_thoughts_on_my_kiss_stack/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "New (and only) DE @ Startup - Thoughts on my KISS stack proposal"
author: "Mystafet"
date: "2026-05-03T11:51:01.000Z"
score: 21
upvote_ratio: 0.93
num_comments: 33
flair: "Help"
extracted_at: "2026-06-11T18:58:17.210Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c0"
    char_span: [0, 2081]
    sentence_count: 18
    key_terms: [hubspot, python, phase, warehouse, postgres, dataengineering, replica, data]
    concepts: [hubspot, python, warehouse, dataengineering, phase]
    token_count: 494
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1t2jcb4/new_and_only_de_startup_thoughts_on_my_kiss_stack/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c1"
    char_span: [2083, 2863]
    sentence_count: 8
    key_terms: [mistakes, aware, data, need, time, recommendations, orchestration, currently]
    concepts: [mistakes, aware]
    token_count: 179
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c2"
    char_span: [2877, 4097]
    sentence_count: 11
    key_terms: [databricks, configuration, prestigiousant3766, snowflake, tools, integration, duckdb, later]
    concepts: [databricks, configuration, prestigiousant3766, snowflake, integration]
    section: Comments
    token_count: 295
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c3"
    char_span: [4099, 5893]
    sentence_count: 13
    key_terms: [postgres, iceberg, budget, duckdb, cdc, data, mystafet, company]
    concepts: [postgres, iceberg, budget, duckdb, mystafet]
    section: Comments
    token_count: 443
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c4"
    char_span: [5895, 7922]
    sentence_count: 12
    key_terms: [orchestrator, dbt, github, actions, fargate, running, timeout, simple]
    concepts: [orchestrator, github, actions, fargate, running]
    section: Comments
    token_count: 468
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c5"
    char_span: [7924, 9882]
    sentence_count: 14
    key_terms: [managed, version, data, dbt, get, need, snowflake, something]
    concepts: [managed, version, snowflake, something, dlthub]
    section: Comments
    token_count: 493
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c6"
    char_span: [9884, 11223]
    sentence_count: 11
    key_terms: [orchestration, eventbridge, scottfujitadiarrhea, simple, dependencies, orchestrator, cron, functions]
    concepts: [orchestration, eventbridge, scottfujitadiarrhea, dependencies, orchestrator]
    section: Comments
    token_count: 311
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c7"
    char_span: [11225, 12900]
    sentence_count: 14
    key_terms: [data, migration, replica, duckdb, organization, stick, "i'm", want]
    concepts: [migration, replica, organization, duckdb, analytical]
    section: Comments
    token_count: 386
  - id: "social-intelligence/reddit-deep/dataengineering/1t2jcb4.md#c8"
    char_span: [12902, 14124]
    sentence_count: 13
    key_terms: [tools, data, fast, move, handle, alternative-guava392, "don't", later]
    concepts: [tools, handle, "don't", later]
    section: Comments
    token_count: 281
---
# New (and only) DE @ Startup - Thoughts on my KISS stack proposal

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1t2jcb4/new_and_only_de_startup_thoughts_on_my_kiss_stack/)
Posted by **Mystafet** · **21↑** · **33 comments**

Looking to get a sanity check on a stack proposal before I commit to it next week.

Background: I'm the first data hire at a startup/scaleup that has been around for about 2 years. I have 15+ years background in corporate analytics, strong with SQL and Python, but pretty new to actually building infra from scratch, CLI workflows and Git. 

The ask: Keep it simple, don't over-engineer and get to working data more quickly and easily.

What I'm working with:

Postgres (RDS) for the application with no replica. HubSpot for CRM. S3 for files. Eventually will likely add in other APIs, CSV and JSON. The priority for phase 1 will be the Postgres with HubSpot coming later down the road.

My phase 1 (MVP) idea is basically similar to a tech project I did for them. DuckDB as the warehouse, Python for ingestion, dbt Core for transformations, Python or GitHub Actions for scheduling. Google Sheets or maybe Looker for auto-updating dashboarding and demo.

Phase 2 once I understand the business and needs more: move to BigQuery or Snowflake, add AirByte in once I need data from HubSpot, stick with Python or GitHub Actions for orchestration until it gets too complicated then move into something else, and Looker Studio or Metabase for actual dashboards.

Stuff I have questions on:

1) Is DuckDB actually a viable phase 1 warehouse? If I'm going to need to migrate in 3-6 months to a larger cloud warehouse will it be a PITA? Should I just start with Snowflake or BigQuery?

2) Am I overthinking not having a replica of the Postgres? Will querying it directly with dbt be risky even on a small scale, or should I request a replica to work off of before I even start?

3) Am I right in thinking of moving to AirByte once it is time to incorporate HubSpot? I've heard and read the APIs for HubSpot are horrible.

4) For Orchestration, how long would Cron and Python be viable for? I don't want to jump into anything too complex early on, but would I regret this?

Finally, what are some 1st time mistakes from other new DE's or DA's that moved into DE role that I should be aware of? I know I will have mistakes and rework will happen, but curious if there are any that I should really be aware of out of the gate to avoid the headache.

As I am the only data person, and might be for a while, I need things to be runnable while I'm out on vacation or sick. The budget is flexible, but I think keeping it minimal at the start makes sense. Data is currently pretty small (not sure exact size), but it will grow so I will need to scale over time.

Open to any honest feedback or recommendations.

## Comments

- **PrestigiousAnt3766** (24↑): In this case Id rather go Snowflake or Databricks directly. 

What you do can will work, but its a lot of tools and configuration what those will do out of the box.


Think python ingestion is the right idea.
  - **Mystafet** (1↑): Thanks and that makes sense and I think with the small amount of data I have initially, cost won't be high for those and probably easier than migrating from DuckDB or similar later. 

What tools or configuration would go away in my MVP by using Snowflake or Databricks out of the box? Would you suggest those over BigQuery?
    - **slayerzerg** (3↑): DuckDb is fast gets the job done at a small to mid startup. As the person above said, lots of tools and configuration but if you’re looking to move quickly just start with that and migrate later. Don’t over engineer it with snowflake or Databricks yet if you’re the sole DE
    - **PrestigiousAnt3766** (1↑): I have limited exposure to big query, but its mostly that most other platforms do end to end.


Scheduling, etl, storage, dwh-ing, analytics. For example databricks comes with quite serviceable reporting. Git integration etc.


So you can do everything in 1 place, less integration to manage etc.

My experience is that probably some tool can do some functions better, but not having to integrate and manage all different parts and components is (rarely) worth it.
- **scott_codie** (6↑): If it ain't broken, don't fix it. What actual problems does the current architecture have? If this were me, I'd cdc out of postgres to iceberg and slap duckdb as a query engine on it.
  - **Mystafet** (1↑): Interesting suggestion, haven't considered Iceberg yet. Setting up CDC + Iceberg + DuckDB feels heavier than my "KISS" phase 1 brief, but I can see it as a phase 2 or 3 target. Do you find the ops overhead manageable solo? Curious what the actual setup looked like for you.
    - **scott_codie** (1↑): You already have postgres which uses logical replication as its CDC source (no kafka needed). You have a ton of options to replicate from postgres cdc to iceberg (examples are Apache Fluss, RisingWave, a simple flink script, or debezium server). Then you register the tables in aws glue and you can run embedded queries from anywhere using the duckdb-iceberg connector or with athena. Scaling happens on the object storage layer. I have run this exact setup at many big data companies, it is simple.
- **naijaboiler** (3↑): whats the annual budget the company is willing to spend on data infra

and how many people
  - **Mystafet** (1↑): Not sure budget yet as I just started last week and it was a holiday on Friday. I'm going to try to figure out budget this week, but I assume cheap initially and budget grows as needs grow.

The company has less than 50 people and most are in the sales/ca area.
- **maxbranor** (3↑): Is your idea to move operational data from postgres into duckdb and use dbt on the data in duckdb? If so, you wont be querying postgres with dbt (related to your concern 2)

Not sure if github has a similar problem, but in our gitlab setting, workflows (the equivalent to github actions) have a 10min timeout (such that running dbt jobs on it were a no-go). But I implemented a simple dbt job running on a schedule as a fargate task (serverless stuff on aws) and that has been simple to set up and more than enough. I agree that you shouldnt implement an orchestrator from the start unless you really need it

I think your plan overall sounds solid. I think moving to Snowflake early is not necessary (unnecessary cost). In fact, I suspect that your phase 1 setting will survive longer than you think

In general, make sure that whatever you build can be rolled back and reconstructed easily (follow the principle of loosely coupled systems).
  - **ScottFujitaDiarrhea** (3↑): I’ve honestly never used GitHub actions for anything other than deployments, but I guess you could use it as an orchestrator. Since it sounds like they’re already AWS heavy wouldn’t it be easy to just use a state machine as a “light” serverless orchestrator?
    - **maxbranor** (2↑): I tried to use gitlab workflow as an "orchestrator" (= trigger dbt jobs) - basically because it was quick - and quickly bumped into a timeout problem. Therefore, I dont recommend that approach😃

100% on your comment: much better to set up a state machine to act as "orchestrator".
  - **Mystafet** (1↑): Yeah, I'd move necessary ops data (possibly through a simple sql query) from postgres into my duckdb and then transform using dbt directly in duckdb. I can always talk to the dev team about this too, as they have mentioned to me they know they need to setup a replica of production.  
  
Thanks for the heads up on the github timeout issue, I hadn't gotten that deep into the GH Actions limits yet. Fargate sounds like a good middle ground for me since the company is AWS-first. To clarify, are you running dbt as a containerized Fargate task triggered by EventBridge on a schedule? Any pain points with that setup I should know about?

I also have a feeling my phase 1 setting will last longer than I expect it to, and hopefully by that point I'm in a better position to implement something a bit heavier.
    - **maxbranor** (1↑): Yeah, we have an ecs cluster and a fargate task defined in it. The task pulls the image from ecr and it is triggered by an eventbridge rule (a cron job)

No pain points so far. My dbt project is not big, but I use dynamic tables a lot (snowflake thing), which minimizes even more the need for an orchestrator for now
- **Equivalent_Effect_93** (2↑): If you like duckdb, the managed cloud version is mother duck and it's really good. Airbyte is a good choice, but if you're comfortable enough with infra dlthub is unbeatable, I think they have a managed version.
  - **Thinker_Assignment** (2↑): we (dlthub) have a managed version that will be open in a couple weeks, it's now in early access
- **joseph_machado** (2↑): Since you are a team of 1, I’d focus on spending a lot of time on requirements & data modeling & getting something out.

**Tradeoff**: a bit of upfront spend to get things going. At the expense of having to change them later. Most of the tools can be replaced (if your system is designed to be independent)

I’d recommend the following.

1. Snowflake: Quicker and simpler to set up. Albeit it can get expensive if used without guardrails as your data size grows. + Edit: In SF you can quickly create multiple environments (dev, UAT (for users to validate before pushing to production), Prod) if you need.
2. dbt core: Orchestrate
3. dbt cloud: Scheduler. This is a paid option, but one seat is fine, and you get neat features like freshness, lineage, CI/CD, Slack alerts, etc. GitHub Actions can work as well. 
4. Fivetran: Data ingestion is not simple. Yes, tools can help, but they still need maintenance. 
5. Build summary/preagg tables (on top of facts/dims) to feed your viz tool. Keep Excel as a read-only viz tool for users if possible.

I’ve used this to set up infrastructure for a medium-sized company in a few days (a few years ago).

Hope this helps. Please lmk if you have any questions.
- **ScottFujitaDiarrhea** (1↑): How many steps/dependencies do you have to manage for your pipeline? Is it batch? If it’s not much/relatively simple have you thought of step functions and eventbridge for orchestration?
  - **Mystafet** (1↑): For my phase 1, I expect it to be small, probably 2-3 dbt models with maybe 1-2 ingestion scripts feeding them. There won't be many dependencies in P1 as it will be more simple. Do you think Step Functions is overkill or already a good starting point? Trying to figure out the threshold where it makes sense vs just cron.
    - **ScottFujitaDiarrhea** (1↑): If the ingestion scripts and the downstream dbt models can run independently then yeah I don’t really think you need orchestration at this point and cron is simple and gets the job done. You can just setup eventbridge rules with cron expressions. In the future if you do need orchestration then it would be harder to migrate from one to another rather than just migrate to one IMO. Keep in mind that an Eventbridge rule isn’t an orchestrator but just a triggering mechanism that runs its targets asynchronously, so it can’t keep track of success/failed jobs like an orchestrator can.

With that, if one of the primary reasons you want orchestration at this point is because of the monitoring and observability they often come with I would just look into Cloudwatch + Grafana.
- **raginjason** (1↑): Unless volume is crazy, why not stick with Pg in RDS? It would be one less new tech to introduce to the organization
  - **Mystafet** (1↑): The current Postgres has no replica though, and I'm concerned about analytical queries hitting production. If I requested a read replica, would you still build the analytical layer there directly, or would you eventually want a separation? Curious where you'd draw the line based on data size or query complexity.
    - **raginjason** (2↑): If I were to introduce analytics to an organization I would want as little shock as possible. A read replica makes sense, and you can probably build analytics in that instance. Pg is a great database and it will get you far
- **Alternative-Guava392** (1↑): Just stick to a data warehouse and stick to it. Put in place production / pre-production environment. 
Decided between Kimball vs datalakehouse.

DuckDB first and data warehouse later means a migration. Difficult at startups that move fast. Some teams could continue building on duckdb even after the migration. 

Personally, I would not use a tool to ingest data. Choose Cron scheduler (airflow / dagster / kubernetes) and ingest data yourself. You can define an ingestion logic instead of relying on black box tools.
  - **Mystafet** (1↑): For me, with DuckDB, I'll be the only one building in it, or possibly even using it as I'm also the Data Analyst, so I'm not worried about teams or people using it after migration. 

We will move fast, but I don't have a grasp on how fast they are expecting to move yet. In the coming weeks I have more meetings including some with the founders for their 'data pain points'. Also being the sole DE/DA means I can only move so fast, but I don't want the tools to end up slowing me down greatly for a migration later on down the road.
    - **Alternative-Guava392** (1↑): I'd personally only have a phase 1 which would be the ideal infra
- **WolfyTheOracle** (1↑): I feel like you’re head is spinning by tool options. I think you need to figure out what the workload is. How much data, how often, how many users, how many dashboards.

Then pick the simplest stack that will handle this today. The less tools the better. Maybe stick with Postgres and Python to start.

The way you’re thinking you’ll end up picking 3-4 platform tools but in reality the fragmentation will eat you up in operation costs when they were supposed to make your life easier.

If this resonates with you good, if not try it your way and remember this later on. 

Sometimes you gotta just do it whatever way you think is best. But never be afraid to consolidate tools. A computer can handle an insane amount of data with few tooling.
