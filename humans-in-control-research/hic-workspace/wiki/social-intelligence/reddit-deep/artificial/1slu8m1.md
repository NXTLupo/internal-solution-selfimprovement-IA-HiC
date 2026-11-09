---
id: social-intelligence/reddit-deep/artificial/1slu8m1.md
url: "https://www.reddit.com/r/artificial/comments/1slu8m1/i_built_synapse_ai_an_opensource_dagbased/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "I built Synapse AI: An open-source, DAG-based orchestrator for AI agents."
author: "WabbaLubba-DubDub"
date: "2026-04-15T03:13:29.000Z"
score: 5
upvote_ratio: 0.69
num_comments: 6
flair: "Project"
extracted_at: "2026-11-08T23:27:01.794Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1slu8m1.md#c0"
    char_span: [0, 2110]
    sentence_count: 9
    key_terms: [agents, architecture, cli, synapse, open-source, artificial, comments, existing]
    concepts: [agents, architecture, synapse, open-source, artificial]
    token_count: 493
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1slu8m1/i_built_synapse_ai_an_opensource_dagbased/","kind":"social-post","date":"2026-04-15","author":"WabbaLubba-DubDub","subreddit":"artificial"}]
  - id: "social-intelligence/reddit-deep/artificial/1slu8m1.md#c1"
    char_span: [2112, 4174]
    sentence_count: 19
    key_terms: [orchestration, ai-coding-harness-agents-2026, https, pipelines, wabbalubba-dubdub, use, building, feedback]
    concepts: [orchestration, ai-coding-harness-agents-2026, wabbalubba-dubdub, pipelines, https]
    section: Comments
    token_count: 482
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1slu8m1/i_built_synapse_ai_an_opensource_dagbased/","kind":"social-post","date":"2026-04-15","author":"WabbaLubba-DubDub","subreddit":"artificial"}]
---
# I built Synapse AI: An open-source, DAG-based orchestrator for AI agents.

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1slu8m1/i_built_synapse_ai_an_opensource_dagbased/)
Posted by **WabbaLubba-DubDub** · **5↑** · **6 comments**

**Hey** Everyone,

For the past three months, I’ve been building an open-source orchestration platform for AI agents called [**Synapse AI**](https://github.com/naveenraj-17/synapse-ai).

I started this because I found existing frameworks (like LangChain or AutoGen) either too bloated or too unpredictable for production workflows. Letting agents freely "chat" with each other often leads to infinite loops, high API costs, and debugging nightmares. I wanted strict, predictable control.

**The Architecture:** Instead of conversational routing, Synapse AI relies on a Directed Acyclic Graph (DAG) architecture. You define the work, strictly control the hand-offs between agents, and get a completed task on the other side.

**Under the Hood:**

* **Tool Agnostic:** Build custom tools from scratch (Python/webhooks) or instantly plug in existing Model Context Protocol (MCP) servers.
* **Local-First Emphasis:** Full native support for Ollama so you can run routing and tasks entirely locally. (It also supports Gemini, Claude, and OpenAI for the heavy lifting).
* **CLI Integration:** Just shipped a community-requested feature to connect Claude Code, Gemini CLI, Codex CLI, and GitHub Copilot CLI directly to your agents.
* **Frictionless Setup:** A 1-step installation process across macOS, Windows, and Linux.

**What I'm looking for:** I am currently maintaining this solo and rolling it out for an early pilot phase. I would love for this community to take a look under the hood. Specifically:

1. **Code Review:** I’d love brutal feedback on the DAG implementation and overall architecture.
2. **Contributors & Collaborators:** If you find the project worthwhile, I am actively looking for people to team up with! Whether it's adding new LLM providers, fixing UI quirks, or improving the 1-step installer, PRs are incredibly welcome.

**Repo:** [https://github.com/naveenraj-17/synapse-ai](https://github.com/naveenraj-17/synapse-ai)

If you bump into any bugs, please drop an issue so I can patch it. Would love to hear your thoughts!

## Comments

- **ikeo1** (1↑): i'm building something similar.. it looks like a very powerful tool and I'll be giving it a try later. Congrats on building this system. It looks promising
  - **WabbaLubba-DubDub** (1↑): Thanks, please give it a try and send me the feedback... I'm constantly looking forward to people in the field to try and give their feedback..  whether it's helpful for them... 

And I'll suggest to use api keys instead of CLIs.. since CLIs are constantly throwing 429 error out of nowhere. For smaller agents use CLIs.. 

I'm also writing a document and building a Native agent to build agents and orchestrations.. since many people are struggling to understand the flow ... Would love your feedback if possible collaboration too...
- **freedomachiever** (1↑): Interesting project. How would Claude Code create proper pipelines though? I don't see skills
  - **WabbaLubba-DubDub** (1↑): This doesn't use claude code at all... This uses their APIs.. you can use any models or providers in a single orchestration. Each agent has its own system prompt that's where we set the pipelines... But prompt pipelines are not as strict as orchestration... If the pipeline gets complicated you should split them into multiple agents with system prompts and bring them all together in an orchestration.. I have given some examples and UI in the readme of the repo .. please check it ..
- **Joozio** (1↑): DAG-based orchestration is the right mental model for complex agent workflows. Explicit dependency graphs beat implicit state machines. The pattern here - declaring task dependencies upfront, letting the executor parallelize what can be parallel - is production-grade thinking. We wrote about scaling this to enterprise complexity. [https://thoughts.jock.pl/p/ai-coding-harness-agents-2026](https://thoughts.jock.pl/p/ai-coding-harness-agents-2026)
