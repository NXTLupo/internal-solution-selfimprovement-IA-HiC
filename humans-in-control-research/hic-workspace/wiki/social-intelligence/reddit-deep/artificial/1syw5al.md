---
id: social-intelligence/reddit-deep/artificial/1syw5al.md
url: "https://www.reddit.com/r/artificial/comments/1syw5al/87_cost_savings_sub3s_latency_i_built_a_warmcache/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "87% Cost Savings & Sub-3s Latency: I built a \"Warm-Cache\" harness for persistent Claude agents."
author: "Phobix"
date: "2026-04-29T11:33:35.000Z"
score: 9
upvote_ratio: 1
num_comments: 9
flair: "Project"
extracted_at: "2026-11-09T00:16:43.964Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1syw5al.md#c0"
    char_span: [0, 1844]
    sentence_count: 8
    key_terms: [claude, https, com, galadriel-public, github, agent, artificial, galadriel]
    concepts: [claude, galadriel-public, https, github, agent]
    token_count: 481
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1syw5al/87_cost_savings_sub3s_latency_i_built_a_warmcache/","kind":"social-post","date":"2026-04-29","author":"Phobix","subreddit":"artificial"}]
  - id: "social-intelligence/reddit-deep/artificial/1syw5al.md#c1"
    char_span: [1858, 3142]
    sentence_count: 8
    key_terms: ["you're", looselyhuman, caching, context, claude, launch, people, prompt]
    concepts: [looselyhuman, "you're", caching, context, claude]
    section: Comments
    token_count: 309
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1syw5al/87_cost_savings_sub3s_latency_i_built_a_warmcache/","kind":"social-post","date":"2026-04-29","author":"Phobix","subreddit":"artificial"}]
---
# 87% Cost Savings & Sub-3s Latency: I built a "Warm-Cache" harness for persistent Claude agents.

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1syw5al/87_cost_savings_sub3s_latency_i_built_a_warmcache/)
Posted by **Phobix** · **9↑** · **9 comments**

# The "Goldfish Problem" is Expensive. I Decided to Fix the Plumbing.

Most Claude implementations leave 90% of their money on the table because they don’t optimize for **Prompt Caching**. I’ve been running a personal agent in my Discord for months that manages my AWS infra and codebases, and I finally open-sourced the harness, which I’ve named **Galadriel** after my main personal assistant.

# The Stats

* **Cost:** $10 for every $100 you’d normally spend (Tested against OpenClaw/Cursor workflows).
* **Speed:** 85% drop in latency. 100K token context goes from 11s to <3s.
* **Memory:** Integrated **MemPalace** for permanent, vector-based recall that *doesn't* break the cache.

# The Technical Stack

* **3-Tier Stacked Caching:** Separate breakpoints for Tool Definitions, System Prompts (`CLAUDE.md`), and Trailing History.
* **Privacy:** Built for private subnets. No middleman, no message caps—just your API key and your rules.
* **Ethics:** Baked-in Karpathy[`CLAUDE.md`](https://www.google.com/search?q=%5Bhttp://CLAUDE.md%5D(http://CLAUDE.md))guidelines to kill "agent bloat."

If you’re tired of paying the **"Context Tax"** just to have an agent that remembers who you are, here you go. It is customized for Discord for my specific needs, but the core logic ensures Galadriel runs like an absolute dream: she never forgets, maintains strict engineering principles, and optimizes every cycle.

Your feedback is most welcome!

**GitHub (MIT License):**[https://github.com/avasol/galadriel-public](https://github.com/avasol/galadriel-public)

## Comments

- **looselyhuman** (5↑): Man, looks amazing -- if you can afford full API prices. I get that you're saving a lot with optimized prompt caching, etc, but still. A non-harness version that works as an MCP in Claude Code would be great for us poors.
  - **Phobix** (2↑): Not a bad idea but structurally, you could pull the repo and for just a few cycles ask Claude Code to make it into an MCP server, and I'm sure  people would love that branch for all the right reasons.
    - **looselyhuman** (3↑): "Build it yourself" is fair, but you asked for feedback :)
- **Bootes-sphere** (2↑): Prompt caching is genuinely underrated. Most people think it's just a nice-to-have, but you're right. That sub-3s latency is the real win though; cache hits on Claude's 200K context window should theoretically give you near-instant responses for repeated queries, which is huge for agents doing repetitive tasks.  
The infrastructure piece here sounds solid. How are you handling cache invalidation when context needs to refresh?
- **ultrathink-art** (0↑): Nice benchmark. For the launch side — when you're ready to ship this publicly, free AI tool reads your README and generates the full launch brief (HN Show title, Reddit post, positioning, blog outline) in one shot. ultrathink.art/vibe-marketing
