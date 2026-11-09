---
id: social-intelligence/reddit-deep/designsystems/1qvzk1a.md
url: "https://www.reddit.com/r/DesignSystems/comments/1qvzk1a/transitioning_a_mature_design_system_to/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "Transitioning a mature design system to responsive components (in Figma)"
author: "screwbean"
date: "2026-02-04T20:15:13.000Z"
score: 7
upvote_ratio: 1
num_comments: 5
flair: ""
extracted_at: "2026-09-10T17:19:04.805Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1qvzk1a.md#c0"
    char_span: [0, 824]
    sentence_count: 3
    key_terms: [designsystems, components, responsive, comments, design, system, figma, transitioning]
    concepts: [designsystems, components, responsive, comments, design]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1qvzk1a.md#c1"]
    token_count: 178
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1qvzk1a/transitioning_a_mature_design_system_to/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1qvzk1a.md#c1"
    char_span: [839, 1590]
    sentence_count: 6
    key_terms: [responsive, components, variables, modes, help, "it's", use, conditionally]
    concepts: [responsive, components, variables, modes]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1qvzk1a.md#c0"]
    section: Comments
    token_count: 162
  - id: "social-intelligence/reddit-deep/designsystems/1qvzk1a.md#c2"
    char_span: [1592, 3612]
    sentence_count: 11
    key_terms: [figma, figma-variable-collection-composition, responsive-breakpoints--sorta, nuxrqjcvnihp2vuhtu48ly, https, ewuvpidradb3ijnn-1, variables, container-queries]
    concepts: [figma, figma-variable-collection-composition, responsive-breakpoints--sorta, nuxrqjcvnihp2vuhtu48ly, ewuvpidradb3ijnn-1]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/designsystems/1qvzk1a.md#c3"
    char_span: [3326, 3848]
    sentence_count: 5
    key_terms: [component, approach, mobile, figma, container-queries, responsiveness, sheriffderek, collections]
    concepts: [component, approach, mobile, figma]
    section: Comments
    token_count: 125
---
# Transitioning a mature design system to responsive components (in Figma)

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1qvzk1a/transitioning_a_mature_design_system_to/)
Posted by **screwbean** · **7↑** · **5 comments**

Hi there, I am a designer and I help to maintain a large design system used mostly for an ecommerce site. The Figma libraries were built almost 4 years ago now so there are some new features we're discussing leveraging, especially using variables to make the library components fully responsive (right now we have a separate desktop and mobile version of each component.) Has anyone made this transition before? It will involve a lot of legwork so I want to approach this carefully, would love to hear from others who have managed a similar large-scale update.

## Comments

- **sheriffderek** (2↑): \> especially using variables to make the library components fully responsive

Variables will help normalize colors and some of the sizes/lengths and many things -- but it's really "modes" that can (sorta) act as a proxy for breakpoints (for responsive layout changes). But really, there isn't some magic way to make responsive Figma components. You'll likely still use variants and then use modes to conditionally decide which one to show. And that's not really that much more helpful than having a variant and just choosing the "small screen" one. It's basically the same. But there are some things like maintaining aspect ratio and grid that are new and that help things stay squishy and fill in some of the inbetween gaps.

Using a product card as an example: [https://www.figma.com/design/NuxRQjcvnIHp2VuHTU48Ly/Responsive-breakpoints--sorta--?node-id=0-1&t=EWuvPiDrADB3Ijnn-1](https://www.figma.com/design/NuxRQjcvnIHp2VuHTU48Ly/Responsive-breakpoints--sorta--?node-id=0-1&t=EWuvPiDrADB3Ijnn-1)
  - **screwbean** (3↑): Thank you, lots to think about here, I appreciate you breaking this down in the file - and yes, I was intending to use the modes (which IIRC came with/are facilitated by the variables, no?) I was wondering about whether breakpoint modes + spacing/sizing variables will be robust enough to handle each component, but if not and it will still be variant based, maybe it's better to wait until Figma is better equipped to support this?
    - **sheriffderek** (2↑): I think you gotta just get in there and do the work (*assuming there's actual value in maintaining a design system at all*). Because Figma will always change. Right now, it's actually in a very mature spot. For me, the goal of using Figma is to give people time to think through visual decisions - but that those decisions are often just going to be put in place *in the code* (and having Figma 100% responsive doesn't really help anyone). So, variables are great. Huge shift in how much Figma can be like the code. Huge win. But if you want 1:1 container queries, well - that doesn't exist exactly... and I'd say define them enough in Figma for the developers to understand - and then have the code be the source of truth for that layer. I'm keeping some explorations like this in a collection here: [https://perpetual.education/resources/figma-variable-collection-composition/#container-queries](https://perpetual.education/resources/figma-variable-collection-composition/#container-queries) \- in case you want to see other uses of collections/modes.
    - **bodyakrol** (1↑): You should compare code and Figma in terms of responsiveness. You will see that there is no magic solution. If mobile and desktop versions of component are different you will simply hide A for mobile and show B and vice versa. And similar approach u may use in Figma by switching component  variants. 

To sum up: your approach is fine
  - **sheriffderek** (1↑): (At least that how *I* understand the current options)
