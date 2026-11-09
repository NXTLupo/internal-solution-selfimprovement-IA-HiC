---
id: social-intelligence/reddit-deep/designsystems/1noks4f.md
url: "https://www.reddit.com/r/DesignSystems/comments/1noks4f/we_built_an_ai_that_actually_understands_your/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "We built an AI that actually understands your design system in Figma🤖"
author: "Aware-Run7143"
date: "2025-09-23T15:39:54.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 5
flair: ""
extracted_at: "2026-09-10T17:19:04.812Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1noks4f.md#c0"
    char_span: [0, 1535]
    sentence_count: 5
    key_terms: [dwine-generate-screens-with-ai-using-your-design-system, design, dwine, https, designsystems, www, screens, plugin]
    concepts: [dwine-generate-screens-with-ai-using-your-design-system, design, designsystems, dwine, https]
    token_count: 371
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1noks4f/we_built_an_ai_that_actually_understands_your/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1noks4f.md#c1"
    char_span: [1550, 2825]
    sentence_count: 4
    key_terms: [design, guidelines, component, context, naming, system, aware-run7143, descriptions]
    concepts: [design, guidelines, component, aware-run7143, context]
    section: Comments
    token_count: 298
---
# We built an AI that actually understands your design system in Figma🤖

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1noks4f/we_built_an_ai_that_actually_understands_your/)
Posted by **Aware-Run7143** · **0↑** · **5 comments**

Hey r/DesignSystems !

We've been working on Dwine - a Figma plugin that generates new screens using your existing design system as the foundation. Instead of starting from blank artboards and random styles, it reads your components and design tokens to create contextually relevant screens.

**What makes it different:**

* Generates screens that actually fit your design system (not generic templates)
* Takes context inputs like "onboarding flow" or "dashboard" and builds accordingly
* Maintains consistency with your generated screens by adding context

We're in beta and looking for design system folks to break it and give us honest feedback. Your insights will directly shape where we take this.

**Try it:** [https://www.figma.com/community/plugin/1549927021694181252/dwine-generate-screens-with-ai-using-your-design-system](https://www.figma.com/community/plugin/1549927021694181252/dwine-generate-screens-with-ai-using-your-design-system)

**More info:** [www.dwine.ai](http://www.dwine.ai)

Drop feedback at [support@dwine.ai](mailto:support@dwine.ai) or hop in our Discord: [https://discord.gg/4GEgpszH](https://discord.gg/4GEgpszH)

Cheers!

Pranay

*Quick fix: If the plugin disconnects, just reopen it - we're working on making that more seamless.*

## Comments

- **equinusocio** (3↑): How do you tell him all the guidelines, how to put pieces together, what to avoid… I mean the “how to use” part of a a design system.
  - **Aware-Run7143** (1↑): Hi, Dwine picks up on your design system guidelines through a few key ways:

1. **Component descriptions and naming conventions** \- It reads the descriptions you've added to your component sets and follows your naming patterns in styles
2. **Context from design files** \- You can add context about any design file to help Dwine better understand your specific guidelines and patterns
3. **Future enhancement** \- We're working on adding the ability to input custom guidelines and long-term memory based on your design files

The more descriptive your component naming and the clearer your file context, the better Dwine understands your "how to use" rules!

Would love to hear how it works with your design system if you give it a try.
- **Fun-Tomatillo-910** (1↑): Good job, was able to generate a few good variations for a screen I had been working on. Is there a way to increase the 25 screens limit?
  - **Aware-Run7143** (1↑): Hi, thanks for trying out our tool. Currently we haven’t set up payments since we are in beta but you can ping us on discord for additional screens for now
