---
id: social-intelligence/reddit-deep/designsystems/1ueg7cj.md
url: "https://www.reddit.com/r/DesignSystems/comments/1ueg7cj/i_built_a_live_theming_playground_for_my_design/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "I built a live theming playground for my design system. Edit tokens, watch every component and full pages reskin"
author: "Fun-Penalty4762"
date: "2026-06-24T15:10:08.000Z"
score: 40
upvote_ratio: 0.88
num_comments: 12
flair: ""
extracted_at: "2026-09-10T17:19:04.798Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1ueg7cj.md#c0"
    char_span: [0, 2205]
    sentence_count: 17
    key_terms: [theming, components, playground, https, pages, semantic, my-design-system-beta, vercel]
    concepts: [components, playground, theming, my-design-system-beta, semantic]
    token_count: 498
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1ueg7cj/i_built_a_live_theming_playground_for_my_design/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1ueg7cj.md#c1"
    char_span: [2207, 4399]
    sentence_count: 15
    key_terms: [product, tokens, "it's", sillyvermicelli7169, tool, fun-penalty4762, editing, instead]
    concepts: [product, tokens, sillyvermicelli7169, fun-penalty4762, editing]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/designsystems/1ueg7cj.md#c2"
    char_span: [4401, 6510]
    sentence_count: 13
    key_terms: [components, colors, patterns, change, core, fun-penalty4762, palette, project]
    concepts: [components, colors, patterns, change, fun-penalty4762]
    section: Comments
    token_count: 462
  - id: "social-intelligence/reddit-deep/designsystems/1ueg7cj.md#c3"
    char_span: [6512, 7164]
    sentence_count: 6
    key_terms: [dlbcodes-ui-showcase, mobile, showcase, claude, vercel, outrageous-chip-3961, https, app]
    concepts: [dlbcodes-ui-showcase, mobile, showcase, claude, vercel]
    section: Comments
    token_count: 162
---
# I built a live theming playground for my design system. Edit tokens, watch every component and full pages reskin

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1ueg7cj/i_built_a_live_theming_playground_for_my_design/)
Posted by **Fun-Penalty4762** · **40↑** · **12 comments**

I've been building a component library (Vue 3, Tailwind v4, Headless UI) with a token-first theming approach, and I wanted a way to actually test how it holds up under different palettes when it's doing real work, not just rendering swatches.

So I built a playground. Edit any semantic token, or pick a preset, and the whole thing reskins live: not just isolated components, but full composed pages like a login screen, and a pricing page.

