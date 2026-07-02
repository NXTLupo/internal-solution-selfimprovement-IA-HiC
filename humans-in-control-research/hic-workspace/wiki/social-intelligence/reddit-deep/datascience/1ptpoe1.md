---
id: social-intelligence/reddit-deep/datascience/1ptpoe1.md
url: "https://www.reddit.com/r/datascience/comments/1ptpoe1/nonstationary_categorical_data/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "Non-Stationary Categorical Data"
author: "Throwawayforgainz99"
date: "2025-12-23T09:23:22.000Z"
score: 11
upvote_ratio: 0.72
num_comments: 13
flair: "Discussion"
extracted_at: "2026-06-11T18:58:19.180Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c0"
    char_span: [0, 1770]
    sentence_count: 9
    key_terms: [score, item, probability, categorical, datascience, information, day, historical]
    concepts: [score, probability, categorical, datascience, information]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1ptpoe1.md#c1"]
    token_count: 399
    sources: [{"n":"reddit-deep: r/datascience","u":"https://www.reddit.com/r/datascience/comments/1ptpoe1/nonstationary_categorical_data/"}]
  - id: "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c1"
    char_span: [1784, 3474]
    sentence_count: 10
    key_terms: [information, probability, throwawayforgainz99, available, time, feature, outcome, items]
    concepts: [information, probability, throwawayforgainz99, available, feature]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1ptpoe1.md#c0", "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c5"]
    section: Comments
    token_count: 361
  - id: "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c2"
    char_span: [3476, 5746]
    sentence_count: 21
    key_terms: [time, probability, success, features, observations, ranking, change, environmental]
    concepts: [probability, success, observations, features, ranking]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1ptpoe1.md#c3"]
    section: Comments
    token_count: 503
  - id: "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c3"
    char_span: [5749, 8313]
    sentence_count: 17
    key_terms: [observations, probability, compressed, features, patterns, representation, better, predictive]
    concepts: [observations, probability, compressed, features, patterns]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1ptpoe1.md#c2"]
    section: Comments
    token_count: 486
  - id: "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c4"
    char_span: [8315, 8692]
    sentence_count: 3
    key_terms: [models, hierarchical, strategy, autorregresive, constrained, clustering, currently, knowledge]
    concepts: [hierarchical, models, strategy]
    section: Comments
    token_count: 75
  - id: "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c5"
    char_span: [8694, 11034]
    sentence_count: 9
    key_terms: [information, features, day, always, predicting, model, available, item]
    concepts: [information, features, predicting, always, available]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1ptpoe1.md#c1"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c6"
    char_span: [10677, 11384]
    sentence_count: 6
    key_terms: [information, learning, training, known, rank, categoricalset, classification, completeness]
    concepts: [information, learning, training, known]
    section: Comments
    token_count: 130
  - id: "social-intelligence/reddit-deep/datascience/1ptpoe1.md#c7"
    char_span: [11386, 12618]
    sentence_count: 7
    key_terms: [problem, horizon, knowledge, training, bandit, isnt, overcomplicated, autoregressive]
    concepts: [problem, horizon, knowledge, training, bandit]
    section: Comments
    token_count: 252
---
# Non-Stationary Categorical Data

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1ptpoe1/nonstationary_categorical_data/)
Posted by **Throwawayforgainz99** · **11↑** · **13 comments**

Assume features are categorical(i.e. 1 or 0)

The target is binary, but the model outputs a probability, and we use that probability as a continuous score for ranking rather than applying a hard threshold.

Imagine I have a backlog of items(samples) that need to be worked on by a team, and at any given moment I want to rank them by “probability of success”.

Assume historical target variable is “was this item successful”(binary) and 1 million rows historical data.

When an item first appears in the backlog(on Day 0), only partial information is available, so if I score it at that point, it might get a score of 0.6.

Over time(let’s say day 5), additional information about that same item becomes available (metadata is filled in, external inputs arrive, some fields flip from unknown to known). If I were to score the item again later(on day 5), the score might update to 0.7 or 0.8.

The important part is that the model is not trying to predict how the item evolves over time. Each score is meant to answer a static question:

“Given everything we know right now, how should this item be prioritized relative to the others?”

