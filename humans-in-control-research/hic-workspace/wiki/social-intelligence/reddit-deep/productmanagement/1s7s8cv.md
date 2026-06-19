---
id: social-intelligence/reddit-deep/productmanagement/1s7s8cv.md
url: "https://www.reddit.com/r/ProductManagement/comments/1s7s8cv/struggling_as_junior_pm_for_database/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Struggling as junior pm for database"
author: "Reba_"
date: "2026-03-30T14:31:40.000Z"
score: 17
upvote_ratio: 0.9
num_comments: 28
flair: "Learning Resources"
extracted_at: "2026-06-18T13:35:35.643Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c0"
    char_span: [0, 2330]
    sentence_count: 24
    key_terms: [data, product, common, struggling, reporting, productmanagement, model, comments]
    token_count: 505
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c1"
    char_span: [2332, 4939]
    sentence_count: 21
    key_terms: [requirements, user, stories, reports, column, everything, refinement, data]
    token_count: 510
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c2"
    char_span: [4941, 7060]
    sentence_count: 20
    key_terms: [technical, manager, experience, often, different, product, stakeholders, call]
    token_count: 429
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c3"
    char_span: [7062, 9501]
    sentence_count: 23
    key_terms: [data, database, work, piece, architect, engineers, collaborative, often]
    token_count: 510
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c4"
    char_span: [9503, 10231]
    sentence_count: 10
    key_terms: [engineers, data, sql, months, rajesh, given, train, write]
    token_count: 158
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c5"
    char_span: [10246, 12123]
    sentence_count: 12
    key_terms: [high, manager, understand, product, project, effort, impact, stress]
    section: Comments
    token_count: 453
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c6"
    char_span: [12125, 12585]
    sentence_count: 2
    key_terms: [like, c4zpv1ld53nb9dow, noplanstonight, generalized, n16of5jksoi, companies, questions, specific]
    section: Comments
    token_count: 134
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c7"
    char_span: [12587, 14851]
    sentence_count: 27
    key_terms: [product, success, data, like, reports, roadmap, requirements, engineering]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c8"
    char_span: [14565, 16803]
    sentence_count: 23
    key_terms: [need, work, product, project, stories, "don't", participate, data]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c9"
    char_span: [16492, 17008]
    sentence_count: 4
    key_terms: [user, stories, project, broken, piece, tasks, deliverable, delivering]
    section: Comments
    token_count: 105
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c10"
    char_span: [17010, 19288]
    sentence_count: 18
    key_terms: [data, product, stakeholders, get, pms, team, particularly, requirements]
    section: Comments
    token_count: 467
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c11"
    char_span: [19290, 21381]
    sentence_count: 23
    key_terms: [product, data, stakeholders, months, year, because, don, role]
    section: Comments
    token_count: 482
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c12"
    char_span: [21383, 23067]
    sentence_count: 11
    key_terms: [stories, agree, data, feel, user, building, defined, working]
    section: Comments
    token_count: 431
  - id: "social-intelligence/reddit-deep/productmanagement/1s7s8cv.md#c13"
    char_span: [23070, 23932]
    sentence_count: 5
    key_terms: ["you're", consider, support, proper, safe-analysis-5804, sure, too, cobramullet]
    section: Comments
    token_count: 192
---
# Struggling as junior pm for database

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1s7s8cv/struggling_as_junior_pm_for_database/)
Posted by **Reba_** · **17↑** · **28 comments**

I was hired 8-9 months ago to work as a junior product manager for a data engineering team in a large (c. 5000 employees), international

consultancy. My product, so to speak, is our data platform.

I am looking for advice from this wonderful community, as I have been struggling to understand and unpack the following:

1. What does success look like for a product manager in data products?
2. Are there any product managers for data platforms out here? Would love to connect!
3. How do I identify and approach what is within my area of responsibility and control?
4. How do I best mitigate the effects of what is outside of my control?
5. Practically, is this role even product management from what I am describing?
6. Are there any red flags in my behaviour I should be aware of and work on?

This will be a wall of text. Please read at your own discretion! I always appreciate honesty, but please be kind in your answers as I am really struggling with my mental health and imposter syndrome at the moment.

I’m trying to improve and have read some books recommended here, as well as done the Azure Fundamentals course!

Books:

1. Inspired, Marty Cagan
2. Thinking in Systems, Donella Meadows
3. Radical Focus, Christina Wodtke
4. Non-invasive Data Governance, Rob Steiner

