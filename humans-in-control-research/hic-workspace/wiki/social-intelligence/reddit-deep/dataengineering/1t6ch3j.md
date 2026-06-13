---
id: social-intelligence/reddit-deep/dataengineering/1t6ch3j.md
url: "https://www.reddit.com/r/dataengineering/comments/1t6ch3j/is_anyone_migrating_away_from_databricks/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Is anyone migrating away from Databricks?"
author: "zoso"
date: "2026-05-07T14:38:44.000Z"
score: 303
upvote_ratio: 0.95
num_comments: 245
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.195Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c0"
    char_span: [0, 2239]
    sentence_count: 21
    key_terms: [databricks, engineering, migrating, data, experience, pipelines, run, dataengineering]
    token_count: 499
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c1"
    char_span: [2241, 3515]
    sentence_count: 6
    key_terms: [databricks, using, data, external, mwaa, transform, services, aws]
    token_count: 285
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c2"
    char_span: [3530, 5362]
    sentence_count: 11
    key_terms: [databricks, data, workloads, big, dataengineering, optimized, resources, learning]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c3"
    char_span: [5364, 6964]
    sentence_count: 13
    key_terms: [databricks, dbx, leadership, features, picked, teams, using, add]
    section: Comments
    token_count: 383
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c4"
    char_span: [6966, 8919]
    sentence_count: 19
    key_terms: [local, dev, databricks, deploy, cluster, job, run, workspace]
    section: Comments
    token_count: 452
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c5"
    char_span: [8921, 10773]
    sentence_count: 14
    key_terms: [databricks, cost, complexity, takes, jobs, compute, tests, engineering]
    section: Comments
    token_count: 397
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c6"
    char_span: [10775, 12654]
    sentence_count: 11
    key_terms: [data, cluster, compute, athena, long-running, write, environment, interactive]
    section: Comments
    token_count: 449
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c7"
    char_span: [12656, 14889]
    sentence_count: 15
    key_terms: [using, cluster, databricks, local, environment, interactive, aws, "it's"]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c8"
    char_span: [14891, 16710]
    sentence_count: 15
    key_terms: [databricks, data, transform, external, services, money, using, api]
    section: Comments
    token_count: 420
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c9"
    char_span: [16712, 17545]
    sentence_count: 6
    key_terms: [data, autoloader, running, pandas, stages, scale, spark, write]
    section: Comments
    token_count: 179
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c10"
    char_span: [17547, 19160]
    sentence_count: 7
    key_terms: [spark, testing, databricks, unit, tests, dlt, specific, connect]
    section: Comments
    token_count: 405
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c11"
    char_span: [19162, 21248]
    sentence_count: 14
    key_terms: [server, spark, sql, use, modern, winterfrost15, dlt, get]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c12"
    char_span: [20983, 22879]
    sentence_count: 12
    key_terms: [snowflake, databricks, migration, because, prefer, use, work, business]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c13"
    char_span: [22659, 24670]
    sentence_count: 10
    key_terms: [databricks, data, use, engineering, aws, employees, knowledge, invidiah]
    section: Comments
    token_count: 492
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c14"
    char_span: [24674, 26578]
    sentence_count: 14
    key_terms: [clusters, data, gold, run, "doesn't", bronze, automatically, using]
    section: Comments
    token_count: 444
  - id: "social-intelligence/reddit-deep/dataengineering/1t6ch3j.md#c15"
    char_span: [26580, 28320]
    sentence_count: 11
    key_terms: [use, cluster, databricks, "you're", job, run, set, production]
    section: Comments
    token_count: 371
---
# Is anyone migrating away from Databricks?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1t6ch3j/is_anyone_migrating_away_from_databricks/)
Posted by **zoso** · **303↑** · **245 comments**

Am I insane?

It feels like everyone is migrating to Databricks and is happy with it. Meanwhile, we are seriously considering migrating away from it.

