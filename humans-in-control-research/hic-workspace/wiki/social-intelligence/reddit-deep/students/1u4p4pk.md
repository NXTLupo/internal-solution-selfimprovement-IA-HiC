---
id: social-intelligence/reddit-deep/students/1u4p4pk.md
url: "https://www.reddit.com/r/Students/comments/1u4p4pk/im_16_and_suffer_from_severe_procrastination_so_i/"
kind: "social-post"
source: "reddit-deep: r/students"
subreddit: "students"
title: "I’m 16 and suffer from severe procrastination, so I built an AI tool that turns overwhelming school rubrics into tiny, brain-dead simple micro-steps."
author: "Funny_Performance599"
date: "2026-06-13T12:00:38.000Z"
score: 2
upvote_ratio: 1
num_comments: 3
flair: ""
extracted_at: "2026-11-08T23:44:21.458Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/students/1u4p4pk.md#c0"
    char_span: [0, 1835]
    sentence_count: 12
    key_terms: [procrastination, project, write, micro-steps, like, comments, students, syllabus]
    concepts: [procrastination, project, micro-steps, write, comments]
    token_count: 444
    sources: [{"n":"reddit-deep: r/students","u":"https://www.reddit.com/r/Students/comments/1u4p4pk/im_16_and_suffer_from_severe_procrastination_so_i/","kind":"social-post","date":"2026-06-13","author":"Funny_Performance599","subreddit":"students"}]
  - id: "social-intelligence/reddit-deep/students/1u4p4pk.md#c1"
    char_span: [1837, 2512]
    sentence_count: 5
    key_terms: [own, currently, projects, wishlist, anyone, grades, built, save]
    concepts: [currently, projects, wishlist, anyone, grades]
    token_count: 143
    sources: [{"n":"reddit-deep: r/students","u":"https://www.reddit.com/r/Students/comments/1u4p4pk/im_16_and_suffer_from_severe_procrastination_so_i/","kind":"social-post","date":"2026-06-13","author":"Funny_Performance599","subreddit":"students"}]
---
# I’m 16 and suffer from severe procrastination, so I built an AI tool that turns overwhelming school rubrics into tiny, brain-dead simple micro-steps.

Source: [reddit-deep: r/students](https://www.reddit.com/r/Students/comments/1u4p4pk/im_16_and_suffer_from_severe_procrastination_so_i/)
Posted by **Funny_Performance599** · **2↑** · **3 comments**

Hey everyone,  
Like the title says, I’m 16 and my biggest enemy is procrastination. Whenever a teacher hands me a massive, confusing project rubric or syllabus, my brain completely freezes. I look at a task like "Write 10-page History Paper" and end up staring at a blank screen or scrolling social media for hours because I don’t know what step one is.  
To fix my own brain, I spent the last few weeks building Tethr.  
It’s a productivity ecosystem, but instead of just being another boring to-do list, it focuses entirely on anti-procrastination guidance.  
How it works:

1. You drag and drop a complex project brief, syllabus, or rubric (PDF, text, Markdown, etc.).
2. Tethr's built-in AI "atomizes" the document into 10 to 20 concrete, physical micro-steps.
3. It filters these steps straight into your current Dashboard, Calendar, and Habits view based on your actual schedule.

Instead of telling you to *"Write the introduction,"* it breaks it down into things like *"Open Google Docs, title it 'History Essay', and write a 2-sentence hook about the Cold War."* It makes the first step so tiny and specific that it's genuinely hard to find an excuse to procrastinate on it.  
I also added:

* **MathJax rendering** for heavy STEM/formulas so they don't clip or look messy.
* **A "Playbook" view** that splits your screen into a reference guide on the left and your execution checklist on the right.
* **Clean PNG/PDF exports** so you can print out your project blueprints.

I attached a PNG export of a project playbook the app generated for me earlier.  
I built this primarily to save my own grades, but I realized this could genuinely help anyone else dealing with academic overwhelm, executive dysfunction, or ADHD paralysis.  
It is currently in the Wishlist phase right now. I’d love to hear what you guys think, or what features I should add next to make tackling big projects easier!

*I built this to save my own grades, and it's currently in wishlist. I don't want to break any subreddit rules by spamming links, so if anyone wants to try it out for their own school projects, just let me know in the comments and I'll send you the link!*
