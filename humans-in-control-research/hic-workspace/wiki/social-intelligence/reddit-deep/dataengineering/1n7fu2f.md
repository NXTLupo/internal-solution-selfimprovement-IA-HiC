---
id: social-intelligence/reddit-deep/dataengineering/1n7fu2f.md
url: "https://www.reddit.com/r/dataengineering/comments/1n7fu2f/confirm_my_suspicion_about_data_modeling/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Confirm my suspicion about data modeling"
author: "DryRelationship1330"
date: "2025-09-03T14:09:04.000Z"
score: 297
upvote_ratio: 0.96
num_comments: 133
flair: "Career"
extracted_at: "2026-06-11T18:58:17.197Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c0"
    char_span: [0, 1392]
    sentence_count: 6
    key_terms: [data, modeling, dataengineering, comments, leaders, dryrelationship1330, ask, like]
    token_count: 329
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c1"
    char_span: [1407, 3510]
    sentence_count: 9
    key_terms: [revenue, "it's", sales, bookings, focused, talking, design, losses]
    section: Comments
    token_count: 469
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c2"
    char_span: [3512, 4858]
    sentence_count: 11
    key_terms: [data, reports, dashboard, accounting, finally, finance, start, been]
    section: Comments
    token_count: 292
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c3"
    char_span: [4860, 6861]
    sentence_count: 12
    key_terms: [data, governance, architecture, quick, sales, like, win, structure]
    section: Comments
    token_count: 479
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c4"
    char_span: [6863, 9181]
    sentence_count: 14
    key_terms: [whatever, architecture, trust, data, time, leadership, companies, important]
    section: Comments
    token_count: 494
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c5"
    char_span: [9183, 10737]
    sentence_count: 10
    key_terms: [data, database, modeling, benefits, dryrelationship1330, folks, "it's", part]
    section: Comments
    token_count: 354
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c6"
    char_span: [10739, 12498]
    sentence_count: 14
    key_terms: [data, people, "it's", completely, medallion, warehouse, business, modeling]
    section: Comments
    token_count: 407
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c7"
    char_span: [12500, 13262]
    sentence_count: 8
    key_terms: [medallion, delta, transformations, infrastructure, documentation, architecture, consumption, jballoonist]
    section: Comments
    token_count: 174
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c8"
    char_span: [13264, 15211]
    sentence_count: 17
    key_terms: [employee, "it's", thread, useful, "don't", going, agiledatamodeling, roastmecerebrally]
    section: Comments
    token_count: 460
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c9"
    char_span: [15213, 17665]
    sentence_count: 22
    key_terms: [modelling, discuss, always, requirements, data, feel, like, projects]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c10"
    char_span: [17667, 19420]
    sentence_count: 13
    key_terms: [agiledatamodeling, kimball-vs-one-big-table-vs-data-vault-in-data-modeling-fa5f63326b84, erwin, https, com, data, reddit, comments]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c11"
    char_span: [19422, 21470]
    sentence_count: 11
    key_terms: [data, sneakpeekbot, business, https, com, modeling, storage, reddit]
    section: Comments
    token_count: 452
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c12"
    char_span: [21472, 23347]
    sentence_count: 16
    key_terms: [data, snowflake, datawarehouse, etc, tons, companies, redshift, usurped]
    section: Comments
    token_count: 437
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c13"
    char_span: [23349, 25574]
    sentence_count: 16
    key_terms: [data, talk, "don't", modeling, point, space, influencers, knowledge]
    section: Comments
    token_count: 488
  - id: "social-intelligence/reddit-deep/dataengineering/1n7fu2f.md#c14"
    char_span: [25576, 27634]
    sentence_count: 12
    key_terms: [data, models, modeling, design, applications, "don't", performance, get]
    section: Comments
    token_count: 482
---
# Confirm my suspicion about data modeling

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1n7fu2f/confirm_my_suspicion_about_data_modeling/)
Posted by **DryRelationship1330** · **297↑** · **133 comments**

