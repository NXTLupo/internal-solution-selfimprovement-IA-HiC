---
id: social-intelligence/reddit-deep/shopify/1skrack.md
url: "https://www.reddit.com/r/shopify/comments/1skrack/policy_issues_with_app_review/"
kind: "social-post"
source: "reddit-deep: r/shopify"
subreddit: "shopify"
title: "Policy issues with app review"
author: "Acceptable-Track849"
date: "2026-04-13T23:10:54.000Z"
score: 1
upvote_ratio: 0.6
num_comments: 0
flair: "Apps"
extracted_at: "2026-06-24T22:14:23.473Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/shopify/1skrack.md#c0"
    char_span: [0, 1153]
    sentence_count: 4
    key_terms: [shopify, checkout, cbonpzf0jmvpbs9jlehbgkhjr41hq1tglx9qd4tqkuldum, through, app, comments, acceptable-track849, https]
    concepts: [shopify, checkout, through, comments, https]
    token_count: 446
    sources: [{"n":"reddit-deep: r/shopify","u":"https://www.reddit.com/r/shopify/comments/1skrack/policy_issues_with_app_review/"}]
  - id: "social-intelligence/reddit-deep/shopify/1skrack.md#c1"
    char_span: [1155, 1798]
    sentence_count: 6
    key_terms: [apps, app, cod, form, custom, live, prohibited, behaviour]
    concepts: [custom]
    token_count: 142
---
# Policy issues with app review

Source: [reddit-deep: r/shopify](https://www.reddit.com/r/shopify/comments/1skrack/policy_issues_with_app_review/)
Posted by **Acceptable-Track849** · **1↑** · **0 comments**

Hi,

  
I recently got my app reviews but I got this:  
**"**[**1.1.2. Use Shopify checkout**](https://mail.shopifysvc.com/_t/c/v3/AACJkr219bjAYj1VQPFSB7ty5YPR8XtVb_mD4ctYLKM4HRmY0H6x19eNJzG8GFZnqo_yvf-yiMcOxSKvqArTu2FI_eIraYACrQOt1jrNI16HtSTBbES790Y9SWnSilpE25Fhvt5tQFeahFfiwnexaIfvc4EGfEX8lw3MbgjaO6ig3uCzPmeIvh6v4vGUtfEudnvRIlQJVBBrbcNzp_RRJye40vBhtAhXyoU45IFrIOVV5fMtKSjvmpWY7UBUdCgcAbvfTkEN1YLsKqOG86sqgAT6FHtSqE9tloGOb4qkJ22Efm8xzRTQbGA9BXrALkr7iDw0B29Le36wUKlsCqEM4-cBonPZF0JmVpbs9JLehbGKHJr41Hq1tglX9qD4TqkulduM)**. Shopify can't guarantee the safety or security of an order that's been placed through an offsite or third party checkout. Apps that bypass checkout or payment processing, or register any transactions through the Shopify API in connection with such activity, are prohibited.**  
  
**The app widget cannot collect personal customer data (PCD) and any PCD information needs to be collected through the Shopify checkout.**"

I have a custom pop up checkout in my app. Its a COD form which basically many apps have one example is Releasit COD Form & Upsells. There are 100s of apps like this, but they are live in the app store without any problems. This suggests to me that you have to remove this feature at first when your app is reviewed and then add it later to bypass the review. All of the apps that I checked have a custom form which collects your COD details and completes the order through the API and send you to the thank you page which as per Shopify's policy is prohibited, but somehow 100s of apps are live with exactly this behaviour. This is so funny.