**Disclaimer:** we use Databricks mainly for data engineering, not heavy ML/AI workloads.We started migration 1 year ago. We migrated critical pipelines only and before we migrate everything (still 70% of the work to do) we are at the point that we almost decided to go back to AWS.

**Why we are migrating away?**  
Our bill is already around **2x higher than our original estimate**, and that estimate included a **50% buffer**. Based on the remaining migration work, I would not be surprised if the final cost ends up closer to **4x what we expected**.

Our data is mostly smaller pipelines that process up to 100GB in total.  
The developer experience sucks - no unit tests you can run on your machine you have to run it on databricks.  
We prefer to have strong software engineering practices, no notebooks, good test coverage, fast tests running on local machines, etc....

With Databricks, testing is slow and awkward. You cannot easily run meaningful unit/integration tests locally. To test realistic behavior, you need to deploy to Databricks, build the package, copy it, start or reuse a cluster, and run the job there. The feedback loop can easily take **10–20 minutes**. That is a huge hit to productivity compared to normal backend/data engineering workflows.

**What we are considering?**  
AWS with Glue Catalogue and Iceberg tables. Everything running on lambdas/ECS tasks with pure python and polars. For a few pipelines that might need more capacity we plan to use EMR Serverless. For exploration and BI Athena.

If we ever want to go back we just connect glue catalog to UnityCatalog and we can start using data there.

**So my questions are:**

What do you think? Anyone has had similar experience?

Has anyone else had a similar experience with Databricks for smaller data engineering workloads?

Are we missing something obvious?

Is Databricks mainly worth it once you reach a certain data/team complexity threshold?

Or is this just the cost of doing things “the Databricks way,” and we should adapt instead of moving away?

**UPDATE:**

Thank you everyone - i didn't know that this question will explode so much :)

Additional detail - most of our pipelines are like this:   
\- we extract data from some external services (it might be scraping, might be integrations with external data providers) - it is running on AWS   
\- we load it to databricks using autoloaders  
\- we transform in bronze/silver/gold on databricks  
\- we load it back to RDS on AWS so our backend services can expose it for our customers our API

So what I think is really bad here is that we spend money on ingesting data into Databricks to transform using technology we don't need, just to get it out as fast as possible so it is accessible to external world. Of course it is nice to have a great UI to be able to explore data, analyze, create dashboards etc.... 



\> You need an orchestrator to trigger them on a schedule, and manage DAGs (Airflow? MWAA?).

We are already using MWAA - even our Databricks jobs are orchestrated from MWAA. 

We are not using asset bundles - we are packaging our code using python wheels.

## Comments

- **AutoModerator** (1↑): You can find a list of community-submitted learning resources here: https://dataengineering.wiki/Learning+Resources

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **Wh00ster** (227↑): It sounds like whoever picked Databricks originally didn’t have a clear reason to move to it
  - **PaymentWestern2729** (120↑): To be fair, Databricks are really good at marketing
  - **AmbitionEuphoric5600** (88↑): This is usually how it goes. Databricks is a great tool but it's optimized for scale and ML heavy workloads. If you're running pipelines on 100GB datasets you're paying for a lot of horsepower you don't need
    - **jimtoberfest** (9↑): I’m not even understanding the claim of ML heavy workloads is what dbx is optimized for.  

What ML workloads is it so good at that it becomes the best solution?  Is it mainly to access SparkML?
  - **MocDcStufffins** (17↑): Executives who don't know better always think their company has "big data". I was once in a sales call where they were asking about big data solutions and the quote from an executive was "we have big data, tens of thousands of records". Sounds like a regular old database would handle your use case easily.
    - **trenhard** (7↑): A regular old spreadsheet would handle it.
    - **Fluffy_Somewhere4305** (3↑): It's literally a 30 page Word document!  BIG DATA VIBES
    - **Repulsive-Hurry8172** (3↑): My previous company does have a lot of data. But they're all in Excel.
    - **git0ffmylawnm8** (2↑): Bless that man's heart
  - **No_Flounder_1155** (6↑): CV driven development.
  - **SmallAd3697** (10↑): Exactly.  There is nothing in this post that says what was attractive about databricks.  

