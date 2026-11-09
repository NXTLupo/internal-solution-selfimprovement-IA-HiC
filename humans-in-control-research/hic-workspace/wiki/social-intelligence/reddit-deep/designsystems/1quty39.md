---
id: social-intelligence/reddit-deep/designsystems/1quty39.md
url: "https://www.reddit.com/r/DesignSystems/comments/1quty39/from_pre_made_lib_component_to_final_design_system/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "From pre made lib component to final design system"
author: "Vivid-Drag1421"
date: "2026-02-03T14:51:22.000Z"
score: 5
upvote_ratio: 0.86
num_comments: 5
flair: ""
extracted_at: "2026-09-10T17:19:04.807Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1quty39.md#c0"
    char_span: [0, 880]
    sentence_count: 6
    key_terms: [library, designsystems, component, comments, final, using, did, vivid-drag1421]
    concepts: [designsystems, library, component, comments, final]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1quty39.md#c1"]
    token_count: 209
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1quty39/from_pre_made_lib_component_to_final_design_system/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1quty39.md#c1"
    char_span: [895, 1965]
    sentence_count: 8
    key_terms: [figma, library, components, code, component, create, heroui, final]
    concepts: [figma, components, library, component, create]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1quty39.md#c0"]
    section: Comments
    token_count: 255
---
# From pre made lib component to final design system

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1quty39/from_pre_made_lib_component_to_final_design_system/)
Posted by **Vivid-Drag1421** · **5↑** · **5 comments**

I've heard a lot from DS consultants about using a pre-built component library to kickstart the company's DS, because it's faster to implement with the developers, and I agree, as I did the same and got a 301% ROI on a project, delivering the MVP in less than a month.

But my question is: how did you transform the library into the final DS? In my experience, I used the HeroUI library, but it was definitely overkill. Hundreds of components and variations that I would never use, which makes the file absurdly large. So, what do you do? Do you delete what you're not using or simply leave it alone and hope for the best?

## Comments

- **ArdentExplorer** (2↑): Interesting situation, is this for Figma only or are you also using the same in code?
  - **Vivid-Drag1421** (2↑): HeroUI its a component lib with ready to uso components in code, but first i created a theme and create some components with the devs team. So when they start to implement was the same at the figma file and the code.
- **Apple_sack_mac** (2↑): I used Radix as a base for our React component library and it worked a treat. I could quickly scaffold accessibility ready components and just as smaller additions to functionality as needed. Documented, tested and maintained within a Storybook library.
- **bodyakrol** (2↑): How your process should look like in Figma:
1. Publish HeroUI library in Figma;
2. Create new Figma file and connect published Hero UI Figma library. 

With this setup you will use Hero UI library as a components storage that can be called from different Figma files. 

But in general, I’m not sure what you mean by “how did you transform design system into the final DS?”    What do you mean by “final DS”?)
