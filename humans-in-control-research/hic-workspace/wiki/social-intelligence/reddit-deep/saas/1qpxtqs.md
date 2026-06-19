---
id: social-intelligence/reddit-deep/saas/1qpxtqs.md
url: "https://www.reddit.com/r/SaaS/comments/1qpxtqs/we_spent_180k_building_an_enterprise_product/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "We spent $180K building an enterprise product nobody wanted. Here's the full post-mortem."
author: "Dizzy-Connection-876"
date: "2026-01-29T03:50:14.000Z"
score: 71
upvote_ratio: 0.86
num_comments: 45
flair: ""
extracted_at: "2026-06-14T15:28:21.913Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1qpxtqs.md#c0"
    char_span: [0, 2231]
    sentence_count: 28
    key_terms: [enterprise, features, product, customers, building, enterprises, core, self-serve]
    token_count: 499
  - id: "social-intelligence/reddit-deep/saas/1qpxtqs.md#c1"
    char_span: [2233, 2504]
    sentence_count: 3
    key_terms: [different, enterprise, everything, self-serve, business, starting, upmarket, company]
    token_count: 57
  - id: "social-intelligence/reddit-deep/saas/1qpxtqs.md#c2"
    char_span: [2519, 4434]
    sentence_count: 20
    key_terms: [enterprise, compliance, product, month, procurement, becomes, easier, small]
    section: Comments
    token_count: 458
  - id: "social-intelligence/reddit-deep/saas/1qpxtqs.md#c3"
    char_span: [4436, 6711]
    sentence_count: 20
    key_terms: [enterprise, procurement, customers, build, enterprises, year, upmarket, someone]
    section: Comments
    token_count: 501
  - id: "social-intelligence/reddit-deep/saas/1qpxtqs.md#c4"
    char_span: [6715, 8823]
    sentence_count: 14
    key_terms: [enterprise, different, features, post, experience, honestly, validate, valuable]
    section: Comments
    token_count: 459
  - id: "social-intelligence/reddit-deep/saas/1qpxtqs.md#c5"
    char_span: [8825, 9119]
    sentence_count: 1
    key_terms: [didnt, decebaldecebal, unvalidated, enterprise, founders, because, company, product]
    section: Comments
    token_count: 74
---
# We spent $180K building an enterprise product nobody wanted. Here's the full post-mortem.

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1qpxtqs/we_spent_180k_building_an_enterprise_product/)
Posted by **Dizzy-Connection-876** · **71↑** · **45 comments**

This is painful to write but I think it might help someone else avoid the same mistake.

Last year we decided to go upmarket. Our self-serve product was doing fine—about $800K ARR—but we kept hearing that the real money was in enterprise. Longer contracts, higher ACVs, lower churn. The promised land.

So we spent 8 months and roughly $180K (mostly engineering time, some contractors) building enterprise features. SSO, SAML, advanced permissions, audit logs, custom integrations, the whole thing.

**What went wrong:**

**1. We built before we sold.** We assumed if we had enterprise features, enterprise customers would come. We never actually validated that enterprises wanted what we built. We were building a checklist, not solving problems.

**2. We didn't understand the enterprise sales cycle.** Turns out you can't just add features and have enterprises show up. They have procurement processes, security reviews, legal negotiations. The sales cycle went from 2 weeks to 4-6 months overnight. We weren't staffed for that.

**3. Our pricing was wrong.** We priced our enterprise tier at $500/month thinking that was "expensive." Enterprise buyers saw that price and assumed we weren't serious. Legitimate enterprise tools cost $2-5K/month minimum. Our low price actually hurt credibility.

**4. The customers we did get were nightmares.** The few enterprise deals we closed came with custom requirements, constant hand-holding, and executive escalations. The support cost per customer was 10x our regular customers. Even at higher prices, the unit economics were worse.

**5. We neglected our core product.** While we were chasing enterprise, our self-serve product stagnated. Competitors shipped features, we didn't. Our core customer base got frustrated.

**Where we are now:** We've basically abandoned the enterprise push. Wrote off most of that $180K in development. Refocused on our core market. We're growing again but we lost a year.

The lesson I'm taking from this: if you're going to go upmarket, treat it like starting a new company. Different product, different sales motion, different support model, different everything. Don't try to bolt enterprise onto a self-serve business and expect it to work.

## Comments

- **BreakingInnocence** (30↑): $500 is not an enterprise deal. Enterprise realistically starts around $100,000 per year, and even that number has very little to do with the product itself. What you are really paying for is hand holding.

Once you cross that line, you are dealing with procurement, security reviews, legal, financing, and a long list of custom edge cases. The first time you go through it, it is painful. After that, you learn how to do it, and it becomes easier each time.

Enterprise is also about compliance. A lot of compliance. Going enterprise dramatically increases compliance costs, and that is not a value add to the product. In practice, compliance becomes a drag on product velocity, not a multiplier.
  - **Sorry_Cheesecake_382** (1↑): Small to mid size business is 100x easier can confirm. Fuck selling enterprise.
    - **Unique_Leadership158** (1↑): Yeah, I might agree on this, in small/mid businesses it doesn't require that much effort, I mean it's not easy but not that hard either
