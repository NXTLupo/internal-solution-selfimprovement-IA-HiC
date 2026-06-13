---
id: social-intelligence/reddit-deep/datascience/1lu7gqq.md
url: "https://www.reddit.com/r/datascience/comments/1lu7gqq/how_to_deal_with_time_series_unbalanced_situations/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "How to deal with time series unbalanced situations?"
author: "EducationalUse9983"
date: "2025-07-07T22:03:11.000Z"
score: 60
upvote_ratio: 0.97
num_comments: 67
flair: "Projects"
extracted_at: "2026-06-11T18:58:19.179Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1lu7gqq.md#c0"
    char_span: [0, 2160]
    sentence_count: 13
    key_terms: [day, product, failure, data, features, datascience, probability, like]
    token_count: 502
  - id: "social-intelligence/reddit-deep/datascience/1lu7gqq.md#c1"
    char_span: [2162, 3807]
    sentence_count: 10
    key_terms: [day, unavailable, survival, predict, happen, time-to-event, available, imbalance]
    section: Comments
    token_count: 378
  - id: "social-intelligence/reddit-deep/datascience/1lu7gqq.md#c2"
    char_span: [3809, 5643]
    sentence_count: 13
    key_terms: [time, features, problem, product, series, educationaluse9983, day, forecasting]
    section: Comments
    token_count: 426
  - id: "social-intelligence/reddit-deep/datascience/1lu7gqq.md#c3"
    char_span: [5645, 7887]
    sentence_count: 10
    key_terms: [time, series, problem, like, data, model, day, tabular]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/datascience/1lu7gqq.md#c4"
    char_span: [7568, 8733]
    sentence_count: 12
    key_terms: [day, time, product, train, data, series, model, setting]
    section: Comments
    token_count: 281
  - id: "social-intelligence/reddit-deep/datascience/1lu7gqq.md#c5"
    char_span: [8736, 10482]
    sentence_count: 9
    key_terms: [time, educationaluse9983, data, day, good, use, rolling, classification]
    section: Comments
    token_count: 480
  - id: "social-intelligence/reddit-deep/datascience/1lu7gqq.md#c6"
    char_span: [10485, 12698]
    sentence_count: 15
    key_terms: [variables, educationaluse9983, time, series, stock, data, "i'm", like]
    section: Comments
    token_count: 485
---
# How to deal with time series unbalanced situations?

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1lu7gqq/how_to_deal_with_time_series_unbalanced_situations/)
Posted by **EducationalUse9983** · **60↑** · **67 comments**

**Hi everyone,**

I’m working on a challenge to **predict the probability of a product becoming unavailable the next day**.

The dataset contains one row per product per day, with a binary target (`failure` or not) and 10 additional features. There are over 1 million rows without failure, and only 100 with failure — so it's a highly imbalanced dataset.

Here are some key points I’m considering:

1. **The target should reflect the next day**, not the current one. For example, if product X has data from day 1 to day 10, each row should indicate whether a failure will happen on the following day. Day 10 is used only to label day 9 and is not used as input for prediction.
2. **The features are on different scales**, so I’ll need to apply normalization or standardization depending on the model I choose (e.g., for Logistic Regression or KNN).
3. **There are no missing values**, so I won’t need to worry about imputation.
4. **To avoid data leakage**, I’ll split the data by product, making sure that each product's full time series appears entirely in either the training or test set — never both. For example, if product X has data from day 1 to day 9, those rows must all go to either train **or** test.
5. Since the output should be a **probability**, I’m planning to use models like Logistic Regression, Random Forest, XGBoost, Naive Bayes, or KNN.
6. Due to the strong class imbalance, my **main evaluation metric will be ROC AUC**, since it handles imbalanced datasets well.
7. Would it make sense to include calendar-based features, like the day of the week, weekend indicators, or holidays?
8. How useful would it be to add rolling window statistics (e.g., 3-day averages or standard deviations) to capture recent trends in the attributes?
9. Any best practices for flagging anomalies, such as sudden spikes in certain attributes or values above a specific percentile (like the 90th)?

**My questions:**  
Does this approach make sense?  
I’m not entirely confident about some of these steps, so I’d really appreciate feedback from more experienced data scientists!

## Comments

