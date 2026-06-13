---
id: social-intelligence/reddit-deep/datascience/1nl4oi1.md
url: "https://www.reddit.com/r/datascience/comments/1nl4oi1/how_to_actually_perform_observational_studies_in/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "How to actually perform observational studies in industry?"
author: "LebrawnJames416"
date: "2025-09-19T14:12:19.000Z"
score: 14
upvote_ratio: 0.95
num_comments: 10
flair: "Discussion"
extracted_at: "2026-06-11T18:58:19.182Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1nl4oi1.md#c0"
    char_span: [0, 1097]
    sentence_count: 7
    key_terms: [observational, features, studies, datascience, use, comments, predict, answer]
    token_count: 247
  - id: "social-intelligence/reddit-deep/datascience/1nl4oi1.md#c1"
    char_span: [1112, 3507]
    sentence_count: 12
    key_terms: [entities, threshold, reach, question, methods, reached, cohort, effect]
    section: Comments
    token_count: 503
  - id: "social-intelligence/reddit-deep/datascience/1nl4oi1.md#c2"
    char_span: [3509, 5052]
    sentence_count: 11
    key_terms: [artistic-comb-5932, analytics, treatment, outreach, question, research, clearly, effects]
    section: Comments
    token_count: 342
  - id: "social-intelligence/reddit-deep/datascience/1nl4oi1.md#c3"
    char_span: [5054, 7168]
    sentence_count: 9
    key_terms: [introduction-causal-inference, https, berkeley, learning, targeted, users, performance, pmc10603361]
    section: Comments
    token_count: 484
  - id: "social-intelligence/reddit-deep/datascience/1nl4oi1.md#c4"
    char_span: [7172, 7477]
    sentence_count: 1
    key_terms: [sensitivity, rosenbaum, staggered, threshold, analyses, approach, consider, e-values]
    section: Comments
    token_count: 74
---
# How to actually perform observational studies in industry?

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1nl4oi1/how_to_actually_perform_observational_studies_in/)
Posted by **LebrawnJames416** · **14↑** · **10 comments**

Hey everyone, 

I am working on observational studies and need some guidance on confounder and model selection, are you following a best practise when it comes to observational studies? 

  
My situation is, we have models to predict who will churn based on a whole set of features and then we reach out to them, and the ones that answer become our treatment and the ones that don't become our control. Then based on a bunch of features of their behaviour in the previous year, I use a model to find the features that most likely predict who will answer and use those as the confounders. As they were most related to the treated group. 

  
Then would use something like TMLE,psw etc to find the ATE.

  
How do you decide what to do if there isnt any domain knowledge, is there a textbook or methods you follow to conduct your tests?

## Comments

- **chocolatebuttcream** (7↑): Paul Rosenbaum has written a lot about observational studies and causal inference. I highly recommend his work.
- **comiconomist** (4↑): As phrased it sounds like you are trying to measure the causal effect of entities answering/not answering. This feels silly to me, as this isn't something you control. (BTW I'm using 'entities' instead of 'people' in case your customers are businesses.)

A question that is probably more useful is "what is the effect of 'reaching out'", since that is something your organisation actually controls (e.g. they could decide to reach out to a larger or smaller number of entities). In this case your treatment group is entities you reached out to and your control group is entities you did not reach out to. Since you know the mechanism by which it is decided whether or not to reach out to entities you actually know the propensity score so could use propensity score methods - though if it is a simple threshold rule (entities whose predicted probability of churning is above a certain number are reached out to, those who are below the threshold are not reached out to) you actually won't satisfy the common support assumptions required for those methods to work. You could compare entities just below vs just above the threshold as a discontinuity design, though would need to caveat your estimate of the effect of reaching out is only for entities near that threshold.

As for whether entities answer your reach out or not, I would view this  similarly to a compliance vs non-compliance question - look up 'intent to treat vs treatment on the treated'.
- **damn_i_missed** (3↑): Coming from health outcomes research, my thoughts are that churn essentially = incidence. Others have mentioned that this is a cohort study, but look at retrospective cohort studies specifically, which is the directionality of your analysis if I’m understanding correctly. There are also ways to measure for confounders. If you feel like hopping across the pond (or puddle. idk), Epidemiologic methods, and any textbook, will cover that.  