- **After_Persimmon8536** (5↑): Hell, I was gonna go at $3500/month. But Claude said that was a pussy move, so I upped it to 10k a month.

Closing on some deals soon with some enterprise clients.
  - **FCTO-Curious** (1↑): What is your product? Just curious
    - **After_Persimmon8536** (3↑): Non-LLM dependent AI NOC L1/L2 automation that's completely transparent from start to finish.

No black box operations, everything is auditable and logged. Every decision, every action, etc.

Built from the ground up to withstand a SOC/SOX audit.
- **Portfoliana** (5↑): The pricing point is huge. We made the same mistake — priced our enterprise tier at $200/month because it felt "expensive" relative to our $29 self-serve. Enterprise buyers literally told us they couldn't justify the procurement overhead for something that cheap. Counterintuitive but real: low prices signal low value to enterprise.

The other thing that rings true: enterprise customers at low price points are often the worst ones. They have enterprise expectations without enterprise budgets. You end up with all the handholding of a $50K/year customer while making $6K/year.
  - **ForeverYonge** (1↑): Up to $1000/mo your target market is not enterprise procurement, it’s the shadow IT world of small-medium enterprises where some manager can see the value and just expense it on their business card. I’m saying medium because at big enterprises one would get roasted for using unapproved IT tools.
    - **davak72** (1↑): Absolutely this. Worked at a company where shadow IT was a huge cost sink across various departments, and as we grew, our new CTO helped to unify all of the software procurement under our technology department.
- **ShilpaMitra** (9↑): One thing I’d add for anyone reading: enterprise usually starts bottom-up, not top-down. If you don’t already have power users inside big orgs screaming for procurement to approve you, you’re probably too early to go upmarket.

Painful lesson, but honestly this post will save someone six figures and a year of their life. That alone makes it worth the write-off.
- **New_Grape7181** (5↑): I made a similar mistake trying to go upmarket too early. We had maybe $400K ARR and thought enterprise was the answer. Spent months building features nobody asked for.  
  
The thing that would've saved us is what you mentioned but I want to emphasise it even more: sell before you build. I mean literally get 3-5 enterprise customers to commit (even just verbal LOIs) to buying if you build X, Y, and Z. Then build exactly those things for those customers.  
  
We eventually figured this out on our second attempt. Found 4 target companies, got on calls with their teams, asked what they'd actually need to switch from their current solution. Two of them agreed to pilot it if we built specific integrations. That gave us a real roadmap instead of guessing.  
  
The other thing is enterprise sales needs a completely different person than self-serve. The founder who's great at optimising conversion funnels usually isn't the same person who can navigate a 6-month procurement cycle with legal reviews. We had to bring in someone who'd done it before.  
  
Honestly though, going back to your core market sounds like the right call. $800K ARR in self-serve is solid and there's probably way more room to grow there.  
  
Did you have any enterprise customers actually asking for these features before you built them, or was it mostly assumptions?
  - **dookienukemz** (1↑): This is such good advice. I can validate, I have inadvertently sold so many things through my agency this way. I almost under-prepare and then overwork to fulfill needs, learn a ton I can reuse, and scale based on those experiences. Rather than try to predict and hope. Very insightful. Great reply.
- **14qr23we** (2↑): Thank you for sharing. Personal experience is always valuable. Learned something new today :)
- **Ooga-BoogaBooga** (2↑): I've seen similar situations where the allure of enterprise can distract from your core strengths. It's crucial to validate demand before building, otherwise you risk misalignment with market needs. Kudos for sharing your experience honestly. It'll definitely help others avoid these pitfalls.
- **rdotkmedia** (2↑): I spent 250k on a ring + wedding that ended in divorce 3 years later. At least your post mortem makes for a good Reddit post.
  - **TheOneWhoDidntCum** (1↑): I hope this is not true, if it is I'm sorry it happened.
- **TemporaryKangaroo387** (4↑): appreciate the transparency on this, these kinds of post mortems are way more valuable than success stories imo

the build before sell thing is the killer. ive seen this pattern so many times - team sees enterprise revenue numbers, builds the checklist features, then realizes enterprises dont buy features they buy outcomes + relationships. SSO and audit logs are table stakes that get you into the conversation, they dont close deals

the other thing people miss is that enterprise sales is basically a different company. different hiring profile (you need actual enterprise AEs not startup generalists), different support model (white glove not tickets), different product rhythm (they want roadmap commitments not fast iteration). you cant just bolt that onto a self serve motion

at least you had $800k ARR to fall back on. ive seen founders do this same pivot with like $50k MRR and it killed the whole company because they didnt have the runway to recover when enterprise didnt pan out
- **decebaldecebal** (1↑): That's a lot of money to spend on an unvalidated product...
