---
id: social-intelligence/reddit-deep/businessintelligence/1lzrt15.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1lzrt15/looking_for_a_low_cost_reporting_tool_to/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "looking for a low cost reporting tool to supplement Power BI"
author: "Worldly-Pollution-66"
date: "2025-07-14T16:56:39.000Z"
score: 9
upvote_ratio: 0.92
num_comments: 25
flair: ""
extracted_at: "2026-06-11T18:57:56.378Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1lzrt15.md#c0"
    char_span: [0, 2078]
    sentence_count: 8
    key_terms: [solver, businessintelligence, power, "i'm", tool, functionality, excel, data]
    token_count: 465
  - id: "social-intelligence/reddit-deep/businessintelligence/1lzrt15.md#c1"
    char_span: [2080, 4171]
    sentence_count: 9
    key_terms: [reports, seektable, report, tables, excel, power, like, use]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/businessintelligence/1lzrt15.md#c2"
    char_span: [4173, 6436]
    sentence_count: 18
    key_terms: [reports, something, need, dashboards, automated, create, capabilities, area]
    section: Comments
    token_count: 501
  - id: "social-intelligence/reddit-deep/businessintelligence/1lzrt15.md#c3"
    char_span: [6438, 7236]
    sentence_count: 10
    key_terms: [reports, dashboards, framework, design, lower, cost, user, infragistics]
    section: Comments
    token_count: 175
---
# looking for a low cost reporting tool to supplement Power BI

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1lzrt15/looking_for_a_low_cost_reporting_tool_to/)
Posted by **Worldly-Pollution-66** · **9↑** · **25 comments**

We are in process of creating a data warehouse in azure, and plan on using Power BI to create dashboards that leverage that data. I'm PBI certified so no issues there. Currently, we are on Solver (cloud and excel based tool with included DW) as our financial reporting tool, and as far as i know, there is no way to duplicate what we've created in Solver within Power BI. SSRS is the only MS branded tabular report solution that i'm aware of. (i remember seeing some kind of tabular option for power bi, but i don't think it ever materialized?)

Management is looking for a lower cost alternative to Solver and i'm trying to steer them away from SSRS (i know enough to be dangerous, but do not yet have the chops to duplicate what we have in Solver) to something more user friendly/robust.

One major requirement is that we'd need some kind of publisher/scheduler functionality that can essentially generate our PL and BS reports for each division (we have like 300) across our companies. currently i have a bot running in UI Path that goes out to the Solver client and runs these reports based on an excel matrix of the criteria. The bot doesn't play well with a web interface, and needs to be babysat, not to mention it takes almost 2 days to complete. 

Another, is that we want to build out a better budgeting process, right now it's in Solver, but we were never able to sell people on moving beyond the most basic "fill in excel sheet at GL account level, load to DB" methodology. with a new system we are hoping to get a sort of workflow going, rather than everything getting passed around by email. SSRS could  report on that data, but we'd need to build our own interface to get it into the DW. i'm hoping that could be selling point to go with another tool that has budgeting functionality.

Does anyone have any suggestions? i'm a bit overwhelmed at the landscape of tools out there, and was looking for a bit of guidance. there are a ton of tools out there, and it seems like, with Power BI in play, everything overshoots our needs, or does not meet them.

## Comments

- **Foodforbrain101** (8↑): Report Builder allows you to publish paginated reports, and you can embed them in regular reports as well. Power BI Pro licenses are all you need.
- **purplework** (6↑): Power bi report builder is SSRS but can use pbi datasets.
  - **Worldly-Pollution-66** (1↑): ah, good to know. is that live? last i checked you needed to buy the higher (highest?) tier of subscription for it even to be available. i think it was still in beta (or whatever) as well
- **Embiggens96** (3↑): I'd check out StyleBI, its scheduling and publishing are pretty robust, and it's known for having a flexible pricing structure for smaller deployments.
- **tech4ever4u** (1↑): > something more user friendly/robust.
> runs these reports based on an excel matrix of the criteria. The bot doesn't play well with a web interface, and needs to be babysat

It sounds like our [SeekTable](https://www.seektable.com) can be a good fit for your purposes (tabular reports, esp. pivot tables). BTW, SeekTable can export reports to pre-configured Excel PivotTable. With conditional HTML formatting tables can be highlighted as needed.

'Managed' self-service use case is fully supported by SeekTable, when 'creator' (IT specialist) configures data connections / data model and end-users can use shared cubes to create own reports (via simple web UI) and schedule these reports delivery by email. Tables/charts may be rendered directly into email body, in addition to Excel/PDF/CSV exports as attachments.

SeekTable is often used as a 'supplementary' on-prem BI tool (or embedded BI), and it has really affordable pricing which doesn't depend on the number of report consumers. This means that you can share cubes/reports to hundreds of users for a fixed cost, not like in PBI where you have to pay for each user $14/mo.

Disclaimer: I'm affiliated with SeekTable. Feel free to PM me if you have questions.
- **lucekek22** (1↑): It sounds like you're juggling quite a complex situation with the reports and automated workflows. Transitioning to a new tool can definitely be a headache, but it's great that you’re exploring options. Have you looked into platforms that combine business intelligence with automation? You check our company Echo Analytics (www.echoanalyticshub.com), maybe you\`ll find something that suits you. We offer  customizable dashboards and automated reporting features that could potentially ease the workload you're facing. Plus, its integration capabilities with existing tools like Power BI could keep your transition smoother. We approach each of our clients individually and try to create solution based on the identified needs. If sounds interesting - just dm me!
- **No-Reception-2268** (1↑): So..just to make sure I understand your scenario: your source data is in azure dw, you want the final BI/charting to be in powerBI and you need something to analyze the data from the former and put it in the latter?
  - **Worldly-Pollution-66** (1↑): We need something to pull data into paginated tabular reports that we can deliver to clients. P&L reports by division with additional tabs for each department in that division etc. Power bi can’t do what we need so I need to find a low cost alternative. I’d prefer something excel based, so the learning curve is not so steep as SSRS.
- **012345678nine** (1↑): You should look into Domo. It can connect directly to your azure dwh. It has a feature called Domo everywhere where you can create dashboards and either embed them in a customer portal or you can give them their own child instance of Domo where you push and pull content from. Super easy to use and great for non technical users as well. Offers ETL capabilities if you need to do any quick ad hoc stuff outside of the dwh.
- **[deleted]** (-2↑): I am more of a developer than a BI person. My advice oviusly will say create a system if you have a budget. 

How i did it in my company is that i created a reporting system, one area for all dashboards, another area for tabular reports, another area for nice reports like invoices and automated reports.

 I am using MVC C#. There are many frameworks for dashboards and reports.  If you decide to go this route the framework you should be checking are Telerik, Infragistics, Syncfusion and  DevExpress. We use one for reports, one for dashboards and one for tabular reports which we call grids and one for the site itself. 

Users can design their dashboards and reports, all we do in IT is to give a report or a dashboard an access to a stored procedure or a table. And then assign permissions to the right user. For dashboards and nice reports there is an extra permission to specify if a user can design or not.

You were looking for a lower cost, i dont know if this is a lower cost or not. If you have developers you will only worry about framework licence feee.

 I can show you a demo of our app.
