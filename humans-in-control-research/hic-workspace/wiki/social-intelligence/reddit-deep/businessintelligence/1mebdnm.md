---
id: social-intelligence/reddit-deep/businessintelligence/1mebdnm.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1mebdnm/from_aerospace_engineer_grad_to_data_analytics/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "From Aerospace Engineer Grad to Data Analytics Agency Founder and now BI SaaS Founder: Here is What I Learned Along the Way"
author: "cristian_ionescu92"
date: "2025-07-31T19:44:15.000Z"
score: 39
upvote_ratio: 0.85
num_comments: 20
flair: ""
extracted_at: "2026-06-11T18:57:56.378Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1mebdnm.md#c0"
    char_span: [0, 1989]
    sentence_count: 12
    key_terms: [department, manufacturing, months, businessintelligence, time, together, process, excel]
    concepts: [department, manufacturing, businessintelligence, months, together]
    token_count: 422
    sources: [{"n":"reddit-deep: r/businessintelligence","u":"https://www.reddit.com/r/BusinessIntelligence/comments/1mebdnm/from_aerospace_engineer_grad_to_data_analytics/"}]
  - id: "social-intelligence/reddit-deep/businessintelligence/1mebdnm.md#c1"
    char_span: [1991, 4116]
    sentence_count: 15
    key_terms: [data, engineering, tools, python, cheap, open-source, lot, processing]
    concepts: [engineering, tools, python, open-source, cheap]
    token_count: 461
  - id: "social-intelligence/reddit-deep/businessintelligence/1mebdnm.md#c2"
    char_span: [4118, 6462]
    sentence_count: 15
    key_terms: [industry, data, dashboards, understand, analytics, down, time, solutions]
    concepts: [industry, dashboards, understand, analytics, solutions]
    token_count: 505
  - id: "social-intelligence/reddit-deep/businessintelligence/1mebdnm.md#c3"
    char_span: [6464, 6520]
    sentence_count: 1
    key_terms: [questions, reading, welcome, thanks, along, lot]
    token_count: 12
  - id: "social-intelligence/reddit-deep/businessintelligence/1mebdnm.md#c4"
    char_span: [6534, 8595]
    sentence_count: 16
    key_terms: [something, industry, product, business-model-tree-michael-zadrave, thanks, like, zadrominus, building]
    concepts: [something, industry, product, thanks, zadrominus]
    section: Comments
    token_count: 506
  - id: "social-intelligence/reddit-deep/businessintelligence/1mebdnm.md#c5"
    char_span: [8597, 9001]
    sentence_count: 2
    key_terms: [moist-ad-4557, accessible, interested, processing, eliminate, catstats, headless, honesty]
    concepts: [moist-ad-4557]
    section: Comments
    token_count: 128
---
# From Aerospace Engineer Grad to Data Analytics Agency Founder and now BI SaaS Founder: Here is What I Learned Along the Way

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1mebdnm/from_aerospace_engineer_grad_to_data_analytics/)
Posted by **cristian_ionescu92** · **39↑** · **20 comments**

Hi everyone, I'm writing this because I want to share with the community things that I wish I knew earlier that would have saved me lots of time and energy.

I started off as an aerospace engineering graduate and went straight into a rotational programme with a multinational manufacturing company. Back then, I did have some familiarity with programming, especially VBA and Excel pivots, but no BI yet.  
This programme helped a lot because every 6 months I was switched to a different department, so I spent 6+ months in the quality department, 6+ months in supply chain, and then another 6+ months as a process improvement analyst.  
Having spent so little time in each department, I couldn't take on any serious initiative other than putting to good use my data analysis and Excel automation skills. So everywhere I went, I would build small VBA Excel files that would save people time.  
However, this experience equipped me with massive exposure to key company processes and helped me understand what each department needs and how it all ties together.  
**Lesson 1: Business exposure matters. A lot.**

I spent the next 2 years as a process improvement analyst and, most notably, I was attending the company's annual operating planning process, as I was responsible for putting together all the performance indicators of 10 manufacturing plants. Again, this was an experience that equipped me with a massive understanding of how manufacturing, supply chain, finance, and HR come together. During all this time I got exposed to both PowerBI and Tableau.  
**Lesson 2: Which one is better? Both. You need to know more than one BI tool.**

Next, I left the company and went to work as a data scientist. By that time, I was studying a Business Analysis and Statistics Master's degree. In my work with the previous company, I didn't have much access to the raw underlying data and databases, which frustrated me a lot. However, in the next role, I didn't get to do that much data science — I did a lot of data engineering because I cleaned up a lot of data and monitored ETL pipelines.  
**Lesson 3: Learn to program.** This will help you overcome the need for BI native connectors and having to do complicated cleanup in BI tools — open-source Python ETLs are by far the most scalable, performant, and cheap way of processing and preparing huge volumes of data.

After this role, I worked in a digital marketing agency, and for 1 year, I created a BI and data engineering department. We were using Python, a Windows server, FTP servers for data transfer, MariaDB, and QlikSense. It was dirt cheap and it did the job.

