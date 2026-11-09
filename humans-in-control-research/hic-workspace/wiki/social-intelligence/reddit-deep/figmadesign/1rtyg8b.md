---
id: social-intelligence/reddit-deep/figmadesign/1rtyg8b.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1rtyg8b/is_there_an_ai_tool_that_creates_designs_in_figma/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Is there an AI tool that creates designs in Figma using my Design system?"
author: "OkLettuce7089"
date: "2026-03-14T23:31:05.000Z"
score: 55
upvote_ratio: 0.87
num_comments: 44
flair: "resources"
extracted_at: "2026-09-10T17:19:11.229Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c0"
    char_span: [0, 1119]
    sentence_count: 8
    key_terms: [like, design, system, figma, tools, figmadesign, comments, existing]
    concepts: [design, system, figmadesign, figma, tools]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c1", "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c3", "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c4"]
    token_count: 253
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1rtyg8b/is_there_an_ai_tool_that_creates_designs_in_figma/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c1"
    char_span: [1134, 3159]
    sentence_count: 10
    key_terms: [code, figma, connect, claude, system, design, mcp, generate]
    concepts: [figma, connect, claude, system, design]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c0", "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c3", "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c4"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c2"
    char_span: [2863, 3366]
    sentence_count: 4
    key_terms: [system, code, set, commenting, components, playground, prototypes, component]
    concepts: [system]
    section: Comments
    token_count: 112
  - id: "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c3"
    char_span: [3368, 5296]
    sentence_count: 6
    key_terms: [figma, design, plugin, https, like, use, components, generation]
    concepts: [figma, design, plugin, components, generation]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c0", "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c1", "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c4"]
    section: Comments
    token_count: 488
  - id: "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c4"
    char_span: [5298, 7487]
    sentence_count: 13
    key_terms: [components, figma, jackthehamster, code, design, using, system, component]
    concepts: [components, jackthehamster, figma, design, using]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c0", "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c1", "social-intelligence/reddit-deep/figmadesign/1rtyg8b.md#c3"]
    section: Comments
    token_count: 476
---
# Is there an AI tool that creates designs in Figma using my Design system?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1rtyg8b/is_there_an_ai_tool_that_creates_designs_in_figma/)
Posted by **OkLettuce7089** · **55↑** · **44 comments**

The AI tools hype is overwhelming, but I’m trying to stay on top of it. As a designer working on a mature product with thousands of existing screens and a well-established design system, I’m trying to figure out which tools actually improve my workflow.

So far, visualizers like Lovable and Figma Make are good for presenting concepts and prototypes, but they don’t really speed up designing new features.

On the other hand, there are more code-focused tools like Cursor and Claude. I haven’t tried Claude yet, but I didn’t find Cursor useful (happy to be proven wrong).

What I’m really looking for is something like Figma Make that works with my existing design system—mostly styles and components rather than variables—and produces code that can be handed off to the frontend team.

Has anyone found a tool that actually works like this?

## Comments

- **Cressyda29** (56↑): Claude code + figma mcp + code connect + storybook is what you want. Can generate anything while sticking to your design system in figma and in code. If the system is correctly setup that is, specifically naming conventions.
  - **OkLettuce7089** (16↑): I was looking into Code Connect before realizing it’s only available for Org and Enterprise teams, which my team isn’t on… so now need to think about a workaround.
  - **Fun_Bee_1955** (8↑): I’m trying to set this up but even with code connect when I generate designs with Claude Code using Figma MCP, it won’t use our exact design system component in Figma. I mean visually it’s perfect, but under the hood it’s just custom layers. I’m thinking about vibecoding a plugin that can help me out here
  - **ichbinedgar** (2↑): Why do you need code connect? Figma mcp and Claude code are enough. I’m not designer but I used shadcn ui figma designs and used pencil instead of figma and worked very well.
    - **Cressyda29** (1↑): It gives Claude code better reference to your design system setup, specifically context on both ui and code at the same time. This step reduces risk of hallucinations.
  - **VodkaPanda** (2↑): Currently looking to do exactly this, would your be able to share any learnings around naming conventions and what works best?
  - **laffingbuddhas** (1↑): DIdn't know about code connect until I read this - thank you!
  - **sriramdev** (1↑): Thanks for the info
  - **shipstatic** (1↑): Add static hosting into the mix and you’ll find that 80% of projects don’t need anything else to get a finished project live.
  - **Fun_Bee_1955** (1↑): When Figma MCP generate designs in Figma, can it use your Figma components too?