As a consultant, I see a lot of mid-market and enterprise DWs in varying states of (mis)management.

When I ask DW/BI/Data Leaders about Inmon/Kimball, Linstedt/Data Vault, constraints as enforcement of rules, rigorous fact-dim modeling, SCD2, or even domain-specific models like OPC-UA or OMOP… the quality of answers has dropped off a cliff. 10 years ago, these prompts would kick off lively debates on formal practices and techniques (ie. the good ole fact-qualifier matrix).

Now? More often I see a mess of staging and store tables dumped into Snowflake, plus some catalog layers bolted on later to help make sense of it....usually driven by “the business asked for report\_x.”

I hear less argument about the integration of data to comport with the Subjects of the Firm and more about ETL jobs breaking and devs not using the right formatting for PySpark tasks.

I’ve come to a conclusion: the era of Data Modeling might be gone. Or at least it feels like asking about it is a *boomer* question. *(I’m old btw, end of my career, and I fear continuing to ask leaders about above dates me and is off-putting to clients today..)*

Yes/no?

## Comments

- **cream_pie_king** (295↑): It's dead because businesses have focused on fast delivery vs consistent, trusted data platform design INCLUDING data modeling.

It's all due to MBA brainrot employees who need their "quick win" and incompetent executive leadership who buys into the newest buzzword architecture frameworks that promise "faster time to insight" without any structure to ensure the boomer brained finance team and the dude bro sales team agree on how to calculate basic shit like, I don't know sales revenue.
  - **DryRelationship1330** (42↑): Back in the day, I used to think that the 'source of truth' moniker for a DW was...wrong. It was 'source of contextual truth'. 

To your point.   
  
\_The Fin guys think Sales Rev = AR Receipts (before adjustments, returns, blah).   
\_The Sales Bros think it's "Dude, WTF, I get my 10% commission on this, right".   
\_The Tax Bros think its = "we have no revenue, it's all losses all the way down..."
    - **cream_pie_king** (33↑): My org is literally going through a revenue bookings alignment project. The project is to have a "central source for bookings data, that also allows for teams to define bookings based on their needs".

We are publicly traded and this is insane to me.
    - **iupuiclubs** (7↑): >\_The Tax Bros think its = "we have no revenue, it's all losses all the way down..."

This is why that crazy "unnecessary" dev layer disappeared, you become so laser focused on making arbitrarily "robustly designed perfect systems" you lack basic knowledge on what stakeholders are even talking about or asking for.

"We have no revenue, its losses all the way down" literally makes no sense for anyone with a finance/accounting background. AKA those tax people were probably confused having to interact with someone more worried about complex system design vs actually knowing what stakeholder is talking about/asking for.

Blow this up to multiple SME areas and if there is any congruence you *think* you know what you're talking about but don't outside your own SME area, but are only focused on arbitrarily complex system design.

People with finance/accounting background that also do data will clean up in this sphere all day now. Sure your systems are "perfect" but trade off is dont even know what you're making the system for.
    - **ExpertStrict5558** (1↑): Sounds like you need a glossary.
  - **Toastbuns** (9↑): Yeah I had a team of 6, now 3 as 3 have been pulled into AI slop projects. I'm expected to deliver more with 50% of the resources we had and even with 6 we didnt have time or luxury of writing great documentation or doing real data modeling. It's definitely not happening now.
  - **domscatterbrain** (7↑): There are some interesting facts when we analyse the dashboard usage. Most of daily and weekly reports only consumed by the Operation teams. Finance and Accounting only care about monthly reports. Finally C-level only visit that one big dashboard, rarely! That's because they asked that we capture said dashboard and send it directly to their phone every morning.

No realtime analytics, no drill down, no buzzwords that has been implemented are visited.

As our BQ billing start racking up from the data growth since those reports are using direct queries to the fucking raw Ingested data, we finally start implementing correct data architecture. And guess what, many of those reports are inaccurate and suffers from duplicates and miscalculation.