After this, I started working with my first customer, a group of email marketing affiliates, where I helped create a huge email database of +2B (yes, billion) documents on a MongoDB distributed cluster sitting on top of five 1TB Linux servers. The data cleaning, ingestion, and export were done through Python ETLs. I was also using a MariaDB database for reporting purposes, where I would aggregate the data that I needed to display in the Domo BI portal. Given the volume of data we were processing, this was again dirt cheap. But Domo was not — it was way more expensive than it should have been and is totally not worth it.  
**Lesson 4: Off-the-shelf data platform tools are expensive, and most of the time you can achieve the same result with open-source tools. Nobody cares about your tools — they care about tangible business results.**

Now, I had lots of experience under my belt and had already seen the need for data engineering, reporting, and data science in multiple industries. So I set up an agency thinking selling data analytics managed services was going to be a piece of cake because everybody needs this. And boy, was I wrong.

Now here is what it took me too long to understand: we, as data analytics specialists, realize that any data that fits into a table can be analyzed more or less in similar ways. It is just a matter of normalizing/denormalizing, etc. However, the end business users have very little understanding of the solutions they need, so you can't just walk around explaining to people that you help them... analyze their data.

You'd think they understand, but they don't. So after having had various B2B projects for 4+ years, with already six people in the company, I figured this was not going anywhere. While reaching out to potential collaborators, I came across this data analytics expert girl who gave me the best advice ever, which was: we can't work together, because I have my niche, and you have a separate niche. Each of us has an edge within a specific industry, and it becomes easier to sell and more productive to work with similar customers.

So I sat back and thought about what was the industry that we knew best — and we decided we were going to focus on the affiliate marketing industry. So we built dedicated landing pages, case studies, presentations, pop-up banners, and went to our first conference. And this is where we started having more and more relevant conversations.

Not only that, but only six months later, we launched our first SaaS product — a reporting web app. (Yes, I know, many of you will think: why would I spend 3 times the time, resources, and energy to build a SaaS with dashboards when there is Tableau and PowerBI?)  
Here is why: because once we narrowed down our focus, we understood there was a set of problems and reports that \~700 companies needed. So it made sense to spend more time creating an end-to-end web app with dashboards, user management, payments, and everything.

Our users can now just go ahead, create an account, paste their API key, and in \~30 minutes they have their dashboards. Which means we have successfully cut down the necessary time to serve one additional customer from 4–6 weeks down to... 30 minutes.  
**Lesson 5:** Nobody buys “data analytics.” They buy solutions to their specific problems. If you don’t deeply understand the industry, the workflow, and the pain points, you’ll sound generic and get ignored. ***When you're talking to everybody, nobody is listening.***

Thanks a lot for reading along, I welcome any questions!

## Comments

- **Financial-Drive-7065** (3↑): This post is packed with gold. The lesson that stood out most: niche focus wins. As someone dabbling in BI projects across industries, I've learned (the hard way) that generic "analytic" offers rarely get traction. Once you speak the language of specific industry, everything changes, sales, product design, even support. Thanks for sharing your journey and hard earned insights!
  - **cristian_ionescu92** (1↑): Yes, and it’s not like you couldn’t adapt to another industry, but it is way easier to only adjust something you already made.

Plus, as programmer, you already have libraries for most of the tools the industry uses, so you can reuse lots of code
- **mojo118** (2↑): Good Going! Wishing you all the success
  - **cristian_ionescu92** (1↑): Thanks! Same to you!
- **AssociateBig72** (2↑): This journey resonates. True scaling comes from GTM automation that gives founders back time. https://myli.in/qNmXnHKn
- **Zadrominus** (2↑): This was a really insightful read and has hit home with me in regards to something I’m building, thanks for sharing
  - **cristian_ionescu92** (2↑): Hi, I am glad you liked it. Are you also building a reporting product or a data product?
    - **Zadrominus** (2↑): I’m trying but not nearly as good as what it sounds like you’ve built!

It’s a basic app/model that attempts to simplify diagnostics of business growth I’ve coined FIDM.
I’ve used it In my actual work life in different companies so much I figured I’d try make something out of it. Everywhere I go they struggle with data overload. Mostly useful for multi site businesses to quickly give focus to ops teams.

But something doesn’t feel right about the concept and I think it’s the lack of niche that you touch on in your post. My actual work role might not transition well into an idea, also like you said, we do tend to think people just want our analytics

Built it from scratch first but then pushed it all to Replit to speed up design, I’m not a software eng. 

https://business-model-tree-michael-zadrave.replit.app 

Would love to hear your brutal honesty haha
- **Ok_Presentation1577** (2↑): Thx for sharing
- **Moist-Ad-4557** (1↑): Good point of view! I'm interested in your BI SaaS, is it public accessible?
  - **cristian_ionescu92** (1↑): Catstats.ai
    - **Moist-Ad-4557** (2↑): Thanks!
- **Storied_data** (1↑): What is your take on Headless BI - client side processing so you can eliminate query and scale costs?
