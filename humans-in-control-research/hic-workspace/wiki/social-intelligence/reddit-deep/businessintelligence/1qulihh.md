---
id: social-intelligence/reddit-deep/businessintelligence/1qulihh.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1qulihh/anyone_else_seeing_fewer_dashboard_requests_this/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Anyone else seeing fewer dashboard requests this year?"
author: "sdhilip"
date: "2026-02-03T07:23:44.000Z"
score: 169
upvote_ratio: 0.82
num_comments: 69
flair: ""
extracted_at: "2026-06-11T18:57:56.369Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1qulihh.md#c0"
    char_span: [0, 2295]
    sentence_count: 25
    key_terms: [want, clients, dashboard, building, businessintelligence, dashboards, "i'm", numbers]
    token_count: 487
  - id: "social-intelligence/reddit-deep/businessintelligence/1qulihh.md#c1"
    char_span: [2297, 4055]
    sentence_count: 11
    key_terms: [data, dashboard, question, tableau, little, others, people, report]
    section: Comments
    token_count: 415
  - id: "social-intelligence/reddit-deep/businessintelligence/1qulihh.md#c2"
    char_span: [4057, 5872]
    sentence_count: 23
    key_terms: [business, dashboard, get, reporting, walia664, running, sdhilip, actual]
    section: Comments
    token_count: 418
  - id: "social-intelligence/reddit-deep/businessintelligence/1qulihh.md#c3"
    char_span: [5874, 6715]
    sentence_count: 5
    key_terms: [time, businesses, giving, waste, data, don, extrapolate, jaxjags2100]
    section: Comments
    token_count: 200
  - id: "social-intelligence/reddit-deep/businessintelligence/1qulihh.md#c4"
    char_span: [6717, 8754]
    sentence_count: 23
    key_terms: [dashboards, reports, need, want, access, better, people, apps]
    section: Comments
    token_count: 442
  - id: "social-intelligence/reddit-deep/businessintelligence/1qulihh.md#c5"
    char_span: [8756, 10917]
    sentence_count: 12
    key_terms: [dashboards, numbers, automated, want, whatsapp, email, screenshots, like]
    section: Comments
    token_count: 483
  - id: "social-intelligence/reddit-deep/businessintelligence/1qulihh.md#c6"
    char_span: [10919, 11546]
    sentence_count: 7
    key_terms: [less, like, automatically, lepopnoisette, exploration, remembering, dashboards, day-to-day]
    section: Comments
    token_count: 137
---
# Anyone else seeing fewer dashboard requests this year?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1qulihh/anyone_else_seeing_fewer_dashboard_requests_this/)
Posted by **sdhilip** · **169↑** · **69 comments**

Been doing BI consulting for about 10 years, mostly for small and medium businesses. Built hundreds of dashboards in Tableau and Power BI over that time.

But this year something changed. Dashboard requests dropped noticeably.

Wanted to share what I'm seeing and hear if others are experiencing the same.

**What's happening with my clients**

My bigger clients still want dashboards for deep-dive analysis. But most of my SMB clients? They just want the key numbers. They don't want to log into a portal, find the right tab, filter five times just to see if sales are up.

They're asking for simpler solutions.

**What I'm building instead**

Three things have taken over most of my work:

**1. Chatbots on top of their data**

Clients want to ask questions in plain English and get answers. The tricky part isn't the AI — it's building a solid semantic model underneath so the answers are actually accurate.

**2. KPIs pushed to Slack/Teams/WhatsApp**

Leadership doesn't want another login. They want key numbers delivered before their morning coffee. I'm building agents that pull from databases and push metrics directly to their existing channels.

**3. Automated reports via email**

Some clients still want a daily PDF or PPT summary in their inbox. Instead of building this manually, I'm using automation tools to pull data, generate the report, and send it out.

**Why I think this is happening**

Beyond the AI hype, SMBs are looking to cut costs. Connecting data sources and maintaining dashboards gets expensive. They want something simpler that fits their actual workflow.

**One example**

