---
id: social-intelligence/reddit-deep/uxdesign/1w0nazz.md
url: "https://www.reddit.com/r/UXDesign/comments/1w0nazz/we_made_aireadability_a_requirement_for_our/"
kind: "social-post"
source: "reddit-deep: r/uxdesign"
subreddit: "uxdesign"
title: "We made AI-readability a requirement for our design system. Here's what changed."
author: "pjhawksr"
date: "2026-08-28T10:56:41.000Z"
score: 97
upvote_ratio: 0.86
num_comments: 38
flair: "Tools, apps, plugins, AI"
extracted_at: "2026-09-10T17:19:34.961Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c0"
    char_span: [0, 2273]
    sentence_count: 23
    key_terms: [system, agents, components, design, build, docs, ai-readability, humans]
    concepts: [system, agents, components, design, build]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c5", "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c6"]
    token_count: 503
    sources: [{"n":"reddit-deep: r/uxdesign","u":"https://www.reddit.com/r/UXDesign/comments/1w0nazz/we_made_aireadability_a_requirement_for_our/"}]
  - id: "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c1"
    char_span: [2288, 4480]
    sentence_count: 20
    key_terms: [components, component, human-readable, docs, json, use, storybook, design]
    concepts: [components, human-readable, component, storybook, documentation]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c3", "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c4"]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c2"
    char_span: [4484, 5672]
    sentence_count: 8
    key_terms: [audit, components, tool, through, audits, claude, longer, source]
    concepts: [audit, components, through, audits, claude]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c3"]
    section: Comments
    token_count: 250
  - id: "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c3"
    char_span: [5674, 7431]
    sentence_count: 11
    key_terms: [component, audit, sample, tokens, components, usage, files, definitions]
    concepts: [component, audit, components, sample, tokens]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c1", "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c2", "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c4"]
    section: Comments
    token_count: 373
  - id: "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c4"
    char_span: [7433, 9543]
    sentence_count: 16
    key_terms: [collection, background, semantic, components, component, tokens, designsystemdocspec, error]
    concepts: [collection, background, semantic, components, component]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c1", "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c3"]
    section: Comments
    token_count: 458
  - id: "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c5"
    char_span: [9545, 11749]
    sentence_count: 21
    key_terms: [system, design, agents, component, use, github, public-facing, share]
    concepts: [system, design, agents, component, public-facing]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c0", "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c6"]
    section: Comments
    token_count: 479
  - id: "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c6"
    char_span: [11751, 13661]
    sentence_count: 13
    key_terms: [agents, airframe, design-systems, design, making, system, jaredhawkins, prototyping]
    concepts: [agents, airframe, design-systems, jaredhawkins, design]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c0", "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c5"]
    section: Comments
    token_count: 410
  - id: "social-intelligence/reddit-deep/uxdesign/1w0nazz.md#c7"
    char_span: [13663, 14745]
    sentence_count: 10
    key_terms: [design, claude, interesting-pay1507, https, com, airframeui, skovalik, perception-first-design]
    concepts: [design, claude, interesting-pay1507, https, airframeui]
    section: Comments
    token_count: 265
---
# We made AI-readability a requirement for our design system. Here's what changed.

