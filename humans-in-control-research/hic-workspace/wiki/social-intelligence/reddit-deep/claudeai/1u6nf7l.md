---
id: social-intelligence/reddit-deep/claudeai/1u6nf7l.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1u6nf7l/drafting_research_articles/"
kind: "social-post"
source: "reddit-deep: r/claudeai"
subreddit: "claudeai"
title: "Drafting research articles"
author: "ThinkTie30"
date: "2026-06-15T17:35:35.000Z"
score: 1
upvote_ratio: 1
num_comments: 13
flair: "Claude Workflow"
extracted_at: "2026-11-08T23:27:11.371Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/claudeai/1u6nf7l.md#c0"
    char_span: [0, 437]
    sentence_count: 3
    key_terms: [claudeai, comments, claude, best, use, thesis-driven, reddit-deep, thinktie30]
    concepts: [claudeai, comments, claude]
    token_count: 118
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1u6nf7l/drafting_research_articles/","kind":"social-post","date":"2026-06-15","author":"ThinkTie30","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1u6nf7l.md#c1"
    char_span: [451, 2754]
    sentence_count: 25
    key_terms: [claude, section, references, paper, paragraph, academic, disagree, feedback]
    concepts: [claude, section, references, paragraph, paper]
    section: Comments
    token_count: 491
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1u6nf7l/drafting_research_articles/","kind":"social-post","date":"2026-06-15","author":"ThinkTie30","subreddit":"claudeai"}]
---
# Drafting research articles

Source: [reddit-deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1u6nf7l/drafting_research_articles/)
Posted by **ThinkTie30** · **1↑** · **13 comments**

Thoughts about the best way (if at all) to use Claude to help draft a thesis-driven 30+ page piece of writing? I have most of the sources, outline and structure of argument. How would you say the best way to use Claude is in this situation?

## Comments

- **cdjcon** (4↑): Give it what you have and tell it what you want.
  - **Chicken_Savings** (1↑): Exactly. It is surprisingly good at this.

Tell it whether you want the language to be a practitioners guide or an academic piece. The academic piece will water down all your statements and ideas into defensible language. Practitioners language is stronger, usually more useful and practical, but easier to poke holes in and argue against.

Feed it all the source material, say that you want a .md file in the sidebar. Explain your ideas, the audience, the purpose of the article (position yourself as a thought leader, write a practical use guide for your colleagues, an academic paper etc). State your preferred length in terms of words.

Read the output, add any new ideas that you got from first draft. If you disagree with something, explain why you disagree.

Opus will usually give better text than Sonnet, it will think deeper and extract more findings and points from your source material.

When done, copy paste the whole article into ChatGPT and ask for a critical review.

Copy paste the ChatGPT feedback back into Claude, but delete any feedback that you disagree with. Ask Claude to consider the feedback and update the article.
    - **blagadaryu** (1↑): The issue with Claude, at least in my experience, is that it only accepts around 5 PDF's in a chat before it prompts you to start a new chat. This means you could hypothetically write a research paper, but you'd have to do it section by section through different chats.
- **denimmaestro** (3↑): You need to build a scaffold. First, confirm your idea and research questions. Assuming your data analysis is already done, have it build a loose outline of the whole paper section by section. Then, next round, tighten the outline. Then drop all your references into Claude. You could do a zip file if they are PDFs, or connect directly to Zotero. It will then find the best placements for the references in your outline. Then go paragraph by paragraph, drafting together with Claude. You should read each paragraph and confirm the references and make adjustments. This process is slower but produces a higher quality result rather than dropping everything in at once and asking it to write you a paper. It needs to be an iterative process.
