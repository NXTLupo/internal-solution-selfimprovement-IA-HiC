---
id: social-intelligence/reddit-deep/designsystems/1tdcmw4.md
url: "https://www.reddit.com/r/DesignSystems/comments/1tdcmw4/looking_for_experiences_building_out_design/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "Looking for experiences building out design systems for AI development."
author: "roundabout-design"
date: "2026-05-14T21:56:50.000Z"
score: 18
upvote_ratio: 1
num_comments: 19
flair: ""
extracted_at: "2026-09-10T17:19:04.799Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c0"
    char_span: [0, 1748]
    sentence_count: 15
    key_terms: [design, system, building, designsystems, development, been, "i'm", real]
    concepts: [design, system, building, designsystems, development]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c1", "social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c2"]
    token_count: 386
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1tdcmw4/looking_for_experiences_building_out_design/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c1"
    char_span: [1763, 3734]
    sentence_count: 19
    key_terms: [code, synergy-design-system, metadata, design, system, figma, rules, mcp]
    concepts: [synergy-design-system, metadata, design, system, figma]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c0", "social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c2"]
    section: Comments
    token_count: 431
  - id: "social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c2"
    char_span: [3736, 5774]
    sentence_count: 19
    key_terms: [claude, design, mcp, system, data, rag, sure, use]
    concepts: [claude, design, system, component, examples]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c0", "social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c1"]
    section: Comments
    token_count: 475
  - id: "social-intelligence/reddit-deep/designsystems/1tdcmw4.md#c3"
    char_span: [5776, 7535]
    sentence_count: 16
    key_terms: [raymond-velez-96aa4a172, https, github, consistency, com, use, everything, workshops]
    concepts: [raymond-velez-96aa4a172, https, github, consistency, everything]
    section: Comments
    token_count: 445
---
# Looking for experiences building out design systems for AI development.

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1tdcmw4/looking_for_experiences_building_out_design/)
Posted by **roundabout-design** · **18↑** · **19 comments**

I'm in charge of building out a design system for our org. Our org has gone all in on AI development. 

I've been playing with different ideas...markdown files, MCP server, using a github repo, etc. but have yet to find any real consensus on any of this--probably because there isn't any. 

But has anyone been building out a design system for primarily AI-centric work flows and found certain things working better than others? 

Our biggest issue right now is that developers everywhere are just building their own things. They may grab the brand guidelines from marketing, which helps a little, but beyond that, consistency isn't there. 

I'm trying to figure out how to get something...even if rudimentary...set up to have developers point their AI at to at least get the basics of a design system figured out. 

But I haven't figured out a way to do this that seems proper yet. 

I like the idea of a github repo...that gives us a central, team-based place for us to manage updates to the design system. But is there a better way to go about this? 

I have been playing with Claude Design's design system feature...but we're pretty much in agreement internally that it's "neat" but not really a "solution" yet. 

I guess this is a bit of a rambling all-over-the-place post. I guess I'm just seeking out any real world experience others have had creating an AI-centric design system. I can find plenty of demos/tutorials on youtube, but very few real world use cases.

## Comments

- **Livid-Document7646** (9↑): Hey,

First please excuse my bad english, its not my mothers tongue. At least I hope we can skip the „AI slop“ discussion when I write without guardrails :-). 

Basically it comes down to what metadata you can provide and what your goals are. I am responsible for a Design System used at a medium sized company and we had the same problem: Clusters of Metadata, stored in various places. 

We are currently reverting this to one single source of truth that the other sources are consuming. Basically a boring package with lots of JSON and markdown and a very small api. Build on that are a MCP server and a static site that can be used in RAG environments. It also powers code samples and will eventually be usable as kind of a linter and code sample generator. 

We initially had just an MCP server that provided Examples, Readmes and the source code (!) of components. That ate tokens like nothing. We exchanged that for optimized Interface Markdown files. 

