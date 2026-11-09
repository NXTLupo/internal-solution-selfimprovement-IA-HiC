---
id: social-intelligence/reddit-deep/figmadesign/1td9hpm.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1td9hpm/claude_code_figma_mcp/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Claude code + Figma mcp"
author: "Munnayi"
date: "2026-05-14T20:00:47.000Z"
score: 49
upvote_ratio: 0.87
num_comments: 37
flair: "help"
extracted_at: "2026-09-10T17:19:11.228Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c0"
    char_span: [0, 1136]
    sentence_count: 14
    key_terms: [claude, workflows, specific, design, figmadesign, advantage, comments, looking]
    concepts: [claude, workflows, specific, design, figmadesign]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c2", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c3"]
    token_count: 259
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1td9hpm/claude_code_figma_mcp/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c1"
    char_span: [1151, 3090]
    sentence_count: 14
    key_terms: [figma, claude, code, using, implementation, doing, mcp, efficient]
    concepts: [figma, claude, using, implementation, doing]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c2", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c3", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c4"]
    section: Comments
    token_count: 463
  - id: "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c2"
    char_span: [3092, 5292]
    sentence_count: 10
    key_terms: [design, components, code, http, use, claude, figma, good]
    concepts: [design, components, claude, figma, brand-guidelines]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c0", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c1", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c3", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c4"]
    section: Comments
    token_count: 478
  - id: "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c3"
    char_span: [5296, 6999]
    sentence_count: 7
    key_terms: [figma, design, mcp, workflows, claude, component, variables, creation]
    concepts: [figma, design, workflows, claude, component]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c0", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c1", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c2", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c4"]
    section: Comments
    token_count: 420
  - id: "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c4"
    char_span: [7002, 8731]
    sentence_count: 2
    key_terms: [mcp, difficultcarpenter00, figma, claude, schemas, context, tool, console]
    concepts: [difficultcarpenter00, figma, claude, schemas, context]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c1", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c2", "social-intelligence/reddit-deep/figmadesign/1td9hpm.md#c3"]
    section: Comments
    token_count: 447
---
# Claude code + Figma mcp

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1td9hpm/claude_code_figma_mcp/)
Posted by **Munnayi** · **49↑** · **37 comments**

Just got access to Claude code at work and I’m looking for guidance on how I should best utilise it into our workflows?

So far we’ve connected Claude to our Figma mcp and have created some screens with our design system but have ran up quite a lot of credits quite quickly, so we’re looking to optimise our usage effectively.

Some specific questions;

1. How are you taking advantage in your workflows? What are you using Claude / AI for? Any specific skills we should take advantage of?

2. What’s your setup look like? Whats your markdown structure look like? Just a simple design.md file to cover everything or a more fragmented approach with md files for specific parts of the design system? How have you gone about defining / writing your md files?

3. Where should I focus my time researching? Is there any useful resources? Blogs to read, videos to watch? Is there anywhere to find skills/workflows from official or community sources?

## Comments

- **crancrancran** (41↑): I’ve found straight up using Claude to design in Figma is too slow, expensive, and will just get things wrong. It is much better and efficient at writing code. Figma is best used for context for Claude to generate code from. Or sending exploratory html/css code to Figma to refine manually.
  - **Qb1forever** (3↑): No we gave you the tool why isn't it doing the magic your doing it wrong -some higher up at your company
  - **D3nny01** (1↑): Agreed. I just use Claude code with IDE and loving it
  - **drkh3art** (1↑): Claude (Code) has to do a LOT of back and forth via the Figma MCP when trying to do anything beyond trivial work that requires making changes in to Figma. I don't know what the internal implementation looks like for the MCP but it seems to me—especially from having compared Claude Code w/Claude Design—that this is because Claude is not fine tuned to take advantage of how Figma works. This inefficiency often causes the exhaustion of tokens/credits that was pointed out to above as well.

Today I was trying Figma AI (using the beta agent features) in Figma, and I can see that it is much more efficient doing similar tasks. I'd also guess that FIgma AI agents do \_not\_ go through the Figma MCP (at least not the one we have access to) and is going through a better internal implementation (this is a guess).  
  
There are still inefficiencies using FIgma's own agents. E.g. The agent has to take screenshots of whatever it did and then run those images via the LLM to see if it got it right. Compare this with a human just "looking at what's on the screen" and making the same determination :-)

It also seems to me that Anthropic will not put Figma as a first-class integration (as it has done with some other adjacent tools), likely due to competitive reasons. So teams using Figma will have to figure things out as ar as workflow goes, and also wait and see to see who wins this race.

