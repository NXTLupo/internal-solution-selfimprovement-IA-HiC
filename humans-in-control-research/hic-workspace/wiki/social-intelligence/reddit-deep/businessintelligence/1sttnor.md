---
id: social-intelligence/reddit-deep/businessintelligence/1sttnor.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1sttnor/who_is_doing_embedded_analytics_right_heres_what/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Who is doing Embedded Analytics Right? Here’s what I found."
author: "TalkToMeNerdy"
date: "2026-04-23T20:00:06.000Z"
score: 18
upvote_ratio: 0.87
num_comments: 32
flair: ""
extracted_at: "2026-06-11T18:57:56.371Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1sttnor.md#c0"
    char_span: [0, 2047]
    sentence_count: 19
    key_terms: [embedded, tableau, businessintelligence, experience, power, clients, "i've", "it's"]
    concepts: [embedded, businessintelligence, tableau, experience, power]
    token_count: 461
    sources: [{"n":"reddit-deep: r/businessintelligence","u":"https://www.reddit.com/r/BusinessIntelligence/comments/1sttnor/who_is_doing_embedded_analytics_right_heres_what/"}]
  - id: "social-intelligence/reddit-deep/businessintelligence/1sttnor.md#c1"
    char_span: [2049, 4440]
    sentence_count: 19
    key_terms: [pricing, research, embedded, user, annually, multi-tenancy, users, deployments]
    concepts: [pricing, research, embedded, annually, multi-tenancy]
    token_count: 485
  - id: "social-intelligence/reddit-deep/businessintelligence/1sttnor.md#c2"
    char_span: [4442, 6049]
    sentence_count: 12
    key_terms: [predictability, model, domo, connector, embedding, customer, reported, research]
    concepts: [predictability, model, connector, embedding, customer]
    token_count: 337
  - id: "social-intelligence/reddit-deep/businessintelligence/1sttnor.md#c3"
    char_span: [6063, 8232]
    sentence_count: 26
    key_terms: [embedded-analytics, holistics, tableau, enough, data, qlik, analytics, framework]
    concepts: [embedded-analytics, holistics, tableau, enough, analytics]
    section: Comments
    token_count: 492
  - id: "social-intelligence/reddit-deep/businessintelligence/1sttnor.md#c4"
    char_span: [8234, 8360]
    sentence_count: 1
    key_terms: [performancevoptimise, expensive, always, caveat, direct, means, query, give]
    section: Comments
    token_count: 27
  - id: "social-intelligence/reddit-deep/businessintelligence/1sttnor.md#c5"
    char_span: [8362, 10199]
    sentence_count: 8
    key_terms: [talktomenerdy, check, sigma, been, "i'm", "it's", holistics, semaphor]
    concepts: [talktomenerdy, check, sigma, holistics, semaphor]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/businessintelligence/1sttnor.md#c6"
    char_span: [9962, 10991]
    sentence_count: 7
    key_terms: [sigma, dashboards, quote, got, like, sea-garden7836, automatically, architecture]
    concepts: [dashboards, sigma, quote]
    section: Comments
    token_count: 256
---
# Who is doing Embedded Analytics Right? Here’s what I found.

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1sttnor/who_is_doing_embedded_analytics_right_heres_what/)
Posted by **TalkToMeNerdy** · **18↑** · **32 comments**

I've been deep in Power BI embedded implementations for clients lately and kept getting asked how it stacks up against alternatives. So I went down the rabbit hole comparing some of the top BI tools on the market. The tools I chose were Power BI, Tableau, Looker, Qlik, ThoughtSpot, Sigma, and Domo. I don't have concrete numbers to back up these selections, but from the clients I've worked with over the past decade, this list is pretty representative of what I've seen.

Upfront disclaimer: My Power BI and Tableau takes are from direct implementation experience. Everything else is research, including docs, blogs, Reddit, input from clients, and other writeups. I'll flag which is which.

**Power BI (from experience)**

The "app owns data" model is solid in theory. Your app handles auth, end users never touch a Microsoft login. In practice, you're juggling Entra ID, service principals, backend token generation, and RLS rules. It's not impossibly hard, but it can be convoluted. Third-party cookie blocking and finicky service principal permissions have burned me more than once.

