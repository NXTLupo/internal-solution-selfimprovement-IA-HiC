---
id: social-intelligence/reddit-deep/supplychain/1pu3w0g.md
url: "https://www.reddit.com/r/supplychain/comments/1pu3w0g/i_have_an_interview_soon_as_jr_demand_planner_and/"
kind: "social-post"
source: "reddit-deep: r/supplychain"
subreddit: "supplychain"
title: "I have an interview soon as Jr Demand Planner and I don’t even know where to begin. Any advice? See below"
author: "DaddyIngrosso"
date: "2025-12-23T20:14:47.000Z"
score: 18
upvote_ratio: 0.92
num_comments: 20
flair: "Question / Request"
extracted_at: "2026-06-24T22:13:50.251Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/supplychain/1pu3w0g.md#c0"
    char_span: [0, 1802]
    sentence_count: 17
    key_terms: [role, demand, planner, environment, interview, supplychain, analysis, comments]
    concepts: [demand, environment, planner, interview, supplychain]
    token_count: 388
    sources: [{"n":"reddit-deep: r/supplychain","u":"https://www.reddit.com/r/supplychain/comments/1pu3w0g/i_have_an_interview_soon_as_jr_demand_planner_and/"}]
  - id: "social-intelligence/reddit-deep/supplychain/1pu3w0g.md#c1"
    char_span: [1816, 3840]
    sentence_count: 10
    key_terms: [forecasting, demand, forecast, seasonality, like, mape, experience, percentage]
    concepts: [forecasting, demand, forecast, seasonality, experience]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/supplychain/1pu3w0g.md#c2"
    char_span: [3842, 5916]
    sentence_count: 18
    key_terms: [mape-is-the-worst-forecast-kpi-activity-7121102808904265728-kn61, forecasting, questions, data, mathamagician77, stock, maintenance, abc]
    concepts: [forecasting, questions, mathamagician77, maintenance, stock]
    section: Comments
    token_count: 471
  - id: "social-intelligence/reddit-deep/supplychain/1pu3w0g.md#c3"
    char_span: [5918, 6745]
    sentence_count: 8
    key_terms: [forecasting, production, business, planning, targets, demand, communication, complications]
    concepts: [forecasting, production, business, planning, targets]
    section: Comments
    token_count: 167
---
# I have an interview soon as Jr Demand Planner and I don’t even know where to begin. Any advice? See below

Source: [reddit-deep: r/supplychain](https://www.reddit.com/r/supplychain/comments/1pu3w0g/i_have_an_interview_soon_as_jr_demand_planner_and/)
Posted by **DaddyIngrosso** · **18↑** · **20 comments**

I have an interview in January for a fairly large international manufacturer, as a junior demand planner role. It was originally a standard demand planner role but the role was adjusted due to not being able to find anyone.

In my previous role, I was a demand planner. However, this where the problem begins. The industry I was in was not a traditional end to end supply chain in a manufacturing environment, but a pooling environment where stock was rented, de-hired, and constantly circulated in the pool.

Not only this, but there were hardly any elements in the role where I did any typical demand planning activities - forecasting, trend analysis, market analysis, historical cleansing, all of the basics.

In my role prior to that, I was logistics coordinator in a mfg environment with a bit of work in purchasing. Just raising POs, chasing production plans from problematic suppliers, general ERP maintenance, nothing too serious. I left this role for the role above without any consideration for the opportunity that I had, and it’s something I regret.

I would like to know how I could best prepare myself for this interview given my previous experiences. I am above average in my ability to use Excel and PowerBI, and in my pre-screen call I made it clear to them that I don’t have the experience they are looking for but they still wanted to invite me over.

If you’d like, I could show you the job spec. Just DM me. Would welcome some suggestions from everyone please.

Thank you.

## Comments

- **Tshaped_5485** (20↑): I’d suggest :

- dependent vs independent sources of demands (powertools companies sell direct online, distribute to supermarkets and specialised DIY shops, both B2B and B2C. All these signals have different demand patterns) 
- know a variety of direct and indirect (ex gbp) forecasting techniques 
- decompose to remove seasonality, make a trend forecast, re add seasonality 
- a few types of forecasting (moving average, exponential smoothing, ARIMA) 
- role of the demand planner in the S&OP process
- be ready to explain how to handle product launch (no sales history), promotions and stock-out
- how to measure forecast accuracy and efforts vs accuracy gains in forecasting techniques. (Often summarised: MAPE is a bad KPI and don’t invest in complexity, team or AI until you have compared yourself to a moving avg naive forecast) 

Being an Excel and PowerBi nerd is just the cherry on the cake as a demand planner. We want numbers’ crunchers (insert Cookie Monster meme). 

Good luck and don’t under estimate yourself.
  - **DaddyIngrosso** (3↑): Thank you. I’m quite young but I would like in the future to have several abbreviations besides my name like you and many others with experience do. 

I’ll do some research on the above terms.
    - **Tshaped_5485** (4↑): Fun thing about Reddit, it’s not LinkedIn ;) no one knows anyone’s gender and age. 

