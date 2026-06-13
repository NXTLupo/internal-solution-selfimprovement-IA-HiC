---
id: social-intelligence/reddit-deep/businessintelligence/1mbww3z.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1mbww3z/custom_dashboard_solutions/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Custom Dashboard Solutions"
author: "lostinthesauce2004"
date: "2025-07-29T00:14:23.000Z"
score: 11
upvote_ratio: 0.92
num_comments: 29
flair: ""
extracted_at: "2026-06-11T18:57:56.378Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1mbww3z.md#c0"
    char_span: [0, 614]
    sentence_count: 4
    key_terms: [businessintelligence, dashboard, different, comments, custom, source, trying, lostinthesauce2004]
    token_count: 139
  - id: "social-intelligence/reddit-deep/businessintelligence/1mbww3z.md#c1"
    char_span: [629, 2510]
    sentence_count: 18
    key_terms: [dashboard, looker, data, "it's", database, results, fabric, materializing]
    section: Comments
    token_count: 470
  - id: "social-intelligence/reddit-deep/businessintelligence/1mbww3z.md#c2"
    char_span: [2512, 4513]
    sentence_count: 11
    key_terms: [build, dashboard, data, open-source, apis, etc, use, streamlit]
    section: Comments
    token_count: 466
  - id: "social-intelligence/reddit-deep/businessintelligence/1mbww3z.md#c3"
    char_span: [4515, 4910]
    sentence_count: 3
    key_terms: [worked, connected, datatobiz, scheduled, something, alerting, delivery, multiple]
    section: Comments
    token_count: 83
---
# Custom Dashboard Solutions

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1mbww3z/custom_dashboard_solutions/)
Posted by **lostinthesauce2004** · **11↑** · **29 comments**

I’m trying to build a custom dashboard for a client and was wondering what the best option would be.

We’re trying to make a dashboard that would pull in different analytics, such as web, social media, etc from different APIs.

Would also want the platform to be easily scalable if needed later on.

What would be some of the best platforms to create this, open source, free, or paid?

## Comments

- **Key_Friend7539** (2↑): Are you querying APIs directly or materializing the results? If you want filterable dashboard it’s best to store API results in db. Tools like PowerBI, Looker, Semaphor and others can get you in a pretty good place.
  - **lostinthesauce2004** (1↑): I’m sorry, how do you mean by “materializing” the results? I’m sort of new to this
    - **Key_Friend7539** (2↑): Store in the db at regular intervals. Feel free to DM me. Happy to answer any other questions you may have.
- **ChipmunkEfficient879** (2↑): Microsoft Fabric. It's got everything you need under one roof. I tried a lot of these tools - Looker, Looker Studio, Tableau, Domo and a bunch of others.  Nothing comes close to what Microsoft Fabric offers. 

Don't get me wrong,  they all suck, it's just Fabric sucks less.
- **SeaRope7719** (2↑): Is this a marketing dashboard? If so, probably Looker Studio combined with something like Supermetrics for non-Google data sources
- **schi854** (3↑): A few commercial options has been mentioned but I like to add Tableau. But open source options have come a long in last few years. If you are more of a coding type, Superset will provide a good visual layer with your own API code. On the other hand, StyleBI has both data layer that connects to APIs and a visual layer where you can materialize your data
- **Cold-Ferret-5049** (1↑): Depending on how scalable you want this, I too, would recommend throwing this into a database. A good example is snowflake, which can run python from it's UI (the capability is called snowpark).

I've done this a few times for customers, where they pull data on demand, into the database and the dashboard refreshes in seconds. Because it's easy A.F. they can use the dashboard to writeback to the database also, and even writeback/update the source, i.e. Update QuickBooks/finance after a dashboard action/decision.

I used to build these workflows in Streamlit when I had time to kill coding away. Now I build it using Astrato, because I don't have time to kill.
- **kevivmatrix** (1↑): You can use Supabase Edge functions to pull data from APIs and store. Then use Draxlr to build dashboards from Supabase.

Disclaimer: I am founder of Draxlr, if you need any help, please DM.
- **data-ai** (1↑): Depends on the size of your clients business. What’s his employee headcount ? Variety of different options
- **Oleoay** (1↑): A big question is if the dashboard is accessed via pc or mobile or both. That can affect your tool choice. The technical sophistication of the end users may also matter since some people prefer canned reports and other want lots of abilities to filter and drill down.
- **Embiggens96** (1↑): My top choices for each:

 open source: stylebi

paid: power bi

 free: superset
- **one-step-back-04** (1↑): When I worked on a dashboard project with a mix of web + social analytics, pulling data from multiple APIs (think GA4, LinkedIn, Meta, etc.), we quickly realized it’s less about just the dashboarding tool and more about the pipeline behind it.

If you’re going the custom route, here are some solid combos based on your stack/scale needs:

For faster build / less code:

* Google Looker Studio, surprisingly flexible, works well with connectors (Supermetrics, etc.)
* Power BI, my personal go-to, especially if you're pulling from structured APIs or databases. Great scalability and user control.
* Metabase is, good open-source option, solid for internal tools.

 If you’re building from scratch / fully custom UI:

* Streamlit or Dash (Python) – awesome if you want tight control and already have scripts/API pulls working.
* Superset – open-source, scalable, but more developer-centric.

\>> Data layer matters: Use a cloud warehouse (BigQuery, Snowflake, etc.) or even just a centralized database (Postgres/MySQL) to dump API data first makes your dashboard way more stable and scalable.

We built something similar recently at DataToBiz as well and connected multiple sources, piped them into a data lake, then used Power BI for visual delivery (with alerting + scheduled refresh). Worked great for the client because they could scale without redoing the stack.

Happy to share some visuals or what worked well in our case , feel free to drop me a DM if you want to bounce ideas off!