The thing most people love is compute, which can be extremely cheap.  I keep re- reading the post to find the words "spark" or "job cluster" and I'm missing it.

Id guess some manager picked it for non technical reasons and the engineers never warmed up to it.  It sound harsh but it serves Databricks right if their sales teams want to talk to customer leadership, but NOT to the developers who actually have to use the tool every day.
  - **zoso** (3↑): This is totally correct! Additionally whoever picked Databricks after "careful" research is not with us anymore (they left 3 weeks after signing contract), together with an architect who left 3 months after and our executive who was pushing for adoption. Now we have a choice going deeper or change direction.
    - **Nekobul** (6↑): Just use SQL Server. You will save tons of money and sing like a bird.
  - **joe1max** (3↑): This is true more often than not. I’ve seen leadership push for certain big name products for no other reason than to add it to their resume.
  - **joseph_machado** (2↑): +1 to this

I've seen this at a few companies. 

You have a lot of great input from the other comments. I'd like to add that managing dbx (assume you have multiple stakholder teams using it) is a lot of work. Snowflake makes this a bit easier.

Databricks(the dbx way) has so many features some are well done, some are half baked, but the responsibility to get those working as expected (e.g. dev bundles, etc) falls on you (or devops).

Integration testing locally can be a bit tricky especially if your pipeline is using dbx specific features. 

Regarding the migration, you'd want at least one person from the leadership excited about it. As it will typically take longer than expected. I am not sure why dbx was chosen for 100GB tho. Perhaps there are stakeholders who use it? Some governance feature?
  - **domestic_protobuf** (0↑): This is the only correct answer
- **Minute_Visual_3423** (147↑): >With Databricks, testing is slow and awkward. You cannot easily run meaningful unit/integration tests locally. To test realistic behavior, you need to deploy to Databricks, build the package, copy it, start or reuse a cluster, and run the job there. The feedback loop can easily take **10–20 minutes**. That is a huge hit to productivity compared to normal backend/data engineering workflows.

I'm a bit curious what your deployment flow looks like, because this sounds like some friction that can be reduced. To give you some idea, this is how we run our operations:

1. We have three workspaces: dev, UAT, prod. Each workspace has its own set of catalogs (e.g. dev\_bronze, dev\_silver, dev\_gold, dev\_dlh\_metadata for shared services and job metadata)
2. Within the dev workspace in particular, we have a "local" sub-environment (local\_bronze, local\_silver, local\_gold). This is the only environment that developers can deploy to from their local machines. All other deployments happen through CICD after a PR.
3. When developing locally, we use Databricks Asset Bundles (which we have templated for our needs). After a developer has built their pipeline code and prepared their config .yml, they can deploy it directly to the local target via the CLI:

`databricks bundle deploy -t local --cluster-id 0123-456789-abcdef`

