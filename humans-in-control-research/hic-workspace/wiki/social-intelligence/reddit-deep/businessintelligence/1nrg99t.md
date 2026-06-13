---
id: social-intelligence/reddit-deep/businessintelligence/1nrg99t.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1nrg99t/how_do_you_use_ai_in_analytics/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "How do you use AI in Analytics?"
author: "rubka430"
date: "2025-09-26T23:29:47.000Z"
score: 2
upvote_ratio: 0.55
num_comments: 20
flair: ""
extracted_at: "2026-06-11T18:57:56.378Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1nrg99t.md#c0"
    char_span: [0, 902]
    sentence_count: 6
    key_terms: [businessintelligence, use, dashboard, comments, chatgpt, weekly, help, own]
    token_count: 211
  - id: "social-intelligence/reddit-deep/businessintelligence/1nrg99t.md#c1"
    char_span: [917, 2243]
    sentence_count: 1
    key_terms: [drivers, change, use, actions, metric, simple, weekly, llm]
    section: Comments
    token_count: 315
  - id: "social-intelligence/reddit-deep/businessintelligence/1nrg99t.md#c2"
    char_span: [2245, 4338]
    sentence_count: 12
    key_terms: [data, use, context, full, here, like, chatgpt, usually]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/businessintelligence/1nrg99t.md#c3"
    char_span: [4085, 5227]
    sentence_count: 2
    key_terms: [a-new-a16z-report-looks-at-which-ai-companies-startups-are-actually-paying-for, consumer, deliverables, use, enterprise, techcrunch, faster, https]
    section: Comments
    token_count: 299
---
# How do you use AI in Analytics?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1nrg99t/how_do_you_use_ai_in_analytics/)
Posted by **rubka430** · **2↑** · **20 comments**

You can obviously use AI a lot ways to help with coding, planning, cleaning and reporting.

But let's say you have to do a weekly review of the business, identifying not just how KPIs changed but also explaining the why and give recommendations: I currently use a dashboard for this where I deep dive on my own and look for longer trends as well.

How can AI help me in this? If I just throw the clean dataset behind the dashboard into Chatgpt/Gemini I usually get disappointing results. So far I am just listing my own insights into my notes then ask Chatgpt to summarize them properly, but there is got to be a better way to shorten my weekly 2 hours I spend on this task.

## Comments

- **thenewTeamDINGUS** (18↑): "How do I politely but firmly reply to this request with a 'fuck no, this is entirely impossible to answer because we don't capture that dimension and our data quality sucks?'"
  - **Far_Ad_4840** (1↑): This is it.
- **Ashleighna99** (12↑): The trick is to let AI prep the signals and drivers, then use the LLM only to write the story and actions.

\- Build a weekly features table: WoW/MoM deltas, trailing averages, seasonality z-scores, change points (ruptures/Kats), and flags for promos, price changes, outages, launches.

\- Run anomaly/change detection per KPI and key dims using median absolute deviation or a simple forecast model and look at residuals.

\- Do root-cause at the segment level: fit a simple tree ensemble (e.g., random forest) to predict the WoW change and use SHAP to rank drivers; also run a shallow decision tree to surface which segments moved most.

\- Create a “context pack” you always pass to the LLM: metric glossary/definitions, business rules, alert thresholds, event calendar, and the last 4 weeks’ summaries so it compares vs history.

\- Use a fixed prompt template: what changed, why (top 3 drivers with evidence), so-what, next actions (owner, metric to watch, timeline).

\- Schedule the Python/dbt job weekly and push the summary back to your dashboard.

Do this and your 2 hours drops to focused review and edits.
  - **Far_Ad_4840** (1↑): What program do you use that is secure with your company data?
  - **Plane_Comb_1169** (1↑): This sounds like a bunch of buzzword bollocks tbh
- **leadadvisors-** (6↑): AI is great at pattern detection, but it struggles with context unless you frame the problem well. Instead of throwing in raw dashboards, prompt it with a structured brief: “Here are my KPIs, here’s the business goal, here are anomalies I care about...analyze trends and explain causes.” That way you’re not replacing your judgment, you’re multiplying it.
- **pusmottob** (4↑): I have never used random AI like ChatGPT to do my work, that why I get paid a lot.  I have implemented system that use specialized LLM AI that we train on the data marts we curation so when a customer has basic question like, “how did  the four hospitals compare over the last year in patient utilization” it can give them a basic report and dashboard. Usually this is then given to us to generate a better more solid report.
- **LetsGoHawks** (2↑): I don't.
- **VaibhavSharmaAi** (1↑): AI can totally save your day. Use AI Automation and it will help you with repetitive tasks and manual data extract, all the calculations and what not.
- **NexDiscovery-JVince** (1↑): Hi - would be happy to show you how NexDiscovery works. Proactively and autonomously does exactly what you are describing. All on prem with no outside LLM connection. 
The additional assistance is that it will find even more data insights with no human prompting.
- **clr0101** (1↑): Have you tried nao? It directly connects to the warehouse so it has your full data context. And you can also open your data modeling repo or add custom rules to the AI agent so that it has the full context around your data. 
Usually for weekly reports I just craft full prompts explaining the analysis I want in it and then just make it run on it every week
- **robert-moyai** (1↑): I would argue that most enterprise use of AI for analytics is done using consumer AI products (chatGPT/Claude/Gemini). It's something that has been pointed out by a16z as well in this report: [https://techcrunch.com/2025/10/02/a-new-a16z-report-looks-at-which-ai-companies-startups-are-actually-paying-for/](https://techcrunch.com/2025/10/02/a-new-a16z-report-looks-at-which-ai-companies-startups-are-actually-paying-for/) \- “We’re seeing that a lot of these \[consumer\] companies are getting yanked into enterprise faster and faster because they make such delightful consumer tools that then people adopt and use as individuals and bring into their teams and workplaces,”
- **Ok-Fun9683** (1↑): try [Deliverables.ai](http://deliverables.ai/). i use it to generate reports. but it doesn’t just rehash what I tell it. it’s capable of discovering patterns, analyzing them, and drawing conclusions. it’s helped me find order in chaos and make sense of the noise.
  - **ChaserDem** (1↑): Thanks, will check it out.
