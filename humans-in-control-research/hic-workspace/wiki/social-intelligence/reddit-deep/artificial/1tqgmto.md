---
id: social-intelligence/reddit-deep/artificial/1tqgmto.md
url: "https://www.reddit.com/r/artificial/comments/1tqgmto/ai_adoption_issue_debugging/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "AI Adoption Issue Debugging"
author: "pauliusuza"
date: "2026-05-28T21:10:44.000Z"
score: 6
upvote_ratio: 1
num_comments: 10
flair: "Discussion"
extracted_at: "2026-11-09T00:16:43.959Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1tqgmto.md#c0"
    char_span: [0, 669]
    sentence_count: 6
    key_terms: [artificial, comments, issue, wrong, did, reddit-deep, pauliusuza, debugging]
    concepts: [artificial, comments, issue, wrong]
    token_count: 161
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1tqgmto/ai_adoption_issue_debugging/","kind":"social-post","date":"2026-05-28","author":"pauliusuza","subreddit":"artificial"}]
  - id: "social-intelligence/reddit-deep/artificial/1tqgmto.md#c1"
    char_span: [683, 1519]
    sentence_count: 9
    key_terms: [model, did, format, output, user, contract, schema, input]
    concepts: [model, format, output, contract, schema]
    section: Comments
    token_count: 186
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1tqgmto/ai_adoption_issue_debugging/","kind":"social-post","date":"2026-05-28","author":"pauliusuza","subreddit":"artificial"}]
---
# AI Adoption Issue Debugging

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1tqgmto/ai_adoption_issue_debugging/)
Posted by **pauliusuza** · **6↑** · **10 comments**

I was dealing with another "output not usable" issue today in our app, user left a comment saying that no matter what he does the agent returns the result in the wrong format. It took me hours to identify the mistake and AI model missed it.  
  
Curious to hear your stories about the times you shipped a feature in your AI product and it flopped.  
  
How did you figure out what was actually going wrong?   
What tools if any did you use?   
What metrics were key?

## Comments

- **WorthBathroom3268** (1↑): I’d debug this less as a “model quality” issue and more as a contract failure between the product and the model.

The useful split for me is:

1. Did the user ask for something outside the format contract?
2. Did the prompt describe the format, or actually enforce it with examples/schema?
3. Did the UI make the expected input obvious?
4. Did your evaluator check the final artifact, or only whether the model sounded confident?

For “wrong format” failures, a small set of real failed inputs + one hand-written ideal output usually tells you more than aggregate usage metrics. I’d also log the raw user input, intended schema, model output, parser error, and user retry behavior separately. Otherwise everything collapses into the vague bucket of “AI output not usable.”
  - **pauliusuza** (1↑): exactly!
