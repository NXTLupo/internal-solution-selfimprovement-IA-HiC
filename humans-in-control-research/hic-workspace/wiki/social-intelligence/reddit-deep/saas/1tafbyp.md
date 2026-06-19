---
id: social-intelligence/reddit-deep/saas/1tafbyp.md
url: "https://www.reddit.com/r/SaaS/comments/1tafbyp/9000_lines_of_code_solo_founder_99month_saas_the/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "9,000 lines of code, solo founder, $99/month SaaS. The unglamorous reality."
author: "goflameai"
date: "2026-05-11T20:24:58.000Z"
score: 0
upvote_ratio: 0.33
num_comments: 31
flair: ""
extracted_at: "2026-06-14T15:28:21.914Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1tafbyp.md#c0"
    char_span: [0, 2191]
    sentence_count: 22
    key_terms: [code, lines, saas, founder, email, works, integration, real]
    token_count: 510
  - id: "social-intelligence/reddit-deep/saas/1tafbyp.md#c1"
    char_span: [2206, 4325]
    sentence_count: 30
    key_terms: [finance, development, claude, code, file, backend, started, gemini]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/saas/1tafbyp.md#c2"
    char_span: [4327, 6377]
    sentence_count: 10
    key_terms: [everything, because, billing, instead, right, incremental, add, auth]
    section: Comments
    token_count: 480
  - id: "social-intelligence/reddit-deep/saas/1tafbyp.md#c3"
    char_span: [6379, 8489]
    sentence_count: 20
    key_terms: [customers, already, support, paying, questions, something, customer, someone]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/saas/1tafbyp.md#c4"
    char_span: [8491, 10528]
    sentence_count: 25
    key_terms: [file, because, that-guy-scott, "you're", architecture, refactoring, customers, customer]
    section: Comments
    token_count: 494
  - id: "social-intelligence/reddit-deep/saas/1tafbyp.md#c5"
    char_span: [10532, 11044]
    sentence_count: 4
    key_terms: [sendio, day, especially, instantly, something, founders, linkedin, meetings]
    section: Comments
    token_count: 106
---
# 9,000 lines of code, solo founder, $99/month SaaS. The unglamorous reality.

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1tafbyp/9000_lines_of_code_solo_founder_99month_saas_the/)
Posted by **goflameai** · **0↑** · **31 comments**

My codebase just crossed 9,000 lines. Server.js alone is 8,200+. One file. One developer. Built with Claude Code over about 3 months.

Here's what 9,000 lines gets you in a vertical SaaS:

\- Full landing page with bilingual support (English/Spanish)

\- Email verification security gate with honeypot and rate limiting

\- 19 industry-specific configuration templates

\- Real-time Google Calendar and Outlook integration via OAuth

\- Retell AI voice agent integration with auto-cloning per customer

\- Telnyx SIP telephony with auto-provisioning phone numbers

\- Stripe billing with automated onboarding (7 steps, zero manual work)

\- Admin dashboard with live metrics

\- Automated email sequences (day 1, 3, 7, 12, monthly review)

\- Blog with structured data for AI search optimization

\- Cookie consent, email unsubscribe, SMS compliance, recording consent

\- A "call me" demo feature that triggers an outbound AI call in 10 seconds

What 9,000 lines doesn't get you:

\- Customers. That's a completely different skill set.

\- Sleep. Solo founder means every bug at 2 AM is your bug.

\- Clean architecture. One 8,200-line file is a tech debt nightmare I'll pay for eventually.

The unsexy truth about building with AI as your only team: you can ship features at an insane pace, but the code quality is inconsistent. Some functions are beautiful. Others are held together with try-catch blocks and hope. A proper code review would make a senior engineer cry.

But it works. Every feature listed above is live in production, handling real calls, booking real appointments. Perfection is the enemy of shipped.

The real bottleneck was never the code, it was always distribution. I spent 3 months building a product that works and 3 weeks learning that Reddit threads convert better than cold calls.

What's your codebase look like as a solo founder? Anyone else living in the "it works but don't look too closely" phase?

## Comments

- **Modulius** (12↑): Are you actually bragging about one file with 8.200 lines of code? this is moronic on so many levels
  - **joshbuildsstuff** (1↑): Yeah but he can charge $99 per backend file this way!
- **FinPlannerAnalyst** (2↑): My backend was at 44,000 lines last week. It is complete. I'm building the frontend now.  It's a B2B fintech. I'm a finance SME and a beginner dev. I started in March officially but I've been developing for over 2 years. It started with a tech based process so I can validate the ideas and work out the needs and flow. I used 3rd party tech to begin. Meanwhile I juiced up my coding knowledge from python tinkering into to backend development (light). 

I use Claude but not Claude code because I wanted to control the development, read and approve the code, and protect it from hallucinations.  Also, since it's finance heavy some of the biggest sections needed tlc with my finance theory, additional research, and testing. It is much more than one file. I would lose my mind if it was one file. 

With Claude,I did a mid-dev audit weekly to ensure the code was going the way I wanted it. I used Gemini to review it and let Claude and Gemini debate it. Gemini gave "punch lists" of what needed to be corrected or revised. I made both explain their reasons for everything. I also made sure there was no drift.  I have foundational documentation from the prior two years that helped with that. I made different rag models for development, marketing and sales planning, legal, security. And at times I make them share information for continuity. 

Market started early before coding.  It is so important to build with sales in mind. Otherwise, what's the point?  For internal use, this app was finished weeks ago.

I loved the finance parts, the other system architecture stuff was fascinating but tedious. Now the frontend is the hard part because it's the packaging. It subscription service for business owners or advisors. $150/mo for owners $350/mo for advisors. I have 2 paying beta testers lined up for June and maybe one more who is an adviser. I hope to fully launch in July. 