A small manufacturing client wanted a Power BI dashboard connecting Xero and Zoho. When we priced out the connectors, it blew their budget.

We stepped back. They didn't need a full dashboard, they needed daily visibility on a few numbers.

Built an automation that hits both APIs and sends their KPIs to Teams every morning. Hosting cost is minimal. They're happy because it fits how they actually work.

**The shift**

It feels like insights are moving from "pull" (log in, find the report) to "push" (data comes to you).

Curious what others are seeing. Is dashboard work slowing down for you too? What tools are you using for these self-service use cases?

## Comments

- **kappapolls** (44↑): no but im seeing more ai blogspam
- **RiddleADayKpsBtmnAwy** (43↑): Mainly commenting to see others responses… but

My team is actually shifting a lot to do more of exactly what you described in terms of just making the connections between core platforms and delivering either a metric or a way to pull the data itself easily and accurately.

Obviously major KPIs/metrics still need a periodic view (whether that’s a sub from PBI/Tableau or just a clean excel view that’s emailed to them in the mornings with a little bit of qualitative analysis in the body)…  but I’ll be honest I was also tired of building dashboards that nobody used/would question accuracy.  

People are gonna get on here and argue that my problem is requirements gathering issues and not answering the right question and all for users…  but the truth is really what you said… people just don’t want to login to another portal.  They want the answer in their email (likely in excel) with a little bit of explanation to go with it.
  - **sdhilip** (3↑): Ok agree. Thanks
- **DeletdButChngdMyMind** (14↑): Ok, I’ll bite, as this is prevalent at big places for similar reasons.

1. Reports delivered on a subscription (Tableau, PBI, etc.) normalized waking up to a report every morning at 9:03am.

2. Dashboard sites/servers/suites have been built out over the past few years, and are hard to navigate/slow to filter (this is dependent on developers and data, but still). Subscriptions eliminate that experience.

3. Leadership is into mobile reporting now — same concept as your describing, but a scrollable splash of everything important to know in the business without granularity. Expect to see that booming soon now that most reporting platforms are up and running.
  - **sdhilip** (1↑): yeah very true. Couple of my clients now wants to cut the scubrciption cost. I mostly deliver in Power BI/Tableau and they want to cut the subscription. Something I use Ai Agents to get the report out in secured way. Thanks for sharing your experience
    - **emrcreate** (0↑): What ai agents are you using ? What  llm ?
- **walia664** (11↑): Former BI associate who jumped to running ops.  Honestly, I hate dashboards. I need 5 numbers daily / weekly that show me the health of the business unit. Anything past that can be put in a quarterly PowerPoint. 

Really comes down to bandwidth, and the fact that making changes in a business requires a ton of “people work”. 

A chatbot that was fed my companies data would be 10x better than another dashboard view
  - **sdhilip** (2↑): Ok thanks for your view. Yes, same thing happened with my customers. Seems landscape is changing
    - **walia664** (5↑): I think the initial excitement about “democratized data” waned. 

Like - I run a regional division of a healthcare business. A dashboard might tell me that my company underperforms on collecting all the revenue we’re entitled to, on time, from a specific payor. What am I actually going to do? Assume I only get 3 things done a quarter. Is fixing that problem one of them? If not the dashboard was useless. 

CEOs LOVE the IDEA of everyone having that level of detail at their fingertips. Actual boring middle managers who actually get actual things done just get distracted by problems like that, unless they ACTUALLY move EBITDA. 

I’ve been on both sides of the aisle and remember the C-Suite team having lots of requests for data tools, and the mid levels (regional sales managers, product directors) not giving a single shit and treating me like a waste of their time. Now that I’m and Area VP of Clinical Ops, I also think BI people are a waste of time (I’m just nicer to them because I’ve done that grind 😊)
  - **jaxjags2100** (1↑): The challenge is giving an AI agent access to all of those data sources to extrapolate and provide KPIs and analysis. Large businesses don’t have the appetite for that amount of risk imo. Small/medium businesses would likely be fine tho.
    - **walia664** (1↑): After spending time on the exec side here’s my response “I don’t understand any of that I just want it shipped also please change the color scheme. End of day Friday work”