The system periodically re-scores items that haven’t been acted on yet and reorders the queue based on the latest scores.

**I’m trying to reason about what modeling approach makes sense here, and how training/testing should be done so it matches how inference works?**

I can’t seem to find any similar problems online. I’ve looked into things like Online Machine Learning but haven’t found anything that helps.

## Comments

- **seanv507** (20↑): Please just give the real example, your 'abstraction' is probably missing crucial information... precisely because you dont know the right approach

You havent explained when the model is used and when learning is supposed to happen

Eg a feature flips from unknown to measured. When do you get feedback on the correct score for the item...
  - **Throwawayforgainz99** (1↑): Inference happens periodically (e.g. daily) on all items that are still in the queue and haven’t been acted on yet. If new information becomes available for an item, its feature vector changes and the score may update accordingly. Items that are already acted on are removed/frozen.

Each item has one eventual binary outcome, which is only observed after the process completes. The model is not trying to predict how the score should change over time, it’s repeatedly estimating the probability of that same eventual outcome given whatever information is available at the moment of scoring.
  - **Throwawayforgainz99** (-5↑): I’ll try to add some more context. 

Does the model make predictions daily on all samples in the Queue? Even if they were already predicted on yesterday(so prediction is updated if new data is available)?

If so, how do I got about training/testing to reflect this sort of inference ?
- **Optimal_Cow_676** (3↑): So let's try to reformulate :

* Input: Items which have categorical features.
* Output: probability of "success". 

Context: time series: each time interval (day), the feature vector can change and the probability of success must be updated => you are able to observe the final outcome of your predictions after some time.

=> Is this summary correct ?

Questions : 
1) What is the most important: the probability ranking or the probability of success itself ?
2) After how much time intervals do you know the final real labelling (success or not ) ? Does it change for each item ? Are the success conditions the same ? 
3) What type of data do you have at the start ? Do you have a labeled dataset ?
4) Is there a data drift (change of distribution of data over time )? Especially, could there be a concept drift (change of the relationship between input and output over time) ?
5) Similarly to market predictions, are there identified time/markets regimes?
6) Do you need to determine the impact of the features on the final prediction or do you only care about the prediction ?
7) Are you able to use additional environmental features or only the item's own features?
  - **Throwawayforgainz99** (2↑): Appreciate the response. 

Your summary is correct but I would not define this as a time series problem, there is a time dimension to it but not in the classical time series sense. I am not predicting future values of the same entity based on its past values. 

Answers:

1. Ranking is more important than the absolute probability value

2. Yes, it varies per item 

3. Yes, I have full historical outcomes

4. Yes but it is negligible 

5.  No

6. Yes I need feature impact (shap works)

7. Yes I can use environmental features 

Lmk your thoughts, also can take this to the DMs if it’s easier for you.
    - **Optimal_Cow_676** (1↑): I assume that your observations for a given time interval are iid.

Let's start simple and imagine we are only computing for one interval at time 0. You have 1,000,000 items that you want to rank. Estimating the exact probability of success of an observation, one by one, you will get a perfect ranking simply by ranking your observations from greatest to lowest chance of success. If a rank cannot be occupied by two observations at the same time, you should define a tie breaker and that's it. You have a ranking. 
Now, you may want to include additional information when computing the success probability such as missingness if it has any predictive power (MAR, MNAR) or current time if everything starts empty/ the distribution of observations features change in a fixed pattern.


When updating  : A number k observations have changed between the previous time interval and now. You should only reevaluate their probability and rerank them based on it. 
You could also explore if there are any predictive patterns in how the observations features are being updated : rate of changes (how many changes did the feature had and in how much time), momentum , predictive update patterns (if features A and B change together, success becomes very likely/unlikely). This last part can be done crudely without evaluating the initial observations state but would probably gain from learning to evaluate the change conditional to it

As for an exact model, this is where you have to use your data. For probability prediction based on purely categorical, I would try catboost at first. For the probability refinement, you could try anything from a linear model to a neural network. For the time pattern mining, I don't really know your data but there are models such as SPADE. This last point heavily depends on your data. I would recommend to enforce a minimum support or better, mine the top K predictive patterns (otherwise you will be drawing under noise patterns, especially with one million observations). Optimize the algorithm with early pruning or it will take you forever. This will not take into account your initial observation state.
For this part, a better solution could exist, I plan to study those kinds of problems soon 😅


