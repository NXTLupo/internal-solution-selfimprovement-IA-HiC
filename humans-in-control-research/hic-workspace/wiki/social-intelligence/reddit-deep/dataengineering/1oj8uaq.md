---
id: social-intelligence/reddit-deep/dataengineering/1oj8uaq.md
url: "https://www.reddit.com/r/dataengineering/comments/1oj8uaq/snowflake_vs_ms_fabric/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Snowflake vs MS fabric"
author: "SmallBasil7"
date: "2025-10-29T16:15:25.000Z"
score: 45
upvote_ratio: 0.96
num_comments: 52
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.218Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c0"
    char_span: [0, 1565]
    sentence_count: 14
    key_terms: [data, snowflake, low-code, dataengineering, through, fabric, centralized, engineering]
    concepts: [snowflake, dataengineering, low-code, through, fabric]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c1", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c2", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c3", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c6"]
    token_count: 343
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1oj8uaq/snowflake_vs_ms_fabric/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c1"
    char_span: [1579, 3835]
    sentence_count: 15
    key_terms: [snowflake, data, engineering, platform, dataengineering, fabric, power, sql]
    concepts: [snowflake, engineering, dataengineering, platform, fabric]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c0", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c2", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c3", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c6"]
    section: Comments
    token_count: 505
  - id: "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c2"
    char_span: [3837, 4348]
    sentence_count: 6
    key_terms: [fabric, snowflake, skills, team, use, onaliquidrock, enterprise, unfinished]
    concepts: [fabric, snowflake, skills]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c0", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c1", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c3", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c6"]
    section: Comments
    token_count: 126
  - id: "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c3"
    char_span: [4350, 6481]
    sentence_count: 15
    key_terms: [snowflake, fabric, power, solution, tools, data, like, time]
    concepts: [snowflake, fabric, power, solution, tools]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c0", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c1", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c2", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c5", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c6"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c4"
    char_span: [6181, 6709]
    sentence_count: 3
    key_terms: [need, centralization, capabilities, enterprise, guidelines, certified, effective, analysts]
    section: Comments
    token_count: 110
  - id: "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c5"
    char_span: [6711, 8964]
    sentence_count: 18
    key_terms: [snowflake, data, power, use, storage, pretty, tools, code]
    concepts: [snowflake, power, storage, pretty, tools]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c3"]
    section: Comments
    token_count: 474
  - id: "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c6"
    char_span: [8966, 10455]
    sentence_count: 10
    key_terms: [snowflake, user-guide-getting-started, requirements, microsoft, want, fabric, ecosystem, technical]
    concepts: [user-guide-getting-started, snowflake, requirements, microsoft, fabric]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c0", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c1", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c2", "social-intelligence/reddit-deep/dataengineering/1oj8uaq.md#c3"]
    section: Comments
    token_count: 340
---
# Snowflake vs MS fabric

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1oj8uaq/snowflake_vs_ms_fabric/)
Posted by **SmallBasil7** · **45↑** · **52 comments**

We’re currently evaluating modern data warehouse platforms and would love to get input from the data engineering community. Our team is primarily considering Microsoft Fabric and Snowflake, but we’re open to insights based on real-world experiences.

I’ve come across mixed feedback about Microsoft Fabric, so if you’ve used it and later transitioned to Snowflake (or vice versa), I’d really appreciate hearing why and what you learned through that process.

Current Context:
We don’t yet have a mature data engineering team. Most analytics work is currently done by analysts using Excel and Power BI. Our goal is to move to a centralized, user-friendly platform that reduces data silos and empowers non-technical users who are comfortable with basic SQL.

Key Platform Criteria:
	1.	Low-code/no-code data ingestion
	2.	SQL and low-code data transformation capabilities
	3.	Intuitive, easy-to-use interface for analysts
	4.	Ability to connect and ingest data from CRM, ERP, EAM, and API sources (preferably through low-code options)
	5.	Centralized catalog, pipeline management, and data observability
	6.	Seamless integration with Power BI, which is already our primary reporting tool
	7.	Scalable architecture — while most datasets are modest in size, some use cases may involve larger data volumes best handled through a data lake or exploratory environment

## Comments

- **AutoModerator** (1↑): Are you interested in transitioning into Data Engineering? Read our community guide: https://dataengineering.wiki/FAQ/How+can+I+transition+into+Data+Engineering

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **DJ_Laaal** (16↑): You have multiple options to go with, as indicated by others who have replied already. 

Considering your team isn’t very technical and it seems unlikely that you will have a specialized data engineering team any time soon, I’d recommend going with Snowflake. The primary factor is that everything just works right out of the box. No major configurations or steep learning curve to be up and running in no time. No specialists/specialist knowledge needed. 

For moving data in to the platform, you can use no code tools like Fivetran. Definitely consider using these tools as free trials to see how you feel about the ease of use and administration required. After that, it’s SQL and a BI tool of your choice to build the end-to-end analytics environment for your company.
  - **ApprehensiveCard4919** (2↑): Snowflake has gotten to be incredibly expensive. Dremio is a good option if you can handle a little configuration. It’s a fraction of the cost.
    - **AwayCommercial4639** (2↑): I found this too
- **kmritch** (17↑): Snowflake is a More Mature platform, and depending on the amount and frequency of data you are pulling it might be the right choice for you, also you could even mix the two together and use snowflake as your deep repository and have fabric as a second layer for down stream reporting etc. 

I’m a Fabric user and ive seen its come a long way and I have had really great success with it as someone who was new to the platform about 5 months ago. With it in market 3 years now.

I will say Fabric would be a WAY easier transition for folks because of the integrations with Power BI, Excel and power query and you can grow into more SQL based things. (I had the same background but also have had strong SQL before I was mainly doing Power Query and PowerBI)

