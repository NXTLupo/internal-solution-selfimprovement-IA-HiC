---
id: social-intelligence/reddit-deep/designsystems/1vqxj3t.md
url: "https://www.reddit.com/r/DesignSystems/comments/1vqxj3t/ai_kept_rebuilding_components_i_already_had_so_i/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "AI kept rebuilding components I already had, so I built a tool that treats the design system as the source of truth"
author: "kr1sck"
date: "2026-08-17T16:46:05.000Z"
score: 2
upvote_ratio: 0.63
num_comments: 11
flair: ""
extracted_at: "2026-09-10T17:19:04.797Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c0"
    char_span: [0, 312]
    sentence_count: 1
    key_terms: [designsystems, comments, source, reddit-deep, components, rebuilding, already, design]
    concepts: [designsystems, comments, source]
    token_count: 85
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1vqxj3t/ai_kept_rebuilding_components_i_already_had_so_i/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c1"
    char_span: [314, 2740]
    sentence_count: 31
    key_terms: [component, components, system, design, kit, project, screen, source]
    concepts: [component, components, system, design, project]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c2", "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c3", "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c4"]
    token_count: 512
  - id: "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c2"
    char_span: [2403, 2953]
    sentence_count: 6
    key_terms: [components, component, ordinary, source, system, needs, token, implementation]
    concepts: [components, component, ordinary, source, system]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c1"]
    token_count: 107
  - id: "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c3"
    char_span: [2955, 4112]
    sentence_count: 13
    key_terms: [system, design, ui-kit, elements, internal, sproketz, varelyo, linter]
    concepts: [system, design, ui-kit, elements, internal]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c1", "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c4"]
    section: Comments
    token_count: 307
  - id: "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c4"
    char_span: [4114, 5453]
    sentence_count: 11
    key_terms: [system, existing, design, tokens, structure, varelyo, doesn, snorelax-12bot]
    concepts: [system, existing, design, tokens, structure]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c1", "social-intelligence/reddit-deep/designsystems/1vqxj3t.md#c3"]
    section: Comments
    token_count: 296
---
# AI kept rebuilding components I already had, so I built a tool that treats the design system as the source of truth

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1vqxj3t/ai_kept_rebuilding_components_i_already_had_so_i/)
Posted by **kr1sck** · **2↑** · **11 comments**

I've been trying to design interfaces with AI, and I keep running into the same problem.  
The project already has a UI kit: components, variants, tokens, the lot. I ask the agent to add a button to a screen, and instead of using the Button component sitting right there in the codebase, it draws a new one. Slightly smaller. Slightly different. One more inconsistency to clean up.  
That's what pushed me to try dedicated design tools.  
I started with Claude Design. I couldn't get my existing UI kit into it because I hit the 5 MB limit, so I let it build a design system from scratch instead.  
It duplicated components and icons. The same icon was drawn again on the next page, and by the third screen it looked different each time. I also couldn't point it at files on my machine or give it the tree of Markdown skills and project rules my agents already use.  
The result wasn't product-ready. I still had to assemble the actual UI kit and design system by hand afterward.  
Then I tried Figma Make. In my experience, it accepted my UI kit but never really treated it as the source of truth. Screens were built around my components rather than from them.  
Skills were the other half of the problem. Mine are organized as a tree of Markdown files across multiple folders, and there was no clean way to import them or keep them synchronized with the codebase.  
But the biggest problem was extension. If a prop or component was missing, the system didn't extend the kit. It either left the capability missing or created a one-off implementation, putting me back where I started.  
Both are useful tools. They just stop at the exact boundary I needed to cross: designing against the real system, then extending that system when a screen requires something new.  
So I built Varelyo for that workflow.  
Varelyo opens your local React project and reads its components, variants, sizes, and tokens directly from source. The works directly with JSX code, so the component you edit is the same component your project imports.  
If a screen needs a missing prop or variant, Varelyo adds it to the component. If it needs a new component or token, it adds that to the system according to your project's rules instead of dropping a one-off implementation into the page.  
Agent skills are generated from the source and updated when the source changes. A second brand can use the same components with different token values rather than forking the whole system.  
What comes out is ordinary JSX built from your own components and tokens, on an ordinary Git branch. There's no proprietary design file that needs to be translated back into code.

[https://varelyo.com/](https://varelyo.com/)

## Comments

- **Sproketz** (4↑): Just make a linter for your design system. Ez mode.
  - **kr1sck** (2↑): This is a good idea, thank you so much!
  - **Sebbean** (1↑): How do? Or like is it a thing? I’m dev trynna get head into designey world
    - **Sproketz** (2↑): I usually make my agent componentize and document my design system in markdown. Then I tell it to make a linter that governs it and tie it to my npm processes. 

If it tries to sneak in a color, or spacing unit or component that doesn't exist in the system it bounces and remembers to fix it. Or raises the issue with me. 

Super easy to set up and works.
- **snorelax-12bot** (1↑): I have the same problem. I am a design system maintainer for a company. The implementation is done using React, TS and Tailwind. All the other products are Next.js based apps that consume my ui-kit. But when working with ai-agents, it’s almost impossible to make them generate UI elements starting from the internal ui-kit.

The solution for me was:  
\- creating a set of skills for the ui-kit  
\- enforcing the use of internal ui elements through AGENTS.md

At the end, a human reviewer still has to check if the UI is compatible with our DS guidelines.
  - **kr1sck** (1↑): I had exactly the same problem, and at some point I realized that skills + AGENTS.md alone just aren’t enough.  
I’m using Varelyo on real company projects now, and what I like about it is that the AI doesn’t just get instructions about how the design system is supposed to work. It actually works inside the system.  
It understands the structure core tokens, semantic tokens, components, variants, and how they relate to each other. If a component already exists, it reuses it. If it doesn’t, it creates a new one following the same rules and extends the existing system.  
It also avoids throwing random hardcoded values into the UI no arbitrary hex colors, spacing, sizing, etc. Everything is built through the existing tokens and primitives.  
That’s the main difference for me: the design system isn’t just documentation that the agent may or may not follow. It’s part of the environment the AI is designing in.  
So instead of just generating UI that looks similar, it actually continues the existing design system and preserves its structure as the product grows.
    - **snorelax-12bot** (2↑): This sounds very interesting, can you please share a link or something related to Varelyo, I googled it but had nothing
