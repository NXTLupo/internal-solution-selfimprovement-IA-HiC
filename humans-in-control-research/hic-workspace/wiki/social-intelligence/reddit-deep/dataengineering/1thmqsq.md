---
id: social-intelligence/reddit-deep/dataengineering/1thmqsq.md
url: "https://www.reddit.com/r/dataengineering/comments/1thmqsq/sqlbuild_a_typed_testfirst_sql_pipeline_framework/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "SQLBuild - a typed, test-first SQL pipeline framework with local E2E testing"
author: "kvlonge"
date: "2026-05-19T13:18:28.000Z"
score: 19
upvote_ratio: 0.91
num_comments: 20
flair: "Open Source"
extracted_at: "2026-06-11T18:58:17.216Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c0"
    char_span: [0, 2319]
    sentence_count: 12
    key_terms: [sql, testing, data, test, pipeline, dataengineering, against, duckdb]
    token_count: 513
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c1"
    char_span: [2321, 2590]
    sentence_count: 1
    key_terms: [sqlbuild, github, waffle-shop, chio-labs, https, com, sqb, integrations]
    token_count: 77
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c2"
    char_span: [2605, 2833]
    sentence_count: 1
    key_terms: [marathon664, answered, kvlonge, opinion, project, sqlmesh, answer, anyone]
    section: Comments
    token_count: 64
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c3"
    char_span: [2835, 5221]
    sentence_count: 9
    key_terms: [sqlmesh, state, framework, test, quite, dbt, sql, following]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c4"
    char_span: [4895, 6662]
    sentence_count: 9
    key_terms: [sqlmesh, oss, integration, cloud, did, dagster, tobiko, time]
    section: Comments
    token_count: 385
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c5"
    char_span: [6664, 8578]
    sentence_count: 15
    key_terms: [sqlmesh, state, did, lets, like, vdes, work, postgres]
    section: Comments
    token_count: 423
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c6"
    char_span: [8580, 10507]
    sentence_count: 17
    key_terms: [sqlmesh, dagster, without, making, "don't", seems, integration, been]
    section: Comments
    token_count: 441
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c7"
    char_span: [10509, 12411]
    sentence_count: 14
    key_terms: [data, representative, testcontainers, great, mssql, raw, customers, pipelines]
    section: Comments
    token_count: 437
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c8"
    char_span: [12413, 13999]
    sentence_count: 4
    key_terms: [select, join, completed, coherent, scenario, sqlbuild, fixture, inputs]
    section: Comments
    token_count: 376
  - id: "social-intelligence/reddit-deep/dataengineering/1thmqsq.md#c9"
    char_span: [14001, 15430]
    sentence_count: 10
    key_terms: [environments, sqlmesh, mradjunctpanda, "don't", environment, sampling, fixture, targets]
    section: Comments
    token_count: 339
---
# SQLBuild - a typed, test-first SQL pipeline framework with local E2E testing

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1thmqsq/sqlbuild_a_typed_testfirst_sql_pipeline_framework/)
Posted by **kvlonge** · **19↑** · **20 comments**

*Full disclosure: this is my project. Open source, Apache 2.0.*

Every other branch of software engineering understands the testing pyramid - unit, integration, E2E - and has tooling to make testing local and fast. Frontend has Vitest and Playwright. Python has pytest and testcontainers. Data engineering in the SQL space is uniquely behind, simply because most tooling doesn't make it very easy.

I've been making SQLBuild to change that. It's a typed, test-first SQL transformation framework where DuckDB is a first-class execution target.

*What makes it different from dbt:*

