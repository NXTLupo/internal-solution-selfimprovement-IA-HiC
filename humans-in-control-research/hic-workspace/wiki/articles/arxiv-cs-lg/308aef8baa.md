---
id: articles/arxiv-cs-lg/308aef8baa.md
url: "https://arxiv.org/abs/2610.02764v1"
url_hash: "308aef8baa"
kind: "article"
source: "arXiv CS.LG"
title: "A Controlled Audit of Personal AI Memory for Rating Prediction"
author: ""
date: "2026-10-02T03:43:17Z"
tier: 1
method: "jina"
extracted_at: "2026-11-08T23:34:13.019335+00:00"
chars: 2209
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
collected_at: "2026-11-08T23:34:13.340Z"
relevance: 60
engagement_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations  Determine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.  Explore:  Which AI platforms students use and pay for Career-related use cases: resumes, job discovery, interview prep, networking, skills development Movement from simple prompting toward persistent assistants, agents, memory and connected tools Expectations that AI should know their context rather than start from scratch Differences by AI fluency, age, discipline and career stage  Social listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.  3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.  2. Assess the emerging“Bring Your Own AI” model  Determine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.  Specifically investigate:  Preference for a personally chosen AI vs. institution-provided assistant Evidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products Willingness to connect personal AI to trusted institutional services Expectations for interoperability, memory, portability and personalization Analogous models emerging in banking, healthcare, commerce and enterprise SaaS  This directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.  Key output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.  3. Map consumer trust, privacy and control expectations  Identify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.  Focus on:  What information consumers willingly give AI What information they consider sensitive Differences between AI accessing data and AI writing data back Expectations around consent, transparency, memory and deletion Concern about universities/employers seeing personal AI interactions Behaviors consumers already use to protect themselves Trust differences among an institution, an AI provider and a third-party platform  This addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.  Key output: a consumer AI trust and permission framework that can guide architecture and UX decisions.  4. Identify where proactive AI creates value versus backlash  Determine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.  Analyze market reaction to:  AI notifications and nudges Persistent memory Recommendations based on behavior Autonomous task completion AI detecting problems before the user asks Emotional or motivational interventions AI escalating something to a human  This directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.  Key output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.  5. Define the evolving role of humans in AI-mediated guidance  Understand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.  Look comparatively across:  Career advising Academic advising Healthcare navigation Financial advice Customer service Coaching and mentoring  Study the moments when consumers say:  “AI can handle this.”  versus:  “AI can help me prepare, but I want a person making this call.”  That maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.  Key output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.  The synthesis question  These five objectives ladder into one strategic market question:  As AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
content_hash: "caf161d4c7ba52a8"
relevance_by_goal: {"aaf3b0416610":60}
chunks:
  - id: "articles/arxiv-cs-lg/308aef8baa.md#c0"
    char_span: [0, 1740]
    sentence_count: 9
    key_terms: [rating, arxiv, historical, prediction, https, movielens, coat, org]
    concepts: [rating, arxiv, historical, prediction, movielens]
    token_count: 382
    sources: [{"n":"arXiv CS.LG","u":"https://arxiv.org/abs/2610.02764v1","kind":"article","date":"2026-10-02"}]
  - id: "articles/arxiv-cs-lg/308aef8baa.md#c1"
    char_span: [1742, 2332]
    sentence_count: 2
    key_terms: [arxiv, https, org, doi, personal-ai-memory-studies, abs, reproducibility, arxiv-issued]
    concepts: [arxiv, https]
    token_count: 218
    sources: [{"n":"arXiv CS.LG","u":"https://arxiv.org/abs/2610.02764v1","kind":"article","date":"2026-10-02"}]
---
# A Controlled Audit of Personal AI Memory for Rating Prediction

Source: [arXiv CS.LG](https://arxiv.org/abs/2610.02764v1)

Title: A Controlled Audit of Personal AI Memory for Rating Prediction

URL Source: https://arxiv.org/abs/2610.02764v1

Published Time: Mon, 05 Oct 2026 00:28:32 GMT

Markdown Content:
[View PDF](https://arxiv.org/pdf/2610.02764v1)[HTML (experimental)](https://arxiv.org/html/2610.02764v1)

> Abstract:In structured rating prediction, does a personal AI use historical item-rating associations, or mainly the user's rating tendencies? We audit this distinction by permuting historical ratings within each user while preserving the exact rating distribution, item support, and metadata. We combine this control with full history, native memory extraction, and matched numerical readers in a publicly frozen evaluation of 400 held-out user profiles and 6,160 target ratings across Coat and MovieLens. On Coat, the tested Qwen-written Mem0 pipeline increases user-macro mean absolute error relative to full history by 0.084 for Qwen and 0.149 for Phi; both family-adjusted bootstrap intervals exclude zero. Correct historical assignments help both readers on Coat, but the corresponding MovieLens effects are smaller and inconclusive after adjustment. A history-only ridge reader outperforms Qwen in both domains and Phi on MovieLens, while the Coat Phi comparison is unresolved. All 2,800 reader calls, including 150 invalid outputs, are retained under a fixed fallback rule. A separate implementation verifies inputs, metrics, and all ten primary contrasts. The contribution is a reproducible diagnostic study showing why extraction, association use, output reliability, and reader choice require separate evaluation.

Comments:15 pages. Code and reproducibility materials: [this https URL](https://github.com/shi1720/personal-ai-memory-studies)
Subjects:Machine Learning (cs.LG)
Cite as:[arXiv:2610.02764](https://arxiv.org/abs/2610.02764) [cs.LG]
(or [arXiv:2610.02764v1](https://arxiv.org/abs/2610.02764v1) [cs.LG] for this version)
[https://doi.org/10.48550/arXiv.2610.02764](https://doi.org/10.48550/arXiv.2610.02764)

arXiv-issued DOI via DataCite

## Submission history

From: Shivam Gupta [[view email](https://arxiv.org/show-email/7d4ad4da/2610.02764)]   
**[v1]** Fri, 2 Oct 2026 03:43:17 UTC (87 KB)
