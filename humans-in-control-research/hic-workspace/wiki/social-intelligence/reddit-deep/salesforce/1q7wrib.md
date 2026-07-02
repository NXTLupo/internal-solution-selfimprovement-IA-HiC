---
id: social-intelligence/reddit-deep/salesforce/1q7wrib.md
url: "https://www.reddit.com/r/salesforce/comments/1q7wrib/ai_use_cases_in_sales_cloud/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "AI use cases in Sales Cloud"
author: "Efficient-Excuse4710"
date: "2026-01-09T03:02:44.000Z"
score: 7
upvote_ratio: 1
num_comments: 8
flair: "admin"
extracted_at: "2026-06-25T15:21:44.739Z"
extraction_method: "praw-deep"
research_goal: "Identify how peer large private universities without medical schools are implementing AI across advancement workflows—including fundraising, alumni relations, and donor communications—to define our own adoption roadmap that balances ethical guardrails, staff readiness, and ROI."
engagement: "identify-how-peer-large-private-universities-without-medical"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1q7wrib.md#c0"
    char_span: [0, 519]
    sentence_count: 3
    key_terms: [use, salesforce, comments, sellers, efficient-excuse4710, cloud, sales, opportunities]
    concepts: [salesforce, comments, sellers, cloud, sales]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1q7wrib.md#c2"]
    token_count: 126
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1q7wrib/ai_use_cases_in_sales_cloud/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1q7wrib.md#c1"
    char_span: [533, 2662]
    sentence_count: 16
    key_terms: [salesforce, use, process, data, get, work, marketing, artificial-intelligence]
    concepts: [salesforce, process, marketing, because, clients]
    section: Comments
    token_count: 471
  - id: "social-intelligence/reddit-deep/salesforce/1q7wrib.md#c2"
    char_span: [2665, 3606]
    sentence_count: 5
    key_terms: [sales, agentforce, licenses, feeling-raspberry837, used-comfortable-726, admin, cloud, opp]
    concepts: [sales, agentforce, licenses, admin, cloud]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1q7wrib.md#c0"]
    section: Comments
    token_count: 222
---
# AI use cases in Sales Cloud

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1q7wrib/ai_use_cases_in_sales_cloud/)
Posted by **Efficient-Excuse4710** · **7↑** · **8 comments**

We went live with Sales Cloud a couple of years ago and we use Accounts, Contacts, Opportunities and Activities extensively to track log a calls by sellers, custom objects to support business needs. A part from EAC we dont use any of Einstein capabilities. How can I include AI in everyday life for sellers.

## Comments

- **Suspicious-Nerve-487** (8↑): https://www.salesforce.com/artificial-intelligence/use-cases/?page=1&filters=753aac49-64c1-42ed-b92c-40aa56f8ff03

Honestly just go to trailhead or read through documentation. AI is infused in every part of Salesforce products, especially Sales

With that being said, I wouldn’t attempt to sit there and just slap AI into things. You need to talk to your users and understand what their pain points are, then solve from there. Don’t just try to toss AI into your workflows because that’s how people get sick of Salesforce and complain that it doesn’t work for them because there isn’t value.
- **Interesting_Button60** (4↑): Start with process and strategy, then see if AI is the solution. 

Don't start with AI as a concept, then look for a problem. 

When you only have a hammer, everything becomes a nail.
- **Reddit_Account__c** (1↑): There’s a lot of doom and gloom on this subreddit from people who are heavily against AI. There’s definitely a middle ground though! I would advise you to be skeptical of a lot of the marketing and focus on use cases that really make sense and deliver ROI.

Here are some ones that my clients have adopted or explored that I think are worthwhile:
- Conversational Marketing - Some of my clients use Qualified on their website and Salesforce announced they’re acquiring them. This is a non-controversial use case to me.
- Automation - I have done some work with triggered flows + prompt templates to parse data. Things like lead grading or determining sub-industry for accounts. I would look at your process and see if there’s a pain point you could solve with an intern doing manual work. Then write a prompt and add it to your process with a flow.
- We are exploring some of the new pipeline management features. This is kind of a newer feature but it lets AI suggest fields on opportunities that are out of date or need to be populated. We are trying this out by grabbing data from emails and the Gong managed package to inform these updates. This use case is pretty logical to me - you get a human being validating the input and you also get better data.


Here’s the sales use case I’m not convinced by:
- Chatbots - we’ve had some adoption challenges, and the out of the box Agentforce template is okay at best. The clients we have seen successful adopt a task-specific chatbot like for sales operations or to answer questions on behalf of their admin team.
- **Used-Comfortable-726** (1↑): If you don’t see setups for AI, under the Sales section of admin Setup, then ask your assigned Salesforce AE to provision “Foundations” feature licenses (they’re free, $0 licenses) which give you Agentforce and Data Cloud for Sales Cloud
- **Feeling-Raspberry837** (1↑): I'd start smaller. If sellers mostly need quick context before replying or updating an opp, a record-page brief is prob the cleanest AI win. I'm working on DealScope, and it's basically TL;DR + risks + next email draft on the opp/account page. Less flashy than a big agent, but honestly more usable.
- **Equivalent_Company21** (1↑): >
