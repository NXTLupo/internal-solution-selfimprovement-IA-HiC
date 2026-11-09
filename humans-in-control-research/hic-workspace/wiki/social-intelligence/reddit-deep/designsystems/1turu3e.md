---
id: social-intelligence/reddit-deep/designsystems/1turu3e.md
url: "https://www.reddit.com/r/DesignSystems/comments/1turu3e/building_a_design_system_for_humans_and_ai_agents/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "Building a design system for humans and AI agents in 2026, my approach so far"
author: "Independent_Bite_262"
date: "2026-06-02T14:00:19.000Z"
score: 28
upvote_ratio: 0.94
num_comments: 27
flair: ""
extracted_at: "2026-09-10T17:19:04.797Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1turu3e.md#c0"
    char_span: [0, 1640]
    sentence_count: 11
    key_terms: [documentation, system, comments, designsystems, organization, here, documented, component]
    concepts: [documentation, system, comments, designsystems, organization]
    token_count: 366
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1turu3e/building_a_design_system_for_humans_and_ai_agents/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1turu3e.md#c1"
    char_span: [1642, 2849]
    sentence_count: 10
    key_terms: [component, documentation, "component's", documented, specific, follows, testing, covers]
    concepts: [component, documentation, "component's", documented, specific]
    token_count: 263
  - id: "social-intelligence/reddit-deep/designsystems/1turu3e.md#c2"
    char_span: [2864, 5040]
    sentence_count: 17
    key_terms: [design, specification, system, doing, document, agents, davethepcguy, new]
    concepts: [design, specification, system, doing, document]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1turu3e.md#c3"]
    section: Comments
    token_count: 494
  - id: "social-intelligence/reddit-deep/designsystems/1turu3e.md#c3"
    char_span: [5043, 7029]
    sentence_count: 10
    key_terms: [component, storybook, work, design, likely, system, using, like]
    concepts: [component, storybook, design, likely, system]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1turu3e.md#c2"]
    section: Comments
    token_count: 435
  - id: "social-intelligence/reddit-deep/designsystems/1turu3e.md#c4"
    char_span: [7031, 8653]
    sentence_count: 10
    key_terms: [component, visual-regression-beats-rereading-specs, changes, "doesn't", token, components, validation, creation]
    concepts: [component, changes, "doesn't", components, token]
    section: Comments
    token_count: 356
  - id: "social-intelligence/reddit-deep/designsystems/1turu3e.md#c5"
    char_span: [8655, 10264]
    sentence_count: 11
    key_terms: [making-your-design-system-agent-ready, day, blog, "i'm", voorhoede, anything, approach, problem]
    concepts: [making-your-design-system-agent-ready, voorhoede, anything, approach, problem]
    section: Comments
    token_count: 376
---
# Building a design system for humans and AI agents in 2026, my approach so far

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1turu3e/building_a_design_system_for_humans_and_ai_agents/)
Posted by **Independent_Bite_262** · **28↑** · **27 comments**

Hi! I'm a UX/UI Designer here in Brazil.

I'm currently working on a Design System project at the organization where I work, and I'd like to share a few things. If anyone wants to chime in with suggestions or comments, I'd be very grateful.

Here are some of the things I've been studying and testing over the past few days:

AI is having a moment, so when I started planning our DS, I thought about how to build something that would be useful both for humans (devs and designers) and for an AI agent. On top of that, I thought about how an AI could help me build the system itself.

Here at the organization, we have one DS in Figma and another one that's used by the devs. Both are in poor shape, inconsistent with each other, and poorly documented.

I took the opportunity to think through a system for generating a DS, with documentation and coded components, using Claude Code. The process relies on a few important starting points:

* I have some general, ready-made documentation covering the non-negotiable rules every component needs to follow, such as accessibility, etc.
* I've documented the flow the AI should follow to generate a component.
* I have a structure of semantic tokens in Figma as well as in documentation form.

There are other docs and processes, but I think these are the main ones for understanding how the flow works.

To test this planning, I put together a small MVP. Starting from all this content, I pick a component I have in Figma and, via MCP, ask the AI to create it. It follows the documented flow and, before building anything, asks me a series of questions about how the component should behave; then it moves on to creating the documentation for that specific component. The component's documentation is split into "spec" and "stack": the "spec" covers the component's intent, and the "stack" covers how the AI should code it. The whole thing follows a 70/30 idea, roughly 70% of the work is AI-assisted and 30% stays manual, and it's that 30% of human input that makes the other 70% reliable.

After generating the documentation, the AI creates the coded component and reviews everything that was done (you can use a script for this review).

The result is a documented, coded component that's then reviewed by a dev before being used.

We're still in a testing and exploration phase, and there are some more specific details in our flow, but it seems useful when your organization doesn't have a solid DS.

If anyone wants to contribute suggestions, I'd appreciate it. I'm still studying and testing this system.

## Comments

- **bodyakrol** (3↑): While reading it, and also similar posts in this community I’m realizing that everyone is doing the same thing. And it is sad and funny at the same time. What design system has benefit over another already created? I guess the answer is no benefit)

But in context of building ure doing good job already. I see that u aware of documentation and about processes that involves AI so you’re on the right track
  - **Independent_Bite_262** (1↑): To come up with this system, I've been reading (and still am) lots of posts on Reddit and Medium, and I'm always asking questions to people who have a background in AI.

