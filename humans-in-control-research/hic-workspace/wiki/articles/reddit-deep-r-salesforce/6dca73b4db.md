---
id: articles/reddit-deep-r-salesforce/6dca73b4db.md
url: "https://www.reddit.com/r/salesforce/comments/1sga21j/opportunity_object_assumes_youre_bring_in_money/"
url_hash: "6dca73b4db"
kind: "article"
source: "Reddit Deep: r/salesforce"
title: "Opportunity object assumes you're bring in money... What do you do when you're not?"
author: ""
date: "2026-04-09T00:11:19.000Z"
tier: 
method: "source-native"
extracted_at: "2026-06-11T20:30:47.067949+00:00"
chars: 7685
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
collected_at: "2026-06-11T20:30:47.101Z"
relevance: 35
engagement_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
content_hash: "d4d4215688175274"
relevance_by_goal: {"7bbd4efaae7d":35}
chunks:
  - id: "articles/reddit-deep-r-salesforce/6dca73b4db.md#c0"
    char_span: [0, 2370]
    sentence_count: 17
    key_terms: [opportunity, product, salesforce, revenue, object, amount, enablement, member]
    token_count: 506
  - id: "articles/reddit-deep-r-salesforce/6dca73b4db.md#c1"
    char_span: [2372, 4878]
    sentence_count: 16
    key_terms: [data, opportunity, management, object, processes, "it's", account, certain]
    token_count: 510
  - id: "articles/reddit-deep-r-salesforce/6dca73b4db.md#c2"
    char_span: [4881, 7347]
    sentence_count: 23
    key_terms: [product, products, opportunities, use, transactions, institution, revenue, member]
    token_count: 477
  - id: "articles/reddit-deep-r-salesforce/6dca73b4db.md#c3"
    char_span: [7349, 7914]
    sentence_count: 6
    key_terms: [opportunity, process, amount, based, sales, davecfranco, forecasting, performance]
    token_count: 120
---
# Opportunity object assumes you're bring in money... What do you do when you're not?

Source: [Reddit Deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1sga21j/opportunity_object_assumes_youre_bring_in_money/)

Looking for input from anyone who's worked with Salesforce in financial services, especially banking or cooperative/membership-based institutions!

I'm working with a client that uses Sales Cloud and currently tracks "Opportunities," but their use case doesn't fit the traditional Opportunity model at all. 

Here's the situation:

Their "opportunities" are really product enablement: getting a member institution to adopt a new product (think advances, letters of credit, etc.). There's no deal "amount" because the organization doesn't make money from enabling access. Revenue comes from individual transactions the member executes after being enabled, and that transactional data lives in a separate core banking system, not in Salesforce.

So their pipeline isn't "how much revenue are we closing." It's "how many members are we moving toward product adoption."

For anyone who's dealt with a similar pattern, where the "sale" is really product access or enablement but revenue is transactional and tracked in an external system: what's the best practice object model in Salesforce? Should they stay on Opportunity? My gut-instinct says "no" because there is no financial amount tied to it. At the same time, if they are not leveraging the Opportunity object, would I just direct their Sales Reps to try to convince members to adopt new products in a different object?

Curious what's actually worked in practice! Appreciate any war stories.

--- TOP COMMENTS ---
[11↑ -EVildoer] So when you're trying to get a member institution to adopt a new product, you have no idea roughly how much revenue it will lead to? How do you prioritize where to spend your time and effort?
[7↑ Hopeful_Touch6784] Agree, this sounds more like Recurring Revenue, sounds the amount should be set for the estimation of ARR or MRR x the period of the contract
[9↑ _JonSnow_] You could make every Opportunity a $0 amount if that’s the only issue. Requires far less change. 

Cases may be the better choice in terms of a standard object. We’ve set that up for medical device customers who want to identify hospital staff using their product that need enablement. 