^ the dev team that can take that feedback and deliver will get P-A-I-D
- **TimLikesPi** (3↑): I have always done a lot of emailed reports. Much of my c-suite and officers do not want to jump into BI apps. They want delivered reports into their inboxes. I can do that. We just had some retirements and have somebody auditing these reports and seeing what we no longer need. Usually I try to configure new reports from existing apps. Honestly, a lot of our c-suiters and officers have trouble logging onto our VPN and getting access to stuff. Emailed reports solves this. Meanwhile the folks doing the work that need information can drill down in apps to see what they need, using analysis tools that are better suited to their needs than dashboards. DIfferent people, different needs. Dashboards are rarely the right answer, just like pie charts.
  - **Upbeat-Wing-6320** (2↑): Automated reports delivered in your mailbox are underrated. Most people claims to want dashboards, but end up never using them. A small group of analysts might prefere dashboards but they usually wants access to the raw data as well making the dashboards kind of unnecessary
  - **sdhilip** (0↑): yeah I agree. Also the licensing cost is increasing
- **thacoolbreeze** (5↑): I think dashboards and the like will still matter. However they will evolve more into app like interfaces for easy access. They will also become less busy and focus on the things people care about. Because higher ups still want to have a repository to reference later from a visual perspective. No one wants to go searching through email, teams, slack, etc to find several high alert signals from 16 months ago.

Overall building better but simpler dashboards with better business context is where the money is at. This means you need to understand and engage stakeholders from their operational level. Go and see what they do, watch the operation, ask their staff what they do and how they use data. Thats where the stickiness is. Don’t just collect requirements and start building. 

I agree with another person on the thread that said create dashboards as a last resort. Because half the time a simple excel file linked to backend or an email push will do. I remember I had a Senior level executive ask me to create a big fancy graph for like 4 numbers to go into a PPT. My response was “wouldn’t it be easier to just put them in a table or narrative form.” Sure enough that was the “you know what….” moment to keep it simple.
  - **sdhilip** (0↑): Agree
- **Aislot** (3↑): yeah seeing the same shift honestly dashboards feel like work for most smb folks they don’t want another tool to babysit they just want answers where they already are the pull vs push framing is spot on slack email whatsapp beats logging into bi every time ai didn’t kill dashboards but it changed expectations insights need to show up automatically or they’re ignored feels like the future is fewer heavy dashboards and more lightweight agents sitting on top of clean data models curious how you’re handling trust though once numbers are pushed people stop double checking fast
- **Lost_Abbreviations13** (2↑): I work in a large automated network, with several brands... and this is real... I automated the screenshots of the dashboards and send them via WhatsApp to groups.... The day it's not sent, everyone complains... they don't even log into the business intelligence system anymore....
I also automated sending it to email, the previous management wanted it that way... so it matches what I experience here.
  - **sdhilip** (0↑): good to know about taking dashboard screenshot
    - **Lost_Abbreviations13** (1↑): Yes, I use Selenium to take screenshots and save them as PNGs... it goes to the public link on the dashboard... Of course, a public link that only I have access to...

After that, I use the Evolution API to send WhatsApp messages
of these images to stakeholder groups and numbers...

They love this feature
- **[deleted]** (2↑): I’m seeing the same shift. Dashboards aren’t “dead,” but for a lot of SMBs they’re just not the right default anymore. Most teams don’t want to pull data — they want the few numbers that matter, where they already work.

A lot of the friction isn’t analysis, it’s attention. Logging in, filtering, remembering to check… that’s a tax. Push-based insights remove that.

We still use dashboards for exploration, but day-to-day decisions are driven by simpler setups: KPIs pushed to Slack and tools that surface changes automatically. We’ve been using **Anomaly AI** alongside this so unusual movements get flagged without anyone actively looking.

Feels less like “less BI” and more like BI finally adapting to real workflows. Curious to see how others are balancing push vs pull.
- **LePopNoisette** (2↑): I'm still dealing with last year's requests.
