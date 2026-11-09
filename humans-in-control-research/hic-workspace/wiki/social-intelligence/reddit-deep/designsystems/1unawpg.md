---
id: social-intelligence/reddit-deep/designsystems/1unawpg.md
url: "https://www.reddit.com/r/DesignSystems/comments/1unawpg/how_is_aigenerated_ui_interacting_with_your/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "How is AI-generated UI interacting with your design systems in practice?"
author: "Mission_Band5045"
date: "2026-07-04T14:46:37.000Z"
score: 13
upvote_ratio: 1
num_comments: 8
flair: ""
extracted_at: "2026-09-10T17:19:04.800Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1unawpg.md#c0"
    char_span: [0, 1017]
    sentence_count: 4
    key_terms: [ai-generated, designsystems, comments, systems, design, system, tokens, work]
    concepts: [ai-generated, designsystems, comments, systems, design]
    token_count: 221
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1unawpg/how_is_aigenerated_ui_interacting_with_your/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1unawpg.md#c1"
    char_span: [1032, 2737]
    sentence_count: 14
    key_terms: [designers, design, apps, projects, prototyping, side, work, production]
    concepts: [designers, design, projects, prototyping, production]
    section: Comments
    token_count: 367
  - id: "social-intelligence/reddit-deep/designsystems/1unawpg.md#c2"
    char_span: [2739, 5060]
    sentence_count: 15
    key_terms: [inconsistency, solutions, code, context, figma, teams, does, work]
    concepts: [inconsistency, solutions, context, components, figma]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1unawpg.md#c3"]
    section: Comments
    token_count: 488
  - id: "social-intelligence/reddit-deep/designsystems/1unawpg.md#c3"
    char_span: [5062, 6096]
    sentence_count: 4
    key_terms: [figma, components, code, styles, context, design, token, tools]
    concepts: [figma, components, styles, context, design]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1unawpg.md#c2"]
    section: Comments
    token_count: 247
---
# How is AI-generated UI interacting with your design systems in practice?

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1unawpg/how_is_aigenerated_ui_interacting_with_your/)
Posted by **Mission_Band5045** · **13↑** · **8 comments**

Interested in how teams maintaining design systems are dealing with AI-generated UI work, if at all.

* Are designers/devs generating screens with AI and then having to map them back onto existing components/tokens?
* Does this create more inconsistency to clean up, or has tooling made it fit smoothly into the system?
* Is manual refinement in Figma (or code) still the main way inconsistencies get fixed, or are there other approaches you're using?
* What's the most common way AI-generated UI breaks from your system (spacing, component reuse, naming, tokens, etc.)?

Real examples from your day-to-day work would be most useful. Mentioning your role and years of experience would help me understand how this varies across team maturity.

## Comments

- **Decent_Perception676** (7↑): \~12yo experience, lead design engineer. In charge of multiple design systems for a large global consumer goods company. If I had to ballpark usage, I’d say around \~100 priority projects/apps, and another \~500 projects/apps that aren’t considered business priority (consumer facing apps, supply chain, product creation, marketing, hr, internal apps, geos, etc).

We’re a very very big company and fairly decentralized in practices and ways of working, so for all of these answers it’s a bit of “depends” and “all of these above”.

\- are designers/devs generating UI with AI, and does that have to be then swapped back to use the DS?

I work with about 75 designers in the design department, and AI adoption has been pushed hard in the last year. An important thing to remember with design is that it is not one process, and not all designers work the same way. So we have some designers that are embedded on product teams that are coding side by side (with AI) with engineers.  Context and skills make adherence to the DS work here, so no swapping. We also have designers prototyping production products with the DS. I would say the effectiveness of self guided designer production prototyping to depend on the designers ability to use AI (can the understand context, good prompting, etc). Then you have designers doing very early ideation/exploration with AI. Here we usually intentionally side step the DS, this phase is more about exploring unique UX to be pitched to leadership. We also have designers building internal tools for thier own projects, often with the DS. Across the board, I’d say maybe a 1/3 of designers are now using AI to generate UIUX day to day.

Engineering… again totally depends. I spend way less time with engineers and they are spread out across the globe, so my observations are more anecdotal. Our DS is fully “AI ready” in that all the info for it can be queried by AI (routed paths through markdown in the code base, if you want to use that for context, or an MCP server, both solutions provide roughly the same info). So a lot of teams are doing great auto piloting migration and UI generation with the DS. I can’t remember the last time I saw the AI make up something about the DS when its context is properly loaded. Of course… we also have teams that refuse to use the DS, and their results are mixed (I’ve seen Tailwind only implementation of apps that leadership felt were visually correct enough to be okay, and I’ve also seen Tailwind only implementations getting brutally roasted for being off from the DS). 

\- does it create inconsistency that need to be cleaned up?

Sure, but that’s not really the right question to be asking. “Does it create less inconsistency than humans without it?” The answer to that question is a resounding YES. AI has absolutely elevated the importance and value of the DS at my employer, and using AI+DS is a great match.

\- are inconsistency still fixed manually in Figma/code?

I honestly do very very little direct writing of code these days, though I will still fix small things here and there by hand (pushing a few pixels, touching up CSS). Most of my coding is now about defining problems, architecture, solutions, specs and lining up the right context to solve a problem, then guiding the AI through most of the code writing. For Figma… that’s still more manual than I’d want it to be. Figma and AI don’t work as well together as they should,  it that’s a different convo.

\- where does it break most frequently from the system?

Again, depends on the quality of the setup and who’s piloting the work, but generally adhering to tokens and components is accurate. Where things get interesting is with larger compositions of multiple components, extensions of the DS, and UX patterns. A lot of the places where the DS sort of intentionally stops (at our scale, being over prescriptive wouldn’t work, we purposefully push some design problems back toward product teams for them to come up with local solutions). 

I’d
  - **bentheninjagoat** (1↑): Curious about where the DS lives in this context.
    - **Decent_Perception676** (1↑): Without getting overly philosophical about source of truth or what a design system even really is… the short answer is the code repo (tokens, styles, components, docs/context).
  - **darthturner** (1↑): How do your tools consume your DS? Is it a token library with a markdown file or something else?
    - **Decent_Perception676** (1↑): Code repo has a full token set, global utility and component styles in css (extended BEM naming methodology), and those styles map onto components written in typescript, as well as the documentation (both for the website, as well as docs specifically for AI where the human version wasn’t practical for AI).

And a full Figma UI kit that mirrors the code.

Tools reference these sources.
- **masofon** (1↑): Claude Code via Figma MCP with the figma\_use skill.. can happily use all of your Figma components and variables across multiple files to design.. whatever... in Figma.