Playground: [https://dlbcodes-playground.vercel.app/](https://dlbcodes-playground.vercel.app/)  
Docs: [https://my-design-system-beta.vercel.app/](https://my-design-system-beta.vercel.app/)

How the theming is structured, since that's the part I'd most like to discuss:

Two token layers. A primitive palette feeds semantic tokens (`--color-bg-surface`, `--color-text-primary`, and so on). You theme by overriding the semantic layer, so "brand color" or "surface" is a single override, never a find-and-replace across components.

Pages are composed from the same components. The login and pricing pages are built entirely from the library's primitives (Panel, Field, Button, Disclosure). The playground's own customizer UI is too.

Runtime CSS variables. Overrides apply instantly with no rebuild, which is what makes the live reskin possible and keeps theming out of the JS layer.

I'll be upfront about where it's at: the component set is still maturing (no Table or dark mode yet), and the API will move between versions. Not pitching it as production ready.

What I'd genuinely like feedback on:

Does the two-layer approach (override semantic, leave primitives alone) match how you'd architect theming, or would you structure it differently?

When you build real pages from a design system, what makes components feel like they compose well versus fight you?

Anything in the playground that breaks or looks wrong under a custom palette?

Last thing, low stakes: it's currently called `my-design-system`, which is a placeholder. If anyone has a name that isn't terrible, I'm listening.

## Comments

- **SillyVermicelli7169** (4↑): I like the idea, but unsure how it ends up generating real value. What do you edit and how often? And why do you edit your DS often?
  - **Fun-Penalty4762** (3↑): Fair question, and you're right that nobody edits their tokens daily. The playground isn't meant as a day-to-day editing tool, it's a way to demonstrate that the theming actually works without someone having to clone the repo to find out.

The real-world value shows up at specific moments rather than continuously: white-labeling for multiple clients, a rebrand, building a dark mode, launching a new product on the same system. That's when "can I retheme everything by overriding one semantic layer?" goes from a claim to something you can verify in 30 seconds. The live editing is the proof, not the workflow.

Does that match what you were getting at, or were you asking something more specific about the architecture?
    - **SillyVermicelli7169** (2↑): Yea I can dig that. E.g. giving customers this as a tool to config their own theme for the product instead of giving them some config page and telling them to go back and forth across the product to see whether their tokens make sense.
  - **sleepycommenter** (2↑): who's actually touching the tokens tho - designers, a dev, or both? i only ever see them change when branding lands or a product team ships a new theme, which is not often, so im trying to figure out if this is a daily tool or a nice demo
    - **Fun-Penalty4762** (0↑): Both, usually, but you've got it right, tokens change rarely. Branding lands, or a product team ships a theme, and otherwise they sit untouched. So no, it's not a daily tool.

It's a demo, and deliberately so. The point isn't to send designers and devs back and forth editing tokens. It's that when one of those rare retheming moments does happen, the system can absorb it by overriding one semantic layer instead of touching components, and the playground lets you confirm that's true in 30 seconds instead of cloning the repo to find out.

The bet underneath it is that the components handle the hard parts (accessibility, keyboard nav, focus, positioning) out of the box, so the only thing a consuming team customizes is the brand surface, the colors. The playground is the proof of that split: everything else is handled, you bring the palette.
  - **tomhermans** (2↑): One reason could be reusable components for different projects..
A BIG reason
    - **Fun-Penalty4762** (1↑): Exactly, that's the case that makes it pay off continuously rather than once. Agency or studio with five client projects, or one team running several products: build the components once, give each project its own token palette, and they all stay consistent and accessible without rebuilding anything per project. The per-project cost drops to "pick the colors."
- **bodyakrol** (2↑): Two layer approach: the way how it works in DS make sense. But in case if I would like to customize theme for my project brand personality will required to change the primitives and would be nice to change only the core colors and system would adapt palettes automatically. 

“What makes components feel like they compose well…” — I’m not sure that I get question fully, but what came in to my mind after I’ve read this are Patterns. If I have established patterns in the system, it is easy to build something, but patterns is on a higher level than the components in this case. Simple example what I mean by patterns: every editing page has “save” button at the top right corner in the app bar. 

Haven’t test the playground cause on mobile screen it doesn’t display properly
  - **Fun-Penalty4762** (1↑): Closer to how it works than it might've looked. You don't override every token to rebrand, you change the brand token and a couple of core ones, and everything updates, because components only read semantic tokens, never raw colors. So "change the core colors and the system adapts" is the model.

Where I stop is auto-generating a whole palette from one seed color. That's hard to do well (contrast, muddy mid-tones), so I keep the core colors explicit rather than generated.

If you want to see it in a real app, there's a showcase build here: [https://dlbcodes-ui-showcase.vercel.ap](https://dlbcodes-ui-showcase.vercel.app)p. Token switcher bottom-right, flip themes and the whole site rebrands live.

And on mobile, you're right, and honestly I haven't cracked a good mobile experience for the playground yet. An editor next to a live preview is awkward to fit on a small screen. Real gap. The showcase link works better on mobile if you want to see the theming.
- **Outrageous-Chip-3961** (1↑): It's cool but something about it feels like heavily claude assisted, and i was surprised not to see a claude file in the project.
