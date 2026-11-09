---
id: social-intelligence/reddit-deep/neu/1qfhuw3.md
url: "https://www.reddit.com/r/NEU/comments/1qfhuw3/northeastern_coop_chrome_extension/"
kind: "social-post"
source: "reddit-deep: r/neu"
subreddit: "neu"
title: "Northeastern Co-op Chrome Extension"
author: "turtlecap1324"
date: "2026-01-17T16:37:12.000Z"
score: 72
upvote_ratio: 0.99
num_comments: 9
flair: "Co-op & Career"
extracted_at: "2026-11-09T00:13:29.057Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/neu/1qfhuw3.md#c0"
    char_span: [0, 1854]
    sentence_count: 9
    key_terms: [https, co-op, co-ops, nucoop, nuworks-co-op-grader, app, tool, chrome-extension]
    concepts: [https, co-op, nuworks-co-op-grader, co-ops, nucoop]
    token_count: 468
    sources: [{"n":"reddit-deep: r/neu","u":"https://www.reddit.com/r/NEU/comments/1qfhuw3/northeastern_coop_chrome_extension/","kind":"social-post","date":"2026-01-17","author":"turtlecap1324","subreddit":"neu"}]
  - id: "social-intelligence/reddit-deep/neu/1qfhuw3.md#c1"
    char_span: [1868, 2550]
    sentence_count: 5
    key_terms: [turtlecap1324, thank, academicweapon149, cake, day, julianproskillz, northeastern, innovators]
    concepts: [turtlecap1324, thank]
    section: Comments
    token_count: 212
    sources: [{"n":"reddit-deep: r/neu","u":"https://www.reddit.com/r/NEU/comments/1qfhuw3/northeastern_coop_chrome_extension/","kind":"social-post","date":"2026-01-17","author":"turtlecap1324","subreddit":"neu"}]
---
# Northeastern Co-op Chrome Extension

Source: [reddit-deep: r/neu](https://www.reddit.com/r/NEU/comments/1qfhuw3/northeastern_coop_chrome_extension/)
Posted by **turtlecap1324** · **72↑** · **9 comments**

# 🔗 Link: [https://nucoop.app/](https://nucoop.app/)

# NU Co-op Helper Tool

Hey everyone,

I built a co-op tool to help Northeastern students with their co-op search. It lets you:

* **Grade yourself against co-ops**
* **Identify co-ops with external applications** (e.g., Workday)
* **Tag co-ops you’re ineligible for** (EX: Only looking for students graduating XYZ...)
* **Track application status** (active/inactive)

There are also a few quality-of-life features, like an “unfavorite all” button and the ability to grade co-ops directly from the search page.

The tool **does not store your resume**. All processing happens **locally** in your browser, using cosine similarity. (There are no external APIs or requests being sent; you can check the network logs).

I originally made this because I was using a Python script to grade myself against jobs and applying to the highest percent match, but a few friends had asked to use it, and the install was too hard, so I just made it a Chrome extension.

While this tool won’t guarantee you a co-op, it saves a ton of time by helping you avoid postings that aren’t a good fit (wrong graduation year, major mismatch, etc.). It helped me spend far less time on NUWorks and more time on actual classwork, and I hope it helps others too.

If you run into any bugs or issues, my contact info is on the site.

Let me know if this is useful, and good luck with your co-op search!

🔗 Link: [https://nucoop.app/](https://nucoop.app/)

🐙 Github Repo: [https://github.com/Ashwin-Iyer1/NUWorks-Co-op-grader/tree/chrome-extension](https://github.com/Ashwin-Iyer1/NUWorks-Co-op-grader/tree/chrome-extension)

## Comments

- **dark_stallion_99** (11↑): Awesome stuff!
  - **turtlecap1324** (2↑): Thank you!
    - **exclaim_bot** (1↑): >Thank you!

You're welcome!
- **JulianProskillz** (2↑): Bro Ash this is some CRAZY work
  - **turtlecap1324** (1↑): Thank you, twin🙏🙏
- **AcademicWeapon149** (1↑): OP, this looks really good! Happy cake day too 🍰
  - **turtlecap1324** (2↑): Thank you! Didn’t even realize that today was that day lol
- **Yyyapi** (-8↑): This Chrome extension feels like cake and kiwi for your brain—pure knowledge in a turtlecap that smooths workflows so well that when shit happens, the friction just fades. Love northeastern and its little innovators.
  - **turtlecap1324** (9↑): Bud.
