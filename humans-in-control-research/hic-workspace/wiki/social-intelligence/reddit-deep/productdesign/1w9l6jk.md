---
id: social-intelligence/reddit-deep/productdesign/1w9l6jk.md
url: "https://www.reddit.com/r/productdesign/comments/1w9l6jk/designing_a_review_loop_where_the_running_appnot/"
kind: "social-post"
source: "reddit-deep: r/productdesign"
subreddit: "productdesign"
title: "Designing a review loop where the running app—not a mockup—is the canvas"
author: "ivanzhaowy"
date: "2026-09-07T07:20:07.000Z"
score: 1
upvote_ratio: 1
num_comments: 0
flair: ""
extracted_at: "2026-09-10T17:19:06.264Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/productdesign/1w9l6jk.md#c0"
    char_span: [0, 1977]
    sentence_count: 10
    key_terms: [https, com, monad-design, app, monadix-ai, workflow-compare-variants, githubusercontent, pio8jqfcg4ivj0r1]
    concepts: [https, monad-design, monadix-ai, workflow-compare-variants, githubusercontent]
    token_count: 440
    sources: [{"n":"reddit-deep: r/productdesign","u":"https://www.reddit.com/r/productdesign/comments/1w9l6jk/designing_a_review_loop_where_the_running_appnot/","kind":"social-post","date":"2026-09-07","author":"ivanzhaowy","subreddit":"productdesign"}]
---
# Designing a review loop where the running app—not a mockup—is the canvas

Source: [reddit-deep: r/productdesign](https://www.reddit.com/r/productdesign/comments/1w9l6jk/designing_a_review_loop_where_the_running_appnot/)
Posted by **ivanzhaowy** · **1↑** · **0 comments**

I’m building Monad Design around a product-design constraint I kept running into: once a native interface is implemented, visual feedback often gets detached from the exact app state and from the source that produced it.



The principle is: the app is the canvas.



A designer or developer opens an existing Xcode or Expo iOS project, runs the real app in Simulator, and navigates to the exact state. They can select an element or annotate the screen; the workspace packages that visual context with app state and source hints for a coding agent. The agent edits the existing repository and rebuilds. The result is reviewed beside the original, with up to five source-backed variants, and the human can accept one or keep the original.



The product decision was to avoid becoming another mockup generator. Every candidate should remain connected to the real app and codebase, and approval should stay reversible.



A screenshot of the comparison workflow:

[https://raw.githubusercontent.com/Monadix-AI/monad-design/main/docs/images/workflow-compare-variants.png](https://raw.githubusercontent.com/Monadix-AI/monad-design/main/docs/images/workflow-compare-variants.png)



Short demo:

[https://watchclueso.com/embed/pio8jqfcg4ivj0r1](https://watchclueso.com/embed/pio8jqfcg4ivj0r1)



Open-source implementation:

[https://github.com/Monadix-AI/monad-design](https://github.com/Monadix-AI/monad-design)



Current limitations: macOS and local iOS development only, with one active visual change at a time.



For product designers working with implemented interfaces: would you rather compare several source-backed variants at once, or iterate one change at a time with a tighter annotation loop?
