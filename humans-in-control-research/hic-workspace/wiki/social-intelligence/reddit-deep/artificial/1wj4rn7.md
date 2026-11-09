---
id: social-intelligence/reddit-deep/artificial/1wj4rn7.md
url: "https://www.reddit.com/r/artificial/comments/1wj4rn7/what_would_you_actually_want_an_ai/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "What would you actually want an AI personal-development assistant to know about you?"
author: "Lonewolf-199"
date: "2026-09-17T20:06:20.000Z"
score: 0
upvote_ratio: 0.33
num_comments: 11
flair: "Project"
extracted_at: "2026-11-09T00:16:43.957Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1wj4rn7.md#c0"
    char_span: [0, 841]
    sentence_count: 6
    key_terms: [assistant, artificial, comments, context, instead, journal, personal-development, been]
    concepts: [assistant, artificial, comments, context, instead]
    token_count: 176
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1wj4rn7/what_would_you_actually_want_an_ai/","kind":"social-post","date":"2026-09-17","author":"Lonewolf-199","subreddit":"artificial"}]
  - id: "social-intelligence/reddit-deep/artificial/1wj4rn7.md#c1"
    char_span: [855, 2546]
    sentence_count: 6
    key_terms: [lonewolf-199, idea, locally, people, own, something, personal, program]
    concepts: [lonewolf-199, locally, people, something, personal]
    section: Comments
    token_count: 408
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1wj4rn7/what_would_you_actually_want_an_ai/","kind":"social-post","date":"2026-09-17","author":"Lonewolf-199","subreddit":"artificial"}]
---
# What would you actually want an AI personal-development assistant to know about you?

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1wj4rn7/what_would_you_actually_want_an_ai/)
Posted by **Lonewolf-199** · **0↑** · **11 comments**

I've been experimenting with this idea while building an app called **Depsal**.

Instead of having an AI conversation completely disconnected from your life, the assistant can use things like your habits and recent journal entries as context.

For example, if you've been struggling with a habit or writing about something repeatedly in your journal, the assistant can have some context instead of starting from zero every time.

I'm curious where people think the line should be.

What information would actually make an AI assistant more useful for personal development?

## Comments

- **Dapper_Ambition5963** (1↑): As a heads up - I'm still new to my deep dive into AI capabilities but from what I've seen so far, most people that would feel comfortable with an AI knowing sensitive and intimate knowledge of them are building their own locally run AI agents for this.

Not to rain on your app idea, but you may want to look at r/localLLM and make something just for you 

Edit: corrected subreddit
  - **Lonewolf-199** (1↑): is interesting but well many people just use chat gpt as phsycologist so maybe it just work with people like them but is a good idea to use it locally too
- **Dragonbonded** (1↑): I think the line is based on the individual, not general.

So maybe a list of topics with a slider as the controls, so if something gets talked about that falls outside of those limits, a reminder, and the data doesnt get stored?

But yeah. Local hosting is going to be the prefered option,

HOWEVER, if you manage to make a program that is self-contained (download a model, and the program runs it using the host machines own specs, offline), you'd have a better option than whats currently out there (which requires lots of setup and assumes the user knows what their machine can reliably support)
  - **Lonewolf-199** (1↑): I'll take this into account
- **Dizzy_Swimmer_4999** (1↑): ai companions remember your quirks from every chat so this should pull from journals the same way or it wont feel personal at all
  - **Lonewolf-199** (1↑): yeah thats the idea
- **ZealousGoblin** (1↑): I like the idea if I can run it locally on my own hardware.  If everything is running through OpenAI or Anthropic or whoever, then I'm sharing my personal life with a corporation.
