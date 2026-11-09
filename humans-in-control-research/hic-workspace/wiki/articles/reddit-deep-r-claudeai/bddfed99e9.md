---
id: articles/reddit-deep-r-claudeai/bddfed99e9.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1sflh0y/i_turned_claude_into_a_study_assistant_that_can/"
url_hash: "bddfed99e9"
kind: "article"
source: "Reddit Deep: r/claudeai"
title: "I turned Claude into a study assistant that can answer questions about any YouTube course. Here's the setup."
author: ""
date: "2026-04-08T06:56:25.000Z"
tier: 
method: "source-native"
extracted_at: "2026-11-09T00:30:46.303439+00:00"
chars: 2141
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
collected_at: "2026-11-09T00:30:46.617Z"
relevance: 78
engagement_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations  Determine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.  Explore:  Which AI platforms students use and pay for Career-related use cases: resumes, job discovery, interview prep, networking, skills development Movement from simple prompting toward persistent assistants, agents, memory and connected tools Expectations that AI should know their context rather than start from scratch Differences by AI fluency, age, discipline and career stage  Social listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.  3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.  2. Assess the emerging“Bring Your Own AI” model  Determine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.  Specifically investigate:  Preference for a personally chosen AI vs. institution-provided assistant Evidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products Willingness to connect personal AI to trusted institutional services Expectations for interoperability, memory, portability and personalization Analogous models emerging in banking, healthcare, commerce and enterprise SaaS  This directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.  Key output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.  3. Map consumer trust, privacy and control expectations  Identify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.  Focus on:  What information consumers willingly give AI What information they consider sensitive Differences between AI accessing data and AI writing data back Expectations around consent, transparency, memory and deletion Concern about universities/employers seeing personal AI interactions Behaviors consumers already use to protect themselves Trust differences among an institution, an AI provider and a third-party platform  This addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.  Key output: a consumer AI trust and permission framework that can guide architecture and UX decisions.  4. Identify where proactive AI creates value versus backlash  Determine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.  Analyze market reaction to:  AI notifications and nudges Persistent memory Recommendations based on behavior Autonomous task completion AI detecting problems before the user asks Emotional or motivational interventions AI escalating something to a human  This directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.  Key output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.  5. Define the evolving role of humans in AI-mediated guidance  Understand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.  Look comparatively across:  Career advising Academic advising Healthcare navigation Financial advice Customer service Coaching and mentoring  Study the moments when consumers say:  “AI can handle this.”  versus:  “AI can help me prepare, but I want a person making this call.”  That maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.  Key output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.  The synthesis question  These five objectives ladder into one strategic market question:  As AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
content_hash: "95e92b5955b7d3d9"
relevance_by_goal: {"aaf3b0416610":78}
chunks:
  - id: "articles/reddit-deep-r-claudeai/bddfed99e9.md#c0"
    char_span: [0, 2285]
    sentence_count: 23
    key_terms: [lecture, claude, youtube, transcripts, skill, study, lectures, playlist]
    concepts: [lecture, claude, transcripts, youtube, skill]
    token_count: 510
    sources: [{"n":"Reddit Deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1sflh0y/i_turned_claude_into_a_study_assistant_that_can/","kind":"article","date":"2026-04-08","subreddit":"claudeai"}]
  - id: "articles/reddit-deep-r-claudeai/bddfed99e9.md#c1"
    char_span: [2287, 2390]
    sentence_count: 1
    key_terms: [transcripts, university, comments, lecture, top, use]
    token_count: 26
    sources: [{"n":"Reddit Deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1sflh0y/i_turned_claude_into_a_study_assistant_that_can/","kind":"article","date":"2026-04-08","subreddit":"claudeai"}]
---
# I turned Claude into a study assistant that can answer questions about any YouTube course. Here's the setup.

Source: [Reddit Deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1sflh0y/i_turned_claude_into_a_study_assistant_that_can/)

I'm going through a bunch of online courses right now 

Andrew Ng's ML specialization, some MIT OCW stuff, a few smaller tutorial channels. All on YouTube. Probably 150+ hours of lecture content total.

The problem with video lectures is retention. I watch a 90-minute lecture, absorb maybe 60% of it, and two weeks later I can't remember which lecture explained the thing I need. 

YouTube search is useless for this. it matches titles, not what was actually said. So I end up re-watching entire lectures to find one explanation.

I figured out a way to make Claude work as a study assistant that has access to all the lecture content. It took about 15 minutes to set up and it's honestly changed how I study.

**The setup**

    npx skills add ZeroPointRepo/youtube-skills --skill youtube-full

That's the skill. Now I can tell Claude things like:

* "Get the transcript from this lecture and explain the part about backpropagation in simpler terms"
* "Pull transcripts from this entire playlist and tell me which lecture covers regularization"
* "I don't understand the bias-variance tradeoff. Find where Andrew Ng explains it and summarize his explanation"
* "Generate 10 flashcards based on lectures 4-6 of this course, with timestamps so I can rewatch if I get one wrong"

It works. Really well actually. Claude reads the transcript and can find specific explanations, compare how different instructors teach the same concept, generate study questions, all of it.

**The 15-minute version if you want to try this right now**

1. `npx skills add ZeroPointRepo/youtube-skills --skill youtube-full`
2. Open Claude Code
3. Paste a YouTube playlist URL and say "get transcripts from all videos in this playlist"
4. Ask whatever question you want about the content

That's it. No Python. No Docker. No API keys to manage. The skill handles auth automatically on first run.

If you're a student and you haven't tried turning your lecture transcripts into a searchable, queryable knowledge base/ you're studying on hard mode for no reason.

--- TOP COMMENTS ---
[1↑ Connect_Ant_200] how do I use this for my lecture transcripts? for university
