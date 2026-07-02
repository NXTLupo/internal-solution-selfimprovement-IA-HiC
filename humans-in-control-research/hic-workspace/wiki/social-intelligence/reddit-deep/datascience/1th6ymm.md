---
id: social-intelligence/reddit-deep/datascience/1th6ymm.md
url: "https://www.reddit.com/r/datascience/comments/1th6ymm/ideas_on_a_forecasting_problem/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "Ideas on a Forecasting Problem"
author: "Standard-Broccoli130"
date: "2026-05-19T00:42:26.000Z"
score: 28
upvote_ratio: 0.85
num_comments: 17
flair: "Projects"
extracted_at: "2026-06-11T18:58:19.179Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1th6ymm.md#c0"
    char_span: [0, 2197]
    sentence_count: 15
    key_terms: [day, hour, oos, demand, search, store, festive, item]
    concepts: [demand, search, store, festive, festival]
    token_count: 512
    sources: [{"n":"reddit-deep: r/datascience","u":"https://www.reddit.com/r/datascience/comments/1th6ymm/ideas_on_a_forecasting_problem/"}]
  - id: "social-intelligence/reddit-deep/datascience/1th6ymm.md#c1"
    char_span: [2199, 2937]
    sentence_count: 4
    key_terms: [distance, temporal, search, volume, sales, lost, high-volatility, distance-based]
    concepts: [distance, temporal, search, volume, sales]
    token_count: 137
  - id: "social-intelligence/reddit-deep/datascience/1th6ymm.md#c2"
    char_span: [2951, 4503]
    sentence_count: 7
    key_terms: [sales, total, rate, chilledroland, necessarily, features, question, include]
    concepts: [sales, total, chilledroland, necessarily, features]
    section: Comments
    token_count: 349
  - id: "social-intelligence/reddit-deep/datascience/1th6ymm.md#c3"
    char_span: [4505, 5527]
    sentence_count: 13
    key_terms: [quantiles, better, model, use, approaches, boosting, gradient, training]
    concepts: [quantiles, better, approaches, model, boosting]
    section: Comments
    token_count: 203
  - id: "social-intelligence/reddit-deep/datascience/1th6ymm.md#c4"
    char_span: [5529, 7331]
    sentence_count: 12
    key_terms: [stock, language, products, embeddings, hour, features, natural, model]
    concepts: [language, products, stock, embeddings, features]
    section: Comments
    token_count: 375
  - id: "social-intelligence/reddit-deep/datascience/1th6ymm.md#c5"
    char_span: [7333, 7909]
    sentence_count: 4
    key_terms: [conversion, day, rate, encoding, festival, standard-broccoli130, stock, hour]
    concepts: [conversion, encoding, festival, stock]
    section: Comments
    token_count: 141
---
# Ideas on a Forecasting Problem

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1th6ymm/ideas_on_a_forecasting_problem/)
Posted by **Standard-Broccoli130** · **28↑** · **17 comments**

&#x200B;

 Hi everyone,

 I'm working on a retail/e-commerce forecasting project where we need to predict synthetic demand (actual sales + lost sales due to stockouts) during peak festival times.

 

 We are trying to calculate the lost demand when an item goes Out of Stock (OOS), but the extreme volatility of the short festive window is making standard historical imputation impossible.

 The Data We Have:

 Periods: Last Year BAU, Last Year Festive, Current Year BAU.

 Constraint: The BAU and Festive periods we are looking at are only 7 days long each.

 Sales Data: Store + SKU level across all these periods.

  OOS Records: Flagged at the Hour + Day + Store + SKU level.

 Search Data: Search sessions at the day + hour + store level in which the specific SKU (or its parent L3 category) was present/impressed.

 Features available: store, sku, day, hour, store\\\_cluster, category, subcategory, l3\\\_category, city.

 The Core Problem:

 Because the festive period is only 7 days, every single day and hour has a completely different demand profile. For example, the conversion rate for an item on "Festival Day minus 1 at 8 PM" is drastically different from "Festival Day at 8 PM" or even 2 PM on the same day. Because of this intra-day and day-to-day volatility, we can't just take a simple historical average of the previous day or week to impute demand when an item is OOS.

 Our Current Idea:

 Since we still capture search sessions when an item is OOS, we want to use search volume as our proxy for raw demand. To convert those searches into "lost units," we need to predict a highly contextual Search-to-Sale Conversion Rate (CVR).

 When a Store-SKU is OOS at a specific day/hour, we want to find its "Nearest Neighbors" based on the categorical and temporal features mentioned above, and do a distance-weighted average of their In-Stock search-to-sale CVRs. We then multiply this imputed CVR by the actual search sessions observed during that OOS hour.

 My Questions for the Experts:

 What is the best metric to quantify the relationship/distance between these heavily categorical and temporal combinations? (e.g., Target encoding + Euclidean distance? Random Forest proximity matrix?)

 How would you handle the cyclical/temporal features (day, hour) alongside the search session volume so the model understands the specific urgency of a festive timeline without suffering from massive data sparsity?

 Is there a completely different architecture (like LightGBM directly predicting lost sales using search volume as a feature) you would recommend over this KNN/distance-based CVR imputation?

 Would love to hear how you've tackled similar short-term, high-volatility lost sales problems.

