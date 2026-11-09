---
id: social-intelligence/reddit-deep/designsystems/1pe9nju.md
url: "https://www.reddit.com/r/DesignSystems/comments/1pe9nju/i_connected_my_design_system_to_ai_now_i_can/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "I connected my Design System to AI. Now I can re-theme the entire UI with a text prompt."
author: "WestAbbreviations504"
date: "2025-12-04T19:40:53.000Z"
score: 23
upvote_ratio: 0.85
num_comments: 4
flair: ""
extracted_at: "2026-09-10T17:19:04.810Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1pe9nju.md#c0"
    char_span: [0, 1355]
    sentence_count: 4
    key_terms: [https, uxdsl, design, system, designsystems, rsantoyo-dev, com, comments]
    concepts: [https, uxdsl, designsystems, rsantoyo-dev, design]
    token_count: 368
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1pe9nju/i_connected_my_design_system_to_ai_now_i_can/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1pe9nju.md#c1"
    char_span: [1370, 1915]
    sentence_count: 5
    key_terms: [westabbreviations504, like, density, spacing, nice, time, communication, development]
    concepts: [westabbreviations504, density, spacing]
    section: Comments
    token_count: 137
---
# I connected my Design System to AI. Now I can re-theme the entire UI with a text prompt.

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1pe9nju/i_connected_my_design_system_to_ai_now_i_can/)
Posted by **WestAbbreviations504** · **23↑** · **4 comments**

https://preview.redd.it/e04q0ktwp85g1.png?width=1598&format=png&auto=webp&s=24b42f7699c00c31a7717ad0d103d4959f4cc4d8

Hey everyone,

I’ve been building **UXDSL** (a PostCSS design system compiler), and I wanted to test if I could make the design tokens "live."

I built a tiny runtime bridge (\~1kb) that connects the CSS variables in the DOM directly to an AI model (Gemini).

**The Result:** You can type prompts like *"Cyberpunk city"* or *"Coffee shop vibe"* and the AI generates a valid semantic token set (colors, contrasts, surfaces) that updates the site instantly without reloading or breaking the layout.

Because the system uses "Intelligent Density" macros (`density(2)`) instead of hardcoded pixels, the layout stays robust even when the theme changes drastically.

**Try it live here:** [https://uxdsl.vercel.app/](https://uxdsl.vercel.app/) **Repo:** [https://github.com/rsantoyo-dev/uxdsl](https://github.com/rsantoyo-dev/uxdsl)

Would love to know if you think this "Generative UI" approach has a future!

https://i.redd.it/2mrrqbjyp85g1.gif

## Comments

- **GOgly_MoOgly** (1↑): Would like to achieve something like this in cursor. Nice job
  - **WestAbbreviations504** (1↑): thank you. you can use it,m there is a react starter project.
- **ChiBeerGuy** (1↑): This is really nice. I like spacing vs density. I'm just calling it spacer vs spacing.
  - **WestAbbreviations504** (2↑): Thanks for your taking the time to read, and yes, density is my favorite feature. If you check typography works pretty similar, this may saves tons of development time, and communication with designers vs programmers
