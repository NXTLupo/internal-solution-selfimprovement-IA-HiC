---
id: social-intelligence/reddit-deep/productivity/1vr1nvc.md
url: "https://www.reddit.com/r/productivity/comments/1vr1nvc/how_do_you_store_dreams_goals_and_to_dos_in_a_way/"
kind: "social-post"
source: "reddit-deep: r/productivity"
subreddit: "productivity"
title: "How do you store dreams, goals, and to dos in a way that plays nice with AI automation?"
author: "tigertan"
date: "2026-08-17T19:08:34.000Z"
score: 6
upvote_ratio: 1
num_comments: 10
flair: "Question"
extracted_at: "2026-11-08T23:26:43.664Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/productivity/1vr1nvc.md#c0"
    char_span: [0, 1454]
    sentence_count: 13
    key_terms: [automation, dos, dreams, productivity, lists, notes, new, summaries]
    concepts: [automation, productivity, dreams, lists, notes]
    token_count: 355
    sources: [{"n":"reddit-deep: r/productivity","u":"https://www.reddit.com/r/productivity/comments/1vr1nvc/how_do_you_store_dreams_goals_and_to_dos_in_a_way/","kind":"social-post","date":"2026-08-17","author":"tigertan","subreddit":"productivity"}]
  - id: "social-intelligence/reddit-deep/productivity/1vr1nvc.md#c1"
    char_span: [1468, 2641]
    sentence_count: 7
    key_terms: [claude, obsidianmd, like, want, inference, obsidian, connect, onenote]
    concepts: [claude, obsidianmd, inference, obsidian, connect]
    section: Comments
    token_count: 285
    sources: [{"n":"reddit-deep: r/productivity","u":"https://www.reddit.com/r/productivity/comments/1vr1nvc/how_do_you_store_dreams_goals_and_to_dos_in_a_way/","kind":"social-post","date":"2026-08-17","author":"tigertan","subreddit":"productivity"}]
---
# How do you store dreams, goals, and to dos in a way that plays nice with AI automation?

Source: [reddit-deep: r/productivity](https://www.reddit.com/r/productivity/comments/1vr1nvc/how_do_you_store_dreams_goals_and_to_dos_in_a_way/)
Posted by **tigertan** · **6↑** · **10 comments**

I've used OneNote for years to dump everything: dreams, aspirations, shopping lists, to dos, birthday lists, habit tracking. It works fine as a junk drawer, but it's a dead end for automation.

I want to start layering automations on top of my notes: weekly summaries of new to dos, recaps of what I actually worked on, overviews of new notes and ideas, using Claude's scheduled tasks. Basically something that talks to an AI assistant the way Notion increasingly does, instead of sitting in its own silo.

A few questions for this sub:

1. What do you use instead of OneNote, and does it play well with Claude, an API, or automation tools like Zapier or Make?
2. Where do you keep the "soft" stuff, dreams, long term goals, New Year's resolutions? Same tool as your to dos and shopping lists, or split across apps?
3. If you've actually wired up Claude (or another AI) to your notes for weekly reviews or todo summaries, what did that setup look like? Lessons learned, good or bad, would help a lot.

I'd rather keep this free, but I'm open to paying if a tool is genuinely worth it. Notion, Obsidian, and Craft are on my radar so far; curious what else people rate.

## Comments

- **efehyun** (1↑): I use ObsidianMD and it's the best for me. I didn't like using OneNote yet the interface is rather simple but ObsidianMD has a screen that you can see your notes in like a planetary thing and see how your connected to each other. I haven't used AI agents with it because I don't like sharing my notes with an AI Agent but it has plugins that can use MCP's to connect Claude or other agents. If you search a little more on the web you could find more on ObsidianMD and how to connect it to make it automated.
  - **cognitiveStack** (1↑): Second this. Obsidian + Claude. Basic tree/holder structure for your MD docs - that can replace your OneNote and becomes your second brain. 

If you want it to run anything automatically like "Check in On my long term goals progress" set up a task in claude co-work, keep a specific md doc in obsidian that has the checklist of want you want to go through in the session (just one example).
- **Cursed_Creative** (1↑): 1) have claude make db repository and migrate everything to it. 2) have claude create CODE that will produce DETERMINISTIC input for INFERENCE. 3) feed claude code/API output for inference/udpates.
