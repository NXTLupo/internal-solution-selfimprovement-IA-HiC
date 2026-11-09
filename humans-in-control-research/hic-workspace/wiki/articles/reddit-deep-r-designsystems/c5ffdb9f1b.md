---
id: articles/reddit-deep-r-designsystems/c5ffdb9f1b.md
url: "https://www.reddit.com/r/DesignSystems/comments/1pi4oh6/i_deleted_50_font_variants_and_let_ai_handle_the/"
url_hash: "c5ffdb9f1b"
kind: "article"
source: "Reddit Deep: r/designsystems"
title: "I deleted 50 font variants and let AI handle the physics. My vision of the future of Design Systems."
author: ""
date: "2025-12-09T11:03:30.000Z"
tier: 
method: "source-native"
extracted_at: "2026-09-10T17:26:11.652496+00:00"
chars: 10332
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:26:11.480Z"
relevance: 50
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "8812027076f3cdd3"
relevance_by_goal: {"5a163910d68e":50}
chunks:
  - id: "articles/reddit-deep-r-designsystems/c5ffdb9f1b.md#c0"
    char_span: [0, 1847]
    sentence_count: 13
    key_terms: [design, system, typography, keypad, designsystems, https, phone, uxdsl]
    concepts: [typography, design, system, designsystems, keypad]
    token_count: 485
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1pi4oh6/i_deleted_50_font_variants_and_let_ai_handle_the/","kind":"article","date":"2025-12-09","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/c5ffdb9f1b.md#c1"
    char_span: [1849, 3609]
    sentence_count: 12
    key_terms: [component, physics, prompt, theme, uxdsl, css, typography, developer]
    concepts: [component, physics, prompt, theme, typography]
    token_count: 472
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1pi4oh6/i_deleted_50_font_variants_and_let_ai_handle_the/","kind":"article","date":"2025-12-09","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/c5ffdb9f1b.md#c2"
    char_span: [3611, 5486]
    sentence_count: 8
    key_terms: [uxdsl, https, theme, vercel, documentation, breakpoints, app, interfaces]
    concepts: [uxdsl, https, theme, documentation, vercel]
    token_count: 500
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1pi4oh6/i_deleted_50_font_variants_and_let_ai_handle_the/","kind":"article","date":"2025-12-09","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/c5ffdb9f1b.md#c3"
    char_span: [5488, 7407]
    sentence_count: 3
    key_terms: [https, keywords, linkedin, results, origin, search, hashtag, com]
    concepts: [https, keywords, linkedin, results, origin]
    token_count: 512
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1pi4oh6/i_deleted_50_font_variants_and_let_ai_handle_the/","kind":"article","date":"2025-12-09","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/c5ffdb9f1b.md#c4"
    char_span: [7409, 9338]
    sentence_count: 10
    key_terms: [json, figma, on-type-patterns-and-style-guides, components, variables, memorize, "they're", system]
    concepts: [figma, components, variables, memorize, "they're"]
    token_count: 475
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1pi4oh6/i_deleted_50_font_variants_and_let_ai_handle_the/","kind":"article","date":"2025-12-09","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/c5ffdb9f1b.md#c5"
    char_span: [9340, 10584]
    sentence_count: 10
    key_terms: [css, performance, interfaces, variables, angular, browser, westabbreviations504, figma]
    concepts: [performance, interfaces, variables, angular, browser]
    token_count: 318
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1pi4oh6/i_deleted_50_font_variants_and_let_ai_handle_the/","kind":"article","date":"2025-12-09","subreddit":"designsystems"}]
---
# I deleted 50 font variants and let AI handle the physics. My vision of the future of Design Systems.

Source: [Reddit Deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1pi4oh6/i_deleted_50_font_variants_and_let_ai_handle_the/)

https://preview.redd.it/r7xjf4c1u56g1.png?width=1736&format=png&auto=webp&s=2fa2174375f72504fb6e93d72b90621be36a0ad6