# My scope

My main scope right now is migrating our database and enterprise (Finance, HR and Sale Operations) reporting suite onto a Common Data Model. The Common Data Model is a “clean” version of our data intended for consumption, with better naming conventions, cleaner tables, definitions for all columns and provides a clear single source of truth for all data points.

The main problem this solves is the disparate versions of truth for certain data points spread across multiple reports built by different teams. As you can imagine, this is especially impactful for financial reporting. It will ensure the business has a common definition for each data point they report on.

Coupled with the CDM, I also have to gather requirements for reporting requests that come through.

# My struggles

**Common Data Model**

This CDM is not difficult to design, but it is to implement. We have successfully built most of it for enterprise data (Finance, HR and Sales Operations) and are now focusing on building out the gold layers which will then be made accessible to the business.

The issue is adoption by Finance. They have dozens of reports that run off raw data and are going through a transformation period that makes it impossible for them to tell me which reports they want us to migrate or recreate via the CDM. They are always incredibly strapped for time and under very high pressure.

This makes it very difficult to co-create a gold layer that works for them, and I have to work off assumptions by analysing usage logs on reports used by the Finance team.

**PowerBI Reporting**

I struggle immensely with my role in building PowerBI reports. When requests come through, the expectation is that I will have all the requirements gathered before the next refinement session.

However, I am not always able to gather in-depth requirements for each and every column, measure and visual in the report. When I do, the user stories I create are enormous, as a report can have multiple pages with different data points. When I tried breaking up the user stories to make them more manageable, the team pushed back and said they preferred everything in one user story.

Often times, it takes months to complete a new report request. This means that single user story stays in the sprint for weeks and weeks.

Additionally, I don’t know how exact I need to be when gathering the requirements. Should I be defining the logic for each and every column? Should I be figuring out the data sources for each column? Is it enough for me to just give a business definition of what the column should return and let the engineers figure the rest out?

Also, I am really not fast enough to gather information for everything in time for refinement and things often become clearer once development begins. Not sure how to tackle this, as my user stories don’t feel “sprint ready” but it’s better to start rather than standing still.

We are collectively terrible at defining timelines and are often much later than originally promised in delivering projects. I know this is my job, so would love some advice on how to be better!

**Writing user stories**

I take a really long time writing user stories and struggle to get everything that needs to be in them before refinement. I also have difficulty in getting the team to vocally push back against unrealistic or unreasonable requirements, or to point out requirements I have not gathered.

I struggle with the amount of detail that goes into requirement gathering for reporting, as one report can have dozens of different visuals with different logic and engineers have said they want everything in one use story. I take hours to write these, even when using copilot, because of the level of detail I need to get to.

I feel panicked during refinement and feel like I need to develop a better way of conveying information in the team. Our company does not traditionally write PRDs and my manager was not receptive of the idea when I proposed it.

**My manager**

Let’s call my manager Joe. Joe comes from a consultancy background and, to the best of my knowledge, does not have extensive experience in product. He was been promoted into his current role a few months before I joined and his main focus is creating an internal tool for our company much like Lilli’s AI tool for Microsoft. Let’s call this tool Billi. I think you could say he is the PM for Billi, although he takes that title reluctantly.

When he onboarded me, he explained he really had no previous experience in agile or product management. He said he did not know what a product manager was. I gave him a copy of Inspired by Marty Cagan to read at the very least. He did, to his credit. He is very respectful of my opinions and previous experience in general, and seems genuinely concerned in helping me in my career. However, his lack of technical knowledge and expertise in this space very often leaves me adrift and unsure of the best move for me.

**The technical lead**

Let’s call the technical lead Rajesh. Rajesh has worked as the technical lead for the data team for 4-5 years. He reports into Joe. He is very knowledgeable, although often arrogant. There have been complaints from several different stakeholders that he does not take into consideration their points of view when making decisions or plans. He’s antagonised some stakeholders from other teams and the fallout often is on me to deal with.

He will often severely underestimate how long it takes to deliver something by making decisions for the rest of the data team.

For example, he once affirmed, via email, that we would be able to deliver a piece of work I had been completely unaware of by a specific date. It took me a week to piece together what the work in question was and to scope it out. We are now overdue from the promised date by more than 2 months. He’ll estimate a piece of work takes 3 hours and it takes 2 weeks or more. This is a serious issue for me as it’s really difficult for me to create timelines for the business.

