---
id: social-intelligence/reddit-deep/dataengineering/1re8djt.md
url: "https://www.reddit.com/r/dataengineering/comments/1re8djt/is_clickhouse_a_good_choice/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Is Clickhouse a good choice ?"
author: "Defiant-Farm7910"
date: "2026-02-25T09:09:58.000Z"
score: 40
upvote_ratio: 0.86
num_comments: 38
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.214Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1re8djt.md#c0"
    char_span: [0, 993]
    sentence_count: 8
    key_terms: [clickhouse, dataengineering, connector, bigquery, comments, company, source, data]
    token_count: 212
  - id: "social-intelligence/reddit-deep/dataengineering/1re8djt.md#c1"
    char_span: [1008, 3243]
    sentence_count: 13
    key_terms: [join, primary, engine, types, left, used, different, columnar]
    section: Comments
    token_count: 496
  - id: "social-intelligence/reddit-deep/dataengineering/1re8djt.md#c2"
    char_span: [3245, 5317]
    sentence_count: 3
    key_terms: ["it's", updates, being, data, easy, need, use, clickhouse]
    section: Comments
    token_count: 474
  - id: "social-intelligence/reddit-deep/dataengineering/1re8djt.md#c3"
    char_span: [5319, 7156]
    sentence_count: 8
    key_terms: [clickhouse, postgresql, replacingmergetree, dbt, using, data, like, use]
    section: Comments
    token_count: 458
  - id: "social-intelligence/reddit-deep/dataengineering/1re8djt.md#c4"
    char_span: [7158, 7487]
    sentence_count: 3
    key_terms: [updates, warehouse, lightweight, clickhouse, "shouldn't", postgres, handles, painful]
    section: Comments
    token_count: 72
  - id: "social-intelligence/reddit-deep/dataengineering/1re8djt.md#c5"
    char_span: [7489, 9450]
    sentence_count: 11
    key_terms: [clickhouse, cdc, managed, creative-skin9554, postgres, defiant-farm7910, "don't", data]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dataengineering/1re8djt.md#c6"
    char_span: [9220, 9534]
    sentence_count: 2
    key_terms: [clickhouse, replacingmergetree, mergetree-family, table-engines, frequency, launched, recently, seamless]
    section: Comments
    token_count: 87
  - id: "social-intelligence/reddit-deep/dataengineering/1re8djt.md#c7"
    char_span: [9536, 11497]
    sentence_count: 10
    key_terms: [data, clickhouse, using, integration, like, need, "true", bigquery]
    section: Comments
    token_count: 454
---
# Is Clickhouse a good choice ?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1re8djt/is_clickhouse_a_good_choice/)
Posted by **Defiant-Farm7910** · **40↑** · **38 comments**

Hello everyone,

I am close to making a decision to establish ClickHouse as the data warehouse in our company, mainly because it is open source, fast, and has integrated CDC. I have been choosing between BigQuery + Datastream Service and ClickHouse + ClickPipes.

While I am confident about the ease of integrating BigQuery with most data visualization tools, I am wondering whether ClickHouse is equally easy to integrate. In our company, we use Looker Studio Pro, and to connect to ClickHouse we have to go through a MySQL connector, since there is no dedicated ClickHouse connector. This situation raised that question for me.

Is anyone here using ClickHouse and able to share overall feedback on its advantages and drawbacks, especially regarding analytics?

Thanks!

## Comments

- **tsuareyou** (15↑): The MySQL connector workaround for Looker Studio is a known friction point and it works but it's not ideal, worth factoring that into your decision especially if Looker Studio is going to be the primary visualization layer for non technical users...
- **Little_Kitty** (12↑): Currently doing most of the SQL & tuning side work on a migration from another columnar OLAP to CH, largely because the other costs silly money for what it delivers.  We have BQ and I've used PG/MySQL/Maria/SQL Server/Oracle/... so can probably help.

Data types and nullability are concerns you'll need to learn and handle properly with any columnar DB, but there are also DB settings around nulls you should apply so that you don't end up with reports showing 0 where they should be null or logic that has to test for '' rather than null in a string.  Data types between any two pieces of software typically require a map, so that shouldn't be a distinct concern.  DDLs are a bit different e.g. `LowCardinality(Nullable(String))` but after thirty minutes of learning this should be second nature.

