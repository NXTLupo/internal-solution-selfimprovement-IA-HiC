---
id: social-intelligence/reddit-deep/engineeringstudents/1u8is0p.md
url: "https://www.reddit.com/r/EngineeringStudents/comments/1u8is0p/i_built_an_ai_study_workflow_app_and_would_love/"
kind: "social-post"
source: "reddit-deep: r/engineeringstudents"
subreddit: "engineeringstudents"
title: "I built an AI study workflow app and would love honest feedback from productivity nerds"
author: "LuckOver2658"
date: "2026-06-17T18:44:20.000Z"
score: 0
upvote_ratio: 0.11
num_comments: 3
flair: "Academic Advice"
extracted_at: "2026-11-09T00:15:37.122Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/engineeringstudents/1u8is0p.md#c0"
    char_span: [0, 1630]
    sentence_count: 7
    key_terms: [study, kram-ai-study-review-notes, https, app, productivity, engineeringstudents, png, feedback]
    concepts: [kram-ai-study-review-notes, study, productivity, https, engineeringstudents]
    token_count: 438
    sources: [{"n":"reddit-deep: r/engineeringstudents","u":"https://www.reddit.com/r/EngineeringStudents/comments/1u8is0p/i_built_an_ai_study_workflow_app_and_would_love/","kind":"social-post","date":"2026-06-17","author":"LuckOver2658","subreddit":"engineeringstudents"}]
  - id: "social-intelligence/reddit-deep/engineeringstudents/1u8is0p.md#c1"
    char_span: [1644, 2482]
    sentence_count: 6
    key_terms: [prompted, model, around, shitty, app, like, post, stack-specific]
    concepts: [prompted, model, around, shitty]
    section: Comments
    token_count: 199
    sources: [{"n":"reddit-deep: r/engineeringstudents","u":"https://www.reddit.com/r/EngineeringStudents/comments/1u8is0p/i_built_an_ai_study_workflow_app_and_would_love/","kind":"social-post","date":"2026-06-17","author":"LuckOver2658","subreddit":"engineeringstudents"}]
---
# I built an AI study workflow app and would love honest feedback from productivity nerds

Source: [reddit-deep: r/engineeringstudents](https://www.reddit.com/r/EngineeringStudents/comments/1u8is0p/i_built_an_ai_study_workflow_app_and_would_love/)
Posted by **LuckOver2658** · **0↑** · **3 comments**

Hey everyone, I’m one of the developers of **Kram AI**, an AI study review app for students.

The idea is simple: instead of just generating summaries or flashcards, students upload their notes, PDFs, slides, or screenshots and choose a “Study Stack” based on how they want to review — quick summary, Feynman-style explanation, memory practice, or test prep.

I built this because a lot of students already use AI to study, but the workflow is still messy: copy notes, write prompts, ask for summaries, ask for quizzes, ask for simpler explanations, etc. Kram tries to turn that into a structured review flow.

I’d love honest feedback from this community:

* Does this feel useful for real study productivity?
* What would make you actually use this before exams?
* Is the “Study Stack” idea clear, or does it need better wording?

Not trying to hard-sell — just looking for real feedback from people who care about productivity systems.

App link: [https://apps.apple.com/us/app/kram-ai-study-review-notes/id6771082353](https://apps.apple.com/us/app/kram-ai-study-review-notes/id6771082353)

https://preview.redd.it/t55qwuyw865h1.png?width=1136&format=png&auto=webp&s=41ea60448c22904a1e7e0e2aa6752d7fcefbb953

https://preview.redd.it/ly6zgjzw865h1.png?width=1068&format=png&auto=webp&s=151e7558f86a68d805fbb6ed00d48a395ba9b000

## Comments

- **Any-Stick-771** (6↑): More like you prompted Claude or Gemini to build a shitty OpenAI wrapper, then prompted it to create ugly promotional material, then prompted it to generate this post and the spam the post to mutiple subs.

No one wants your shitty 'take a screenshot of a power point' app
  - **LuckOver2658** (-2↑): I get why a lot of AI apps look like “prompt wrappers,” but that’s not what this is.

The work here isn’t just prompting a model. The app handles local model setup, file input, PDF/slide/image text extraction, study-material preprocessing, stack-specific generation flows, output structuring, limits for large files, and the mobile UX around all of that.

The model is only one part of it. The product is the study workflow layer around it.
    - **Adviderisj** (3↑): This reads as if it was written by chat gpt
