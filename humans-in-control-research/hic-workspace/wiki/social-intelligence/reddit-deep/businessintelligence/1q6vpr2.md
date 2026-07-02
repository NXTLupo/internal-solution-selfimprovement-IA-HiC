---
id: social-intelligence/reddit-deep/businessintelligence/1q6vpr2.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1q6vpr2/setting_up_bi_for_multientity_company_structure/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Setting up BI for multi-entity company structure - where do I even start?"
author: "gentlebeast06"
date: "2026-01-07T23:42:25.000Z"
score: 28
upvote_ratio: 1
num_comments: 19
flair: ""
extracted_at: "2026-06-11T18:57:56.375Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1q6vpr2.md#c0"
    char_span: [0, 1546]
    sentence_count: 12
    key_terms: [businessintelligence, business, through, consolidated, multi-entity, data, llcs, need]
    concepts: [businessintelligence, business, through, consolidated, multi-entity]
    token_count: 331
    sources: [{"n":"reddit-deep: r/businessintelligence","u":"https://www.reddit.com/r/BusinessIntelligence/comments/1q6vpr2/setting_up_bi_for_multientity_company_structure/"}]
  - id: "social-intelligence/reddit-deep/businessintelligence/1q6vpr2.md#c1"
    char_span: [1560, 3535]
    sentence_count: 15
    key_terms: [separate, shopify, data, sources, google, sheets, database, keep]
    concepts: [separate, shopify, sources, google, sheets]
    section: Comments
    token_count: 451
  - id: "social-intelligence/reddit-deep/businessintelligence/1q6vpr2.md#c2"
    char_span: [3537, 5959]
    sentence_count: 17
    key_terms: [reporting, accounting, entity, separate, consolidated, legal, data, use]
    concepts: [reporting, accounting, entity, separate, consolidated]
    related_chunks: ["social-intelligence/reddit-deep/businessintelligence/1q6vpr2.md#c3"]
    section: Comments
    token_count: 504
  - id: "social-intelligence/reddit-deep/businessintelligence/1q6vpr2.md#c3"
    char_span: [5961, 7565]
    sentence_count: 14
    key_terms: [separate, entity, model, team, nockpoint, sometimes, together, product]
    concepts: [separate, entity, model, nockpoint, sometimes]
    related_chunks: ["social-intelligence/reddit-deep/businessintelligence/1q6vpr2.md#c2"]
    section: Comments
    token_count: 357
---
# Setting up BI for multi-entity company structure - where do I even start?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1q6vpr2/setting_up_bi_for_multientity_company_structure/)
Posted by **gentlebeast06** · **28↑** · **19 comments**