* **Unit tests chain across models -** mock your sources/refs, assert on any model downstream, and every intermediate model resolves from its real SQL in one test file. Tests are written in SQL, so macros work as reusable test helpers for generating fixture data.
* **Macro and UDF test modes -** dedicated test modes for macros, UDFs, and table functions, not just models
* **E2E scenario tests -** define fixture data, build the real pipeline graph against it in isolated relations, then capture fixtures as JSONL snapshots and replay locally in DuckDB. Full pipeline testing, zero warehouse compute
* **Audits block before promotion -** audits run against a staging table before the swap. If they fail, production is untouched. For incremental models, each microbatch is audited before DML
* **Compile-time validation -** SQL validation, column type inference, column-level lineage, and contract enforcement, all offline
* **Python macros -** real functions, not Jinja. Testable, debuggable, and adapter-aware
* **Environment table diffs -** `sqb diff prod:dev` compares schemas and row-level data
* **Query-change detection -** Fingerprint-based tracking detects when model SQL has actually changed and can trigger bounded or full rebuilds automatically (configurable)
* **No manifest required -** clone, diff, and defer work against live environments

**Adapters:** DuckDB, MotherDuck, Snowflake, BigQuery, Databricks, PostgreSQL (more coming soon...)

**Integrations:** Dagster (full support), Airflow (coming soon)

**Easiest way to try it:**

    pip install sqlbuild
    sqb playground waffle-shop
    cd waffle-shop
    sqb build

GitHub: [https://github.com/chio-labs/sqlbuild](https://github.com/chio-labs/sqlbuild)

## Comments

- **marathon664** (5↑): It's a cool project to make, but in your opinion why should anyone use this over SQLMesh?
  - **kvlonge** (3↑): Hey, so some of those are answered above, but I will try to answer on the main points below:

* **SQL Testing Capability is Unmatched** \- I am not sure how much you have used SQLMesh, but the ability to be able to use macros as test helpers, to test SQL across multiple models at once, to test UDFs + macros, to test the entire warehouse E2E, and to even be able to run those E2E tests locally where transpilation allows, is simply something that no other framework has made doable at this point. This is by far the massive differentiator between this and SQLMesh (and any of the other frameworks), and I think testing is only increasing in importance given the increased usage of people writing SQL with LLMs (i.e. needing some sort of fast feedback loop)
* **Stateless by Default -** SQLMesh introduced a lot of complexity by having virtual environments and state based orchestration as default. Even for someone like myself who was quite into SQLMesh, this actually took quite a long time to get used to, and also presents some maintenance risks as state has the opportunity to leave users in positions that are very hard to debug because the possible set of states your state table can end up in is pretty much 'infinite'. Requiring a Postgres DB for this as well (what SQLMesh recommend for production use cases) is also quite heavy, and I don't think this should be required as the bear minimum for someone using a transformation framework. I do plan to add state aware based scheduling in a month, but this is strictly opt-in rather than forced upon you
* **SQLMesh Future is Hazy -** Not sure how familiar you are with what has happened in the past year but Fivetran somehow managed to effectively purchase the entire industry (DBT + SQLMesh + SDF Labs, indirectly) in the span of about two months, following which SQLMesh's commit history fell off of a cliff. I don't say this as just some biased hater either. I literally was going to job interviews telling companies I was applying to about why I thought SQLMesh solved many issues DBT did not, and how if I had the option I would potentially POC it vs DBT if choosing a framework. I was (and largely still am) a massive SQLMesh fan, but following the acquisitions, I simply could not justify the risk that picking SQLMesh would bring. It did eventually get donated to the Linux Foundation, but this does not look like something that is going to actually increase development (some members of Fivetran are still on the board and there is still no roadmap for SQLMesh). This is in fact maybe the largest reason I even made this framework. SQLMesh is basically dead at this point, and DBT is pretty much a 'monopoly' + they don't do all of the things I, or many former SQLMesh users, want (some stuff is behind a pay wall and some stuff just doesn't exist). I want this space to return to having some actual competition and innovation
* **First Class Dagster Integration + No Paywall Locking -** Tobiko didn't have much choice in this, but around the time they started doing Tobiko Cloud, they had begun splitting capability between their cloud product (which is now discontinued I believe) and their OSS one. For the longest time they did not have a native Dagster integration, and when they finally did, it was only usable if you had Tobiko cloud. This is not something which is ideal for the community and is what got me into OSS in the first place as I did some small work on the OSS Dagster integration that somebody else had made. I am not going to be locking any features behind pay walls, and will eventually likely go as far as to have some form of 'OSS DBT Cloud' / Airflow like UI that people can use freely and deploy on their own with full auth, fully OSS, 100% free. This will be proven with time more so, but this I think is very important for the community and may not be appreciated now, but will be much more in the coming months/years I think

