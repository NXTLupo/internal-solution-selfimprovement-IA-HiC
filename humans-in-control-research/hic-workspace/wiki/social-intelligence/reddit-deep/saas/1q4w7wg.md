---
id: social-intelligence/reddit-deep/saas/1q4w7wg.md
url: "https://www.reddit.com/r/SaaS/comments/1q4w7wg/enterprise_buyers_keep_asking_ai_security/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "Enterprise buyers keep asking AI security questions that startups can't answer"
author: "Educational_Force788"
date: "2026-01-05T19:58:05.000Z"
score: 1
upvote_ratio: 1
num_comments: 3
flair: ""
extracted_at: "2026-06-14T15:28:21.904Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1q4w7wg.md#c0"
    char_span: [0, 1489]
    sentence_count: 12
    key_terms: [security, questions, because, "they're", model, traditional, data, keep]
    concepts: [security, questions, because, "they're", traditional]
    token_count: 329
    sources: [{"n":"reddit-deep: r/saas","u":"https://www.reddit.com/r/SaaS/comments/1q4w7wg/enterprise_buyers_keep_asking_ai_security/"}]
  - id: "social-intelligence/reddit-deep/saas/1q4w7wg.md#c1"
    char_span: [1503, 2130]
    sentence_count: 6
    key_terms: [prompts, flowing, data, don, tylerthechaos, traditional, embeddings, especially]
    concepts: [prompts, flowing]
    section: Comments
    token_count: 140
---
# Enterprise buyers keep asking AI security questions that startups can't answer

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1q4w7wg/enterprise_buyers_keep_asking_ai_security/)
Posted by **Educational_Force788** · **1↑** · **3 comments**

I've been talking to a lot of Series A-B founders lately, and there's a pattern I keep seeing: 

They're building with AI, moving fast, getting traction. Then an enterprise buyer asks: "How do you secure your AI systems?" or an investor asks: "What's your AI security posture?" And they realize they don't have good answers. Not because they're careless, but because AI security is different from traditional security. 

Here are the questions that keep coming up: 

1. Prompt injection - How do you prevent users from manipulating your AI's behavior through crafted inputs? 
2. Training data leakage - Can your model memorise and reveal sensitive information it was trained on? 
3. Model extraction - Can someone reverse-engineer your model by querying it? 
4. RAG poisoning - If you're using retrieval-augmented generation, can someone inject malicious content into your knowledge base? 
5. Data exposure - What sensitive data is flowing into your prompts or being logged? 

Most traditional security teams don't know how to assess these risks because they're AI-specific. If you're building with AI and facing these questions from buyers or investors, what has your experience been? What resources have you found helpful?

## Comments

- **Tylerthechaos** (2↑): This resonates a lot. What I’ve seen is founders aren’t ignoring security, they just don’t have a mental model for AI risk yet. Traditional controls don’t map cleanly to prompts, RAG pipelines, or embeddings. One thing that helped us was getting visibility into what sensitive data was actually flowing into prompts and logs using Cyera. That at least gave us concrete answers instead of hand waving.
  - **Educational_Force788** (1↑): Knowing what data is flowing into prompts is massive. especially if you're in a regulated industry or have to follow HIPPA etc. Glad you were able to fin a solution!
