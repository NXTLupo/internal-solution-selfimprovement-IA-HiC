---
id: social-intelligence/reddit-deep/dataengineering/1lcprv1.md
url: "https://www.reddit.com/r/dataengineering/comments/1lcprv1/im_data_engineer_but_doing_power_bi/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "I'm Data Engineer but doing Power BI"
author: "Irachar"
date: "2025-06-16T10:56:28.000Z"
score: 177
upvote_ratio: 0.94
num_comments: 76
flair: "Career"
extracted_at: "2026-06-11T18:58:17.207Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1lcprv1.md#c0"
    char_span: [0, 1234]
    sentence_count: 8
    key_terms: [power, databricks, data, "i'm", engineer, dataengineering, want, pipelines]
    concepts: [power, databricks, dataengineering, engineer, pipelines]
    token_count: 291
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1lcprv1/im_data_engineer_but_doing_power_bi/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1lcprv1.md#c1"
    char_span: [1248, 3211]
    sentence_count: 7
    key_terms: [data, "you'll", visualisation, working, learning, dataengineering, "don't", right]
    concepts: ["you'll", visualisation, working, dataengineering, learning]
    section: Comments
    token_count: 454
  - id: "social-intelligence/reddit-deep/dataengineering/1lcprv1.md#c2"
    char_span: [3213, 4944]
    sentence_count: 7
    key_terms: [data, business, stakeholders, power, tools, dashboard, lifecycle, engineer]
    concepts: [business, stakeholders, power, tools, dashboard]
    section: Comments
    token_count: 402
  - id: "social-intelligence/reddit-deep/dataengineering/1lcprv1.md#c3"
    char_span: [4946, 6784]
    sentence_count: 15
    key_terms: [data, power, right, "i'd", analysts, doing, job, want]
    concepts: [power, right, analysts, dashboards, doing]
    section: Comments
    token_count: 431
  - id: "social-intelligence/reddit-deep/dataengineering/1lcprv1.md#c4"
    char_span: [6786, 7714]
    sentence_count: 6
    key_terms: [perspective, technical, skills, get, engineering, interesting, opportunity, everything]
    concepts: [perspective, technical, skills]
    section: Comments
    token_count: 206
---
# I'm Data Engineer but doing Power BI

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1lcprv1/im_data_engineer_but_doing_power_bi/)
Posted by **Irachar** · **177↑** · **76 comments**

I started in a company 2 months ago. I was working on a Databricks project, pipelines, data extraction in Python with Fabric, and log analytics... but today I was informed that I'm being transferred to a project where I have to work on Power BI.

The problem is that I want to work on more technical DATA ENGINEER tasks: Databricks, programming in Python, Pyspark, SQL, creating pipelines... not Power BI reporting.

The thing is, in this company, everyone does everything needed, and if Power BI needs to be done, someone has to do it, and I'm the newest one.

I'm a little worried about doing reporting for a long time and not continuing to practice and learn more technical skills that will further develop me as a Data Engineer in the future.

On the other hand, I've decided that I have to suck it up and learn what I can, even if it's Power BI. If I want to keep learning, I can study for the certifications I want (for Databricks, Azure, Fabric, etc.).

Have yoy ever been in this situation? thanks

## Comments

- **AutoModerator** (1↑): You can find a list of community-submitted learning resources here: https://dataengineering.wiki/Learning+Resources

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **dadadawe** (176↑): PowerBi has 2 sides: building dashboards and pulling in data

If you'll be working mostly on making known data look good, that's not a technical job

If you'll be working mostly on getting the right data in the right format, so that the dashboards are correct, I would argue this will be a very valuable and very transferable skill:

\- you'll be working on data modeling where business actually sees it

\- you'll be working with the tool that data is most used in by business (in 2025)

\- you will learn how the front end team deals with the "fuck it, this dedupliction was not in the requirements" lazy moment the backend team (never) has

\- you'll learn all the dirty tricks to make your model look right, and why spaghetti models are made

  
The latter is called an Analytics Engineer according to this forum
  - **ericporing** (47↑): I agree. Nothing wrong with learning how your Data Engineering actually gets consumed. And how painful it is to use models that you don't have control of.
  - **Braxios** (-47↑): Tell me you don't understand data visualisation without telling me you don't understand data visualisation....
    - **dadadawe** (16↑): As a matter of fact, I know a fair bit and am quite happy I left that side of the job a long time ago. It requise a sense of aesthetic and a measure of patience that I do not possess :-)

