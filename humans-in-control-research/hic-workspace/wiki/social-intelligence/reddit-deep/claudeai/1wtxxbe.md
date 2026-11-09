---
id: social-intelligence/reddit-deep/claudeai/1wtxxbe.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1wtxxbe/your_dev_workflow/"
kind: "social-post"
source: "reddit-deep: r/claudeai"
subreddit: "claudeai"
title: "Your dev workflow"
author: "DynamicznyDexter"
date: "2026-09-30T06:46:57.000Z"
score: 1
upvote_ratio: 1
num_comments: 9
flair: "Claude Code Workflow"
extracted_at: "2026-11-08T23:05:59.853Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/claudeai/1wtxxbe.md#c0"
    char_span: [0, 1018]
    sentence_count: 11
    key_terms: [implementation, claude, somewhere, claudeai, comments, specific, workflow, lessons]
    concepts: [implementation, claude, somewhere, claudeai, comments]
    token_count: 246
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1wtxxbe/your_dev_workflow/","kind":"social-post","date":"2026-09-30","author":"DynamicznyDexter","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1wtxxbe.md#c1"
    char_span: [1032, 2083]
    sentence_count: 6
    key_terms: [claude, lessons, folder, review, human, comments, docs, "i've"]
    concepts: [claude, lessons, folder, review, human]
    related_chunks: ["social-intelligence/reddit-deep/claudeai/1wtxxbe.md#c2"]
    section: Comments
    token_count: 259
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1wtxxbe/your_dev_workflow/","kind":"social-post","date":"2026-09-30","author":"DynamicznyDexter","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1wtxxbe.md#c2"
    char_span: [2087, 3365]
    sentence_count: 10
    key_terms: [claude, review, check, plan, because, session, behind, checks]
    concepts: [claude, review, check, because, session]
    related_chunks: ["social-intelligence/reddit-deep/claudeai/1wtxxbe.md#c1"]
    section: Comments
    token_count: 297
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1wtxxbe/your_dev_workflow/","kind":"social-post","date":"2026-09-30","author":"DynamicznyDexter","subreddit":"claudeai"}]
---
# Your dev workflow

Source: [reddit-deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1wtxxbe/your_dev_workflow/)
Posted by **DynamicznyDexter** · **1↑** · **9 comments**

Do you have a workflow for working on projects?

I mean something like:

1. You upload a user story (US) to Claude Code

2. You run a skill that converts the US into a specific TASK

3. You start planning the task’s implementation

4. You approve or make changes to the plan

4. Claude Code implements the feature

5. You verify what it did

etc.

Do you have any specific skills for this?

Also, I saw somewhere that after implementation, Claude creates a file in the “lessons” folder like “lessons learned” and puts in there what it struggled with, what went wrong, and how to fix it, so that if a similar problem arises again, it’ll know the available solutions. Unfortunately, I don’t know if he’s supposed to do this automatically or if I need to add instructions somewhere, because he’s never created a “lesson” file for me yet.

## Comments

- **MentalMcClean** (1↑): On the lessons bit, what I've been doing on repos that are at least a few months old with a decent amount of history is asking Claude to go through the PR review comments (human and AI, but weighing the human ones more), look for things that come up more than once, and turn those into rules in a docs folder in the repo. Then I point CLAUDE.md at that folder.

It still doesn't work perfectly. My worst one is multi-line comments on everything. I've got that in CLAUDE.md, in the docs, and in a PR review skill that runs before human review, and I still end up telling it on basically every PR to get rid of them!
- **kevin_g_g** (1↑): A lessons folder isn't a built-in Claude Code feature, so it won't appear unless you ask for it. Whoever you saw it from wrote it into their [CLAUDE.md](http://CLAUDE.md), something like "when a task is done, append what went wrong and the fix to lessons/<area>.md", plus the line people forget: "read lessons/ before writing a plan." Without that second line it's a diary nobody opens.  
  
For the rest of your flow, the step I'd change is verify. Have a fresh sub-agent review the diff instead of the session that wrote it, because the author session grades its own homework.
- **small_e** (1↑): I started using openspec and works like a charm. It helps the agent to understand the stage we are in (plan, review, implement). Leaves some knowledge behind. It’s easier to review PRs because you can see what was the rationale behind the changes in the md files it creates. Also pretty lightweight and soft learning curve.
- **BeMatrx** (1↑): What has held up for me is making verification a hard gate: tests and checks run before every commit and push, and a second model audits the code separately. When a local check once said green while CI failed, I made the local check as strict as CI and wrote the rule down with the cause. How do you decide a lesson is proven enough to keep?
- **VanCliefMedia** (1↑): I use one task file per feature: user story, acceptance checks, plan, current status, and the command that proves it's done. [CLAUDE.md](http://CLAUDE.md) just points Claude to that file. The replies here are right about lessons: I'd add one only after a verified fix, with the symptom, cause, and check that caught it. Then the next plan can actually use it.
