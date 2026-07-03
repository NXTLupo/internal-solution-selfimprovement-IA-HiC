---
id: social-intelligence/reddit-deep/saas/1mn0eo9.md
url: "https://www.reddit.com/r/SaaS/comments/1mn0eo9/bootstrapped_a_tiny_saas_and_finally_sold_feels/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "Bootstrapped a tiny SaaS and finally sold (feels unreal)"
author: "Gr00byandahalf"
date: "2025-08-11T01:46:47.000Z"
score: 763
upvote_ratio: 0.98
num_comments: 224
flair: ""
extracted_at: "2026-07-03T00:08:07.167Z"
extraction_method: "praw-deep"
research_goal: ""
engagement: "misc"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1mn0eo9.md#c0"
    char_span: [0, 1773]
    sentence_count: 13
    key_terms: [saas, customers, feedback, bootstrapped, sold, comments, numbers, revenue]
    concepts: [customers, feedback, bootstrapped, comments, numbers]
    token_count: 497
    sources: [{"n":"reddit-deep: r/saas","u":"https://www.reddit.com/r/SaaS/comments/1mn0eo9/bootstrapped_a_tiny_saas_and_finally_sold_feels/"}]
  - id: "social-intelligence/reddit-deep/saas/1mn0eo9.md#c1"
    char_span: [1775, 2510]
    sentence_count: 10
    key_terms: [weeks, distribution, spreadsheets, walkthrough, competitor, complained, micro-saas, transition]
    concepts: [weeks]
    token_count: 191
  - id: "social-intelligence/reddit-deep/saas/1mn0eo9.md#c2"
    char_span: [2525, 3453]
    sentence_count: 7
    key_terms: [feature, gr00byandahalf, programmer, did, bobcatbubbles, stu-saasydb, traditional, daniyum21]
    concepts: [gr00byandahalf, feature, programmer]
    section: Comments
    token_count: 238
  - id: "social-intelligence/reddit-deep/saas/1mn0eo9.md#c3"
    char_span: [3455, 5155]
    sentence_count: 9
    key_terms: [escrow, end, gr00byandahalf, payment, systems, people, stripe, buyer]
    concepts: [escrow, gr00byandahalf, payment, systems, people]
    section: Comments
    token_count: 437
  - id: "social-intelligence/reddit-deep/saas/1mn0eo9.md#c4"
    char_span: [5157, 7062]
    sentence_count: 13
    key_terms: [stripe, idiotforlife1, hours, did, hire, need, currently, migration]
    concepts: [stripe, idiotforlife1, hours, currently, migration]
    section: Comments
    token_count: 502
  - id: "social-intelligence/reddit-deep/saas/1mn0eo9.md#c5"
    char_span: [7064, 8606]
    sentence_count: 12
    key_terms: [gr00byandahalf, product, currently, curious, running, sharing, success, thanks]
    concepts: [gr00byandahalf, product, currently, curious, running]
    section: Comments
    token_count: 419
---
# Bootstrapped a tiny SaaS and finally sold (feels unreal)

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1mn0eo9/bootstrapped_a_tiny_saas_and_finally_sold_feels/)
Posted by **Gr00byandahalf** · **763↑** · **224 comments**

I bootstrapped a tiny SaaS, and last week I sold it, real numbers, what worked, what didn't

**TL;DR:** Built a feedback widget SaaS, grew it to **$8,200 MRR** in **14 months**, sold for **$285,000**.

**The backstory**

Started because every feedback tool was overengineered. I needed something that took 5 seconds to set up, not another Zendesk. Weekend build in Next.js + Supabase, charged $29/mo from day one.

First 60 days: 312 signups, 18 paying. Found customers by answering questions in r/SaaS and indie hacker Discord servers. Cold emailed maybe 50 people who complained about feedback tools on Twitter.

**Numbers at exit**

* **Revenue:** $8,200/mo
* **Expenses:** \~$1,400/mo (hosting $340, Stripe fees $250, VA $800)
* **Profit:** \~$6,800/mo
* **Customers:** 283 paying
* **Churn:** 3% monthly
* **Tech:** Next.js, Postgres, BullMQ, hosted on Vercel + Railway

**What worked**

* **Killed features aggressively.** Had analytics, team seats, custom branding. Deleted everything except the core widget. Activation rate went from 24% to 61%.
* **One price, no tiers.** Moved from $29 to $79/mo. Lost some customers but profit went up.
* **Posted revenue publicly.** Every month on Twitter. July's post got 400 likes and 3 acquisition inquiries.

**What didn't**

* Spent 6 weeks on SSO for an enterprise lead. They ghosted after demo.
* Facebook ads at $3k MRR. Burned $2k, got 4 customers who all churned.
* Rewrote my perfectly fine cron jobs in Temporal. Took a weekend, changed nothing for users.

**The exit**

* **Buyer:** Solo PE guy who owns 5 other micro-SaaS. Found me through Twitter.
* **Due diligence:** 2 weeks. Stripe exports, P&L, code walkthrough on Zoom.
* **Price:** $285,000 (2.9x annual revenue)
* **Terms:** 85% at close, 15% after 6 months if churn stays under 5%
* **Transition:** 12 weeks, 6 hours/week, $150/hr

Sold because I was facing the "hire someone or stay small" decision. I like building new things more than scaling existing ones.

**Key lessons**

1. Keep a clean P&L from day one. Buyers care more about boring spreadsheets than your tech stack.
2. Distribution > product. My competitor had better features but I answered every Reddit question.
3. Charge more. Nobody who paid $29 complained when I raised to $79.

## Comments

