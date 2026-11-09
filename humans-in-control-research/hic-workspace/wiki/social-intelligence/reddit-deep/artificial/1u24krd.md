---
id: social-intelligence/reddit-deep/artificial/1u24krd.md
url: "https://www.reddit.com/r/artificial/comments/1u24krd/a2a_how_it_looks_in_an_enterprise_build/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "A2A, how it looks in an enterprise build"
author: "AureaAvis71"
date: "2026-06-10T14:56:59.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 3
flair: "Project"
extracted_at: "2026-11-08T23:27:01.795Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1u24krd.md#c0"
    char_span: [0, 1997]
    sentence_count: 19
    key_terms: [agent, a2a, backend, agents, architecture, mcp, artificial, enterprise]
    concepts: [agent, backend, architecture, agents, artificial]
    token_count: 429
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1u24krd/a2a_how_it_looks_in_an_enterprise_build/","kind":"social-post","date":"2026-06-10","author":"AureaAvis71","subreddit":"artificial"}]
  - id: "social-intelligence/reddit-deep/artificial/1u24krd.md#c1"
    char_span: [2011, 3082]
    sentence_count: 6
    key_terms: [mcp, layer, something, a2a, orchestration, matters, breaks, split]
    concepts: [something, layer, orchestration, matters, breaks]
    section: Comments
    token_count: 230
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1u24krd/a2a_how_it_looks_in_an_enterprise_build/","kind":"social-post","date":"2026-06-10","author":"AureaAvis71","subreddit":"artificial"}]
---
# A2A, how it looks in an enterprise build

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1u24krd/a2a_how_it_looks_in_an_enterprise_build/)
Posted by **AureaAvis71** · **1↑** · **3 comments**

The team has been deep in agentic AI for enterprise lately and wanted to share some architecture notes from a recent build, specifically around how MCP and A2A play together in practice.

The workflow was a fully autonomous churn risk pipeline. Six agents, one human touchpoint:

1. ML model scores customers by churn risk
2. Recommendation agent proposes relevant products based on buying history
3. Availability check filters out-of-stock items
4. Pricing/promo agent surfaces applicable promotions
5. Transaction agent creates an inquiry in the backend system
6. Email agent drafts outreach to the sales rep, who just clicks send

**On the architecture:**

MCP handled the tool layer, a generic pluggable server that any front end can call, regardless of what LLM or agent framework is driving it. Clean separation between the tool interface and whatever is consuming it.

A2A sits on top as the smart router. Instead of hardcoded API calls, you have an LLM-powered middleware that interprets intent, selects tools, handles failures, and decides when the task is actually done. The jump from MCP to A2A is essentially the jump from "here are your endpoints" to "here is a system that figures out what you need."

**On governance:**

The hardest design problem wasn't the agents, it was access control. As A2A opens up system-to-system communication, the attack surface grows fast. The team ended up pre-certifying every backend connection rather than leaving it open. Some found it restrictive. In hindsight it was the right call, especially when agents are autonomously creating transactions without human review.

Curious how others are handling governance in agentic workflows. Are you locking down backend access or keeping it open and monitoring after the fact?

## Comments

- **Born-Exercise-2932** (1↑): the governance piece is the part most people skip until something breaks. pre-certifying backend connections feels restrictive but it's the only way to sleep well when agents are autonomously creating transactions. the mcp/a2a split you described matches what i've seen work too — mcp as the stable tool contract, a2a as the dynamic orchestration layer on top
  - **AureaAvis71** (1↑): Right, and "until something breaks" is often a public break. The audit trail matters as much as the restriction itself. Knowing which agent touched what and when is what makes the pre-certification model defensible to the business, not just to the engineering team.

On the MCP/A2A split, important to our project, was how much the stability of the MCP layer matters for the A2A layer to function well. If your tool contracts are shifting, the orchestration layer compounds the problem fast. Getting MCP locked down first and treating it as infrastructure rather than something you iterate on was the decision that made everything above it more reliable.
