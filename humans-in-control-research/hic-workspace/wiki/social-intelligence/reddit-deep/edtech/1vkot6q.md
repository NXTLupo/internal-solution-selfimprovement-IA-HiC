---
id: social-intelligence/reddit-deep/edtech/1vkot6q.md
url: "https://www.reddit.com/r/edtech/comments/1vkot6q/using_notebooklm_for_creating_ee_grant/"
kind: "social-post"
source: "reddit-deep: r/edtech"
subreddit: "edtech"
title: "Using NotebookLM for Creating EE Grant & Scholarship Analytic Apps"
author: "UncommonCode"
date: "2026-08-10T15:57:02.000Z"
score: 4
upvote_ratio: 0.7
num_comments: 2
flair: ""
extracted_at: "2026-10-01T20:49:35.648Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/edtech/1vkot6q.md#c0"
    char_span: [0, 2655]
    sentence_count: 13
    key_terms: [scholarships, foundation, high, members, scholarship, review, board, notebooks]
    concepts: [scholarships, foundation, scholarship, members, review]
    token_count: 485
    sources: [{"n":"reddit-deep: r/edtech","u":"https://www.reddit.com/r/edtech/comments/1vkot6q/using_notebooklm_for_creating_ee_grant/","kind":"social-post","date":"2026-08-10","author":"UncommonCode","subreddit":"edtech"}]
  - id: "social-intelligence/reddit-deep/edtech/1vkot6q.md#c1"
    char_span: [2657, 5036]
    sentence_count: 16
    key_terms: [matching, grants, notebook, comprehensive, non-compliant, board, scholarship, data]
    concepts: [matching, grants, notebook, comprehensive, non-compliant]
    token_count: 440
    sources: [{"n":"individual student profiles formatted as structured data, a comprehensive \"text-","u":""}]
---
# Using NotebookLM for Creating EE Grant & Scholarship Analytic Apps

Source: [reddit-deep: r/edtech](https://www.reddit.com/r/edtech/comments/1vkot6q/using_notebooklm_for_creating_ee_grant/)
Posted by **UncommonCode** · **4↑** · **2 comments**

**My Ask**: I'd like to connect with others who are using notebooks in high school foundation settings to evaluate EE grants & scholarships.

(P.S. Recognizing that drafting and editing aren't my strongest skills, I leaned heavily on Gemini to proofread, refine, and polish my text throughout this process.).

\----------------------------------------------

**Background**: Like most small high schools, our Foundation awards dollars to high school staff alongside student scholarships.

**Grants**: Historically, our high school foundation grant evaluation was a highly manual process. Staff members submitted standard application forms that were compiled for an annual funding review. Prior to our board funding review meetings, members were tasked with manually sifting through numerous PDF files to evaluate applications and check for specific policy violations—such as identifying requests for restricted items like unhealthy foods.

Submissions that failed to meet the high school's compliance standards were denied, but uncovering these violations was labor-intensive. It required the board to painstakingly read through detailed project narratives and manually cross-reference them with itemized expense reports before making a final approval decision.

**Scholarships**: The Foundation is fortunate to manage a diverse portfolio of over 30 distinct scholarships and endowments. However, administering these awards has historically presented a daunting logistical challenge. Each scholarship carries its own highly specific set of criteria—spanning GPA and SAT requirements, community service hours, extracurricular and athletic participation, preferred colleges or trade schools, and intended majors.

In the past, the selection and matching process was entirely manual. Board members were sent 100+ page PDF file of student submissions and transcripts to review independently, tasked with trying to mentally cross-reference individual candidates against the myriad of specific award requirements. After members submitted their individual selections, the board would convene for a lengthy review meeting, hashing out the details and negotiating to build a consensus on the final student-to-scholarship matches.

All the above was motivation to see we could you the analytics in Notebooks to streamline our processes.

Solution: I developed two notebooks - EE Grants Auditor and Scholarship Evaluator

**EE Grants Auditor** \- The sources I provide this notebook are Policy Guidelines, Scoring Guidelines and a gsheet of the grants submitted. The notebook crunches through all this produce a summary table of grants that were Non-Compliant, Provisional-Passed and Passed. This approach enabled the board to focus ONLY on the non-compliant submissions - i.e. reject or ask the staff member to correct before funding. So in the first run of this last year, this reduced the board workload by 80% - while also being much more comprehensive that we expected. All good news.

**Scholarship-Student Matching**: To overcome the daunting challenge of matching students to over 30 distinct awards, the foundation transitioned to a structured, AI-driven workflow using NotebookLM. This matching process is significantly more complex than auditing grants.

The new system is powered by three core data sources: individual student profiles formatted as structured data, a comprehensive "text-database" outlining the specific criteria for every scholarship, and standardized scoring rubrics that translate GPAs, SAT scores, and community service into objective numerical values. Instead of manual cross-referencing, the notebook performs the heavy analytical lifting. It generates a consolidated summary report for the board, detailing each scholarship alongside a recommended recipient, a quantitative matching score, a clear rationale for the selection, and a list of qualified runner-ups.

**Lessons Learned**: Ultimately, building out these digital evaluation workflows has been an engaging and rewarding learning experience. While NotebookLM is highly effective for managing this kind of administrative data, the platform still has room to mature.

A significant challenge—often echoed in community forums—is "AI drift," which frequently occurs when a workspace becomes overloaded with too much retained information over time. To maintain accuracy, the most reliable workaround is to periodically delete all source documents and rebuild the knowledge base from scratch. This fresh-start approach ensures that the generated evaluations remain safe, predictable, and strictly grounded in the current files.

As a last side note, I also built the EE Auditor app in Claude and ChatGPT - GPT. However, both produced code that would require long term support - a non-started.

Thanks in advance
