---
id: social-intelligence/reddit-deep/figmadesign/1wala6y.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1wala6y/how_are_design_teams_handling_figma_handoff_when/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "How are design teams handling Figma handoff when AI writes the code?"
author: "jamwithtoast7"
date: "2026-09-08T11:05:00.000Z"
score: 19
upvote_ratio: 0.92
num_comments: 15
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.230Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1wala6y.md#c0"
    char_span: [0, 1815]
    sentence_count: 16
    key_terms: [figma, design, developers, like, workflow, already, handoff, build]
    concepts: [figma, developers, design, workflow, already]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1wala6y.md#c1", "social-intelligence/reddit-deep/figmadesign/1wala6y.md#c3"]
    token_count: 375
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1wala6y/how_are_design_teams_handling_figma_handoff_when/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1wala6y.md#c1"
    char_span: [1830, 3430]
    sentence_count: 10
    key_terms: [code, components, communicate, repo, design, system, developers, reusable]
    concepts: [components, communicate, design, system, developers]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1wala6y.md#c0"]
    section: Comments
    token_count: 334
  - id: "social-intelligence/reddit-deep/figmadesign/1wala6y.md#c2"
    char_span: [3432, 5392]
    sentence_count: 13
    key_terms: [component, tokens, figma, rules, engineering, here, variables, codebase]
    concepts: [component, tokens, engineering, figma, rules]
    section: Comments
    token_count: 460
  - id: "social-intelligence/reddit-deep/figmadesign/1wala6y.md#c3"
    char_span: [5394, 7257]
    sentence_count: 20
    key_terms: [paper, design, figma, "it's", agent, dev, pen, work]
    concepts: [paper, design, figma, agent, product]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1wala6y.md#c0"]
    section: Comments
    token_count: 428
---
# How are design teams handling Figma handoff when AI writes the code?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1wala6y/how_are_design_teams_handling_figma_handoff_when/)
Posted by **jamwithtoast7** · **19↑** · **15 comments**

Hey everyone! I’m a product designer. I already use tools like Codex and Claude in my workflow, but my current company is now moving heavily toward AI-assisted development.  
The challenge is that we changed how we build the product without clearly defining a new design to development process.

Before AI, my workflow was simple:

The PM provided a PRD, I designed the feature using our design system, and I documented the flows, states, interactions and edge cases.

For handoff, I organized the Figma file from the simplest happy path to the more complex scenarios. Developers could follow the logic, inspect the designs and ask questions when something wasn’t clear.

But if AI is now helping write the production code, what should that handoff look like?

Do you still create a detailed Figma file and provide all that context to Codex or Claude?

Do you divide the feature into smaller flows and ask AI to build them one at a time?

Do designers generate the first components and then let developers review and improve the code?

Are you changing how you structure Figma because AI needs more explicit information than a developer?

Who is responsible for checking that the final implementation matches the design system and handles every state?

I can already build interfaces with AI, but I’m trying to understand what a reliable team process looks like,not just for prototypes, but for real production products.

For designers and developers already working this way, what does your current Figma → AI → engineering workflow look like?

## Comments

- **lockezwill** (12↑): Ive been grappling with this problem for awhile and I think the path forward is design-side code. I think designers should own a repo of components and tokens that has design system logic built into the code itself, not just in .md files. The code should communicate the decisions you want to explicitly own in code, then have developers assess what additional concerns need to be added. 

I’m saying this having worked in places where there was 0 talk of components and tokens, and developers said they create everything from scratch because they didn’t think design was disciplined enough to operate from a reusable system. If you’re actually owning a reusable system in code with explicit guardrails and logic, then that signals to devs that you care about implementation and not just the visual output. And I dont think its just owning a vibe coded repo where you dont understand the code. The code itself should be architected in a way that shows design intent, like declaring components in TypeScript rather than JavaScript to communicate the exact allowable boundaries for use or having an asChild/slot primitive setup to communicate that a button can be both <a> and <button>.
  - **Lramirez194** (5↑): We’ve been doing this. We built a UX controlled DS specifically for prototype building where the prototypes are the handoff files. Dev gets a little componente map to know what components to swap out for, the correct documentation etc.
    - **GOgly_MoOgly** (1↑): Did you clone your code repo to do this? Or is it just the Figma DS saved out as a json into a repo?

We currently have no access to the codebase so I’m stuck on which way to go here
- **Design_Grognard** (5↑): I'm against taking on the burden of figuring it all out simply because leadership and engineering haven't figured their sh*t out. Engineering was aware of what you handed-off before they decided to implement AI development, they should have figured this out for themselves/you. They should be leading/owning any changes.
. 
That said: The first change I would make is to the component library. I'd make sure That all of my variables and tokens matched Engineering's exactly. I'd then make sure that every component uses those variables and tokens. Lastly I would add a description to each component; name, use, expected behavior. That's enough to make your designes consumable to the agent through the MCP server.
  - **GOgly_MoOgly** (1↑): This is where I’m at too. We have a legacy product, tons of tech debt, zero alignment with the codebase that I’ve been begging to have, and now they’re implementing AI. 

We’re constantly working backwards and the steps you mentioned are nearly exact to what I’ve suggested. As it stands, it’s clear that they’re just looking to build on top of the existing mess and that’s bananas to me
- **hoangng_102** (2↑): Im designer too and now  write the code myself, so i've been living in this for a while. What changed for me: the pretty screens matter less, the tokens and the rules matter way more... so now i spend the time on the design system and the edge cases, and i keep the happy path in figma light. the handoff doc turned into "here are the rules", not "here is the picture"
  - **GOgly_MoOgly** (1↑): What steps did you take to get the rules and token setup/aligned?
- **qukab** (2↑): We don't really use Figma anymore outside of marketing site updates, and there the workflow is a lot of back and forth orchestration using the Figma MCP. Gets pretty tedious in terms of getting all the details correct.

For all product design work, Paper has become king (paper.design). Traditional product design isn't really a thing anymore, at least at our org (and plenty of colleagues at other companies), we're all "design engineers" now. I have pushed more PR's in the last few months than my entire career, and I became a designer after having a front-end background. Eng is no longer a bottleneck for design, we just do it ourselves (unless it requires serious backend work where a human should be planning/working with their own agent).

It's a wild world we live in. But yeah, tactically, Figma isn't great in this new world. Tools built for it are going to be much more efficient. I suggest looking at Paper.desgin or Pen.dev.
  - **hana0519** (1↑): What can Paper do that Figma agent cannot? Or is the feature set pretty much the same but paper is faster/delivers nicer outcomes? I’ve been using Figma agent but haven’t thoroughly tested Paper yet.
    - **qukab** (2↑): They are fundamentally different tools under the hood that look and feel similar on the surface. Figma is dated at this point, it's a vector graphics tool that often does things that appear to be the same as code, but they are definitely not and require a translation layer (often just a human). For example, Figma's auto-layout is not actually flexbox under the hood, it just mimics it.

Paper is code. Pure and simple. What you see is literally what can be implemented, which means agents have a very simple job of making the thing real, or drawing a thing that's already real, but on your canvas (or making something completely new).

It's also just FAST. Like, ridiculously fast in comparison. I can never go back to Figma MCP. It's slow and just so much more work.

Paper is free to try out, just give it a go for fun. [Pen.dev](http://Pen.dev) is also similar, a lot of people like it as well.
