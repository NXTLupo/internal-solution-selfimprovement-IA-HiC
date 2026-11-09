---
id: social-intelligence/reddit-deep/productivity/1rma0a9.md
url: "https://www.reddit.com/r/productivity/comments/1rma0a9/3_months_of_trying_to_make_ai_actually_useful_in/"
kind: "social-post"
source: "reddit-deep: r/productivity"
subreddit: "productivity"
title: "3 months of trying to make AI actually useful in my daily workflow — what finally stuck"
author: "justserg"
date: "2026-03-06T10:02:34.000Z"
score: 0
upvote_ratio: 0.4
num_comments: 8
flair: "Technique"
extracted_at: "2026-11-09T00:14:00.520Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/productivity/1rma0a9.md#c0"
    char_span: [0, 2215]
    sentence_count: 27
    key_terms: [context, problem, productivity, background, anything, comments, relevant, workflow]
    concepts: [context, problem, productivity, background, anything]
    token_count: 487
    sources: [{"n":"reddit-deep: r/productivity","u":"https://www.reddit.com/r/productivity/comments/1rma0a9/3_months_of_trying_to_make_ai_actually_useful_in/","kind":"social-post","date":"2026-03-06","author":"justserg","subreddit":"productivity"}]
  - id: "social-intelligence/reddit-deep/productivity/1rma0a9.md#c1"
    char_span: [2229, 3546]
    sentence_count: 7
    key_terms: [context, claude, code, "you're", current, having, solves, unlock]
    concepts: [context, claude, "you're", current, having]
    section: Comments
    token_count: 294
    sources: [{"n":"reddit-deep: r/productivity","u":"https://www.reddit.com/r/productivity/comments/1rma0a9/3_months_of_trying_to_make_ai_actually_useful_in/","kind":"social-post","date":"2026-03-06","author":"justserg","subreddit":"productivity"}]
---
# 3 months of trying to make AI actually useful in my daily workflow — what finally stuck

Source: [reddit-deep: r/productivity](https://www.reddit.com/r/productivity/comments/1rma0a9/3_months_of_trying_to_make_ai_actually_useful_in/)
Posted by **justserg** · **0↑** · **8 comments**

For the first two months I used AI the same way most people do: open tab, ask question, get answer, close tab. It felt productive. It wasn't.

The problem is that every session starts at zero. You re-explain your context, your constraints, your preferences. The AI gives you a decent answer for a generic version of your problem, not your actual problem. And you end up doing a lot of manual work to translate "generic good advice" into "what I should actually do today."

Around week 9 I switched approaches. Instead of querying, I started building context files. A plain text file per project with the relevant background, my current thinking, what I've already ruled out. Before asking anything, I paste the relevant section in. The AI's answers got immediately sharper. Less translating, more using.

The second shift was about recurring tasks. I had a bunch of things I did weekly that involved reading, summarizing, and making small decisions. Research roundups, reviewing notes, drafting updates. I stopped doing these reactively and started running them as scripted routines with preset context. Set it up once, run it the same way each week. The output is consistent enough to be useful without being babied.

What actually surprised me: the biggest win wasn't speed. It was cognitive load. I stopped holding a bunch of half-formed context in my head because it lived in a file. That freed up something. Fewer dropped balls, less of that background hum of "I should follow up on X."

What didn't work: trying to use AI for anything that required knowing me well without having first written down what "knowing me" means. It kept giving me advice for a median person. Took me longer than it should have to realize the fix was just... write the context down.

Still iterating on it. But the shift from "AI as a search engine" to "AI as a system that runs on context I've built" is the one that actually changed my workflow.

## Comments

- **thewibdc** (2↑): Just having a Claude account solves this.  It integrates across all my chats current and past.   I pay for the lowest tier so I can have Claude Code
  - **justserg** (1↑): Yeah, Claude Code changes things. Having it right there in the IDE plus the chat history staying intact means your context doesn't reset between sessions. I've found the real unlock is piping actual project state into the context—recent code diffs, error logs, current test failures. Once Claude's seeing what you're actually dealing with (not just you explaining it), the answers get way sharper and more specific.
- **conglies** (1↑): How did you set up the recurring task help? Sounds like Claude but would love some detail as I’m doing a similar thing now
- **Emergency_Finger1191** (1↑): context files are great but i think there's a ceiling when you're manually maintaining them. the real unlock is tools that build and retain that context automatically so you're not doing the meta-work yourself. for code stuff specifically, Zencoder's supposed to handle that multi-repo context indexing natively.

eliminates the re-explain everyting problem you mentioned without the overhead.
- **AlthoughFishtail** (-1↑): These were known limitations for a while, but Claude Cowork solves them straight out of the box these days.
