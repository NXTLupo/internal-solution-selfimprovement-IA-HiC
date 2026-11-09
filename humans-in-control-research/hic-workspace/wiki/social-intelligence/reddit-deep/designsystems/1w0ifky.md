---
id: social-intelligence/reddit-deep/designsystems/1w0ifky.md
url: "https://www.reddit.com/r/DesignSystems/comments/1w0ifky/where_does_the_noncomponent_half_of_your_design/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "Where does the non-component half of your design system live?"
author: "SuspiciousSpeed6756"
date: "2026-08-28T06:11:46.000Z"
score: 16
upvote_ratio: 0.94
num_comments: 11
flair: ""
extracted_at: "2026-09-10T17:19:04.797Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1w0ifky.md#c0"
    char_span: [0, 985]
    sentence_count: 8
    key_terms: [system, design, designsystems, part, comments, source, suspiciousspeed6756, figma]
    concepts: [system, designsystems, design, comments, source]
    token_count: 217
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1w0ifky/where_does_the_noncomponent_half_of_your_design/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1w0ifky.md#c1"
    char_span: [1000, 2824]
    sentence_count: 10
    key_terms: [suspiciousspeed6756, thanks, perceptionfresh9631, thegratitudebot, system, figma, marketing, approved]
    concepts: [suspiciousspeed6756, perceptionfresh9631, thanks, thegratitudebot, system]
    section: Comments
    token_count: 435
---
# Where does the non-component half of your design system live?

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1w0ifky/where_does_the_noncomponent_half_of_your_design/)
Posted by **SuspiciousSpeed6756** · **16↑** · **11 comments**

Hi designers, our design system covers tokens, components and documentation, all in Figma with the docs in Storybook. That part is in decent shape. But what I think we're still struggling to solve is the logo variants, brand photography, icon source files, print assets, etc. the stuff that isn't in a component library but still part of the system.

Right now our client work is scattered between Figma files, a shared Dropbox and a Notion page. Some stakeholders have their own inventory systems like a spreadsheet or whatever. But further down the line things are just getting confusing and messed up. Is there an asset layer that's part of your design system, or do you treat it as a separate thing entirely?

## Comments

- **RocketSeven** (4↑): keep the binaries in a separate asset library, but make the design system own the metadata contract and canonical links. every logo or photo needs one approved source, an owner, usage rules, and a retirement status or dropbox will quietly become the real system
  - **PerceptionFresh9631** (1↑): Yes exactly this
  - **SuspiciousSpeed6756** (1↑): Yeah this makes sense, thanks man
- **PerceptionFresh9631** (2↑): Most systems stop at the component boundary and then the mess starts. Tokens and components have a natural home in Figma, but logo variants, photos and print files don't, so they end up wherever somebody last put them. This is the gap a DAM fills, depending on how heavy your feature needs are. Lingo has a Figma integration so in your case the two can sit side by side compatibly. Whether you call the asset layer part of the system matters less than whether someone outside the design team can find an approved file without pinging you first. That's the test I'd apply and most setups fail it.
  - **SuspiciousSpeed6756** (2↑): It's the same argument I'm hearing: Figma for DS, DAM for everything else. Definitely considering, thanks
    - **TheGratitudeBot** (1↑): Hey there SuspiciousSpeed6756 - thanks for saying thanks! TheGratitudeBot has been reading millions of comments in the past few weeks, and you’ve just made the list!
- **PuzzleheadedNeck1694** (1↑): We have icon assets and the logos we're using inside the codebase as well since these are being used by the code. The marketing materials like banners etc are owned by the product marketing and used via the CMS. Not sure why you would like to own anything more that the icons and logos.
- **Interesting-Pay1507** (-1↑): Have you asked Claude how to structure it?
  - **SuspiciousSpeed6756** (1↑): No I've asked Reddit ;)