(In practice, we have wrapped this in a make command `dab-deploy-local`, which dynamically gets the user's running personal cluster ID from the CLI and deploys to the local target using it. This prevents from needing to wait for cluster spinup in local for job runs)

Our DAB template includes a /tests folder in each bundle, and unit tests run as a DAB pre-build step using pytest. This runs before `databricks bundle deploy` is called, and if the tests fail, it never makes it to Databricks. We don't use notebooks, but build Python .py files into a .whl using poetry.

The entire process takes as long as it takes to run the pipeline end-to-end, but if pytest fails, it takes seconds and the developer immediately gets feedback in the terminal. I'm sure there's probably ways we could make it cleaner, but it works for us and our costs are really just the cost of interactive compute, which are minimal between autostop and serverless usage.

Beyond local, all of our jobs run as jobs compute, executed via an environment SP once the job is deployed via CICD. This takes longer, but the cost of running the jobs is a fraction of the cost of interactive compute, and the jobs themselves have passed through at least shakedown testing in local + a PR before making it to dev.

\---

One more note on the above - you're chasing reduced cost and complexity and I understand that. I think there are things that can be done to control those levers in Databricks. I think you are falling into a common trap of thinking that stitching together different services from one of the cloud providers is going to reduce both cost and complexity.

>we use Databricks mainly for data engineering

Data engineering is a means to an end. It doesn't happen in a vacuum. You're conforming the data into some structure that can be used by downstream teams for whatever they need. If their needs are only ever going to be ad-hoc SQL analysis and BI, then the AWS stack you are proposing can probably work for a while. It might even be cheaper.

But it has hidden costs and complexity that you might not realize will impact you immediately:

* If your data volume grows and the downstream teams start doing more ML/AI work against the data - requiring them to scan and download large slices of the data on a regular basis to power their training runs - you're going to notice your Athena bill go up, as they pull the data they need from Athena queries into whatever environment they are using (Sagemaker notebooks, etc.). By the way, you'll have to give them that downstream environment, because that's not work they will be able to do in Athena alone.
* Your natural response to the abov
  - **nus07** (23↑): Jesus - did you write that or prompted an AI to write that? You are a God level DE if you wrote all that.
    - **Minute_Visual_3423** (54↑): I did write that, thank you for reading.

No, I'm just a guy who has stepped on some of these rakes before (or made to step on them, in some cases), hence my opinions. I could be more concise, though. Sorry about that.
    - **pboswell** (14↑): This is what years of proper experience gets you. I was reading along and saying to myself “yep exactly, this guy/gal databrickses”
    - **djtomr941** (1↑): He has to train Claude and ChatGPT somehow. Reddit sells all this data to them lol where do you think they come up with most of their shit.
  - **Leilatha** (6↑): Can you explain how you launch DABs from local without waiting on cluster startup? 

My team's DAB files specify a compute type per job and then I need to wait for the cluster to start for each test run. Do you keep a compute instance running at all times?
    - **Minute_Visual_3423** (14↑): By passing in the --cluster-id flag with the deploy command, we bind the bundle to that specific cluster when hitting our local target. Yes, this requires a long-running interactive cluster, but that's exactly what development is to us: an iterative and interactive workflow that requires long-running compute.

In our local environment, the expectation is that developers will use an interactive cluster rather than a job cluster. They'll have to start the cluster once (no way around that), but once it's running, they can keep using it for their deployments to the local target until it auto-stops due to timeout. It's a tax of 5-7 minutes per day versus a tax on every single job run.

Once we get to dev and beyond, then everything runs as a job cluster with no exceptions, which means every run requires the cluster spinup. However, in local, where we are trying to iterate quickly, developing against an interactive cluster is fine and intended.
    - **dwswish** (1↑): serverless?
  - **async-monkey** (2↑): Cannot upvote this enough.  We have a very similar approach to what you're using and it mitigates some of the issues described by OP.

1. DABs for the win: allows consolidating much of your testing and DQ validation BEFORE even sending it into the pipeline.  
2. Strict environment isolation: which plays well to containing costs and avoiding human mistakes downstream with larger pipelines.

Our problem is that we still have too many cooks in the kitchen trying to do DE instead of DS.  So naturally they think they need full production access to everything, to re-query and re-build every relationship from bronze up to make it 'model ready'.  But the good thing about DBX is that you can expose those costs and ask for a justification.
  - **pavan_naidu** (2↑): I usually don't read long posts, but this is one is worth the read. Databricks simplifies end to end data landscape, that's it's hard beat and piecing it together with AWS is an overkill based on OP's post.
  - **zoso** (2↑): Thank you for your insightful comment. Especially about the access control which is quite important in our case. 

\> You need an orchestrator to trigger them on a schedule, and manage DAGs (Airflow? MWAA?).

we are already using MWAA - even our Databricks jobs are scheduled using it as we some of them require tight integration with AWS (Spark is not ideal for fetching data from the API) so we just run the jobs on AWS - save it to S3 and ingest to databricks using autoloader. 

We are not using asset bundles - we are using wheels. 

\> Data engineering is a means to an end. It doesn't happen in a vacuum. 

Yes, we transform data just to load it back to the RDS dbs that are used by our backend services. 

Additional detail - most of our pipelines like this:   
\- we extract data from some external services (it might be scraping, might be integrations with external data providers) - running on AWS  
\- we load it to databricks using autoloaders  
\- we transform in bronze/silver/gold on databricks  
\- we load it back to RDS on AWS so our backend services can expose it for our customers our API

**So what I think is really bad here is that we spend money on ingesting data into Databricks to transform using technology we don't need just to get it out as fast as possible so it is accessible to external world.**
    - **Minute_Visual_3423** (12↑): >Spark is not ideal for fetching data from the API)

