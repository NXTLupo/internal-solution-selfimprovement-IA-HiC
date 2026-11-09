---
id: articles/reddit-deep-r-designsystems/9ed2da3c8f.md
url: "https://www.reddit.com/r/DesignSystems/comments/1v1l9cx/i_built_a_figma_plugin_that_aigenerates_design/"
url_hash: "9ed2da3c8f"
kind: "article"
source: "Reddit Deep: r/designsystems"
title: "I built a Figma plugin that AI-generates design system documentation. Would love for some of you to try it out!"
author: ""
date: "2026-07-20T13:15:44.000Z"
tier: 
method: "source-native"
extracted_at: "2026-09-10T17:26:28.986215+00:00"
chars: 4230
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:26:28.905Z"
relevance: 45
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "d2df7d608baf304a"
relevance_by_goal: {"5a163910d68e":45}
chunks:
  - id: "articles/reddit-deep-r-designsystems/9ed2da3c8f.md#c0"
    char_span: [0, 1942]
    sentence_count: 12
    key_terms: [design-system-docs-generator, design, figma, documentation, plugin, system, designsystems, https]
    concepts: [design-system-docs-generator, design, documentation, figma, designsystems]
    related_chunks: ["articles/reddit-deep-r-designsystems/9ed2da3c8f.md#c1"]
    token_count: 414
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1v1l9cx/i_built_a_figma_plugin_that_aigenerates_design/","kind":"article","date":"2026-07-20","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/9ed2da3c8f.md#c1"
    char_span: [1944, 3909]
    sentence_count: 16
    key_terms: [documentation, context, design, system, trying, figma, thelastdesigner, product]
    concepts: [documentation, context, design, system, trying]
    related_chunks: ["articles/reddit-deep-r-designsystems/9ed2da3c8f.md#c0"]
    token_count: 418
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1v1l9cx/i_built_a_figma_plugin_that_aigenerates_design/","kind":"article","date":"2026-07-20","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/9ed2da3c8f.md#c2"
    char_span: [3914, 4491]
    sentence_count: 4
    key_terms: [product, writing, figma, docs, need, documentation, deadbrands18, delfmonkey]
    concepts: [product, writing, figma]
    token_count: 135
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1v1l9cx/i_built_a_figma_plugin_that_aigenerates_design/","kind":"article","date":"2026-07-20","subreddit":"designsystems"}]
---
# I built a Figma plugin that AI-generates design system documentation. Would love for some of you to try it out!

Source: [Reddit Deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1v1l9cx/i_built_a_figma_plugin_that_aigenerates_design/)

Design System Docs Generator reads your component’s Figma context (description, properties, variants, styles etc.) and generates usage guidelines following best UX/UI practices.

Originally built as an internal tool for my company, it's now available for any other designers who might find it helpful :)

Who's been using it so far:

* Design system designers
* Teams documenting a component library for a new product/website/UI
* Design leads trying to keep design output consistent
* Agencies handing off documentation to clients

Try it out here → [https://www.figma.com/community/plugin/1641615767346305619/design-system-docs-generator](https://www.figma.com/community/plugin/1641615767346305619/design-system-docs-generator)

The tool is still in early days so any feedback on how this could work for you would be hugely appreciated!

--- TOP COMMENTS ---
[7↑ Agreeable_Show_8921] How many times are people going to build the same thing? For anyone considering using this, understand what you're trusting… a non-engineer using AI to build something that may be functional on the surface but carries real security risks.

A few specific concerns:

1. There's no breakdown of which AI models are being used, or whether you need to supply your own API key to generate the documentation. AI isn't free the cost comes from somewhere, and that's not disclosed anywhere.

2. Your data could potentially be shared with a third party without your knowledge, even in the context of building Figma plugins. That's not spelled out anywhere either.

3. Nothing in the examples is extraordinary. This looks like it was made almost entirely by AI with little to no guidance from the operator.

I'm not trying to be harsh - I'm trying to be realistic. We keep seeing people build the same tool over and over, trying to solve something that shouldn't be solved in the first place. AI generating your design system documentation? Are you kidding me? How is it a design system if AI wrote the docs? Sure, AI can draft baseline descriptions - we all know what a button does. But it will never know the context in which that button is used in your product unless you tell it. Building a solution like this makes it clear the creators don't understand how design systems actually work.
[1↑ vladracoare] I think the new Figma Agents feature for building plugins uses exclusively the models Figma has under the hood and you basically consume your Figma tokens when using such plugins.
[1↑ alexkurchev] I don’t really understand the argument that “this shouldn’t be solved.”

Design system documentation is one of the most repetitive and least enjoyable parts of maintaining a system. If someone can remove even part of that work while keeping humans in control, why wouldn’t that be worth exploring?

I actually built a similar tool for internal use, and it’s worked really well for our team. My focus has been more on change tracking, keeping documentation in sync, and reducing maintenance overhead than on having AI write everything. It’s already saved us a lot of time.

If you’re curious, it’s called Spec Layer on the Figma Marketplace. I’d genuinely be interested in hearing your thoughts after trying it. (Although there's a complete privacy policy & security on the website)
[1↑ TheLastDesigner] Keen to check this out!
[1↑ TheLastDesigner] 1&2 - Fair to want to know, have noted this suggestion.

3 - No it currently doesn't know all your product context. That's what the context you supply in the component description is for, because that's what it does read. Curious how would you prefer to give it product context to make the output better, if you could?

  
A tool like this won't be perfect at writing docs because it can't know possibly know everything about your product - the point of it is to reduce the friction of writing prompts to your LLM for every component you need docs for, and the pain of formatting them on Figma. The way we've been using it is generating initial outputs via the plugin, then editing whatever we need to to suit the context of our product.
[1↑ Delfmonkey] Are you aware that Figma does the Same already?
[1↑ Deadbrands18] oh they did?
[1↑ GOgly_MoOgly] Creates documentation?? Where? Haven’t seen that