**We are over-engineering Typography. I built** [**UXDS**](https://uxdsl.vercel.app/)L (UX Design System Langiage), **a system that uses 30-year-old HTML tags to let AI control the entire UI with a single prompt.**

If you look at a modern enterprise Design System, you will likely find a “Typography Dictionary” that looks like this: `DisplayLargeBold HeadingMediumProminent BodyRelaxedSecondary CaptionSmallUppercased`

We force developers to memorize these dictionaries. Then, when an AI agent tries to build a UI, it has to “hallucinate” which weirdly named variant fits the context. It is a friction point that breaks the promise of AI-driven development.

**I realized we were solving the wrong problem.** We don’t need more semantic names. We need a system that respects the muscle memory of the web, so AI can drive the styling physics without touching the component code.

Here is how **UXDSL** handles typography, and why it changes the game for AI integration.

# 1. The “Phone Keypad” Philosophy

There is a classic design debate about the phone keypad (1–2–3 at the top) vs. the calculator (7–8–9 at the top). The conclusion? **Don’t fight muscle memory.**

For 30 years, every developer has known that `<h1>` is the biggest title and `<h6>` is the smallest. It is the "Phone Keypad" of the web.

UXDSL bets on this native knowledge. Instead of inventing a new API, we strictly use the HTML tags as the interface.

**The Old Way (High Cognitive Load):**

JavaScript

    // Developer: "Wait, was it HeaderXL or DisplayLarge?"
    // AI: "I have no idea what 'Prominent' means in this context."
    <Typography variant="HeaderXLProminent">Hello World</Typography>

**The UXDSL Way (Zero Friction):**

CSS

    /* Developer: "It's a main title. Done." */
    /* AI: "I know exactly what an h1 is." */
    .hero {
      (h1);
    }

# 2. Decoupling Intent from Physics

The magic isn’t just using `h1`. It's what happens *after*.

In most systems, classes are static. In UXDSL, the `u/ds-typo` directive doesn't apply a font-size. **It opens a portal to the Theme.**

When I looked at the compiled code for my system, I ensured that the component remains agnostic to the “physics” of the design.

**The Component Code (Static):**

CSS

    /* This never changes, even if the brand changes completely */
    .title { u/ds-typo(h1); }

**The Theme Brain (Dynamic & AI-Controlled):** This is where the magic happens. The physics — how an `h1` behaves on an iPhone vs. a desktop, what font family it uses, how much it weighs—is defined in a single Token file using responsive functions.

CSS

    /* content of theme-def.uxdsl */
    :root {
      /* AI can manipulate this single line to reshape the whole app */
      --h1-size: xs(2rem) md(3rem) lg(5rem); 
      --h1-font: var(--font-geometric-sans);
    }

# 3. The “One Prompt” Re-Theme

Press enter or click to view image in full size

Because we stripped the “style” out of the component and left only the “semantic tag,” we can now use Large Language Models (LLMs) to re-theme the application dynamically.



I built a playground to test this. I can feed the AI a prompt, and it doesn’t touch my React components. It only touches the **Theme Definition**.

**The Prompt:**

>

https://preview.redd.it/7tu1gbf4u56g1.png?width=1598&format=png&auto=webp&s=42e523bdab0346fb7e6af20c339b7ba3930acfc8

**What the AI does:**

* **Scans the Theme:** It finds the token definitions for `h1`\-`h6`.
* **Adjusts Physics:** It changes `lg(3rem)` to `lg(6rem)` (massive).
* **Adjusts Letter Spacing:** It tightens the tracking.
* **Swaps the Font Variable:** It updates the import to a new Google Font.

**The Result:** Instantly, every single header in the application updates. The responsive breakpoints adjust automatically because they are calculated by the PostCSS engine, not hardcoded in CSS.

# 4. Why this matters for the future

We are entering an era where interfaces will be generated on the fly. If our Design Systems are brittle maps of hardcoded values, AI cannot control them effectively.

By returning to the native semantics of HTML (`h1`, `p`, `code`, `small`) and using **Tokens as the control knobs**, we create a system that is:

* **Human Friendly:** No documentation needed. You know what an `h1` is.
* **AI Native:** LLMs understand standard HTML semantics perfectly.
* **Responsive by Default:** The theme handles the breakpoints, not the developer.

UXDSL isn’t just a CSS library; it’s a protocol for AI-controlled interfaces.

# Ready to delete your style dictionary?

Stop maintaining brittle component libraries and start building systems that AI can actually understand.

**🚀** [**Explore the UXDSL Typography Documentation**](https://uxdsl.vercel.app/)

**What you will find in the docs:**

* [**Live Demos:**](https://uxdsl.vercel.app/) See how u/ds-typo`(h1)` responds instantly to theme changes.
* [**The Theme Schema**](https://uxdsl.vercel.app/)**:** Copy the exact token structure used to power this system.
* **PostCSS Setup:** A 2-minute guide to installing the plugin in your Next.js or Vite project.

**🔗 Essential Links:**

* **Documentation:** [uxdsl.vercel.app/](https://uxdsl.vercel.app/docs/typography)
* **Documentation Typography:** [uxdsl.vercel.app/docs/typography](https://uxdsl.vercel.app/docs/typography)
* **The Playground:** [uxdsl.vercel.app](https://uxdsl.vercel.app/docs/typography)

https://i.redd.it/a4k5vir9u56g1.gif

*Stop fighting the platform. Let the browser handle the semantics, and let AI handle the physics.*

[\#DesignSystems](https://www.linkedin.com/search/results/all/?keywords=%23designsystems&origin=HASH_TAG_FROM_FEED) [hashtag#WebDevelopment](https://www.linkedin.com/search/results/all/?keywords=%23webdevelopment&origin=HASH_TAG_FROM_FEED) [hashtag#AI](https://www.linkedin.com/search/results/all/?keywords=%23ai&origin=HASH_TAG_FROM_FEED) [hashtag#GenerativeUI](https://www.linkedin.com/search/results/all/?keywords=%23generativeui&origin=HASH_TAG_FROM_FEED) [hashtag#CSS](https://www.linkedin.com/search/results/all/?keywords=%23css&origin=HASH_TAG_FROM_FEED) [hashtag#Frontend](https://www.linkedin.com/search/results/all/?keywords=%23frontend&origin=HASH_TAG_FROM_FEED) [hashtag#ReactJS](https://www.linkedin.com/search/results/all/?keywords=%23reactjs&origin=HASH_TAG_FROM_FEED) [hashtag#OpenSource](https://www.linkedin.com/search/results/all/?keywords=%23opensource&origin=HASH_TAG_FROM_FEED) [hashtag#PostCSS](https://www.linkedin.com/search/results/all/?keywords=%23postcss&origin=HASH_TAG_FROM_FEED) [hashtag#TypeScript](https://www.linkedin.com/search/results/all/?keywords=%23typescript&origin=HASH_TAG_FROM_FEED)

--- TOP COMMENTS ---
[3↑ scrndude] Wow you even let AI write the post for you
[1↑ WestAbbreviations504] I wish, but of course, I used help to have a better polished output.
[2↑ sheriffderek] \> For 30 years, every developer has known that `<h1>` is the biggest title and `<h6>` is the smallest.

I've been spending the last 15 years trying to get people *not* to think this way. 

I'm not sure how the "physics" marketing will go, but you got me to read the whole thing!

\> We force developers to memorize these dictionaries

If the goal is to make things more simple, you can get the team to stick to [7-9 type patterns](https://css-tricks.com/on-type-patterns-and-style-guides/). If they can't memorize those, well - that's why they're documented. People on all the teams need to know these so they know what they're talking about.

\> Then, when an AI agent tries to build a UI, it has to “hallucinate” which weirdly named variant fits the context.

If you have a live style-guide on your site (and your components are actively using the system) they are self documenting and the LLM/agent will follow suit very well. You're almost always just reusing already existing components - so, it doesn't have to guess. I can only speak for ClaudeCode.

\> By returning to the native semantics of HTML

Anyone who isn't using proper HTML... well, I'm imagining - they have tons of other really huge problems.

.

How are you planning to get the tokens out and into Figma and all the other programs and iOS and things?
[1↑ WestAbbreviations504] ...,"typography_details": {
        "h1": { "fontSize": "xs(32px) sm(36px) md(44px) lg(52px) xl(60px)", "fontWeight": "700", "lineHeight": "1.1", "letterSpacing": "-0.02em" },...

'example of config json slice for typo'

"Thanks for reading! I appreciate you taking the time to explore our work.

**1. On Figma & Exporting:** Because the entire system is controlled by a single **JSON configuration file**, interoperability is actually very easy.

* **For Web:** We use PostCSS to compile that JSON into standard, high-performance CSS variables.
* **For Figma:** We can map the JSON structure directly to Figma Variables (REST API or plugin).
* **For Devices:** Since the source is just JSON, and export pure css, we can find a way to map it, it will be on a next phase.

**2. On Performance:** The runtime library is optional. For production, everything is precompiled by PostCSS. It compiles down to raw, atomic CSS variables. So, to the browser (or a mobile web view), it is just static CSS—as fast as Tailwind or raw stylesheets.

The 'magic' is that we keep the **definition** in JSON (for the AI/Designers) but ship **CSS** (for the browser)."
[1↑ sheriffderek] How are you getting the JSON into Figma and keeping the Figma variables in place - and all attached and things?

"Typo" (not sure what country you're from) but - it reads as "typo" as in - *an accident/misspelling*. `type` is probably a reserved word in JS. But just noting that.
[1↑ GOgly_MoOgly] Is the angular compatible?
[2↑ WestAbbreviations504] Hi. it will be soon. we are working on the webpack so that you can import it, as for now it only has been tested for vite.   
Fun fact. I created another similar, but css in js, specific for angular https://sjss.dev/. nonetheless I have to say css in js, is slow on big interfaces, and this is why It has been changed to post css. and gain control on cache and performance speed for big projects
[1↑ OrtizDupri] > We are entering an era where interfaces will be generated on the fly

No we’re not
