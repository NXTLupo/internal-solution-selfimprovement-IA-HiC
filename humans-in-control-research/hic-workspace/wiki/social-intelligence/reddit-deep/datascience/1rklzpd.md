---
id: social-intelligence/reddit-deep/datascience/1rklzpd.md
url: "https://www.reddit.com/r/datascience/comments/1rklzpd/project_perpetualbooster_v194_a_gbm_that_skips/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "[Project] PerpetualBooster v1.9.4 - a GBM that skips the hyperparameter tuning step entirely. Now with drift detection, prediction intervals, and causal inference built in."
author: "mutlu_simsek"
date: "2026-03-04T13:52:54.000Z"
score: 62
upvote_ratio: 0.98
num_comments: 22
flair: "Projects"
extracted_at: "2026-06-11T18:58:19.179Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1rklzpd.md#c0"
    char_span: [0, 2118]
    sentence_count: 11
    key_terms: [perpetualbooster, tuning, intervals, hyperparameter, datascience, prediction, drift, model]
    concepts: [perpetualbooster, hyperparameter, intervals, tuning, datascience]
    token_count: 494
    sources: [{"n":"reddit-deep: r/datascience","u":"https://www.reddit.com/r/datascience/comments/1rklzpd/project_perpetualbooster_v194_a_gbm_that_skips/"}]
  - id: "social-intelligence/reddit-deep/datascience/1rklzpd.md#c1"
    char_span: [2120, 3223]
    sentence_count: 2
    key_terms: [retraining, perpetual, github, perpetual-ml, need, production, without, xgboost]
    concepts: [retraining, perpetual, perpetual-ml, github, production]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1rklzpd.md#c4"]
    token_count: 267
  - id: "social-intelligence/reddit-deep/datascience/1rklzpd.md#c2"
    char_span: [3237, 4236]
    sentence_count: 10
    key_terms: [dml, gbm, predictive, perpetual, causal, econml, doing, model]
    concepts: [predictive, perpetual, causal, econml, doing]
    section: Comments
    token_count: 252
  - id: "social-intelligence/reddit-deep/datascience/1rklzpd.md#c3"
    char_span: [4238, 6444]
    sentence_count: 16
    key_terms: [training, drift, budget, dml, test, similar, tuning, using]
    concepts: [training, drift, budget, similar, tuning]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/datascience/1rklzpd.md#c4"
    char_span: [6236, 8227]
    sentence_count: 16
    key_terms: [production, how-perpetual-works, drift, perpetual-ml, forecasting, blog, time, statistic]
    concepts: [how-perpetual-works, production, drift, perpetual-ml, forecasting]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1rklzpd.md#c1"]
    section: Comments
    token_count: 494
---
# [Project] PerpetualBooster v1.9.4 - a GBM that skips the hyperparameter tuning step entirely. Now with drift detection, prediction intervals, and causal inference built in.

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1rklzpd/project_perpetualbooster_v194_a_gbm_that_skips/)
Posted by **mutlu_simsek** · **62↑** · **22 comments**

Hey r/datascience,

If you've ever spent an afternoon watching Optuna churn through 100 LightGBM trials only to realize you need to re-run everything after fixing a feature, this is the tool I wish I had.

**Perpetual** is a gradient boosting machine (Rust core, Python/R bindings) that replaces hyperparameter tuning with a single `budget` parameter. You set it, train once, and the model generalizes itself internally. No grid search, no early stopping tuning, no validation set ceremony.

```python
from perpetual import PerpetualBooster

model = PerpetualBooster(objective="SquaredLoss", budget=1.0)
model.fit(X, y)
```

On benchmarks it matches Optuna + LightGBM (100 trials) accuracy with up to **405x wall-time speedup** because you're doing one run instead of a hundred. It also outperformed AutoGluon (best quality preset) on **18/20 OpenML tasks** while using less memory.

**What's actually useful in practice (v1.9.4):**

**Prediction intervals, not just point estimates** - `predict_intervals()` gives you calibrated intervals via conformal prediction (CQR). Train, calibrate on a holdout, get intervals at any confidence level. Also `predict_sets()` for classification and `predict_distribution()` for full distributional predictions.

**Drift monitoring without ground truth** - detects data drift and concept drift using the tree structure. You don't need labels to know your model is going stale. Useful for anything in production where feedback loops are slow.

**Causal inference built in** - Double Machine Learning, meta-learners (S/T/X), uplift modeling, instrumental variables, policy learning. If you've ever stitched together EconML + LightGBM + a tuning loop, this does it in one package with zero hyperparameter tuning.

**19 objectives** - covers regression (Squared, Huber, Quantile, Poisson, Gamma, Tweedie, MAPE, ...), classification (LogLoss, Brier, Hinge), ranking (ListNet), and custom loss functions.

**Production stuff** - export to XGBoost/ONNX, zero-copy Polars support, native categoricals (no one-hot), missing value handling, monotonic constraints, continual learning (O(n) retraining), scikit-learn compatible API.

