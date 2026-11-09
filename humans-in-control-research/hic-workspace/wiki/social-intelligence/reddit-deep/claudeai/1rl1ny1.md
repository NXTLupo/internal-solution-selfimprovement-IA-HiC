---
id: social-intelligence/reddit-deep/claudeai/1rl1ny1.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1rl1ny1/claude_code_cli_workflow/"
kind: "social-post"
source: "reddit-deep: r/claudeai"
subreddit: "claudeai"
title: "Claude Code CLI Workflow"
author: "DesignedIt"
date: "2026-03-04T23:44:23.000Z"
score: 1
upvote_ratio: 1
num_comments: 5
flair: "Question"
extracted_at: "2026-11-08T23:05:59.853Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/claudeai/1rl1ny1.md#c0"
    char_span: [0, 2008]
    sentence_count: 17
    key_terms: [claude, project, projects, windows, plan, workflow, agents, tasks]
    concepts: [claude, project, projects, windows, workflow]
    token_count: 464
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1rl1ny1/claude_code_cli_workflow/","kind":"social-post","date":"2026-03-04","author":"DesignedIt","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1rl1ny1.md#c1"
    char_span: [2010, 2958]
    sentence_count: 13
    key_terms: [claude, vsc, frontend, backend, notepad, prompt, window, ctrl]
    concepts: [claude, frontend, backend, notepad, prompt]
    token_count: 226
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1rl1ny1/claude_code_cli_workflow/","kind":"social-post","date":"2026-03-04","author":"DesignedIt","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1rl1ny1.md#c2"
    char_span: [2972, 4393]
    sentence_count: 12
    key_terms: [claude, codex, window, review, files, repo, sometimes, worktrees]
    concepts: [claude, codex, window, review, files]
    section: Comments
    token_count: 345
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1rl1ny1/claude_code_cli_workflow/","kind":"social-post","date":"2026-03-04","author":"DesignedIt","subreddit":"claudeai"}]
---
# Claude Code CLI Workflow

Source: [reddit-deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1rl1ny1/claude_code_cli_workflow/)
Posted by **DesignedIt** · **1↑** · **5 comments**

Below is my AI coding workflow. Does anyone have any tips for workflow improvement?

I just started using Claude in VSC last week and just switched to the $200/month Claude Max plan since I hit my weekly usage rate pretty early with the $100 plan.

I just started using parallel agents to setup teams yesterday and it's working really well.

I have a few agents research different things, a few testing different processes, and one writing code.

If the agents are coding then I open additional Claude windows, sometimes 3 - 10, and put them all in plan mode -- so it plans out everything and when the agent team is done in an hour then I go to the windows in plan mode and click the continue button, one by one after each finishes, to kick off those.

I'm finding I don't always have tasks for an agent team to work on.

I'm usually working on 3-5 projects at once, but focusing on one project as my primary project.

Once I get a project initialized, I was finding it was harder to focus on juggling 3-5 projects at the same time and giving them all equal attention. Now, I built websites for each that run locally so I can visually see the changes instead of just talking to Claude and looking at scripts. This makes it easier to tell what Claude did.

I typed 140,000 characters (87 pages when pasted into Word) of prompts in paragraph form over the last 4 days for my main project (plus a bunch more for 4 other projects), which is where I spend 85% of my time. Other 15% is research and testing.

I have 5 desktops setup on Windows, one for each project. I can switch between them by clicking the task viewer and then clicking any of the 5 desktops (or pushing ctrl + win + left/right). I had too many tasks on my task bar so had separate tasks by projects.

In each desktop, I have the following windows open:

1. Visual Studio code with Claude loaded in a window (not loaded in a chat). Then I open multiple Claude windows in each VSC.
2. cmd to load backend. Each time Claude makes a change, I push ctrl + c, up, enter to restart the backend.
3. cmd to load frontend. Sometimes when Claude makes a change, I push ctrl + c, up, enter to restart the frontend.
4. Browser to display website locally. After restarting either the frontend or backend, I'll push ctrl + r to refresh the webpage.
5. Notepad with all prompts I type into. If I type directly into the VSC Claude window, then the textbox keeps losing focus each time I alt + tab from the website to test and then back to VSC to type the prompt. Notepad solves this by just putting it over the browser and typing the prompt. Then I copy the prompt from Notepad to Claude in VSC.
6. ChatGPT to ask questions to and plan things out
7. GitHub only in desktop 1 (can't have more than 1 GitHub window open.)

## Comments

- **Electronic_Froyo_947** (1↑): For 5. We just open a vs code window and use it as a scratch pad or we make a .gitignore folder and create MD files in there.

For 6. We installed Codex along Claude Code, we also plan but sometimes we ask codex to give us a review of what is currently in the project, repo, worktrees, I staged files, etc.

Works for us might not work for you 🤞
  - **DesignedIt** (1↑): I have my Codex window in the right and Claude window on the right in VSC. But Claude seems to be working better. Earlier today I hit my usage for Claude and had 28 minutes to wait. Instead of using Codex, I just waited for Claude to reset because I felt it would be faster. Claude was already half way through a prompt when it hit the usage limit, so I just preferred that Claude would finish once back online. And I had another Claude window already setup in plan mode, ready for the next task.
  - **Consistent-Hearing26** (1↑): That Codex review step is close to the handoff problem I am trying to understand. When it summarizes the current project, where do you keep the authoritative state between sessions: scratchpad docs, repo files, a task board, or something else?
    - **Electronic_Froyo_947** (1↑): We use worktrees and then we have a reflect memory skill and a repo memory folder where we add what was done so we don't need to go back.

Sometimes we hafta say review issue and PR fix this now happening
