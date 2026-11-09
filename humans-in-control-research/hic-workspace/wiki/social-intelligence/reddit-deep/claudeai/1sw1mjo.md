---
id: social-intelligence/reddit-deep/claudeai/1sw1mjo.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1sw1mjo/built_an_ai_study_companion_with_claude_api_that/"
kind: "social-post"
source: "reddit-deep: r/claudeai"
subreddit: "claudeai"
title: "Built an AI study companion with Claude API that psychologically holds you accountable — here's what I learned"
author: "Acrobatic-Owl5700"
date: "2026-04-26T08:12:44.000Z"
score: 2
upvote_ratio: 0.58
num_comments: 8
flair: "Built with Claude"
extracted_at: "2026-11-08T23:27:11.376Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/claudeai/1sw1mjo.md#c0"
    char_span: [0, 1919]
    sentence_count: 5
    key_terms: [claude, study-companion-six, companion, goals, https, interesting, app, explicitly]
    concepts: [study-companion-six, claude, companion, interesting, explicitly]
    token_count: 411
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1sw1mjo/built_an_ai_study_companion_with_claude_api_that/","kind":"social-post","date":"2026-04-26","author":"Acrobatic-Owl5700","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1sw1mjo.md#c1"
    char_span: [1933, 3389]
    sentence_count: 11
    key_terms: [fieajmbnpbffmakodgodpfankimcclgc, extension, study-companion, chromewebstore, acrobatic-owl5700, authuser, detail, google]
    concepts: [fieajmbnpbffmakodgodpfankimcclgc, extension, study-companion, chromewebstore, acrobatic-owl5700]
    section: Comments
    token_count: 410
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1sw1mjo/built_an_ai_study_companion_with_claude_api_that/","kind":"social-post","date":"2026-04-26","author":"Acrobatic-Owl5700","subreddit":"claudeai"}]
---
# Built an AI study companion with Claude API that psychologically holds you accountable — here's what I learned

Source: [reddit-deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1sw1mjo/built_an_ai_study_companion_with_claude_api_that/)
Posted by **Acrobatic-Owl5700** · **2↑** · **8 comments**

Wanted to share something I built and the process behind it, think this community would find the approach interesting.

**The core idea**

Most focus apps are timers with blockers. I wanted something that actually *behaves* like an accountability partner — one that knows your goals, tracks your patterns, and won't let you off easy.

**The interesting Claude-specific challenges**

The hardest part wasn't the code — it was getting Claude to maintain consistent pressure without drifting toward generic helpfulness. What actually worked:

* Anchoring the persona to a specific relationship dynamic rather than just adjectives — Claude holds character way better with concrete context
* Feeding stated goals at session start and referencing them explicitly so callbacks feel personal
* Explicitly instructing escalation — Claude naturally de-escalates unless you tell it not to

**What it does**

* Companion persona that references your own stated goals against you when you try to quit
* Anti-lying system — vague check-ins get follow-up questions, you can't bullshit it
* Nuclear Mode — 30-min minimum lock, 5-min activation delay, no escape hatch
* 60-second countdown on exit attempts with escalating messages
* Session scoring 0–100 + streak tracking

**Current status**

Web app is live. Chrome extension is pending review so full site-blocking isn't active yet — companion itself works completely.

Would love feedback on the approach, and looking for long-term users who actually want to fix their focus.

[**https://study-companion-six.vercel.app/**](https://study-companion-six.vercel.app/)

Thanks!

## Comments

- **Xolver** (1↑): Cool idea!


I did something similar on a chatgpt project, but it was less generic, only for my use, and for job hunting rather than studying (although self-study and self-work is a big part of that). It acts like a drill Sargent and I'm its bitch. Fun times.
- **Okay242** (1↑): Let me know when the extention is approved, then i can test it. If you rely only on an extension, you limit reach.  A website makes it accessible and easier to use.

What I noticed when building the Chrome extension is that most people don’t use extensions. They mainly use mobile. On mobile, extension usage is almost zero. That’s why I also built a website, so mobile users can access the same functionality.
  - **Acrobatic-Owl5700** (1↑): I have both a website and the extension and the extension only does the blocking part of the features
  - **Acrobatic-Owl5700** (1↑): Hi just got approved! Here it is: [https://chromewebstore.google.com/detail/study-companion/fieajmbnpbffmakodgodpfankimcclgc?authuser=0&hl=en](https://chromewebstore.google.com/detail/study-companion/fieajmbnpbffmakodgodpfankimcclgc?authuser=0&hl=en)
- **Acrobatic-Owl5700** (1↑): Hi if you were interested in the site, the extension just got approved here it is: [https://chromewebstore.google.com/detail/study-companion/fieajmbnpbffmakodgodpfankimcclgc?authuser=0&hl=en](https://chromewebstore.google.com/detail/study-companion/fieajmbnpbffmakodgodpfankimcclgc?authuser=0&hl=en)
