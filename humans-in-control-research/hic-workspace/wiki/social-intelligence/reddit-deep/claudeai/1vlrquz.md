---
id: social-intelligence/reddit-deep/claudeai/1vlrquz.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1vlrquz/claude_grades_its_own_homework_so_i_made/"
kind: "social-post"
source: "reddit-deep: r/claudeai"
subreddit: "claudeai"
title: "Claude grades its own homework. So I made something else run the tests."
author: "Due_Emu_8229"
date: "2026-08-11T19:41:31.000Z"
score: 1
upvote_ratio: 1
num_comments: 6
flair: "Built with Claude"
extracted_at: "2026-11-09T00:14:43.743Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/claudeai/1vlrquz.md#c0"
    char_span: [0, 2026]
    sentence_count: 19
    key_terms: [tests, test, claude, failed, claim, exit, pass, src]
    concepts: [tests, claude, failed, claim, claudeai]
    token_count: 485
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1vlrquz/claude_grades_its_own_homework_so_i_made/","kind":"social-post","date":"2026-08-11","author":"Due_Emu_8229","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1vlrquz.md#c1"
    char_span: [2031, 3177]
    sentence_count: 2
    key_terms: [plastic-risk-6309, evidence-goes-back-and-it-keeps-working, changed, outside, screen, agent, model, nuhuh]
    concepts: [plastic-risk-6309, changed, outside, screen, agent]
    section: Comments
    token_count: 280
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1vlrquz/claude_grades_its_own_homework_so_i_made/","kind":"social-post","date":"2026-08-11","author":"Due_Emu_8229","subreddit":"claudeai"}]
---
# Claude grades its own homework. So I made something else run the tests.

Source: [reddit-deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1vlrquz/claude_grades_its_own_homework_so_i_made/)
Posted by **Due_Emu_8229** · **1↑** · **6 comments**

Last week Claude told me "All tests pass." I ran them. One failed. It had reported the result of a run it never made, and I only caught it because I happened to check.

  
So now when Claude says it's done, a Stop hook takes every claim in that final message ("all tests pass", "created src/x.ts", "endpoint works") and re-runs reality before the Done is accepted. Fresh test suite in a clean process, real exit codes, actual files, a probe at the local endpoint. If a claim is false, the evidence goes back to Claude and it keeps working.

  
🧾 receipt

✅ src/login.ts exists (33 bytes)

❌ src/login.test.ts does not exist

❌ "All tests pass." ran npm test fresh, exit 1 ("Tests: 1 failed, 3 passed")

✅ "The build succeeds" exit 0

2 of 4 claims verified, 2 failed.

  
The usual fix is a second model as an adversarial reviewer. Two problems with that. It burns tokens on every round, and it never knows when to stop, it can find new objections 25 rounds in a row. Researchers measured LLM judges on exactly this failure and they landed at roughly a coin flip. A test runner doesn't have opinions. Claims either verify or they don't, and if the same claim fails the same way twice the loop ends and I get the receipt.

  
Everything is local and deterministic, no API key, zero tokens spent on checking. It's tuned to miss rather than accuse, anything it can't safely check is marked unverifiable instead of failed, because a wrongful block is worse than a missed lie.

  
The repo ships a benchmark where the ground truth doesn't know the tool exists, so it catches the tool's own mistakes too. It has caught six false accusations so far and each one became a regression test. Two of the current features were suggested by commenters and shipped the same afternoon.

  
npx nuhuh demo stages a lie and catches it in ten seconds without touching anything. Repo at [https://github.com/sjh9714/nuhuh](https://github.com/sjh9714/nuhuh)

  
What's the last thing your agent claimed was done that wasn't?

## Comments

- **Plastic-Risk-6309** (1↑): the evidence-goes-back-and-it-keeps-working loop is the right design, deterministic checker and no llm judge. i hit the same failure class on the ui side: agent says tapped submit, screen never changed. wiring every action to report whether the screen actually changed killed that lie the same way your stop hook kills all-tests-pass. verdicts have to come from outside the model or they regress to vibes.
  - **Due_Emu_8229** (1↑): ui is the nastier version of this, there's no exit code to lean on so you had to invent one. screen changed or not is a good verdict, and agreed, it has to live outside the model.
    - **Plastic-Risk-6309** (1↑): right, and once its outside the model you can be strict with it. mine diffs the frame plus the accessibility tree after every tap, the agent only gets back whether anything actually moved, so it cant narrate a pass it didnt get
