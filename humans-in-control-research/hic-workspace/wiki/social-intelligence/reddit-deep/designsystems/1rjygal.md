---
id: social-intelligence/reddit-deep/designsystems/1rjygal.md
url: "https://www.reddit.com/r/DesignSystems/comments/1rjygal/i_built_myself_a_design_system_playground_primui/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "I built myself a \"design system\" playground (primui) to quickly visualize broad-strokes changes across a whole component library"
author: "only_to_unsub"
date: "2026-03-03T19:13:13.000Z"
score: 10
upvote_ratio: 0.86
num_comments: 2
flair: ""
extracted_at: "2026-09-10T17:19:04.806Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1rjygal.md#c0"
    char_span: [0, 1170]
    sentence_count: 6
    key_terms: [components, primui, designsystems, comments, design, source, though, https]
    concepts: [components, designsystems, primui, comments, design]
    token_count: 268
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1rjygal/i_built_myself_a_design_system_playground_primui/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1rjygal.md#c1"
    char_span: [1185, 2378]
    sentence_count: 15
    key_terms: [accessibility, definitely, through, though, maleficent-anything2, flow, overwhelming, wizard-style]
    concepts: [accessibility, definitely, through, though]
    section: Comments
    token_count: 255
---
# I built myself a "design system" playground (primui) to quickly visualize broad-strokes changes across a whole component library

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1rjygal/i_built_myself_a_design_system_playground_primui/)
Posted by **only_to_unsub** · **10↑** · **2 comments**

Let me preface by saying I'm not an expert in design systems, though I've experienced some pain points as a frontend engineer in the past, and I was hoping to address some of those.

I wanted something where I could just pick my colors, move some sliders for spacing and typography, and get a set of components that already look cohesive.

I'm calling it "primui": https://primui.com

There are about 50 components right now — buttons, inputs, cards, modals, tables, nav, plus some compositions like hero sections and CTAs, and some example pages. React and Vue only for now, not open source, though you are free to use and edit whatever you export!

It's free for now while I figure out if it even makes sense to monetize. If you try it I'd genuinely appreciate feedback, especially on what components, feature, or polish feel missing!

## Comments

- **Maleficent-Anything2** (3↑): Cool idea. I’ve built internal tools like this before and some of your thinking is definitely heading in the right direction.

One potential deal breaker though: accessibility. If I import colours and they fail contrast checks, that’s a big problem. If the tool’s message is “don’t overthink it”, then I need to be able to trust the output — it needs to be pretty foolproof.

The UI also feels a bit overwhelming at the moment. There are a lot of buttons and options competing for attention. A more guided or wizard-style flow might make it easier to approach.

For example, presets are always visible. If I’m building my own setup, that whole list just becomes noise. Maybe that could live behind a dropdown or appear only when needed.

  
Nice one though!   
keep it up
  - **only_to_unsub** (3↑): I definitely agree that accessibility will be important for anybody trying to use this, and I'm currently working through some intuitive ways to enforce that while also showing compliance in realtime.

And a wizard flow makes a ton of sense! I'll absolutely think through how I can incorporate that as the initial touch-point.

Thanks so much for the feedback!
