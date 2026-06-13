---
id: social-intelligence/reddit-deep/businessintelligence/1le8ytz.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1le8ytz/bi_tool_recommendations_for_a_40_person_startup/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "BI tool recommendations for a 40 person startup?"
author: "big_curry"
date: "2025-06-18T05:18:09.000Z"
score: 40
upvote_ratio: 0.99
num_comments: 107
flair: ""
extracted_at: "2026-06-11T18:57:56.371Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1le8ytz.md#c0"
    char_span: [0, 1492]
    sentence_count: 11
    key_terms: [businessintelligence, recommendations, hubspot, person, data, reporting, comments, external]
    token_count: 320
  - id: "social-intelligence/reddit-deep/businessintelligence/1le8ytz.md#c1"
    char_span: [1507, 3494]
    sentence_count: 17
    key_terms: [data, database, project, cloud, operational, etl, team, developers]
    section: Comments
    token_count: 437
  - id: "social-intelligence/reddit-deep/businessintelligence/1le8ytz.md#c2"
    char_span: [3496, 5645]
    sentence_count: 11
    key_terms: [data, warehouse, layer, technical, because, choice, either, quick]
    section: Comments
    token_count: 499
  - id: "social-intelligence/reddit-deep/businessintelligence/1le8ytz.md#c3"
    char_span: [5648, 7534]
    sentence_count: 17
    key_terms: [data, business, aspirationsunbound, snowflake, warehouse, warehousing, does, need]
    section: Comments
    token_count: 441
  - id: "social-intelligence/reddit-deep/businessintelligence/1le8ytz.md#c4"
    char_span: [7536, 9149]
    sentence_count: 11
    key_terms: [snowflake, warehouse, data, using, domo, sql, complexity, fivetran]
    section: Comments
    token_count: 426
  - id: "social-intelligence/reddit-deep/businessintelligence/1le8ytz.md#c5"
    char_span: [9151, 10434]
    sentence_count: 12
    key_terms: [visualization, tableau, capabilities, engineering, domo, need, metabase, sqlmesh]
    section: Comments
    token_count: 286
---
# BI tool recommendations for a 40 person startup?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1le8ytz/bi_tool_recommendations_for_a_40_person_startup/)
Posted by **big_curry** · **40↑** · **107 comments**

Hi I’ve been tasked to research an acceptable BI tool for our 40 person series A startup. Background: we are an electrical services business mainly running our data and reporting through HubSpot. The challenges we are facing is the data cannot be merged and reported out with other systems we use like Stripe, quickbooks, google analytics, or internal products we have made. 

Our reporting to some of our clients has become lackluster and sometimes has discrepancies between what is shown to customers and the most up to date info in Hubspot.  

Ideally we’d like something with many connectors to applications, some ETL capabilities to merge data, the ability to share with external users, periodic email updates to those external users, and maybe the ability to embed dashboards into our own portal. 

I’ve been reviewing a few tools, and looker seemed great but the sales person basically said we’re too small and don’t fit their ICP. Domo seems good but the reviews on Reddit seem to be horrible. PowerBi could be good but we don’t run on Microsoft and will be buying an erp in the future. Tableau doesn’t work natively with HubSpot either. 

Does anyone have any recommendations or suggestions for me to research further?

## Comments

- **cazualscroll** (20↑): It all depends on budget and what technical skills your team has available. Do you have a data team? Developers?

Cheaper/free resources but higher operational overhead: setup a database sever, Airflow for orchestration, Sql/Python/Spark for ETL (google analytics and hubspots all have apis), Streamlit or Superset for BI and Python to create custom Excel reports. See if your company has any on prem servers available to host this or host these on a cloud service. This can also all be hosted on a decently strong laptop.

Higher cloud cost but potentially lower operational overhead because fully managed services: AWS RDS for database,  Appflow/Glue/Lambda for ETL, Quicksight for BI. This is the full AWS route, but you can also look up the GCP or Azure equivalents or use Databricks too. They all have prebuilt connectors for popular systems. 

Not a comprehensive list but maybe this gives you some terms to lookup. 

I feel like reddit generally hates fully managed cloud services but having worked on different teams and set up all of these options at one point they all have their merits.
  - **big_curry** (5↑): This was amazing response thank you! Yes we have developers but it’s a slim team and I’d rather not burden Eng with setting up anything in the short run. Long term we all agree to have our engineers building out data warehouses to help with this project. The end users, outside of me, are really not technical and actually it’s getting cumbersome for me to constantly build reports. I like what you mentioned in terms of building a database server and am thinking how I can roll that into this project.
    - **full_arc** (3↑): Honestly 90% of the lift for this project from what I can tell from your description is in the data wrangling. Use one of the ETL tools and dump your data in big query, snowflake, redshift or even motherduck. Just figure out the handful of core tables you need then you’re golden (at least for a little while). 

I’m biased because of what we’re building at Fabi, but the BI layer with managed semantic layers is where things can get really messy really quick (and incredibly expensive), because you start baking in the logic there in their proprietary languages and next thing you know that a a full time job (and AI has a really hard time with those, negating any positive contributions on that front). 

Btw, I know some very talented fractional data engineers who can help with all this stuff. I’m not affiliated with them but I work with tons of teams on their first data stack setup since having the data is a prerequisite for us. Feel free to DM me if you want references.
  - **TradWeClimb** (8↑): I would throw Sigma Computing in the mix for the BI portion of either of these solutions. Been quite pleased with the capabilities, and it’s approachable for both technical and non technical teams. Not sure about their pricing though.