- **TepIotaxl** (26↑): I'm not able to answer all of your questions, but I believe you should look into survival models. They are specifically designed for time-to-event data and I believe would solve some of your problems.
  - **webbed_feets** (5↑): Can’t products become unavailable multiple times? Ex: it’s available until day 10, unavailable from day 10-15, available until day 20, then unavailable again. That would require recurrent event survival analysis at least.
  - **EducationalUse9983** (2↑): Thanks! I'm afraid this doesn't really seem like a time-to-event problem — the goal is to predict if the failure will happen tomorrow, not when it will happen. So a binary classification setup with a fixed horizon seems more appropriate here. Makes sense?
    - **XIAO_TONGZHI** (21↑): It is a time to event problem, a survival curve can help you predict the probability at h = 1 (tomorrow) but also the day after and the day after that too, as far as you want, surely that’s more useful?

Also how many products do you have, how many rows are the same product on a different day? And what other predictors do you have

Also - AUC as a metric is insensitive to class imbalance in calculation, this doesn’t mean it handles it well, it’s actually more likely to produce a deceptively high performance figure with such a class imbalance, PR-AUC might be a better suggestion
    - **writeafilthysong** (3↑): Why not predict when failure will happen?

Next day warning is not so useful.
    - **Ok-Yogurt2360** (2↑): And why should you be able to predict failure in the first place?
- **_hairyberry_** (6↑): Why are you putting a product’s entire history in either train or test, rather than doing time based splits? Is the goal not predicting one day ahead, regardless or product?
  - **EducationalUse9983** (1↑): One hypothesis I got is that one of these variable might decrease over time before reaching failure = 1.. so that would be the reason.. does it make sense?
    - **_hairyberry_** (6↑): Personally, I would treat this as a time series forecasting problem. Which means time-based splits. I would also just let the target reflect the *current day*, not the next day. Then you can engineer lag features, date features, rolling statistics, holidays, business-specific features, etc. 

I’d recommend looking into cross validation for time series (to learn the basics on preventing leakage in this type of problem), and global ML time series models (for modelling). Most example will be with lightgbm or linear regression, just replace it with logistic regression or whatever. That will serve you very well. 

The gold standard book for this stuff imo is “modern time series forecasting” by manu Joseph, if you want to dig deep on it.
- **James_c7** (4↑): When you say a product becomes available, is this a consumer product with physical stock levels?

If so, just forecast demand and calculate stock levels deterministically as a function of demand. Then it’s easy to estimate the probability of a stockout
  - **EducationalUse9983** (1↑): Hey James thanks for the answer! I got the output as a binary variable, and I don’t know the features of the dataset, I just got them!
    - **James_c7** (4↑): Is this a real world problem? If so get more details and control the problem!

And if it’s not a real world problem than I’m not sure it’s a problem worth solving given the lack of details
- **Giomaria** (5↑): Someone will correct me if I'm wrong, but I feel like if you approach this as a time series problem then you should treat it as such and preserve the sequence in the target variable (which I assume is like 0-0-0-1-0-0 or so). If you use the models you have mentioned this won't be a time series but just tabular data with some date and time features. Usually with a time series you will have data from t to t+k and predict t+k+1 and so on, and to do that you could use specific models like rnn, transformers or prophet that also support including the other features you have.
  - **EducationalUse9983** (1↑): that's a great comment..would it be a problem to treat it like a tabular challenge with time variables, and also making sure to avoid data leakage? i'd love also to hear about that
    - **pdr07** (5↑): the potential issue with using tabular + time as a feature is that you could at some point use a model that assumes independence between observations, and I feel like time plays a major role in your problem, how long before something depletes relies heavily into previous observations (so, in time)
    - **Giomaria** (1↑): It might still work well for your purpose, but consider the fact that you will lose any info coming from all previous time steps: when you look at day 3 predicting day 4, the model will predict based on day 3 while in a time series model it would be able to look at day 1-2-3. So there may be a loss of information there, but it could work fine (especially if there is no clear pattern in the time series). The time series approach would require splitting the time series instead of splitting by product and you will have as many ts as the n of products. At that point you can also have the product ID/name as a variable. Unfortunately the different length of the time series complicates things and you would have to introduce padding.