What I'm saying is that managing PowerBi is a very large & complex task, with a scope much bigger than doing data visualisation. OP wants to know if it's a task worthy of a DE. My answer is: it depends: will you be visualizing data, or building the application?

As a sidenote, my personal opinion is that Tableau lost out to PBI because they realized too late that dashboarding tools are not data viz tools. They are places where business users get vetted data at scale (and then export it to Excel)
- **[deleted]** (110↑): Visualization tools (Tableau/Power BI/etc) are typically the final step in the Data Engineering lifecycle.

Working as a Data Engineer and being able to build the final dashboard output (and basically take the project through the entire lifecycle) is very valuable.
  - **itsawesomedude** (16↑): second to this, and when business stakeholders need you to change their dashboard, they gonna rely on you, so doing the last mile work is really valuable, especially you’re facing directly to the business stakeholders
    - **Swimming_Cry_6841** (13↑): I built out my companies entire azure stack ( data lake, synapse, pipelines, azure sql; and migrated all the ssrs reports to power bi) and the guy who makes small changes like a font here or field there gets asked for by the business all the time.  A VP asked about this person in a meeting while they were on vacation and I said I’d be happy to help out and the VP said a snide comment to me which included “fake it until you make it”.  Bottom line is the power bi guy (and I use that term generously) is in a much better position than me if the business did layoffs.  Remember, no good deed goes unpunished in IT.
- **Pleasant-Aardvark258** (34↑): BI developer turned data engineer, now leading implementation of a data platform in my new role. The ability to step in and help the nascent BI team get up to speed with PBI and generally be across the full “stack” of the data got me an 8% pay rise in the first 9months.

Biggest irony? I left my previous job because I was pissed off at being bumped back to work on power BI…
- **Cyphon455** (14↑): Gonna go against the grain here. Doing visualizations and reports full-time is **not** your job as a data engineer. I'd say that belongs much more to BI Analysts, Data Analysts, Analytics Engineers or maybe even Data Scientists. Yes, it's good to have the knowledge so you can support your analysts better, but they have that job title for a reason. The other tasks you mentioned are what I'd consider data engineering.

At the end of the day, the longer you do it, the more you will become "the guy who does dashboards". From the way you describe it, it doesn't sound like that's who you want to become. You're doing the right thing right now by going with the flow and getting things done, but I'd advise talking to your manager about the trajectory you want your career to go. If they insist on keeping your responsibilities like this, I'd probably leave sooner rather than later. Won't make it any easier in the future finding jobs in the DE field if all you've done is data viz for two years lol
- **mjirv** (24↑): > I've decided that I have to suck it up and learn what I can, even if it's Power BI.

This is the right attitude. It’s valuable to know, even if it isn’t what you’d ideally be working on.

Just make sure to have an open and transparent conversation with your manager about your preference to work on pipelines so they know you don’t want to be doing Power BI forever.
- **Chowder1054** (23↑): Power BI is an excellent skill that is nothing but beneficial to you.

Not to mention it can get pretty hardcore (especially with DAX coding), modeling etc.
- **Hinkakan** (10↑): I am right with you in the sense that making dashboards is souldraining and way too “pointy-and-clicky” for my taste.

However, it is a super way to get some experience on what it means to be the end user of the stuff we as DE’s do.
I have had a similar role once or twice, and I have found that it has given me a perspective that I wouldn’t have had otherwise. You can leverage this perspective to make informed strategic decisions for the Data Engineering visions of your company, making you viable for leadership roles, if this is interesting to you.

So my advice is to take on the challenge for a while, get the most out of it, but make sure that it is a temporary change
- **Money_Beautiful_6732** (8↑): Look at it as an opportunity to learn more about the business and gain domain knowledge. If everyone does everything as needed, you'll probably have chances to improve your technical skills.
- **[deleted]** (9↑): There’s still a lot of technical skills within a good Power BI model. Lean into it for the extra bullet point on the resume.