- **[deleted]** (11↑): Excel, duh.
  - **StingingNarwhal** (3↑): For real, this seems like the right answer.
- **aspirationsunbound** (10↑): Chiming in as someone who has spent most of my career elbows-deep in BI, I think you are skipping a crucial step. Right now you have scattered data sources and want to plug them straight into a reporting tool. Instead, drop a lightweight data warehouse in the middle, then let your BI layer sit on top of that single source of truth. A basic roadmap:


1. **Spin up a warehouse.** If you are already in the AWS world, Redshift or even an RDS MySQL/Postgres instance works to start. On Microsoft, Azure Synapse is the natural choice.
2. **Pipe your data in.** • Off-the-shelf ETL tools like Stitch or Fivetran cover most SaaS connectors. • For oddball or home-grown apps, a quick Python script hitting the API and dumping to S3 (then into the warehouse) does the trick.
3. **Model for the future.** • Since you plan to add an ERP later, design the warehouse schema now so that the ERP can feed it without rewiring everything.
4. **Layer on the visuals.** • Power BI is a rock-solid choice; Superset is fine too. Either one can query the warehouse directly once the data is modeled.


The BI tool itself is rarely the bottleneck. A clean pipeline and a warehouse you control will make any front-end shine.
  - **big_curry** (4↑): That’s incredible feedback I’ll have to tell the team on. I think we were imagining just using something for the interim and growing up into warehousing like snowflake
    - **datasleek** (3↑): Hi, 
Having helped many clients in your situation, I agree with aspirationsunbound. It’s better to centralize your data now in a data warehouse and then plug a BI tool.
You need to think about a data warehouse as an investment for your company that will bring business values in the short and long term. Trying to plug all that data into PowerBI or Tableau will be : 
- not efficient
- complicate an architecture

Instead, once you have all your data centralized into a “Raw data” database, you can transform that data into tables meant for analytics, and later use predictive analytics. I usually ask 2 questions to my customers : 
- what business answers do you want from your data?
- what actions does your business want to take from your data? 
Yes, your data = business insights and should allow you to take action whether towards competitors, inside the company, …
I would not go with Postgres. It does not scale. I would go straight to Snowflake. Watch Snowflake Summit 2025 on you tube, you’ll see the features they have. They are 5 years ahead of competition. Azure, i would avoid them. Not stable and limited. DM me if you need more info.
    - **aspirationsunbound** (2↑): Happy to provide any help. Just serves as a oil to my jammed brain cells
    - **Tombobalomb** (1↑): SyncHub does data warehousing and has a HubSpot connector so it would be plug and play
- **fpvraptor** (6↑): Domo works very well and has all of the tools you need to get started. They have a great connector catalog and a place to store and transform your data. 

I’ve been using it for 3 years in a 400 person company. We’ve transitioned to using snowflake as our warehouse but it’s added some complexity that isn’t 100% needed.
  - **SorenShieldbreaker** (2↑): Can you provide any insight as to why you switched to using Snowflake for your data warehouse? What does it offer that Domo's data warehouse doesn't?
    - **fpvraptor** (5↑): We wanted the flexibility of moving to another BI tool in the future and we prefer to use SQL for transformations instead of Domo’s drag and drop (magic ETL). At the time, Domo’s SQL was very outdated and couldn’t do window functions. So it was very nice to have snowflake SQL. I think overall, Domo could get you very far. I’d probably use it if I were starting a BI team from scratch.
- **PinPossible1671** (6↑): Metabase
- **Aggressive-Practice3** (5↑): I think you need some simple Data warehouse setup - that will ease your BI development. 

In terms of tool I think Google Data Studio (the free version) will do most of the reporting
- **ubiquae** (6↑): Fivetran + any cloud data warehouse (bigquery, snowflake, etc) + any cloud BI dashboarding such as looker, powerbi, meta base, superset...

Be ready to pay but it will work with low effort on your side.
  - **GreyHairedDWGuy** (1↑): my thoughts as well.  Depending on their volumes, might not even be that expensive (may be 10-20K a year for subscriptions to Snowflake, Fivetran).  If they don't have a budget (no money) then the complexity goes up.
- **saaggy_peneer** (6↑): Metabase for BI   
DLTHub for ingestion https://dlthub.com/docs/dlt-ecosystem/verified-sources/hubspot

Metabase has "models" which can do transformations for you, or you could use SQLMesh for more complex stuff. SQLMesh integrates with DLTHub as well
  - **PinPossible1671** (6↑): I like Metabase
- **Professional_Eye8757** (4↑): I would suggest looking at StyleBI. There is an open source and a commercial version. It connects to Hubspot, Quickbooks, Stripe, Google Analytics, and a bunch more. It has data pipeline functionality which lets you merge and manipulate these sources. It also has elasticity so it scales up and down based on activity which can save on infrastructure costs. It's platform agnostic, and it has embeddabilty and shareability.
- **Uncle_Dee_** (5↑): I have 5 years of domo experience and another 5 of tableau. The native integrations and etl capabilities of domo are really nice. The visualization aspect can really suck though once you get the need for more advanced visualizations. If your need is leaning heavily to the engineering aspect and you don’t want to go down the road of separating engineering and visualization domo is definitely a good candidate. If you can seperate those two I would opt for tableau for the visualization. It’s just as easy to learn both and tableau offers way more in terms of analytical capabilities without the need for etl
