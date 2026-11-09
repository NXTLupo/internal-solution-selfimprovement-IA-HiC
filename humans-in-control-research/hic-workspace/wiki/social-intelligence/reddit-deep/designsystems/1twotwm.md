---
id: social-intelligence/reddit-deep/designsystems/1twotwm.md
url: "https://www.reddit.com/r/DesignSystems/comments/1twotwm/i_built_an_ai_design_system_with_accessibility/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "I built an AI design system with accessibility & ethics baked in"
author: "matthewlarn"
date: "2026-06-04T14:10:53.000Z"
score: 9
upvote_ratio: 0.85
num_comments: 5
flair: ""
extracted_at: "2026-09-10T17:19:04.803Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1twotwm.md#c0"
    char_span: [0, 2227]
    sentence_count: 1
    key_terms: [accessibility, behavioral-agentic-design-system, design, designsystems, https, like, comments, better]
    concepts: [behavioral-agentic-design-system, accessibility, design, designsystems, https]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1twotwm.md#c2"]
    token_count: 498
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1twotwm/i_built_an_ai_design_system_with_accessibility/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1twotwm.md#c1"
    char_span: [2229, 2719]
    sentence_count: 1
    key_terms: [building-bads-the-behavioral-agentic-design-system-5698ff721db1, matthewlarn, medium, https, com, here, improvements, engineering]
    concepts: [building-bads-the-behavioral-agentic-design-system-5698ff721db1, matthewlarn, medium, https]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1twotwm.md#c2"]
    token_count: 117
  - id: "social-intelligence/reddit-deep/designsystems/1twotwm.md#c2"
    char_span: [2734, 3233]
    sentence_count: 3
    key_terms: [behavioral-agentic-design-system, matthewlarn, mobile, vercel, https, app, demo, mp-product-guy]
    concepts: [behavioral-agentic-design-system, matthewlarn, mobile, vercel, https]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1twotwm.md#c0", "social-intelligence/reddit-deep/designsystems/1twotwm.md#c1"]
    section: Comments
    token_count: 150
---
# I built an AI design system with accessibility & ethics baked in

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1twotwm/i_built_an_ai_design_system_with_accessibility/)
Posted by **matthewlarn** · **9↑** · **5 comments**

demo here: [https://behavioral-agentic-design-system.vercel.app/](https://behavioral-agentic-design-system.vercel.app/) password: bads2026 (still a WIP)

like everyone else, my work has changed pretty dramatically in the past few months.. i find myself skipping Figma altogether now, shipping design systems with full, responsive, polished prototypes. at the same time, it feels like every employee at every company i work with is vibe coding their own ideas into existence. so i wanted to handoff a design system that anyone could use. and i figured i'd bake in the things i write about: accessibility, ethics, future thinking, etc.

the result is pretty cool, so i wanted to share.

some of the interesting stuff:

\- accessibility is just baked in, not a checklist at the end. it physically wont let me ship low contrast text, tap targets that are too small, or type under 14px. the floor is always there whether i remember it or not

\- it actually pushes back on dark patterns. no confirmshaming, no fake urgency countdowns, no sneaky pre checked marketing boxes. and it stops to think about how a feature could go sideways later, when it scales or ends up in the wrong hands

\- it remembers feedback. every time a client says "not like that," it gets written down, and if the same note keeps coming up it becomes a permanent rule. even better, a lesson learned on one clients project carries forward to the next one so i never relearn it

\- it plugs into the AI design tools i already use (figma, v0, cursor) so they all pull from the same brand rules. i dont have to re explain the brand to every tool separately

\- and the part im still kind of amazed works, a night shift. theres an assistant that runs every weeknight while im asleep. it cleans up loose ends, researches whats new in design and accessibility, makes small safe improvements, and leaves me a summary in slack every morning. i wake up to a little changelog of what got better overnight

i'm still working on the engineering handoff and some other improvements, like MCP servers and baking marketing design into it..

i appreciate all the feedback you have. i've learned alot from lurking here, which helped inspire this...

wrote up the longer version here if anyone wants the detail: [https://matthewlarn.medium.com/building-bads-the-behavioral-agentic-design-system-5698ff721db1](https://matthewlarn.medium.com/building-bads-the-behavioral-agentic-design-system-5698ff721db1)

## Comments

- **ulrjch** (1↑): so many words and no demo?
  - **matthewlarn** (1↑): [https://behavioral-agentic-design-system.vercel.app/](https://behavioral-agentic-design-system.vercel.app/) password: bads2026

i'll edit the post, too.
- **mp-product-guy** (1↑): This sounds cool. The site is totally inoperable on my mobile device (iPhone 16, safari) and doesn’t seem responsive, I’m unable to try your demo on mobile.
  - **matthewlarn** (1↑): Yea it’s still a WIP. I’ll work on that thanks for the feedback
