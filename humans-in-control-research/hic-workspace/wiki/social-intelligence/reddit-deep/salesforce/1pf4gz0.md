---
id: social-intelligence/reddit-deep/salesforce/1pf4gz0.md
url: "https://www.reddit.com/r/salesforce/comments/1pf4gz0/anyone_else_at_financial_services_firms_also/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Anyone else at financial services firms also required to buy shield for encryption at rest with keys?"
author: "Remarkable-Captain14"
date: "2025-12-05T19:37:26.000Z"
score: 7
upvote_ratio: 0.89
num_comments: 16
flair: "help please"
extracted_at: "2026-06-11T18:58:38.961Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1pf4gz0.md#c0"
    char_span: [0, 915]
    sentence_count: 10
    key_terms: [salesforce, business, firms, buy, encryption, financial, comments, services]
    token_count: 214
  - id: "social-intelligence/reddit-deep/salesforce/1pf4gz0.md#c1"
    char_span: [930, 2585]
    sentence_count: 7
    key_terms: [pretty, shield, security, data, time, compliance, royalbroke, salesforce]
    section: Comments
    token_count: 388
  - id: "social-intelligence/reddit-deep/salesforce/1pf4gz0.md#c2"
    char_span: [2587, 4067]
    sentence_count: 8
    key_terms: [data, remarkable-captain14, proper, department, restricted, company, actual, system]
    section: Comments
    token_count: 338
---
# Anyone else at financial services firms also required to buy shield for encryption at rest with keys?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1pf4gz0/anyone_else_at_financial_services_firms_also/)
Posted by **Remarkable-Captain14** · **7↑** · **16 comments**

We run our Salesforce org at a large financial services institution in the US. We run it out of the business.  Our IT area is forcing us to buy encryption at rest with keys so shield for our Salesforce org but they’re not giving us any money to do so.  Do other banks or invest mgmt firms require you as the Salesforce head or admin to buy it? Or is my IT area just absurdly conservative? Lmk! 

Edit- we don’t have private client data and there are such as Social Security numbers or tax IDs. It’s all business to business level opportunities, and business contacts at those firms.  So private data is limited.

## Comments

- **Royalbroke** (15↑): As another large financial firm with PII data in Salesforce we were also required by CISO to buy shield. Seems pretty standard and not ideal that you have to take on another 10% cost to your Salesforce but it is what it is. 

The event monitoring is huge and gives you great insight for compliance as well since you can track pretty much anything in the system. We use the transaction security policies to limit data being exported from reports and keeps someone leaving from taking that data with them as well.
  - **IllPerspective9981** (3↑): Did you get it for 10% of spend? Our AE quoted us 30%
    - **leifashley27** (2↑): I'm a consultant in the insurance industry and see Shield quite a bit. I see 20% of total spend pretty regularly, 10-12% depending on the time of year the contract renews (EOQ, FY EOY tend to get the best discounts).
    - **Royalbroke** (1↑): Pretty sure we’re paying like 12.5% of our total license costs but we’re a very large org so maybe that’s why we got a discount.
- **Nanomaterials** (5↑): We work for financial services and have done several Shield implementations. It’s usually bigger firms have it and some smaller firms that operate just in US don’t.
- **erjoten** (4↑): each time i had to have shield was not for security reasons, but more for compliance - specifically extended field audit, sometimes the masking. the encryption itself was an addition, not the driver. each time also it was consumer-facing in a regulated industry. 

the thing about security teams in corporate IT is that they have standards they want to implement across their landscape in a one-size-fits-all approach. 

honestly, you'd need to work on proper argumentation around actual legal requirements vs what you actually do in the system. you should have some sort of checklist where encryption at rest would apply. you should also have a data dictionary with proper data classification - clearly stating if restricted and highly restricted data even exists in the system. without this you cannot build a proper case to be exempt from blindly enforced policies.
- **Ok_Wealth_7711** (3↑): First off, any contact data like names and emails is PII. Secondly, which department pays for it is a purely internal decision. If you're at the level of approving the Salesforce spend, then you're at the level of negotiating internally which business unit covers it. Every company is different in how they handle budgets, there is no single right answer.
- **Remarkable-Captain14** (2↑): Their pricing is all over the place! It’s like they make it up not based on any actual cost to them.
- **ThanksNo3378** (2↑): Who cares which department pays for it? Main thing is to keep data secured
  - **Remarkable-Captain14** (1↑): It’s already encrypted with hyperforce but they want us only to have the keys.
- **oktnxbai** (1↑): Had a client that removed Shield tax, it was 25% on top 💀.

Previous chief info sec years back was sold on the idea that it is mandatory, turns out it is overkill from what the company policy even required.

They spread out the 'savings' to get a few more licenses and data cloud.
