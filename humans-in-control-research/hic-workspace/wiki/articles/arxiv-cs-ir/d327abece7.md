---
id: articles/arxiv-cs-ir/d327abece7.md
url: "https://arxiv.org/abs/2408.15002v2"
url_hash: "d327abece7"
kind: "article"
source: "arxiv_cs_ir"
title: "Knowledge Discovery in Optical Music Recognition: Enhancing Information Retrieval with Instance Segmentation"
author: ""
date: "2024-08-27T12:34:41Z"
tier: 1
method: "jina"
extracted_at: "2026-11-09T00:23:16.877317+00:00"
chars: 2763
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
collected_at: "2026-11-09T00:23:16.693Z"
relevance: 10
engagement_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations  Determine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.  Explore:  Which AI platforms students use and pay for Career-related use cases: resumes, job discovery, interview prep, networking, skills development Movement from simple prompting toward persistent assistants, agents, memory and connected tools Expectations that AI should know their context rather than start from scratch Differences by AI fluency, age, discipline and career stage  Social listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.  3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.  2. Assess the emerging“Bring Your Own AI” model  Determine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.  Specifically investigate:  Preference for a personally chosen AI vs. institution-provided assistant Evidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products Willingness to connect personal AI to trusted institutional services Expectations for interoperability, memory, portability and personalization Analogous models emerging in banking, healthcare, commerce and enterprise SaaS  This directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.  Key output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.  3. Map consumer trust, privacy and control expectations  Identify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.  Focus on:  What information consumers willingly give AI What information they consider sensitive Differences between AI accessing data and AI writing data back Expectations around consent, transparency, memory and deletion Concern about universities/employers seeing personal AI interactions Behaviors consumers already use to protect themselves Trust differences among an institution, an AI provider and a third-party platform  This addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.  Key output: a consumer AI trust and permission framework that can guide architecture and UX decisions.  4. Identify where proactive AI creates value versus backlash  Determine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.  Analyze market reaction to:  AI notifications and nudges Persistent memory Recommendations based on behavior Autonomous task completion AI detecting problems before the user asks Emotional or motivational interventions AI escalating something to a human  This directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.  Key output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.  5. Define the evolving role of humans in AI-mediated guidance  Understand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.  Look comparatively across:  Career advising Academic advising Healthcare navigation Financial advice Customer service Coaching and mentoring  Study the moments when consumers say:  “AI can handle this.”  versus:  “AI can help me prepare, but I want a person making this call.”  That maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.  Key output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.  The synthesis question  These five objectives ladder into one strategic market question:  As AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
content_hash: "2476592b6fdbef7c"
relevance_by_goal: {"aaf3b0416610":10}
chunks:
  - id: "articles/arxiv-cs-ir/d327abece7.md#c0"
    char_span: [0, 2132]
    sentence_count: 9
    key_terms: [segmentation, recognition, music, instance, discovery, knowledge, omr, musical]
    concepts: [segmentation, recognition, music, instance, discovery]
    token_count: 428
    sources: [{"n":"arxiv_cs_ir","u":"https://arxiv.org/abs/2408.15002v2","kind":"article","date":"2024-08-27"}]
  - id: "articles/arxiv-cs-ir/d327abece7.md#c1"
    char_span: [2134, 2675]
    sentence_count: 1
    key_terms: [arxiv, https, org, information, doi, retrieval, version, abs]
    concepts: [arxiv, https, information, retrieval, version]
    related_chunks: ["articles/arxiv-cs-ir/d327abece7.md#c2"]
    token_count: 176
    sources: [{"n":"arxiv_cs_ir","u":"https://arxiv.org/abs/2408.15002v2","kind":"article","date":"2024-08-27"}]
  - id: "articles/arxiv-cs-ir/d327abece7.md#c2"
    char_span: [2699, 2932]
    sentence_count: 1
    key_terms: [arxiv, https, org, utc, show-email, shatri, elona, email]
    concepts: [arxiv, https]
    related_chunks: ["articles/arxiv-cs-ir/d327abece7.md#c1"]
    section: Submission history
    token_count: 103
    sources: [{"n":"arxiv_cs_ir","u":"https://arxiv.org/abs/2408.15002v2","kind":"article","date":"2024-08-27"}]
---
# Knowledge Discovery in Optical Music Recognition: Enhancing Information Retrieval with Instance Segmentation

Source: [arxiv_cs_ir](https://arxiv.org/abs/2408.15002v2)

Title: Knowledge Discovery in Optical Music Recognition: Enhancing Information Retrieval with Instance Segmentation

URL Source: https://arxiv.org/abs/2408.15002v2

Published Time: Mon, 24 Aug 2026 21:10:27 GMT

Markdown Content:
[View PDF](https://arxiv.org/pdf/2408.15002v2)[HTML (experimental)](https://arxiv.org/html/2408.15002v2)

> Abstract:Optical Music Recognition (OMR) automates the transcription of musical notation from images into machine-readable formats like MusicXML, MEI, or MIDI, significantly reducing the costs and time of manual transcription. This study explores knowledge discovery in OMR by applying instance segmentation using Mask R-CNN to enhance the detection and delineation of musical symbols in sheet music. Unlike Optical Character Recognition (OCR), OMR must handle the intricate semantics of Common Western Music Notation (CWMN), where symbol meanings depend on shape, position, and context. Our approach leverages instance segmentation to manage the density and overlap of musical symbols, facilitating more precise information retrieval from music scores. Evaluations on the DoReMi and MUSCIMA++ datasets demonstrate substantial improvements, with our method achieving a mean Average Precision (mAP) of up to 59.70\% in dense symbol environments, achieving comparable results to object detection. Furthermore, using traditional computer vision techniques, we add a parallel step for staff detection to infer the pitch for the recognised symbols. This study emphasises the role of pixel-wise segmentation in advancing accurate music symbol recognition, contributing to knowledge discovery in OMR. Our findings indicate that instance segmentation provides more precise representations of musical symbols, particularly in densely populated scores, advancing OMR technology. We make our implementation, pre-processing scripts, trained models, and evaluation results publicly available to support further research and development.

Comments:8 pages content and one references, accepted version at the International Conference on Knowledge Discovery and Information Retrieval 2024, Porto, Portugal
Subjects:Information Retrieval (cs.IR); Computer Vision and Pattern Recognition (cs.CV); Sound (cs.SD)
Cite as:[arXiv:2408.15002](https://arxiv.org/abs/2408.15002) [cs.IR]
(or [arXiv:2408.15002v2](https://arxiv.org/abs/2408.15002v2) [cs.IR] for this version)
[https://doi.org/10.48550/arXiv.2408.15002](https://doi.org/10.48550/arXiv.2408.15002)

arXiv-issued DOI via DataCite

## Submission history

From: Elona Shatri Miss [[view email](https://arxiv.org/show-email/64c52b6b/2408.15002)]   
**[[v1]](https://arxiv.org/abs/2408.15002v1)** Tue, 27 Aug 2024 12:34:41 UTC (11,073 KB)  
**[v2]** Mon, 16 Sep 2024 11:38:10 UTC (11,073 KB)
