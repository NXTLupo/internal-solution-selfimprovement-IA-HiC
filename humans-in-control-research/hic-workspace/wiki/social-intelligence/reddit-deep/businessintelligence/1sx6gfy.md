---
id: social-intelligence/reddit-deep/businessintelligence/1sx6gfy.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1sx6gfy/best_ai_query_and_visualization_tools/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Best AI query and visualization tools"
author: "Best_Day_3041"
date: "2026-04-27T15:07:37.000Z"
score: 2
upvote_ratio: 0.57
num_comments: 24
flair: ""
extracted_at: "2026-06-11T18:57:56.373Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1sx6gfy.md#c0"
    char_span: [0, 1204]
    sentence_count: 8
    key_terms: [businessintelligence, visualization, able, user, want, questions, comments, product]
    token_count: 277
  - id: "social-intelligence/reddit-deep/businessintelligence/1sx6gfy.md#c1"
    char_span: [1219, 2704]
    sentence_count: 13
    key_terms: [data, like, odd-string29, mcp, questions, already, access, agents]
    section: Comments
    token_count: 358
  - id: "social-intelligence/reddit-deep/businessintelligence/1sx6gfy.md#c2"
    char_span: [2706, 4220]
    sentence_count: 11
    key_terms: [like, last, sql, use, week, cases, language, produces]
    section: Comments
    token_count: 350
  - id: "social-intelligence/reddit-deep/businessintelligence/1sx6gfy.md#c3"
    char_span: [4222, 5869]
    sentence_count: 4
    key_terms: [build-your-own-data-analytics-slack-ai-agent-with-shaper, chat, like, mcp, open, own, sql, dashboards]
    section: Comments
    token_count: 367
  - id: "social-intelligence/reddit-deep/businessintelligence/1sx6gfy.md#c4"
    char_span: [5871, 8044]
    sentence_count: 15
    key_terms: [data, users, tool, want, permission, generate, ability, athenic]
    section: Comments
    token_count: 512
---
# Best AI query and visualization tools

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1sx6gfy/best_ai_query_and_visualization_tools/)
Posted by **Best_Day_3041** · **2↑** · **24 comments**

I have a SAAS business application with a ton of reports. I want to add the ability for a user to ask questions of their data, such as how many of X product did I sell last month, or create me a graph of all the sales of X product for last year. 

I want to be able to make this a chatbot for 1 shot questions, as well as allow the user to save a report or visualization they created for later use, with different input parameters like changing the date or staff member for instance, as well as be able to create widgets for a dashboard. 

Ideally I want something open source that I can host and embed in my React app for free and bring my own LLM. I don't mind doing a lot of the heavy lifting to make it work or adding additional functionality. Or if there is more of a DIY approach anyone recommends. It needs to be able to shield users from accessing other user's data, both on an account level and then an individual user/role level. 

Any suggestions?

## Comments

- **Odd-String29** (4↑): My suggestion is creating a semantic layer first. Giving raw tables to a tool like that will just produce garbage. So get your data in a data warehouse and get to work.
  - **Best_Day_3041** (1↑): I am doing that. I just need a tool to translate the question to SQL and do any post processing necessary. Simple giving it to an LLM SDK and asking it to do that produces too many issues.
    - **Odd-String29** (1↑): Any LLM can use an MCP server. So that's your solution. Selfhost Cube for example.
- **tech4ever4u** (1↑): I'm on another side (BI tool's vendor) and we already have built-in "Ask Data" feature for one-shot questions like you mentioned. Also, we currently working on the MCP server implementation to support more advanced agentic workflows, allowing users to "chat with data" in a safe and governed manner (AI agents can access only data that the user can access via web UI, according to the sharing / row-level security rules). MCP's prototype is already available for beta testing.

While not open-source or free, the product is not aimed at enterprises either; it is priced affordably for SMBs. On-prem version is present and it can be used as an embedded BI. Local LLMs can power both in-app AI features and agents that utilize MCP tools to answer data questions (like qwen3.5:9B). For more complex tasks like creation of cubes / HTML-driven dashboards, more capable coding-oriented models will be needed (similar to minmax-2.5 / opus 4.5). 

