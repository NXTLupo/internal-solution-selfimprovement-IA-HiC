---
id: social-intelligence/reddit-deep/defi/1rtvm8t.md
url: "https://www.reddit.com/r/defi/comments/1rtvm8t/blockchain_payroll_platform/"
kind: "social-post"
source: "reddit-deep: r/defi"
subreddit: "defi"
title: "Blockchain Payroll Platform"
author: "Equivalent_Passage87"
date: "2026-03-14T21:34:00.000Z"
score: 1
upvote_ratio: 1
num_comments: 3
flair: ":tool: DeFi Tools"
extracted_at: "2026-06-11T15:26:28.605Z"
extraction_method: "praw-deep"
research_goal: "Produce the definitive guide to personal investing in 2026 by analyzing the current state of the fintech and financial industries. Evaluate retail investor behaviors, emerging asset classes, and platform shifts using 2026 market news, industry reports, and social media trends to identify actionable investment strategies and market opportunities."
engagement: "produce-the-definitive-guide-to-personal-investing-in-2026-b"
chunks:
  - id: "social-intelligence/reddit-deep/defi/1rtvm8t.md#c0"
    char_span: [0, 1697]
    sentence_count: 10
    key_terms: [geniepay, https, transaction, wallet, employees, payroll, crypto, github]
    concepts: [geniepay, https, transaction, wallet, employees]
    token_count: 424
    sources: [{"n":"reddit-deep: r/defi","u":"https://www.reddit.com/r/defi/comments/1rtvm8t/blockchain_payroll_platform/"}]
  - id: "social-intelligence/reddit-deep/defi/1rtvm8t.md#c1"
    char_span: [1711, 2353]
    sentence_count: 4
    key_terms: [conversion, different, rates, paid, time, denomination, per-employee, compliance]
    concepts: [conversion, different, rates]
    section: Comments
    token_count: 140
---
# Blockchain Payroll Platform

Source: [reddit-deep: r/defi](https://www.reddit.com/r/defi/comments/1rtvm8t/blockchain_payroll_platform/)
Posted by **Equivalent_Passage87** · **1↑** · **3 comments**

# I built a free crypto payroll platform that pays 800 employees in one transaction: no account, no fees, no BS

International payroll is broken. Traditional services charge 6%+ in fees, take up to 5 days to settle, and every crypto alternative I looked at cost hundreds of dollars a month. I got tired of it, so I built GeniePay.

It's still an MVP, but it works. You connect your wallet, add your team, and pay everyone in one transaction. That's it.

**What it does right now:**

* Pay up to 800 employees or contractors worldwide in a single on-chain transaction
* Supports USDC, USDT, DAI, and ETH across Ethereum, Polygon, Arbitrum, Optimism, and Base
* Bulk-load your entire team from a CSV spreadsheet
* Quick Pay for one-off payments to any wallet address

**What's coming next:**

* Tax compliance : I'm already working with a crypto tax specialist on this
* Invoice generation for employees and contractors
* More chain support

**On privacy:** I don't store anything. No account, no email, no data. Your wallet is your identity and nothing else is needed.

Would love your feedback, features you'd want, bugs you find, things that annoy you about the UI. If it's constructive, I'm all ears.

**If you're just looking to try the app:**

\> Connect your wallet to Sepolia testnet

\> You'll have access to all the features for free

**Site:** [https://www.geniepay.ca](https://www.geniepay.ca)

**Github:** [https://github.com/Gregster31/GeniePay](https://github.com/Gregster31/GeniePay)

## Comments

- **data_viking** (1↑): this is cool. biggest pain point with payroll protocols ive seen is handling different timezones and currencies at the same time. how do you handle the conversion rates if people want to be paid in different tokens or stables?
  - **Equivalent_Passage87** (1↑): Thanks for the feedback! Right now the employer picks a currency (ETH or USDC) and everyone gets paid in that, there's no per-employee denomination yet. The tax doc angle is the main thing I'm focused on for compliance. Conversion rates per recipient is definitely on the roadmap though, probably pulling from a live oracle so amounts lock in at send time.
