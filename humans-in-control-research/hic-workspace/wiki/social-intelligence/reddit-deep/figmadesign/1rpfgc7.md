---
id: social-intelligence/reddit-deep/figmadesign/1rpfgc7.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1rpfgc7/best_workflow_for_turning_figma_designs_into/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Best workflow for turning Figma designs into SwiftUI with AI tools?"
author: "techbro2"
date: "2026-03-09T22:46:54.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 2
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.221Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1rpfgc7.md#c0"
    char_span: [0, 1077]
    sentence_count: 10
    key_terms: [figma, like, swiftui, figmadesign, workflows, comments, original, design]
    concepts: [figma, swiftui, figmadesign, workflows, comments]
    token_count: 250
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1rpfgc7/best_workflow_for_turning_figma_designs_into/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1rpfgc7.md#c1"
    char_span: [1092, 1677]
    sentence_count: 4
    key_terms: [figma, generate, figma-edit-mcp, https, neozhehan, claude, github, anunknownapproaching]
    concepts: [figma, generate, figma-edit-mcp, https, neozhehan]
    section: Comments
    token_count: 154
---
# Best workflow for turning Figma designs into SwiftUI with AI tools?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1rpfgc7/best_workflow_for_turning_figma_designs_into/)
Posted by **techbro2** · **1↑** · **2 comments**

I’m trying to figure out the best way to go from Figma to a real iOS app (SwiftUI) using AI coding tools like Claude Code.

Exporting images/screens as references isn't the greatest. The result looks similar but has none of the original intent.

Weirdly enough, describing the UI step by step in text gives better results, but it doesn't look like the original design.

Ideally I want something closer to taking my actual Figma design and implementing it cleanly in Xcode, not just approximating it.

I’ve seen things like Figma MCP mentioned, but it requires a paid Figma plan and I’m not sure how well workflows like that translate to native iOS. I've only seen Figma MCP demos for web development.

What workflows are people using right now to go from Figma to SwiftUI with AI assistance? 

What’s actually working?

## Comments

- **AnUnknownApproaching** (2↑): You can try my Figma MCP Plugin:  
[https://github.com/neozhehan/figma-edit-mcp](https://github.com/neozhehan/figma-edit-mcp)

You can use Figma plugins even with a free Figma account.  
I'd recommend asking Claude Opus 4.6 to generate an implementation plan to get your designs into SwiftUI.
- **khoahoang668** (1↑): We prepare to release Spek - the solution for generate Figma to Code for any platform. Compatible with Cursor, Claude Code. You can look at demo how it generate from ui kits to complete Home Screen [here](https://makespek.vercel.app/)
