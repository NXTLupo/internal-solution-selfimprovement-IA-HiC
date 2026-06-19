---
id: social-intelligence/reddit-deep/customerexperience/1s4y1bm.md
url: "https://www.reddit.com/r/customerexperience/comments/1s4y1bm/went_from_100_humanhandled_to_65_aiautomated_in/"
kind: "social-post"
source: "reddit-deep: r/customerexperience"
subreddit: "customerexperience"
title: "Went from 100% human-handled to 65% AI-automated in our contact centre in 3 months. Here's what actually worked (and what didn't)"
author: "Agent_D07"
date: "2026-03-27T08:10:12.000Z"
score: 17
upvote_ratio: 0.88
num_comments: 6
flair: ""
extracted_at: "2026-06-14T15:28:06.934Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/customerexperience/1s4y1bm.md#c0"
    char_span: [0, 2047]
    sentence_count: 3
    key_terms: [human-handled, customerexperience, agent, interaction, compliance, attrition, annually, comments]
    token_count: 479
  - id: "social-intelligence/reddit-deep/customerexperience/1s4y1bm.md#c1"
    char_span: [2049, 3099]
    sentence_count: 3
    key_terms: [weeks, time, documentation, multi-country, conservative, multilingual, negotiations, approaching]
    token_count: 204
  - id: "social-intelligence/reddit-deep/customerexperience/1s4y1bm.md#c2"
    char_span: [3114, 3991]
    sentence_count: 10
    key_terms: [implementation, platform, contact, story, did, powerful-ad4905, transformation, organizations]
    section: Comments
    token_count: 200
---
# Went from 100% human-handled to 65% AI-automated in our contact centre in 3 months. Here's what actually worked (and what didn't)

Source: [reddit-deep: r/customerexperience](https://www.reddit.com/r/customerexperience/comments/1s4y1bm/went_from_100_humanhandled_to_65_aiautomated_in/)
Posted by **Agent_D07** · **17↑** · **6 comments**

finally getting around to writing this up. CX Director at a european telecoms company, about 200 agents across 4 countries handling roughly 8k calls per day. we went through a pretty painful AI evaluation and deployment last year and figured id share what actually happened since theres a lot of vendor noise in this space.

where we started (june 2025):

\*   100% of interactions human-handled



\*   average handle time sitting at 7.5 minutes



\*   FCR at 68% (lots of callbacks for unresolved issues)



\*   agent attrition at 24% annually, mostly from repetitive work burnout



\*   compliance team had already killed two AI pilots because vendors couldnt explain how their AI made decisions



What we changed:

\*   mapped every interaction type into three buckets: fully automate, AI-assisted, human-only



\*   started with the boring stuff first: balance inquiries, appointment scheduling, basic troubleshooting, plan information



\*   deployed an AI platform using graph-based conversation protocols instead of prompted LLM (this was what got compliance to sign off, every decision path is visible and auditable)



\*   integrated with our existing Genesys Cloud CX for telephony and Salesforce for customer data



\*   kept same agent headcount but shifted complex work to humans



results after 3 months:

routine interaction automation: 0% → 65% (company-reported)

AHT: 7.5min → 5.2min (human-handled calls only, because agents stopped doing basic lookups)

FCR: 68% → 77% (AI collects structured info before routing)

agent attrition: 24% → 18% annually (early indicator but trending right)

CSAT: held flat at 82 which was honestly the goal, efficiency without quality regression

what was harder than expected: the multilingual piece nearly killed us. AI performance in french and german was solid but portuguese and dutch accuracy lagged for about 6 weeks before the system learned enough patterns. if youre multi-country, budget extra time for non-english languages.

also the compliance documentation took 3 weeks before deployment even started. EU AI Act article 13/14 alignment, DPA negotiations, on-prem security review. necessary but painful.

what id do differently: start with one queue and one language instead of trying to roll out everywhere at once. we did phased but should have been even more conservative.

remaining challenges: complex complaints still need humans and probably will for a long time. the AI knows when to escalate (sentiment monitoring helps) but the actual resolution of "im furious about my bill" requires judgment and empathy that AI doesnt have.

curious how others are approaching this. anyone else running AI in a regulated european contact centre? what does your automation split look like?

## Comments

- **Powerful-Ad4905** (1↑): Awesome! We are doing same, but for SMB customers. Finnish telecom operator is reselling our platform.

Would love to hear more about your story, DM me?
- **StipulateFred** (1↑): Great story. What AI platform did you use, who owned the implementation of it?
- **Del_Giocondo2022** (1↑): Well done and thanks for sharing your lessons learned.
Can I contact you for more? I'm responsible to lead the AI transformation in our Contact Centre. We are also using Genesys.
- **ClearWork-AI** (1↑): You got to 65% automation fast because you understood your actual workflows before you built the automations. Most organizations that struggle with AI implementation skip that step and try to train models on processes that were never clearly mapped. The fact that you did the groundwork upfront is probably the biggest reason you succeeded where others fail.