Hopefully, that mostly answers your question. All in all, I think for anyone 
    - **marathon664** (1↑): Hey, thanks for responding. I think what you're doing is pretty neat, but I am going to be somewhat critical in this response.

The first and second bullet points make me unsure if you have used SQLMesh to its full capabilities, or maybe I lack the context to know how this project goes beyond. AFAIK, all of those things you mentioned are testable from within SQLMesh. If I'm wrong, please let me know. 

To the second point, SQLMesh lets you run with duckdb as the local state db by default, and it'll create the state db for you in like one file you can do whatever you want with, so it's not like it requires Postgres. I did all my initial PoCs using duckdb for state, and then only when the org was ready to move on it did I hook it up with Postgres. But really any transactional DB should work fine, hell I even hooked it up to unity catalog at one point and it was slow but did work. If you aren't manually messing with objects in the state DB, which there should be virtually zero reason to ever do, I have never had it cause issues for me.

But really my main gripe is that VDEs are a fantastic abstraction. They're like half of the secret sauce that allows SQLMesh to be maximally efficient. SQLMesh is the only tool that lets you avoid rerunning models that have no code changes and are not ready for refresh. VDEs are what lets your dev runs execute only the minimal set of models impacted by your changes, which in turn speeds up the pipeline enough for agents to reliably iterate on the compilation/audit/test failures until the plan passes. VDEs let devs work in isolated environments without creating thousands (or millions, if you're my company lol) of duplicated objects eating storage and pushing into metastore limits, and they get automatically cleaned up next time you call sqlmesh run.

Making "SQLMesh but stateless and without VDEs" is like making a PB&J without PB or J. Without state management and VDEs, it seems like you've basically got a SQL linter (not even, if you're change tracking queries via fingerprinting, when SQLMesh is parsing query ASTs to determine what is modified and downstream impacts) that is hooked up to testing libraries. I get that maybe for your use case those features were overkill, but they solve very real problems in a way no other tool has really been able to.

I haven't used dagster, so I can't speak to their cloud integration for it, but given the other points, I personally don't feel dagster alone is worth switching from SQLMesh. The SQLMesh scheduler is still the thing parsing and compiling the SQL and checking refresh crons, so I don't see much value add unless you're already on dagster.

Lastly, SQLMesh is starting back up and I recently merged several PRs. The members on the steering committee are getting back into reviewing, and they even asked me if I wanted to become a maintainer. I'm optimistic for the future of the project. Hazy maybe, but definitely MUCH improved over where it was from a month or two ago. You can join the slack and start chatting and they could very well be willing to bring in the Dagster integration or accept PRs. But even if SQLMesh got frozen in time, it's still so useful I have a hard time imagining switching.

Still, it's a cool project and you should keep making things that solve problems for you. Don't let my critiques discourage you from building things!
- **meatmick** (2↑): Any plans of supporting Microsoft SQL Server? SQLMesh works with it but seems abandoned, and dbt core has a community plugin that hasn't been updated in nearly 1 year. DBT Fusion has no plan to implement MSSQL in at least 1 year (I asked them).
  - **kvlonge** (2↑): Hey man! Oh, sorry to hear that. Seems like you guys have been left to dry. 

