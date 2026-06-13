---
id: social-intelligence/reddit-deep/bigdata/1obe0j0.md
url: "https://www.reddit.com/r/bigdata/comments/1obe0j0/lakehouse_architecture_with_spark_and_delta_for/"
kind: "social-post"
source: "reddit-deep: r/bigdata"
subreddit: "bigdata"
title: "Lakehouse architecture with Spark and Delta for multi TB datasets"
author: "FitImportance606"
date: "2025-10-20T07:52:32.000Z"
score: 1
upvote_ratio: 1
num_comments: 0
flair: ""
extracted_at: "2026-06-11T18:58:27.064Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/bigdata/1obe0j0.md#c0"
    char_span: [0, 598]
    sentence_count: 5
    key_terms: [comments, customer, datasets, bigdata, vacuum, delta, spark, fitimportance606]
    token_count: 136
---
# Lakehouse architecture with Spark and Delta for multi TB datasets

Source: [reddit-deep: r/bigdata](https://www.reddit.com/r/bigdata/comments/1obe0j0/lakehouse_architecture_with_spark_and_delta_for/)
Posted by **FitImportance606** · **1↑** · **0 comments**

We had 3TB of customer data and needed fast analytical queries. Decided on Delta Lake on ADLS with Spark SQL for transformations.

Partitioning by customer region and ingestion date saved a ton of scan time. Also learned that vacuum frequency can make or break query performance. Anyone else tune vacuum and compaction on huge datasets?
