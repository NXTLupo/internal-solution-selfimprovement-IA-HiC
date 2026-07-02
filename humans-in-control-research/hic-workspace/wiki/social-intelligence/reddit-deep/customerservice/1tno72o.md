---
id: social-intelligence/reddit-deep/customerservice/1tno72o.md
url: "https://www.reddit.com/r/CustomerService/comments/1tno72o/how_much_does_a_how_do_i_do_x_support_ticket/"
kind: "social-post"
source: "reddit-deep: r/customerservice"
subreddit: "customerservice"
title: "How much does a 'how do I do X' support ticket costs the company, and how good do self-service tools work ?"
author: "Business_Eye_4744"
date: "2026-05-25T22:36:08.000Z"
score: 0
upvote_ratio: 0.25
num_comments: 4
flair: ""
extracted_at: "2026-06-14T15:27:59.721Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/customerservice/1tno72o.md#c0"
    char_span: [0, 700]
    sentence_count: 3
    key_terms: [self-service, customerservice, ticket, comments, support, tools, "i'm", implemented]
    concepts: [self-service, customerservice, ticket, comments, support]
    related_chunks: ["social-intelligence/reddit-deep/customerservice/1tno72o.md#c1"]
    token_count: 176
    sources: [{"n":"reddit-deep: r/customerservice","u":"https://www.reddit.com/r/CustomerService/comments/1tno72o/how_much_does_a_how_do_i_do_x_support_ticket/"}]
  - id: "social-intelligence/reddit-deep/customerservice/1tno72o.md#c1"
    char_span: [714, 2795]
    sentence_count: 16
    key_terms: [cost, time, support, ticket, calls, phone, look, deflection]
    concepts: [support, ticket, calls, deflection, phone]
    related_chunks: ["social-intelligence/reddit-deep/customerservice/1tno72o.md#c0"]
    section: Comments
    token_count: 487
---
# How much does a 'how do I do X' support ticket costs the company, and how good do self-service tools work ?

Source: [reddit-deep: r/customerservice](https://www.reddit.com/r/CustomerService/comments/1tno72o/how_much_does_a_how_do_i_do_x_support_ticket/)
Posted by **Business_Eye_4744** · **0↑** · **4 comments**

Hey everyone,

I'm a student working on a project around self-service support tools (AI chatbots, guides, Q&A...) and I'm trying to get some information.

\- What's the average cost of a 'how do I do X in \[software\]' ticket when you factor in agent time?

\- In your experience, what share of your ticket volume are deflected by self-service options when implemented ?

Thanks a lot

## Comments

- **battletram** (2↑): Work it out from first principles. 

Look at your call record of how long on average your phone calls are. This will tell you how many calls per hour (roughly, factor in about another 20% for break time, training etc).

Look at job posts for customer service jobs to get pay rates. Add another 40% if in the USA for cost of benefits. 

Look at benchmarks for contact deflection for Decagon, Sierra etc.
- **FlameEyedJabberwock** (2↑): >What's the average cost of a 'how do I do X in \[software\]' ticket when you factor in agent time?

The's going to vary drastically between chat, email, and phone.

For example, I can read and respond to a "How do I change my password?" email in about 10 seconds thanks to pre-written templates. Maybe 1-5 minutes to answer something we don't have a template for, depending on how much I need to explain, and if any screenshots are needed.

Phone and chat interactions require much longer because they’re real-time, include mandatory introductions and closings, and require the agent’s full attention for the duration of the interaction.

I've had "How do I change my password?" calls take upwards of 45 minutes because people are idiots.
- **Use_eeselAI** (1↑): Real numbers on deflection: at eesel (AI agents for support teams) we see anywhere from 50% to 90% depending on how well-documented the company's support process is (and the industry/use case). Gridwise hit 73% tier 1 in month one, Smava runs full automation on 100k+ tickets/month. The companies that hit the high end almost always have strong knowledge bases - the AI itself matters less than the docs it's working from when it comes to pure answer accuracy (the models matter more for workflow logic and escalation reasoning).

On ticket cost, vendor-published industry averages are unreliable. Cleanest approach for a real number: fully-loaded support team cost (salaries + benefits + manager time + tooling) divided by annual ticket volume. "How do I do X" tickets are usually 3-5 min of handle time vs 10+ for complex stuff, so they're at the lower end.
