---
id: social-intelligence/reddit-deep/csmajors/1snefsm.md
url: "https://www.reddit.com/r/csMajors/comments/1snefsm/if_youre_using_ai_to_build_your_portfolio/"
kind: "social-post"
source: "reddit-deep: r/csmajors"
subreddit: "csmajors"
title: "If you're using AI to build your portfolio projects please make sure you can actually explain them"
author: "contralai"
date: "2026-04-16T19:53:23.000Z"
score: 95
upvote_ratio: 0.95
num_comments: 8
flair: "Others"
extracted_at: "2026-11-08T23:26:30.950Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/csmajors/1snefsm.md#c0"
    char_span: [0, 2258]
    sentence_count: 16
    key_terms: [explain, people, portfolio, because, interviews, understand, "can't", project]
    concepts: [explain, portfolio, people, because, interviews]
    token_count: 458
    sources: [{"n":"reddit-deep: r/csmajors","u":"https://www.reddit.com/r/csMajors/comments/1snefsm/if_youre_using_ai_to_build_your_portfolio/","kind":"social-post","date":"2026-04-16","author":"contralai","subreddit":"csmajors"}]
  - id: "social-intelligence/reddit-deep/csmajors/1snefsm.md#c1"
    char_span: [2272, 3663]
    sentence_count: 5
    key_terms: ["you're", ok-principle-9276, function, describing, decisions, scenario, "wouldn't", explain]
    concepts: [ok-principle-9276, "you're", function, describing, decisions]
    section: Comments
    token_count: 325
    sources: [{"n":"reddit-deep: r/csmajors","u":"https://www.reddit.com/r/csMajors/comments/1snefsm/if_youre_using_ai_to_build_your_portfolio/","kind":"social-post","date":"2026-04-16","author":"contralai","subreddit":"csmajors"}]
---
# If you're using AI to build your portfolio projects please make sure you can actually explain them

Source: [reddit-deep: r/csmajors](https://www.reddit.com/r/csMajors/comments/1snefsm/if_youre_using_ai_to_build_your_portfolio/)
Posted by **contralai** · **95↑** · **8 comments**

I'm not here to tell anyone to stop using AI because I use it every day myself. But I've been talking to a lot of people who are going through technical interviews recently and there's a pattern that keeps coming up that I think every CS student needs to hear before they start applying.

People are building genuinely impressive portfolio projects with AI. Clean code, good architecture, proper design patterns, solid test coverage. They put it on their resume, they get interviews, and then in the technical discussion the interviewer says "walk me through how this works" and they freeze. Not because they're nervous but because they genuinely don't know how their own project works. They prompted for it, it worked, they pushed it to GitHub, and they never went back to understand what was generated.

The specific things I keep hearing about: people who used Spring Boot but can't explain dependency injection when asked. People who implemented JWT authentication but don't know what a refresh token actually does. People who have microservices architecture in their portfolio but can't explain why the services are separated the way they are. The answer to "why did you choose this approach" is silence because the real answer is "ChatGPT chose it."

A simpler project that you fully understand will perform infinitely better in an interview than a complex project you can't walk through. If AI generated something in your portfolio and you can't explain every function and every design decision, either take the time to learn it or replace it with something simpler that you actually built and understand.

This isn't about being anti-AI. It's about making sure the thing that's supposed to get you hired doesn't become the thing that gets you rejected. The interviewers are catching on to this fast and the easiest filter is "explain your own code."

Has anyone here experienced this in interviews? Either getting caught off guard or watching someone else get caught?

## Comments

- **HayatoKongo** (31↑): Should always make sure that you're questioning design decisions. It's very liberating that you don't need to write every boilerplate function, but at least be able to draw a picture of the overall project and explain the major design decisions.

As a professional, I wouldn't hold it against someone to explain to me every minute detail. No one should be asking you on the spot "oh well what are the steps of the algorithm you used in the function that does that?", but they are going to ask you "Why did you decide to use Redis?", "What are you using GraphQL for?", "Why did you choose Rust over Go for the backend?", etc.
  - **contralai** (6↑): exactly, and honestly this is the bare minimum. just get in the habit of asking yourself "why this and not that" every time the AI makes a decision for you.
- **Ok-Principle-9276** (1↑): This is biased thinking. In the scenario you're describing, those people wouldn't have even got the interview in the fist place if their resume was blank so you're actually describing a scenario where using AI to fake their portfolio worked out to their favor.
  - **Impossible-Brush2227** (2↑): If you're this dumb you don't need to worry about it, for most people the choice isn't between shutting down all cognitive function or having an AI do everything for them.
    - **Ok-Principle-9276** (2↑): I never said that so why lie