I feel that. Spark can't help you when your API insists that you page through responses 10 records at a time, and also rate limits you.

I think that also helps me understand why you are using autoloader - presumably, if you have to reingest all of the historical data, you don't want to have to do an expensive and slow pull from the source APIs/websites/etc. again. Maintaining a file layer lets you rehydrate from the historical base in the future if needed. Am I right?

Where exactly are you spending the money? What's costing you the most money on Databricks? Is Airflow orchestrating jobs compute, or all purpose compute (which is 3x the cost)?

As I ask these questions, it's just trying to help out. I'm not entirely convinced that you necessarily need Databricks for what you are doing. I get the value of autoloader, but it's also technically something you can build yourself (e.g. Lambda, S3 events, DynamoDB for checkpointing).

At the same time, Autoloader itself should not be expensive at your data volume unless you're running your autoloader ingestion very frequently (e.g. every 10 minutes or something like that), nor should transformation jobs that are not running at Spark scale. You can write your entire job using, say, Pandas, and just convert your pandas dataframe to a Spark df immediately before the table write step. None of that should require Databricks compute at any kind of meaningful scale - even a 0.9 DBU cluster should suffice.

Bronze/silver/gold are usually concepts that refer to the stages of data preparation in an analytical data platform. What sort of data lives in each of your stages, and are you just piping "gold" data back to RDS? Do you have any other use cases for this data beyond just sending it back out to the database?

One last thing - I think you'll definitely help your sanity by switching to DABs and getting away from manually copying your .whl files around. It will make your development experience a bit easier. If you'd want, I'd be happy to give you a demo of how we do it end-to-end.
  - **Odd-Government8896** (1↑): I really dont think any of this is on OPs radar.
  - **itsmeChis** (0↑): Fascinating write up, thank you for sharing!
- **pottedspiderplant** (100↑): We absolutely have unit testing in our Spark code. You don’t need to run unit tests on a Databricks cluster? It’s the same as any Spark application, just provide a local Spark session for the unit tests, but use the Databricks Spark package instead of OSS Spark.
  - **Blaze344** (17↑): Not to mention that there's Spark Connect / Databricks Connect if you truly need some specific databricks logic in your local testing as well? Serverless makes that super easy and you won't rack up huge bills unless you're running your tests over HUGE loads of data anyway.
  - **wingman_anytime** (33↑): Yeah I thought I was taking crazy pills reading that rant about testing…
  - **Sufficient_Meet6836** (22↑): The post is one of the times when "skill issue" is unironically the truth
  - **One_Victory6632** (9↑): If you're using dlt in any capacity then the testing situation still applies, I'm not aware of a way to test dlt specific constructs locally
    - **Leilatha** (12↑): I convinced my team to avoid DLT for this exact reason. 

There ended up being other reasons to go with a more custom PySpark system but the first reason I thought of was unit testing! 

