---
id: social-intelligence/reddit-deep/engineeringstudents/1raqz1d.md
url: "https://www.reddit.com/r/EngineeringStudents/comments/1raqz1d/google_showed_that_duplicating_your_prompt_2x/"
kind: "social-post"
source: "reddit-deep: r/engineeringstudents"
subreddit: "engineeringstudents"
title: "Google showed that duplicating your prompt 2x boosts AI accuracy. Thinking about making this configurable in PapersFlow. Would you use it?"
author: "papersflow"
date: "2026-02-21T13:21:25.000Z"
score: 5
upvote_ratio: 0.86
num_comments: 0
flair: "Discussion"
extracted_at: "2026-11-09T00:15:37.125Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/engineeringstudents/1raqz1d.md#c0"
    char_span: [0, 1538]
    sentence_count: 10
    key_terms: [prompt, repetition, prompts, papersflow, engineeringstudents, research, configurable, arxiv]
    concepts: [prompt, repetition, engineeringstudents, prompts, papersflow]
    token_count: 339
    sources: [{"n":"reddit-deep: r/engineeringstudents","u":"https://www.reddit.com/r/EngineeringStudents/comments/1raqz1d/google_showed_that_duplicating_your_prompt_2x/","kind":"social-post","date":"2026-02-21","author":"papersflow","subreddit":"engineeringstudents"}]
---
# Google showed that duplicating your prompt 2x boosts AI accuracy. Thinking about making this configurable in PapersFlow. Would you use it?

Source: [reddit-deep: r/engineeringstudents](https://www.reddit.com/r/EngineeringStudents/comments/1raqz1d/google_showed_that_duplicating_your_prompt_2x/)
Posted by **papersflow** · **5↑** · **0 comments**

Google Research published "Prompt Repetition Improves Non-Reasoning LLMs" (Leviathan et al.) — repeating the prompt improves accuracy across Gemini, GPT, Claude, and DeepSeek. One benchmark went from 21% to 97%.

  arXiv: [https://arxiv.org/abs/2512.14982](https://arxiv.org/abs/2512.14982)

  
We're thinking about adding this as a configurable setting in PapersFlow — so you could toggle prompt repetition on or off for any Doxa conversation. Whether you're running a systematic literature review with Prism, asking the Analysis agent to break down a paper's methodology, or having the Critique agent peer-review your manuscript — you'd control whether prompt repetition kicks in.

What makes this interesting for us is the prompt library we already have. You can save research prompts (literature review templates, synthesis workflows, critique rubrics), reference them directly in any Doxa chat, and browse prompts shared by other researchers in the community. Pairing saved prompts with automatic repetition could mean better results from prompts you've already refined.  
  
We'd love feedback before building this out, would you actually toggle this on for your research workflows?
