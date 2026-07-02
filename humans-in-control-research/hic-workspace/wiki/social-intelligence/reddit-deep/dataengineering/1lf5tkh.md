---
id: social-intelligence/reddit-deep/dataengineering/1lf5tkh.md
url: "https://www.reddit.com/r/dataengineering/comments/1lf5tkh/whats_the_best_data_pipeline_tool_youve_used/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "What's the best data pipeline tool you've used recently for integrating diverse data sources?"
author: "Not-grey28"
date: "2025-06-19T08:42:34.000Z"
score: 24
upvote_ratio: 0.94
num_comments: 32
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.194Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1lf5tkh.md#c0"
    char_span: [0, 590]
    sentence_count: 3
    key_terms: [dataengineering, data, comments, pipeline, sources, "you've", "i'm", tool]
    concepts: [dataengineering, comments, pipeline, sources, "you've"]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1lf5tkh.md#c2"]
    token_count: 139
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1lf5tkh/whats_the_best_data_pipeline_tool_youve_used/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1lf5tkh.md#c1"
    char_span: [604, 2277]
    sentence_count: 8
    key_terms: [ingestion, orchestrator, airbyte, dagster, like, postgres, tracking, airflow]
    concepts: [ingestion, orchestrator, airbyte, dagster, postgres]
    section: Comments
    token_count: 357
  - id: "social-intelligence/reddit-deep/dataengineering/1lf5tkh.md#c2"
    char_span: [2279, 3628]
    sentence_count: 10
    key_terms: [data, fabric, notebooks, rest, pipeline, sources, use, tophaholic]
    concepts: [fabric, notebooks, pipeline, sources, tophaholic]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1lf5tkh.md#c0"]
    section: Comments
    token_count: 321
  - id: "social-intelligence/reddit-deep/dataengineering/1lf5tkh.md#c3"
    char_span: [3630, 4736]
    sentence_count: 6
    key_terms: [data, incremental, pipelines, pipeline, schema, classic-sherbert3244, works, like]
    concepts: [incremental, pipelines, pipeline, schema, works]
    section: Comments
    token_count: 244
---
# What's the best data pipeline tool you've used recently for integrating diverse data sources?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1lf5tkh/whats_the_best_data_pipeline_tool_youve_used/)
Posted by **Not-grey28** · **24↑** · **32 comments**

I'm juggling data from REST APIs, Postgres, and a couple of SaaS apps, and I'm looking for a pipeline tool that won't choke when mixing different formats and sync intervals. Would love to hear what tools you've used that held up well with incremental syncs, schema evolution, or flaky sources.

## Comments

- **[deleted]** (20↑): Switched to Airbyte a few months ago. It handled schema drift on our Stripe API and Postgres tables way better than anything we tried before.
- **GammaInso** (8↑): For anyone reading. If the workload is mixing REST payloads with SQL sources the main bottleneck is usually schema drift handling and reliable state tracking. Airbyte is solid there for things like Stripe or Postgres which makes it a good ingestion piece in a split stack with Dagster or Airflow orchestrating runs. Fabric pipelines can make sense if you are already deep in Microsoft since notebooks let you patch weird JSON before landing it. For cases where REST endpoints mutate often or you need incremental syncs without babysitting retries, Integrate.io is worth testing since it handles change tracking and nested fields without glue scripting. Whatever you choose, treat ingestion and orchestration separately and evaluate based on how it recovers partial failures not how many connectors it lists.
- **shittyfuckdick** (7↑): thought dagster was dumb reddit hype but its actually really solid. maybe my favorite orchestrator rn. 

also really wanted to like mage but it tries to be too much. i appreciate the swiss army approach but too much trying to appeal to newer data engineers and a greedy marketing strategy
- **Routine-Ad-1812** (5↑): Sounds like you need two different tools, an orchestrator to manage the syncing/batch scheduling and some sort of ingestion tool to manage the various formats. If you want open source then:

Orchestrator:
Dagster, airflow, and prefect are the top 3

Ingestion:
Airbyte has an OSS version, not sure about fivetran but it seems popular.

For the flaky APIs it may also just be best to use python + the tenacity library to extract the data and load it into wherever your raw/staging data lives
- **_somedude** (2↑): Benthos (bento)
- **Which_Roof5176** (2↑): Yes, Estuary Flow (disclaimer: I work there) handles REST APIs. Many of its connectors use REST under the hood, and you can also push JSON directly into a pipeline with the ingestion API. It makes it easy to combine REST sources with databases or SaaS apps in a single real-time pipeline without piling on custom glue code.
- **Tophaholic** (1↑): Microsoft Fabric does a fabulous work of that.  Pipelines and orchestration along with Onelake. Notebooks for transformation.
  - **back-off-warchild** (1↑): Does Fabric come with a bunch of native integrations supported by Microsoft that can ingest data sources into the Notebooks?
    - **Tophaholic** (2↑): Yes. Fabric has copy data activity in the pipeline to ingest data from different sources including Oracle, Postgres, SQL, SAP and REST API.  I typically copy the required data into a bronze lakehouse then use notebooks to cleanse, transform etc and move it to silver or gold lakehouse.  All lakehouses of course are within fabric itself.  Then once you have your gold tables you can create a semantic model and then build power bi off of it. Conplete end to end solution !

You can schedule the pipeline and chain pipelines and notebooks within pipelines to orchestrate the entire flow.
- **Temporary_You5983** (1↑): If you are into ecommerce space , i would recommend you to try [saras daton](https://www.sarasanalytics.com/saras-daton)
- **Classic-Sherbert3244** (1↑): We use Coupler IO because it’s easy to set up and it sends fresh data to our analytics every day. As far as I know, it works for more complicated workflows as well. Another one I've heard works well is Hevo data.
- **drc1728** (1↑): For integrating diverse data sources, the key is choosing a tool that handles incremental updates, schema evolution, and fault tolerance robustly. Platforms like Airbyte, Fivetran, and DLT can handle APIs, databases, and SaaS apps, but selection depends on flexibility versus managed simplicity.

Frameworks like CoAgent (coa.dev) complement any pipeline by providing structured evaluation, monitoring, and observability. This ensures that incremental syncs run reliably, schema changes are tracked, and data quality issues are detected early before they propagate downstream.