Then we entered the fire fighting mode as c-levels demand us to redo all the reports from the last one year with the new architecture.
  - **DryRelationship1330** (17↑): Ha! I have a bingo board w/ my fellow sales folks; first to say quick win or low hanging fruit wins meeting. It's tru. "just get one metric/chart 'out the door', then we'll get sticky w/ the client and we can do it the right way".... come back for free beer tomorrow, the sign says.
  - **Dismal_Hand_4495** (3↑): Yearly bonuses outpace salary, of course its about fast delivery. Noone is working for someone else out of love.
  - **Polus43** (2↑): > It's all due to MBA brainrot employees who need their "quick win" and incompetent executive leadership who buys into the newest buzzword architecture frameworks that promise "faster time to insight" without any structure to ensure the boomer brained finance team and the dude bro sales team agree on how to calculate basic shit like, I don't know sales revenue.

Eloquently said and on the money

The world has become more complex, but management has not become better at "systems thinking" (still don't like that phrasing).
  - **CatastrophicWaffles** (1↑): I swear to fk if I hear "we need a quick win" one more time....

I've gotten to a point where buzz phrases like that make me work even slower.
  - **Hazel-Wolf** (1↑): Back in the day this “structure” to define definitions by context was Data Governance. 

I see it still hasn’t gained enough traction. 

I think Data Governance needs to be tied to Internal Audit to have staying power and the ability to enforce governance. Not just straddling the line between business and technology.
  - **Crazy-Sir5935** (1↑): Best post ever! I'm basically a beginner in terms of data engineering. Yet, i have a background as a financial controller, data science and know some about conceptual modelling (class UML/chen's) and logical models (data vault) and all i see these days is people talking about how cool their techstack is. 

I firmly believe in that over time some logic remains important (like SQL is still king). Still data management should be central to whatever you do. Trust is key for any data pipeline, without trust, you just have a fancy Ferrari without anyone to drive it.
  - **Illustrious-Welder11** (1↑): Nah, it’s leadership getting annoyed it takes 2 years to get an accurate revenue trend line.  It takes 6 months to get baseline and market size for a strategy bet that they end up flying blind.  

It is not just leadership and MBAs who suffer from buzzwords.  Look in the mirror and think about the promises of bulletproof, scalable, and extensible pristinely modeled data warehouses that never succeeded in delivering, gaining trust, or influencing decision making.
- **No_Introduction1721** (92↑): Well, its important to remember that the Kimball and Inmon standards were developed in the 80s.  I think there’s three key trends that have happened in ensuing decades that explain the mess we’re in today:

First and most obviously, computing has gotten exponentially more powerful. A big part of the reason people cared so much was because they literally had to. Nowadays, no one gives a crap, and if you’re a conspiracy theorist, you could even argue that medallion architecture is being perpetuated by cloud providers as a way to extract more money from their clients. 

**Quick edit based on some responses:** I’m definitely not saying there aren’t any positive aspects to medallion architecture and ELT supplanting ETL. But whether it’s *necessary* is a different question and one that, IMO, businesses should really think long and hard about rather than just defaulting to whatever the FAANG companies are doing or whatever the vendor’s recommendation is. Maybe I’m just old, but I can recall a time when the bronze layer lived in an FTP site (lol) and the Gold layer didn’t exist, and yet companies were still able to answer business questions and turn a profit. 

Second, and somewhat related, technology just moves so fast that you’re migrating platforms every couple years, in some cases. There’s a sense that tech debt is unavoidable, and the Agile/MVP approach exacerbates this as well. So no one really cares as much about getting things right the first time, because you know you’ll have to rebuild it anyway. 

Third, while the concept of “data” has been democratized and de-mystified quite a bit in the ensuing four decades, the actual database part of it still has somewhat of a barrier to entry. So I think part of the issue is that “Can I get this in Excel to do my own analysis?” has become such a ubiquitous question that you can’t really say no to it, leading to a bunch of bespoke OBTs that aren’t documented particularly well, if at all. 