- **stu-saasyDB** (80↑): Building a feature for someone who requested it but then ghosts instead is brutal. I’ve been there. Hard way to learn a lesson.
  - **Gr00byandahalf** (22↑): Exactly built their dream feature, they ghosted, sucks to say the least.
    - **daniyum21** (5↑): Curious how you decided to build the feature if there was just 1 client! Was it because they were huge and would bring in more revenue?
- **Bobcatbubbles** (18↑): Are you a programmer or did you just pick it up along the way somehow?
  - **Gr00byandahalf** (47↑): Not a traditional programmer. Did basic Python in college, then learned by shipping with ChatGPT/Claude helping me debug.

But here's the reality check that I wish i got earlier you can't just fully vibe your way to a SaaS. The AI helps you write code, but it won't tell you about rate limiting, SQL injection, proper auth flows, or why your database queries are costing $500/month.

You need other people who know what there doing because they've done it before to somewhat help you or give pointers along the way.
    - **Fit-Mind-1300** (10↑): How did you manage those issues? Did you learn end to end coding, hosting and deployment?
    - **arnaldodelisio** (-1↑): You are simply using it wrong, you are the architect, it is the executor. If you know about rate limiting etc. You just need to tell it and it will be the best "other people" you can ever dream of.
  - **NewspaperIcy9240** (4↑): Shipping quality solutions is absolutely viable without being end to end coder at this point. I’m currently bringing micro-saas for freelancers live as I type and I don’t write syntax! I spend ALL my time working to ensure the AI systems are optimized within backend, lean on stripe/firebase auth for the things that are critical, and have learned everything possible about frameworks and systems!
- **yasniy-krasniy** (11↑): Thank you! Very inspiring, and good luck on next endeavor!
  - **Gr00byandahalf** (4↑): Means a lot.
    - **Itsclobbering** (1↑): Keep us updated!
- **alitestee** (9↑): I want to know what was the payment process, was your app registered under a company name?  You dud it f2f or online?
  - **Gr00byandahalf** (52↑): Single-member LLC (formed when I hit $1k MRR for liability protection). Made taxes cleaner and buyers prefer buying from an entity vs personal.

**Payment flow:**

* Used [Escrow.com](http://Escrow.com) (buyer suggested it, split the $1,950 fee)
* Buyer wired 85% to escrow
* Transfer day: moved Stripe account ownership, GitHub repo, domain, all credentials
* Escrow released funds next business day
* 15% holdback goes to escrow in 6 months

**Docs:** Purchase agreement from a template I found on MicroAcquire, modified by buyer's lawyer. I paid $800 for 2 hours of lawyer review. Worth it.
    - **alitestee** (2↑): Thank you so much for this informations
    - **kirdape** (2↑): Did you do a stripe migration from a stripe account to another or something else? I’m currently looking at stripe migration.
    - **stormbythoughts** (1↑): Did you create a new Github repo or transferred ownership of the actual repo?
    - **Sense-Sure** (1↑): But how were you accepting payments without an entity? Not sure Stripe allows personal accounts
    - **lutian** (1↑): another gold nugget. saving this too in my markwting cheatsheet.

btw, you building something next? I could use someone with your experience, if you'd be interested in one of my projects (I' currently pushing hard on growing mjapi, but doc2exam also feela like a latent bomb waiting for better distribution)
- **IdiotForLife1** (6↑): Could you not have scaled more and sold for 1M?
  - **Gr00byandahalf** (31↑): Maybe, but the math didn't work for me.

To hit $1M valuation, I'd need \~$25-30k MRR. That's 3-4x growth. Realistic timeline: 18-24 months if everything went perfect.

But consider:

* I was already capped on hours
* Good competitors entering (Typeform launched similar features)
* Would definitely need to hire
* No guarantee multiples stay at 3x in 2 years

$285k today vs maybe $1M in 2026? Plus I'd have to actually run it those 2 years, dealing with scale issues, team management, enterprise customers asking for SOC2.
    - **ArtistAccurate2949** (3↑): I agree!  great call to sell now.  congrats!
    - **Fast_Economy_197** (1↑): Why didnt u wanna hire?
    - **IdiotForLife1** (1↑): Good response. However, wouldn't you face similar problems if you did any other SaaS? At some point, a competitor would enter, you would be capped on hours and would need to hire. 

If you actually scaled to 1M in 3 years, your multiple would probably be more than 3x not 3x. 3x is actually quite conservative for a SaaS, isn't it? At the 3 years mark, you would be able to prove good YoY growth and low churn. 

So if these things are going to exist in any SaaS you do, are you content with never being able to scale beyond a couple hundred thousand? Nothing wrong with that, I'm genuinely curious.
- **BubblyAnalyst8210** (4↑): Super impressed!
  - **Gr00byandahalf** (1↑): Thanks!
- **scaredpitoco** (2↑): do you mind sharing the website name/url?
  - **Gr00byandahalf** (14↑): Keeping it private for now. The new owner prefers to keep things lowkey and I want to respect that. Plus staying anon helps me share real numbers without the weird DMs
- **Always_Learning4-Fun** (2↑): Amazing! Congratulations!! Love seeing success stories like this.
  - **Gr00byandahalf** (1↑): Appreciate it.
- **nivix_zixer** (2↑): Just curious - did a competitor buy you out to kill the product and now there's room on the market again for another lean feedback tool?
  - **Gr00byandahalf** (3↑): Nah, financial buyer who collects profitable micro-SaaS.

The product isn't currently running though from what I hear.
    - **meemorize** (5↑): If the product isn’t running currently, how does the 5% churn condition work for the final 15%?

Congrats and thanks for sharing your success!
- **wbuc1** (2↑): Love this well done!! What auth provider did you use?
  - **Gr00byandahalf** (3↑): Clerk. Dead simple setup, reasonable pricing at scale