It's exciting and scary to see the light at the end of the tunnel.
- **Shot-Ad8790** (2↑): Your biggest leverage is observability and isolation. Add end-to-end tests for auth, billing, and call flows and put feature flags around risky changes so refactors become incremental instead of 2 AM fire drills.
  - **goflameai** (1↑): Feature flags is the right call. I've been doing deploy-and-pray instead of incremental rollouts, and it's only a matter of time before that bites me.

The end-to-end tests for auth, billing, and call flows are the highest leverage ones to write first. Those are the three paths where a bug directly costs money or loses a customer. Everything else can break gracefully.

Adding this to the pre-first-customer checklist. Appreciate the push.
- **Effective-Eagle5926** (2↑): the unglamorous part is the right framing. one thing i'd push back on though.

server.js at 8200 lines hits a wall around month 6 not because the code is bad, but because every bug fix starts requiring you to hold the whole file in your head before you touch it. you start avoiding fixes because the cognitive load is too high.

the move that helped me with a similar mono-file project: don't refactor to modules until you actually need to. instead, write a 'where everything lives' note at the top of the file, updated whenever you add a chunk. just a header comment with 'lines 100-400 = auth, 400-900 = billing webhooks, 900-1500 = main worker.' takes 10 minutes to maintain. saves an hour of scrolling every week.

the other thing nobody warns you about: the support workflow is what eats your week, not the code. once paying customers are in, every odd question becomes a 30-minute side quest. plan macros and an faq before you launch, not after.
  - **goflameai** (1↑): The "where everything lives" header comment is a great idea. Going to add that today. I've been relying on Claude Code to navigate the file for me, but you're right that human readability matters when you're debugging at 2 AM and don't want to wait for AI context loading.

The support workflow warning is something I'm already starting to feel. Even with zero paying customers, the Reddit threads alone generate questions that take 30-60 minutes each to respond to thoughtfully. Multiply that by actual customers with real problems and I can see how it swallows your week fast.

Two things I'm doing pre-launch to get ahead of it:

1. The admin dashboard already tracks every call, demo attempt, and signup. So when a customer says "CLARA didn't book my appointment yesterday at 3 PM," I can pull the call recording and transcript from Retell in about 30 seconds. That should cut most support investigations down significantly.

2. The FAQ on the landing page is also in the structured data and llms-full.txt. So when someone asks ChatGPT or Perplexity a question about CLARA, the answer is already written. That offloads some of the "how does X work" questions to AI search before they ever reach me.

But macros and canned responses for common scenarios is smart. Going to build those before the first paying customer, not after. Appreciate the heads-up from someone who's been through it.

What was the support issue that caught you most off guard?
- **MountainOdd6793** (2↑): Why not ask Claude code to split it into smaller files?
  - **goflameai** (-2↑): That's the plan, just hasn't been the priority yet.

The irony is Claude Code built the 8,200-line monster, so it can definitely break it apart. The risk is introducing bugs at the module boundaries during the split. Right now everything works in production and I'd rather not touch a running system until I have a proper test suite to catch regressions.

It's on the list right after "get paying customers." Which is a more urgent architectural problem than file structure.
    - **Embarrassed-Mud-1610** (2↑): This is something you pay attention to from the start. I have my agent set up to plan each step and review after every change. It takes longer but provides a much better response.
    - **CVBrownie** (2↑): ![gif](giphy|O74jhOpGckDpiQ9R6H)
    - **prosecniredditor** (1↑): "It built it so it can break it apart"

![gif](giphy|Ij5kcfI6YwcPCN26U2)
- **That-Guy-Scott** (1↑): Please, for the love of all that is holy. Google 'OOP'. This is way too much for 1 file.
  - **goflameai** (-2↑): You're not wrong and my future self is going to hate my present self for this.

8,200 lines in one file. I know. I can hear the senior engineers screaming from here.

The honest reason: when you're building with AI coding tools at speed, refactoring into modules slows down the iteration loop. Every time I split something into a separate file, the AI loses context on the full system and starts making mistakes at the boundaries. Keeping everything in one file means the AI can see the whole picture.

Is it sustainable? Absolutely not. Will I refactor into proper modules before onboarding the first paying customer? Probably. Will I refactor before it breaks in a way that takes me 4 hours to debug because I can't find the function in 8,200 lines? Definitely. That day is coming soon.

But right now, shipping features and getting customers matters more than architecture. Nobody ever lost a customer because their server.js was too long. Plenty of people never got customers because they spent 3 months refactoring instead of launching.

I'll take "works in production but ugly" over "beautiful architecture with zero users" every time. At this stage anyway.
    - **That-Guy-Scott** (1↑): Sounds like you know what you're doing then. Best of luck to you.
- **Traveler_W_Anxiety** (1↑): "Its over 9000!"
- **thaifyghter** (1↑): The real bottleneck was never the code? You literally took the maximum amount of dev shortcuts possible. Good luck man, this is not maintainable and you’re going to hit the wall of reality very soon. This is what happens when toddlers get power tools.
- **CopyBurrito** (1↑): ran into the same. try a co-marketing partnership. we saw 40% lift in signups after one good cross-promotion.
- **Sensitive-Taro8641** (1↑): That setup is pretty much the solo founder story. You can ship fast, but getting people to care is the hard part.



The Reddit bit is a good lesson too. A lot of founders spend all day on product and then wonder why no one shows up.



For outbound and follow up stuff, tools like instantly and sendio ai can help once you’ve got something people actually want. sendio ai is especially useful if you’re trying to find leads with buying intent and keep LinkedIn outreach moving without living in the inbox all day.



The one file thing sounds painful later, but if it’s shipping and booking meetings, it’s doing its job for now.