IMO modeling is still important, but it’s largely because of BI/Data Viz software adoption and not database constraints themselves anymore.
  - **DryRelationship1330** (27↑): I'm more inclined to believe your theory about the medallion arch that you realize.

As I noted to another poster, it's odd to me frankly that Starburst/Trino doesn't just come out w/ a marketing slogan: **"Why bother with ETL and rigorous modeling, you just want a federated query/catalog. We know you're just going to fix your data at the report level. Who are you kidding!..fahgettaboutit."**
  - **kenfar** (21↑): Data warehousing used to be primarily driven by database practitioners.   Many of the folks involved were prior DBAs and data modelers.  For these folks time spent on data modeling had clear benefits, and wasn't terribly difficult.  But most of the data engineers that have joined the field over the last 15 years don't have that background - and so it's a much bigger lift.

I'd also say that the benefits of good data models go far beyond performance - and impact data quality, usability, functionality, and build time.  

However, the folks that aren't already hearing about this, and don't hear about it from their vendors, etc - aren't going to spend time on data modeling.   They're just going to make messes.
  - **Blaze344** (10↑): All best practices are just as important as they've always been, and they will always be. Taking medallion as an example, it's clearly a pretty solid generalist approach that provides the data at the stage that it matters for the interested parties, if a team or business can't take advantage of that, I'd honestly say it's the fault of the business and not of the principle. I have a similar view on scrum and agile and stuff like that. Most people adopted it because of buzzwords. Most people also have no idea how to use it which is why so many hate it, but they erroneously blame agile rather than the fact that they're experiencing a broken, useless version that has 2 hour dailies.
  - **autumnotter** (10↑): There's no reason medallion architecture and good data modelling can't coexist. Databricks has tons of data warehousing SMEs who talk about Kimball and good data warehouse designs, I've seen their talks. Just because people don't bother to do it doesn't mean it's not a best practice or the two are somehow in opposition. Silver and gold layer, depending on the companies standards, often have very classical data warehouse designs.
  - **grapegeek** (8↑): I completely agree. Compute is cheap so people are lazy. Excel can do way more now. Your average data user can get what they want themselves. I’m dealing with the same thing. Data Modeling has been shoved down to engineers that have no clue and we’ve gotten rid of all the dedicated modelers.
  - **Odd-Government8896** (2↑): Very well said and I completely agree here ☝️ 

Regarding medallion. It could be an evil plot to increase consumption. Except for the fact things like delta -> delta transformations in pyspark are SO MUCH CHEAPER than other methods...
  - **JBalloonist** (1↑): I’m in the middle of building out a brand new architecture. I had decided I would use medallion since we chose Fabric and Microsoft champions it in their documentation. The farther along I get, the more I realize we have little to no need for a gold layer.
  - **deong** (1↑): I also think that we overthink the modeling. As you said, you don't really have to wring every cycle out today, and costs are different now anyway. I used to have to argue with infrastructure over disk space. Infinite storage is free now, and you pay to process the query.

And if you don't have as much reason to sweat the costs, some of the things we used to do aren't that useful. I have never once really cared whether something is a fact or a dimension. I have this argument with my architect regularly. He strongly prefers to have naming standards like fact_blah_blah and dim_yada_yada. It's a table. If it has what I need to join to in it, that's the query I'm going to write. Do you need to pull in employee information based on employee ID? There's going to be one thing that has a key of employee ID and a bunch of attributes about employees. Who cares what you call it?
    - **roastmecerebrally** (2↑): this is a brain rot take lol. Its very useful to separate the tables into facts and dimensions
