---
id: articles/reddit-deep-r-designsystems/92ed3dfa6c.md
url: "https://www.reddit.com/r/DesignSystems/comments/1vighl2/suggestions_on_making_a_design_system_aiready/"
url_hash: "92ed3dfa6c"
kind: "article"
source: "Reddit Deep: r/designsystems"
title: "Suggestions on making a design system AI-ready"
author: ""
date: "2026-08-07T23:42:37.000Z"
tier: 
method: "source-native"
extracted_at: "2026-09-10T17:25:52.706412+00:00"
chars: 5995
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:25:53.185Z"
relevance: 50
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "4d749b40fa99e050"
relevance_by_goal: {"5a163910d68e":50}
chunks:
  - id: "articles/reddit-deep-r-designsystems/92ed3dfa6c.md#c0"
    char_span: [0, 2139]
    sentence_count: 19
    key_terms: [design, system, library, ai-ready, designsystems, "i'm", set, use]
    concepts: [design, system, library, ai-ready, designsystems]
    related_chunks: ["articles/reddit-deep-r-designsystems/92ed3dfa6c.md#c1"]
    token_count: 463
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1vighl2/suggestions_on_making_a_design_system_aiready/","kind":"article","date":"2026-08-07","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/92ed3dfa6c.md#c1"
    char_span: [2141, 4347]
    sentence_count: 17
    key_terms: [design, documentation, system, use, components, like, ai-ready, designsystems]
    concepts: [design, documentation, system, components, ai-ready]
    related_chunks: ["articles/reddit-deep-r-designsystems/92ed3dfa6c.md#c0"]
    token_count: 505
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1vighl2/suggestions_on_making_a_design_system_aiready/","kind":"article","date":"2026-08-07","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/92ed3dfa6c.md#c2"
    char_span: [4349, 6190]
    sentence_count: 16
    key_terms: [review, agent, baseline, c111c6a1-e1ab-4845-99fc-003c00e56a86, needs, here, d7a2-44ef-ad79-0be0be3e6094, playlists]
    concepts: [review, baseline, agent, needs, playlists]
    token_count: 454
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1vighl2/suggestions_on_making_a_design_system_aiready/","kind":"article","date":"2026-08-07","subreddit":"designsystems"}]
---
# Suggestions on making a design system AI-ready

Source: [Reddit Deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1vighl2/suggestions_on_making_a_design_system_aiready/)

Hey everyone. I'm an FE dev helping to set up an internal design system for the enterprise I work at. It's been published as an npm library and is already in use in some of our internal and customer-facing web apps.

We're considering how to make this library AI-ready. By that, I mean how to set it up such that - if I were using this library on a consuming web app, my coding agent (Copilot/Claude/etc) would know how to properly build interfaces according to the standards set forth by my design library. E.g. utilize the design tokens, and use the components as intended. 

I'm not sure what an end-to-end approach would look like. A couple different approaches I've seen are:
* Have your npm library expose a skills file that explains how to use your design foundations, tokens, components, etc. as intended. Keep that skills file in sync with any changes in your actual design system.
* Alternatively, expose .md files that contain the same info as above.

Do people have general advice on how to go about this? I'm new-ish to setting up design systems and making repos AI-ready, so ideas would be appreciated. Thanks!

--- TOP COMMENTS ---
[5↑ Nikkunikku] Talk to your agents, but it’s all about training data, setup, and processes.

That said, no system is perfect (esp one that isn’t deterministic) and that’s where you need checks and balances throughout the production pipeline.

I rebuilt our design system from scratch on a more agent friendly stack. I’m just as proficient shipping product in both systems, but it does seem to go faster in the newer system. And while the new system has been great, ironically it has many of the same problems as our legacy system over time. And those problems are as much about humans as AI.

A big part of this is because everyone builds with agents differently, with different priorities and care. That’s another reason why the checks and balances (and humans in the loop) continue to be needed.

In my opinion there is no way to take a designer out of the loop, just like developers, without long-term consequences. The exciting part is design can now exercise our craft and shape the product anywhere in the process.
[1↑ 404_computer_says_no] Interesting! I’ve been wondering this. An AI friendly system, seems to expose some of the weak links and documentation. I’m not surprised it’s performing better.
[3↑ Maleficent-Anything2] I think it's the same as any other design system, as long as it was well made with proper components and proper documentation. The key thing here is documentation, and it needs to be findable and express your intent. If the agent understands your intent and rules, then it will be able to use your design system properly. Otherwise, it wouldn't. This is exactly the same way it should have been before AI anyway. It's just having a good design system. You might feed it in a slightly different way, maybe with Markdown files rather than documentation on a website. The core bit is still the same, just documented properly.
[2↑ cdecaire] One thing I’ve found is that agents will find and use your components and tokens, but without guidelines, rules, examples, and clear do’s and don’ts, they won’t know how to use them correctly.

Give them context for when and how to use your colors and type. Semantic naming helps with typography, like h1, h2, h3, body, caption, etc. Color is harder. An agent won’t inherently know what “blue” or “white” is meant for. Tokens need to communicate their purpose clearly, like primary, secondary, background, surface, or border.
[2↑ Accomplished_Town978] I created a guide how to make design system AI-ready [https://www.designsystems.one/ai-ready](https://www.designsystems.one/ai-ready)  
Happy to hear your feedback ;)
[2↑ Much-Lingonberry-958] the best approach I found is using a story based library like storybook (I use ladle, it’s the same but lighter) in your repo, let agent build stories out of your components and pages, and then have a set of design skills (i call them /ux) to replicate design process:

Every time I work on new features- if design needed - I will invoke /ux orchestrator and it will follow this pipeline:

1. Baseline agent will check if block exists and up to date in storybook when launching (baseline)  
2. If not exist or out of date it will create or update baseline  
3. Then review agent will review baseline with prompt context and synthesise findings   
4. Then ideate agent will produce new designs / updates for me to review, here we will either pick an option to continue or iterate, in some instances I might call in a secondary skill (prototype) to create journeys rather than pages  
5. Translate agent creates or updates storybook blocks, a fidelity agent checks   
6. Review if good pass to /build agents for implementation

It works decently well with good set up, needs human review and input at key stages, it needs maintenance periodically as agents accrete prompt with fluff.

I have created a few (terrible) videos that I would like to post sometime, here:

[Core automated design workflows](https://www.loom.com/playlists/c111c6a1-e1ab-4845-99fc-003c00e56a86/view?v=2ebbf7c10e90487ba2e5d9132dab765d)

[New features e2e](https://www.loom.com/playlists/47bb4f2a-d7a2-44ef-ad79-0be0be3e6094/view)

Let me know what you think if you read this !
[1↑ _baaron_] I think it’s completely up to you
[1↑ 404_computer_says_no] I think this is where your naming conventions and markdown files really matter. 

I’ve found testing one-shot has made me realise the components and patterns AI understands and doesn’t. 

Here’s an example:

I kept wondering why AI didn’t understand our global nav. It kept treating it as a page element. Then I realised, none of our documentation actually explained the rules. It was so obvious for us as humans, we hadn’t written explicit commands on how the AI should use it.

I think this is where the design system needs to be heading. Very precise, binary rules. 

It’s like you’re onboarding a child.
