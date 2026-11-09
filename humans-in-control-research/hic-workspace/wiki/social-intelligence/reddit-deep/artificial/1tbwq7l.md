---
id: social-intelligence/reddit-deep/artificial/1tbwq7l.md
url: "https://www.reddit.com/r/artificial/comments/1tbwq7l/agentkanban_for_vs_code_a_task_board_with_ai/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "AgentKanban for VS Code - A task board with AI agent harness integration. Create and plan tasks with real-time collaboration, then hand off to GitHub Copilot"
author: "gbro3n"
date: "2026-05-13T11:24:22.000Z"
score: 5
upvote_ratio: 0.7
num_comments: 2
flair: "Project"
extracted_at: "2026-11-08T23:27:01.792Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1tbwq7l.md#c0"
    char_span: [0, 1944]
    sentence_count: 8
    key_terms: [appsoftwareltd, https, agent-kanban-vscode, marketplace, extension, visualstudio, agentkanban, code]
    concepts: [appsoftwareltd, agent-kanban-vscode, https, marketplace, extension]
    token_count: 454
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1tbwq7l/agentkanban_for_vs_code_a_task_board_with_ai/","kind":"social-post","date":"2026-05-13","author":"gbro3n","subreddit":"artificial"}]
  - id: "social-intelligence/reddit-deep/artificial/1tbwq7l.md#c1"
    char_span: [1946, 2608]
    sentence_count: 4
    key_terms: [improvements, improves, png, use, tkujgmm93w0h1, reliability, appreciate, concurrent]
    concepts: [improvements, improves]
    token_count: 163
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1tbwq7l/agentkanban_for_vs_code_a_task_board_with_ai/","kind":"social-post","date":"2026-05-13","author":"gbro3n","subreddit":"artificial"}]
---
# AgentKanban for VS Code - A task board with AI agent harness integration. Create and plan tasks with real-time collaboration, then hand off to GitHub Copilot

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1tbwq7l/agentkanban_for_vs_code_a_task_board_with_ai/)
Posted by **gbro3n** · **5↑** · **2 comments**

Hi everyone. I wanted to introduce a tool / product that I've been working on for a while. It's a web application and VS Code extension for use with Github CoPilot (I'm planning to develop integration for other agent harnesses soon).

The web app and remote boards are at: [https://www.agentkanban.io](https://www.agentkanban.io)

The VS Code extension is at VS Code Marketplace ([https://marketplace.visualstudio.com/items?itemName=appsoftwareltd.agent-kanban-vscode](https://marketplace.visualstudio.com/items?itemName=appsoftwareltd.agent-kanban-vscode)) or the Open VSX Registry ([https://open-vsx.org/extension/appsoftwareltd/agent-kanban-vscode](https://open-vsx.org/extension/appsoftwareltd/agent-kanban-vscode)).

**The TLDR** It's a collaborative Kanban board / task management app which supports hand off to Github CoPilot in VS Code, and captures the ongoing user / agent conversation context on the task for resumption in new chats (with context curation tools).

The context collection ignores tool use to prevent bloat in the captured context. AgentKanban also has features for improving agentic coding session quality such as an optional plan / todo / implement workflow and support for Git worktree creation and clean up for working on concurrent tasks.

The tool is an evolution of an earlier VS Code kanban extension ([https://marketplace.visualstudio.com/items?itemName=AppSoftwareLtd.vscode-agent-kanban](https://marketplace.visualstudio.com/items?itemName=AppSoftwareLtd.vscode-agent-kanban)) I built which proved fairly popular but only catered for a local file based workflow.

The new version with the remote board improves the reliability of context capture, with lots of developer experience improvements. It's a tool that I use everyday in my own agentic coding workflows, and I can honestly say that it improves the quality of the code produced and reduces friction in organising working on concurrent features.

I hope you find it useful and would really appreciate your feedback on how you use it, what you think it does well, or any improvements you think could be added.

Many thanks for your time reading this 🙏

https://preview.redd.it/tkujgmm93w0h1.png?width=1597&format=png&auto=webp&s=0a2d2bb41f787b538ca9ded9d00946c731eadbc9