The bigger gotcha: standard Fabric/Pro licenses don't cover external embedding. You need Azure A SKUs, which start at around $735/mo for A1 and scale fast. Fabric F-SKUs are now an alternative starting at around $262/mo for F2, though most production embedded workloads land at F64 or higher. If a client hasn't budgeted for capacity separately, you'll need to have that conversation.

**Tableau (from experience)**

Connected Apps with JWT is the modern standard and it's actually cleaner than the old SAML redirect song and dance. The auth piece isn't the hard part, it's the production scale. Performance tuning a Tableau embedded deployment is where timelines have slipped.

Pricing is genuinely vague, and I wasn't involved in the cost convos when I was doing these deployments. From my research, embedded analytics contracts reportedly range from the low tens of thousands annually for smaller deployments into the high six figures for large enterprise deals, with usage-based analytic view pricing on top for external users..

**Looker (research)**

The LookML modeling layer is the whole value prop. You define your data logic once then can use it consistently everywhere. Cookieless embedding (v22.20+) solves a real pain point. But the LookML learning curve is notorious, and multi-tenancy config is a closed system that's hard to change once you've committed.

Pricing: no public numbers, but reported base platform pricing is around $60K/year with viewer seats at $400/user/year on top. Multiple sources describe it as "wildly expensive" at scale, and for embedded use cases with thousands of external viewers the math gets painful fast.

**Qlik (research)**

Qlik's associative engine is genuinely different from traditional BI. It indexes all data relationships so users can explore without predefined queries. That's powerful, but it requires a different mental model and the recommended multi-tenancy approach is one tenant per customer org. Qlik's own docs explicitly recommend this pattern, meaning 200 customers = 200 tenants. That scales badly in both operational overhead and cost.

JWT auth works well once configured, but Section Access (their RLS scripting) is error-prone and needs thorough testing.

**ThoughtSpot (research)**

The AI-powered search angle is real. Users can ask questions in plain English and get answers on live data. The Visual Embed SDK is solid (TypeScript, works with React/Angular/vanilla JS). The caveats: visualization options are basic (frequently compared to Excel-level charts), charts aren't responsive across device sizes, and the pricing is easily the most opaque on this list.

Developer Edition is free for a year. Paid Analytics tiers start at $25/user/month (Essentials) and $50/user/month (Pro) when billed annually, with Enterprise custom-quoted. Embedded is a separate product line, and reported embedded contracts for software vendors typically run $200K+ annually, with consumption-based pricing that can reportedly hit $5-6 per dashboard load per user. Read the contract carefully.

**Sigma (research)**

The standout here is deployment speed. Single URL iframe embedding, no custom SDK required, keep your existing auth. Customer reports consistently describe POC in hours to days and production in 1-2 weeks. The spreadsheet-like interface also means minimal training lift for business users.

Pricing starts lower than most on this list (around $300/mo reported) with an unlimited viewer model that's a genuine cost advantage when you have large external user bases. Worth noting: since Sigma queries live against your warehouse, compute costs scale with usage so build that into your pricing model.

**Domo (research)**

Domo's connector breadth is legitimately impressive, with 1,000+ connectors and strong coverage across CRMs, accounting tools, marketing platforms, and cloud warehouses. Magic ETL handles cross-source blending well. Basic embedding is accessible and the "weeks not months" claim isn't unreasonable for simple use cases.

The risk is billing predictability. Credits get consumed by data refreshes, ETL, dashboards, and storage, and from my research there are no good forecasting tools. Renewal increases of 100%+ have been reported, with some verified customer accounts describing far worse. If cost predictability is a priority, go in with eyes open.

**TL;DR**

* Fastest to deploy: Sigma
* Most enterprise-entrenched: Power BI / Tableau
* Steepest learning curve: Looker (LookML) and Qlik (associative model)
* Most expensive ceiling: ThoughtSpot
* Most unpredictable billing: Domo
* Best connector breadth: Domo

Would love to hear everyone else's experiences and thoughts about this.

## Comments

- **holisticsbi** (7↑): We put together a comparison page covering embedded analytics vendors. Apart from the tools already mentioned (Looker, Sigma, Domo, Thoughtspot, Tableau, PowerBI), we also looked into other/rising vendors Holistics, Embeddable, Metabase, Sisense, Luzmo, Reveal BI

