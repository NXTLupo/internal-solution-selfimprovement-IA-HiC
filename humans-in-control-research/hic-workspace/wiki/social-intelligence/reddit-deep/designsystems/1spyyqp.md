---
id: social-intelligence/reddit-deep/designsystems/1spyyqp.md
url: "https://www.reddit.com/r/DesignSystems/comments/1spyyqp/one_json_registry_feeding_docs_a_figma_plugin_a/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "One JSON registry feeding docs, a Figma plugin, a component library, and an MCP server — first stable release of my open-source design system"
author: "Tarasenko_by"
date: "2026-04-19T17:17:40.000Z"
score: 43
upvote_ratio: 0.98
num_comments: 10
flair: ""
extracted_at: "2026-09-10T17:19:04.802Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1spyyqp.md#c0"
    char_span: [0, 1563]
    sentence_count: 7
    key_terms: [component, plugin, library, designsystems, figma, comments, variants, uicraft]
    concepts: [component, plugin, designsystems, library, figma]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1spyyqp.md#c2"]
    token_count: 369
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1spyyqp/one_json_registry_feeding_docs_a_figma_plugin_a/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1spyyqp.md#c1"
    char_span: [1565, 3419]
    sentence_count: 6
    key_terms: [default, name, icon, variant, state, size, "true", haswebsite]
    concepts: [default, variant, state, haswebsite, hasplugin]
    token_count: 509
  - id: "social-intelligence/reddit-deep/designsystems/1spyyqp.md#c2"
    char_span: [3421, 4829]
    sentence_count: 3
    key_terms: [community, uicraft-design-tokens-ui-components, plugin, color, figma, com, components, getuicraft]
    concepts: [community, plugin, color, components, figma]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1spyyqp.md#c0"]
    token_count: 335
  - id: "social-intelligence/reddit-deep/designsystems/1spyyqp.md#c3"
    char_span: [4844, 5426]
    sentence_count: 5
    key_terms: [thx, design, maleficent-anything2, lot, brainstorming, ponchofreedo, sweetpongal, phenomenal]
    concepts: [design]
    section: Comments
    token_count: 185
---
# One JSON registry feeding docs, a Figma plugin, a component library, and an MCP server — first stable release of my open-source design system

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1spyyqp/one_json_registry_feeding_docs_a_figma_plugin_a/)
Posted by **Tarasenko_by** · **43↑** · **10 comments**

Hey everyone,

Some of you might remember earlier posts about **uicraft** — a Figma plugin + web component library I've been working on. I've posted about it a couple of times before, but those versions weren't stable enough to call "done."

**Familiar patterns, no proprietary magic**

uicraft borrows its DNA from the stacks most of us already know:

* **Bootstrap-style** semantic classes with a `.uc-*` prefix (`.uc-btn`, `.uc-btn-primary`, `.uc-active`)
* **shadcn/ui-style** component anatomy and variant composition
* **Tailwind-style** design tokens and utility escape hatches

If you've worked with any of these, you'll feel at home in five minutes. No new DSL, no framework lock-in — plain CSS + tokens.

**What changed recently**

The biggest change isn't in the plugin — it's in how the project is structured internally. Component definitions used to live in three separate places: the docs site, the Figma plugin, and the code library. They constantly drifted out of sync.

Now every component is described by a single JSON record that acts as the source of truth for all consumers. Here's a trimmed example for the button (the full entry has 33 Component Set variants — 7 variants × 3 sizes × 2 states):

    "button": {
      "figmaName": "Button",
      "category": "General",
      "variants": [
        { "id": "variants",   "name": "Variants",   "hasWebsite": true, "hasPlugin": true  },
        { "id": "sizes",      "name": "Sizes",      "hasWebsite": true, "hasPlugin": true  }...
      "figmaDefs": [
        { "name": "Variant=Primary,   Size=MD, State=Default",  "variant": "primary",   "size": "md", "state": "default"  },
        { "name": "Variant=Secondary, Size=MD, State=Default",  "variant": "secondary", "size": "md", "state": "default"  },
        { "name": "Variant=Bordered,  Size=MD, State=Default",  "variant": "bordered",  "size": "md", "state": "default"  }...
      ],
      "booleanProps": [
        { "name": "Show Left Icon",  "layer": "Icon Left",  "default": true },
        { "name": "Show Right Icon", "layer": "Icon Right", "default": true }
      ],
      "instanceSwapProps": [
        { "name": "Left Icon",  "layer": "Icon Left",  "source": "Icons" },
        { "name": "Right Icon", "layer": "Icon Right", "source": "Icons" }
      ]
    }

`hasWebsite` / `hasPlugin` decide where each section surfaces. One edit updates the docs, the Figma Component Set, and the code artifacts at once — that's what finally made a stable release possible.

**Side effect: an MCP server for AI assistants**

Since the whole design system now lives in one structured registry, publishing it to AI assistants became almost trivial. I shipped u/uicraft`/mcp-server` on npm — Claude Desktop, Cursor, or any MCP-compatible client can query it directly. No more "the LLM hallucinated a CSS class that doesn't exist" — the assistant answers from the real, current system.

Six tools: `list_components`, `get_component`, `get_tokens`, `get_theme`, `get_snippet`, `search`.

    npm install -g /mcp-server

**First stable Figma plugin release**

Because of the refactor, I had to **cut the component count down** to get to a release I'd actually call stable. The plan is to grow the library back — properly this time, with every component tied cleanly to the registry and tokens.

What the plugin generates right now:

* Figma Variables: colors, typography, spacing, radii, borders, shadows
* Light and Dark mode collections, automatically
* 24 token-bound UI components:
   * Form controls: input, textarea, select, checkbox, radio, switch, slider, number input
   * Buttons & actions: button, button group, chip
   * Navigation: tabs, breadcrumb, pagination
   * Feedback: alert, banner, toast, tooltip
   * Data display: avatar, badge, progress, separator, link, icons
* Theme editor: brand color, neutrals, typography, semantic tokens — all tweakable before generating

**Roadmap**

* A proper variable rename flow
* A real color generator (brand color → full scale)
* More complex components (data tables, date pickers, command menus, etc.) — rebuilding the library on the new foundation
* Whatever the community actually asks for

🔗 [Figma Community: Try Plugin](https://www.figma.com/community/plugin/1610343587499165100/uicraft-design-tokens-ui-components)  
📦 MCP server: `npm i -g` u/uicraft`/mcp-server`

WebSite: [Getuicraft.com](http://Getuicraft.com)

Thanks for sticking around through the unstable versions — brutal honesty still welcome.

## Comments

- **ponchofreedo** (1↑): I’ve literally been brainstorming something so similar to this and just haven’t had the time. Awesome job!
  - **Tarasenko_by** (1↑): Thx a lot!)
- **sweetpongal** (1↑): Phenomenal. Much needed in today's Design to Dev pipelines the design teams are trying to setup. Watching this.
  - **Tarasenko_by** (1↑): Thx a lot !)
- **icorovi** (1↑): Hmm, reaaaally nice. Will take the plugin for a test run.
  - **Tarasenko_by** (1↑): Thank you very much, I hope you like it
- **Maleficent-Anything2** (1↑): Looking good :)
  - **Tarasenko_by** (1↑): Thx so much! )
