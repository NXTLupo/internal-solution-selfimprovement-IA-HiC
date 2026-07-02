---
id: social-intelligence/reddit-deep/productmanagement/1lkfcpq.md
url: "https://www.reddit.com/r/ProductManagement/comments/1lkfcpq/how_to_handle_tough_prioritizations/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "How to handle tough prioritizations?"
author: "Humble-Pay-8650"
date: "2025-06-25T19:39:47.000Z"
score: 32
upvote_ratio: 0.92
num_comments: 23
flair: ""
extracted_at: "2026-06-24T22:14:23.451Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1lkfcpq.md#c0"
    char_span: [0, 2327]
    sentence_count: 13
    key_terms: [customer, revenue, productmanagement, prioritization, long-standing, especially, strategic, accounts]
    concepts: [customer, revenue, productmanagement, prioritization, long-standing]
    token_count: 509
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1lkfcpq/how_to_handle_tough_prioritizations/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1lkfcpq.md#c1"
    char_span: [2341, 4254]
    sentence_count: 18
    key_terms: [features, sales, delay, bugs, new, quarter, losing, sprint]
    concepts: [features, sales, delay, quarter, losing]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1lkfcpq.md#c2"]
    section: Comments
    token_count: 433
  - id: "social-intelligence/reddit-deep/productmanagement/1lkfcpq.md#c2"
    char_span: [4256, 6447]
    sentence_count: 14
    key_terms: [sales, prospects, features, conversations, georgeharter, team, time, objections]
    concepts: [sales, prospects, features, conversations, georgeharter]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1lkfcpq.md#c1"]
    section: Comments
    token_count: 501
  - id: "social-intelligence/reddit-deep/productmanagement/1lkfcpq.md#c3"
    char_span: [6449, 7925]
    sentence_count: 13
    key_terms: [clients, sales, cost, new, guaranteed, validating, customers, customer]
    concepts: [clients, guaranteed, sales, validating, customers]
    section: Comments
    token_count: 357
  - id: "social-intelligence/reddit-deep/productmanagement/1lkfcpq.md#c4"
    char_span: [7927, 9611]
    sentence_count: 14
    key_terms: [feature, features, through, sales-request, sales, been, experience, understand]
    concepts: [feature, features, sales-request, through, experience]
    section: Comments
    token_count: 375
---
# How to handle tough prioritizations?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1lkfcpq/how_to_handle_tough_prioritizations/)
Posted by **Humble-Pay-8650** · **32↑** · **23 comments**

Hi folks, I’d love your take on a real prioritization challenge I'm facing:

# Context:

I had two competing paths for Q4 25 roadmap:

1. Build two sales-requested features that were 'projected' to generate $8M in new revenue, OR
2. Fix critical bugs and broken workflows that were reported by customer accounts worth $4.5M in renewals mostly from long-standing enterprise customers.

I don't have the team capacity to do both in the same quarter.

This wasn’t a case of “must-have vs. nice-to-have.” Both options supported major business goals—new growth and retention—and had strong exec backing. What made it even trickier: $8M in potential revenue sounds flashier than $4.5M in at-risk renewals, especially with sales teams pushing hard to hit quota.

# My thinking:

I collected the below data to share with the leadership:

* Support tickets and customer frustration in their own words
* Quantify the $4.5M risk, tied to specific strategic accounts
* Flagged a rare window of dev support from our Advanced Search team, who normally have high-priority work. It was a now-or-never opportunity to tackle long-standing bugs that we might not get again. **This is the most important!**
* Highlighted that negative word-of-mouth could impact future deals, especially since prospects were often from similar industries/networks and competition is getting insane in this industry.

I built a simple prioritization model comparing revenue impact, timing, risk, and downstream effects. The message wasn’t “no” to the $8M rather it was “not yet.” Sequence work to protect the base first, then build forward with stronger customer trust.

# What I proposed:

Delay the sales features by one quarter, and use this rare window to resolve the most painful customer issues now. I framed it as a strategic delay and not a rejection and backed it up with data, timing, and business logic.

# The question:

Was this the right call? Would you have prioritized differently? And more broadly, how do you personally approach trade-offs like this when both sides have strong revenue and stakeholder pull?

## Comments

- **Dasickninja** (24↑): Ooh this is a rough one. In my opinion, you absolutely made the right call. Losing a net new $8M? Sucks, but explainable. Losing $4.5M in longterm trust and foundational credibility? Devastating and slow to rebuild when word of mouth travels far and wide.

In terms of what I’d do differently? 

Loop in a neutral finance partner to validate the $8M projection. If it’s shaky or assumes unrealistic conversion, you gain backing for prioritizing retention.

The delay for a quarter works but you could also negotiate a “sprint zero” with Sales to mock/stage the features in pitch decks as “coming soon,” while fixing bugs in parallel. It buys Sales breathing room.

I’d create a hybrid plan if possible. For example, fix 80% of the bugs, then switch to the sales features with the remainder of the sprint window, assuming overlap in staffing.

