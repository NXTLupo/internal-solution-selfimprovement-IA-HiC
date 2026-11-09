---
id: social-intelligence/reddit-deep/students/1oze61l.md
url: "https://www.reddit.com/r/Students/comments/1oze61l/i_made_mindhalo_a_macos_study_assistant_using/"
kind: "social-post"
source: "reddit-deep: r/students"
subreddit: "students"
title: "I made MindHalo – a macOS Study Assistant Using On-Device AI"
author: "Economy-Department47"
date: "2025-11-17T11:46:25.000Z"
score: 1
upvote_ratio: 1
num_comments: 3
flair: ""
extracted_at: "2026-11-08T23:02:11.277Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/students/1oze61l.md#c0"
    char_span: [0, 1575]
    sentence_count: 4
    key_terms: [macos, study, mindhalo, https, interface, eb8a196aa3d742d75aaba60d169062e738f2cac6, flashcards, techfixpro]
    concepts: [mindhalo, macos, study, interface, https]
    token_count: 390
    sources: [{"n":"reddit-deep: r/students","u":"https://www.reddit.com/r/Students/comments/1oze61l/i_made_mindhalo_a_macos_study_assistant_using/","kind":"social-post","date":"2025-11-17","author":"Economy-Department47","subreddit":"students"}]
  - id: "social-intelligence/reddit-deep/students/1oze61l.md#c1"
    char_span: [1589, 1927]
    sentence_count: 1
    key_terms: [economy-department47, open, developer, notarized, something, hesitate, manually, security]
    concepts: [economy-department47]
    section: Comments
    token_count: 81
    sources: [{"n":"reddit-deep: r/students","u":"https://www.reddit.com/r/Students/comments/1oze61l/i_made_mindhalo_a_macos_study_assistant_using/","kind":"social-post","date":"2025-11-17","author":"Economy-Department47","subreddit":"students"}]
---
# I made MindHalo – a macOS Study Assistant Using On-Device AI

Source: [reddit-deep: r/students](https://www.reddit.com/r/Students/comments/1oze61l/i_made_mindhalo_a_macos_study_assistant_using/)
Posted by **Economy-Department47** · **1↑** · **3 comments**

https://preview.redd.it/bzlhb4wz1t1g1.png?width=2386&format=png&auto=webp&s=eb8a196aa3d742d75aaba60d169062e738f2cac6

I’ve been working on a macOS study tool called **MindHalo** and wanted to share it with others who are interested in learning tools or macOS development. It’s built with SwiftUI and uses Apple’s Foundation Models API so everything runs directly on the device.

**Main features include:**

**• AI Study Tutor**  
– Answers questions with contextual follow-ups  
– Conversation view with a clean, minimal interface

**• Study Guide Generator**  
– Turns pasted notes or topics into structured outlines  
– Includes explanations and examples  
– Guides are stored locally

**• Flashcards**  
– Creates flashcards from any text  
– Simple flip-card interface with progress tracking

**License + Privacy**  
– Uses a hardware-bound license system  
– I’m providing keys for free for anyone who wants to try it  
– All processing happens on the Mac (no data sent to servers)

The project page has more details, screenshots, and the current build: [**https://mindhalo.techfixpro.net/**](https://mindhalo.techfixpro.net/).

I’m mainly looking for feedback from people who use study tools or build macOS apps—interface, workflow, performance, anything. It’s developed on Apple Silicon and targets macOS 26+.

## Comments

- **Economy-Department47** (1↑): The app is not notarized becuase I did not get the paid apple developer account so you might have to go into settings privacy and security and manually open it if you scroll down there should be something that says open anyway.
- **Economy-Department47** (1↑): If you have any issues don't hesitate to ask
