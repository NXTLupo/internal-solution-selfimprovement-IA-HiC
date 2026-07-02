---
id: social-intelligence/reddit-deep/etfs/1qyoj24.md
url: "https://www.reddit.com/r/ETFs/comments/1qyoj24/oc_i_built_a_free_etf_portfolio/"
kind: "social-post"
source: "reddit-deep: r/etfs"
subreddit: "etfs"
title: "[OC] I built a free ETF & Portfolio Backtester/Comparator with dynamic currency conversion and Full Total Return support."
author: "HabitsQuest"
date: "2026-02-07T20:30:54.000Z"
score: 3
upvote_ratio: 1
num_comments: 2
flair: ""
extracted_at: "2026-06-11T15:26:36.783Z"
extraction_method: "praw-deep"
research_goal: "Produce the definitive guide to personal investing in 2026 by analyzing the current state of the fintech and financial industries. Evaluate retail investor behaviors, emerging asset classes, and platform shifts using 2026 market news, industry reports, and social media trends to identify actionable investment strategies and market opportunities."
engagement: "produce-the-definitive-guide-to-personal-investing-in-2026-b"
chunks:
  - id: "social-intelligence/reddit-deep/etfs/1qyoj24.md#c0"
    char_span: [0, 1904]
    sentence_count: 10
    key_terms: [etfs, specific, github, return, https, total, rebalancing, page]
    concepts: [specific, github, return, rebalancing, historical]
    token_count: 461
    sources: [{"n":"reddit-deep: r/etfs","u":"https://www.reddit.com/r/ETFs/comments/1qyoj24/oc_i_built_a_free_etf_portfolio/"}]
  - id: "social-intelligence/reddit-deep/etfs/1qyoj24.md#c1"
    char_span: [1906, 2893]
    sentence_count: 5
    key_terms: [new, rigorously, portfoliovisualizer, coded, going, thats, case, data]
    concepts: [rigorously, coded, going, thats]
    section: Comments
    token_count: 227
---
# [OC] I built a free ETF & Portfolio Backtester/Comparator with dynamic currency conversion and Full Total Return support.

Source: [reddit-deep: r/etfs](https://www.reddit.com/r/ETFs/comments/1qyoj24/oc_i_built_a_free_etf_portfolio/)
Posted by **HabitsQuest** · **3↑** · **2 comments**

Hi everyone,

I wanted to share a tool I’ve been working on to solve a personal frustration: comparing ETFs listed on different exchanges with different currencies (like an S&P 500 in EUR vs. USD) while accounting for dividend reinvestment (Total Return).

It’s a simple Single Page App (hosted via GitHub Pages) that uses a Python backend (yFinance) to generate a local database.

**What it can do:**

* 📊 **Total Return Comparison:** Automatically uses Adjusted Close data to compare Distributing and Accumulating ETFs fairly.
* 💱 **Dynamic FX Engine:** Switch instantly between **EUR, USD, and GBP**. It uses historical exchange rates to convert all prices based on the specific date.
* 📂 **Portfolio Builder:** Create custom baskets of ETFs with specific weights.
* 🔄 **Automatic Rebalancing:** Test strategies with Monthly, Quarterly, or Annual rebalancing.
* 📈 **Institutional Metrics:** It calculates Volatility, Tracking Error, and Cumulative Tracking Difference against a benchmark.
* 🧩 **Holdings & Sector Analysis:** Visual breakdown of what's inside the ETFs.

The backend is a Python script using the **yfinance library** to pull historical prices and fund metadata directly from Yahoo Finance. It ensures the data is fresh and consistent.

**Check it out here:** [https://fabduv.github.io/etf\_comparator/page.html](https://fabduv.github.io/etf_comparator/page.html)  
  
I’d love to get your feedback on:

1. What other risk metrics would you like to see? (Sharpe ratio?)
2. Are there any specific ticker suffixes that aren't working for you?

Hope this helps some of you in your investment research!

https://preview.redd.it/dwdj1juyt4ig1.png?width=2696&format=png&auto=webp&s=195646c82f9b801dfc8482fee45a26d2e7ae6a44

## Comments

- **AICHEngineer** (1↑): The problem with the dime a dozen vibe coded backtesters is in every case they lack comprehensive accurate treatment of edge cases and are going to mislead people if the creator doesnt make disclaimers about this. Would you really recommend that *this* is the platform thats going to accurately, in every case, represent the return series of myriad stocks/funds/assets as well as handle forex? Whats your data provider? If this is new then thats coming out of your own pocket and using the free stuff automatically makes existing sites with data subscriptions a better alternative.

Theres a new reddit post every week about a new backtester with the same style of vibe coded AI graphical elements and attempts at QOL improvements over rigorously constructed far more rigorously tested outfits like portfoliovisualizer or testfolio.
