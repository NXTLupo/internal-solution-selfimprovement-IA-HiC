---
id: social-intelligence/reddit-deep/claudeai/1t7nboo.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1t7nboo/i_built_a_living_docs_system_for_longterm_ai/"
kind: "social-post"
source: "reddit-deep: r/claudeai"
subreddit: "claudeai"
title: "I built a “Living Docs” system for long-term AI coding workflows"
author: "RenAzure"
date: "2026-05-08T22:50:07.000Z"
score: 0
upvote_ratio: 0.33
num_comments: 5
flair: "Built with Claude"
extracted_at: "2026-11-08T23:05:59.845Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/claudeai/1t7nboo.md#c0"
    char_span: [0, 2110]
    sentence_count: 17
    key_terms: [docs, documentation, code, truth, sessions, context, system, architecture]
    concepts: [documentation, truth, sessions, context, architecture]
    token_count: 440
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1t7nboo/i_built_a_living_docs_system_for_longterm_ai/","kind":"social-post","date":"2026-05-08","author":"RenAzure","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1t7nboo.md#c1"
    char_span: [2124, 2796]
    sentence_count: 2
    key_terms: [wiki, karpathy, wearesoovercooked, dont, llm, commoditized, reinvented, beginning]
    concepts: [karpathy]
    section: Comments
    token_count: 189
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1t7nboo/i_built_a_living_docs_system_for_longterm_ai/","kind":"social-post","date":"2026-05-08","author":"RenAzure","subreddit":"claudeai"}]
---
# I built a “Living Docs” system for long-term AI coding workflows

Source: [reddit-deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1t7nboo/i_built_a_living_docs_system_for_longterm_ai/)
Posted by **RenAzure** · **0↑** · **5 comments**

English is not my first language. AI actually told me to post this here, and also helped write this post 😅

After months of AI-assisted coding, I kept running into the same problems:

\- repeating architecture context every session

\- stale docs

\- conflicting rules

\- context drift

\- AI modifying wrong parts of the project

\- knowledge disappearing between sessions

So I started building a documentation system specifically for AI workflows.

The idea became something I now call “Living Docs”.

Core idea:

The same agent that changes the code is also responsible for maintaining the documentation and operational memory.

But there is one important constraint:

Documentation is NOT updated automatically after every task.

The human confirms the code is correct first.

Then the agent performs a deliberate “doc sweep” to sync the docs.

Otherwise wrong code can mutate the docs, and then future sessions start treating incorrect behavior as truth.

Some core rules from the system:

One file owns each rule.

No duplication.

If a rule exists in two places,

you now have two sources of truth,

which means you have none.

Code is primary truth for behavior.

Docs are primary truth for intent.

The docs are not static reference material.

They act as institutional memory shared

between humans and AI across sessions.

The architecture has 3 layers:

\- codebase

\- LLM-maintained docs

\- governance/schema layer

The governance layer tells the agent:

\- which docs to load

\- which file owns what

\- when documentation updates are allowed

\- how to prevent duplication and context drift

Still experimental, but it already improved long-session stability a lot for me on larger projects.

Repo:

https://github.com/Diew/living-docs

Would genuinely love feedback from people working with Cursor, Claude Code, Aider, Roo, OpenHands, etc.

## Comments

- **wearesoovercooked** (6↑): Another one lmao
  - **a1454a** (1↑): Now that AI commoditized coding, the same wheels that existed since the beginning of time will get reinvented 1000 times a day. Turns out knowing what not to build is becoming a rare quality.
- **Throwaway_alt_burner** (1↑): It sounds similar to Karpathy’s LLM wiki approach 

You may find more useful ideas there

https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
  - **RenAzure** (1↑): It less like wiki but it focus more on guardrail to control ai what to do or dont do  
i dont know how to explain it just throw that system file .md  in repo and ask ai compare different with llm wiki