Personally when I’ve had similar drop in to my lap I try to meet with everyone from that function in one on ones and in my pre briefing about the plan, frame it as “To land that $8M and keep it, we need a stable foundation and higher trust scores in Q4.” That shiny new 8M will quickly turn into 12M of headache down the line. You did this implicitly but having more one on ones with them to turn them from adversaries into allies will go a long way in the future.
- **pookle_bear** (8↑): Seems like a good call to me, I would have done the same, given this information. 

Unfortunately not all sides can have the features they want right now, someone has to take a delay. I tend to tell my stakeholders that fixed bugs and broken workflows can be improved and then be championed by sales as new, enhanced features ;-). 

If you have a decent core product and solid offering you may find the prospects are still interested in signing a quarter later than planned - its not a huge delay for them and they would be met with a more stable platform.

Just my thoughts - but I really really love resolving tech debt!
- **GeorgeHarter** (8↑): Will the sales team leadership donate some money from their budget to the IT budget to hire contract Devs & QAs for 6-12 months?
If the Sales VP thinks it’s really $8M, s/he should be on board investing $500k and risking their bonus. Talk to your boss about that.
  - **Zappyle** (4↑): That's the real answer here if OP wants to elevate their thinking from tactical to a more strategic and managerial level.
  - **Humble-Pay-8650** (1↑): My boss and I are on the same page about the plan. Sales normally sets higher projections, but we believe they don’t really lose anything if certain features are delayed by a quarter. Usually, I do try to include features they ask for, but this time I got a rare chance to work with the Search team to fix a long-standing issue with our search functionality and that feels more important right now. In the past, I’ve pushed this fix down the list to make room for sales-driven work, but I don’t want to miss this opportunity.
    - **GeorgeHarter** (2↑): Sales teams are responsible for closing new business deals. They actively look for customer objections to “buying today” and they become skilled in addressing those objections. 

Your sales team has probably asked some prospects “If we had feature X now, would you buy today?”  And some prospects said “yes”.  
But, even if those conversations happened, it doesn’t mean the prospects can and will close the deal if you add those features. 
Sales needs to sell what you have. 

At the same time, you, personally, need to be having so many conversations with existing users and customers; and surveying them about challenges and wants for the product, that you KNOW where to best spend resources at any given time. 
And, not just know, but can prove, with qualitative and quantitative data that the next most important issues to users & customers are X, Y, Z. Having the data makes your life a lot easier. 

When you have done all your homework, it’s easier to challenge Sales’ assumptions and promises.
- **Mobtor** (3↑): Right choice - otherwise you'd need Sales to "guarantee" 4.5M just to get back to zero.

Best case scenario you add ~3.5M if 100% of the sales landed. At the cost of how much LTV though? Acquiring new customers is usually far more expensive than retaining.

Nothing is ever guaranteed except eventual churn, especially sales projections.
  - **ayeoayeo** (2↑): yup. customer acq cost >>> and 8M isn’t totally guaranteed, there’s plenty of reasons why pen doesn’t hit paper in a sales deal with all things teed up.
    - **Humble-Pay-8650** (1↑): I would like to hear your thoughts on this approach:   
I will highlight this point 'customer acq cost >>>' to the stakeholders. But for now, I will push for the retention customers and will push the leadership to hire more devs.
- **SteelMarshal** (2↑): Build to fix 4.5 million 

Validate the features and slices for the two new products.  Try to find the leanest thing you can start with.  While youre validating, make sure you gather the data.

Then tell the story.  Keep validating until you can validate the revenue on a smaller scale and grow it based on data instead of dreams.
- **sashadikan** (2↑): I guess noone could advise you here better than you. You know your business, your clients. It might be the case, that these 2 cases clients could wait. Maybe for someone, it is that critical that they can leave you. And also, all these have to calling with the strategy and potential clients you could get/lose out of not making new feature/not fixing bugs.
- **Hour-Substance887** (1↑): It is the right call. 

1. Sales-request features are usually followed by "oh thank you, but if only you built this additional thing, we will land that $8M immediately" (it has been my experience at least).   
2. Almost all sales-request features must be validated by the PM through the Gong recording and then possibly also running through a strategic "is this a feature that would help 80% customer base in that ICP" or is it just going to be built for that 1-2 large whale customer(s) that is then more onerous to maintain in the long run and not really useful strategically for other customers. I understand it may be difficult to push back against esp. $8M, but my experience has been that overlooking the strategic aspect of any feature has been velocity killer almost all the time.
- **Stonebeast1** (1↑): Hire some contractors and do both if they are really saving that much / making that much?
- **MattFlah** (1↑): Tough one but feels like the right call. 


Fixing critical bugs should reduce your churn. What happens if you bring the $8m in, assuming partly through new customers, and they just end up leaving as products too frustrating to use.
- **Charming_Title6210** (1↑): You did the right thing. Fixing the present > working for the future. 

The only point I have is how much effort was needed for the two sales features. Was it too high? What if you had taken just one feature from those two sales features? And what if you had come up with building just a small MVP for that one feature? This might have allowed you to work on that feature after the bugs were fixed. And helped the sales team with something tangible to show to the clients. 

But I also understand this is very stretched.
