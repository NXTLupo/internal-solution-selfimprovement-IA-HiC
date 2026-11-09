---
id: social-intelligence/reddit-deep/productdesign/1wc5swo.md
url: "https://www.reddit.com/r/productdesign/comments/1wc5swo/any_solo_designers_here_how_do_you_keep_your/"
kind: "social-post"
source: "reddit-deep: r/productdesign"
subreddit: "productdesign"
title: "Any Solo designers here? How do you keep your brain from exploding?"
author: "iwillsenditback"
date: "2026-09-10T02:11:24.000Z"
score: 2
upvote_ratio: 0.67
num_comments: 4
flair: ""
extracted_at: "2026-09-10T17:19:06.261Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/productdesign/1wc5swo.md#c0"
    char_span: [0, 1561]
    sentence_count: 16
    key_terms: ["i'm", like, product, productdesign, feel, keep, comments, designer]
    concepts: [productdesign, product, comments, designer, maintain]
    token_count: 381
    sources: [{"n":"reddit-deep: r/productdesign","u":"https://www.reddit.com/r/productdesign/comments/1wc5swo/any_solo_designers_here_how_do_you_keep_your/"}]
  - id: "social-intelligence/reddit-deep/productdesign/1wc5swo.md#c1"
    char_span: [1576, 3483]
    sentence_count: 8
    key_terms: [system, notes, docs, everything, databases, decisions, expecting, matters]
    concepts: [system, everything, notes, databases, decisions]
    section: Comments
    token_count: 429
  - id: "social-intelligence/reddit-deep/productdesign/1wc5swo.md#c2"
    char_span: [3485, 5463]
    sentence_count: 19
    key_terms: [design, prototypes, get, time, aesthetic, ai-can-do-more-with-less, library, manager]
    concepts: [prototypes, design, aesthetic, library, manager]
    section: Comments
    token_count: 452
---
# Any Solo designers here? How do you keep your brain from exploding?

Source: [reddit-deep: r/productdesign](https://www.reddit.com/r/productdesign/comments/1wc5swo/any_solo_designers_here_how_do_you_keep_your/)
Posted by **iwillsenditback** · **2↑** · **4 comments**

I work for a small SaaS company, and I'm the only UX/product designer here. I sorta like the agency it gives me, but as someone with attention issues and OCD, I'm also sorta losing it. I'm expected to:

\- Do all of the product design for web, mobile web, and mobile  
\- Configure and maintain the UI library in Figma  
\- Help with creation of social posts, and internal design needs, such as posters, t-shirts, stickers, mugs, etc.  
\- Build and maintain the brand guide

Again, it's not all bad, I like having major impact for once. I'll take this any day over the large corporate job I came from. But I don't know how to keep up. How do I keep meeting notes, product requirement notes, component documentation, feature ideation, research, roadmapping, etc all organized in a way that makes me feel like I'm not always drowning?

I've tried Notion. It's been pretty good. I use a ton of AI tools and do a lot of experimentation in that area. But still. I feel over my head all the time.

And maybe that's all of us right now? Anyway, looking for tips on how to save sanity and feel like I have SOME pattern to my work. I think my employer still thinks that AI will magically fill in the gaps, and we can get away with only one designer, so I'm sort of waiting for them to wake up a bit.

## Comments

- **isuruar** (2↑): Solo (or near-solo) designer here too, and yeah, this hits close to home. A few things that have kept me sane:

**One system of record, not five.** I run everything through Notion as a "second brain" — but the key was stopping the sprawl of scattered docs and consolidating into structured databases: a product manual (business model, concepts, decisions), meeting notes, and research all living as linked pages rather than orphaned docs. If it's not in one of a handful of databases, it doesn't exist. That constraint alone cuts a lot of the "where did I put that" anxiety.

**Let AI handle capture, not thinking.** I use Granola for meeting notes and have it auto-sync into a daily standup brief that pulls yesterday's notes plus my in-progress tickets from Linear — so I'm never manually reconstructing "what did I even do yesterday." The AI's job is compression and retrieval; the judgment calls (what matters, what's a priority) stay mine. That distinction matters — I've noticed the trap is expecting AI to fill actual design-decision gaps, which it can't, versus using it to kill the admin overhead around those decisions. It sounds like your employer's expecting the former from you; you want to aim it at the latter.

**Tickets/roadmap live in one tool, not your head.** Everything actionable goes into Linear (or whatever your team uses) — not as a personal to-do list, but as the actual system of truth, cross-referenced with the Notion docs. If a task isn't ticketed, it's not real work yet, which helps when you're being pulled toward "urgent" mug-design requests mid-sprint.

**Separate "system maintenance" from "production."** Config/library work (Figma UI kit, brand guide, tokens) tends to bleed into every day in small annoying chunks. Batching it — even one protected block a week — instead of letting it interrupt constantly helps more than it sounds like it should.

On the "waiting for them to wake up" part — I'd gently push back on waiting. Bring receipts: track where your time actually goes for two weeks (meetings vs. production design vs. brand/swag requests vs. system maintenance) and show it to your manager as data, not a complaint. That's usually a faster route to headcount or reprioritization than hoping the AI-can-do-more-with-less narrative dies on its own.

You're not wrong that this is a lot of us right now. The tools have gotten good enough that leadership assumes they replace a second hire — they replace hours, not a whole role.
- **vinylbrowser** (1↑): I’m experimenting with Linear MCP atm and it’s working well. Ie have a product manager agent run it for you. It create tasks, writes requirements etc, that I can then delegate to coding agents to build. 

One of the biggest time drains imo / least productive use time for someone like yourself is wasting energy and focus on creating the aux design stuff, T-shirts, “banners” etc … I’ve been there … feel your pain 😣
- **ebolapasta** (1↑): I’m in the same boat. I try and treat various AI tools like a junior designer. I get Claude to make rough prototypes that I refine. I get the Figma agent to do a rough pass of a screen. I basically use AI to help with the blank page problem. It helps to get me started faster but it still requires me to think critically.
- **Responsibullion** (1↑): Same. 

We recently adopted Mantine for the front end framework, and didn't change a thing.  
  
This makes it easy to create AI skills based on a well documented existing library, and generated prototypes generally line up with the desired aesthetic. I often go from sketches right into to interactive prototypes. No need to push pixels in figma or maintain a custom UI library. 

For social media and SWAG design asks, I found a coworker who is an over-qualified data labeler with a good sense of aesthetic, and now we almost have a design team. 

We don't have a roadmap...