He also will affirm that a particular engineer “has everything they require” to start on a piece of work during refinement, despite that often not being true. Some engineers push back and others don’t. I always question this, but I am non-technical, so struggle to identify when he is or isn’t bullshitting. He says the engineers complain too much and want everything handed to them. He assumes things about the work and is often wrong is his judgement.

He has told me I lack the depth or skill to do my job well and I need to study more. I do believe there is at least some truth to this, as I had not worked in a data engineering team before. I know how to write SQL, use PowerBI, understand the basics of database administration and security, the flow of data from source systems to the database, but that’s it. I am currently studying Azure fundamentals to improve.

I have a weekly 1-1 with Rajesh and try to catch up with him every day. Communicating with him is a bit difficult for me, though, as he tries to dictate the course of action without consideration for other viewpoints.

I’ve raised the above to my manager repeatedly and I think things have improved. Rajesh and I have a decent relationship as people, we get on well, but I often don’t feel we are collaborating and I am being told what to do and am the last to know.

**Database administrator**

Ben is our database admin and spends most of his time performing maintenance tasks, ingesting new tables into our database, security audits and disaster recovery. He also builds views and semantic models. He is now assisting our database architect in creating a Common Data Model for enterprise consumption of our data.

He is a pretty chill guy, very collaborative and open to chat.

**Data architect**

Craig is our data architect and is mainly responsible for designing our Common Data Model. Very experienced and collaborative. Will happily talk me through complex concepts.

**Data engineers**

We have 3 data engineers. They are required to ingest new data sources into the database, as well as publishing Ben’s views and semantic models. They write SQL and build PowerBI reports.

It was revealed a couple of months ago that one of the data engineers, Mike, that was hired with me, does not know how to write SQL. Mike even struggles to vibe code simple DAX or SQL.

We found this out two months ago as tasks given to him would never get completed or were delivered with massive errors. He got by until now by getting the other engineers to help him out.

Rajesh is trying to train him up. This is fine by me. My only issue is Rajesh insists on giving him complex reporting projects given to us by the business to train h

## Comments

- **Justice4Ned** (23↑): I’ve done what you’re doing before. I only skimmed your post but you need to insert yourself closer to your users: the finance folks. You have to understand why they’re busy and under high stress, and then know intimately how your product helps them reduce stress. Even if they’re extremely busy you have to find a way to do this.. even if it means shadowing calls. 

You can use a RICE framework or whatever, but the golden rule is to find things that are lower in effort and high in impact, and balance that with things that are high in impact and high effort. Once you’re delivering things that are an asset to your users instead of a burden, they’ll open up time for you. 

Everything else to me is secondary. Once you understand their problems well, you’ll be able to litigate the nitty gritty with your engineering team because you’ll know what’s important to the value creation and what’s not (details like how a story is written rarely matter).
  - **PhBalanceNightmare** (3↑): Hey OP, this poster is 100% right.
- **Soaring_Eagle2410** (7↑): Almost in the same boat. Took a new role as SPO for Data and having a difficult time with stories and tech lead. Commenting to come back to look at the suggestions of others
  - **Reba_** (4↑): Hi would love to connect and help each other out!
    - **Weird-Yesterday5119** (4↑): I am in an identical situation to this, how spooky! Facing the same challenges as you both alongside not getting any support from the data architect with helping to define the CDM
- **[deleted]** (11↑): You are a project manager not Product manager.
  - **Intelligent-Mine-868** (4↑): I was thinking this too. If you’re not writing PRDs then it sounds like a business analyst or project manager.he shouldn’t need to be in the weeds so much.
  - **Rude-Suit4494** (2↑): I agree with this assessment, unfortunately for OP. 

My guy, you might be able to salvage this, but the change will be a lot of work and it sounds like literally no one wants it but you.
- **NoPlansTonight** (5↑): I feel like you're way into the weeds and could use a step back and/or more generalized advice

https://youtu.be/n16OF5JKsOI?si=C4zPv1LD53NB9dow
- **bxie** (5↑): Data PM for two roles over \~5 years, but at 50-200 sized companies so take this with a grain of salt. 

First, your specific questions: 

