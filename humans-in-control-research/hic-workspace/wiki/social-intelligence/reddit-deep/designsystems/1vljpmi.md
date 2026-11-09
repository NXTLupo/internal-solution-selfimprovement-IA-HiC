---
id: social-intelligence/reddit-deep/designsystems/1vljpmi.md
url: "https://www.reddit.com/r/DesignSystems/comments/1vljpmi/how_is_your_design_team_handling_the_figma_ai/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "How is your design team handling the Figma + AI coding agent split?"
author: "Sad-Group9616"
date: "2026-08-11T14:54:12.000Z"
score: 33
upvote_ratio: 0.94
num_comments: 36
flair: ""
extracted_at: "2026-09-10T17:19:04.795Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1vljpmi.md#c0"
    char_span: [0, 2128]
    sentence_count: 23
    key_terms: [figma, code, design, lives, team, work, working, designsystems]
    concepts: [figma, design, lives, designsystems, working]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1vljpmi.md#c1", "social-intelligence/reddit-deep/designsystems/1vljpmi.md#c2"]
    token_count: 468
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1vljpmi/how_is_your_design_team_handling_the_figma_ai/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1vljpmi.md#c1"
    char_span: [2143, 3555]
    sentence_count: 10
    key_terms: [figma, experimentation, components, design, dev, outside, solve-et-abrahadabra, built]
    concepts: [figma, experimentation, components, design, outside]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1vljpmi.md#c0", "social-intelligence/reddit-deep/designsystems/1vljpmi.md#c2"]
    section: Comments
    token_count: 333
  - id: "social-intelligence/reddit-deep/designsystems/1vljpmi.md#c2"
    char_span: [3557, 5600]
    sentence_count: 11
    key_terms: [figma, hatenvironmental6512, designers, design, source, truth, completely, preference]
    concepts: [figma, hatenvironmental6512, designers, design, source]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1vljpmi.md#c0", "social-intelligence/reddit-deep/designsystems/1vljpmi.md#c1"]
    section: Comments
    token_count: 503
  - id: "social-intelligence/reddit-deep/designsystems/1vljpmi.md#c3"
    char_span: [5602, 6669]
    sentence_count: 5
    key_terms: [the-ai-native-sdlc-playbook, design, claude, intent, being, figma, https, small]
    concepts: [the-ai-native-sdlc-playbook, design, claude, intent, being]
    section: Comments
    token_count: 272
---
# How is your design team handling the Figma + AI coding agent split?

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1vljpmi/how_is_your_design_team_handling_the_figma_ai/)
Posted by **Sad-Group9616** · **33↑** · **36 comments**

I lead a product design team of about 35. Some of the team has moved into Claude Code alongside Figma and it's working well, but our operating model hasn't caught up.

Over the last few months a good chunk of the team has started working in Claude Code alongside Figma. The output has been genuinely great, but it's quietly broken our operating model in ways I didn't see coming.

We now have work happening in about five different shapes:

1. Figma only, same as always

2. Figma first, then moving into code for prototyping or refinement

3. Straight into code for exploration and refinement, never touches Figma

4. Cloning the repo and refining an already shipped flow against current production code

5. Same as 4, but pulling it into Figma to think structurally, then back into code

The things I'm looking for thoughts on:

**Source of truth**. When some work lives in Figma and some lives in a git branch, what's actually authoritative? We've landed on "Figma is truth before the build, code is truth after merge" but I'm not confident that survives in reality.

**Handoff**. Today designers annotate accessibility, focus order, responsive behaviour, states. In a coded prototype most of that is just there and executable, which feels like an upgrade. But we've got a new problem instead: an engineer opens a design branch and can't tell which parts are deliberate design decisions and which parts the agent generated to make the thing run. Has anyone solved that cleanly?

**Visibility and consistency**. Figma work lives in Figma, code work lives in repos. How do you keep a holistic view of patterns, styles and what's in flight? We used to catch inconsistency by reviews in shared files. That completely stops working when people are producing at agent speed across different platforms.

