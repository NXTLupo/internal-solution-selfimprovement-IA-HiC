---
id: social-intelligence/reddit-deep/chatgpt/1u6f6ws.md
url: "https://www.reddit.com/r/ChatGPT/comments/1u6f6ws/llm_for_job_search_recommendation/"
kind: "social-post"
source: "reddit-deep: r/chatgpt"
subreddit: "chatgpt"
title: "LLM for job search recommendation"
author: "Ambitious_Purple235"
date: "2026-06-15T12:28:48.000Z"
score: 2
upvote_ratio: 1
num_comments: 5
flair: "Use cases "
extracted_at: "2026-11-08T23:41:42.052Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/chatgpt/1u6f6ws.md#c0"
    char_span: [0, 1688]
    sentence_count: 7
    key_terms: [claude, chatgpt, month, help, applications, setup, code, job]
    concepts: [claude, chatgpt, month, applications, setup]
    token_count: 374
    sources: [{"n":"reddit-deep: r/chatgpt","u":"https://www.reddit.com/r/ChatGPT/comments/1u6f6ws/llm_for_job_search_recommendation/","kind":"social-post","date":"2026-06-15","author":"Ambitious_Purple235","subreddit":"chatgpt"}]
  - id: "social-intelligence/reddit-deep/chatgpt/1u6f6ws.md#c1"
    char_span: [1702, 3102]
    sentence_count: 7
    key_terms: [openai, please, conversation, files, image, post, r-chatgpt-1050422060352024636, subreddit]
    concepts: [conversation, openai, please, files, image]
    section: Comments
    token_count: 338
    sources: [{"n":"reddit-deep: r/chatgpt","u":"https://www.reddit.com/r/ChatGPT/comments/1u6f6ws/llm_for_job_search_recommendation/","kind":"social-post","date":"2026-06-15","author":"Ambitious_Purple235","subreddit":"chatgpt"}]
---
# LLM for job search recommendation

Source: [reddit-deep: r/chatgpt](https://www.reddit.com/r/ChatGPT/comments/1u6f6ws/llm_for_job_search_recommendation/)
Posted by **Ambitious_Purple235** · **2↑** · **5 comments**

I'm trying to build a setup to help with job applications and would love to hear from anyone who has done something similar.

I have a large collection of md files containing campaign summaries, reports, strategy documents, project retrospectives, performance notes, etc. Ideally, I'd like an AI setup that can analyze this body of work and act as a career assistant.

Some example tasks:

* Identify the most relevant projects/campaigns for a given job description
* Extract measurable achievements and business outcomes
* Help tailor resumes and cover letters
* Suggest which experience to highlight for different roles
* Help improve my LinkedIn profile
* Research companies and help prepare applications

I'm considering a few options:

* ChatGPT Plus ($20/month)
* Claude Pro ($20/month, mainly for Claude Code/Cowork)
* ChatGPT Plus + Claude Pro ($40/month total)
* Claude Max ($100/month)

My intuition is that a file-centric, agentic setup (Claude Code/Cowork or similar) might be better than a standard chat interface because most of the value comes from understanding my existing documents and work history.

Has anyone built a workflow like this? If so:

* What tools are you using?
* How are you organizing your files/knowledge base?
* Are you using Claude Code, ChatGPT Projects, Cursor, Obsidian, RAG, or something else?
* Did you find the $20 tiers sufficient, or did you need higher limits?

Would appreciate any real-world experiences or recommendations.

## Comments

- **AutoModerator** (1↑): Hey /u/Ambitious_Purple235,

If your post is a screenshot of a ChatGPT conversation, please reply to this message with the [conversation link](https://help.openai.com/en/articles/7925741-chatgpt-shared-links-faq) or prompt.

If your post is a DALL-E 3 image post, please reply with the prompt used to make this image.

Consider joining our [public discord server](https://discord.gg/r-chatgpt-1050422060352024636)! We have free bots with GPT-4 (with vision), image generators, and more!

 &#x1F916;

Note: For any ChatGPT-related concerns, email support@openai.com - this subreddit is not part of OpenAI and is not a support channel.


*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/ChatGPT) if you have any questions or concerns.*
- **UmarSE** (2↑): If your source of truth is already a folder of markdown files, I'd lean toward a local RAG setup before paying for higher-tier plans. The biggest improvement usually comes from good retrieval and document organization, not a smarter model. I've had better results indexing project docs with metadata (role, impact, tech stack, outcomes) and then letting the LLM focus on synthesis rather than searching through raw files every time.
  - **Ambitious_Purple235** (2↑): thank you, that's very helpful, will get on with organizing files then!