1. What does success look like for a product manager in data products?
   1. I've found myself accountable for two related outcomes. 1) the service oriented side of things, which is handling inbound requests for ingestion, reports, etc. ie. delivering and maintaining finished reports to users and 2) the data infrastructure required to deliver on 1. I have a backlog of requests for #1, and a roadmap for #2 and you're spending \*at least\* 20% of your time working on that roadmap. Requirements for 1 come from your stakeholders, but requirements for 2 come from your engineering team. 
   2. Success looks like reports being turned around in the amount of time you say they're going to be turned around, and when they can't be, you can point to a piece on the roadmap that would reduce that turnaround time but you maybe can't prioritize quite yet. Nothing should be your "fault" it's just a well documented set of circumstances that you can talk about and escalate if needed. You touch on this a few times, I'll comment in the red flags section. 
   3. Above all - success is something you need to define with your team. You all need to be aligned on the same goal before you can make any meaningful progress, so what does success look like to them? 
2. Are there any product managers for data platforms out here? Would love to connect!
   1. Hi! 
3. How do I identify and approach what is within my area of responsibility and control?
   1. Trial and error. I personally tend to ask for forgiveness and not permission. I'll call out that your engineering manager is probably crossing some lines but it's because they don't trust you and they're just trying to help. Assume good intentions and be curious and direct. 
4. How do I best mitigate the effects of what is outside of my control?
   1. Better to be on the offensive IMO. I'll share a few thoughts in #6
5. Practically, is this role even product management from what I am describing?
   1. More or less, sure. Every product role I've ever been in has been a blend of project, program, and product management. The lines don't matter so much as "what does this work look like on my resume". When it comes to data PMing, what I've prioritized is being able to demonstrate the outcome of my work. Managing a data migration is typical work you'll do, but why? What was the outcome? What was your specific inputs and outputs that led to this work? 
6. Are there any red flags in my behaviour I should be aware of and work on?
   1. Marty Cagan's book is... an interesting choice. It assumes that Product managers don't also have to bear the responsibilities of program, project, and scrummastering - which doesn't really happen for data PMs in my experience. We're expected to be a LOT more hands on, especially with the advent of LLMs. 
   2. Re: your struggles with Finance. Ideally you need them to be engaged, at least in the development of a proper bus matrix and list of top reports. This one sounds to me like it's an escalate - if you're not getting the participation you need on a high priority initiative, you need to document clearly what you need, from whom, etc. JTBD and RACI charts are a helpful tool here - somebody up the chain of command is accountable for the success of the full initiative - I doubt you need to go very high up the chain though.  To be clear, it's also on you to make it as straight forward as possible for them to participate. So DO analyze those usage logs and get them to sign-off on it. Document every opportunity you give them to participate, to steer, etc.. If they're not sure, you can't be either. That's okay, but don't take the fall for that. 
   3. Re: PowerBI Reporting - the questions that come to mind for me here are 1) what does your intake process look like? If folks have specific requirements why aren't they communicating that upfront as part of t
- **Pandas1104** (3↑): I know it is hard to push back on huge user stories but I am picking up this as one reason you are having issues delivering on time and your team can't project anything. User stories should be a small deliverable that is testable, it isn't an entire feature. User stories can be broken into tasks, each of which should be estimated piece by piece. If you have some giant user story that is not even broken into tasks it is not surprising you cant project timelines and don't find bad stuff before you are halfway through any one sprint.

I am happy to talk about what our team does, some of which may help you but this problem is best solved partnering with your head of dev, scrum master, whoever on your team is responsible for the developers output. Working with the devs without being in lockstep with their leader will lead to frustration and difficulty
- **PhBalanceNightmare** (3↑): Hey, your experience mirrors mine almost exactly…particularly being a product nerd and everyone else not and being pushed around by engineering.

Get out as fast as you can, this will hurt your product career. It’s too niche of a product area, no one understands it, you’re an annoying dumping ground for other PMs requirements and the only really good data PMs are incredibly senior/have many years experience.

There are 3 kinds of data products (all the same INVEST or RICE type of product theories still apply to defining whether a data product value…you don’t need to know any further data skills, it won’t help from a product perspective.)
1. Data extraction - you get these from other PMs projects or have to get buy in from elsewhere in the business for a particularly valuable data set.
2. Data modelling - importantly, NOT data science models… but modelling several related sources into a table that may be very useful for analysts, company flagship KPIs. These projects can be tricky as you’re getting your stakeholders to agree the definition of a particular business metric. YOU are not responsible for defining this, or you’ll be “fixing” “wrong” metrics forever. But they are rewarding overall. 
3. Automation - is an analyst spending a lot of time running something that could be automated? These are usually low hanging fruit products.

