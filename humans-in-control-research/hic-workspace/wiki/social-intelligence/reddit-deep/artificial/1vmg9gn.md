---
id: social-intelligence/reddit-deep/artificial/1vmg9gn.md
url: "https://www.reddit.com/r/artificial/comments/1vmg9gn/i_let_ai_agents_run_daytoday_operations_for_my/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "I let AI agents run day-to-day operations for my food company. The real risk wasn't bad output, it was write access."
author: "Positive-Emu-8379"
date: "2026-08-12T14:49:04.000Z"
score: 0
upvote_ratio: 0.36
num_comments: 13
flair: "Discussion"
extracted_at: "2026-11-09T00:16:43.966Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1vmg9gn.md#c0"
    char_span: [0, 1814]
    sentence_count: 20
    key_terms: [write, anything, own, access, read, risk, nothing, agents]
    concepts: [anything, write, access, nothing, agents]
    token_count: 389
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1vmg9gn/i_let_ai_agents_run_daytoday_operations_for_my/","kind":"social-post","date":"2026-08-12","author":"Positive-Emu-8379","subreddit":"artificial"}]
  - id: "social-intelligence/reddit-deep/artificial/1vmg9gn.md#c1"
    char_span: [1828, 3542]
    sentence_count: 10
    key_terms: [model, queue, write, run, approve, control, smarter, system]
    concepts: [model, queue, write, approve, control]
    section: Comments
    token_count: 460
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1vmg9gn/i_let_ai_agents_run_daytoday_operations_for_my/","kind":"social-post","date":"2026-08-12","author":"Positive-Emu-8379","subreddit":"artificial"}]
---
# I let AI agents run day-to-day operations for my food company. The real risk wasn't bad output, it was write access.

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1vmg9gn/i_let_ai_agents_run_daytoday_operations_for_my/)
Posted by **Positive-Emu-8379** · **0↑** · **13 comments**

I spent the first month of running a small food company on AI agents (small programs that each handle one piece of the work) assuming the risk was the software getting things wrong. It wasn't. The risk was a program that could read everything and write anything.

Early on I had agents with broad database access, because it was faster to wire up that way. Nothing catastrophic happened, but I noticed I got nervous every time I handed off a new task, because I could not say for certain what the program could touch versus what it could only see.

The fix was boring. Give every new system its own database, its own tables, and put anything that leaves that sandbox behind a queue a human has to approve. Read access to the real data. Write access only to its own isolated store. Nothing goes out the door without someone flipping a switch.

Software quality was not the lesson. The programs are decent at the actual work now, better than I expected going in. What burned time was not thinking about the boundary first. Every hour I spent building read and write walls after the fact was an hour I did not spend improving the work itself.

The hype I would push back on: the idea that a smarter model fixes the risk on its own. That is not what fixed anything for me. A hard wall around anything outward facing did.

Curious if anyone else running operations on AI landed on the same read everything, write nothing outside your own sandbox rule, or found a different boundary that mattered more.

## Comments

- **Far-Maintenance-1947** (4↑): It's not X, it's Y.
- **justin107d** (2↑): \> Every hour I spent building read and write walls after the fact was an hour I did not spend improving the work itself.

Such is running a business.  Retraining a bad employee does the same thing.  This is why experience and good help is so valuable.

You can also learn from this AI lab that [told Claude and OpenAI models to run design, staff, and build a lemonade stand.](https://youtu.be/6Ide5pRLR8Y?is=UChqbSkpwUw-B2Lz)  Spoiler: they lost literal thousands on this promo video.
- **Worth_Wealth_6811** (1↑): yeah landed on the same rule, read broadly, write only to a staging table a human promotes. one thing that paid off was logging every write the agent wanted but got blocked on, that queue of denied intents turned out to be the best signal for whether it actually understood the task. agreed on the model point too, a smarter model just makes more confident wrong writes.
- **BC_MARO** (1↑): Yep. Capability-scoped writes and an approval queue beat a smarter model every time. I would also make the queue immutable so you can trace who approved each side effect.
- **Superb_Raccoon** (1↑): The old ways are the right ways... I use a Kanban card system to keep the AI's under control. 

I approve the cards, approve the board... they run it. 

It has control of the k8s "prd" system and the k3s "sandbox" and "demo" systems.
- **Minimum_Hour519** (1↑): have you tried the moshcode cli?
- **Lime-Unusual** (1↑): \>I let AI agents run  
<nice AI post
  - **thehobbler** (5↑): I'm a little peeved that I keep seeing these AI written posts with real people responding, and when I wrote out a long post I just got AI responses...
