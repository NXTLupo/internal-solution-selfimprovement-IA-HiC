---
id: social-intelligence/reddit-deep/dataengineering/1tjb8v1.md
url: "https://www.reddit.com/r/dataengineering/comments/1tjb8v1/where_do_you_draw_the_line_between_analytics/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Where do you draw the line between Analytics Engineer and Analyst responsibilities?"
author: "Rajsuomi"
date: "2026-05-21T05:50:13.000Z"
score: 34
upvote_ratio: 0.94
num_comments: 26
flair: "Rant"
extracted_at: "2026-06-11T18:58:17.211Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1tjb8v1.md#c0"
    char_span: [0, 1122]
    sentence_count: 12
    key_terms: [dataengineering, analytics, analysts, comments, engineer, clear, does, feel]
    concepts: [dataengineering, analytics, analysts, comments, engineer]
    token_count: 255
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1tjb8v1/where_do_you_draw_the_line_between_analytics/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1tjb8v1.md#c1"
    char_span: [1136, 2539]
    sentence_count: 9
    key_terms: [analysts, dbt, "don't", data, let, sql, work, everything]
    concepts: [analysts, "don't", everything, semantic, analyst]
    section: Comments
    token_count: 362
  - id: "social-intelligence/reddit-deep/dataengineering/1tjb8v1.md#c2"
    char_span: [2541, 4819]
    sentence_count: 15
    key_terms: [analysts, dbt, engineering, being, team, want, databases, software]
    concepts: [analysts, engineering, being, databases, software]
    section: Comments
    token_count: 502
  - id: "social-intelligence/reddit-deep/dataengineering/1tjb8v1.md#c3"
    char_span: [4821, 5156]
    sentence_count: 4
    key_terms: [bamboo-farm, nolemercy05, attributed, engineer, leverage, blurred, manager, natural]
    section: Comments
    token_count: 99
---
# Where do you draw the line between Analytics Engineer and Analyst responsibilities?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1tjb8v1/where_do_you_draw_the_line_between_analytics/)
Posted by **Rajsuomi** · **34↑** · **26 comments**

I’m a solo Analytics Engineer in my team and we have with a few Data Analysts. We don’t have a DE, so I also do pipeline and ingestion. Right now, the lines between our jobs sometimes feel really blurry.  
For example, the analysts build a lot of our dbt models and make changes to them. I know our roles naturally overlap, but I feel like we are missing clear ownership of who does what. Since they are not so technical and lack the engineering mindset, it can quickly turn into a spaghetti and miss best practices. I want to empower them, but I also want to make sure our architecture stays clean and that I'm actually doing AE work, not just acting as a code reviewer.

For those of you on similar teams, how do you split the work? Do you have a clear division of who does what?

I would love to hear what works for your team. Thanks!

## Comments

- **Lamyya** (12↑): How we do it is everything up to the semantic model is the responsibility of the analytics engineer(s), everything beyond is analysts
  - **Rajsuomi** (2↑): Hmm, so your analysts do not write dbt models at all. They don't touch the code?  
The problem is that it's very common for analysts to work inside dbt at my company, which is the challenge for me.
    - **Commercial-Ask971** (3↑): Yes. I built ingestion-gold layer, analyst build reports and draw insights based on it. If he wants to transform data in any way, PQ or fabric is his place, but enterprise data model sits in databricks
  - **creamycolslaw** (1↑): How do your analysts consume the semantic layer? My team is using Cube Core and it seems like the main way is to use Looker Dashboards, but frequently we want data connected to Google Sheets.
- **bengen343** (16↑): My entire career is built on fixing dbt implementations that analysts got their hands on. Don't let analysts into dbt.
  - **Outrageous_Let5743** (5↑): In general don't let the analyst do ELT work. The horrible sql I need to fix. 1500 lines no comments nested sql.
    - **i_lovechickenwings** (2↑): This is so funny because dbt was literally crafted to let analysts contribute to ELT pipelines and free up DE work and it’s such a high horse “what I do is too complex for ‘analysts’ take”. As if AEs or DEs don’t create bullshit webs of sql as well.

Literally from the dbt team:
“ dbt is not only an organism, but a virus. It infects the minds and organizations of the analysts who use it. Analysts frequently get started with dbt to build tables incrementally, but quickly find themselves making base models, writing schema tests, and building macros. They issue Pull Requests to their coworkers, and contribute back to dbt's open source packages. In the future, we want to expose the internals of dbt in a way that maximizes the adoption of these core workflows across data teams.”
- **Eleventhousand** (5↑): Nothing ever works out perfectly.  Plus, there are combined teams.  When I was department director and had thirteen on my team, we were all full stack.  I would start the junior level professionals on BI work before giving them opportunities in the data engineering side.

Where I currently work, I am theoretically supposed to do both engineering and analytics, but I've found myself working on a project for a couple of months that revolves around core functionality in accounting - more of a software engineering project.
- **peterxsyd** (2↑): Consolidate your roles. That much hand off and distinction destroys ownership.
- **maxbranor** (1↑): Often I see: analysts play around with tables in sql/power bi.
Once they are happy with it and it is a table(s) that will be reused, the engineer team builds them in dbt (therefore making them more maintenable)

If the analysts already are used to using dbt and dont want to stop with that, then they also need to be at least have basic knowledge with software development lifecycle (it is a trade off, after all). You need strict cicd pipelines and never allow analysts to write directly in prod databases (actually, dont let anyone but your cicd touch the prod databases)
- **Trick_Letterhead7770** (1↑): DAE build the semantic models, analysts use them and make the dashboards.
- **Tactical_Impulse** (1↑): Why do you care about best practices?

I’m in a similar boat. Do what is needed and get out.

If being asked to do something outside the scope of what you signed up for / want to do and you feel they are being unreasonable, be stern and tell them given your bandwidth, you cant support additional xyz tasks. this assumes you are totally okay with being fired.

Moral - stop caring so much. find ways to leverage power and be needed. Let the place burn if it must.
- **bamboo-farm** (1↑): GL
- **NoleMercy05** (1↑): Engineer is a HR attributed title.  There is no PE exam, no natural science, no proofs, only basic math. 

The lines are blurred
- **calm_ak** (1↑): My manager doesn’t see the line.