Anyone further down this road? What worked, what blew up?

## Comments

- **Solve-Et-Abrahadabra** (11↑): I built a 2-way sync mcp from figma to our repo storybook. Designer updated figma, the sync creates a change log, dev syncs it, updates the tokens and UI library. Dev builds guardrails so another dev can't go outside the design system.
- **masofon** (6↑): We're still where you are, with everything up in the air and a lot of experimentation happening - which I think is okay. Roughly Figma is still the source of truth for variables and components and work happens there first with or without the help of Claude Code and accompanying prototypes. How designers then consume and use the components to create pages, journeys & features is where there is more experimentation, but keeping the DS core at the centre of that feels like the main stabiliser during this period.
  - **Sad-Group9616** (1↑): Yeah that's how we are handling it at the min. We're a large SaaS enterprise so we have a monolith to deal with and not the luxury of all new systems, etc. I haven't really seen a straight forward way from any org on how to fold in CC experimentation/design alongside Figma in a clean and collaborative way. I think we might see a big shift in tooling in the next 12 months.
- **TheWarDoctor** (2↑): We treat Figma as an asset. Our agents update Figma for us, we barely manually touch it anymore. We built our own external tool to design with the ds components outside of Figma. 

They shouldn't have got so damned greedy with the SKUs and tokens.
  - **Sad-Group9616** (2↑): "Our agents update Figma for us" .. Can you go into more detail on that specifically? Interested in the type of work being automated on that front.
    - **TheWarDoctor** (1↑): Check out Figma Console MCP (Different from Figma MCP).
- **HatEnvironmental6512** (3↑): We stopped using figma. Directly developing frontends with claude code deploy them and share with the customer.
  - **Ok_Conversation2464** (4↑): And the designer is now a dev.
    - **lekoman** (4↑): This sounds like purgatory, to me. I cannot imagine a world where this is where I'd want my designers, let alone myself, spending time. We have bigger fish to fry. It also seems hellish to have to make fine grained adjustments with prompts.
    - **HatEnvironmental6512** (1↑): Yes partly.
  - **nyutnyut** (2↑): For completely new component designs do they just prompt everything? Even if it’s for completely new that doesn’t use existing primitives?
  - **Inkle_Egg** (1↑): Where does the source of truth live if not Figma anymore? For instance, when QA does their testing or you need to review historical design decisions made 6 months down the line?
    - **HatEnvironmental6512** (1↑): At the moment we handshake for the design we keep a working html copy (for ex its a website) to send to customer and to keep reference
- **b15_portaflex** (1↑): Figma has issues and may not last long term but a single source of truth is important, so for now, Figma is it.
- **jlpkard** (1↑): Timely post. We just started reducing seats for Figma because most designers are working in an IDE these days.
- **TechnicalRatio1322** (1↑): i think it honestly depends on preference. all design teams are still figuring out what works best. i think it just comes down to designer preference. I will say for source of truth, more designers are moving into the code base. its much easier to track things there especially given how a lot more people are starting to ship FE designs (including eng). 

for handoffs, Ive heard designers desigining in the codebase then pulling designs into figma or paper and then annotating/handing off there

last point. im not sure, dont think many people have cracked this
- **roundabout-design** (1↑): We have a very small design team. (Mainly just me.) So we're aiming for #3...making the DS AI-centric, letting product folks do a lot of prototyping in Claude directly. 

TL/DR Figma is fading away fast here. I'm OK with that.
- **robr0** (1↑): mostly seeing #3.... which is not ideal because a lot of design output is hard to find or look back on.
- **Sad-Group9616** (1↑): Has anyone read this? [https://claude.com/blog/the-ai-native-sdlc-playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)

It doesn't even mention a designer being part of the actual SDLC. It talks about a PM talking an [intent.md](http://intent.md) file and basically crafting a PRD, mocking it up and sending it to engineering. It speaks about it still being guided by design, but in this world, I think design is reduced to a small platform team