Might still be useful if you’re researching options [https://www.holistics.io/bi-tools/embedded-analytics/](https://www.holistics.io/bi-tools/embedded-analytics/)
- **Xavya** (7↑): Nice analysis, thanks for sharing. 

I kind of disagree about the LookML learning curve. Its SQL based and can be automatically generated for tables added to your project. So you potentially only have to think about a few metrics per table.

I think it's the standard for semantic layers but admittedly am not familiar with all tools. Definitely pricey though. 

I despise tableau lmao
  - **TalkToMeNerdy** (1↑): Thats great insight. I’ve never interacted directly with Looker enough to know the learning curve there so very good to know from someone who’s been there and done that.

And re: Tableau….SAME lol
- **parkerauk** (3↑): I have, similarly, spent many years in this, approaching 30, and should comment. Embedded analytics comes in three flavours, pre built. Custom and AI.

Then you have the purpose Portal, OEM, Website, Mobile etc.

Then you have a question over quality and risk. This is the most important. If life threatening decisions are at stake or close enough is good enough. 

Then you have performance and scalability challenges. At scale being significant, and at what cost.

II have seen some brilliant custom solutions Cus.js/MariaDB all using a plethora of customer chart libraries.

I am just back from Qlik Connect and there was a partner promoting its OEM  front end for Qlik, and it was a premier league table demo. I have never seen anything like it.
Incredible.

Remember. When publishing any data it needs to be governed and secure. Having data that is pre aggregated for different personas avoids risk. I wrote a paper on this ten years ago called Qlik governed data access framework and maintenance it to accommodate MS medallion framework, but far more detailed.

One caveat I would always give is that any direct query SQL AI will be expensive if there is no means to performancevoptimise.

I have seen many query based solutions and they all look great, have a buzz about them then there is the sting. £££
  - **TalkToMeNerdy** (1↑): Having just gotten back from Qlik Connect, did my research do Qlik's embedding capabilities justice?
- **ilikechipotle96** (4↑): I went with Superset instead of Sigma, been pretty decent. Step down it aesthetic from Tableau but otherwise it works well
  - **TalkToMeNerdy** (2↑): I'm curious since I'm not familiar with Superset, what made you go with them?
- **Budget-Respond8115** (6↑): How does Omni stack up against these ?
  - **TalkToMeNerdy** (1↑): That’s a great question. That’s another one I’ve never used, only heard tidbits here and there. Let me run this same model and see what I can find out…
- **Fluffy-Explanation29** (3↑): have you also tried holistics, luzmo and qrvey?
  - **TalkToMeNerdy** (1↑): I haven't. Which is the best one to check out?
    - **tedx-005** (1↑): Can't speak for Luzmo or Qrvey but definitely check out Holistics. We've been using them and their embeded analytics is impressive, it's engineer-friendly so our devs had an easy time shipping and customizing everything and now e can white-label their AI chatbot and plug it into your own customer portal so it's been a nice bonus
- **rohitspujari** (2↑): Might also want to check out [Semaphor](https://semaphor.cloud)
- **ShaveTheTurtles** (2↑): Just use cube.dev  it's a solid semantic layer
  - **lupsikpupsik** (2↑): +1
- **Infamous-Roof757** (1↑): I'm curious about Sigma offering $300/mth for unlimited viewers. What's their core pricing metric for embedded?
  - **vmih_** (3↑): Yeah, on one of the projects I worked on, we were comparing Power BI with Sigma. We were on a call with one of Sigma's sales reps and we got an quote for our pretty basic setup (about 20GB of data and like 5 dashboards and writeback, which, if I remember well, is automatically supported by their architecture) was like 60k a year. I might be wrong on that. I don't have access to the quote anymore.  
Curious to hear other opinions about Sigma because I think they have a promising product, but I also feel it is built for enterprises
    - **IrishHog09** (3↑): That’s more in line with what we got and have signed up for.  Sigma is extremely powerful/convenient, but costly if you only want it for a handful of dashboards.  We plan on using it for actual analytics/modeling, and possibly for marketing with the new Reports/Boost functions, so the cost was worth it.
- **Sea-Garden7836** (1↑): if u need something customer facing, take a look at my stuff, querypanel.io. i am happy to get couple of feedbacks.