So probably keep doing what you are doing.
With regards to data leakage I would just keep in mind that you cannot train a model on data that you wouldn't have in a real time setting. Like say these time series are concurrent and every time on day 7 the stock finishes. You train on time series for many products going day 1-10. Then you test on other product data going from day 1-10. Now your model is predicting on day 6 and it has learned that stock fails on day 7. But in a real time setting you could never train this model because on day 6 you would only have data for the first 6 days. For this reason (assuming day 1 for one product is also day 1 for another product) I would split by time and not by product. So say you have 1-100, you train on 1-70 and test on 70-100.
- **snowbirdnerd** (3↑): This is really hard to answered without knowing what the features are. This is basically a binary classification problem so I would try something like XG-boost using engineered lag vars. So if one feature is number of sales on day x then you could have sales on day x-1, x-2, etc. 


You keep the time series nature of the data but you also use a strong classification model. 


For more complicated questions such as looking further forward than one day I would use RUL projections or survival functions.
  - **EducationalUse9983** (1↑): Awesome! Any further considerations about challenges?
    - **snowbirdnerd** (1↑): My only other thought is that if it turns out that the time period you need to look at is long then you might want to use some rolling window functions. So a 14 day, 7 day, 3 day rolling average of say sales. 


These aren't as good as lar vars but aren't as noisy for long time periods, it also doesn't blow up the number of features required.
- **Saitamagasaki** (2↑): Point 4, why not put rows 1-8 to train and 9 to test?
  - **EducationalUse9983** (1↑): Im afraid to indirect data Leake, as I can mix the past and the future with time related features..but again, I’m happy to read experienced data scientists about this as well..

But it seems that if respect the timeline, it can be done
    - **Saitamagasaki** (3↑): Don’t worry, as long as you dont put like days 1 - 7 and 9 in train and 8 in test, ur good
- **BroadIntroduction575** (2↑): I'm dealing with a similar problem in a project right now. I'm trying to use variable length spatiotemporal data to perform binary classification. Luckily, there has been some work done in my domain on the subject. I'm achieving good performance by upsampling my imbalanced class with rolling windows, e.g. imagine a series with labels:

    0 0 0 0 0 0 0 0 1 1 0 0 1

and in this example I've determined I need 4 time samples to act as a good predictor, so I can pull out 3 positive examples:

    [0 0 0 0] --> [1]
    [0 0 0 1] --> [1]
    [1 1 0 0] --> [1]


Rather than explicit time series modeling, I'm creating features from each time series. Since my data are spatial in nature, things like the total length of the path, average speed, variance in direction, periodicity, time spent still, etc. I'm getting great performance with XGBoost.

I wish I could provide more specific feedback, but this is my first ML project (not a data scientist by trade) and I'm learning a lot as I go. This is a super informative thread!
- **dr_tardyhands** (2↑): What kind of variables are the independent/predictor variables?
  - **EducationalUse9983** (1↑): Unknown, but all numerical in different scales
    - **dr_tardyhands** (1↑): Eh. I guess you're not really supposed to succeed in this, huh?

You could try decomposing the ts variables into trend and cyclical components. You could add some randomised time series predictor variables in there and see how they perform as predictors. And drop the ones that perform worse than the randomised ones.

Then start with simpler, explainable models, and work your way up keeping those as a baseline. Justify all the steps you take with some data.

Good luck..!
- **time4nap** (2↑): A rare event binary non parametric modeling problem like that will be quite difficult. Is there some proxy continuous variable that you could associate with either likelihood of a stock out that you could  use predict a stock out “risk” and threshold that in a post processing step? Alternatively if you have some decent domain knowledge about the structure and causal drivers of stock out you might be able to build a parametric Bayesian inference model and learn the distributions using a relatively smaller set of positives.
  - **EducationalUse9983** (1↑): as this is a modelling challenge only, i have no business context about the variables..its much more applying techniques than discussing hypothesis to maybe bring external variables
- **ResponsibleSmoke4407** (1↑): consider using pr-auc instead of roc-auc - it handles extreme imbalance better. also rolling window features like 3-day avg/std can help capture short-term trends. smote or class weighting might help too
  - **EducationalUse9983** (2↑): That’s a great advice! Thanks for that!