I may speak like an old dude, but got my CPIM in my early 20s. (Ok ok that was some time ago) 

You ve had a bit of work experience. Beyond the cost, nothing can prevent you from going for these letters. (Or CPF if you just want to focus on forecasting).
  - **Infamous_Whereas6777** (1↑): Wait, why is MAPE a bad KPI?
    - **here_walks_the_yeti** (1↑): From what I learnt:
“MAPE rewards under forecasting.

It heavily penalizes forecast errors during periods of low demand
Each forecast error is divided by the corresponding demand to get a percentage. If demand is low, you get a high percentage error. 
“

Edit- a source for my quote

https://www.linkedin.com/posts/vandeputnicolas_why-mape-is-the-worst-forecast-kpi-activity-7121102808904265728-kN61
- **Mathamagician77** (6↑): Questions to ask that would affect your role,  
Who maintains the material data for supply chain?
How robust is the super cession process tying outgoing and incoming sku’s for transfer of history. 
Does this role maintain ABC/XYZ and safety stock?
What is the frequency of these calculations?  Quarterly, bi-annual, annual?
Are you forecasting weekly buckets or monthly with percentage split?
Does your system reduce demand for returns?

The answers to these will tell you what type of environment you’re walking into.
  - **DaddyIngrosso** (2↑): >Phase in/phase out maintenance, master data maintenance in the local forecasting system

This is taken from the job spec, so it it safe to say that it would be myself maintaining the data? 

Am I correct in saying that ABC analysis is regarding which few SKUs have the highest value (A) down to the most number of SKUs which have the least value (C)? 

And XYZ is with respect to which stock is least variable (X), do to the most variable stock (Z)? 

It’s apparent to me from reading these comments that I’m even less prepared than I thought I am so I am trying to make sure I nail the fundamentals.
    - **mtlmoe** (2↑): Keep in mind that these comments are most likely from more senior planners and you're applying to a Jr. Position. 
I'm sure the paycheck will reflect your experience.
Good luck!
    - **Mathamagician77** (1↑): Sounds like your role includes master data.  So be looking for interactions with engineering or whoever brings new product to market

You are correct on ABC/XYZ, I did it in excel, they may use another tool.  

The goal of asking the questions is to show interest and it will come to you as they show what they are currently doing.  I’d be more concerned interviewing someone if they didn’t ask these questions and others of general business interests.  

You’ll be looking for documentation and processes for their forecasting tools and MRP/ERP.  

If you enjoy numbers, demand planning will be a good fit once you have time to learn their business.  And then you’ll find your strengths in quantitative and/or qualitative inputs that drive both production and material replenishment.  

Update us on how everything goes.
- **BikeKiwi** (2↑): Current forecast accuracy and BAIS and what the targets are.  What do they think the biggest hurdles to meeting the targets (normally sales or marketing over forecasting)
What are the major complications for forecasting that the business has, niche market, seasonal products, limited production capacity, purchases to order, long lead times?
What is the monthly structure or routine for Demand meetings?  How involved in the S&OP/IBP process?

Do you cover supply planning? 
Is the role responsible for raising OOS risk communication?