**Where I'd actually use it over XGBoost/LightGBM:**

- Training hundreds of models (per-SKU forecasting, per-region, etc.) where tuning each one isn't feasible
- When you need intervals/calibration without retraining. No need to bolt on another library
- Production monitoring - drift detection without retraining in the same package as the model
- Causal inference workflows where you want the GBM and the estimator to be the same thing
- Prototyping - go from data to trained model in 3 lines, decide later if you need more control

```
pip install perpetual
```

GitHub: https://github.com/perpetual-ml/perpetual

Docs: https://perpetual-ml.github.io/perpetual

Happy to answer questions.

## Comments

- **1234okie1234** (6↑): How is econML (DML) works with a GBM model? I dont get it? Either you do the predictive part with gbm, but in theory its still a dml model , or you dont. Is that what this is offering? Hyperparameter tuning automatically for the prediction models within dml?
  - **Potential_Soup_4272** (1↑): yep that's it
  - **mutlu_simsek** (-2↑): Unlike just passing a GBM into EconML, Perpetual actually builds DML *natively* right into its own gradient booster.

Here is what it's doing under the hood. Perpetual uses its GBM to predict both the outcome and the treatment based on your other features. It finds the errors (residuals) from those predictions to strip away the biased background noise. It then trains a *third* GBM using a special custom DML math objective to find the true, pure causal effect.

So yes, the GBM is doing all the actual predictive heavy lifting, while the DML framework just orchestrates the math so you get a causal answer instead of just a correlation.

And regarding your question about **hyperparameter tuning: YES!** That is exactly the perk here. Because Perpetual uses "self-generalizing" gradient boosting under the hood, it adapts automatically. You don't have to waste time running grid search or manual tuning for the prediction models inside the DML, it just handles it out of the box.
    - **Great_Purpose7024** (2↑): The DML methodology here seems correct, but "you get a causal answer instead of just a correlation" is wrong. DML is just a more sample efficient method using neyman orthogonality for treatment effect estimation, but using DML does not by itself help you satisfy the standard causal inference assumptions including exchangeability.
- **Khaaaaaaan_** (3↑): Sounds interesting. Will have a look at the docs. Can you say anything on the drift part? Cheers
  - **mutlu_simsek** (3↑): Concept drift and data drift are calculated using internal node stats. The model structure keeps training stats and when calculate\_drift is called with test data, the drift between training and test is calculated. This is basically a chi2 statistic between training and test sets. You can periodically call this drift calculation and re-train or use continual training when drift statistic exceeds a certain threshold. Recommended thresholds are given in docs and tutorials.
    - **Khaaaaaaan_** (2↑): Cool thanks for the reply, will check it out
- **calimovetips** (3↑): speedup claims like 405x are only meaningful if the comparison fixes the same feature set and eval protocol, otherwise it’s apples to oranges, but i like the “one budget knob” idea for teams training lots of similar models. how are you preventing the budget parameter from acting like hidden regularization that needs tuning per dataset anyway, do you have guidance for picking it beyond “try 0.5, 1.0, 2.0”?
  - **mutlu_simsek** (1↑): Benchmark scripts are in the examples folder. Test set and training set are the same and run times are compared at the same accuracy. Budget is similar to learning rate. It behaves similar independent of dataset. During experiments, 0.5 budget can be used. For production, 1.0, 1.5, 2.0 can be tried.
- **Alarmed_Poetry_502** (2↑): Exciting! Are there any published papers and lectures (e.g. youtube or other platforms)  explaining this package?
  - **mutlu_simsek** (2↑): We are working on the paper to publish in JMLR. We have a blog post that explains the algorithm: [https://perpetual-ml.com/blog/how-perpetual-works](https://perpetual-ml.com/blog/how-perpetual-works)
- **Visual_Music_4833** (2↑): The drift detection without ground truth is underrated , and prolly that's usually the hard part in production. How does it handle gradual drift vs sudden distribution shifts?
  - **mutlu_simsek** (1↑): It basically calculates chi2 statistic by comparing training and test sets. It will handle gradual drift correctly, but for sudden shift, test data size should be enough. For example, one row with very high drift will have a low statistic because it might be an anomaly and next rows could be just fine.
- **tittywitch1** (2↑): Do you think this is feasible to use for electricity consumption/production forecasting using exogenous variables and time encodings?
  - **mutlu_simsek** (2↑): Yes, it can be used for forecasting. The only thing is that time series data should be made stationary. There is an example in the repo.
- **latent_threader** (2↑): Seems pretty slick for reducing processing time. Make sure you don’t lose accuracy on those edge cases though. Velocity is wonderful in operations, but one incorrect prediction can cause an avalanche for your agents.
- **TowerOutrageous5939** (2↑): Everything has been pure GenAI/agentic workflows lately but actually have a new system where I specified two needs for traditional ML. Feels like 2022 again. I’ll give this a try
- **Famous_Reading7137** (-4↑): our destiny is there is  not the desease and not an evil world..
  - **mutlu_simsek** (1↑): I feel you.