Source: [reddit-deep: r/uxdesign](https://www.reddit.com/r/UXDesign/comments/1w0nazz/we_made_aireadability_a_requirement_for_our/)
Posted by **pjhawksr** · **97↑** · **38 comments**

I help lead design at an enterprise DevOps platform. Our designers and a growing number of PMs and engineers now build UI with Claude Code, Cursor, etc. About a year into that we noticed something frustrating: the design system was written for humans, and the agents were bad at using it. Agents would reinvent components that already existed, hardcode values we had tokens for, and produce screens that looked 80% right and were 100% not in the system.

So we invested in AI-readability and made it an actual requirement, same tier as accessibility. Not "the docs mention AI" but "an agent with no context can build an on-system screen from our components without a human correcting it."

What that changed in practice:

The docs got rewritten for retrieval, not reading. Humans skim a components page top to bottom. Agents grab chunks. So every component page now leads with a short plain-language block stating what the component is for, when to use it vs. its neighbors, and a complete working code example. The "when to use this instead of that" context mattered a lot. That's the stuff agents get wrong most.

We wrote guardrails as text, not just lint rules. Rules like "never use raw hex values, always tokens" now exist as plain instructions the agent ingests. Basic stuff.

We started testing the system like a product. We run a set of standard prompts, "build a settings page," "build a data table with filters," against the system and score how on-system the output is. When it fails, that's a docs bug or a naming bug, and it gets fixed like one.

What surprised me: almost everything we did for the agents made the system better for humans too. Clearer names, decision guidance instead of just prop tables, working examples everywhere.

What I am solving now is keeping the AI-facing docs in sync with the components as they change.

Curious if anyone else is treating agents as a first-class consumer of their design system, or if you're seeing the same "80% right, 100% off-system" problem.

## Comments

- **akshaydp** (16↑): New to all this so asking: what format are yours docs in so that they are readable by AI and humans?  
What I mean is .md files are text heavy, whereas good design system documentation for humans has visual examples with code.
  - **freckledoctopus** (15↑): Not OP but I’ve been deep in this so I’ll share. Components, etc. are documented in JSON (dsds.json to be exact). This part has gone quite well and is not-NOT human readable but obviously not ideal. Step two (currently experimenting with this) is syncing up the JSON with Storybook to produce truly human-readable docs. This is early days, so unclear how close to 100% true automated syncing I can achieve but am quite hopeful.

So our “stack” is:  
Figma is our early design work space.  
JSON is source of truth for agents and human-readable docs.  
Storybook is the human-readable documentation.

ETA: I’m still using .md for workflow/architecture docs (e.g., a list of all components in the design system with their file names) but it’s used very sparingly
    - **Observational-Mess** (2↑): We do exactly what you’re describing.
    - **TechEn92** (1↑): Curious, why not use html?
- **HarryElliottChi** (6↑): Been doing exactly this. Same bar you set: an agent with no context builds a working screen out of the real components and tokens, no correction from me.

The thing that helped most was writing "when not to use this" and "use this instead of a similar one" guidance into the component docs. Property tables tell an agent what a component can do. They never tell it which of three lookalike components is the right one. That's where the screens that look about 80 percent right but don't actually use the system come from. Comparative guidance is what fixed it for me.

The setup is React and TypeScript, built with Vite and Tailwind, documented in Storybook. The part that does the work is plain. It's a set of files in the codebase that everything else traces back to: a cross-reference index, a component catalog, the tokens as JSON and a short "when to use this" doc for each component. A starting guide in plain language points an agent through it and a short rules file sets the boundaries.   
  
An AI tool working directly in the codebase, like Claude Code or Cursor, reads those files. An AI tool running somewhere else, like Claude Desktop, reaches the same information through an MCP server, a standard way for an outside tool to query a system through commands instead of reading its files. Same source either way.

On the problem you're solving now, keeping the docs in sync as components change, the audits are what save me. Some of it generates straight from the source, the cross-reference index, the property tables and the per-component READMEs, so those can't fall out of sync. The tokens and the usage docs are written by hand, which is where things drift. So I run seven audit scripts that fail the build when they find it, the same way a linter fails on a hardcoded color, all under one command. The initial full run of audits caught:

* audit:tokens: Dozens of color values that no longer matched a real token
* audit:manifest: Many components missing from the catalog
* audit:patterns: A bunch of layouts pointing at components that no longer existed

Here's my current audit list, with what each one actually checks (pulled from the script headers so it's accurate):

* **audit:tokens** — Scans the source for hard-coded colors that aren't in tokens.json. Flags any color that doesn't map to a real token.
* **audit:usage** — Confirms every component has a usage doc, and that no usage doc is left pointing at a component that's gone.
* **audit:sample-coverage** — Flags components in the catalog that no sample page actually uses. The "we ship it but nothing demonstrates it" signal.
* **audit:inline-styles** — Finds inline styles inside component files, where styling should live in SCSS. Sample pages and demo stories are allowed.
* **audit:manifest** — Checks the catalog against the filesystem: source and story paths resolve to real files, every component folder is registered, no sample page entry is stale.
* **audit:patterns** — Cross-checks patterns, components and sample pages against each other. Catches a composition that points at a component or page that no longer exists.
* **audit:doc-structure** — Verifies every usage doc has its required sections: Purpose, When to use, When NOT to use, Common mistakes and Real-world example.
- **Motorekt** (4↑): Tokenizing everything was a game changer with AI integration. We implemented a three tier system, primitives (holds all raw values), semantics (tokens with intent, i.e. 'feedback.error.background') that use primitive tokens, and then a component collection for overrides. Also included a clear guideline document for AI on how to traverse the chain with additional intent.

Curious, why did you choose .json over .md files for the component definitions? We have the same problem with drift between components implemented in Figma, code and the docs. We are working through a harness process that loops the definitions back into the process for validation.

My other issues are designers complaining that they can't break components Figma, change colors willy nilly and that the properties on Figma components aren't as intuitive. Some of this is a skill issue and others are anti-AI pushback.
  - **hyruligan** (7↑): https://designsystemdocspec.org/ this is a diamond in the rough from PJ who’s big in the space. If you haven’t yet, check this out
  - **freckledoctopus** (2↑): As for JSON vs md, I can probably answer a bit of that. JSON tends to be lighter for the same level of context (I.e., fewer tokens spent per session than with markdown files). Also, I feel there’s significant benefit to JSON if you adopt a data schema (or create your own) instead of just going in blind. There are a few nascent specs out there, the one I’ve personally adopted is DSDS (designsystemdocspec.org).
  - **freckledoctopus** (0↑): If you have the time, I’d be interested in knowing more about the component collection of token overrides and how that’s worked for you. I inherited a set of semantic tokens from the dev team that were a good starting point but a bit tangled, and I think something like this might be the correct approach for us.
    - **Motorekt** (4↑): Sure. So at a high level:

Primitive collection: Contains raw values, numbers, and color hex codes. Never used directly in components.

Semantic collection: Intent aliases, like feedback.error.background. These values only reference the primitive collection of tokens. You use these in components and this collection holds your themes/modes.

Component collection: This is where you put tokens that don't match the general semantic meaning. These are created rarely, for example, you have a feedback.error.background semantic token but you have another error message type that uses a different background color. The tricky part is that the component collection should reference the semantic collection for the resolution train so it inherits any themes/modes you've defined. For the error message example, you would have a component token like this:  
\[component-name\].background = color.background.surface

For AI, the token resolution looks like this: Component (if applicable) -> Semantic -> Primitive  
Why do this? well AI can reference the semantic collection to choose what is appropriate but if you have a specific use case for a specific component (i.e. override), you define it in the Component collection.
- **Sproketz** (4↑): Absolutely. I use AI-first design system setups on all of my personal projects. No Figma, not human-first. The entire design system rules are in single .md file linked to code. Clear and descriptive headings since agents use grep to navigate. A good measure is, if you collapse to only headings, you should have a good idea of where things are in your system. A solid IA system cuts token use and keeps your agents moving faster.

Working AI-first allows removal of things that are obvious to agents. A very light .md only design system works extremely well when reinforced by a linter. From tokens to composite components and layouts, it can all be governed this way.

I do not maintain a visual design system site on purpose as it would be more token overhead. I can see the system alive in the products which then become the visual asset.

I wish I could pull this off at work, but in an enterprise you have to also serve human teams. People require more guidance than agents, so things go back to being messy. AI optimized everything is required now for enterprise work regardless. PRD, Design, Engineering, QA, etc. all really need to be agent accessible and in formats it can easily navigate.

For my personal projects I keep ALL documentation from PRD to QA in GitHub with commit histories. It's amazing. The more you can bring your single source of truth closer to the agent, with less moving parts, the better.
- **theblackpen** (1↑): Care to share any examples?
  - **pjhawksr** (3↑): At the moment all I can share is our public-facing repo of our design system: [https://github.com/harness/canary](https://github.com/harness/canary)

There you'll find some things that should be useful.  
  
I'm about to merge in several PRs that layout a richer system than what you can find currently. I'll share more once that's public-facing (company privacy policies, etc.).

I also do some evaluations of public design systems and evaluate on what matters to AI agents. It may be of interest if you get bored: [https://www.jaredhawkins.com/studies/design-systems](https://www.jaredhawkins.com/studies/design-systems)
    - **theblackpen** (1↑): This is helpful thank you for sharing. I’m working on this for my org as well, will take a look
- **karls1969** (1↑): We had similar issues to you but took a different approach.
We put the AI focussed guide to our design system into dedicated reference md files meant for prototyping.

We created a separate eval skill to help users evaluate outputs, and to then iterate on our prototyping skill.

We were a small team, and it seemed easier to do it this way, than to change the design system.
  - **pjhawksr** (1↑): Clever. I like the spirit of adapting and making it happen.
- **thisiain** (1↑): Really like this approach, and great to see more conversations around AI-Design Systems happening.  
Making AI readability an actual requirement rather than an afterthought is increasingly important as more of the UI is being generated by AI - I believe we have to treat AI agents as first-class consumers alongside keeping it easy to devs and designers to read and maintain.

I've been exploring a similar problem with Airframe. Making the docs AI readable is only part of it, the system itself needs to give agents something they can actually compose with.

Airframe uses a simple progression: structure → patterns → blocks → blueprints. Structure defines how things relate, patterns provide reusable UI, blocks give agents useful sections to start from, and blueprints provide complete screen compositions.. which sounds exactly like what help with your 'product prompts'.

Built into Airframe are the pattern rules, semantic and accessibility guidance, and a lightweight MCP so agents can discover what they need rather than inventing it.

It's still pre-v1, but this is essentially what I'm building towards. Would appreciate any feedback to keep improving it!   
[https://www.airframeui.com](https://www.airframeui.com)
- **Interesting-Pay1507** (1↑): My design system in Claude has detailed usage guidelines for Claude to know how and when to use everything.
  - **pjhawksr** (1↑): What do you mean by "In Claude"? Are you referring to Claude Design and how it imports UI Kits?
    - **Interesting-Pay1507** (1↑): Claude design has design systems. I don’t recommend importing.
- **Vegetable-Space6817** (1↑): Yeah. Everyone is doing this. Not sure about those % but the same docs can serve as knowledge base for agents to answer open ended design system questions. So in a way they serve dual purpose
- **isperg** (1↑): Same. LLMs are a type of user we need to design for now. Thanks for sharing what you could.

The context engineering I use for making AI first products and workflows is at https://github.com/skovalik/conduct-platform

Check out design judgement at https://github.com/skovalik/perception-first-design