The Databricks folks were shocked that we didn't want to use DLT, they kept pushing for it and one of their people even said "why would you need unit tests?" I lost all faith in them after that.
    - **mgalexray** (1↑): We used to have an approach where ‘dlt.’ was just a wrapper on top of normal pyspark where businesses logic lives. Fine to test but if you get into dlt power tools (autocdc, autoloader, etc) things get more complex. Not sure if that changes with spark 4, haven’t tried it much yet but the API now is at least part of official spark pipelines
  - **Ok_Raspberry5383** (3↑): Unless you're calling proprietary connectors like autoloader or the databricks kinesis connector
  - **e_jey** (2↑): Which spark package do you use if I may ask?
  - **Krushaaa** (1↑): How do you run local tests with Databricks-connect instead of the FOSS Spark package?
- **Winterfrost15** (47↑): For just 100gb I would stay on-prem and use SQL Server. It is tried and true.
  - **Immediate-Pair-4290** (12↑): I’m certain I get outvoted on this but I disagree. It lacks too many useful features that modern warehouses have such as governance, schema evolution, regex, and complex types, crappy merge statement, no qualify. It’s hard to integrate with things outside of PBI which is quickly becoming obsolete as AI requires the models closer to the warehouse. I’d pick MotherDuck over this. Much cheaper too.
    - **Nekobul** (6↑): No governance in SQL Server? Is this a joke? No regex - that might have been true more than 30 years ago. Also, I don't understand what you mean by "schema evolution", but you can certainly modify your database table to accommodate changes from upstream. You can integrate SQL Server with anything. You have drivers for any popular OS and any application can connect and use it.
    - **Winterfrost15** (2↑): SQL Server is a modern Database platform that is easily integrated with literally EVERYTHING! Don't hate it because of its longevity and proven abilities and modern ones as well.
    - **NoleMercy05** (1↑): You are high AF and very misguided
    - **Lastrevio** (0↑): or Clickhouse
  - **numice** (1↑): I agree except that almost every job ad has Spark, Databricks, and, of course, cloud. And I say this cause I work on-prem and use SQL Server.
- **ch-12** (33↑): We are moving to snowflake because a new business leader likes it more, i think. With all of our pipeline workloads and business users wholly in databricks today, it might be enough for me to polish off the resume and get out
  - **Chinpanze** (39↑): Dude our work is to migrate from snowflake to databricks every 5 years. I'm already used to it.
    - **taker223** (6↑): What happens between migration? Reverse process?
  - **Sufficient_Meet6836** (3↑): I'm sorry you're dealing with that. That's an absolutely moronic decision and reasoning for it
  - **GreyHairedDWGuy** (4↑): I hate it when the 'new guy' comes in with preconceived ideas but without have facts and says 'we are doing X'.  I prefer Snowflake, but seems lame to move just because he likes it better.  Good luck
    - **Ok-Sentence-8542** (2↑): My problem for ml I prefer databricks and for warehousing I prefer Snowflake... Choices...
  - **mrg0ne** (1↑): Should be an easy migration tbh.
  - **CmdrJorgs** (1↑): Same here, our org is switching to Snowflake. My impression is we are trying to make the data more accessible since we have a lot of sub-companies feeding data to the same warehouse. Non-technical folks just like to work in the Snowflake interface more.
- **dev_l1x_be** (10↑): For smaller non-ML use cases I usually use S3+Parquet with either Athena or DuckDB.
- **invidiah** (48↑): I've also seen a migration from Databricks into AWS native services due to high bills.  
Imo, Databricks is for businesses who prefer to overpay for the platform while save on employees.  
If you have capacity and knowledge to maintain AWS including iam, devops plus data engineering - that's a way to go.
  - **justexisting2** (30↑): Either case you don't save a lot.
    - **Dark_Force** (6↑): Depends on how much dev time you are willing to spend on cost optimization
    - **invidiah** (0↑): Comparing to not building a data platform at all?
  - **Blaze344** (9↑): That's 100% the entire point. You overcentralize in a place that "does everything" in a simple manner, accept that your engineering team will be smaller and your cloud bills a bit higher, and off you go, although just like traditional cloud service orchestration, good knowledge of the environment/service itself is pretty good for managing costs and creating an effective, comfortable development cycle.
    - **naijaboiler** (8↑): for us, it works. we support 150 person company with no rela full-time data engineer. That responsibility is shared between 2 guys that have other primary jobs. We also ingest and incorporate data from 15 different sources that then supports applications, marketing, ML, business reporting and other needs, all for under 40k/year.  
