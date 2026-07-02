---
id: articles/reddit-deep-r-artificial/9bc3d73cbf.md
url: "https://www.reddit.com/r/artificial/comments/1sjgytc/claude_cannot_be_trusted_to_perform_complex/"
url_hash: "9bc3d73cbf"
kind: "article"
source: "Reddit Deep: r/artificial"
title: "Claude cannot be trusted to perform complex engineering tasks"
author: ""
date: "2026-04-12T15:05:48.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:30:16.440361+00:00"
chars: 3378
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "articles/reddit-deep-r-artificial/9bc3d73cbf.md#c0"
    char_span: [0, 2072]
    sentence_count: 21
    key_terms: [claude, workflow, thinking, engineering, model, anthropic, amd, code]
    concepts: [claude, workflow, thinking, engineering, anthropic]
    token_count: 453
    sources: [{"n":"Reddit Deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1sjgytc/claude_cannot_be_trusted_to_perform_complex/"}]
  - id: "articles/reddit-deep-r-artificial/9bc3d73cbf.md#c1"
    char_span: [2074, 3580]
    sentence_count: 11
    key_terms: [infinite-pheonix, expensive, providing, increase, insight, service, models, tokens]
    concepts: [infinite-pheonix, expensive, providing, increase, insight]
    token_count: 324
---
# Claude cannot be trusted to perform complex engineering tasks

Source: [Reddit Deep: r/artificial](https://www.reddit.com/r/artificial/comments/1sjgytc/claude_cannot_be_trusted_to_perform_complex/)

AMD’s AI director just analyzed 6,852 Claude Code sessions, 234,760 tool calls, and 17,871 thinking blocks.

Her conclusion: “Claude cannot be trusted to perform complex engineering tasks.”

Thinking depth dropped 67%. Code reads before edits fell from 6.6 to 2.0. The model started editing files it hadn’t even read. 

Stop-hook violations went from zero to 10 per day.

Anthropic admitted they silently changed the default effort level from “high” to “medium” and introduced “adaptive thinking” that lets the model decide how much to reason. 

No announcement. No warning.

When users shared transcripts, Anthropic’s own engineer confirmed the model was allocating ZERO thinking tokens on some turns. 

The turns with zero reasoning? Those were the ones hallucinating.

AMD’s team has already switched to another provider.

But here’s what most people are missing. 

This isn’t just a Claude story.

AMD had 50+ concurrent sessions running on one tool. 

Their entire AI compiler workflow was built around Claude Code. One silent update broke everything.

That’s vendor lock-in. And it will keep happening.

→ Every AI company will optimize for their margins, not your workflow

→ Today’s best model is tomorrow’s second choice

→ If your workflow can’t survive a provider switch, you don’t have a workflow. You have a dependency

The fix is simple: stay multi-model.

→ Use tools like Perplexity that let you swap between Claude, GPT, Gemini in one interface

→ Learn prompt engineering that works across models, not tricks tied to one

→ Test alternatives monthly because the rankings shift fast

Laurenzo said it herself: “6 months ago, Claude stood alone. Anthropic is far from alone at the capability tier Opus previously occupied.”

--- TOP COMMENTS ---
[72↑ RecalcitrantMonk] Great insight - "Every AI company will optimize for their margins, not your workflow" 

This harkens back to the way social media platforms were designed to increase engagement rather than providing insight and value. And strangely in this situation, it's more about keeping people on the platform and constantly sucking tokens.
[5↑ Manitcor] \> Great insight - "Every AI company will optimize for their margins, not your workflow"

Consider this carefully when looking at a service provider and how they set themselves up. If they pretend everything needs to happen in the cloud for example, thats a red flag.
[7↑ Infinite-pheonix] And maybe I missed it but the api can be more dependable than standard subscription usage. But pricing will be high.
[2↑ Blando-Cartesian] Every trick to increase reliability makes the service slower and burns more expensive tokens that the services can’t afford. It makes most business sense to sell more expensive premium subscriptions while still providing just barely enough value to go with vendor locking.
[31↑ dermflork] yea it really doesnt even read 80% of the context its supposed to and then they probably charge you for all the stuff you upload
[7↑ Infinite-pheonix] Exactly and we will never be able to understand what's happening behind closed models thinking levels.
[-15↑ Strong-Violinist8576] There is zero "thought" to these models.


Use accurate language. They're fancy LLMs. They do not think. They do not reason. They do not have opinions. They don't even "answer", they provide a statistically generated response.
[13↑ Nikkunikku] Sauce?
