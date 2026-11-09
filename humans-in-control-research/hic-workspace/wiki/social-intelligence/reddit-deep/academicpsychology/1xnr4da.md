---
id: social-intelligence/reddit-deep/academicpsychology/1xnr4da.md
url: "https://www.reddit.com/r/AcademicPsychology/comments/1xnr4da/recommendation_for_any_easytouse_tools_for/"
kind: "social-post"
source: "reddit-deep: r/academicpsychology"
subreddit: "academicpsychology"
title: "Recommendation for  any easy-to-use tools for Psychophysical experiments ( auditory) ?"
author: "VesperLux_"
date: "2026-11-04T15:29:25.000Z"
score: 3
upvote_ratio: 1
num_comments: 5
flair: "Question"
extracted_at: "2026-11-08T23:07:40.255Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/academicpsychology/1xnr4da.md#c0"
    char_span: [0, 748]
    sentence_count: 3
    key_terms: [academicpsychology, auditory, build, influence, comments, scale, discrimination, psychophysical]
    concepts: [academicpsychology, auditory, build, influence, comments]
    token_count: 172
    sources: [{"n":"reddit-deep: r/academicpsychology","u":"https://www.reddit.com/r/AcademicPsychology/comments/1xnr4da/recommendation_for_any_easytouse_tools_for/","kind":"social-post","date":"2026-11-04","author":"VesperLux_","subreddit":"academicpsychology"}]
  - id: "social-intelligence/reddit-deep/academicpsychology/1xnr4da.md#c1"
    char_span: [762, 1632]
    sentence_count: 7
    key_terms: [audacity, software, stimuli, audio, tones, notthatkindadoctor, free, help]
    concepts: [audacity, software, stimuli, audio, tones]
    section: Comments
    token_count: 198
    sources: [{"n":"reddit-deep: r/academicpsychology","u":"https://www.reddit.com/r/AcademicPsychology/comments/1xnr4da/recommendation_for_any_easytouse_tools_for/","kind":"social-post","date":"2026-11-04","author":"VesperLux_","subreddit":"academicpsychology"}]
---
# Recommendation for  any easy-to-use tools for Psychophysical experiments ( auditory) ?

Source: [reddit-deep: r/academicpsychology](https://www.reddit.com/r/AcademicPsychology/comments/1xnr4da/recommendation_for_any_easytouse_tools_for/)
Posted by **VesperLux_** · **3↑** · **5 comments**

I am trying to build my experiment, which is to study the role of external influence on auditory perception (in this case pitch discrimination) and how the extent of that influence can be predicted by a certain scale.  
  
Hence, I want to build something that can easily help me build auditory stimuli (pure sine waves with ramps), randomize orders, and put a confidence scale after every trial ( that sorts of stuff)  Note: I don't have access to MATLAB.

## Comments

- **notthatkindadoctor** (3↑): Try PsyToolkit. I did an auditory+visual task that involved playing pure tones, but I don't recall the details. It likely would support everything you need. It's free and the scripting language was super easy to pick up.
- **PrivateFrank** (2↑): Audacity might help you create the tones.

Randomising the order and presenting rating scales would be done in other software like psychtoolkit
- **smacattack3** (2↑): Praat can also help with tone creation
- **BitchinAssBrains** (2↑): Audacity is a good one for the audio and PsychoPy is the best stimulus presentation software that is totally free. 

That said I might try to find audio stimuli used in similar studies already so there is some degree of evidence around the stimuli set instead of needing to pilot them first. 

Most authors should be pretty open to just sending those files.
