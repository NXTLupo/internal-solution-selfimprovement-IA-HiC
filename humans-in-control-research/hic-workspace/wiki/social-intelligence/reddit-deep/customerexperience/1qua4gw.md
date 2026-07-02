---
id: social-intelligence/reddit-deep/customerexperience/1qua4gw.md
url: "https://www.reddit.com/r/customerexperience/comments/1qua4gw/containment_how_do_you_actually_measure_in_the/"
kind: "social-post"
source: "reddit-deep: r/customerexperience"
subreddit: "customerexperience"
title: "Containment --> How do you actually measure in the contact center?"
author: "DialogueDev"
date: "2026-02-02T22:36:19.000Z"
score: 2
upvote_ratio: 1
num_comments: 6
flair: ""
extracted_at: "2026-06-14T15:28:06.936Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/customerexperience/1qua4gw.md#c0"
    char_span: [0, 1209]
    sentence_count: 8
    key_terms: [agent, containment, understanding, customerexperience, contact, center, conversations, deflection]
    concepts: [agent, containment, understanding, customerexperience, conversations]
    related_chunks: ["social-intelligence/reddit-deep/customerexperience/1qua4gw.md#c2"]
    token_count: 257
    sources: [{"n":"reddit-deep: r/customerexperience","u":"https://www.reddit.com/r/customerexperience/comments/1qua4gw/containment_how_do_you_actually_measure_in_the/"}]
  - id: "social-intelligence/reddit-deep/customerexperience/1qua4gw.md#c1"
    char_span: [1223, 2128]
    sentence_count: 5
    key_terms: [conversations, measure, representative, total, automation, resolved, survey, agent]
    concepts: [conversations, measure, representative, automation, total]
    section: Comments
    token_count: 187
  - id: "social-intelligence/reddit-deep/customerexperience/1qua4gw.md#c2"
    char_span: [2133, 3802]
    sentence_count: 10
    key_terms: [measure-ai-agent-performance-in-the-contact-center, containment, contact, blog, center, agent, deflection, customers]
    concepts: [measure-ai-agent-performance-in-the-contact-center, containment, contact, center, agent]
    related_chunks: ["social-intelligence/reddit-deep/customerexperience/1qua4gw.md#c0"]
    section: Comments
    token_count: 370
---
# Containment --> How do you actually measure in the contact center?

Source: [reddit-deep: r/customerexperience](https://www.reddit.com/r/customerexperience/comments/1qua4gw/containment_how_do_you_actually_measure_in_the/)
Posted by **DialogueDev** · **2↑** · **6 comments**

**Context:** I work on the AI Agents side of things and collaborate closely with the contact center. I feel that a lot of contact center folks I work with are talking about containment and deflection in the same way, and I want to check my understanding of the following metrics:

**1. AI Agent Deflection**: The % of customer inquiries that are handled by the agent without being transferred to a human agent.  
**2. AI Agent Containment**: The % of customer conversations that are handled by an AI agent, and the user doesn’t return to another channel with the same problem.

Is my understanding correct?  
  
**Then an extra question for the pros:** If I am understanding containment correctly, how do you actually measure it? I'd say a large majority of my AI Agent interactions are not authenticated/logged-in conversations. That means I can't easily track if one person talked to my AI Agent, then tried another channel later.

## Comments

- **Shogun_killah** (2↑): If you’ve not come from the contact centre background… 

They will pick a representative measure that’s easy to capture and report on. They’re not interested in how accurate that measure is - that’s up to you.

So in this case you could either review and score the conversation post interaction or only use the stats from those customers that do log in as your measure. Or a combination of both.
  - **DialogueDev** (1↑): u/Shogun_killah what would an example of a representative measure be? In the agent automation world I usually measure the following: 

* **Deflection:** Conversations handled without an agent / total conversations
* **Automation:** Conversations where the issue was resolved from our perspective / total conversations
* **Solution rate:** Conversations where the user confirmed their issue was resolved in survey / total conversations with a survey response

  
I thought containment was only a measure of **issues handled where the customer didn't go to another channel for additional help**? But containment is discussed differently in every company so I'm not sure anymore
    - **Shogun_killah** (2↑): In the definition above it seems to include repeat contact; so for logged in customers I’d measure where a customer has used your bot but then called in to the contact centre as well within an arbitrary time period - as a failure. And where they haven’t then gone on to contact a human agent then that would be a pass.
- **quietvectorfield** (2↑): Track "re-open rate" not just deflection. If your bot replied and someone emailed in 2 hours later saying they're confused, you def didn't contain shit. You just deferred the ticket.
- **ops_architectureset** (2↑): Learn from my mistakes... be careful with KPIs that include "containment". You end up gaming the system by making it harder for customers to talk to a human being, inflating that metric while tanking CSAT.
- **DialogueDev** (1↑): Thanks, everyone, for all your feedback! You helped me finish my blog for my company on contact center metrics for AI Agent Teams working with a contact center for the first time, and it was really helpful to get all your input on containment! That is the metric that lots of us AI Agent builders are struggling with when we work with contact center folks. I always felt containment was being conflated with deflection, but you helped me to a better understanding. 

Here's the blog: [https://rasa.com/blog/measure-ai-agent-performance-in-the-contact-center](https://rasa.com/blog/measure-ai-agent-performance-in-the-contact-center)
