---
id: social-intelligence/reddit-deep/businessanalysis/1t9p3uu.md
url: "https://www.reddit.com/r/businessanalysis/comments/1t9p3uu/a_recruiter_sent_me_an_interesting_jd_for_a_ba/"
kind: "social-post"
source: "reddit-deep: r/businessanalysis"
subreddit: "businessanalysis"
title: "A recruiter sent me an interesting JD for a BA role on an MLOps/LLMOps project at a bank. Well I studied to prep the interview."
author: "exoxfanel"
date: "2026-05-11T01:34:03.000Z"
score: 13
upvote_ratio: 0.81
num_comments: 7
flair: ""
extracted_at: "2026-06-24T22:13:45.909Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/businessanalysis/1t9p3uu.md#c0"
    char_span: [0, 2095]
    sentence_count: 25
    key_terms: [functional, model, like, businessanalysis, llmops, requirements, looks, mlops]
    concepts: [functional, businessanalysis, model, requirements, llmops]
    token_count: 465
    sources: [{"n":"reddit-deep: r/businessanalysis","u":"https://www.reddit.com/r/businessanalysis/comments/1t9p3uu/a_recruiter_sent_me_an_interesting_jd_for_a_ba/"}]
  - id: "social-intelligence/reddit-deep/businessanalysis/1t9p3uu.md#c1"
    char_span: [2097, 2316]
    sentence_count: 2
    key_terms: [functional, interview, questions, situation, assigned, comments, prepping, analyst]
    token_count: 50
  - id: "social-intelligence/reddit-deep/businessanalysis/1t9p3uu.md#c2"
    char_span: [2330, 4824]
    sentence_count: 15
    key_terms: [business, demystifying-business-analysis-for-business-owners-a-beginners-guide, message, here, analysis, delivery, businessanalysis, requirements]
    concepts: [business, message, businessanalysis, analysis, delivery]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/businessanalysis/1t9p3uu.md#c3"
    char_span: [4826, 5744]
    sentence_count: 5
    key_terms: [because, descriptions, requirements, delivery, thinking, finding, api, gaps]
    concepts: [because, descriptions, requirements, delivery, thinking]
    section: Comments
    token_count: 171
---
# A recruiter sent me an interesting JD for a BA role on an MLOps/LLMOps project at a bank. Well I studied to prep the interview.

Source: [reddit-deep: r/businessanalysis](https://www.reddit.com/r/businessanalysis/comments/1t9p3uu/a_recruiter_sent_me_an_interesting_jd_for_a_ba/)
Posted by **exoxfanel** · **13↑** · **7 comments**

I'm a technical BA in banking, payments and wealth management being my strong suits. I heavily use AI at work but LLMOps, MLOps pipelines, RAG architecture, Azure OpenAI, RAGAS metrics were mostly unknown to me. I like these subjects and maybe it's good to be a future-proof BA who knows. So I studied the subject an entire weekend to prep a potential interview.

Here's a quick summary of my findings:

MLOps = DevOps for ML models. Your job as a BA is to define what "done" looks like at each stage: minimum accuracy before a model goes to prod, what drift threshold triggers retraining, what the escalation path looks like when the model degrades. Functional requirements. Same job, new nouns.

LLMOps flips your testing model. You can't write "assert output == expected" for a model response because it's probabilistic. You need structural assertions (does it include a citation?), constraint assertions, and RAGAS metrics, specifically faithfulness, which catches hallucinations. In banking, that would be a major compliance issue.

RAG is everywhere. The LLM doesn't answer from memory. It retrieves relevant documents at query time and grounds its answer in them. As a BA you define what documents are in scope, how they're chunked, what metadata each chunk carries, and what the citation requirement looks like in the output spec. Functional requirements problem dressed in AI vocabulary.

My existing skills surprisingly transfer more than I thought. Writing an API spec is similar to writing a RAG functional spec. Kafka pipeline UAT maps to LLM evaluation criteria. Payment SLAs map to LLM latency NFRs. The gap is vocabulary, not fundamentals.

Its fun to see new job posting for BAs and functional analysts with different workflows and technologies.

If you're a BA in a similar situation, whether assigned to an AI project cold or prepping for an AI functional analyst interview at a bank, I would love to to share or chat. Open to questions, comments and DMs as usual.

## Comments

- **AutoModerator** (1↑): Welcome to /r/businessanalysis the best place for Business Analysis discussion.

Here are some tips for the best experience here.

You can find [reading materials on business analysis here](https://betterauds.com/businesses/demystifying-business-analysis-for-business-owners-a-beginners-guide/). 

Also here are the rules of the sub:

Subreddit Rules

* Keep it Professional.
* Do not advertise goods/services.
* Follow [Reddiquette.](https://www.reddithelp.com/en/categories/reddit-101/reddit-basics/reddiquette)
* Report Spam!


This is an automated message so if you need to contact the mods, please [Message the Mods](https://www.reddit.com/message/compose?to=%2Fr%2Fbusinessanalysis) for assistance.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/businessanalysis) if you have any questions or concerns.*
- **Academic-Vegetable-1** (7↑): The framing you landed on is exactly right. Same job, new nouns. I've seen BAs panic on AI projects because they think it's a technical gap when it's really a vocabulary gap.
  - **exoxfanel** (1↑): Thanks appreciate it
- **Flashy-Ad8874** (3↑): This is honestly one of the most grounded and practical takes on AI delivery work I’ve seen from a BA perspective.

A lot of people assume AI projects require completely reinventing themselves technically, but what you highlighted really resonates. The fundamentals of analysis, requirements clarity, risk management, governance, traceability, testing, and stakeholder alignment still matter. The vocabulary and implementation patterns evolve, but the core thinking transfers surprisingly well.

Your point about LLMOps changing traditional testing assumptions is especially important. Many delivery teams underestimate how challenging probabilistic outputs become in regulated environments like banking, where explainability, auditability, compliance, and accuracy thresholds matter significantly.

I also think more BAs are going to realise they already possess highly transferable skills for AI initiatives, including defining operational boundaries, clarifying business rules, documenting decision flows, managing non functional requirements, and translating technical complexity into business understanding.

The industry definitely seems to be moving toward hybrid delivery professionals who can bridge business, product, data, risk, and AI domains rather than staying in isolated silos.

This was also encouraging to read because recruiters and job descriptions can sometimes make these roles feel far more inaccessible than they really are.

A lot of experienced BAs already have transferable skills around requirements, governance, stakeholder management, delivery structure, process thinking, and non functional requirements. The terminology and technologies evolve, but the core analytical thinking often transfers better than people expect.

I think many professionals hesitate applying because job descriptions read like a checklist of specialised domains rather than focusing on capability, adaptability, and delivery maturity.
  - **exoxfanel** (2↑): Thank you so much appreciate it
- **HaloNevermore** (2↑): If you’re writing API spec you have a responsibility to API itself to bring forth the gaps you are finding in order to protect our industry. 

Because I know you are finding knowledge gaps.
