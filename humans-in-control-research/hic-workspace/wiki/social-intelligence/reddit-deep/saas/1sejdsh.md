---
id: social-intelligence/reddit-deep/saas/1sejdsh.md
url: "https://www.reddit.com/r/SaaS/comments/1sejdsh/i_built_an_opensource_competitor_to_delve/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "I built an open-source competitor to Delve ($10K-$80K/year) in 8.5 hours using AI. Here’s what that means for SaaS moats."
author: "AnswerPositive6598"
date: "2026-04-07T02:28:47.000Z"
score: 135
upvote_ratio: 0.84
num_comments: 137
flair: "Build In Public"
extracted_at: "2026-06-14T15:28:21.906Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1sejdsh.md#c0"
    char_span: [0, 1778]
    sentence_count: 20
    key_terms: [compliance, built, saas, transilienceai, shasta, https, open-source, com]
    token_count: 427
  - id: "social-intelligence/reddit-deep/saas/1sejdsh.md#c1"
    char_span: [1793, 2375]
    sentence_count: 8
    key_terms: [answerpositive6598, certification, newtablecloth, powerfulsquid, compliance, certified, expensive, mrlockett]
    section: Comments
    token_count: 146
  - id: "social-intelligence/reddit-deep/saas/1sejdsh.md#c2"
    char_span: [2377, 4674]
    sentence_count: 14
    key_terms: [something, maintenance, cost, changes, claude, source, open, soc]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/saas/1sejdsh.md#c3"
    char_span: [4341, 6636]
    sentence_count: 19
    key_terms: [something, like, source, different, open, problem, relationships, notification]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/saas/1sejdsh.md#c4"
    char_span: [6383, 7614]
    sentence_count: 10
    key_terms: [answerpositive6598, company, people, gillescode, tweetpilot, expertise, moat, board-level]
    section: Comments
    token_count: 326
  - id: "social-intelligence/reddit-deep/saas/1sejdsh.md#c5"
    char_span: [7616, 9661]
    sentence_count: 20
    key_terms: [vanta, evidence, people, built, pay, soc, type, compliance]
    section: Comments
    token_count: 480
  - id: "social-intelligence/reddit-deep/saas/1sejdsh.md#c6"
    char_span: [9663, 9817]
    sentence_count: 2
    key_terms: [answerpositive6598, expertise, replicate, shipping, respect, agreed, domain, either]
    section: Comments
    token_count: 39
---
# I built an open-source competitor to Delve ($10K-$80K/year) in 8.5 hours using AI. Here’s what that means for SaaS moats.

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1sejdsh/i_built_an_opensource_competitor_to_delve/)
Posted by **AnswerPositive6598** · **135↑** · **137 comments**

I’ve run a cybersecurity company for 25 years. I’ve seen hundreds of startups go through SOC 2, ISO 27001, and HIPAA compliance. Most of them pay $10K to $80K a year for tools like Vanta, Drata, or Secureframe.

Last week I sat down with Claude Code and built Shasta — an open-source platform that covers the same ground. Three compliance frameworks, 72 automated security checks across AWS and Azure, Terraform remediation, auditor-grade policy docs, risk register, SBOM scanning, pen testing, and security questionnaire auto-fill.

Build time: \~8.5 hours across 3 sessions. API cost: $30-50. Price: free.

I’m not posting this to trash those companies. Their teams built real products. But I think founders need to pay attention to what just happened here.

One domain expert with 24 years of context plus an AI coding agent just replicated the core functionality of a category that has raised hundreds of millions in venture capital. In a week.

The moat is not the software anymore. It’s the domain expertise, the distribution, and the trust. If your SaaS product is essentially a checklist engine with a dashboard, a knowledgeable person with AI tools can now build that over a long weekend.

For pre-Series A founders who need compliance but can’t stomach the enterprise pricing: this is for you.

Repo: https://github.com/transilienceai/shasta

Vibe coding guide (how I built it): https://github.com/transilienceai/shasta/blob/release/shasta-v1/VIBE\_CODING.md

## Comments

- **mrlockett** (25↑): This is amazing, but wouldn't we still need someone certified to make this complete? Thank you btw!
  - **newtablecloth** (6↑): Yes it’s the certification that is expensive. There are quite a few saas apps now that take couple hundred dollars to put this together. Still very useful though.
  - **AnswerPositive6598** (7↑): Yes of course. This is more aimed at founders of pre series A startups to become 70-80% coverage on their compliance.
    - **powerfulsquid** (5↑): How secure is that code? Optimized? Scalable? Has it been tested in multiple scenarios?

You’ve got a great MVP but it’s far from production-ready without a real dev team.
    - **mrlockett** (1↑): Thank you, sorry for my ignorance here. Really wish the certification part was something that was systematized, $15K+ becomes such a berrier, cost to play I guess!
