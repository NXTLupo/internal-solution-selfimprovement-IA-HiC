---
id: social-intelligence/reddit-deep/dataengineering/1t5vlzc.md
url: "https://www.reddit.com/r/dataengineering/comments/1t5vlzc/should_i_use_fivetran/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Should i use fivetran"
author: "Advanced-Average-514"
date: "2026-05-07T00:58:17.000Z"
score: 11
upvote_ratio: 0.8
num_comments: 70
flair: "Discussion"
extracted_at: "2026-06-29T14:40:47.212Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1t5vlzc.md#c0"
    char_span: [0, 1245]
    sentence_count: 8
    key_terms: [fivetran, dataengineering, core, dbt, business, comments, airflow, running]
    concepts: [fivetran, dataengineering, business, comments, airflow]
    token_count: 283
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1t5vlzc/should_i_use_fivetran/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1t5vlzc.md#c1"
    char_span: [1259, 2927]
    sentence_count: 18
    key_terms: [fivetran, data, unpredictability, sources, cost, sync, connectors, extraction]
    concepts: [fivetran, unpredictability, sources, connectors, extraction]
    section: Comments
    token_count: 400
  - id: "social-intelligence/reddit-deep/dataengineering/1t5vlzc.md#c2"
    char_span: [2929, 4740]
    sentence_count: 15
    key_terms: [fivetran, advanced-average-514, emotionalsupportdoll, task, data, like, need, runs]
    concepts: [fivetran, advanced-average-514, emotionalsupportdoll, dependency, outages]
    section: Comments
    token_count: 459
  - id: "social-intelligence/reddit-deep/dataengineering/1t5vlzc.md#c3"
    char_span: [4742, 6654]
    sentence_count: 12
    key_terms: [users, platform, etl, pipelines, technical, comments, fivetran, solution]
    concepts: [users, platform, pipelines, technical, comments]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1t5vlzc.md#c4"]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/dataengineering/1t5vlzc.md#c4"
    char_span: [6656, 8316]
    sentence_count: 12
    key_terms: [fivetran, platform, etl, pipelines, team, use, requirements, experience]
    concepts: [fivetran, platform, pipelines, requirements, experience]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1t5vlzc.md#c3"]
    section: Comments
    token_count: 363
  - id: "social-intelligence/reddit-deep/dataengineering/1t5vlzc.md#c5"
    char_span: [8318, 9353]
    sentence_count: 6
    key_terms: [month, like, rows, fivetran, spending, plugins, updates, claude]
    concepts: [month, fivetran, spending, plugins, updates]
    section: Comments
    token_count: 259
---
# Should i use fivetran

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1t5vlzc/should_i_use_fivetran/)
Posted by **Advanced-Average-514** · **11↑** · **70 comments**

Hey,

I work in ad tech, and we are massively scaling up our data operations. Instead of letting a vendor handle campaign performance data across clients and ad platforms, we are going to start handling it ourselves. In the past i was just doing analytics engineering and business intelligence, but now the core of the business will be running on my pipelines.

I know i need to move beyond what i have now which is cloud run jobs running on schedules + dbt core, for better task dependency management and observability primarily. I've considered a few options, but the ones I'm deciding between are:

1. fivetran and its integrated dbt

2. airflow to orchestrate imports + exports dbt core

I have experimented a bit with google managed airflow in the past but have never used fivetran. Am i correct that the main benefit for choosing fivetran in this situation (which will cost 3-4x as much) is the pre-built connectors? Or is there more to fivetran than I understand? Also, any drawbacks to using fivetran I should be considering?

## Comments

- **Typical_Priority3319** (37↑): The drawback is the price.
  - **Top-Average412** (13↑): And the unpredictability. Fivetran is in an extraction phase and the only way to live up to baked in valuations is to squeeze customers.
    - **Advanced-Average-514** (6↑): Curious how the unpredictability would manifest? As in changing pricing unexpectedly?
    - **Eric-Fivetran** (4↑): I'm not sure what you mean by "extraction phase"? We're focusing more investment in core R&D around our connectors and reliability than at any point since I joined. Our price change early last year was largely to reduce prices.
- **SeaYouLaterAllig8tor** (5↑): The hate for Fivetran is strong on this sub - be warned! 
We use Fivetran and dbt for most of our data ingestion and transformation. The cost really takes off when you're ingesting sources at scale. I think that's people's main complaint. As you sync more and more data it gets much more expensive. That said, Fivetran is simple to sync data for most sources. It usually takes me 10 mins or less to sync data to a new source. It's a trade off, cost vs simplicity. At least... That's how I see it
  - **GreyHairedDWGuy** (2↑): I agree about the haters on this sub.  I find it a very useful solution that alleviates the requirement to build API pipelines to common sources like SFDC, Linkedin, GA and others.  It is simple to setup for most connectors.    

The people I have seen complain about the cost are the ones that did not anticipate the volatility/volume of their data and the MAR implications.   We watch the MAR spend almost daily and have reports that trigger when there is a sudden spike so there are few surprises.

Overall, I think it is a useful solution when you don't have an army of people to monitor/admin home grown solutions.
    - **SeaYouLaterAllig8tor** (3↑): Ya, I mean... Fivetran isn't without it's criticisms. I have a couple things about it that frustrate me, but overall it just works. 