Or just go with a custom object.
[8↑ owesty02] I’m a SF Data Architect. A custom object will just bring custom headaches. Start with the Oppty and adjust the page to your usage.
[2↑ El_Kikko] Yes. The opportunity itself is more for tracking pursuit decisions as well as forecasting work and expected demand (implementation & delivery) into the responsible for teams project tools. The opportunity stages indicate to them "this is how certain we are that things will happen on these dates, so plan accordingly". The $$ in the pipeline isn't usually used or reported outside of sales management and when it is it's not heavily weighted, but the $$ and how it's forecasted by sales is informed by calcs derived from the revenue objects we use. 


We have two primary revenue objects - a monthly and a rolling basis that both relate to accounts and opportunity line items; for certain products, the rolling basis has a child object that is used for the current day. Despite the time based hierarchy, it's important to note that none of the objects provide the input data for each other and their data pipelines are independent of each other.


The monthly summary is of net revenue for the account and some product metrics. We receive a file from Accounting as part of their month end closing process. The data really isn't more than what you'd see on an invoice, but because of the Accounting process that produces it, it's a gospel data set - once a record is created it doesn't get updated. This object and the monthly update drive things like commissions and territory management related processes / automations, as well as a reconciliation process of "actuals" to the opportunity(ies) for those time periods.


The rolling basis object is similar data, but as a daily summary over the last 60 days.This drives a set of sales, account management (e.g. automated renewal, upsell, and cross-sell oppty creation), marketing, and forecasting processes. It gets updated once a day. Important that it is known that this data is subject to change and that fact can be exploited to drive a bunch of internal data management and service processes via triggering things off of change history with some light weight Apex & Flows. Like if we see that March 25th totals have been revised multiple times or the revisions for specific data exceed certain thresholds, it alerts the account manager and triggers a ticket for the product / data team of the metric that triggered the alert to figure out why the data changed.


For certain products, we also have a current day object that we ingest data from a handful of other systems. It's similar revenue and usage data as above but also has real time status regarding the health of API integrations the product platform has with the client. As you might imagine, this drives a ton of service related processes.
[2↑ Rhinoridiana] There is. You already said it. 

Forecast the downstream revenue from a closed adoption. The adoption is the conversion.
[2↑ gspartnership] The scenario you describe is common in several other industries. For example, in travel, holiday companies have to persuade 'buying groups' to accept a specific product line, and then it's at the discretion of individual travel agents to sell the product lines.

That means from a business perspective, you have two challenges:

1. Persuade the member institution to adopt the product and place it on their panel of available products. This effort is essentially a sales process, albeit no money changes hands when the deal completes.
2. Engage with member executives to sell more of your product than others. Achieving this requires training and communicating with the members, along with other related activities.

The way I've handled this in the past is:

1. Create Opportunities to manage the process of getting on the panel. Use many of the standard features of opportunities (Stage, probability, type field, contact roles, and much more).
2. Use Opportunity Products to represent the specific product lines you are trying to get the member institution to accept. Use the Quantity and Sales Price fields to articulate the first year's anticipated revenue. This approach allows you to track the overall "pipeline" and prioritize effort and resources. Using reports and dashboards based on 'Opportunities with Products' gives you the management visibility you need.
3. Use Account Plans to define and track how you will engage with the institution executives and members to drive transactions once the deal is 'won'.
4. Optionally, import the transactions from the external system into a Salesforce custom object. You don't necessarily need an integration for this; you can use the Data Loader monthly to import transactions weekly or monthly. However, this gives your team easy access to valuable information; for example, are transaction volumes in line with expectations, are account plans being executed successfully, and what corrective interventions are needed?

Hope this helps!
[2↑ davecfranco] Opportunity is still usually the best for, even if your sales pipeline is not revenue based. As an aside, even with a pipe like yours, I would still always attach a dollar amount. Opening and tracking opps during the sales process serves a critical forecasting need for most orgs. You should be able to come up with a forecast based on estimated performance. It is not unusual to use opportunity to estimate and then an Order process for actuals as the occur.

Regardless, you can easily ignore the amount field or set it to zero.
