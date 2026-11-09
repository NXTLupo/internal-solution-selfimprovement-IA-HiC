---
id: social-intelligence/reddit-deep/designsystems/1oohpmj.md
url: "https://www.reddit.com/r/DesignSystems/comments/1oohpmj/resource_built_a_free_tool_to_track_token/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "[Resource] Built a free tool to track token dependencies and component usage in Figma design systems – thought it might help others"
author: "Omri_Hillel"
date: "2025-11-04T20:04:23.000Z"
score: 17
upvote_ratio: 0.96
num_comments: 7
flair: ""
extracted_at: "2026-09-10T17:19:04.810Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1oohpmj.md#c0"
    char_span: [0, 2503]
    sentence_count: 12
    key_terms: [variables, components, token, variable, relationships, figma, shows, primitive]
    concepts: [variables, components, relationships, variable, token]
    token_count: 512
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1oohpmj/resource_built_a_free_tool_to_track_token/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1oohpmj.md#c1"
    char_span: [2505, 3493]
    sentence_count: 4
    key_terms: [omrihillel, tokenflow, https, component, com, data, "here's", wanted]
    concepts: [omrihillel, tokenflow, component, https, "here's"]
    token_count: 223
  - id: "social-intelligence/reddit-deep/designsystems/1oohpmj.md#c2"
    char_span: [3508, 5170]
    sentence_count: 10
    key_terms: [variables, collections, groups, visualizer, token, generating, different, hierarchy]
    concepts: [variables, collections, visualizer, groups, generating]
    section: Comments
    token_count: 367
---
# [Resource] Built a free tool to track token dependencies and component usage in Figma design systems – thought it might help others

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1oohpmj/resource_built_a_free_tool_to_track_token/)
Posted by **Omri_Hillel** · **17↑** · **7 comments**

I'm a Design System Lead managing a fairly complex setup in Figma (3-level system, 50+ products, one main file with all variables/styles, child files with components). Over the past year, I kept running into the same governance problems and couldn't find tools that solved them, so I ended up building something. Figured I'd share in case others are hitting similar walls.

# The Problems I Was Trying to Solve

**1. Tracing alias chains is manual and error-prone**

Following a token from its primitive value through multiple alias layers to its final semantic use cases meant clicking through dozens of variable definitions. No way to see the full picture at once.

**2. Can't see style-to-variable relationships**

Figma shows variable aliases fine, but the connection between styles and variables is completely hidden. Since our styles reference variables heavily, this was a blind spot.

**3. No visibility into which components use which variables**

This was the big one. When we'd discuss changing a primitive token value, I had no way to see which components would actually be affected. We were basically making educated guesses about impact and risk.

**4. No cross-branch comparison**

We work across multiple branches, and I needed to compare how token architectures differed between them—especially before merging changes.

# What I Built: TokenFlow

It's a web-based tool that connects to Figma's API and visualizes all these hidden relationships. The main things it does:

**Style + variable mapping**

* Shows both variable-to-variable relationships AND style-to-variable connections
* Shows alias mapping from primitive to semantic from each end.

**Component usage tracking**

* Shows which specific components use a variable
* Lets you assess actual risk before changing token values

**Branch comparison**

* Switch between branches to see architectural differences
* Helpful for reviewing PRs and ensuring consistency

**Mode awareness**

* Variables display values for whatever mode you select (light/dark/etc.)
* Makes it easier to audit theming consistency

# How It Works (Technical Notes)

Since Figma doesn't provide this data in the UI, TokenFlow:

* Uses the Figma REST API to pull variables, styles, collections, and component data
* Processes the raw data to map all the relationships
* Runs as a standalone HTML app (not a plugin—I wanted more flexibility)

The component usage data required some creative API work since that's not directly exposed. Had to analyze component structure and cross-reference variable IDs.

# Making It Available

**It's currently free to use**—I wanted to see if other teams dealing with large-scale design systems find it as useful as we have. I can't make promises about long-term development or support since I'm honestly not sure how much time I'll have to maintain it going forward, but figured I'd put it out there and see if it helps anyone.

  
Here's the link for the tool:

[https://tokenflow.omrihillel.com/](https://tokenflow.omrihillel.com/)



Here's the link for my portfolio page with more details about features etc.

[https://omrihillel.com/tokenflow](https://omrihillel.com/tokenflow)

## Comments

- **TheWarDoctor** (1↑): I was literally working on the same exact use case as a plugin, might need to compare notes.
- **LeosFDA** (1↑): This sounds like something I have been looking for.  Will definately check it out. Thank you for offering it for free. We have a design system with multiple collections and within those collections we created different groups for similar variables. How does it deal with variables that are in different collections and groups? We currently use a plugin called Variables Visualizer for getting an overview of how variables are being referenced and managing those connections but it doesn‘t offer any visualization for styles that are using variables.
  - **Omri_Hillel** (2↑): Hi,
Actually, I have tried using Variables Visualizer myself, it works nice but I needed more features.

Collections and groups are supported well. The Hierarchy Tree on the left side of the screen is duplicating the hierarchy from Figma: Collections>Groups>Sub-Groups>Variable item

Same for Styles
- **GOgly_MoOgly** (1↑): This sounds like it could be better than variable visualizer as the noodles disappear whenever you zoom in to read something, but it would be great if you provided more info on what should be selected when generating the token! Mine keeps saying it’s invalid and there are no instructions on how to troubleshoot.
  - **Omri_Hillel** (1↑): Not sure i got to understand your issue
Can you elaborate?
    - **GOgly_MoOgly** (1↑): Which options do we need to check when generating the token?? I selected the design system settings and when I pasted it in the field it kept saying the link was invalid API token or network error