But all of this is very new. I don't think there's anything really well established yet about using AI in Design Systems. I see people experimenting with what works for them, and that can vary from company to company.
- **DaveThePCguy** (2↑): I tried sending you a message but I wanted to reach out because I'm doing the same thing and I found a useful trick to keep the context of my design system platform agnostic. Feel free to reach out if you want to talk more
  - **demoklion** (6↑): Why wouldn’t you share it with everyone? Unless you’re trying to sell something
  - **Independent_Bite_262** (1↑): u/DaveThePCguy  I sent you a message, not sure if it got to you.
- **Agreeable_Share1904** (2↑): Mostly doing the same here. We rely on Dust for our custom agents. They have access to our consumer apps and to the design system codebase. This is pretty useful as the agents rely on existing patterns and usages to decide whether a specific design need should result in a new component, a new variant, or an update to an existing variant.


The specialised agents guide the designer towards a consensus on what should be done and how this should be achieved, and then export a templated specification document to notion. It also connects to our DS MCP server to create/update design tokens. Both the design token PR and the specification document are submitted for review. 


From there the designer can work on the advanced design on Figma and the dev can later on use the specification document + figma mockups to develop the component. 


Developers also rely on agents with MCP servers access to implement stuff (70/30 seems like a fair share between generation/review or manual work).
- **Scared-Increase-4785** (2↑): This process will only work in a small organization and most likely will not scale at all, also it seems you are letting the llm to fully code teh component which most likely will apparently work, but most likely it is not composable across multiple components.

This kind of process will work for simple design system mostly those well know industries like ecommerce, education, social network, etc. In scale of ui complexity those are simple design systems.

But if it is working for you congrats :)
  - **Independent_Bite_262** (1↑): After the component is coded by the AI, there's still a validation step done by a dev. The AI coding part focuses only on the visual and more "raw" side of the component. For the system to work, that validation is essential. On top of that, we have an internal plan for our devs to validate and help with the documentation, so we can get a quality level that's more aligned with their reality.
- **Aggressive-Air415** (2↑): Are you using storybook? If not this will get much more simplified and your AI agent should be just told to use storybook and create reusable component inside storybook before using in the actual designs. Works like a charm obviously there are time it misses it but we can add a check loop to verify if there is direct component use that are not inside design system.
  - **Independent_Bite_262** (1↑): I'm using Storybook just to render and visually validate the component after it's coded. But consolidating Storybook as an essential part of the project is a really valid idea.
- **Deep_Ad1959** (2↑): the 30% review holds it together, but the part that bites later is drift. a token tweak silently reflows a dozen components and nobody re-reviews them all. visual regression snapshots catch that better than re-reading specs. written with ai

fwiw the visual-regression-beats-rereading-specs point is the whole bet behind assrt, a thing i built that snapshots every component and flags the silent reflow when a token tweak changes them, https://assrt.ai/r/zsvfyzsf
- **Potential-Camera-789** (2↑): This 70/30 split is the key insight here, most "AI builds my design system" posts skip that part and end up with inconsistent output nobody trusts. Splitting spec (intent) from stack (implementation) also makes sense long-term, since it means your documentation doesn't rot when you swap frameworks or libraries later. One question: how are you handling drift once components go live , does the AI ever re-audit existing components against updated token rules, or is validation only happening at creation time? Would love to hear how the dev review step catches edge cases the AI misses.
  - **Independent_Bite_262** (1↑): Hey, glad you found the idea interesting!

We're still in the testing/development phase of the system, but I can share a few things based on the plan I put together:  


It's not only at creation time, the validation keeps running afterward.

Most token drift never even happens: the component doesn't store the value, it points to the single place where that value is defined. Change it there and it changes everywhere. And when the rule itself changes, the check runs against every component, not just the new one.

The AI re-audits what the automated check can't judge, meaning whether the spec still describes what the code actually does. But it doesn't fix anything on its own: it opens a proposal, and a human decides which side is wrong.

On the dev review side, that's where I still don't have real data. So far the testing has only been me. The bet is to run the review in a session separate from the one that generated the component, because in the same session the AI tends to rationalize its own mistake. And when the same gap shows up across independent generations, treat it as a spec problem, not an AI problem. Whether that holds up in practice with the team is something I still have to find out.
- **dontWannaChoose04** (1↑): I'm also building a design system in figma for a small to mid size company and I'm nowhere near there but I do wonder how to make the most out of AI in my day to day for decision making, checking alternative solutions and documenting. Any advice on that? Anything you're doing that would recommend to simplify the every day things?

Note: I do use AI but it's only when i think i need it or tu unlock me in certain cases. I just built an agent the other day but I'm not doing anything fancy or automated
- **Professional_Cap6856** (1↑): I've made around 9 design systems for AI products so far and one of the challenges to tackle was how we work with tables - any tips here?
- **De_Voorhoede** (1↑): Very solid documentation and approach. A colleague of us has shared his approach in a recent blog post, as well, talking about the importance of context and setting guidelines for the DS. You might find it useful as well: [https://www.voorhoede.nl/en/blog/making-your-design-system-agent-ready/](https://www.voorhoede.nl/en/blog/making-your-design-system-agent-ready/)
  - **Independent_Bite_262** (1↑): Thanks!
