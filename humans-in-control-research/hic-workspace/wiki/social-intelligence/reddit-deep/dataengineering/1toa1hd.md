---
id: social-intelligence/reddit-deep/dataengineering/1toa1hd.md
url: "https://www.reddit.com/r/dataengineering/comments/1toa1hd/suggest_aws_etl_tools/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Suggest AWS ETL tools"
author: "dink-mimer7"
date: "2026-05-26T15:17:55.000Z"
score: 26
upvote_ratio: 0.96
num_comments: 21
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.214Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1toa1hd.md#c0"
    char_span: [0, 682]
    sentence_count: 9
    key_terms: [aws, dataengineering, glue, comments, external, ingest, source, tools]
    token_count: 166
  - id: "social-intelligence/reddit-deep/dataengineering/1toa1hd.md#c1"
    char_span: [697, 2287]
    sentence_count: 12
    key_terms: [api, airflow, aws, here, jobs, external, cluster, compute]
    section: Comments
    token_count: 409
  - id: "social-intelligence/reddit-deep/dataengineering/1toa1hd.md#c2"
    char_span: [2289, 3749]
    sentence_count: 8
    key_terms: [glue, salesforce, use, jobs, zendesk, python, specifically, incremental]
    section: Comments
    token_count: 346
---
# Suggest AWS ETL tools

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1toa1hd/suggest_aws_etl_tools/)
Posted by **dink-mimer7** · **26↑** · **21 comments**

We are migrating a client's data stack to AWS (S3 and Redshift). Our initial architecture used AWS Glue for all the ETL pipelines. Good for internal database replication but using Glue to ingest external data (Salesforce, Zendesk) is problematic.

We don't want to keep writing PySpark scripts just to handle basic incremental API syncs. This is also increasing Glue DPU costs. Better to go with external ingest. What AWS tools should be try out? Any open source ones? What else?

## Comments

- **StubYourToeAt2am** (9↑): There is a architectural mismatch here. AWS glue runs on Spark. Salesforce or Zendesk are fundamentally single threaded bottlenecks plagued by strict limits, cursor based pagination, etc.  Forcing a distributed Spark cluster to ingest a REST API is an anti.pattern. dlt and Airbyte will let you off Pyspark immediately. Both are opensource. You would still be on the hook for hosting the infra and debugging any failure with API. If you don't want to do that, Integrate Etl, Fivetran, Stitch are good options.
- **Atmosck** (10↑): For external ingest jobs we use python scripts running in containers with Fargate. It's great for things that are mainly I/O that don't need much compute, like querying an external API and dumping the result to S3.
  - **maxbranor** (1↑): Same here

We keep one task per api / endpoint in the same cluster.

super cheap, super easy to set up - recommend op to try it out :)
    - **the_travelo_** (1↑): Yup this is the way
- **LtLfTp12** (2↑): Would something like AppFlow help here?
- **Competitive_Side_482** (2↑): Try dltHub. Simple but powerful. You can run it in AWS Batch Jobs
- **GreenWoodDragon** (2↑): I hated Glue when I used it, impossible to use without adding more AWS tools and costs.

The last best stack I built was dbt + Meltano on Airflow.

My usual preference is to stay cloud agnostic and avoid vendor lock-in.
- **Ra-mega-bbit** (3↑): Dockerized Airflow on ec2: $10 bucks a month
Then add EKS/ECS for heavy jobs as needed, the same airflow delegate heavy compute as needed and handles the orquestration and IO

Dont use MWAA, thats extremelly overpriced for what it is, use a rds postgres for airflow if you need better controll.
- **Master-Ad-5153** (1↑): Can you just rewrite your individual scripts to use a common set of functions, and loop through each API pull to merge sources to targets?
- **wolf-f1** (1↑): Salesforce and zendesk are both supported by glue zero ETL if that’s an option, zero ETL jobs are better optimized and not your headache
- **add21213** (1↑): Instead of glue spark jobs you can use glue python shell jobs which are less expensive than glue spark jobs (0,0625 DPU)
  - **the_travelo_** (2↑): I would stay way from Glue python. Hasn't been updated in years and has a very old Python version. Go ECS or even lambda if runtime fits
- **AmbitionEuphoric5600** (1↑): For Salesforce and Zendesk specifically the problem with Glue is exactly what you described, it was never really designed for API based incremental syncs. The DPU costs add up fast for what is essentially just cursor based pagination. If you want to stay closer to AWS, AppFlow is worth a look for Salesforce specifically. It is native, cheaper than Glue for this use case, and requires zero custom code. If the client is open to a broader platform, Domo has native connectors for both Salesforce and Zendesk and handles the incremental sync logic out of the box. Less relevant if they are fully committed to the AWS stack but worth mentioning if the BI layer is still undecided.
