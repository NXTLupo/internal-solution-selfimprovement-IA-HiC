---
id: social-intelligence/reddit-deep/insurtech/1magrit.md
url: "https://www.reddit.com/r/InsurTech/comments/1magrit/case_study_ai_cut_claimprep_time_45_19_min_at_a/"
kind: "social-post"
source: "reddit-deep: r/insurtech"
subreddit: "insurtech"
title: "[Case Study] AI cut claim-prep time 45 → 19 min at a big auto insurer in USA"
author: "not_bsb7838"
date: "2025-07-27T08:02:33.000Z"
score: 2
upvote_ratio: 0.75
num_comments: 1
flair: ""
extracted_at: "2026-06-20T17:51:48.343Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/insurtech/1magrit.md#c0"
    char_span: [0, 1318]
    sentence_count: 5
    key_terms: [revolutionizing-auto-insurance-claims-with-processq, min, claim-prep, insurtech, comments, insurer, scalong, models]
    concepts: [claim-prep, insurtech, comments, insurer, scalong]
    token_count: 362
    sources: [{"n":"reddit-deep: r/insurtech","u":"https://www.reddit.com/r/InsurTech/comments/1magrit/case_study_ai_cut_claimprep_time_45_19_min_at_a/"}]
  - id: "social-intelligence/reddit-deep/insurtech/1magrit.md#c1"
    char_span: [1332, 1766]
    sentence_count: 4
    key_terms: [insurance, space, trust, get, transparency, suggestions, meaningful, engineers]
    concepts: [insurance, space, trust]
    section: Comments
    token_count: 91
---
# [Case Study] AI cut claim-prep time 45 → 19 min at a big auto insurer in USA

Source: [reddit-deep: r/insurtech](https://www.reddit.com/r/InsurTech/comments/1magrit/case_study_ai_cut_claimprep_time_45_19_min_at_a/)
Posted by **not_bsb7838** · **2↑** · **1 comments**

Hey everyone – I’m Berwin, one of the folks behind ExtractQ at Scalong.

**Problem**  
Adjusters at a mid-size auto insurer were re-typing 30-40 fields per claim, then waiting days for validation.

**What we built**  
• Vision model + Claude 3.7 Sonnet (AWS Bedrock)  
• Optimized pipeline: any PDF/Form → clean JSON (minimal training)  
• Serverless validator that pings internal policy DB + DMV/VIN APIs  
• REST hook into the core claims app

**Impact (first 90 days)**  
– Claim-prep time: 45 min → 19 min (-75 %)  
– Data-entry errors: -85 %  
– ~US $1.5 M annualised ops savings

**Looking for feedback on**  
1. Better ways to surface edge-case pages (handwriting, photo receipts)  
2. Keeping full audit trails when models get re-trained  
3. Multi-carrier scale – separate pipelines or shared tenancy?

Full case-study & before/after flow graphic (no paywall):  
https://www.scalong.com/case-studies/revolutionizing-auto-insurance-claims-with-processq

Happy to nerd out on models, infra costs, or the ugly bits we hit in prod – fire away!

## Comments

- **Interesting_Brain880** (1↑): I’m trying to get into the insurance space. I have a strong team of engineers, but I’ve heard that many insurance agencies tend to be cautious and prefer to work with people they already trust.

I want to build something meaningful and impactful in the AI space with honesty and transparency at the core. Do you have any advice or suggestions on how I could get started or earn trust in this industry?