Like, sure you can write an API to pull data into a data frame somewhere and load it to a table, but if you're at an enterprise level company and don't have a whole team of devs doing this then a tool like Fivetran is much faster/simpler.
- **molodyets** (5↑): Do you really need those things or do you just want those things? What better dependencies do you need?
  - **Advanced-Average-514** (1↑): Dependency management as in task a runs after task b. Right now it’s task a runs at 1:30 task b runs at 2. I do think I’m at a point where I need it because I will have higher reliability requirements.
    - **GoinLong** (1↑): If you are using dbt presently, you should be able to make the dependency.
- **EmotionalSupportDoll** (6↑): Fivetran is nice, so long as it works. Random undocumented outages are a pain in my ass. So I only use them for weird, small uses cases. 2 clients using Twitter ads? Not worth my time to go stand up a real pipeline, I can probably make fivetran work ok-enough for that. At some point, the rigidity and cost combine to make it less worthwhile. 

So for the time being, the line I draw given my current role is homegrown Google, Bing, meta, TikTok, GA4, and Shopify API connectors. Anything else, I'll deal with fivetran or some other method to ingest data
  - **Advanced-Average-514** (1↑): Interesting, would love to hear more about those outages. Is it like the entire platform going down occasionally and how often?
    - **EmotionalSupportDoll** (2↑): Better! Random and unpredictable.

Amazon Selling Partner data feed just kinda died for a week or so out of nowhere for no reason last week. It seems like it's caught back up.
- **VirginiaVN900** (3↑): If you fully understand what the platform solves, how to evaluate it so that you truly know that it solves your use case without additional customization and, you can identify the drawbacks/limitations of the solution. 

Then dive in!

More often than not, we think there is a magic bullet. More often still, a tool doesn’t solve our lack of understanding. It just exposes more knowledge to have to gain.
- **Hofi2010** (3↑): Another free solution would be dlt data load tool
  - **Thinker_Assignment** (2↑): Thanks. We also have a managed service that ends up 300-3000x cheaper than competitor saas on SQL for example, it's straight serverless compute with a thin margin for the managed platform, no predatory pricing

[https://www.reddit.com/r/dltHub/comments/1tpym7m/3000x\_cheaper\_than\_other\_saas\_dlthub\_sql\_copy/](https://www.reddit.com/r/dltHub/comments/1tpym7m/3000x_cheaper_than_other_saas_dlthub_sql_copy/)
- **howsitmybru** (2↑): Just moved off 5T. It’s expensive and if you have a good team can all be done much cheaper. But if you have budget it’s one thing less to worry about.  There was some handling 5T does under the hood for some connectors you end up missing and have to figure out yourself.
  - **Thinker_Assignment** (2↑): jeeeeeez... doing this on github action costs $15 and you can just prompt claude for that. You probably paid 5000+?
- **nloding** (2↑): (Full disclosure: I work for an ETL platform that competes with Fivetran, Matia.)

One other thing to consider is what users might need to work with the ETL pipelines - are they all technical users, or do some non technical users need to be enabled to manage pipelines too? ETL platforms like Fivetran or Matia will enable those users better than Airbyte can.

The other advantage an ETL platform like that brings is that it is fully managed. My experience is that the issues with connectors people bring up with Fivetran are also issues they would have managing large ETL pipelines themselves; the difference is transparency and your ability to address the issue directly vs potentially waiting for support. In my experience the downtime is roughly the same when all settled. One question to ask here: is your team ready to manage the infra, all the observability, etc., on top of building out the pipelines? Sometimes the cost of a platform is warranted (that said, Fivetran’s pricing boggles my mind, so if you are interested in an ETL platform, make sure you chat with others in the space beyond Fivetran).

A couple of the comments act like there is never a reason to use an ETL platform over open source and, really, that’s silly. It depends on your team, your infrastructure, your budget, your project requirements, and your philosophy about FOSS. Both options will work - which one fits your requirements and limitations the best to enable your team and the business?
- **GreyHairedDWGuy** (2↑): We use Fivetran and it works well for us.  We don't use any of the prebuilt dbt integrations.  We just use it to easily replicate many of the cloud and on-prem databases to Snowflake.   Most will say the downside is that it's expensive but if you have a small DE team, IMHO it's better than dedicating a FT DE to watch/support all the data ingest pipelines (a can provision a lot of fivetran capacity for the salary of a DE).

They now also have reverse ETL via the census purchase which we may utilize in the future.

Where Fivetran can be expensive is in the case where you have a large volume of inserts into the source that is being replicated (as compared to updates).   We had a SQL Server table with 500m rows that added about 20m new rows per month.  Each one of these rows counted toward paid MAR.  If you have the case where monthly updates are more frequent and the same keys get update multiple times a month, the cost is more manageable (you don't pay every time the same key gets touched in a month).
- **tossedsalad9696** (2↑): The hate for fivetran is by ENG folks who like spending 5x on tokens for a worse output.
  - **Thinker_Assignment** (2↑): we benchmarked and it cost**s $1.50 on claude** without any plugins to generate a pipeline. more like $2.50 if you use plugins to get high quality result.

You can then deploy to own infra (also with claude if you got no other way) and end up **3000x  cheaper** to transfer something like TPC-H dataset

How big is your bill? You could probably save 99% of it while spending $10 on tokens.