Also, like others said, can’t do any of this before you have a solidified research question.
- **forbiscuit** (2↑): I think in terms of domain, this all falls under customer analytics model (segmentation, cohort analysis, customer lifetime value , buy-till-you-die model, etc). Have you looked into CHIAD?

Let’s say even if this is not for customers and you’re doing People/HR Analytics, the methodology of customer Analytics holds as well with slight tweaks on the variables
  - **Artistic-Comb-5932** (1↑): No no and no.  Before barfing out algorithms and methods he needs to describe very clearly the business problem,  research question.  This is a common DS interview pet peeve.
- **Artistic-Comb-5932** (2↑): What are you trying to observe or what is your research question? State it clearly.   What is your intervention?  You talk about ATE without describing your treatment.    

A churn model predicts churn right?  


You are or expected to be the domain expert
- **SoccerGeekPhd** (1↑): Look at works by Miguel Hernan and Sebastian Schneeweiss for real world evidence methods.
- **normee** (1↑): There are a lot of unobserved attributes that will determine who responds and who doesn't to some outreach in some timeframe that you won't be able to model away. For example, you are unlikely to have data from prior user behavior telling you which users you contacted happened to get sick or go on vacation right when your outreach campaign started. In practice, the magnitude of these impacts in the industries I've worked in has led to very large biases and wildly inflated treatment effects that make lapsed user campaigns look highly efficient when they were actually cannibalistic. Read the paper "Here, There, and Everywhere: Correlated Online Behaviors Can Lead to Overestimates of the Effects of Advertising" for more depth on this. 

Best thing you can do to get around this: run an A/B test where you take your target audience (i.e. just the users predicted to churn), and randomly split them into users who are contacted and ones who are not. That will let you measure the performance/ATE of your outreach treatment on your target audience AND give you the data to do additional modeling to refine your churn prevention targeting. When I was able to convince my business partners to do this, we were able to show just how different the performance of the campaigns looked like in a gold-standard A/B test (mediocre) compared to when we looked at that same campaign within just the treated users and attempted various approaches like you are doing to account for confounding and compare treatment responders to non-responders (wildly overinflated and optimistic).
- **all_things_TML** (1↑): Since you're interested in TMLE, there's a great paper called "A causal roadmap for generating high-quality real-world evidence" available for free at [https://pmc.ncbi.nlm.nih.gov/articles/PMC10603361/](https://pmc.ncbi.nlm.nih.gov/articles/PMC10603361/)  The Center for Targeted Machine Learning at UC Berkeley has a free online course on causal inference, [https://ctml.berkeley.edu/introduction-causal-inference](https://ctml.berkeley.edu/introduction-causal-inference) .

Last week we launched a subreddit called Targeted\_ML that's all about Targeted (Machine) Learning, TMLE, and Super Learning.  Only 3 posts so far, but you could ask more questions there, or check it out in the future once it gets going.
- **Significant-Cell4120** (1↑): Biggest pitfall here: you’re estimating the effect of answering outreach, not the effect of being outreached. That’s selection-on-compliance. If you can, randomize who gets contacted and treat “contact” as an encouragement → use IV (Wald/2SLS) to get a LATE for compliers.

If randomization isn’t possible:
	
•	Define the estimand (ATE/ATT) and draw a DAG. Select pre-treatment covariates that block backdoors; don’t choose variables just because they predict “answering” (risk of conditioning on colliders).
	

•	Use a doubly robust approach (AIPW/TMLE or DML) with flexible learners; check overlap and balance (SMDs), trim/extreme weights.
	

•	Run sensitivity analyses (Rosenbaum bounds / E-values) and placebo outcomes.
	

•	If your outreach rule uses a score/threshold, consider RD; if rollout is staggered, DiD.