Just formed two LLCs (main operations + holding company) through [InCorp](https://www.incorp.com/) for asset protection reasons. Now I'm realizing I have zero plan for how to track data across both entities.

Context: E-commerce business, around $500K annual revenue split between the two LLCs. Product sales go through one, real estate/assets through the other. My accountant recommended this structure but now I need to report on both separately AND consolidated.

Current mess:

* Shopify data in one LLC
* Rental income tracking in Google Sheets for the other
* No unified view of total business performance
* Tax season is going to be a nightmare

Questions:

* How do you handle BI when you have multiple legal entities under one operational business?
* Can Power BI or Tableau connect to data sources tagged by entity? Or do I need separate dashboards?
* Anyone dealt with consolidated reporting across LLCs? What's the best practice?
* Is there a way to automatically track which transactions belong to which entity?

I'm technical enough to set up basic dashboards but multi-entity accounting + BI is beyond me right now. My CPA just says "keep them separate" but doesn't understand I need to see the big picture too.

Any guidance appreciated.

## Comments

- **byebybuy** (5↑): A "mature" BI solution will have out-of-the-box connectors for each of your sources. Shopify and Google Sheets are very common ones. Generally the flow is: connect your sources separately, pull sources in (and maybe create automated, scheduled syncs, so your data is coming in daily or whatever), and then transform that data, join it together, and build a dashboard off of that clean, joined data.

I'm honestly not sure why you want to pull them both together though. BI is for making business decisions, and you wouldn't use the performance of one completely separate business to make decisions about the other. Like whatever you're selling on Shopify isn't going to impact where you purchase your next rental property.

I get that you want reporting for tax purposes. But if your CPA says keep them separate and he's the one dealing with the taxes, then fuck it, keep em separate.

If I really want a combined report I'd probably just download a Shopify report into Google Sheets and transform it there and slap some pie charts on it.
- **JackD1875** (8↑): If you have any familarity with Excel, Datarails is an easy jump to solving consolidation, etc.
  - **Rave_Damsey** (1↑): The dashboards don’t work well
- **Key_Friend7539** (3↑): Separate them by org id, or by separate schema in the database.
  - **silverwing90** (3↑): This. Make a database, put data from both into the database, separated by schemas. Then you have one source for both data points. You'll obviously need some etl connector for this but you can most likely build one in python or use a low cost cloud based tool (AWS or azure).
- **ZonkyTheDonkey** (2↑): Are Shopify and Google sheets your only data sources? Do you have employees or just you?

If you’re flying solo you can keep a premium tool like Power BI for free on desktop only and not worry about any costs. They’ve got a built in Shopify and Google Sheets connector that should get you up and running quickly enough. 

As long as your data has some type of breakdown as to belonging to entity 1 or 2 you can use that as a filter easily enough.
- **venkateshprabhu10** (1↑): One easy approach for your case is to use Power Bi for consolidated reporting. Shopify and Google Sheets can be directly connected as well. But in the long run as your entities grow it will definitely become a mess when you want to do org wide reporting. 

If you want to follow industry standards right from beginning then you can tag your sources separately and push them to a cloud where you can transform your data and use any BI tool to view consolidated reports.

If you can DM me the details of the volume I can suggest further
- **BeesSkis** (1↑): Setup separate companies in your accounting software of choice. Business Central has decent out of the box APIs. Register it as an app in your Azure tenant. The tables are mostly already setup for reporting with relatively straightforward data modelling in PBI.
- **AnalyticsGuyNJ** (1↑): Power BI and Tableau can technically handle this, but you usually end up with duplicated models or fragile filters unless you design a clean entity dimension from day one. The real best practice is keeping sources separate at the accounting level while reporting on top of a semantic layer that understands entity ownership and consolidation rules. This is where the app we use, StyleBI, helps because it naturally mashes up Shopify, spreadsheets, and accounting data while letting you tag and report by LLC or roll everything up cleanly. You get separate and consolidated views from the same model instead of stitching together dashboards every time tax season or strategy discussions come up.
- **HarbaughCantThroat** (1↑): There are many ways to solve this problem. All have pros and cons. I'm just commenting to call out that BI tools don't know or care about how many legal entities you have. From a BI tool's perspective, there's no difference between having two different legal entities in your reporting vs. having two different departments that are part of the same legal entity.

You seem very focused on how your legal structure impacts BI, which is not very relevant.
- **LowerDinner8240** (1↑): We deal with this exact thing and the trick is not overthinking it.

Keep the LLCs separate legally and in accounting, but don’t split your reporting model by entity. That’s where people create pain for themselves.

Our setup is basically:
sources stay separate
we model everything together in dbt
every model has an entity column

So Shopify orders, rental income, costs etc all land in the same fact tables, just tagged by entity. Consolidated vs per-LLC is literally just a filter.

Power BI / Tableau are fine with this. You don’t need separate dashboards unless you’ve got permissions to worry about. Same dataset, entity slicer, done.

For “how do I know which transaction belongs to which LLC”:
sometimes it’s obvious from the source (store, bank account, property)
sometimes it’s a small mapping table in dbt
that’s normal, not a hack

The biggest mistake is building two parallel BI setups and trying to stitch them together later. Model it once, properly, downstream.

Your CPA saying “keep them separate” is correct for tax filings, not for how you actually need to see the business.
- **Conscious-Cattle6088** (1↑): hey u/gentlebeast06 \- thanks for posting. Might be able to help you out here. This is a BI tool we've developed for modern teams in SMBs and startups, called Nockpoint (https://nockpoint.com) getting you to your decisions faster than traditional tools.   
  
We're currently offering a free 1-hour deep dive with a expert team to give founders on-the-ground support, in exchange for product feedback. Our data team of real humans will go through your specific case to see the best way forward and product time will provide hands-on support with data connection, custom dashboard setup and more. If you want to talk to a pro for free, please DM and I'll get you connected to our team! Cheers!