Joins - there are many types and you should learn about the different ones e.g. left anti join, any join, global left join.  If you build outputs with many (10+) joins or you join on functions you'll find the performance isn't great, but that's more of a design issue - design to (left) join on UInt64 fields.  The weirdest thing to get your head around is that join order matters, which is bizarre if you're used to a query execution planner doing this for you.  For heavy queries expect to specify the join engine and a few parameters to get things running just right - an LLM can give you a starting point and tuning tests, so not too hard.

Table engines - Used properly this can speed things up massively and convey intent - the Set engine, for example is a great way to check if a value is good / bad without an additional join and operates near instantly.

Primary Keys - not really a thing here, instead you have order by.  There are table engines which should apply the primary key, but it's better if your logic sets this to be the case rather than relying on the engine itself.  Expect to footgun yourself at least once here.

SCD2s - can be challenge - ASOF LEFT JOIN is great in principle, but if you have a list of preferred suppliers stored as an SCD2 you'll need to order by supplier id and valid from and add a 'future' non-preferred record so that transactions after the end data don't continue to return 'preferred'

Syntax:

 - argMax and various array functions are excellent and Claude is great at writing them
 - being able to refer to results from the same select can really cut down the CTE chain
 - if you're running on a cluster or with multi-client and orchestration, the boilerplate can get a bit OTT, but that's true for competitors too

Memory use - All columnar databases love to eat memory, expect to have nodes with 128GB+ if you've got a few tens of millions of rows of wide data.

ClickPipes - not used this.
  - **Glokta_FourTeeth** (1↑): Thanks, this is useful info
- **sisyphus** (7↑): I love clickhouse and found it very easy to admin.  The main things to know in my opinion are:

- make sure that your partition/ordering are set up correctly, which requires some knowledge of the shape of your queries.

- look at the table engines available they cover a lot of common use cases

- the default settings will generate a lot of logs not just on disk but in your system tables that you will want to unbloat 

- what operations are async (people say it's bad at updates but I use ReplacingMergeTree and just keep slamming new data in and clickhouse 'updates' it for me, it's never been a problem except you do need to know it's async so you can't count it on it being updated the second after you put it in, maybe other people need to do more targeted ad hoc updates tho)

- do inserts in batches (not sure if this is relevant with mysql connector)

After that it's basically lightning fast; very easy to run locally; easy to query from code or cli; and free to run unlimited queries of any size forever (as someone who has been on calls with google about optimizing bigquery spend you can get very spoiled being able to just type any old query whenever you want for free).

It is *just* an analytics engine though whereas bigquery is like a data warehouse in a box.  If you want to do stuff like redact PII or build ml models or integrate gcp iam and so on and so forth that bigquery can do for you you'll be more often rolling your own solutions for clickhouse.
  - **Defiant-Farm7910** (3↑): Thank you very much. But how do you use the table engines?

At the moment, all of our data marts are built using DBT on top of PostgreSQL. To reduce migration costs, I am wondering whether it would be possible to continue using DBT with the PostgreSQL dialect while offloading queries from PostgreSQL to ClickHouse via the `pg_clickhouse` extension.  
  
In other words, the idea would be for DBT to keep sending the analytical workload to PostgreSQL, which would then offload it to ClickHouse in order to improve performance.
    - **sisyphus** (2↑): You just tell clickhouse which one you want to use when you create the table.

I'm not familiar with pg_clickhouse but it looks like the main dev is employed by clickhouse themselves, so that's auspicious.
- **burunkul** (2↑): Postgres -> Debezium -> Kafka -> Clickhouse Sink Connector  -> ReplacingMergeTree

Works good
  - **CaldenMichael** (2↑): Im using this currently but instead if ReplacingMergeTree which is CPU intensive i use DBT and delete+insert strategy for incremental data
  - **Ops_Pab** (1↑): This is great stack.
- **liprais** (3↑): it handls upsert and join badly,means you will have to build the dataset elsewhere,keep that in mind.
  - **Glokta_FourTeeth** (3↑): Hi,

