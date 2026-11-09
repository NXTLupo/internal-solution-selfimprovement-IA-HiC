---
id: social-intelligence/reddit-deep/museagent/1xab88u.md
url: "https://www.reddit.com/r/MuseAgent/comments/1xab88u/muse_cleo_connecting_your_assistant_to_phone_calls/"
kind: "social-post"
source: "reddit-deep: r/museagent"
subreddit: "museagent"
title: "Muse + Cleo — connecting your assistant to phone calls"
author: "cleo-powered"
date: "2026-10-19T22:31:49.000Z"
score: 12
upvote_ratio: 1
num_comments: 8
flair: "Built With Muse"
extracted_at: "2026-11-09T00:13:27.141Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/museagent/1xab88u.md#c0"
    char_span: [0, 2024]
    sentence_count: 13
    key_terms: [muse, cleo, com, https, personal, call, calling, calls]
    concepts: [personal, https, calling, calls, phone]
    token_count: 470
    sources: [{"n":"reddit-deep: r/museagent","u":"https://www.reddit.com/r/MuseAgent/comments/1xab88u/muse_cleo_connecting_your_assistant_to_phone_calls/","kind":"social-post","date":"2026-10-19","author":"cleo-powered","subreddit":"museagent"}]
  - id: "social-intelligence/reddit-deep/museagent/1xab88u.md#c1"
    char_span: [2038, 2911]
    sentence_count: 6
    key_terms: [cleo-powered, calls, notneccessarilyme, limit, month, "i'm", getting, removed]
    concepts: [cleo-powered, notneccessarilyme, calls, limit, month]
    section: Comments
    token_count: 254
    sources: [{"n":"reddit-deep: r/museagent","u":"https://www.reddit.com/r/MuseAgent/comments/1xab88u/muse_cleo_connecting_your_assistant_to_phone_calls/","kind":"social-post","date":"2026-10-19","author":"cleo-powered","subreddit":"museagent"}]
---
# Muse + Cleo — connecting your assistant to phone calls

Source: [reddit-deep: r/museagent](https://www.reddit.com/r/MuseAgent/comments/1xab88u/muse_cleo_connecting_your_assistant_to_phone_calls/)
Posted by **cleo-powered** · **12↑** · **8 comments**

Hey everyone! I’m the builder behind Cleo, an AI assistant focused on phone calls, and wanted to share the Muse connection I’ve been working on.  


[Muse + Cleo](https://reddit.com/link/1xab88u/video/5h64wpd5yhwh1/player)

The idea is to keep the errand in your Muse conversation: work out what you need, approve the call, and have Cleo make it and return the result.

Muse already has native calling, so what does Cleo add?

* **Personal calls too.** Meta currently describes Muse’s calling feature around businesses with publicly available numbers. Cleo also supports authorized calls to personal contacts. [Meta’s calling description](https://www.meta.com/help/artificial-intelligence/4532990443643263/)
* **AI handles the call.** Cleo uses an AI caller throughout; we don’t hand your request to a human concierge to make the call.
* **A dedicated calling product.** Muse handles a broad range of tasks across apps and websites. Cleo’s focus is the phone workflow: your instructions, approval, the conversation, and a useful result. The connection lets the two work together. [Muse’s features](https://ai.meta.com/muse/)

The integration uses Muse’s custom connectors, and setup starts with one prompt:

>Muse, read [cleopowered.com/llms.txt](https://cleopowered.com/llms.txt) and follow the Cleo onboarding instructions.

That starts the onboarding flow, including the required account setup and phone verification. Your Muse setup needs API tools and secure key storage.

I’m still refining the experience. What would you want to use this for—an everyday personal call, an appointment, or something else? Happy to discuss how it works.

What would you want to use this for—an everyday personal call, an appointment, or something else? Happy to discuss how it works.

## Comments

- **pyxispyxis** (1↑): Does this work in Canada?
  - **cleo-powered** (1↑): Yes, +1 numbers work.
- **reno2905** (1↑): Que otras aplicaciones o bots se pueden enlazar a Muse
- **PossibilityNo8985** (1↑): Unfortunately some calls take more than 10 minutes for the paid version. Just trying to get a human can take longer than that.
  - **cleo-powered** (1↑): I'm actively working on getting that limit removed. If you signed up, I'm sending emails every 2 weeks on new features.
- **NotNeccessarilyMe** (1↑): $20 per month is a lot if all I am making is 1 to 3 calls a month. Also can’t make any calls within 3 mins and 10 min limit is a no-go.
  - **cleo-powered** (1↑): u/NotNeccessarilyMe I appreciate the feedback. You can make 5 calls for free each month, after that there is a pay-as-go plan that buys you 15mins for $5. I'm working on getting the 10min limit removed.
