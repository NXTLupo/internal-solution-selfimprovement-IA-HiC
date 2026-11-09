---
id: social-intelligence/reddit-deep/artificial/1w0bksl.md
url: "https://www.reddit.com/r/artificial/comments/1w0bksl/im_building_an_ai_assistant_powered_by_my_second/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "I’m building an ai assistant powered by my second brain and need some help"
author: "nesquik-121"
date: "2026-08-28T00:32:30.000Z"
score: 1
upvote_ratio: 0.6
num_comments: 7
flair: "Question"
extracted_at: "2026-11-08T23:47:28.706Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1w0bksl.md#c0"
    char_span: [0, 723]
    sentence_count: 5
    key_terms: [artificial, comments, powered, brain, using, help, idea, nesquik-121]
    concepts: [artificial, comments, powered, brain, using]
    token_count: 181
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1w0bksl/im_building_an_ai_assistant_powered_by_my_second/","kind":"social-post","date":"2026-08-28","author":"nesquik-121","subreddit":"artificial"}]
  - id: "social-intelligence/reddit-deep/artificial/1w0bksl.md#c1"
    char_span: [737, 1783]
    sentence_count: 9
    key_terms: [che, con, qwen, eldrugo85, indexing, blocchi, folders, ollama]
    concepts: [eldrugo85, indexing, blocchi, folders, ollama]
    section: Comments
    token_count: 287
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1w0bksl/im_building_an_ai_assistant_powered_by_my_second/","kind":"social-post","date":"2026-08-28","author":"nesquik-121","subreddit":"artificial"}]
---
# I’m building an ai assistant powered by my second brain and need some help

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1w0bksl/im_building_an_ai_assistant_powered_by_my_second/)
Posted by **nesquik-121** · **1↑** · **7 comments**

So I have a planned laid out, but I’m not sure if it’s strong or if there are other ways that can make it better.

I plan to run qwen 3.8 locally using olama on my new Mac mini and give it its own ui interface which I can speak through it. Its backend will also be powered by my ai brain which is sorted by using jack ven chiefs icm folder structure.

Is this idea in general a good idea? Has anyone else created anything similar and could help me out?

## Comments

- **eldrugo85** (1↑): Built something close, a personal memory engine with RAG over my own stuff. What made it real was the day it pulled one specific detail out of an old call, and that had nothing to do with the model, it was the retrieval. Ollama and qwen will phrase the answer fine, they won't rescue bad chunks. What are you indexing the folders with?
  - **nesquik-121** (1↑): Sorry indexing the folders with 😅??, I’m not sure what u mean by that by I’m using Jake ven chief icm architect folder structure.

So do you think o llama and qwen are the way to go? And what exaclty did u build?
    - **eldrugo85** (1↑): Con indicizzazione intendevo dividere le note e metterle in un database vettoriale, niente a che fare con il layout delle tue cartelle. L'assistente vede solo i blocchi che una ricerca gli consegna.

ollama + qwen 8b va bene per iniziare. Io però passerei più tempo sul recupero, in quello che ho costruito i blocchi sbagliati tornavano molto prima che il modello fosse il collo di bottiglia. Con quale vram stai lavorando?