- **adastra1930** (34↑): I want to hang out with everyone in this thread. I’m relatively new to engineering, mostly self-taught and on the job (for a large enterprise). I know my stuff well enough to know that there’s stuff we don’t do well, and I’d be very curious to find out what foundational stuff we’re not doing
  - **DoomBuzzer** (14↑): I am an Analytics Engineer, wanting to know how to model better and this is already my favorite thread on the forum. I see plenty of issues I resonate with.
    - **NotSure2505** (4↑): Come join the conversation at r/agiledatamodeling.   This subject is exactly what we discuss.
  - **Little_Kitty** (7↑): Save this post and come back to it whenever you get a sense of imposter syndrome.  It's not that you don't understand a complex pipeline, it's that it was written by idiots and has descended into a Byzantine mess that spans multiple languages and a dozen repos just to do the most basic task.

The industry has spent over a decade hiring whoever into the data space, failing to train them and with management spamming buzzwords while low utility software marketing teams make daft claims on social media.  Now pour an unhealthy dose of AI slop on top of that...

For products and projects I manage, it's a constant battle to police sloppy commits, Rube Goldberg machines and claimed "client requests" which not only fail to make logical sense, but have no real deliverable or endpoint.  Proper modelling, granularity & application of constraints becomes a dream and solving issues around distributed systems, incrementality, recovery from corruption and temporal stability don't even get thought of.
  - **NotSure2505** (-3↑): Come join the conversation at r/agiledatamodeling.   This subject is exactly what we discuss.
- **ObjectiveAssist7177** (19↑): ooof what a wonderful topic to discuss... shame its not a Friday as I would have more time for a reply.  Im being serious this is a "pub" kinda question that sadly I dont have collegues that share the same spark to discuss with.

This industry has evolved so fast that terms have been highly convoluted and become some what meaningless. 

When I began my career Kimball was king and the data mart with at least star schemas were the expected minimum. Largely because of the limits of what we had (relational databases with indexes). To get things to work you had to thoroughly understand the requirements, plan and model accordingly.

Compute and Storage are cheaper than beer (sadly), with that has come with the more lazy approach in favour of quick (although unstable) returns. We follow agile, we don't like long winded projects and if your query doesn't work then just add more compute.

With this a generation has been bombarded with buzzword bingo. We have data lakes, lake houses, and other infrastructure terms. We also have data mesh, fabric and other strategic ideas that i always feel are more idealised than realistic. A person can only retain so much and indeed the core ideas of warehousing have disappeared. I asked someone if they would consider implementing surrogate keys, he asked me if I had made that up.

It does feel like we are re learning alot of the problems that we had in the 80s just in different guises. I feel that maybe were just old enough to notice the turn of the wheel. What was learned will be forgotten and re learned again.

Modelling will always be important, but modelling relies of having some key information.... like what do you actually want to achieve? What are you measuring.... I think most of this sub will admit.... actual requirements are always few and far between. Keeps us busy rebuilding stuff though lol.

Id love to see what the modern equivalent of erwin is?

Anyway... your not alone...

Do you know what would be cool.... a podcast going through the datewarehouse tool kit and data modelling!
  - **idodatamodels** (1↑): >Id love to see what the modern equivalent of erwin is?

SQLDBM, Hackolade, many others, take your pick. None have the feature set of erwin, but each new one addresses a feature that erwin typically doesn't support. This usually means a tier 2 database with low industry usage.
    - **ObjectiveAssist7177** (1↑): Very bad experience with SQLdbm… want very impressed
    - **GreyHairedDWGuy** (1↑): Yep.  I used ERWin as my go-to for years (and a couple other of the well known windows based modelling tools).  It's still around (and still pricey).  We use SQLDBM when needed now.
  - **NotSure2505** (0↑): Come join the conversation at r/agiledatamodeling.   These topicss are exactly what are discussed on there.
    - **sneakpeekbot** (1↑): Here's a sneak peek of /r/agiledatamodeling using the [top posts](https://np.reddit.com/r/agiledatamodeling/top/?sort=top&t=all) of all time!

