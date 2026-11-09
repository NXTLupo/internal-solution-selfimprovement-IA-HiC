---
id: social-intelligence/reddit-deep/claudeai/1whf7nb.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1whf7nb/i_built_an_ai_writing_assistant_that_learns_to/"
kind: "social-post"
source: "reddit-deep: r/claudeai"
subreddit: "claudeai"
title: "I built an AI writing assistant that learns to write like you."
author: "imYouOfficial"
date: "2026-09-15T22:36:41.000Z"
score: 0
upvote_ratio: 0.2
num_comments: 12
flair: "Built with Claude"
extracted_at: "2026-11-08T23:43:07.703Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/claudeai/1whf7nb.md#c0"
    char_span: [0, 1372]
    sentence_count: 14
    key_terms: [like, profile, writing, write, claudeai, comments, emails, built]
    concepts: [profile, writing, write, claudeai, comments]
    token_count: 312
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1whf7nb/i_built_an_ai_writing_assistant_that_learns_to/","kind":"social-post","date":"2026-09-15","author":"imYouOfficial","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1whf7nb.md#c1"
    char_span: [1386, 2825]
    sentence_count: 13
    key_terms: [like, claude, already, chatgpt, walterwrites, write, sure, accurately]
    concepts: [claude, already, chatgpt, walterwrites, accurately]
    section: Comments
    token_count: 375
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1whf7nb/i_built_an_ai_writing_assistant_that_learns_to/","kind":"social-post","date":"2026-09-15","author":"imYouOfficial","subreddit":"claudeai"}]
---
# I built an AI writing assistant that learns to write like you.

Source: [reddit-deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1whf7nb/i_built_an_ai_writing_assistant_that_learns_to/)
Posted by **imYouOfficial** · **0↑** · **12 comments**

My work emails kept coming out sounding like a robot wrote them. Every AI tool I tried gave me the same polished corporate nothing that read like a press release instead of a guy asking his coworker for a favor.

So I built imYou. It interviews you for a few minutes to learn how you actually write and then uses that on everything it drafts for you. Emails, social media posts, and more. It also has a chat function where you can message yourself and talk through whatever is on your mind, and it keeps learning about you while you do.

Privacy was one of my biggest concerns because the app gets to know you personally. Your profile stays on your device. We never store your profile or your writing on our servers, so there is no database of it on our end to sell later. The only data collected is what is necessary to maintain your account.

It is free to start. You get a profile build and five or six pieces of writing to see if it actually sounds like you. That is the part I most want feedback on, so if you try it, tell me straight whether it captured how you write or missed it completely.

https://imyou.ai

## Comments

- **Great_Yoghurt_6756** (2↑): I’m not saying it’s a bad idea man, I’m sure it could really help a lot of people. But I don’t think you acknowledge its limitations and you’re overly defensive.
- **opi098514** (1↑): Why would I use this when I can just tell whatever ai I’m already using. To just write like me. Like you are posting this in Claude ai where everyone uses Claude and can do exactly what this does.
  - **imYouOfficial** (-2↑): Do you prompt AI like you are writing an email or text? I sure dont. 

Do you know how to train an AI to accurately write like you and avoid AI detection? Not everyone does. Just telling claude "write like me" is not going to accurately reflect your writing habits.
    - **Great_Yoghurt_6756** (2↑): If it’s got access to your emails / other communication channels it can tho
    - **opi098514** (1↑): Ctrl-c then ctrl-v. I could also litterally just prompt Claude to read my emails. Same with chatgpt.
- **HeartOfThePiano** (1↑): Is this the same one I already saw posted several days ago?! I'm not sure why there was a need to post it again?
- **Puzzleheaded-Wait785** (1↑): LLM-wrapper apps are so 2023.
- **Leading-Crazy6104** (1↑): That's a great idea but I am already doing something like this using Chatgpt, Claude and Walterwrites. I generate the first draft with Claude or ChatGPT and run it through Walterwrites and it makes the whole thing sound like a human. Then I add my touch to it.
