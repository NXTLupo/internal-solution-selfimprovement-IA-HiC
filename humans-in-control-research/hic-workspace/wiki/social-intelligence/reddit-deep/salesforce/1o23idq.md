---
id: social-intelligence/reddit-deep/salesforce/1o23idq.md
url: "https://www.reddit.com/r/salesforce/comments/1o23idq/what_are_some_use_cases_for_data_cloud_in_our/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "What are some use cases for Data Cloud in our environment?"
author: "Much-Macaroon3953"
date: "2025-10-09T11:34:57.000Z"
score: 10
upvote_ratio: 0.82
num_comments: 11
flair: "help please"
extracted_at: "2026-06-11T18:58:38.962Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1o23idq.md#c0"
    char_span: [0, 1254]
    sentence_count: 15
    key_terms: [salesforce, use, cloud, data, accounting, management, comments, customer]
    token_count: 271
  - id: "social-intelligence/reddit-deep/salesforce/1o23idq.md#c1"
    char_span: [1269, 2758]
    sentence_count: 10
    key_terms: [data, cloud, customer, much-macaroon3953, using, salesforce, instantly, real-time]
    section: Comments
    token_count: 349
---
# What are some use cases for Data Cloud in our environment?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1o23idq/what_are_some_use_cases_for_data_cloud_in_our/)
Posted by **Much-Macaroon3953** · **10↑** · **11 comments**

We currently use a few primary systems for our business:

1. Salesforce (leads / customer acquisition, sales, operations, project management, customer service).  Salesforce is our system of record of prospects and customers. 

2. ERP - accounting and vendor management (we do not have inventory or products that we sell. This is strictly accounting and moving money) 

3. Marketing cloud - all prospect and client automated comms. Uses MC Connector and sql to handle segmentation. 

4. Telephony system - all inbound and outbound voice. Uses custom integration to define outbound lists. 

We have a few different flavors of data warehousing and BI solutions depending on team.

We use agentic AI technologies but these are external systems and will likely not be using or purchasing agentforce anytime soon. 

What are some core use cases for data cloud in a scenario like this? 

Trying to make sure I’m not missing something totally obvious and valuable.   Thanks in advance for any insights!

## Comments

- **b0jangles** (11↑): If you are using a data lake like Snowflake, you can expose data in Salesforce via Data Cloud without having to copy it over. It’s also free to do this you’re in the same Availability Zone on AWS. This is the most useful way I’ve seen Data Cloud used.
  - **Much-Macaroon3953** (2↑): Ok thanks!
- **DirectionLast2550** (3↑): The biggest win is creating real-time, dynamic segments for Marketing Cloud, instantly unifying customer behavior (Salesforce), financial history (ERP), and call data (Telephony) to move beyond slow SQL refreshes. This unified profile also provides immediate, rich context for your Sales/Service teams, helping them spot high-value accounts or retention risks instantly from ERP insights. Crucially, Data Cloud delivers the perfect, clean data foundation for your existing external agentic AI tools, ensuring they train on a complete, harmonized 360-degree view of every prospect and customer.
  - **s3237410** (2↑): This is correct. In short, Data Cloud will help unify all your customer data into a single, real-time view so you can deliver personalised experiences to your customers. For more information, look into customer data platforms.
- **Arturo90Canada** (0↑): Curious on what you are using for telephony outbound, are you using Genesys ? We had so many issues
  - **Much-Macaroon3953** (1↑): NICE Incontact.  We had to build a custom integration for outbound but all in all it’s pretty solid. Feel free to DM me for some more info