the Low Code Layer is great with the Other side to grow into Deeper coding. 

What you probally can do is get the trial version of Fabric with some of your main use cases and see if it works for your team. But again Snowflake may work well depending on certain data needs. 

Skills wise based on the skills of your team already fabric is an easy on ramp vs snowflake imo.
- **Onaliquidrock** (21↑): Fabric is not enterprise ready. There are still a lot of  unfinished parts. Not many would use it if it was not Microsoft.
  - **oldMuso** (5↑): Funny. I feel that’s STILL true for Power BI!

(I’m joking somewhat, but there is a lot to be desired in the way of administering it.)
    - **PossibilityRegular21** (6↑): I used to be in analytics. I've used many visualisation tools including Power BI and Tableau. They're all a bit eh but Power BI is particularly terrible if you want anything beyond bar charts. I ended up building a Streamlit deployment system on top of kubernetes because of how much I hated working with the above, plus their bums-in-seats licencing model. Streamlit was not only a better solution, but it enabled use cases that the other tools couldn't..honestly in the analytics space I would argue these BI tools are already legacy software.
  - **[deleted]** (2↑): This is so accurate for large companies
  - **Data-Sleek** (1↑): I concur. We ran into several technical and financial issues. Technical with DBT. Our data engineer has  spent a lot of time tweaking, Fabric, Synapse, and to find a solution to a 4000 characters with DBT and indexes. On the financial side, if you don't shut down your Synapse manually, or build some automation to do so, watch out for the bill.   
Snowflake, (with AI Cortex) is way ahead of any data warehouse solution on the market.
  - **AwayCommercial4639** (1↑): When it is they will rebrand :P
- **JBalloonist** (4↑): I really like Snowflake and have used it in previous roles. However if you’re already an established Power Bi and Msft shop Fabric makes the most sense. This is the path I took even though I wanted to use Snowflake initially. I’m about 5-6 months in on my journey with Fabric/Power BI after using AWS exclusively for a long time.
  - **SmallBasil7** (2↑): What’s your typical transformation look like , is it done with SQL ? Do you use Azure data factory for ingestion?
- **jjohncs1v** (7↑): I don't have much snowflake experience, so I might not be the best to answer this, but I'll say that I like Fabric and it has come a long way and there are new features being added all the time. It's an enterprise platform which means it pretty much has all the capabilities you're hoping for, but you'll also need to have some patterns and guidelines to keep the analysts from just building all kinds of stuff without effective centralization, certified datasets, gold layers, etc. It can handle all that, but it comes down to a people and process thing that you need to get right.

The Power BI benefits are pretty big and I think will be desirable to you. There's direct and native Power BI integration either through direct lake storage modes for semantic models, or through just importing into a normal import mode models. But also Power Query (Dataflows Gen2) are a great tool for the low code analysts that already know those tools. You can use dataflows pretty much anywhere on the platform.

  
Since it sounds like you have a data savvy team and you're looking to increase your maturity and capabilities, I think investing in some fabric training and help with codifying some design patterns would be really beneficial (if you go with Fabric) to get your team started on the right foot.
- **NW1969** (7↑): I'll comment from a Snowflake perspective on the numbered points you raised ...

1. Snowflake have recently released OpenFlow but it has a limited number of connectors, so may not meet your needs. People generally use tools such as Fivetran to pull data from source systems and push it into Snowflake, or they have some process that writes source data to cloud storage where Snowflake can load it (using COPY INTO... commands)

2. Straightforward to transform data using SQL (normally wrapped in a Stored Proc if you're building pipelines). A lot of people use dbt for transformations and Snowflake have recently released the ability to run dbt within Snowflake. If you really want to go down the low/no code route, have a look at [coalesce.io](http://coalesce.io)

3. If your analysts can write SQL then they should be fine. You can also write/run SQL in VS Code if you want to (and probably in other tools too)

4. Not sure how this differs from your point 1?

5. Snowflake can probably do all this; depends on your precise requirements

6. Depends on your definition of "seamless" but making Snowflake a datasource for PowerBI is pretty trivial

7. Snowflake allows you to keep data within Snowflake or externally (Iceberg and external tables). It also separates storage and compute so you can scale the compute power you want to use for running a query independently of the data being queried, and this happens almost instantaneously. I can't imagine a scenario where Snowflake wouldn't be able to scale to your needs

Snowflake documentation is pretty good, and readable, so is always a useful place to start if you want to get a better understanding of the platform in general or specific capabilities : [https://docs.snowflake.com/en/user-guide-getting-started](https://docs.snowflake.com/en/user-guide-getting-started)
- **marketlurker** (9↑): What you are looking for with those technical requirements is a nice north star but there is nothing out there that will do all that. Neither the Snowflake ecosystem or Microsoft Fabric will do what you want. It actually sounds like you want a data environment without having to do any work. That isn't going to happen. I think you may want to rethink what is possible.
- **vizbird** (3↑): What cloud provider are you using?
  - **SmallBasil7** (5↑): We are Microsoft shop with Azure Cloud
    - **lightnegative** (4↑): Yep, Fabric is garbage but if you're already stuck in the Microsoft ecosystem then it's the best choice, particularly if your team is scared of code
    - **ArmInternational6179** (3↑): Then go with fabric. Less troublesome for your team
- **vik-kes** (3↑): Without knowing your technical and business requirements it’s not possible to answer your question. And actually it does not really matter. Both use spark to load data and some awl query engine to read it. If you don’t know what is required b/c business is still defining the requirements try to stay agnostic. Build a Lakehouse on Iceberg and then you can use both at the same time
