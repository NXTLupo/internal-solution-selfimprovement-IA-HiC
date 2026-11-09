---
id: social-intelligence/reddit-deep/designsystems/1qbx6v3.md
url: "https://www.reddit.com/r/DesignSystems/comments/1qbx6v3/making_figma_components_functional_why_design/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "Making Figma Components Functional: Why Design Systems Need a “Logic Layer”"
author: "Rough-Mortgage-1024"
date: "2026-01-13T17:23:30.000Z"
score: 13
upvote_ratio: 0.81
num_comments: 12
flair: ""
extracted_at: "2026-09-10T17:19:04.804Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1qbx6v3.md#c0"
    char_span: [0, 314]
    sentence_count: 1
    key_terms: [designsystems, comments, rough-mortgage-1024, reddit-deep, components, functional, systems, design]
    concepts: [designsystems, comments]
    token_count: 85
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1qbx6v3/making_figma_components_functional_why_design/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1qbx6v3.md#c1"
    char_span: [329, 2422]
    sentence_count: 18
    key_terms: [rough-mortgage-1024, design, component, logic, code, product, system, like]
    concepts: [rough-mortgage-1024, component, design, logic, product]
    section: Comments
    token_count: 484
  - id: "social-intelligence/reddit-deep/designsystems/1qbx6v3.md#c2"
    char_span: [2424, 3434]
    sentence_count: 10
    key_terms: [figma, automation, storybook, manually, script, rough-mortgage-1024, logic, bentheninjagoat]
    concepts: [automation, figma, storybook, manually, script]
    section: Comments
    token_count: 245
---
# Making Figma Components Functional: Why Design Systems Need a “Logic Layer”

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1qbx6v3/making_figma_components_functional_why_design/)
Posted by **Rough-Mortgage-1024** · **13↑** · **12 comments**

_(no body - link/image post)_

## Comments

- **TheWarDoctor** (3↑): This is quite interesting. We used to be able to do some similar things with UXPin 10 years ago, been waiting for Figma to catch up to that ability.
  - **Rough-Mortgage-1024** (1↑): I agree. This is how any MVC programming languages work. Apparently even being a product design tool, figma is lacking this feature and in this era of AI we need something like this.
    - **defp_** (1↑): we used Axure for things like this 10 years ago.
There are plenty of other ways to make dev.specs and documentation for component. Fully functional prototype aren't always necessary.
Learn to code and jump to UI Engineer.
- **shaunbent** (3↑): Does this not assume design system = design? Is the logic layer not the code implementation?
  - **Rough-Mortgage-1024** (0↑): Not exactly. I’m talking about **workflow logic**, not product logic.

Product logic (code) runs the app, but workflow logic (this plugin) runs the **tool**. Currently, designers spend too much time manually 'compiling' components by clicking toggles. This isn't replacing design with code, it’s just using automation to handle the component 'plumbing' so designers can spend more time on actual design and less on manual configuration.
- **sheriffderek** (2↑): I think trying to have full parity is a waste of time and just creates more work and more things to go wrong. One app might use PHP, another Vue or React, another iOS or some custom kiosk system or hook into graphics programs. Each of those situations has their own unit tests and connection points. I have a life style-guide/system page with each component in each state so you can style in one place without having to go so many layers into the accounts and routes for find say - a calendar component. I believe that people want these things out of anxious completionism mentality (not because it helps the team).
  - **Rough-Mortgage-1024** (1↑): I think there’s a slight misunderstanding. I’m not talking about the **output/production code** (like React or Vue). I agree that trying to achieve full parity across every framework is a headache.

What I’m proposing is purely **automation within Figma**, similar to how a plugin works. Think of it as a 'logic layer' for the designer, not the developer. Instead of manually clicking through layers to find a calendar component state, you use a script to pull it up instantly.

You don't even have to manually write this logic. I used AI to generate the script . It’s not about 'anxious completionism', it’s about using automation to stop doing the manual grunt work that Figma’s standard property panel doesn't handle well
    - **sheriffderek** (1↑): I see. So, it just interprets the toggles and things and makes something you can play with (with natural ui vs the figma sidebar). That seems doable. I haven't found myself very frustrated by that though.
- **vazark** (1↑): So basically storybook but for designers. Not a bad idea
  - **bentheninjagoat** (1↑): That actually helps this make more sense.
  - **Rough-Mortgage-1024** (1↑): Not really storybook, an alternative approach to update your designs