\#1: [BLM vs. LLM for Data Lakes: Challenges for Power BI, Datamarts, and Tableau](https://np.reddit.com/r/agiledatamodeling/comments/1m87261/blm_vs_llm_for_data_lakes_challenges_for_power_bi/)  
\#2: [Mastering Agile Data Modeling for Tableau Dashboards](https://np.reddit.com/r/agiledatamodeling/comments/1ll0j5e/mastering_agile_data_modeling_for_tableau/)  
\#3: [Kimball vs. One Big Table vs. Data Vault in Data Modeling](https://medium.com/towardsdev/kimball-vs-one-big-table-vs-data-vault-in-data-modeling-fa5f63326b84) | [1 comment](https://np.reddit.com/r/agiledatamodeling/comments/1jgp9ul/kimball_vs_one_big_table_vs_data_vault_in_data/)

----
^^I'm ^^a ^^bot, ^^beep ^^boop ^^| ^^Downvote ^^to ^^remove ^^| ^^[Contact](https://www.reddit.com/message/compose/?to=sneakpeekbot) ^^| ^^[Info](https://np.reddit.com/r/sneakpeekbot/) ^^| ^^[Opt-out](https://np.reddit.com/r/sneakpeekbot/comments/o8wk1r/blacklist_ix/) ^^| ^^[GitHub](https://github.com/ghnr/sneakpeekbot)
- **DJ_Laaal** (10↑): As a DW professional with two decades in the domain, I’ve lived through the transition data modeling and data architecture have gone through during those times. When I started my professional career in data, a 2-year Datawarehouse build-out project was the norm. We used to do rigorous requirements gathering (for months!), hire a multitude of skilled people to document the business processes, track down data sources and cover every inch of the enterprise reporting needs on paper. Then the laborious phase of ETL, physical data modeling, test runs, and QA will ensue. Finally some BI team would develop the static reports and before you know it, it’s already 2 years gone!

Nowadays, every single business comes pre-wired to collect and move streams of raw data all over the place. Costs of data storage have significantly dropped so dumping it all in into a cheap cloud storage is a no-brainer and it’s an acceptable approach. Storage and compute are now segregated so no upfront unutilized servers anymore. 

I guess the fundamental idea behind serving data analytics has switched from building robust, audited and reliable DW architectures to just-in-time data modeling for a quick turnaround to answer a certain business question ASAP. It also allows for incremental question-answering with the same just-in-time analytics approach instead of asking business stakeholders exactly what questions they’d need answered for next 10 years and expecting them to have an answer for you. 

I’d say it’s just a paradigm shift that has acceptable flaws with upside advantages that outweigh the said flaws (i.e. lack of emphasis on the traditional DW approaches we built our careers around in the past).

Edit: also wanted to mention how the term “datawarehouse” has now been usurped by the vendors to mean “snowflake, redshift or GCP”. Not the Kimball or Innmon style datawarehouses we used to build. In fact, Bill Innmon (he’s in my LinkedIn network) wrote a very expressive LI post about this a year ago. Now I see even him kind of coming to terms with the fact that the old school DW as a industry and a domain is dead.
  - **NotSure2505** (5↑): >how the term “datawarehouse” has now been usurped by the vendors to mean “snowflake, redshift or GCP”.

I cannot begin to tell you how frustrating it is to have conversations with clients who don't know the difference.  It's painful to have to explain this simple distinction to someone after they start complaining about how bad (and expensive) their "Datawarehouse" is when in reality it was just a data lake of file dumps with no relational structure. Not surprised it sucks.  Just because you put it in Snowflake doesn't make it a data warehouse.