There’s ofc - DWH upgrades or new DWH capabilities…architecture and your most senior data PMs and your data leadership to discover, agree and define. 

Your problems with engineers / lead - yeah, fairly common. If there is a wider engineering leadership, they should be tracking team agility. As for Rajesh and your stakeholders, don’t invite him to meetings with them. He’s there to advise technical feasibility, you just talk to your stakeholders, find value, get requirements etc. They should really only interact with the team when there are problems or testing to do.

User stories, you don’t have to know all the technical information - that’s not your job. The team do know this. Make sure your architect is in refinement…they will certainly know the technical specifics. You provide the requirement and the business value (as this I need that etc). Refinement will be painful for a year until you get some experience with the team. But grin and bear it.

Tips:
-Analysts are not your stakeholders - they’re your collaborators. 
-Heads of are your stakeholders. Put in regular meetings with them and even work towards an education piece on what you and your team do.
-PMs are your stakeholders, but they dread hearing from you. Grin and bear it and put in regular time with you - the amount of active projects I’d discover already in progress that had a ton of data requirements. 

Source: 4 years as a data pm, junior to senior, and I still don’t know anything beyond basic sql, and nothing of power bi type tools. Product principles apply across product no matter what the product is.
  - **Reba_** (1↑): Hi! Thank you for your response. Would you be ok for me to DM you?

I’ll try to respond to some of your points below

1. Get out as fast you can, this will hurt your product career

I am afraid of doing this because I have not yet stayed more than 2 years in any one role. I am 28 and really don’t want to become a walking red flag to recruiters. So far I’ve stayed

1. 1 year and 5 months at an HR internship. I left because I did not enjoy working in HR.

2. 1 year and 3 months working in SEO role at a startup, collaborating with a developer to optimise websites. I left because I wanted to move abroad and move into product.

3. 1 year and 9 months as an APM at a scale up. Was made redundant.

4. 9 months in this role.

I am afraid of leaving too early and this negatively affecting the perception of me.


2. The three kinds of data products.

Thank you for laying this out for me.

a) When you say data extraction, is that making accessible to the business data from useful sources they may not have had on hand previously?

b) Data modelling

I feel we are doing this right now by creating the gold layers of our common data model, as we are working to create views that contain only useful and clearly defined data points.

c) Automation

Agree this is incredibly useful, but for this I will need to start working closer with our users (ie Finance) to identify these opportunities. I have been struggling with this as they are very, very busy and I feel I am causing them distress by engaging more than the absolute minimum. Still trying to figure out how to approach.

3. DWH upgrades or new capabilities

Ironically, I am the most senior data PM in this organisation 😅 Agree that it makes sense for this to be discovered, agreed and defined by architecture and tech lead.

4. User stories

Agree with your points. It feels like where I can provide the most value is in user stories for building reports, as these are smaller and more contained pieces of work. I am also better able to understand what is needed from the business and stakeholders. I struggle a lot with building user stories for the CDM or more technical stories. For example, what columns and tables exactly need to be in a gold layer and why.
    - **PhBalanceNightmare** (1↑): Yeah feel free to DM me!
- **cobramullet** (2↑): Too long, I didn't read - but I gave it to Claude asking it to translate to an old language. 

>**In Old Irish**: _Ní mór duit comrád níos láidre a lorg ó do bainisteoir nó ó mentur seachtrach, óir atái ag obair gan tacaíocht theicniúil cheart. Caithfidh tú teorainneacha soiléire a shocrú le Rajesh agus diúltú do mheastacháin míréadúla. Má leanann an t-anbhá seo, smaoinigh ar ról eile laistigh den chuideachta nó lasmuigh di._


>**In Modern English**: _You need to seek stronger guidance from your manager or an external mentor, as you're operating without proper technical support and clear PM leadership. You must set firm boundaries with Rajesh and push back on unrealistic estimates and scope creep. If this chaos continues, consider finding a different role either within the company or elsewhere where you'll have proper support structures._
  - **cobramullet** (2↑): And feedback -- your post is too long, too much focus on unnecessary detail (names, even if they're fake).. Not sure why you're building PowerBI reports. You should consider using code gen to help you accelerate that.
- **Safe-Analysis-5804** (1↑): I’ll be very honest I just read the last part.  if you're doing more work than needed then make sure to develop that as leverage for later
- **champa3000** (1↑): Dm me
