---
id: social-intelligence/reddit-deep/productivity/1xco8ha.md
url: "https://www.reddit.com/r/productivity/comments/1xco8ha/got_tired_of_typing_in_the_same_questions_into/"
kind: "social-post"
source: "reddit-deep: r/productivity"
subreddit: "productivity"
title: "Got tired of typing in the same questions into Claude, made templates for getting personal news"
author: "Magnu_s"
date: "2026-10-22T17:01:20.000Z"
score: 0
upvote_ratio: 0.22
num_comments: 4
flair: "General Advice"
extracted_at: "2026-11-09T00:14:00.526Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/productivity/1xco8ha.md#c0"
    char_span: [0, 1501]
    sentence_count: 13
    key_terms: [questions, does, answers, claude, productivity, money, comments, personal]
    concepts: [questions, answers, productivity, claude, money]
    token_count: 346
    sources: [{"n":"reddit-deep: r/productivity","u":"https://www.reddit.com/r/productivity/comments/1xco8ha/got_tired_of_typing_in_the_same_questions_into/","kind":"social-post","date":"2026-10-22","author":"Magnu_s","subreddit":"productivity"}]
  - id: "social-intelligence/reddit-deep/productivity/1xco8ha.md#c1"
    char_span: [1515, 2227]
    sentence_count: 5
    key_terms: [inventory, use, book, summarize, chapter, cause, iwantboringtimes, information]
    concepts: [inventory, summarize, chapter, cause]
    section: Comments
    token_count: 191
    sources: [{"n":"reddit-deep: r/productivity","u":"https://www.reddit.com/r/productivity/comments/1xco8ha/got_tired_of_typing_in_the_same_questions_into/","kind":"social-post","date":"2026-10-22","author":"Magnu_s","subreddit":"productivity"}]
---
# Got tired of typing in the same questions into Claude, made templates for getting personal news

Source: [reddit-deep: r/productivity](https://www.reddit.com/r/productivity/comments/1xco8ha/got_tired_of_typing_in_the_same_questions_into/)
Posted by **Magnu_s** · **0↑** · **4 comments**

My routine for anything worth reading (news, reports, industry stuff) was: paste it into Claude, then type the same questions every time.

*“What does this mean for me?”*  
*“Does this affect my job or my money?”*  
*“What should I actually do?”*

Every article, every day, retyped from memory, and worded slightly differently each time, so the answers weren’t consistent.

What fixed it: **I wrote the questions down once and stopped improvising.**

My first versions were:

**Personal:** How does this affect my money or work? What should I do next?

**Both sides:** What’s the strongest case for? Against? What would prove each wrong?

**Hype check:** What does this really mean? What’s overhyped? What should I do?  


Add your context once. Write a few lines about your job, your money and the decisions you’re facing, and keep them with the questions. Without them the answers are too generic.

Always use the same set for the same kind of reading. The answers become comparable, and you notice when something actually changes.

Eventually I built an mcp server to edit and access the questions sets for Claude to be part of other workflows also like my inbox. 

 **Which questions do you keep retyping?**

## Comments

- **iwantboringtimes** (1↑): none, cause I don't use AI (yet).

I was very tempted to use AI-powered INVENTORY app, but I figured out non-AI system that's working pretty ok for me.

edit cause I forgot INVENTORY
  - **Magnu_s** (1↑): Which method do you use then? Which inventory?
- **Proof_Finding_8278** (1↑): I use a steam deck to open a text file that has "summarize this into a few sentences. include most important highlight, secrets, and other major parts of information. If it's a book, summarize each chapter as such: " and I'll paste the url/book title on the end, copy all, close without saving, and put it into Gemini.
  - **Magnu_s** (1↑): Good tip the book part. How long are the chapter summeries?