What do you mean? Our org is in the midst of transitioning from redshift to clickhouse atm, so this will be useful info as I'll be the one doing the maintenance
    - **Creative-Skin9554** (8↑): This is somewhat true of ClickHouse ~2 years ago, but it still gets repeated now.

Updates used to be a bit painful, but this is true in pretty much every warehouse/OLAP. None are built to handle the kind of update work you do in Postgres, and you shouldn't really be doing that in your warehouse anyway. But ClickHouse has had lightweight updates for at least a year, so it handles updates better than most now.

Joins are still improving, they added column stats and automatic reordering recently which has been good. Seems like there's work towards a full cost based optimiser, which will make joins easier - but that doesn't mean it can't do them now, you just have to think a bit more in depth about optimising your join yourself (the type of join, which side to put each table, putting in pre-jion filters, etc) which you should be doing anyway, as automatic optimisers don't always get the best results.
  - **Mysterious_Print9937** (0↑): What do you recommend? Pg?
  - **Defiant-Farm7910** (0↑): It handles JOIN badly 😵? Since I intend to build all my data marts in the Data Warehouse, and we have quite normalized and several source tables, joining badly is quite a red flag for me, actually. I will check it out. Thanks!
    - **Creative-Skin9554** (2↑): https://www.reddit.com/r/dataengineering/s/39LSqaJOtw
    - **Hofi2010** (1↑): Have you looked at the CH extension for Postgres ?
- **fabkosta** (2↑): Depends on whether you need OLTP or OLAP. Don't use it for OLTP, but for OLAP it's a solid choice, as long as you primarily append new data and don't try to insert or update a lot.
  - **Defiant-Farm7910** (1↑): That's why I talked about CDC. I intend to keep the source tables in PG, where all the upserts are done. But I imagine ClickPipes or any other CDC works well in CH? Or even the upserts from the CDC may cause problems ?
    - **Creative-Skin9554** (3↑): Well ClickHouse Cloud sells both managed Postgres and managed ClickHouse now, and their whole pitch is that the CDC is done straight out of the box - so it's safe to say it's pretty well supported
    - **Suspicious-Ability15** (2↑): Managed Postgres by ClickHouse for OLTP (launched recently) and Managed ClickHouse for OLAP with seamless CDC is the future stack. Can’t go wrong IMO.
    - **sceadu** (1↑): https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
    - **Little_Kitty** (0↑): The answer to this depends on scale, frequency & usage.

If you capture monthly + changes are large + your reports are largely temporally separated (filter by date first) then appending 10% to the existing table every month is fine.  If the opposite is true and you capture a few lines hourly and your usage is by e.g. customer you'll find that versioning the underlying data is better because data read can then touch far less data on disk to get the necessary pages to process.  This will be true whether you're using Spark to  build parquet files stored on S3 as the basis for your main tables using deltalake or loading to true clickhouse tables and using materialised views etc.
- **CrowdGoesWildWoooo** (1↑): Clickhouse is great, it’s dirt cheap and powerful (dealing with billions of row of data with 32gb instance). However, it also have some skill barrier, so you need some skills to optimize (blindly reading from cloud storage has horrible performance without tuning). 

There are also some “quirks” that you need to be aware of and work around it, which likely doesn’t exist in other OLAP Data Warehouse. It’s not the end of the world though, just a few things you need to be familiar with.

I don’t like the pricing for clickpipes unless you have serious volume.
- **Automatic-Market8165** (1↑): It's the the first OLAP that I used and have a stereotype that Bigquery can never setup the same influence as clickhouse ever 🥴
- **Turbulent_Egg_6292** (1↑): What volumes of data and refresh rate do you plan to serve? 
I think that's the number 1 element to evaluate when deciding between a microbatch/realtime focused tool like ch and a serverless tool like bq, each with the ability to do both but with nuances
- **manubdata** (1↑): Due to the ease of integration with your currenr setup I'd go with BigQuery.

Clickhouse might be amazing and I see it is trendy among big tech but it's just noise to your workflow.

Focus on the business outcomes and go for ease of development + integration + maintenance.
