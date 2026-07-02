---
id: social-intelligence/reddit-deep/supplychain/1sri9i8.md
url: "https://www.reddit.com/r/supplychain/comments/1sri9i8/demand_planning_supply_chain_early_warning_reports/"
kind: "social-post"
source: "reddit-deep: r/supplychain"
subreddit: "supplychain"
title: "Demand Planning / Supply Chain early warning reports"
author: "Stroudgreen"
date: "2026-04-21T09:07:14.000Z"
score: 20
upvote_ratio: 0.9
num_comments: 14
flair: ""
extracted_at: "2026-06-24T22:13:50.250Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/supplychain/1sri9i8.md#c0"
    char_span: [0, 1505]
    sentence_count: 10
    key_terms: [product, demand, availability, supplychain, look, comments, started, warning]
    concepts: [product, availability, demand, supplychain, comments]
    token_count: 339
    sources: [{"n":"reddit-deep: r/supplychain","u":"https://www.reddit.com/r/supplychain/comments/1sri9i8/demand_planning_supply_chain_early_warning_reports/"}]
  - id: "social-intelligence/reddit-deep/supplychain/1sri9i8.md#c1"
    char_span: [1519, 2951]
    sentence_count: 14
    key_terms: [approach, automate, customer, forecast, highest, monthly, usually, demand]
    concepts: [approach, automate, customer, forecast, highest]
    section: Comments
    token_count: 317
  - id: "social-intelligence/reddit-deep/supplychain/1sri9i8.md#c2"
    char_span: [2953, 4545]
    sentence_count: 15
    key_terms: [without, parts, stock, time, experience, increased, forecast, products]
    concepts: [without, experience, parts, stock, increased]
    section: Comments
    token_count: 369
  - id: "social-intelligence/reddit-deep/supplychain/1sri9i8.md#c3"
    char_span: [4547, 5470]
    sentence_count: 8
    key_terms: [demand, inventory, receipts, stock, lead, time, scheduled, planned]
    concepts: [demand, inventory, receipts, stock, scheduled]
    section: Comments
    token_count: 198
---
# Demand Planning / Supply Chain early warning reports

Source: [reddit-deep: r/supplychain](https://www.reddit.com/r/supplychain/comments/1sri9i8/demand_planning_supply_chain_early_warning_reports/)
Posted by **Stroudgreen** · **20↑** · **14 comments**

I've just started a new role in FMCG and had an issue last week where our product availability started dropping due to a Tech implementation which we weren't told about. It took us a few days to spot and initially reacted by raising forecasts which we then systemically pulled down. We then ended up in a cycle where product A out of stock saw demand shoot into product B etc etc. 

Does anyone have any experience with a leading indicator / early warning system and what it should include?

If I take a simple - we usually purchase 100 avg. a day and today's order is 90 then this might be a poor way to look at it because sales fluctuate - weather, customer behaviour. 

If I then try to get smarter I could look at standard deviation but then you might find product A goes out of stock so demand shoots into product B. We also have a SKU count of around 30k - there's a lot going on at anyone time. 

Curious how others would approach this and what a dashboard could look like? 

PS I would love to say that the answer is that Tech tell me about deployments in the future but 1. they won't and 2. it will be another issue in a months time which causes availability to drop. It's how I spot it in a targeted way before everything starts collapsing.

## Comments

- **Adventurous-Star1309** (8↑): You can measure your forecast accuracy in desired intervals (weekly/monthly) and then target the ones with the highest errors. If the list is too long arrange it in order of highest impact. Then work on those SKUs and determine what went wrong. Do this frequently till your error reduces to acceptable levels. Best advantage of this approach is now your brain knows which are your top performing SKUs and what is the average demand that you usually have. Helps in the long run. 
This is the manual tiresome approach which has worked for me. You can check with copilot/GPT or any other AI if you want to automate it completely.
- **rmvandink** (7↑): Set alerts for minimum stocks, or demand peaks, or replenishment delays. How? I can’t tell you without knowing what data is accessible, accurate and automated. If you want to automate call Slimstock, they’re usually pretty good.
- **BikeKiwi** (3↑): The short answers is no. I'm also in FMCG and the sales team plan weekly and DP forecast monthly. We have access to major customer sales data which helps with tracking consumers purchases but it comes out 3 days after the end of the week 

Looking at daily is too macro in my market.  Stock flows from our dc into the customers dc then to customer stores.  we can see orders being pulled forward or pushed back in the daily planned order reports as the stock levels change at both dc and store level.

Increased safety stock helps to mitigate losses due to changes until root causes are identified and addressed (change demand plan to new normal, get sales to provide changes to promo data, etc). This comes with increased stock holding costs and isn't always appropriate with many FMCG goods.
- **rich_clock** (3↑): Why won't they inform you?  In my experience IT doesn't get to unilaterally make the decision to deploy technical solutions without consulting the key stakeholders.  You job is to protect the customer, they need to ASK you.  Are these make parts?  Are they buy parts?  What's the lead time?  Are you carrying Safety Stock?
  - **thisoldguy74** (3↑): My experience is that the company may as well have been built around IT. They reset the ERP system without a head's up to an entire plant. It took 6-8 weeks to completely regain all of the functionality that ultimately remained. Some parts were just gone for good without warning. 

Jan 2, 2023 was the beginning of a brutal 2 months.
  - **Stroudgreen** (1↑): There are deployments all the time and yes, it’s annoying and not the first time this has happened so I want an alert as it’s better than some broken promise from IT that they’ll tell me. What I’ve learned is that they test, deploy but then dont monitor impact. Crazy.
- **scoopthereitis2** (3↑): It sounds like you're looking for products that consistently are over the forecast?  Maybe a simple report of "products that have exceeded forecast by more than X over the last Y days?"  The X can be a number of units or a percent of demand and the Y days might be 5?" 

As far as the bleeding over to different demand, unsure how to help with that.
- **willofalltradess** (2↑): Inventory projections. Current inventory + scheduled (firm) receipts - planned demand. Start with today and run a forward regression through lead time. Then do the same outside of lead time, substituting scheduled receipts with planned receipts. Look for up/down trends. Couple this with a push/pull report and projected shortages (unmet demand inside of lead time)
- **afreshhhh** (1↑): Do you/does your supply person have a calculation for days of supply as an inventory projection versus demand plan? The warning metric is when your stock dips below target as you are impacting your safety stock and need more aggressive replenishment
  - **Stroudgreen** (1↑): We largely let the system work this out but stock buffer as an alert could be sensible. It's fresh food so often the buffer is very small and volatile.
