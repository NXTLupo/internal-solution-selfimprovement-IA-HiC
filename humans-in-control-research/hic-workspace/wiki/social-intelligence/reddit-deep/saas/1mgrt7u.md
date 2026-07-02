---
id: social-intelligence/reddit-deep/saas/1mgrt7u.md
url: "https://www.reddit.com/r/SaaS/comments/1mgrt7u/built_my_saas_using_mostly_ai_heres_what_broke_in/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "Built my SaaS using mostly AI - here's what broke in production that no one talks about"
author: "beeaniegeni"
date: "2025-08-03T19:16:29.000Z"
score: 202
upvote_ratio: 0.93
num_comments: 96
flair: ""
extracted_at: "2026-06-14T15:28:21.908Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1mgrt7u.md#c0"
    char_span: [0, 2547]
    sentence_count: 11
    key_terms: ["couldn't", without, dashboard, saas, customer, randomly, coding, proper]
    concepts: ["couldn't", without, dashboard, customer, randomly]
    token_count: 513
    sources: [{"n":"reddit-deep: r/saas","u":"https://www.reddit.com/r/SaaS/comments/1mgrt7u/built_my_saas_using_mostly_ai_heres_what_broke_in/"}]
  - id: "social-intelligence/reddit-deep/saas/1mgrt7u.md#c1"
    char_span: [2549, 4498]
    sentence_count: 7
    key_terms: [saas, billing, payment, subscription, enough, architecture, fundamentals, data]
    concepts: [subscription, billing, payment, architecture, fundamentals]
    token_count: 362
  - id: "social-intelligence/reddit-deep/saas/1mgrt7u.md#c2"
    char_span: [4512, 5911]
    sentence_count: 9
    key_terms: [code, good, need, compliance, components, production, understand, architect]
    concepts: [compliance, components, production, understand, architect]
    section: Comments
    token_count: 326
  - id: "social-intelligence/reddit-deep/saas/1mgrt7u.md#c3"
    char_span: [5913, 8029]
    sentence_count: 19
    key_terms: [security, tell, beeaniegeni, bugs, building, implementation, readme, architecture]
    concepts: [security, beeaniegeni, building, implementation, architecture]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/saas/1mgrt7u.md#c4"
    char_span: [8031, 9796]
    sentence_count: 19
    key_terms: [want, testing, code, get, something, security, design, built]
    concepts: [testing, something, security, design, built]
    section: Comments
    token_count: 412
  - id: "social-intelligence/reddit-deep/saas/1mgrt7u.md#c5"
    char_span: [9801, 11370]
    sentence_count: 14
    key_terms: [time, months, grumpy-554, full, experience, queries, thanks, spirited-reference-4]
    concepts: [grumpy-554, months, experience, queries, thanks]
    section: Comments
    token_count: 409
  - id: "social-intelligence/reddit-deep/saas/1mgrt7u.md#c6"
    char_span: [11372, 12047]
    sentence_count: 7
    key_terms: [whyamidoingthis1000, days, done, time, followedbyarock, andupotorac, assessment, grumpy-554]
    section: Comments
    token_count: 194
---
# Built my SaaS using mostly AI - here's what broke in production that no one talks about

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1mgrt7u/built_my_saas_using_mostly_ai_heres_what_broke_in/)
Posted by **beeaniegeni** · **202↑** · **96 comments**