- **AndyKJMehta** (15↑): The liability problem still remains.
- **Clem_Backtrex** (7↑): Tbh 8.5 hours gets you a working prototype, not a product. The hard part of compliance tools isn't the checks or the dashboard, it's the ongoing maintenance when AWS changes an API, when SOC 2 criteria get updated, when an auditor flags something your automated check missed. That's the stuff Vanta charges $40k/yr for. You're comparing build cost to subscription cost but ignoring the maintenance cost that'll eat you alive once real companies depend on it. I've seen this pattern a bunch with open source tooling, the v1 looks amazing, then 6 months later nobody's updating the policy templates and the Terraform remediations drift from actual provider specs. Your domain expertise is legit and the project is cool, but the moat for those SaaS companies isn't the checklist engine, it's the boring operational grind of keeping it accurate at scale. That said, for early stage startups who just need to check the box for their first SOC 2, this could be genuinely useful.
  - **AnswerPositive6598** (3↑): True, this is a serious risk, and I’ve been thinking about it. One advantage is that since it is open source and runs within Claude Code, the user themselves can make a lot of changes and Claude will auto remediate bugs in a lot of the cases. But point well taken.
    - **Clem_Backtrex** (2↑): Fair point on the open source angle, that does shift some of the maintenance burden to the community. The Claude auto-remediation thing is interesting too, hadn't thought about that. If users can just prompt their way through updating policy templates when specs change, that actually solves a chunk of the drift problem. The gap would be knowing when something changed in the first place, like who's watching for the SOC 2 criteria update or the new AWS API version. If you crack that notification layer even something simple like a changelog monitor that flags relevant changes, the rest of the workflow kinda handles itself with the open source + AI combo. Good luck with it.
    - **Clem_Backtrex** (2↑): Fair point on the open source angle, that does shift some of the maintenance burden to the community. The Claude auto-remediation thing is interesting too, hadn't thought about that. If users can just prompt their way through updating policy templates when specs change, that actually solves a chunk of the drift problem. The gap would be knowing when something changed in the first place, like who's watching for the SOC 2 criteria update or the new AWS API version. If you crack that notification layer even something simple like a changelog monitor that flags relevant changes, the rest of the workflow kinda handles itself with the open source + AI combo. Good luck with it.
- **GillesCode** (8↑): The moat you're testing isn't really about build time. Vanta's defensibility is auditor relationships, SOC 2 workflows embedded in 10K+ companies, and SLA guarantees a CISO can show their board. You replicated the features in 8.5h — respect. Getting a Fortune 500 security team to run compliance on an unsponsored open source tool is a different problem entirely. The build was never the moat.
  - **AnswerPositive6598** (3↑): 100% agreed. I think the best set of users for this are pre series A startups for whom even the 5k-10k cost is a pain. Claude Code driven tools are never going to cut it with enterprise customers who will need the entire set of saas capabilities plus auditor relationships
    - **GillesCode** (2↑): Yeah the pre-series A sweet spot makes total sense — they feel the pain acutely but don't yet have procurement hell. Enterprise is a different game entirely, compliance and audit trails kill the vibe fast.
- **redishtoo** (3↑): The moat is your 25 years of experience. Pretty hard to cross. 
Now put together a dozen people like you, but in different areas of expertise ( management, accounting, sales, etc.) and you’ve got a company. To grow past that you’ll have to bring in more expertise ou just more people.
  - **AnswerPositive6598** (1↑): I think we just saw the first < 5 people $1 billion company. Some father son duo running a pharma company.
- **GillesCode** (3↑): The moat was never the features. Any decent dev can rebuild a compliance checklist app in a weekend now, with or without AI. What Vanta actually sells is auditor familiarity, board-level brand trust, and the fact that their name is already in your customers' vendor review docs. That's what 8.5 hours can't replicate. The scary part isn't that you rebuilt the tool — it's that for a lot of SaaS, that *is* the whole product.
  - **AnswerPositive6598** (1↑): True!
    - **GillesCode** (1↑): haha yeah, sometimes the simplest things hit hardest
- **deanotown** (2↑): How are those browser store credentials ;)
- **tweetpilot** (2↑): Starred and forked! Hope you will continue improving it.
  - **AnswerPositive6598** (2↑): Thanks!
    - **tweetpilot** (2↑): No. 

Thank you!!!

![gif](giphy|l4FGp4FCcGYswPnrO)
- **YS_askOdin** (2↑): This is genuinely useful — thank you for open-sourcing it.

We're an early-stage startup, and SOC 2 readiness has been on the backlog because Vanta/Drata pricing is hard to justify without enterprise contracts to pay for it. Will be spinning up the repo this week.

Your point about the moat shifting to expertise, distribution, and trust resonates. The same thing is happening in other verticals — the software layer is becoming table stakes, and what survives is the judgment layer on top of it.   
  
Curious whether you're planning to add SOC 2 Type 2 evidence collection down the road, or intentionally keeping it Type 1 / design-only for now.
  - **AnswerPositive6598** (3↑): Thanks! Yes this is for Type 2 mainly. Evidence of control compliance over a period of time. By running scans you can generate a trend of improvement over time. And all those evidences will satisfy your auditors. I believe 80-85% evidence you’ll get from the tool. The rest, like awareness, BCP drills, etc you’ll have to do it manually
- **ZookeepergameHead380** (2↑): This is the "build vs buy" debate on steroids. You proved the build side is now trivial — 8.5 hours and $30. But I think the real lesson here is about who your customer actually is. 

I built a cybersecurity SaaS and learned this the hard way. The people who are technical enough to appreciate what you built are the same people who would've built it themselves anyway. They were never going to pay Vanta $40K. The people who DO pay Vanta $40K are buying the auditor relationships, the "we can blame someone" factor, and the fact that nobody gets fired for choosing the vendor with a SOC 2 badge on their own website.

Your real audience is that middle ground — pre-Series A founders who can't afford Vanta but also can't afford to spend 3 weeks figuring out compliance on their own. The question is whether they'll trust an open-source tool with no support SLA for something that could block a deal or an insurance renewal.

 Either way, respect for shipping it. The 25 years of domain expertise is the part AI can't replicate.
  - **AnswerPositive6598** (1↑): Thanks and agreed!
