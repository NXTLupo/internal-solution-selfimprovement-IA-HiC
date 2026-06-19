---
id: social-intelligence/reddit-deep/saas/1u2wv1u.md
url: "https://www.reddit.com/r/SaaS/comments/1u2wv1u/ive_built_25_mvps_the_funded_ones_all_cut_these_5/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "I've built 25+ MVPs. The funded ones all cut these 5 features"
author: "Warm-Reaction-456"
date: "2026-06-11T11:51:35.000Z"
score: 45
upvote_ratio: 0.93
num_comments: 12
flair: ""
extracted_at: "2026-06-14T15:28:21.902Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1u2wv1u.md#c0"
    char_span: [0, 1943]
    sentence_count: 23
    key_terms: [product, actual, funded, users, cut, comments, features, founders]
    token_count: 448
  - id: "social-intelligence/reddit-deep/saas/1u2wv1u.md#c1"
    char_span: [1945, 3809]
    sentence_count: 25
    key_terms: [users, api, founders, nobody, asked, integration, dashboards, customer]
    token_count: 399
  - id: "social-intelligence/reddit-deep/saas/1u2wv1u.md#c2"
    char_span: [3811, 4788]
    sentence_count: 12
    key_terms: ["you're", dead, ones, v1s, enterprises, instructive, bottleneck, everything]
    token_count: 215
  - id: "social-intelligence/reddit-deep/saas/1u2wv1u.md#c3"
    char_span: [4803, 6317]
    sentence_count: 8
    key_terms: [product, demos, point, analytics, dashboard, copilot, softwareengineer2026, improvementtough735]
    section: Comments
    token_count: 365
---
# I've built 25+ MVPs. The funded ones all cut these 5 features

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1u2wv1u/ive_built_25_mvps_the_funded_ones_all_cut_these_5/)
Posted by **Warm-Reaction-456** · **45↑** · **12 comments**

Was archiving dead client folders last month and ended up reading old scoping docs for like three hours instead of doing actual work. We're a small dev shop. 26 MVPs shipped since we started, I counted. 8 of those founders went on to raise. Most of the rest are gone, a couple are profitable lifestyle businesses which honestly might be the best outcome of all.

Anyway I started noticing something in the old docs and it annoyed me enough to make a spreadsheet. The projects that raised had way shorter feature lists. Not slightly shorter. The average funded scope doc was 4 pages. The average dead one was 11.

And it was largely the same 5 features getting cut every time:

The AI copilot. The chat bubble in the corner. Almost every founder wants one now because every deck has one, and with agents it genuinely takes a weekend to bolt on. Then month two arrives: token bills, users pasting weird stuff into it, it confidently inventing answers about your own product, and now you're maintaining a second product inside your first one. Of our last 10 clients, 7 asked for a copilot. The 2 who raised both cut it. One replaced it with a single hardcoded automation that did the one thing users actually wanted, and people called the product "the AI tool" anyway.

Team workspaces and roles. Invites, seats, owner/admin/editor/viewer, the permissions matrix. Founders build this for imaginary enterprise customers. One client had four role types and a pending-invites screen at launch. Nine total users, all solo, all free. The funded ones shipped single-player and added teams when an actual customer with an actual team waved money at them. Teams is a v2 feature wearing a v1 costume.

User-facing analytics dashboards. Charts showing users their own data. Looks incredible in the demo. Problem is your first 50 users have three weeks of data, so every graph is a sad flat line, which actively makes the product feel dead. We've built so many of these dashboards that nobody ever opened. A weekly plain-text email with their numbers got more replies than any chart we ever shipped.

The native mobile app. "We need to be on the App Store" has killed more runways than any technical decision I've seen. Two codebases, review cycles, forced update flows, for users you don't have yet. Every one of our funded founders launched web-only or a PWA. One added mobile 14 months later when users were begging for it in support tickets, which is the correct time.

Public API and integrations. Zapier, webhooks, a docs site, "integrates with your stack." Nobody asked. Genuinely, go check, nobody asked. One founder spent a month on API docs for an API with zero external consumers, ever. If a real customer needs an integration, you build that one integration, manually, for them, and they'll love you for it.

The thing I keep chewing on is that the funded founders weren't smarter or more disciplined, a couple of them were honestly kind of chaotic. They just had some specific risky thing they were terrified wasn't true, and they were in a hurry to find out. Everything that didn't answer that question got deferred without much agonizing. The 11-page founders tended to talk about their product like it was already a company. Enterprise roles before a single customer. An API before a single user.

The copilot is the one where I was wrong the most, by the way. For about a year I'd upsell it without thinking because clients asked for it and it demos unbelievably well. Watching the same chat widget get ripped out of three different products cured me.

And before someone says it in the comments: yes, I know Claude Code exists. We use it daily. You can scaffold all five of these in a weekend now, and that has made this problem worse, not better. When features were expensive, the budget forced founders to choose. Now nothing forces the choice, so v1s arrive at the starting line carrying everything. But every feature you ship is still a thing you secure, maintain, support and explain, no matter how fast it was generated. Our last three rebuild clients all had AI-built v1s with gorgeous team permission screens and no idea why users churned. The bottleneck was never typing speed.

Not saying these 5 are universal, if you're selling to enterprises day one then yeah, roles and SSO are the product. But if you're scoping right now and your doc is past page 6, I'd genuinely look at what's in there.

Happy to dig into specifics of any of the 26 if useful, including the dead ones. The dead ones are more instructive anyway.

## Comments

- **DeadMojoh77** (3↑): I am typing this while working on a Copilot for a client 😂 FML
- **hojack78** (3↑): This is really interesting insight thank you for sharing
- **camppofrio** (4↑): Watched the analytics dashboard point kill demos live. First 50 users, three weeks of data, every chart is flat. The user reads 'broken product,' not 'new product.'
- **No-Regret-4273** (1↑): did any of the 4 page scopes still die, and what killed those? you're kind of pointing at it in the terrified paragraph, short scope might just be a symptom of founders who already knew the one risky question they were testing
- **AnimalFalse5884** (1↑): 100% agree, I spent a lot of time on seats, invite and whatnot without having a single customer
- **ImprovementTough735** (1↑): The copilot point is the most honest thing I've read about AI features in months. Demos beautifully, becomes a maintenance liability by week six, and users call the product "the AI tool" anyway because of one hardcoded automation. That gap between what demos well and what ships well is exactly why I keep coming back to scope docs. The analytics dashboard point hits different too. A weekly plain-text email outperforming every chart you shipped is one of those findings that sounds wrong until you've seen it happen twice.
- **SoftwareEngineer2026** (1↑): It’s no wonder the chat bubble is listed first, I know of one that confidently hallucinates and it drives customers away. Won’t be surprised at all when it gets defunded and removed in a month.
