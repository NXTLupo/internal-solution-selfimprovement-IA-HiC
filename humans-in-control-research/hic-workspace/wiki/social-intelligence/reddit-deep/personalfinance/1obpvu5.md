---
id: social-intelligence/reddit-deep/personalfinance/1obpvu5.md
url: "https://www.reddit.com/r/personalfinance/comments/1obpvu5/self_hosted_personal_finance_app/"
kind: "social-post"
source: "reddit-deep: r/personalfinance"
subreddit: "personalfinance"
title: "Self hosted personal finance app"
author: "kash80"
date: "2025-10-20T18:40:07.000Z"
score: 7
upvote_ratio: 0.77
num_comments: 28
flair: "Other"
extracted_at: "2026-06-11T15:26:16.547Z"
extraction_method: "praw-deep"
research_goal: "Produce the definitive guide to personal investing in 2026 by analyzing the current state of the fintech and financial industries. Evaluate retail investor behaviors, emerging asset classes, and platform shifts using 2026 market news, industry reports, and social media trends to identify actionable investment strategies and market opportunities."
engagement: "produce-the-definitive-guide-to-personal-investing-in-2026-b"
chunks:
  - id: "social-intelligence/reddit-deep/personalfinance/1obpvu5.md#c0"
    char_span: [0, 706]
    sentence_count: 4
    key_terms: [personalfinance, looking, data, comments, simplifi, migrate, app, apps]
    concepts: [personalfinance, looking, comments, simplifi, migrate]
    token_count: 160
    sources: [{"n":"reddit-deep: r/personalfinance","u":"https://www.reddit.com/r/personalfinance/comments/1obpvu5/self_hosted_personal_finance_app/"}]
  - id: "social-intelligence/reddit-deep/personalfinance/1obpvu5.md#c1"
    char_span: [720, 2093]
    sentence_count: 12
    key_terms: [like, bigcapital, https, github, intuit, transaction, bank, data]
    concepts: [bigcapital, https, github, intuit, transaction]
    section: Comments
    token_count: 319
  - id: "social-intelligence/reddit-deep/personalfinance/1obpvu5.md#c2"
    char_span: [2095, 4090]
    sentence_count: 13
    key_terms: [simplefin, accounts, transactions, firefly, import, kash80, subscription, categories]
    concepts: [simplefin, accounts, transactions, firefly, subscription]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/personalfinance/1obpvu5.md#c3"
    char_span: [3848, 4621]
    sentence_count: 5
    key_terms: [investment, hosted, worth, look, self, recommendations, xxnerdatheartxx, empty-handed]
    concepts: [investment, hosted, worth]
    section: Comments
    token_count: 189
  - id: "social-intelligence/reddit-deep/personalfinance/1obpvu5.md#c4"
    char_span: [4623, 5002]
    sentence_count: 2
    key_terms: [actual, budget, ynab, xxnerdatheartxx, actualbudget, categorizing, automating, incredibly]
    concepts: [actual, budget]
    section: Comments
    token_count: 97
---
# Self hosted personal finance app

Source: [reddit-deep: r/personalfinance](https://www.reddit.com/r/personalfinance/comments/1obpvu5/self_hosted_personal_finance_app/)
Posted by **kash80** · **7↑** · **28 comments**

Searching the sub, I found apps that either mainly work with budgeting or apps that you have to manually import data. I am looking for self-hosted app that can pull data from financial institutions and can give me one view of my finances. I am currently paying for Simplifi membership, but am not happy with certain features. I had to migrate my data from Mint to Simplifi when Mint shutdown, not looking to migrate again to another paid service that doesn't offer what I am looking for.

## Comments

- **bradland** (6↑): Based on my searching in the past, there aren't a lot of good options here. In the US, there is no universally agreed upon protocol for obtaining transaction data from bank APIs. Simplifi is owned by Intuit, and Intuit is big enough that they force their Intuit Data Exchange format upon banks. You and I, as consumers, don't have that kind of leverage. If you ask your bank for transaction data via API, they'll just laugh at you.

There was a brief period where it looked like protocols like OFX were gaining steam, but some large banks have dropped support for it, and are now leaning into third-party solutions like Plaid. The problem is, open source solutions like GnuCash or plain text accounting tools like ledger-cli do not have direct support for Plaid built in. You have to jump through hoops, like using plaid2qif.

All of this adds up to the conclusion that if you want automatic bank sync, you have to pay for a service.

The only truly self-hosted option I was able to find is called [BigCapital](https://bigcapital.app). The [source code is available on GitHub](https://github.com/bigcapitalhq/bigcapital). They also have a [Docker guide](https://docs.bigcapital.app/deployment/docker), which is probably the easiest way to get up and running.
- **dodgerslim** (5↑): Take a look at [Budget Board](https://github.com/teelur/budget-board).

With a subscription to [SimpleFIN](https://www.simplefin.org/) ($1.50/month), Budget Board will sync your transactions and I think give you what you're looking for.
  - **kash80** (2↑): I set this up and got a SimpleFIN subscription as well. When I add additional accounts to SimpleFIN, they don't show up in Budget Board. Is there a delay in syncing?
    - **dodgerslim** (3↑): I think SimpleFIN updates once every 24 hours. I'm not sure if it's the same time each day for all accounts or what.
- **eggplants__** (3↑): Tiller
- **Grownixx** (2↑): Which features are important for you other than the data import? What will make the perfect app for you?
  - **kash80** (2↑): Mainly import functionality and able to assign categories to transactions. If it can support showing some aggregated views, grouping by categories that would be great.
    - **Grownixx** (2↑): Sounds pretty much like features of any finance app. Did you try YNAB?
    - **tamudude** (1↑): Have you considered Quicken Classic?
- **5hiftyy** (1↑): Checkout [Firefly III](https://www.firefly-iii.org/) ? You can link it directly to your bank via SimpleFin, I believe. And you can use the Firefly Importer tool to import files from your banks. I've begun my setup, but haven't linked any accounts yet.
  - **kash80** (1↑): I did install Firefly via docker today, but couldn't find anything that would allow me to connect to my accounts, just add information manually. Will try to investigate further
- **VikesRule** (1↑): I was using NerdWallet for this (similar to you, was using Mint before but needed an alternative) but the past month or so they’ve had issues updating my Vanguard account balance on the site (they say it’s an issue with Plaid). But it could be an option for you.
- **YmFzZTY0dXNlcm5hbWU_** (1↑): I tried for a long time to find something like this, albeit one that focuses more on my investment portfolio than budgeting and daily transactions. Ultimately came up empty-handed and went with Monarch Money instead, which has been solid for me even though I dislike having to pay for it. Still worth it.
- **youroffrs** (1↑): Automatic syncing is hard part with self hosted tools, so most options end up being manual anyway. For investment only, sharetracker is worth a look no subscription, fully self hosted, and your data never leaves your machine. It's more of a spreadsheet replacement than full mint style clone.
- **XxNerdAtHeartxX** (0↑): Did you even look? /r/selfhosted has plenty of threads asking for budget recommendations. 

I personally us [actual budget](https://github.com/actualbudget/actual) since its basically YNAB. Their template system for automating your budget is incredibly powerful
  - **kash80** (1↑): I haven’t checked YNAB yet, but as mentioned in my earlier posts, importing and categorizing is more important than budgeting.
    - **XxNerdAtHeartxX** (2↑): And Actual does both of those
