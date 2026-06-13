---
id: social-intelligence/reddit-deep/bigdata/1pi3g4l.md
url: "https://www.reddit.com/r/bigdata/comments/1pi3g4l/real_time_analytics_on_sensitive_customer_data/"
kind: "social-post"
source: "reddit-deep: r/bigdata"
subreddit: "bigdata"
title: "Real time analytics on sensitive customer data without collecting it centrally, is this technically possible"
author: "Ok_Climate_7210"
date: "2025-12-09T09:46:55.000Z"
score: 7
upvote_ratio: 1
num_comments: 12
flair: ""
extracted_at: "2026-06-11T18:58:27.060Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/bigdata/1pi3g4l.md#c0"
    char_span: [0, 905]
    sentence_count: 4
    key_terms: [analytics, data, real, time, centrally, sensitive, comments, bigdata]
    token_count: 181
  - id: "social-intelligence/reddit-deep/bigdata/1pi3g4l.md#c1"
    char_span: [920, 3166]
    sentence_count: 13
    key_terms: [analytics, local, real-time, latency, privacy, computation, like, execution]
    section: Comments
    token_count: 493
  - id: "social-intelligence/reddit-deep/bigdata/1pi3g4l.md#c2"
    char_span: [3168, 3394]
    sentence_count: 1
    key_terms: [data, time, requirements, specifically, query-able, freshness, database, presence]
    section: Comments
    token_count: 48
---
# Real time analytics on sensitive customer data without collecting it centrally, is this technically possible

Source: [reddit-deep: r/bigdata](https://www.reddit.com/r/bigdata/comments/1pi3g4l/real_time_analytics_on_sensitive_customer_data/)
Posted by **Ok_Climate_7210** · **7↑** · **12 comments**

Working on analytics platform for healthcare providers who want real time insights across all patient data but legally cannot share raw records with each other or store centrally. A traditional approach would be centralized data warehouse but obviously can't do that. Looked at federated learning but that's for model training not analytics, differential privacy requires centralizing first, homomorphic encryption is way too slow for real time.

Is there a practical way to run analytics on distributed sensitive data in real time or do we need to accept this is impossible and scale back requirements?

## Comments

- **SuperSimpSons** (2↑): I think what you're looking for is local inference, basically deploy the model at the point of contact, the local machine carries out inference without transmitting data across the network. Something like Nvidia DGX Spark or its variants (example Gigabyte's AI TOP ATOM www.gigabyte.com/AI-TOP-PC/GIGABYTE-AI-TOP-ATOM?lan=en) might fit the bill, or some of the more powerful workstations of mini-PCs like Intel NUC. So yes I would say it's very much possible, sensitive patient data has always been a problem in healthcare AI and people have come out with solutions for it.
- **dataflow_mapper** (1↑): It is possible, but only with tradeoffs. A practical pattern I’ve seen is push-most-work-to-the-edge: each provider streams local pre-aggregates or feature vectors, apply noise or clipping, then a federated coordinator combines them. For stronger privacy you can use secure multiparty computation for the final aggregation or a trusted execution environment to run short real-time queries, though those add latency and operational complexity. Hybrid approaches also work well: keep raw records local, run near-real-time analytics on de-identified or differentially private aggregates, and reserve MPC/TEE for a small set of high-value queries. If you need true, low-latency row-level analytics across parties you’ll probably have to relax some requirements or accept approximate answers. What’s your latency target and which privacy guarantees are non-negotiable?
- **segsy13bhai** (1↑): we ended up doing local processing at each source and only aggregating results centrally, limits analytics but satisfies legal
- **burbs828** (1↑): Secure multi-party computation or trusted execution environments like AWS Nitro Enclaves could work. 

Real time is tough most privacy methods add latency. You'll probably need to compromise on speed or scope.
- **MikeAtQuest** (1↑): The biggest thing is policy. If you don't have automated tagging for sensitive fields, then 'real-time' just means it's a really efficient leak.

Whatever pipeline you build, it needs to support in-flight masking. The analytics team almost never needs the actual PII to do their job.
- **Responsible_Act4032** (1↑): What do you mean by "real-time"?

Specifically what are the requirements on data freshness (time between a data point being created, and it's presence in a database for it to be query-able", and then the query response time on that data and what scale of data?