What I think you should focus on are Design System rules, e.g. what to use when, what should be done from a UX perspective when using forms etc. Thats where you can really make a difference: instead of people copying rules from a (semi-) static brand portal, make the rules first class citizens in your Design System snd build from there. 

Also it is pretty easy to take example code (e.g. Storybook stories) and turn it into examples clients can query so models have an idea what to use which component for. 

Also we are experimenting with Figma Code Connect, making it possible to create code from Figma (not Figma Make) via a property/slot connector. Looks promising if you have enough designers.

For some inspiration, you might take a look on our take at https://github.com/synergy-design-system/synergy-design-system, especially the MCP and Metadata packages. I am not sure if what we do completely follow best practices - for AI it seems those change from week to week. 

What I can say for sure is: If you work at a bigger company, chances are you cannot predict all ways creative people might use your data. Invest time there - it will pay off. Check which data you have. Make sure its there in a protocol/tech agnostic way. This makes it easier to create interfaces (be it mcp, rag, skills, whatever) later on.
  - **Decent_Perception676** (1↑): Second on this. We did an MCP server first, then ditched it for markdown + csv. Entry/root level AGENTS.md file acts like a directory.
- **edge_lord_16** (3↑): I second the comment before me, and honestly your design is correct. 

You can use github as the canonical source for tokens, components, rules & examples.   
Docs for human reference.

A light weight RAG layer or MCP so your llm can pull the latest UI guidelines. 

I've actually consulted and implemented AI centric internal systems to multiple startups with $3m to $10m evaluation. I'm happy to offer a free consultation if that works for you.
  - **tmanblue59** (2↑): The algorithm might put responses in order of relevance to the user by the way. We're not sure of the comment you're referring to.
  - **roundabout-design** (1↑): RAG is a new concept for me. Need to read up on that. Thanks!
- **ryan0702** (3↑): I am the sole owner of the design system, with no DS team, for a pretty large brand, and recently deployed Claude code to help me build a headless CMS backend engine and the front end documentation platform it relays data to, and my advice is to just always ask Claude how to use Claude. It will consistently give you advice on how to leverage itself in a better way. I was able to craft a process where Claude built out an agile-centric sprint schedule where we worked through everything from infrastructure to UI facelifts.
- **mshilman** (2↑): At Storybook we’ve bet on MCP for design system component reuse. It provides the component metadata and stories as examples, plus design system docs. Chromatic provides free authenticated hosting and you can also flexibly host yourself.

https://storybook.js.org/blog/storybook-mcp-for-react/
  - **Livid-Document7646** (1↑): We would have loved to use this. However, it only works for react at the time being.
    - **mshilman** (1↑): What framework are you using? We’re planning to extend support beyond React this summer
- **vivek7405** (2↑): I was closely involved in building one for harness.io, it is open source. You'll find it on GitHub: https://github.com/harness/canary
- **HundredMileHighCity** (1↑): Have you done an audit of everything in play currently? Do you have the assets to guide your starting points? Also, have you asked Claude this question?
  - **roundabout-design** (1↑): No. That's a phase II. 

At the moment, we're just trying to get something in play ASAP as AI dev is happening with or without us. So we at least one a modicum of consistency ASAP. We'll circle back in a few months for a proper fully audit and scope of out a broader set of components/templates/needs, etc.
- **Azra_Nysus** (1↑): I've done workshops both in-person and online about creating design systems for agentic workflows. You can see some of my past workshops in my previous posts here: [https://www.linkedin.com/in/raymond-velez-96aa4a172](https://www.linkedin.com/in/raymond-velez-96aa4a172)

One of the strategies that has worked best for me is deploying the design system via NPM. DM me, happy to chat.
- **jasmineliumai** (1↑): I think a GitHub repo with a tokens folder and a short Claude markdown file pointing to everything is all you need to start. The consistency problem is really just a discoverability problem. Make it easier to use the system than to ignore it and people will use it. Also, don't touch MCP until files are actually causing you pain. You'll know when you need it.