I am currently playing around with these same tools, and trying to get a good iterative workflow between Figma and Claude code. And I want that to support bi-directional handoffs/syncs. Will post here when I have anything useful to share. I'd also appreciate good pointers towards this, if you have any. Thanks in advance.
- **glowing_fish** (16↑): I’ve gotten the best results when Claude code has access to my DS components in code. Assuming your DS is in sync between Figma and code and you’re good about using your components in both design and code the design can be a good reference. 

I use Claude chat to help write the PRD, telling it to ask questions till it understands what I need,  then prompt Claude code by pointing it to my coded components and telling it to use my components and tokens and reference the design file and library in Figma. 

You need to be very explicit about telling it to use your tokens (or variables) and components otherwise it’ll just throw in a bunch of junk.
- **Glad_Handle_7605** (15↑): Biggest advice, don’t use Claude + Figma MCP as a “design the whole screen for me” tool, that burns credits fast and usually gives mediocre design decisions. It shines more as a structured design assistant, use it for component generation, UX copy, edge cases, design critiques, flow exploration, accessibility checks, design token mapping, and dev handoff support, while keeping core design thinking human-led.



For setup, I’d avoid one giant [design.md](http://design.md) and go modular:



[design-system.md](http://design-system.md) → tokens, spacing, typography, components

[brand-guidelines.md](http://brand-guidelines.md) → voice, visuals, constraints

[patterns.md](http://patterns.md) → flows, reusable UX patterns

[product-context.md](http://product-context.md) → users, business goals, constraints

[prompt-recipes.md](http://prompt-recipes.md) → proven prompts that save credits



Credit optimization:



Feed focused context, not your entire system every prompt

Ask for variations in one request

Reuse prompt templates

Use it for audits/reviews more than generation

Keep Figma MCP targeted to specific components/screens, not open-ended exploration



Research-wise, focus on prompt engineering for design workflows, MCP workflows, design systems + AI handoff, and AI-assisted product design, honestly the best workflows right now are mostly community experimentation because the space is moving insanely fast.
  - **Munnayi** (1↑): Awesome thanks for this!
  - **Responsible_Pair_643** (1↑): Thanks
- **Decent_Perception676** (6↑): Figma MCP is slow, clunky, and expensive… but if you gonna try it I found that having all the skills from Figma for it makes it marginally better. 

How they bungled the MCP server so bad is beyond me. I built an MCP server for our own design system and it’s lightning fast and accurate.
  - **Dickskingoalzz** (1↑): Is yours on GitHub?
    - **Decent_Perception676** (1↑): Yes, on a private GitHub Enterprise instance. Users access it either by cloning locally, or via gh cli.
  - **vantrilio** (1↑): can you elaborate? How did you build it and how does it design better?
- **Academic_Constant42** (3↑): Claude code is greater for audit in figma design system, 1:1 parity with code, batch fix in variables (scope for example), websyntax in variables, etc. Also good for repetitive scoped changes, like organizing frames in canvas, replicating a pattern in new screens. Also good for quick wins variations, like changing one card in a page with 4 idea options.
- **Old-Wolf-2491** (3↑): Hey u/Munnayi ,

Here's my workflow,  
Generate Variable collections - Figma plugin, figspecs  
Component creation - Figma  
High fidelity designs - Claude, token reference via figma mcp  
Handoff - UI Spec, per component .md file & tailwind v4 file creation - Figspecs  
Development - Claude by uploading files extracted from figma.  


But this way I get designs mapped to tokens while development by 95%. less claude credits burnt, lowering my spend.
- **Deep_Ad1959** (3↑): the figma mcp tool definitions are the silent context tax here. that server registers roughly a dozen tools and the schemas alone are a few thousand tokens loaded every turn whether you invoke them or not. fragmenting your design.md is the right move but only helps if you @-reference the fragments instead of inlining them all, mcp schemas don't get that treatment. run /context once mid-session and check how much of your budget is already gone before you type anything. usually it's a lot, and most of it is tool schemas you've called twice this week.

fwiw I built ccmd for this exact audit, run it on your CLAUDE.md and it shows you the token cost per rule plus the mcp tool schemas that load every turn whether or not you call them, so you can see what's eating your /context before you type, https://ccmd.dev/r/j7hg242n
- **DifficultCarpenter00** (3↑): ditch figma mcp and use figma console mcp. light-years more useful
  - **NckyDC** (4↑): Can you expand on this please?
    - **DifficultCarpenter00** (-3↑): see the comment above
  - **Stressisnotgood** (1↑): what do you mean with this
    - **DifficultCarpenter00** (0↑): figma console mcp is a different mcp made by southleft and it can understand and go deeper into the layers for a better analysis
- **ygorhpr** (3↑): I connected Claude with my ds and source files with my saas so I can iterate the solution as html with Claude then send it to figma linking my ds, some days I do this with 3 file at the same time. I've created a full storybook with Claude consuming my DA also.
- **Diligent-Plane-2640** (1↑): Use Figma make
