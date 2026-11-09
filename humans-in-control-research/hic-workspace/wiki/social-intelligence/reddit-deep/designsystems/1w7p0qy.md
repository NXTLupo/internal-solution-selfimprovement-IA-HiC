---
id: social-intelligence/reddit-deep/designsystems/1w7p0qy.md
url: "https://www.reddit.com/r/DesignSystems/comments/1w7p0qy/i_have_a_design_system_with_foundations_token/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "I have a design system with Foundations (token library) shared with a Web component library and a Mobile component library. When a client request for unique components for their product, where should I create the new components? In my already existing component library or a dedicated library?"
author: "Financial-Respect-63"
date: "2026-09-05T03:07:51.000Z"
score: 5
upvote_ratio: 1
num_comments: 6
flair: ""
extracted_at: "2026-09-10T17:19:04.798Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1w7p0qy.md#c0"
    char_span: [0, 531]
    sentence_count: 4
    key_terms: [library, component, designsystems, components, comments, financial-respect-63, foundations, reddit-deep]
    concepts: [library, component, designsystems, components, comments]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1w7p0qy.md#c1"]
    token_count: 121
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1w7p0qy/i_have_a_design_system_with_foundations_token/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1w7p0qy.md#c1"
    char_span: [546, 2136]
    sentence_count: 15
    key_terms: [components, roundabout-design, clients, library, design, system, community, customers]
    concepts: [components, roundabout-design, clients, library, design]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1w7p0qy.md#c0"]
    section: Comments
    token_count: 360
---
# I have a design system with Foundations (token library) shared with a Web component library and a Mobile component library. When a client request for unique components for their product, where should I create the new components? In my already existing component library or a dedicated library?

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1w7p0qy/i_have_a_design_system_with_foundations_token/)
Posted by **Financial-Respect-63** · **5↑** · **6 comments**

_(no body - link/image post)_

## Comments

- **roundabout-design** (2↑): This is a question to ask the client. Depends entirely on what they need and how they are implementing your design system in code.
  - **Financial-Respect-63** (1↑): Consulting with clients is easy of we have limited numbers but when we have around 20, 30 clients, we are in a position to build a scalable process and provide suggestions to them. Im still figuring out... 🤘
    - **roundabout-design** (1↑): I guess I'm a little confused. Are you using the same design system for 30 clients?
- **IdeaUpstairs** (1↑): Setting up a community library for components and patterns that are too specific for the main design system might be your best option as it stops the main library from getting too bloated. 

If the goal is to let other designers contribute to this then create clear guidelines for them and a process to check and refine anything that is added to the community library to keep it consistent.
- **404_computer_says_no** (1↑): Components in one. Themes in another. You can toggle between themes. This is no different from light or dark mode.   
For ‘snow flake’ components. Create a new file for them…or handle it centrally under a sub section of your components.

There’s pros and cons to snowflakes.   
It will depend on your org operating model and the customers using the component. 

You really have to define what’s snow flake or not. The easiest way to think about it is whether other teams/customers COULD use it?

A button is used by all, but a table for normal consumers vs an enterprise table is very different and can naturally split.