doing that with more employees and on AWS will cost us more than that. We are also super aggressive about how we optimize costs on databricks. We avoid a lot of their expensive bells and whistles
- **cp8477** (15↑): Why did you move to Databricks if you don't want to use Databricks the way it's designed?  We moved to Databricks and not only do we love it, we're moving all new DE work to Databricks as well.  We use DQX for automated data validation, Azure DevOps for our CI/CD, and Terraform for IAC.    
  
We're building unit testing into our CI/CD pipelines which will run when the PR is created, and give a pass fail for things like schema, precision, default values, etc.  We built a YAML pipeline that looks at our design documentation (which we uploaded to Unity Catalog) to automatically pass/fail/warn every PR.  If the PR doesn't meet our test cases, its auto fail with a comment to the developer on what failed and what to fix.  Warnings get documented to the PR as a comment so it can be looked at during code review, and a pass means that the code meets the documented standards.    
  
Once the PR is approved, we use DQX to compare the data populated in Silver/Gold to the Bronze layer to run 6 specific test cases:  1) Data in Gold that doesn't exist in Bronze 2) Data in Bronze that doesn't exist in Gold, 3) No duplicates by operational key 4) Surrogate keys/foreign keys populated correctly 5) Datetime successfully converted from UTC to local and 6) Gold upserted correctly from Silver.  All of this is done automatically, as an approved PR kicks off a pipeline run to generate the data in our UAT environment.

As far as cost, what type of cluster are you running?  Are you using job clusters to run your workflows? Are you using serverless clusters or all purpose clusters for your ad hoc?  That's VERY important for cost.  All purpose clusters are very expensive -- in Azure I think it's $0.55/dbu hour vs $0.07/dbu hour for job clusters.  We initially made that same mistake, and by switching to job clusters for our jobs and serverless for our adhoc work, we cut our cost by 75%.

Databricks is a great platform if you use it as intended.  Judging the tool poorly when you aren't using it as designed is like giving a hammer a 1 star review because it's bad at removing screws.
- **ithinkiboughtadingo** (14↑): We use Databricks exclusively and can easily mitigate all of these problems.

* Cost reduction: choose the right compute type for the job. Like consider the size of the data in memory and type of operations you're running, look at the EC2 instance specs, experiment a bit and see what works. You also need to take a hard look at the job in terms of algorithmic complexity and find ways to optimize the query itself, starting with the physical layout of the tables you're querying (partitioning, optimize/zorder/liquid clustering, vacuuming/applying deletion vectors).

* Cluster startup time: you can use serverless in development to speed things up significantly. As for production jobs, a decent rule of thumb is if the cluster takes longer to spin up than it takes to run the job, just use serverless to avoid cold start times and EC2 costs incurred while the cluster is starting.

* Local unit testing: use Spark connect configured in your IDE. Alternatively, you can also pull your code into Databricks using Git folders and run arbitrary code there.

* Budgets: you can set consumption budgets at the cluster level. You can also set required tags for better cost tracking, which you can monitor via the Databricks system tables.

* Deployment/controls: use DABs. Set up your infrastructure so that production jobs have to be deployed via a CI/CD pipeline (Github Actions is great for this when Github isn't on fire). Use Unity Catalog to your advantage to enforce good engineering and compliance practices.

There's a lot more you can do but these are the basics to start with. Databricks is expensive in general, and there's a good argument to be made that it's only worth it once you're over a certain size. But you can make it run really lean if you put some elbow grease into it.
  - **tvdang7** (1↑): thanks
