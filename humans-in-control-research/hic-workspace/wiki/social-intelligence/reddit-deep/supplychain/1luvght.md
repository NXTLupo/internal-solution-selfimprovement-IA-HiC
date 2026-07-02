---
id: social-intelligence/reddit-deep/supplychain/1luvght.md
url: "https://www.reddit.com/r/supplychain/comments/1luvght/using_machine_learning_for_demand_forecasting/"
kind: "social-post"
source: "reddit-deep: r/supplychain"
subreddit: "supplychain"
title: "using machine learning for demand forecasting"
author: "sweetlilacwine"
date: "2025-07-08T17:56:58.000Z"
score: 0
upvote_ratio: 0.47
num_comments: 21
flair: ""
extracted_at: "2026-06-24T22:13:50.252Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/supplychain/1luvght.md#c0"
    char_span: [0, 655]
    sentence_count: 1
    key_terms: [relex, supplychain, comments, solution, better, demand, models, feed]
    concepts: [supplychain, relex, comments, solution, better]
    token_count: 147
    sources: [{"n":"reddit-deep: r/supplychain","u":"https://www.reddit.com/r/supplychain/comments/1luvght/using_machine_learning_for_demand_forecasting/"}]
  - id: "social-intelligence/reddit-deep/supplychain/1luvght.md#c1"
    char_span: [669, 2385]
    sentence_count: 11
    key_terms: [demand, forecasting, information, decisions, human, models, going, don]
    concepts: [demand, forecasting, information, decisions, human]
    section: Comments
    token_count: 351
  - id: "social-intelligence/reddit-deep/supplychain/1luvght.md#c2"
    char_span: [2387, 4303]
    sentence_count: 12
    key_terms: [forecasting, system, planner, models, qualitative, forecasts, industry, factors]
    concepts: [forecasting, system, planner, models, qualitative]
    related_chunks: ["social-intelligence/reddit-deep/supplychain/1luvght.md#c3"]
    section: Comments
    token_count: 428
  - id: "social-intelligence/reddit-deep/supplychain/1luvght.md#c3"
    char_span: [4305, 5684]
    sentence_count: 15
    key_terms: [already, replace, models, forecasting, forecast, "doesn't", example, person]
    concepts: [already, replace, models, forecasting, forecast]
    related_chunks: ["social-intelligence/reddit-deep/supplychain/1luvght.md#c2"]
    section: Comments
    token_count: 342
---
# using machine learning for demand forecasting

Source: [reddit-deep: r/supplychain](https://www.reddit.com/r/supplychain/comments/1luvght/using_machine_learning_for_demand_forecasting/)
Posted by **sweetlilacwine** · **0↑** · **21 comments**

a client of mine, $50bn revenue retailer, has asked whether they should be investing into better ai models to feed into relex (their planning solution). they don't have a large data science team today but they describe the relex demand solution as 'rules-based' and wonder if they should be building or buying better models to feed into relex. anyone have any view on this / experience doing something similar?

## Comments

- **Horangi1987** (26↑): No. We are staying far away from AI for demand planning.

Besides, what’s an AI going to do that forecasting models don’t do? The parts we have to be hands on for are human factors, AI isn’t going to be able to make the subtle changes needed for human made demand spikes or human made decisions.

And…who really wants to feed their company’s precious data into an AI model. I don’t trust any AI currently to keep that information secure and quarantined from the wider world.
  - **sweetlilacwine** (0↑): Thanks for your msg!  
I think the client is only talking about having robust machine learning for forecasting so nothing crazy. but they seem to think that a lot of the market leading solutions aren't very sophisticated ML, which is why a lot of retailers end up building their own forecasting models internally..   
but i totally get your point about human intuition needed for human demand spikes.
    - **Horangi1987** (3↑): I still don’t understand what they think ML is going to do differently than regular forecasting models. Existing demand planning programs pretty much all use a wide selection of possible models and will analyze your data and apply the most relevant ones.

If they think that a machine learning model is going to somehow provide ‘better’ information and modeling for the purpose of decision making, that means that the people making the decisions don’t understand demand planning to begin with. The demand planner absolutely should not need a ML system to give them the information they need to make decisions. The other people (management, sales, marketing, etc) should be given the appropriate amount of information from the planner to make their decisions.

If they think that a ML system will reduce or eliminate the need for a dedicated planner, they’re incredibly wrong. Part of a planner’s job is to trust but verify any and all forecasts if they assume the forecasts are accurate. Anyone with experience as a planner knows just how fast a forecast can get off track, and the amount of analysis that goes into figuring what factor or factors is causing that. I’d be worried with a ML system you’d have a harder time diagnosing what went wrong than a system you’re controlling.
- **Mathamagician77** (8↑): A good forecasting system should already be handling the quantitative side of forecasting, including weighting the models and choosing best fit.   Are they asking for AI to take over the qualitative side?   And is “Relex” built to keep these inputs separate from the math models so you can perform forensic review for accuracy checks?
  - **sweetlilacwine** (2↑): this is super helpful, i hadn't thought about this as a quant/qual balance (this space is new to me – obviously!!) i think they want to have a base quant model to inform human decision makers.. they seem to think the off-the-shelf forecasting models from these planning solutions are a little subpar.
    - **birchsyrup** (1↑): I’m here trying to understand the industry better for a client that I write for who has a ML platform in this industry.

I have found it really interesting to learn where the qualitative info comes in.

Things like social listening (trends, breaking news, etc) or promos, or even sales call transcripts and email histories.
- **HumanBowlerSix** (5↑): I'd trust Relex over every single AI-based model I've been shown so far. I've yet to see one that did a good job. Halfway decent at best.

Unless you are integrating a ton of other PERTINENT factors (hot weather for ice cream sales, for example) it just doesn't make much sense. We're still a few years away, at a minimum.

Someone else also mentioned the human element. Absolutely. We need people to go in and make adjustments regardless on those tricky items. Dumping a ton of money in to replace an already world class system just to have a person review and overwrite it anyways just doesn't seem like a good idea.
  - **Aware_Frame2149** (3↑): >Unless you are integrating a ton of other PERTINENT factors (hot weather for ice cream sales, for example) it just doesn't make much sense. We're still a few years away, at a minimum.

If your product is reactive to seasonality and that hasnt been integrated into your forecast, you're already wrong and AI won't help you.😄
    - **HumanBowlerSix** (2↑): Fair point, given that example.
- **Slapshot382** (7↑): Say NO to Ai slop!
- **Aware_Frame2149** (3↑): A forecast model is only going to provide forecasts from the data that is input.

If the person responsible for feeding in the data is incompetent, then probably. If not, why bother?
- **enlargedair** (3↑): RELEX already uses ML and traditional stat models
- **dickvanilla** (1↑): Doesn’t Kinaxis use “AI” or machine learning to help with forecasting?
- **Ravenblack67** (1↑): This is a good question.  I wish I knew the answer.  I do a lot of forecasting consulting.  Could AI replace qualitative models?  Maybe.  Could it replace quantitative models?  I do not know.  Great discussion starter.