- **friendofmany** (12↑): I got inspired by Notion’s process where they use their component library (already in code) as the basis for a “prototype playground”.  I have our components and design system in its own dir and build prototypes and templates from it using Claude Code and Cursor. So far so good and i haven’t had to open figma in two weeks with this set up. I actually took it a little further than Notions set up and I built a commenting system so devs can drop pins on the views if they have questions. 

I had been trying to get figma and Claude to talk to each other and I eventually came to the conclusion I don’t really need figma if my design system is already in a tidy repo i can build prototypes from. 

https://youtu.be/s4HGbIhUgVo
  - **Fun_Bee_1955** (2↑): Lol, I’ve built the same commenting/critiqueing script that adds a toolbar and you can leave feedback :D
  - **Fun_Bee_1955** (1↑): How so you handle handover? I feel like the only reason for Figma in my design process is to annotate, spec, define stuff for devs and lay out states, etc
    - **friendofmany** (1↑): i’ve been annotating in the comment tool but also writing specs in Basecamp accompanied by either video of the interactions or screen grabs showing all the logic and states. I haven’t had a project where i have to introduce a new component, but have some ideas on how to spec that.
- **ovjectibity** (5↑): While all the solutions others described are perfectly valid if you are ultimately aiming for code generation, if you're aiming only for generating designs I'd recommend trying this plugin out: https://www.figma.com/community/plugin/1589249271423490087/basquiat

You can use it within a design file & it helps generate Figma design files directly (not the roundabout way via code like in Figma Make) with ability to use your existing library components too.
- **skatecrimes** (5↑): Ux pilot plugin in figma will use your components
- **ulasyuk** (4↑): Check Figma Console MCP

https://youtu.be/BwcOI2osSCQ?si=KQ9BPj5faHjJ4_va
- **One-Prompt6580** (2↑): The gap here isn't really about generation — most tools can produce something that *looks* like your design system. The problem is identity.

A generated component that matches your nav bar visually is still a copy, not an instance. It's not connected to your library, it won't receive updates, and it doesn't know it's supposed to be the same thing as the nav bar in your other 50 screens.

Code Connect helps if you're on Org/Enterprise and your system is set up for it. For everyone else, the workaround is a rules file that maps component names to code paths — Claude reads the rules and knows which component to call instead of generating a new one.

But the deeper issue is that none of these tools solve the portability part. You can generate a perfect Figma design using your DS, but moving those components to another tool or project currently means rebuilding from scratch.
- **Natural-Economy-875** (2↑): sparkohai's been pretty helpful for me with tricky design systems. Especially when I need to turn styles and components into code. It's awesome for complex designs. But it's mainly geared towards 3D modeling. You might want to check it out for concept ideation with your other tools.
- **jackthehamster** (1↑): For me the Vibma did it for me, you can check it out on git, it works best with Claude
  - **ChildhoodKindly2439** (1↑): Looks super cool.  u/jackthehamster what do you think about the direction of using coding agents and the "real thing", like using your actual code components to build the actual interfaces rather than designing and handing over to developers?
    - **jackthehamster** (1↑): Well, already been doing this for quite a while, it will be just easier with ai now
- **PassageAlarmed549** (1↑): Figma Make is extremely good at following whatever design system you provide as linked frames. The issue though is that the code quality I’d say fits a prototype, but not a production ready app.
- **sharadvelocity** (1↑): Magic Patterns may be worth testing for this. You can import Figma frames or individual components into a Magic Patterns Design System, then generate new UI using those components and export the result back to Figma. It can also connect to GitHub, which may make the engineering handoff more useful than a purely visual prototype.

It doesnt work entirely inside Figma, though, so I’d start by importing maybe 10 15 representative components and testing whether it preserves variants, states, spacing, and naming properly. With thousands of screens, the quality of that mapping matters more than the first generated result.
