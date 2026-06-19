---
id: social-intelligence/reddit-deep/productmanagement/1nja8z7.md
url: "https://www.reddit.com/r/ProductManagement/comments/1nja8z7/how_do_you_level_up_fast_on_ai/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "How do you level up fast on AI governance/compliance/security as a PM?"
author: "Sad-Boysenberry8140"
date: "2025-09-17T11:14:40.000Z"
score: 6
upvote_ratio: 0.75
num_comments: 6
flair: ""
extracted_at: "2026-06-14T15:28:02.847Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1nja8z7.md#c0"
    char_span: [0, 2168]
    sentence_count: 11
    key_terms: [governance, product, security, unstructured, enterprise, productmanagement, data, use]
    token_count: 490
  - id: "social-intelligence/reddit-deep/productmanagement/1nja8z7.md#c1"
    char_span: [2170, 2430]
    sentence_count: 2
    key_terms: [requirements, especially, governance, artifacts, learnings, resources, templates, translate]
    token_count: 48
  - id: "social-intelligence/reddit-deep/productmanagement/1nja8z7.md#c2"
    char_span: [2445, 4576]
    sentence_count: 15
    key_terms: [data, governance, questions, get, legal, start, specialists, need]
    section: Comments
    token_count: 479
---
# How do you level up fast on AI governance/compliance/security as a PM?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1nja8z7/how_do_you_level_up_fast_on_ai/)
Posted by **Sad-Boysenberry8140** · **6↑** · **6 comments**

tl;dr - Looking for advice from PMs who’ve done this: how do you research, who/what do you follow, what does “good” governance look like in a roadmap, and any concrete artifacts/templates/researches that helped you?

I’m a PM leading a new RAG initiative for an enterprise BI platform, solving a variety of use cases combining the CDW and unstructured data. I’m confident on product strategy, UX, and market positioning, but much less experienced on the governance/compliance/legal/security side of AI from a more Product perspective. I don’t want to hand-wave this or treat it as “we’ll figure it out later” and need some guidance on how to get this right from the start. Naturally, when we come to BI, companies are very cautious about their CDW data leaks and unstructured is a very new area for them - governance around this and communicating trust is insanely important to find the users who will use my product at all.

What I’m hoping to learn from this community:

1. How do you structure your research and decision-making in these domains?
2. Who and what do you follow to stay current without drowning?
3. What does “good” look like for an AI PM bringing governance into a product roadmap?
4. Any concrete artifacts or checklists you found invaluable?

\- - -  
  
Context on what I’m building:

* Customers with strict data residency, PII constraints, and security reviews
* LLM-powered analytics for enterprise customers
* Mix of structured + unstructured sources (Drive, Slack, Jira, Salesforce, etc.)
* Enterprise deployments with multi-tenant and embedded use cases

What I’ve read so far (and still feel a tad bit directionless):

* Trust center pages and blog posts from major vendors
* EU AI Act summaries, SOC 2/ISO 27001 basics, NIST AI Risk Management Framework
* A few privacy/security primers — but I’m missing the bridge from “reading” to “turning this into a product plan”

Would love to hear from PMs who’ve been through this — your approach, go-to resources, and especially the templates/artifacts you used to translate governance requirements into product requirements. Happy to compile learnings into a shared resource if helpful.

## Comments

- **meknoid333** (5↑): Generally you’d work with people who are specialists in these areas - legal and risk teams. 

They’re need to be involved anyway to approve whatever system you’re going with.

If you’re just doing this on your own then I assume you’re trying to sell to enterprise and know that each large company who needs to care about these things will require legal involvement to get the types of approvals you’re looking for and it’ll likely be relatively bespoke based on their industry and risk tolerance.

Hence why having specialists in these areas matter - you can ask this same question in ChatGPT to get a check list of key things to be aware of and ask it for questions you may need answers to to create a starting point as most of these situations have core questions across industry / ie how is data handled in the cloud with other data sources? Etc.

There is a high likelihood that you won’t get approval to use specific data give the sensitive nature unless your tool specifically states that no customer data is sent to the llms for any purpose - and even then you’ll
Need to prove it to their legal team who’ll have heavy fines ( insurance related ) associated with breach’s.

That’s just from the top of my head based on experience in the space
  - **amg-rx7** (2↑): What he said. It’s so much easier if you have resources like this that you can use for knowledge extraction. 

If you don’t have those resources available, then start firing questions on the various AI chats and start learning yourself. Before AI chat bots, you’d have to google to ends of the internet. 

Regulator websites are also a good resource. Read the rules and laws or their interpretations by others like McKinsey EY Deloitte etc.
- **genuineoutlaw** (4↑): Learn about 
Data governance,
AI governance - Evals and Observability metrics.
Check blue dot impact AI governance course. 

You can start with this.
- **b4ball** (1↑): I am 5 yrs of experience in AI gov as PM (yes, pretty much started when AI gov as a thing started). Happy to help
  - **MyCuriousSelf04** (1↑): hey, im just trying to get into this field can i pls dm?