Did you know that for enterprises, companies like Snowflake quietly offer them free storage for any  unstructured data they load?  It's basically a land grab.  These companies don't care about the analytical effectiveness, they just want to fill hard drives and charge rent on this data into perpetuity.
- **chrgrz** (22↑): Most likely Yes. 
In my last two recent roles, most of the data issues directly pointed out to referential integrity issues and somehow when the discussion came to the point of design, people would just throw out garbage points. 
You would know and be shocked to see, how many of the so called data experts lack any kind of modeling knowledge.
  - **kenfar** (14↑): I went to a hadoop conference around 2014.  It was Strata - which at the time was enormous.  Probably 5000 engineers there.  Tons of buzz, tons of hype, tons of excitement, etc, etc, etc.

They had a panel discussion with some of the lead presenters, who at one point agreed that data ingestion was the most challenging aspect of a big data project.  At which point I asked the question: "are you familiar with any discipline or methodologies that could assist people in developing data injection processes?"  And they all shook their heads, said "no", that they weren't familiar with anything that could help.  I suggested that they take a look at ETL.

Bottom line: in an insanely-hyped and funded data space that was trying to pick up the work from classic data warehouses, leading "influencers" lacked even basic familiarity with some of the most fundamental concepts in the space.

So yeah, I completely believe that most data "influencers" today lack basic knowledge of data modeling.
    - **chrgrz** (2↑): Yeah, sad but not surprising to hear this at this point. Thanks for sharing your experience. Right now, I will be happy even if a Data Architect (not all of course) can  articulate well about dimensional modeling principles.
    - **GreyHairedDWGuy** (2↑): I remember those days.  I went to a similar conference and did a couple of the Cloudera Hadoop admin / analyst courses ( and a Hortonworks one to I think).  That was a while ago :)
- **kenfar** (9↑): I think what you're seeing is the impact of marketing: the people asking these questions don't really understand this space, they just have some common knowledge they've gotten from vendors, and from the systems they've built using the "Modern Data Stack", etc.

Vendors, whether Snowflake, Data Bricks, or DBT - don't want to talk about data modeling.  They don't want to talk about it because they don't have a solution to make it more productive.  So, instead of admitting that it's a hard problem and they mostly work on the easy problems, they instead just try not to talk about it.

They *should* talk about it - since it impacts performance, data quality, query functionality, usability, and operational and development complexity.   And practitioners should also talk about it for the same reason.  But this field has always been marketing-driven, and data modeling is difficult.  So, they don't talk about it like we did 25 years ago.

But that doesn't mean nobody is.  It definitely still matters when operating at scale, whether that's data volumes, performance and query response time or its the number of fields, feeds, and models.
  - **Sufficient_Meet6836** (2↑): > Data Bricks,  - don't want to talk about data modeling.

Databricks has several pages, free ebooks, and courses on data modeling...
    - **kenfar** (1↑): Sorry, should have been more specific: they don't talk about it in their marketing or sales materials.  When they're trying to sell the solution to a customer - they don't talk about it.

Once you're on the product there's a bit.
- **dbrownems** (9↑): From what I see, I somewhat agree, but only data modeling in the DW layer.  Star-schema data marts/semantic models are alive-and-well, because that's all that really matters.
- **Awkward_Tick0** (8↑): The house of cards will topple eventually. Not my problem
- **GreyHairedDWGuy** (8↑): Data modelling crowd knowledge has dwindled over the years because of a few factors:

\- in the late 70 to the early-90's, large orgs tended to develop their own in-house applications for everything (ERP, Finance/Accounting...etc) so there needed to be practitioners who could design stable, well considered data models which supported OLTP applications.   With the advent of 'off the shelf' solutions like JDE, Peoplesoft, SAP...etc the need to design your own models fell off a cliff.  While a BI/DW model is designed differently, it was generally the people with existing OLTP model knowledge that went down this path as well.

\- As others have stated in this thread, 3NF or better modelling was a means to help squeeze the best performance out of hardware solutions.  This is not as much a concern now.

  
\- The 'need for speed' (AGILE) has caused our industry to get lazy and not worry about design.  'Just get er done'....minimum viable product thinking which created tech debt that doesn't get addressed.   Some of this was management issues and some of it overhyped promises of certain methodologies like agile/scrum.
