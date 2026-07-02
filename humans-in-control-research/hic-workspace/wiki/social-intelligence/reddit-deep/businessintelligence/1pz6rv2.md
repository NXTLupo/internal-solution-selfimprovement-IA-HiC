---
id: social-intelligence/reddit-deep/businessintelligence/1pz6rv2.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1pz6rv2/power_bi_looker_felt_great_for_internal_bi_less/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Power BI / Looker felt great for internal BI, less so for embedded. What else should we look at?"
author: "theceoinprogress"
date: "2025-12-30T03:08:13.000Z"
score: 36
upvote_ratio: 0.97
num_comments: 32
flair: ""
extracted_at: "2026-06-11T18:57:56.373Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1pz6rv2.md#c0"
    char_span: [0, 883]
    sentence_count: 7
    key_terms: [businessintelligence, internal, power, comments, product, looker, theceoinprogress, alternatives]
    concepts: [businessintelligence, internal, power, comments, product]
    related_chunks: ["social-intelligence/reddit-deep/businessintelligence/1pz6rv2.md#c1"]
    token_count: 195
    sources: [{"n":"reddit-deep: r/businessintelligence","u":"https://www.reddit.com/r/BusinessIntelligence/comments/1pz6rv2/power_bi_looker_felt_great_for_internal_bi_less/"}]
  - id: "social-intelligence/reddit-deep/businessintelligence/1pz6rv2.md#c1"
    char_span: [897, 3236]
    sentence_count: 12
    key_terms: [analytics, tools, embedded, internal, product, teams, customer, superset]
    concepts: [analytics, embedded, internal, tools, product]
    related_chunks: ["social-intelligence/reddit-deep/businessintelligence/1pz6rv2.md#c0"]
    section: Comments
    token_count: 468
  - id: "social-intelligence/reddit-deep/businessintelligence/1pz6rv2.md#c2"
    char_span: [3238, 4942]
    sentence_count: 8
    key_terms: [embedded, great, https, power, interested, customers, recognize, evidence]
    concepts: [embedded, great, https, interested, power]
    section: Comments
    token_count: 427
  - id: "social-intelligence/reddit-deep/businessintelligence/1pz6rv2.md#c3"
    char_span: [4944, 5274]
    sentence_count: 3
    key_terms: [dicotyledon, embedding, expensive, cheapest, customer, embedded, multiple, projects]
    section: Comments
    token_count: 87
---
# Power BI / Looker felt great for internal BI, less so for embedded. What else should we look at?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1pz6rv2/power_bi_looker_felt_great_for_internal_bi_less/)
Posted by **theceoinprogress** · **36↑** · **32 comments**

We are a SaaS product that grew up on internal BI using Looker and Power BI, and both are fine for analyst dashboards. The trouble started when we tried to ship the same thing to customers. Iframes, awkward auth flows, and limited control over layout have made the whole experience feel bolted on. 

For teams that care a lot about UX, what tools or approaches have worked better for customer facing analytics? Are there realistic Apache Superset alternatives or sites like Power BI that are more focused on embedding into a product rather than internal reporting?

## Comments

- **Beneficial-Panda-640** (12↑): I have seen this gap trip up a lot of teams who outgrow internal BI assumptions. Tools like Power BI and Looker optimize for analyst workflows and governance first, not for being a native part of a product experience. Once analytics is customer facing, the questions shift toward layout control, performance isolation, permissioning models, and how tightly charts are coupled to product behavior. Some teams end up separating concerns entirely, keeping internal BI as is and building a thinner, more opinionated analytics layer for customers. The biggest unlock often is deciding whether analytics is a feature or just reporting, because that choice drives whether you want a BI tool at all or something closer to application UI with metrics behind it.
- **Hawkeye_Co** (7↑): for customer facing analytics, most teams end up happier when they stop trying to force internal bi tools into a product ui and instead pick an embedded first approach or build a thin custom layer. the embedded first tools focus on things you care about in saas, like multi tenant permissions, sso that feels invisible, theming that matches your app, responsive layouts, and controlling which query patterns are allowed so performance stays predictable. tools like Embeddable are designed specifically for shipping dashboards inside a product rather than embedding an analyst tool via iframe. if you want an apache superset style alternative, superset can be made to work but it often takes real engineering to make the ux feel native, so a common pattern is using an embedded platform for the interactive dashboards and keeping superset or power bi only for internal teams, or building key customer charts directly with a chart library and a curated metrics api so you fully control layout and auth.
- **leogodin217** (4↑): Not sure if things have changed much, but I did extensive research into this a few years ago. Looked into more than 50 products. Our company wanted to replace a lot of custom functionality with BI tools. 

End of they day, they all basically allowed reports to be embedded with iframes. Couldn't find a single one that had cross-report filtering and decent charts. Most had no tables with subtotals and grand totals. Most could not calculate a weighted mean. We ended up continuing with the custom apps. 

There are some great embedded apps if you just want a web page around your iframe, but that's about it.
  - **RemotePatience7081** (1↑): I’d be interested to see your list. Did you compile results of this investigation?
    - **leogodin217** (1↑): I did, but left it at my job.
- **Kardinals** (3↑): Check out Power BI Embedded. It’s an Azure service designed specifically for this use case.
- **dutchclifton** (2↑): I have an active open source project in this space:  https://try.drizzle-cube.dev/ would be happy to chat if interested in knowing how to best integrate, I have a lot of experience in addressing the same issue you face trying to embed internally oriented tools towards customers.
- **FeeQuirky3435** (2↑): Yes there are. We use [Knowi](https://www.knowi.com/) to embed dashboards and its search-based analytics feature into our web portal. It lets us white label the embedded content by changing colors, fonts, logos, etc. for a complete match with our portal. This way, no one can recognize the embedded part. It also helps us keep our data secure by ensuring our customers only see what they are supposed to see.
- **Pleasant_Type_4547** (2↑): If you are comfortable in SQL take a look at Evidence. It's a BI-as-Code offering that majors on UX.

https://evidence.dev/product/embedded-analytics

Disc I work there
- **Embiggens96** (2↑): metabase and stylebi are good for embedding in a saas application
- **datawazo** (5↑): Boring ass answer but I find Tableau is great for embedded, can configure single sign on as well and has great design principles and customization
- **Sad-Calligrapher-350** (6↑): Power BI can be embedded so you won’t recognize any more it is actually Power BI.

I have seen this in multiple projects, what issues did you have with it?
Do you have a customer portal?
  - **dicotyledon** (2↑): I wish it was less expensive for the embedded tier. Perhaps if there was a “lite” option.
    - **x_ace_of_spades_x** (6↑): All Fabric SKUs support embedding and the cheapest starts at ~$300 per month
