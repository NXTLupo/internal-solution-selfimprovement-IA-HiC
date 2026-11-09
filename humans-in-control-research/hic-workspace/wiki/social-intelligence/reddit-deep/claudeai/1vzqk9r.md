---
id: social-intelligence/reddit-deep/claudeai/1vzqk9r.md
url: "https://www.reddit.com/r/ClaudeAI/comments/1vzqk9r/share_techniques_on_using_claude_to_make_research/"
kind: "social-post"
source: "reddit-deep: r/claudeai"
subreddit: "claudeai"
title: "Share Techniques on Using Claude to Make Research Papers"
author: "tedbradly"
date: "2026-08-27T10:51:05.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 6
flair: "NOT about coding"
extracted_at: "2026-11-08T23:43:07.691Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/claudeai/1vzqk9r.md#c0"
    char_span: [0, 1654]
    sentence_count: 12
    key_terms: [research, sources, document, changed, using, information, new, selection]
    concepts: [research, sources, document, changed, information]
    token_count: 382
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1vzqk9r/share_techniques_on_using_claude_to_make_research/","kind":"social-post","date":"2026-08-27","author":"tedbradly","subreddit":"claudeai"}]
  - id: "social-intelligence/reddit-deep/claudeai/1vzqk9r.md#c1"
    char_span: [1668, 2275]
    sentence_count: 8
    key_terms: [research, use, designed, sciences, science, claude, been, info]
    concepts: [research, designed, sciences, science, claude]
    section: Comments
    token_count: 159
    sources: [{"n":"reddit-deep: r/claudeai","u":"https://www.reddit.com/r/ClaudeAI/comments/1vzqk9r/share_techniques_on_using_claude_to_make_research/","kind":"social-post","date":"2026-08-27","author":"tedbradly","subreddit":"claudeai"}]
---
# Share Techniques on Using Claude to Make Research Papers

Source: [reddit-deep: r/claudeai](https://www.reddit.com/r/ClaudeAI/comments/1vzqk9r/share_techniques_on_using_claude_to_make_research/)
Posted by **tedbradly** · **0↑** · **6 comments**

If you didn't know, Claude's research task is utter dogshit. It goes back to the models that summarize the sources being completely stupid. I'd guess it's using Haiku 4.5 to scan and summarize them. I figured this out when I told Fable to pull in all of the research articles with `web_fetch` where possible and `web_search` where not possible, asking it to integrate that new information into a new document. I then asked it to tell me what changed. I'm being serious when it said *a lot* changed. In two instances, statements changed from "this is X" to "ths is *not* X." In other cases, a bounty of new information was infused into the writing. It transformed from lightweight bullet points that explain almost nothing into a meaty document filled with paragraphs, making the document ~3x the amount of words.

There is another point of weakness to be concerned about: The selection of sources themselves. If weak LLMs are deciding which to pick, it follows their selection might be unjustified and suboptimal.

Could you share your setups on how you use Claude to make actual research papers, hopefully countering both weak points? In other words, a research process using CC that (a) searches through 100s of sources like the research task does (this is the only good thing it does), (b) picks the right subset of sources to use, and (c) writes an informative document based on that subset of sources.

## Comments

- **Kilt_Rump** (2↑): Use Claude Science. Its designed for this.
  - **tedbradly** (1↑): > Use Claude Science. Its designed for this.

Can anyone use it, or are there requirements? Does it *only* handle academic research in the sciences? Sometimes, I'd like to research something else unrelated to the sciences.
    - **Kilt_Rump** (2↑): Its just a shell. You can research anything
- **ZeD4805** (0↑): I've been asking it to collect the info (work offloaded to haiku/sonnet like you described) and then I asked Opus to fact check all the info there and it caught major things.

Has been working well lately.