## Comments

- **ChilledRoland** (14↑): >"Is there a completely different architecture…"

If you only need the total loss – not necessarily the rate of loss – I'd suggest fitting a curve to the cumulative sales vs. sales times (skipping over periods where the store is closed) and just subtract the value at the end of the period from the total actual sales.
  - **big_data_mike** (3↑): I would take that and turn it into a Bayesian hierarchical model
  - **Standard-Broccoli130** (3↑): issue is every day x hour behaves differently. So can't impute the overall conv rate of the store to when it was out of stock
    - **ChilledRoland** (1↑): It wouldn't necessarily be a straight line, or even a monotonic curve (you could include periodic components as appropriate); the point is that the rate is a noisier target than the running total and – so long as it doesn't make a difference for the question at hand exactly when the lost sale would have occurred – over & under predictions will offset each other.

ETA: if the running total *of sales* is smooth enough, conversion rate is not needed to answer the question (AIUI).
- **InfamousTrouble7993** (9↑): Yes, euclidean distance is good for quantifying relationships between categorical and temporal combinations, for now.

Treat the time encodings like day, month etc. as discrete numerical features Xgboost can handle that with ease. Else using dummy variables would be very sparse. You can include "holiday" features that basically are binary indicators. In this way you can also put emphasis on certain dates.

Yes, LightGBM or Xgboost ist great for predicting is great. The winning approaches in the Walmart m5 competition all used gradient boosting. Most tabular forecasting top performing approaches use gradient boosting. But you can also use a Mixture-of-Experts network and model classical trend, seasonality and exogeneity. The good thing is, that you can predict quantiles for uncertainty quantification. But they are often miscallibrated. The point forecast is then more accurate. What is better, is to use the negative binomial likelihood as a loss function to predict actually a probabilistic parameter like DeepAR and then perform Monte Carlo simulations to gain quantiles. The quantiles are better calibrated then. See if you can build a global model if you have enough training data if the "short" time series behave similar like the longer time series. The model is then able to generalize well. Else I would stick with DeepAR or any local auto regressive network. Which only performs better for limited training data.

See if you can derive natural language embeddings using a semantic similarity language model to derive embeddings of the product names if possible. That also helps for a global model.
  - **InfamousTrouble7993** (3↑): Oh yes, both architectures (Xgboost and mixture of experts), with using natural language embeddings and product id in best case will be able to predict the right scale of sales values. And addionally: global models will be more robust and local models can be more accurate for single time series, especially with little/spiky data, but also can fail drastically.
    - **Standard-Broccoli130** (2↑): Also thought in the range of natural language embedding. Basically training a neural network should suffice
- **moss-nogg** (1↑): Your dataset construction probably matters a ton. If demand varies by festival hour and day combination, I think it’d be helpful to start with which hour things typically go Out of Stock across products. Then, for products that don’t go Out of Stock, what does the sales curve look like for those products past the hour/festival day things typically do go out of stock. You could potentially impute these values for your Out of Stock products. Sounds like inference time isn’t a problem so you can fit a tree based model or more powerful algorithm that will learn the relationships between your features.
- **latent_threader** (1↑): I’d probably skip the KNN approach honestly. With only 7 festive days, the sparsity and volatility will make neighbor quality pretty unstable.

This feels more like a hierarchical probabilistic modeling problem. I’d try LightGBM/CatBoost directly on units sold with search volume, hour/day cyclical features, stock status, and category hierarchy features. Then predict “counterfactual in-stock demand” during OOS periods.

For the temporal issue, encoding relative festival position helped a lot in a similar problem I worked on. Stuff like D-3 vs D-1 mattered way more than raw weekday/hour. Hourly sine/cosine encoding also helps smooth the transitions a bit.
- **joulebit** (-1↑): Conversion rate for a period when it is in stock multiplied by the product views when it is out of stock = lost sales due to sold out
  - **Standard-Broccoli130** (2↑): but every day and hour is different. We can't take the conversion rate of festival -1 day 8pm and use that same conversion rate on festive day 4pm