**After 9 months of building my SaaS** [platform ](https://autoviralapp.com/)**from scratch using "vibe coding" (AI + minimal technical background), I wanted to share what actually works vs. what doesn't when you're trying to build real subscription businesses without being a "real developer."**

**The hybrid approach is everything**

Pure vibe coding gets you maybe 60% of the way there. You can build landing pages, set up basic user authentication, even implement simple dashboard features. But I hit walls constantly that required actual technical understanding to solve - especially the SaaS-specific stuff that makes or breaks retention.

**Here's what broke the vibe coding approach every single time:**

**Payment processing that failed in production** The AI would generate Stripe integration code that worked perfectly in test mode, but real customer payments would randomly fail with cryptic webhook errors. I'd think everything was working while losing actual revenue. The AI couldn't help me understand webhook validation, idempotency keys, or why certain payment methods were being declined without proper error handling.

**Database scaling issues that killed performance** As my user base grew from 10 to 1,000+ active users, simple queries started timing out. The AI kept suggesting band-aid solutions like caching instead of identifying that I was running inefficient queries on unindexed tables. It couldn't see that my "users dashboard" was loading every single data point instead of paginating results.

**User session management that broke randomly** What happens when a user's subscription expires mid-session? How do you handle concurrent logins or maintain state across multiple browser tabs? The AI could suggest individual fixes, but couldn't help me architect a proper session management system that handled edge cases without logging users out randomly.

**Multi-tenant data isolation problems** When customer A could suddenly see customer B's data in their dashboard, the AI had no clue how to debug it. The issue was deeper than surface-level permissions - it was fundamental database architecture that needed proper tenant isolation from day one. Without understanding relational databases, I couldn't even explain the problem correctly.

**Billing logic that created accounting nightmares** Proration calculations, failed payment retries, subscription upgrades, and refund handling - the AI generated code that "worked" but created edge cases that broke my revenue tracking. One customer downgrading their plan somehow triggered three separate billing events, and I had no idea how to trace what went wrong.

**What actually saved me**

I developed a systematic approach to debugging that bridged the gap between AI suggestions and real SaaS architecture. When the AI would generate code that didn't work in production, I learned to:

* Set up proper logging for every critical user action (payments, logins, data access)
* Test subscription flows manually with real payment methods before going live
* Create a simple spreadsheet tracking what integrations actually worked vs. what looked good in development
* Break complex SaaS features (billing, permissions, notifications) into smaller pieces the AI could handle

The breakthrough was realizing I needed just enough technical foundation to be a good "AI supervisor" for SaaS-specific challenges. I spent weeks learning database fundamentals, payment processing basics, and how web applications actually handle user sessions and data security.

The key was treating AI as a speed multiplier, not a replacement for understanding SaaS architecture. When payments failed or users reported bugs (and they always did), having enough technical knowledge to read server logs and understand data flow made the difference between fixing it in 30 minutes vs. losing customers for days.

**The reality check**

Most "I built a SaaS with no coding knowledge" stories skip the part where they got stuck for weeks on subscription billing edge cases or hired developers to rebuild their entire payment system. The sweet spot is learning just enough to be dangerous with SaaS fundamentals, then using AI to go 10x faster on the parts you understand.

## Comments

- **philatmeed** (42↑): From our experience - as a team with S/W engineers - AI has accelerated many processes, but with a live product in production containing consumer data, we use it to create individual components - not complete sections or functions. It's a powerful tool, but when it comes to actual production and tasks like documenting data flows for GDPR compliance, it’s no replacement. I believe you can prototype code for demos, and the more technical knowledge you have, the faster you can do so - but I don't think - at this stage - you can turn prototype code into a commercial product without in-house expertise to manage the complexities.
  - **beeaniegeni** (1↑): yes
  - **TheOneWhoDidntCum** (1↑): what do you use as your GDPR compliance platform?
- **Dry_Grass6005** (14↑): That’s right. Vibe coding is the future, but it doesn’t mean you don’t need to understand code. You still need to be the architect. You need to be the architect, designer, produce manager, and QA at the same time.
- **EatDirty** (9↑): Sounds like you learned a lot - good job btw.  
In general it's a good idea to follow good software practices such as logging , type safety, splitting things into smaller components! If you can't understand what the hell the code is doing, neither will the AI.  
On top of that I'd recommend adding unit tests CI/CD as well to make sure that the workflow keeps working.

My current workflow:   
1. Tell the AI to implement a feature and write the implementation details to a readme file  
2. Tell the AI agent to critique the implementation details in the readme harshly  
3. The AI will give you points to fix which you can tell it to add to the readme again.  
4. Repeat the process several times until you get something reasonable.  
5. Make sure to tell the Ai to follow good practices such as type safety, modular architecture etc  
6. Tell the AI to add unit tests to check logic
  - **beeaniegeni** (1↑): w
- **Satoshi6060** (19↑): All of those bugs are something you would expect for a first time dev. Nothing unusual there.
  - **beeaniegeni** (4↑): Thanks
  - **Evalo01** (10↑): These are definitely not bugs you’d expect from a decent full time dev. Many of these issues are caused by a lack of understanding about the technology/architecture of what their building. Any proper developer would test their software and 99% of these ‘bugs’ wouldn’t make their way into prod.
- **SirButtChin** (4↑): The part about users seeing each other's data is terrifying. That's the kind of bug that kills a business overnight and you can't even explain to AI what went wrong because it doesn't understand tenant isolation
  - **beeaniegeni** (1↑): got a dev to do the data security, don't worry wouldn't vibe code security
- **GhostInTheOrgChart** (3↑): In the past I’ve built prototypes and websites in just days. With my current SaaS project, I’m building at what seems a snails pace (to me), to ensure it’s built to scale with security in mind from day one. And oh my gawd. Lol. I want to go faster so bad.

I spent most of last week JUST working on the login/signup process to ensure security and logged in user logic through out the system was connected to an auth user. I loved Airtable but decided to move to Supabase, which meant learning RLS policies and all that. 

Also nobody tells you that, even if you build a good page or two, there is also the responsive tablet and phone views. 

I’m building out all 3 views at once to be able to catch bugs and design issues in advance. 

I love it. But I now know why folks just hire someone. 

Because even if you ‘no code’, you need to ‘know code’. 😩😂

(Oh, I’m using WeWeb to build.)
  - **SystemicCharles** (3↑): I feel your pain. I'm also building something I have been sharing and talking about for over 7 months, and it's taking me so long.   
  
I want to go fast, but I keep telling myself to be patient. 

It's not being built to be perfect, but I want to focus 80% of my time on marketing and sales after launch. I don't want to spend 80% of my time on debugging and doing technical customer support when I could have avoided 50% of it at least.
    - **GhostInTheOrgChart** (2↑): Right?! Patience is not one of my virtues. I want that fresh dopamine hit from creating something quickly. But that won’t get me where I want to go. I want the final product to be a business not just a toy I built. Can’t wait to get to 80% 😂.
- **ragehh** (4↑): With AI help or not, one has to be a good developer to begin with. Ai helps you code faster, but you have to have your architectural design in place without even starting the development. It is you who have to guide Ai to your destination, and always critique the automated Ai suggestions. There are times when Ai's code is wordy or downright misleading. You may get good individual functions that Ai churns out for you. But the challenge is how to integrate all that into a viable application with no bugs. Basic understanding of web architecture, Http protocal, the stateless nature of the web as well as data security and relational database design are key prerequisite before attempting to develop a Saas project with sound security. Testing such as unit testing, integration testing and system testing are essential but we often overlook that. 

  
Your experience teaches crucial lesson to many who think Ai can help them build a viable and secure Saas in no time. It is full of challenge, as you point out. When you said user A ends up seeing user B's dashboard, or inefficient db queries that times out,  when you see that as you are nearly completing your project, it is disheartening. This may indicate poor database design. or SQL queries that fetch more rows than necessary or basically lacking indexing. These are where  newbie developers flounder. Anyway, that was a great writeup. Thanks
- **iceman3383** (6↑): Wow, sounds like a wild ride! Can't wait to dive into your experience and learn from your hiccups. Thanks for sharing, mate!
- **grumpy-554** (11↑): 9 months???? What happened to “vibe code your SaaS in 48h”? 😂

But seriously, 9 months is insane long time. Where really that time went? Or you just had a couple hours here and there?
  - **Amazing-Mirror-3076** (10↑): 9 months is not a long time. 

I spent 18 months with 2 senior Devs full time - well more than full time as I was doing 12hrs, 7 days a week
    - **grumpy-554** (1↑): What were you building?
    - **Spirited-Reference-4** (1↑): Mate what were you doing? Rebuilding openAI?
  - **beeaniegeni** (4↑): well its an exe that i originally had as an Python script, then restructured into an electron app with js and had to rework functionality and add pages and learn a lot of new stuff was worth it tho
    - **grumpy-554** (4↑): How much of that could’ve been avoided if you did more in depth research or “consultation” with someone?

I’m genuinely curious of your assessment because we spend a full lot of time in designing and debating both within a team and with AI on the best solution for each project.
  - **andupotorac** (6↑): We’re also vibe coding a peoject for 9 months. The 10,000 tasks turned into 20,000 prompts. Things still need to be done even if they’re done faster and cheaper.
    - **grumpy-554** (1↑): Have you released yet?
  - **FollowedByARock** (1↑): I agree with you. Im a few days away from submitting my app for the playstore. Took me 45 days, and I feel like I goofed off half the time 😂
- **WhyAmIDoingThis1000** (3↑): Nice! Yeah, 90% of the work is the last 10%. Edge cases are 🤬
