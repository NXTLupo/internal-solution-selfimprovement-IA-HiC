---
id: social-intelligence/reddit-deep/artificial/1sjgytc.md
url: "https://www.reddit.com/r/artificial/comments/1sjgytc/claude_cannot_be_trusted_to_perform_complex/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "Claude cannot be trusted to perform complex engineering tasks"
author: "Infinite-pheonix"
date: "2026-04-12T15:05:48.000Z"
score: 178
upvote_ratio: 0.81
num_comments: 116
flair: "Discussion"
extracted_at: "2026-05-11T17:27:04.774Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1sjgytc.md#c0"
    char_span: [0, 2001]
    sentence_count: 21
    key_terms: [claude, thinking, workflow, engineering, model, anthropic, amd, code]
    token_count: 441
  - id: "social-intelligence/reddit-deep/artificial/1sjgytc.md#c1"
    char_span: [2015, 3484]
    sentence_count: 5
    key_terms: [infinite-pheonix, insight, expensive, providing, increase, optimize, workflow, company]
    section: Comments
    token_count: 330
  - id: "social-intelligence/reddit-deep/artificial/1sjgytc.md#c2"
    char_span: [3487, 5467]
    sentence_count: 9
    key_terms: [claude-code, anthropics, https, com, github, issues, nborwankar, constant]
    section: Comments
    token_count: 505
  - id: "social-intelligence/reddit-deep/artificial/1sjgytc.md#c3"
    char_span: [5469, 7650]
    sentence_count: 11
    key_terms: [through, mcp, claude, keyhole, limited, running, access, people]
    section: Comments
    token_count: 495
---
# Claude cannot be trusted to perform complex engineering tasks

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1sjgytc/claude_cannot_be_trusted_to_perform_complex/)
Posted by **Infinite-pheonix** · **178↑** · **116 comments**

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

## Comments

- **RecalcitrantMonk** (72↑): Great insight - "Every AI company will optimize for their margins, not your workflow" 

This harkens back to the way social media platforms were designed to increase engagement rather than providing insight and value. And strangely in this situation, it's more about keeping people on the platform and constantly sucking tokens.
  - **Manitcor** (5↑): \> Great insight - "Every AI company will optimize for their margins, not your workflow"

Consider this carefully when looking at a service provider and how they set themselves up. If they pretend everything needs to happen in the cloud for example, thats a red flag.
  - **Infinite-pheonix** (7↑): And maybe I missed it but the api can be more dependable than standard subscription usage. But pricing will be high.
    - **Blando-Cartesian** (2↑): Every trick to increase reliability makes the service slower and burns more expensive tokens that the services can’t afford. It makes most business sense to sell more expensive premium subscriptions while still providing just barely enough value to go with vendor locking.
- **dermflork** (31↑): yea it really doesnt even read 80% of the context its supposed to and then they probably charge you for all the stuff you upload
  - **Infinite-pheonix** (7↑): Exactly and we will never be able to understand what's happening behind closed models thinking levels.
    - **Strong-Violinist8576** (-15↑): There is zero "thought" to these models.


Use accurate language. They're fancy LLMs. They do not think. They do not reason. They do not have opinions. They don't even "answer", they provide a statistically generated response.
- **Nikkunikku** (13↑): Sauce?
  - **__aSquidsBody__** (2↑): Probably: [https://github.com/anthropics/claude-code/issues/42796](https://github.com/anthropics/claude-code/issues/42796)
- **hcloud00** (10↑): source for this?
  - **ChristmasStrip** (6↑): https://www.theregister.com/2026/04/06/anthropic_claude_code_dumber_lazier_amd_ai_director/
  - **__aSquidsBody__** (3↑): Original ticket: [https://github.com/anthropics/claude-code/issues/42796](https://github.com/anthropics/claude-code/issues/42796)
- **KomithErr404** (7↑): I also cannot be trusted to perform complex engineering tasks
- **nborwankar** (12↑): Important fix - use local models, which by nature stay constant in capability given constant resources.
  - **Infinite-pheonix** (5↑): The size of models makes it a requirement of big hardware investment which many can't do.
    - **nborwankar** (4↑): The large companies are paying millions a year for Claude contracts. It’s a CapEx vs OpEx thing. 

The hardware becomes obsolete fast so you want Anthropic to worry about that and they let the hyperscalers worry about it. 

And normally that’s the right approach but if it’s not giving you the service quality you need then the CapEx option is worth considering.
- **dorongal1** (3↑): ran into this a few months back — was using claude code for a refactoring project and noticed it started skipping file reads it definitely would've done before. just confidently editing things it hadn't looked at. took me a while to realize the baseline behavior had actually shifted, not my prompts.

the zero thinking tokens part is what should concern people most. when it's coasting instead of reasoning on complex turns you get plausible-looking code that's wrong in subtle ways — worse than obvious errors because it passes casual review.

the real AMD story to me isn't "claude bad" though, it's running 50+ concurrent sessions on a closed model that can silently change under you with no verification layer. that's a dependency risk regardless of which provider you pick.
- **BogdanPradatu** (3↑): Is anybody still writing their reddit posts by hand nowadays?
- **Automatic-Ad9652** (3↑): "But here’s what most people are missing." => 100 % AI written text with no human quality control. Please step up.
- **End3rWi99in** (7↑): One of the big drivers for Claude recently for a lot of people using it professionally are its MCP Connectors. While this opens up a ton of access to proprietary data, it comes at a significant drawback a lot of people do not realize up front. 

Accessing data through an MCP basically forces the LLM to try and analyze information through a keyhole. It can only look through a very limited dataset relative to the broader library it may be able to access through the MCP. As a result, I believe it may produce compelling deliverables that are severely limited and missing the full picture of what someone might need to know about a given topic. 

This may fall outside of the specific challenge mentioned in this thread, but it's something tools like Claude will continue to struggle with if they don't have the information in house. I see it first hand when running deep research 1:1 using Claude with my company's internal data fed through MCP, versus what I know is in our actual library. 

If what it is producing is always a very limited version, it becomes hard to really ever trust the end result of its work.
  - **FaceDeer** (3↑): Isn't this always going to be the case, though? Even if you're running a local AI you wouldn't want to just dump millions of tokens into the context and hope the LLM can find whatever it needs to find on its own. You're going to need to give it access to a curated subset, and that will be done through that "keyhole." You need to design the keyhole to be large enough and aimed at the right things regardless of who your provider is.
  - **SpeakCodeToMe** (0↑): I'm still shocked MCP has become the defacto standard with how verbose and janky it is.
