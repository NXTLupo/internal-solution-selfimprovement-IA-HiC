---
id: social-intelligence/reddit-deep/datascience/1p9rwhf.md
url: "https://www.reddit.com/r/datascience/comments/1p9rwhf/shap_or_lgbm_gain_for_feature_selection/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "Shap or LGBM gain for feature selection?"
author: "Nanirith"
date: "2025-11-29T15:38:50.000Z"
score: 13
upvote_ratio: 0.86
num_comments: 10
flair: "Discussion"
extracted_at: "2026-06-11T18:58:19.181Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1p9rwhf.md#c0"
    char_span: [0, 605]
    sentence_count: 5
    key_terms: [datascience, shap, used, selection, comments, feature, gain, recommendations]
    concepts: [datascience, selection, comments, feature]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1p9rwhf.md#c1"]
    token_count: 139
    sources: [{"n":"reddit-deep: r/datascience","u":"https://www.reddit.com/r/datascience/comments/1p9rwhf/shap_or_lgbm_gain_for_feature_selection/"}]
  - id: "social-intelligence/reddit-deep/datascience/1p9rwhf.md#c1"
    char_span: [619, 2833]
    sentence_count: 14
    key_terms: [features, feature, selection, shap-algorithm-for-feature-selecion, models, dependencies, model, gain]
    concepts: [features, feature, selection, dependencies, models]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1p9rwhf.md#c0", "social-intelligence/reddit-deep/datascience/1p9rwhf.md#c2"]
    section: Comments
    token_count: 499
  - id: "social-intelligence/reddit-deep/datascience/1p9rwhf.md#c2"
    char_span: [2835, 5041]
    sentence_count: 10
    key_terms: [features, importance, different, models, using, selection, variables, data]
    concepts: [features, importance, different, models, selection]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1p9rwhf.md#c1", "social-intelligence/reddit-deep/datascience/1p9rwhf.md#c3"]
    section: Comments
    token_count: 464
  - id: "social-intelligence/reddit-deep/datascience/1p9rwhf.md#c3"
    char_span: [5043, 5840]
    sentence_count: 6
    key_terms: [importance, features, gain, shap, time, perpetualbooster, hyperparameter, interactions]
    concepts: [importance, features]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1p9rwhf.md#c2"]
    section: Comments
    token_count: 177
---
# Shap or LGBM gain for feature selection?

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1p9rwhf/shap_or_lgbm_gain_for_feature_selection/)
Posted by **Nanirith** · **13↑** · **10 comments**

Which one do you use during recursive feature elimination or forward/backward selection? I've always used gain and only used shap for analytics on model predictions, but came across some shap values recommendations.

  
Bonus question: have you used "null importance" / permutation method? Fitting models with shuffled targets to remove features that look predictive by chance

## Comments

- **forbiscuit** (21↑): I stick with VIF (numeric) and Chi-Square (categorical data) + domain knowledge. But in terms of using SHAP for feature selection, there’s a good argument warning against it in this discussion: https://stats.stackexchange.com/questions/621006/shap-algorithm-for-feature-selecion
  - **SmartPercent177** (2↑): Thank you for that information!
- **Linkky** (9↑): If you're using LightGBM why to you need to do recursive feature selection when it already does regularisation and pruning? SHAP and gain fundmentally are very different things but i would not think to use it to select features. Sure they give a slight indication feature importance but you wouldnt know from the surface without looking at partial dependencies across your features and how LGBM dertimined the tree splits.
  - **Nanirith** (6↑): with over 1k features it doesn't make sense for me to generate them and store them all while models life. For a similar problem my strategy in the past has been to first use xgboost gain to cut the least informative features and then to do forward modelling adding feature 1 by 1 and observing performance metrics.

The issue with that is the possibility of not adding features that in combination would improve the model.

Currently im thinking of doing RFE - reducing maybe 5-10% of features at a time with lowest gain (although i've seen shap recommended somewhere, thus the question) until I hit a well balanced dataset of features that performs just as well as the whole set or similarly.
  - **Intrepid_Lecture** (1↑): Feature selection can help with the following

1. Removing data source dependencies  
2. Making the model cheaper/faster to run  
3. Making models easier to debug if something goes wrong. 

There's minimal need for feature selection if the model is a one off or it becomes part of a pretty picture in a power point slide. If it's going into prod then you want to cut as much as you can without going into the bone.
- **Drakkur** (2↑): I have found OMP and GOMP to work well on varying ranges of dataset sizes.

While better than pure forward stepwise, it still tends to under-select features in high-dimensional problems. I tend to prefer parsimonious models.

One thing to note is you should always start with a locked-in base set of features using domaine knowledge or careful analysis (like another poster mentioned) and then run a selection algorithm on top of that.
- **Intrepid_Lecture** (1↑): I use two main approaches for feature selection

1. data source features - I build models using every viable data source and then I drop entire data sources outright and see if model performance is impacted. If a data source doesn't earn its keep, I eliminate the dependency. I usually use lgbm or xgb with defaults.
2. After the above, for propensity models, I generally create an ensemble of "optimal trees" using something akin to evtree (each tree getting around 1/3rd the features passed in) and then rank them and then from the top models pull out the top features which were actually used.

As an FYI, permutation importance, gini importance, etc. all have the issue of they somewhat arbitrarily split the importance of a feature. Also different models (e.g. ExtraTrees vs RF vs XGB/LGBM) will return different importances.

If you define importance as "this is useful for figuring stuff out" you can end up in a situation where you have a ton of variables included in the top 80% by feature importance where most can just be stripped away and you could conceivably land on just a few dozen "good" variables that work well together instead of needing a thousand.

There's similar problems with using lasso and VIF for linear regression. Those are useful in cases where you're trying to do linear modeling but if you start with just one different interaction term you can get radically different features and the features selected don't necessarily map well to non-parametric methods. 

\----

For what it's worth when I'm modeling I generally start with a handful of variables that I WILL be keeping no matter what (think metrics that commonly go into reporting and are cheap to calculate), run a model and everything onward after that is modeling against the residuals.
- **Diligent_Inside6746** (1↑): I use gain first for quick filtering (especially if I have like 100+ features) then SHAP for the final selection and understanding what's actually happening.

Gain is fast and gives you a rough sense of what's predictive, but it misses interaction effects and doesn't tell you direction. SHAP is slower but shows you interactions, whether the effect is positive or negative, and works better with correlated features.

For recursive elimination I usually do gain to drop the bottom 20-30% quickly, then SHAP for the final refinement. Saves a lot of compute time.

I've used null importance a few times when I had way more features than samples or suspected some spurious stuff. It's useful but adds time.
- **mutlu_simsek** (-8↑): I am the author of PerpetualBooster which is a GBM that doesnt need hyperparameter tuning. 

https://github.com/perpetual-ml/perpetual

You can train a model, check feature importance, and remove features with low importance.
