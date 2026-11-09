---
id: social-intelligence/reddit-deep/careerguidance/1rjniup.md
url: "https://www.reddit.com/r/careerguidance/comments/1rjniup/i_am_a_student_and_i_built_a_gap_analysis_logic/"
kind: "social-post"
source: "reddit-deep: r/careerguidance"
subreddit: "careerguidance"
title: "​i am a student and i built a \"gap analysis\" logic for prompts that helped land 5 interviews—do you think recruiters can spot this style yet?"
author: "ExtraAfternoon6585"
date: "2026-03-03T12:02:21.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 5
flair: "Advice"
extracted_at: "2026-11-09T00:15:58.492Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/careerguidance/1rjniup.md#c0"
    char_span: [0, 1208]
    sentence_count: 2
    key_terms: [careerguidance, resume, gap, interviews, recruiters, comments, helped, skills]
    concepts: [careerguidance, resume, interviews, recruiters, comments]
    token_count: 293
    sources: [{"n":"reddit-deep: r/careerguidance","u":"https://www.reddit.com/r/careerguidance/comments/1rjniup/i_am_a_student_and_i_built_a_gap_analysis_logic/","kind":"social-post","date":"2026-03-03","author":"ExtraAfternoon6585","subreddit":"careerguidance"}]
  - id: "social-intelligence/reddit-deep/careerguidance/1rjniup.md#c1"
    char_span: [1222, 1815]
    sentence_count: 1
    key_terms: [ghosting, bullets, getting, method, right, extraafternoon6585, gap, confident]
    concepts: [ghosting, bullets, getting, method, right]
    section: Comments
    token_count: 144
    sources: [{"n":"reddit-deep: r/careerguidance","u":"https://www.reddit.com/r/careerguidance/comments/1rjniup/i_am_a_student_and_i_built_a_gap_analysis_logic/","kind":"social-post","date":"2026-03-03","author":"ExtraAfternoon6585","subreddit":"careerguidance"}]
---
# ​i am a student and i built a "gap analysis" logic for prompts that helped land 5 interviews—do you think recruiters can spot this style yet?

Source: [reddit-deep: r/careerguidance](https://www.reddit.com/r/careerguidance/comments/1rjniup/i_am_a_student_and_i_built_a_gap_analysis_logic/)
Posted by **ExtraAfternoon6585** · **1↑** · **5 comments**

i’ve been trying to figure out why so many people (including me) were getting ghosted after using ai to tailor resumes.

​i realized most ai just 'yaps' and hallucinates skills. so i developed a 'logic-first' approach that forces the ai to find business pain points and resume gaps before it ever starts writing. it actually helped land 5 interviews recently.

​here is the basic 'gap' prompt i've been using:

​compare my resume to this jd.

find the 5 most important skills they want and tell me if my resume has proof for them or just a gap. dont rewrite yet, just show me the truth table.

​i’ve built a larger system around this logic. i don't want to break the no-ad rules, so i'm not posting links, but i'd love to hear if others have found success with this 'truth table' method or if you think recruiters are starting to catch on to this style too

## Comments

- **my_peen_is_clean** (1↑): that gap method is smart, i do similar and it actually exposed how weak my bullets were. but still tons of ghosting because hiring right now is just rough and getting replies is way harder
  - **ExtraAfternoon6585** (1↑): totally agree, the ghosting right now is on another level. i found that even with the gap method, it’s still a numbers game, but at least i feel more confident that my bullets aren't the reason i'm getting skipped. it’s less about 'tricking' the system and more about just making sure i’m not wasting my own time on roles i’m 0% qualified for
