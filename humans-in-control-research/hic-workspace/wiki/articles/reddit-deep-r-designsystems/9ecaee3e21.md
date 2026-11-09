---
id: articles/reddit-deep-r-designsystems/9ecaee3e21.md
url: "https://www.reddit.com/r/DesignSystems/comments/1uel3af/i_started_manually_auditing_my_design_system_to/"
url_hash: "9ecaee3e21"
kind: "article"
source: "Reddit Deep: r/designsystems"
title: "I started manually auditing my Design System to prepare it for agents. It became too time-consuming, so I built a tool. Looking for feedback."
author: ""
date: "2026-06-24T18:07:27.000Z"
tier: 
method: "source-native"
extracted_at: "2026-09-10T17:25:24.151879+00:00"
chars: 5527
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:25:23.985Z"
relevance: 72
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "07c90d7bee8d1e34"
relevance_by_goal: {"5a163910d68e":72}
chunks:
  - id: "articles/reddit-deep-r-designsystems/9ecaee3e21.md#c0"
    char_span: [0, 2065]
    sentence_count: 19
    key_terms: [design, system, became, component, igabrielgibert, time-consuming, designsystems, audit]
    concepts: [design, system, became, component, igabrielgibert]
    related_chunks: ["articles/reddit-deep-r-designsystems/9ecaee3e21.md#c2"]
    token_count: 454
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1uel3af/i_started_manually_auditing_my_design_system_to/","kind":"article","date":"2026-06-24","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/9ecaee3e21.md#c1"
    char_span: [2067, 4371]
    sentence_count: 29
    key_terms: [audit, rubric, test, success, styles, components, specific, failure]
    concepts: [audit, rubric, success, components, styles]
    token_count: 512
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1uel3af/i_started_manually_auditing_my_design_system_to/","kind":"article","date":"2026-06-24","subreddit":"designsystems"}]
  - id: "articles/reddit-deep-r-designsystems/9ecaee3e21.md#c2"
    char_span: [4373, 5819]
    sentence_count: 9
    key_terms: [design, system, figma, truth, "it's", need, completely, machines]
    concepts: [design, system, completely, figma, truth]
    related_chunks: ["articles/reddit-deep-r-designsystems/9ecaee3e21.md#c0"]
    token_count: 306
    sources: [{"n":"Reddit Deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1uel3af/i_started_manually_auditing_my_design_system_to/","kind":"article","date":"2026-06-24","subreddit":"designsystems"}]
---
# I started manually auditing my Design System to prepare it for agents. It became too time-consuming, so I built a tool. Looking for feedback.

Source: [Reddit Deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1uel3af/i_started_manually_auditing_my_design_system_to/)

A few months ago, I became convinced that Design Systems would need to become easier for machines to understand.

I started auditing my DS manually.

Component by component.  
Variant by variant.  
Description by description.

At first it was useful. Then it became painfully time-consuming.

I realized I was spending more time collecting information than improving the system itself.

So I built a tool for myself.

The idea was simple: Export a Design System once, then generate an audit covering things like:

* naming consistency
* component structure
* variants
* documentation coverage
* descriptions

That project eventually became [System Lens](https://system-lens.com).

I'm now looking for Design System teams willing to test it.

In exchange, I'll provide a free audit report pdf and would love honest feedback on:

* whether the findings are useful
* what feels missing
* what would make the tool genuinely valuable

If you're responsible for a Design System and would be interested in trying it, I'd love to hear from you.

--- TOP COMMENTS ---
[3↑ Amadeus_Ray] Looks like you did it Claude design
[1↑ iGabrielGibert] Codex helped a lot! Building this project helps me learn the engineering side of product building, not just the design side as I already do that everyday
[2↑ Cressyda29] Made almost the same thing 3 months ago, no one wants it unfortunately :(
[1↑ iGabrielGibert] That's interesting. What did you build, and what made you conclude that people didn't want it?  
It really helped me to turn a vague feeling "our DS could be prepared for AI" into a prioritized list of improvements
[2↑ jhtitus] Love the audit analysis and reporting concept. I can see how this clearly helps align teams and leadership on setting priority inside plans of action.

The tricky thing you’re presenting here is, what’s the rubric? Is one master rubric a real fit for every DS out there? For instance, in the NorthStar demo audit on your site, Styles and Variables scored 75/100, citing “styles count is modest.” So the answer to be better is “more styles for the sake of more styles?”

Overall the rubric of assessment feels like a blanket based on binary or numerical results. That’s a good audit rubric, but you’re presenting the results as an outcome of test, a rubric meant for revealing success vs failures.

Does the number of documentation elements equal the number of components. Is equal-to considered a success? What’s the delta where it becomes a failure? Why? 

How many # of variants = too many variants, and why? How this that number decided?

The library has many components, covering common UI needs. But are those common needs relative to the actual use case of the product? For e.g. could a system score high here because their DS has robust forms components like input, radio, check, deopdowns, etc, even if the product actually never needs a form on the frontend?

This is where returning a “grade” gets tricky. A grade is inherently a scale of bad -> good. It’s a test. Not an audit. If your rubric grades a fish on how well it can climb a tree, it’s bad. And worse, did the rubric even ask if it swims well? Was there even a chance for the outcome of “good” anywhere?

I’d consider sitting with “is this a test, or an audit,” because currently those lines are blurred. A test has specific benchmarks, for specific goals, and returns a result associated to success vs failure. An audit simply reveals what’s there and what’s not, giving the participant more information to make their own educated assessment on what’s succeeding and what’s failing. 

Think of web traffic analytics for example. It’s an audit: You had 200 visitors this month. It’s not a test: You had 200 visitors this month and that’s bad. The latter is an overbearing assumption. 

This audit idea is great if it’s adjusted to truly be an audit. This audit idea is not great if you’re scrutinizing success or failure without ever knowing the users specific goal in the first place.
[1↑ iGabrielGibert] This is incredibly valuable feedback, thank you for taking the time to write it.

I think the distinction you're making between an audit and a test is a really good one.

One thing I probably haven't communicated clearly enough is that the assessment isn't intended to say whether a Design System is "good" or "bad" in absolute terms.  
The idea is to evaluate how well the Design System communicates its intent through its source of truth, and therefore how understandable and consumable it is for machines.

For example, a low score isn't meant to say "you need more styles" or "you need more components." It's meant to highlight characteristics that may introduce ambiguity for an AI consuming the Design System.

That said, I completely agree that the scoring model needs to be much more contextual, and your examples are exactly the kind of questions I'm trying to answer as I evolve it.
[1↑ MBhustler] A figma file isnt a design system. In order to be useful the audit would need more context/sources. But that introduces a privacy nightmare for enterprise, where this would make the most impact.
[1↑ iGabrielGibert] I completely agree that a Design System is much more than a Figma file. I think the figma library is one of its core sources of truth, and in many teams it's not used to its full potential.

My hypothesis is that making this source of truth easier for both humans and machines to understand will naturally improve the rest of the ecosystem as well, even if it's only the first piece of the puzzle for now