=> In the end, the probability of success becomes a compressed représentation of your observations. The better this compressed representation, the better your ranking. The overall idea is to 1) create a compressed representation at each interval based on the observations inner features 2) refine this compressed representation with overall features (current global state, observations similarity, change patterns). 3) rank using those compressed representations.


=> The probability estimation could either be seen as the end for ranking or you could use stacking and combine the probability estimation output with a meta learner which could try to rank the observations not only on probability of success but also by adding environmental features and potentially clustering information.
- **Key_Strawberry8493** (2↑): You can go in three ways.

Assume all rows independent, use them to train the model. I wouldn't advise that given that you are going to induce bias into the distribution sample. Model wise, all models for tabular data are gonna work, but your sampling strategy is probably gonna induce errors.

Model rows with some sort of autorregresive / mixed effects strategy. One potential option is looking at hierarchical models, clustering at the id for the item. I'd say this is the hard strategy and you are constrained to linear models, and to my knowledge hierarchical models are currently only deployed in R; so Python is not a chance if that is your primary coding language.

Model rows using the last available information for the row (or even, the last available information when you acted upon the row). Even if you have 15 data points per 1 item, the item is the same, and if you are only acting upon it once, or your actions does not change when the information changes, it will make more sense to add just the last available information when you acted upon the item. This way you are avoiding inducing bias by overloading the sample with negative examples. This is the easy strategy, because you can use pretty much all models for tabular data.
- **demonhunter5121** (1↑): I am a novice here, but if I understand this correctly, at the moment you need the probability of success, you recalculate with the present information, just like any other simple binary prediction, that means you cannot reuse anything from the past, you have to start all over with the updated values, so applying any method should be fine as long as you are getting the acceptable result, bcz you can't rely on the past info. so the best model for predicting the past infos should should be the only strategy, the focus shifts from getting the best model to making the prediction as fast as possible given the present info, I Think
- **_hairyberry_** (1↑): As a general strategy, if the “missing information” is always the same and is filled in on the same day (e.g. it’s always the same 10 features which are initially missing, and they always get filled in on day 5) then you could simply train two models. One for predicting on day 0 (without those 10 features) and one for predicting on day 5 (with those those 10 features)
  - **Throwawayforgainz99** (1↑): It’s not always the same tho unfortunately, I guess I could train a model for each day right?
- **aragorn2112** (1↑): Look into survival analysis, from what I understand your problem fits there. Or go Bayesian.
- **thinking_byte** (1↑): This feels closer to a repeated static scoring problem than a true temporal one. Each snapshot is a valid training example as long as you are honest about what was known at that moment. One approach I have seen work is to expand the training data so the same item can appear multiple times at different information states, with features explicitly encoding missing vs known. Then evaluation mirrors deployment by doing time based splits and only scoring items with the information that would have been available then. You are not modeling transitions, just learning how information completeness shifts rank. It might also help to think in terms of learning to rank rather than pure classification, since relative ordering is the real objective.
- **categoricalset** (1↑): Couple things 

- this problem can be entirely specified the way you have done by fixing a time horizon and using it consistently in training and inference. The problem statement becomes “Given everything we know after k days, how should this item be prioritized relative to the others?”. Your estimators then need to not see data past the horizon. Formally this is ok
- you could allow the horizon to vary and add covariates to represent age. This is also ok, but if training examples have different ages there can be issues estimating the dynamics. 
- classically to my knowledge this is not what people mean when they say “non-stationary” which might be why you arent finding anything. Non stationary usually refers to a shifting reward distribution in a bandit or RL problem. 
- if you are worried that the learner isnt adapting well to new information or isnt taking chances, then specifying as a bandit or RL agent may help. Might be overcomplicated for this setting
- in some settings this can be framed as a forecast problem where you want to exploit autoregressive traits 
- to my knowledge there is no learning framework outside of these three that is “made” for this problem, because i think this is mostly a classical supervised problem