Let me know if you'd like a look - feel free to PM me or just say the word and I'll share the name here.
  - **Best_Day_3041** (1↑): I have the presentation layer and chatbot, I just needs the piece that takes natural language and produces the SQL and manages the response. I tried making it myself but there were so many use cases it messed up on. Like if I asked it how many sales I had last week, it didn't know what days last week was. I need it to either be able to ask clear followup questions or make assumptions on things like this. I was finding I had to add so many rules to the prompt that I was sure there were going to be so many use cases I'd miss.
    - **tech4ever4u** (2↑): > I just needs the piece that takes natural language and produces the SQL and manages the response

It sounds like you're describing a MCP in BI tools that handles data governance. They use structured queries in terms of the BI tool's data model, then translate them into SQL. This process is deterministic, it ensures the output is always predictable, safe, and consistent.

> I tried making it myself but there were so many use cases it messed up on. Like if I asked it how many sales I had last week, it didn't know what days last week was.

All this is 100% can be achieved with LLM-powered NLQ.

If you want your chatbot to be fast and accurate, don't let the LLM write raw SQL from scratch for every request. Having it analyze the entire database schema on the fly is usually a recipe for errors and slow performance.

You may take a look at Cube.dev but their MCP server is not available in their free plan and not available in the OSS/self-hosted version (Cube Core) either. And if you're open to paid solutions, check out SeekTable - our MCP server is already live and ready for testing!
- **Embiggens96** (1↑): yeah what you’re trying to build is totally doable, but there isn’t one open source tool that covers chat, sql generation, dashboards, and permissions all in one. most teams solve this by combining a natural language to sql layer with a chat framework and a separate dashboard tool. something like vanna works well for turning questions into sql with your own llm, and you can wrap that with a framework like langchain to handle conversations and orchestration. that gives you the core “ask questions about data” experience.

for dashboards and saved reports, it’s way easier to plug into something like stylebi or superset instead of building that yourself. you can take the generated queries from your chat layer and let users save them as reports or widgets there. the biggest challenge isn’t the chatbot, it’s making sure users only see their own data through proper tenant and role level controls. if you get that architecture right early, the rest becomes much easier to scale.
- **jorinvo** (1↑): For building AI chat check Onyx AI.

Metabase just open sourced their MCP support.

I just blogged about how I built a custom Slack agent on top of Shaper (my own product): 

[https://taleshape.com/blog/build-your-own-data-analytics-slack-ai-agent-with-shaper/](https://taleshape.com/blog/build-your-own-data-analytics-slack-ai-agent-with-shaper/)

TLDR: LLM to generate SQL, Shaper to generate dashboard/chart/pdf.
  - **Best_Day_3041** (2↑): Thanks I will take a look at that
- **Cute-Argument-6072** (1↑): Not sure of an open source tool with all that. What if you consider an affordably priced option targeting startups and SMBs? For example, I use Knowi and it has what you're looking for. It has the Ask Data feature which you can embed in your own app or use it directly from Slack and Teams. For data protection, it has built-in tenant isolation workspace-level permission, row-level security, and permission controls, so no user will access other user's data. In terms of pricing, it is very affordable and you can ask them for a discount.
  - **Best_Day_3041** (1↑): It doesn't have to be free, I just want the pricing to be transparent and scaleable. So many packages have a free tier that jumps up to like $500/mo after a few users, or they make you schedule a call and get a quote. I'll check out Knowi. Thanks
- **chef7931** (1↑): This is where most people get tripped up with AI data tools. You're thinking about giving users the ability to query data, but are you tracking whether your AI is actually giving them accurate answers? A lot of these chatbot implementations look impressive with natural language processing, but then you find out they're recommending outdated products or misinterpreting the questions completely. Before you pick a tool, I'd focus on answer accuracy rates and whether the AI can distinguish between what users are actually asking for versus what it thinks they want. Citation count from your database doesn't mean the recommendations are helping users make better decisions.
  - **Best_Day_3041** (1↑): Well that's why I'm looking for a tool that is already tested and proven. And also asking here to see if this is even possible to do reliably.
- **HourWafer5454** (1↑): might want to check out athenic, isnt for DIY but it's been pretty useful for what you were describing and meets the role based access requirement
  - **Best_Day_3041** (2↑): Do you have an experience using athenic? There isn't a ton of info on their site or any demos or ability to talk to a sales agent.
