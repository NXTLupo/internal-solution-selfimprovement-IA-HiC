---
id: social-intelligence/reddit-deep/dataengineering/1m7tozt.md
url: "https://www.reddit.com/r/dataengineering/comments/1m7tozt/what_are_the_biggest_challenges_data_engineers/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "What are the biggest challenges data engineers face when building pipelines on Snowflake?"
author: "toddbeauchene"
date: "2025-07-24T03:26:19.000Z"
score: 6
upvote_ratio: 0.65
num_comments: 5
flair: "Discussion"
extracted_at: "2026-06-29T14:40:47.211Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1m7tozt.md#c0"
    char_span: [0, 646]
    sentence_count: 4
    key_terms: [challenges, snowflake, dataengineering, organizations, building, comments, using, data]
    concepts: [challenges, snowflake, dataengineering, organizations, building]
    token_count: 134
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1m7tozt/what_are_the_biggest_challenges_data_engineers/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1m7tozt.md#c1"
    char_span: [660, 1524]
    sentence_count: 7
    key_terms: [cost, management, snowflake, compute, pretty, crowdgoeswildwoooo, like, greenmobile6323]
    concepts: [management, snowflake, compute, pretty]
    section: Comments
    token_count: 201
---
# What are the biggest challenges data engineers face when building pipelines on Snowflake?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1m7tozt/what_are_the_biggest_challenges_data_engineers/)
Posted by **toddbeauchene** · **6↑** · **5 comments**

I have been using Snowflake for over ten years now and think it solves many of the challenges organizations used to face when building and using a data warehouse. However it does introduce new challenges and definitely requires a different mindset. I want to hear real world challenges that organizations are encountering when implementing Snowflake.

## Comments

- **MsCardeno** (10↑): Cost.
  - **cptncarefree** (1↑): Came to say this.
- **GreenMobile6323** (5↑): In my experience, tuning Snowflake pipelines often means rethinking data layouts. Getting your clustering keys and micro‑partitioning right is critical to avoid scanning terabytes for simple queries.
- **CrowdGoesWildWoooo** (3↑): Definitely cost management. The good thing with snowflake pretty much it just works, but god damn you are really paying for it. Even the smallest compute you are already looking at almost 10x equivalent EC2 instance (not to mention they probably also has deals for compute capacity with cloud providers). 

Just Crazy premium overall
- **jdl6884** (1↑): Cost management is pretty big. Plus designing models that typically rely on constraints like PK’s and FK’s requires some extra thought. But tools like dbt make that much easier.