MSSQL is the next one on the list, but seeing your situation. I can potentially get this done this weekend for you it would be useful for you? (it's pretty easy for me to me add adapters, but I usually wait until I am asked just so that I prioritising them in the right order - MSSQL is also great because I think I can run it in testcontainers to verify the SQL is actually correct, without having to pay money like I did for the others haha)
    - **meatmick** (1↑): Well, I'm not stuck or anything but I'm always open to exploring new tools.
  - **kvlonge** (1↑): Hey man! So I just added the adapter about an hour ago. MSSQL had some funny syntax behaviours so I caught a bunch of funny stuff while testing. It should all be good now, but this is definitely where some additional feedback from an actual user would be great. Cheers!
    - **meatmick** (1↑): Great, let me learn your tool and get back to you asap.
- **tandrew-42** (1↑): Intersting project.  
  
One thing I am curious about: how does this handle the "test data" problem? The hardest part of local E2E testing for data pipelines isn't the framework - it's having representative data that exercises edge cases without being a full production dump. Testcontainers works for databases because you can spin up schema + seed data quickly. But data pipelines often depend on specific data shapes that are hard to synthesize.
  - **kvlonge** (1↑): Good question. So the way that E2E scenarios work is that you can actually query your source data and pull down a representative sample in whatever query shape you want.

For example, you can sample 10,000 representative customers from raw\_customers, then define raw\_orders as only orders for those customers, and raw\_payments as only payments for those orders. So you avoid the classic problem where every source is randomly sampled independently and none of the joins line up.

Roughly:

    SCENARIO (
      description: "Completed orders have linked payments for a coherent customer sample"
    );
    WITH
    sampled_customers AS (
      SELECT customer_id
      FROM __source("raw_customers")
      WHERE created_at >= DATEADD(day, -30, CURRENT_DATE())
        AND MOD(ABS(HASH(customer_id)), 1000) < 10
      LIMIT 10000
    ),
    __source__raw_customers AS (
      SELECT c.*
      FROM __source("raw_customers") c
      JOIN sampled_customers s USING (customer_id)
    ),
    __source__raw_orders AS (
      SELECT o.*
      FROM __source("raw_orders") o
      JOIN sampled_customers s USING (customer_id)
    ),
    __source__raw_payments AS (
      SELECT p.*
      FROM __source("raw_payments") p
      JOIN __source__raw_orders o
        ON p.order_id = o.id
    ),
    __assert__all_completed_orders_have_payments AS (
      SELECT *
      FROM __ref("fact_orders")
      WHERE order_status = 'completed'
        AND payment_amount_cents IS NULL
    )
    SELECT 1

`__source("raw_customers")` means “query the real warehouse source during capture.” The `__source__raw_*` CTEs define the fixture inputs that get saved. The `__assert__...` CTE is a zero-row assertion: after SQLBuild builds the real model graph from those captured inputs, the scenario passes only if that query returns no rows.

SQLBuild then captures that shaped fixture into JSONL, and CI can replay the full model graph locally in DuckDB. So the test data is representative because it came from production-like source data, but it is small, coherent, committed, and stable for local replay.

The reason I added this is that hand-writing realistic fixture data for long E2E tests is painful. This gives you a way to build the fixture from the real source shape once, commit it, and replay it cheaply. In a real case you might use a stratified sample to ensure enough customers per day/status/segment, but the important bit is that the sampling logic is just SQL, so you are not boxed into one sampling strategy.
- **MrAdjunctPanda** (1↑): Looks intresting! Not sure I follow how it can be stateless and have environments too
  - **kvlonge** (1↑): Thanks! So maybe this is my fault for how I used the terminology, but when I say environment, I just mean prod vs dev (more like DBT targets), I don't mean the fancy virtual environments that SQLMesh did. I don't have any plans to do that at this point (even as opt-in) because I am not sure it's a feature I want. 

Environment table diffs is more like compare model x between targets dev and prod (the schema, the rows, account for tolerances + get row samples for example rows that differ etc...)
    - **MrAdjunctPanda** (2↑): AHH gotcha! We run sqlmesh at work, and the environments are actually brilliant. I don't think we could move off to a tool without them; even with the slightly janky state

Off the top of your head is the architecture there for adding state for environments? If so I could take a look as a drop in replacement for sqlmesh & DBT might be killer!
