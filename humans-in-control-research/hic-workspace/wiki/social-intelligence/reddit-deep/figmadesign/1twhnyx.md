---
id: social-intelligence/reddit-deep/figmadesign/1twhnyx.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1twhnyx/design_engineering_is_the_new_product_design/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Design Engineering Is the New Product Design: Lessons From a Recent Enterprise Project"
author: "Rough-Mortgage-1024"
date: "2026-06-04T08:38:21.000Z"
score: 118
upvote_ratio: 0.91
num_comments: 39
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.227Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c0"
    char_span: [0, 1813]
    sentence_count: 6
    key_terms: [storybook, design, figma, development, enterprise, using, workflows, skill]
    concepts: [storybook, design, figma, development, enterprise]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c3"]
    token_count: 362
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1twhnyx/design_engineering_is_the_new_product_design/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c1"
    char_span: [1828, 3929]
    sentence_count: 15
    key_terms: [design, product, engineering, designers, rough-mortgage-1024, different, role, implementation]
    concepts: [design, engineering, product, designers, rough-mortgage-1024]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c2", "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c3", "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c4"]
    section: Comments
    token_count: 445
  - id: "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c2"
    char_span: [3931, 6329]
    sentence_count: 14
    key_terms: [design, prototypes, engineering, revolutionaryhead384, focus, code, work, thinking]
    concepts: [design, prototypes, revolutionaryhead384, engineering, focus]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c1"]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c3"
    char_span: [6333, 8292]
    sentence_count: 10
    key_terms: [storybook, rough-mortgage-1024, figma, code, design, industry, components, prototype]
    concepts: [storybook, rough-mortgage-1024, figma, design, industry]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c0", "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c1", "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c4"]
    section: Comments
    token_count: 484
  - id: "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c4"
    char_span: [8294, 10597]
    sentence_count: 9
    key_terms: [design, component, components, rough-mortgage-1024, figma, designers, storybook, prototype]
    concepts: [component, design, rough-mortgage-1024, components, designers]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c1", "social-intelligence/reddit-deep/figmadesign/1twhnyx.md#c3"]
    section: Comments
    token_count: 486
---
# Design Engineering Is the New Product Design: Lessons From a Recent Enterprise Project

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1twhnyx/design_engineering_is_the_new_product_design/)
Posted by **Rough-Mortgage-1024** · **118↑** · **39 comments**

I've seen a lot of people asking how AI actually fits into enterprise design and development workflows beyond generating mockups or code snippets.

On a recent enterprise project, we experimented with Figma MCP, Storybook, AI-assisted development, and a skill-based workflow to bridge the gap between design and production.

A few lessons stood out:

* Building prototypes with AI and vibe coding was easy. Making them production-ready was the hard part.
* Storybook became the place where design and development actually met.
* Designers started contributing directly to Storybook instead of stopping at Figma.
* We treated everything as a reusable skill: Figma analysis → component mapping → Storybook generation → code connect → guideline checks.
* Skills worked like lightweight plugins that were easy to build, maintain, and compose into larger workflows.

We ended up using two approaches:

1. **Prototype-first** – For complex screens and flows, we used AI-generated HTML prototypes to validate ideas quickly, then productionized them to Storybook using a custom skill that was developed.
2. **Design-system-first** – When the design direction was already clear, we moved directly from Figma into Storybook components, reducing handoff friction and keeping implementation aligned with the design system.

All these components after dev approval was connected back to figma using code connect (Again using a skill automatically)

Curious how others are embedding AI into their design-to-development workflows today.

## Comments

- **mp-product-guy** (27↑): I have to disagree with your title/premise. Design engineering is just a different form of UI engineering, not product design. Product design is still the process of understanding your product, your customer needs, your competitors, and understanding how your product is designed to compete in the market and meet your users needs. What you’re describing here is a workflow for creating UI efficiently for designers, that’s it.
  - **TopRamenisha** (5↑): Yep! Design engineer is a different role from product designer. They my work together but they have different responsibilities
  - **Rough-Mortgage-1024** (1↑): I agree that "design engineering is the next product design" was probably too strong or too specific a title on my end. I’m not saying design engineering replaces product design or that they’re the same thing.

What I meant is that, similar to how product design evolved into its own widely recognized role, I think design engineering is going to become a much more common and important role in the coming years. As AI and modern tooling make implementation faster, the ability to bridge design and engineering will become increasingly valuable.

So my point was more about the growth and adoption of the role itself, rather than design engineering becoming the new definition of product design.
- **RevolutionaryHead384** (32↑): That sounds cool, but why? I’m not sure I understand why this direction of travel for the industry.

Is it because design doesn’t trust their devs to actually do their work? What will devs do if designers also do the code?
  - **Rough-Mortgage-1024** (13↑): To speed up the design-to-dev process, we ran an internal hackathon to explore what could be achieved in the next 30 days.

Benefits : 

* Designers now own the design in both Figma and code, making true pixel-perfect implementation possible.
* Storybook and Figma are fully synced and ready for AI agents to consume.
* Most importantly, designers can now own motion in code rather than having it exist only as static documentation.

What does this mean for developers?

Developers can focus on integrating these coded components into their product flows, handling security, data mapping, business logic, and everything beyond UI implementation. (Which is still a significant part of the workflow.) Instead of starting from scratch, development teams begin with production-ready coded UI components, allowing them to move faster and focus on higher-value engineering work.
    - **RevolutionaryHead384** (21↑): They focus on higher value engineering work, whilst we focus on lower value design work?

I’m just thinking out loud btw, not a criticism of you directly. I’m just a little confused about where the industry is going. I thought design is about figuring what users need, and delivering a feasible solution for that with engineers. 

Design seems doesn’t seem to have an identity. It lost the plot previously with the design thinking process, now it seems to be moving towards design engineering.
  - **DanFlashes19** (9↑): Being able to design in real code, in functioning prototypes, that feel as real as the end product, is far better than designing static screens in Figma. 

Is this actually difficult to understand or are people just grasping onto their current workflows and refusing to adapt?
    - **TopRamenisha** (3↑): It’s not hard to grasp at all. Exploratory and divergent design thinking in Figma is a different phase of the design process from prototyping. Yes, prototyping functioning prototypes in code is better than trying to prototype in Figma. But an infinite canvas interface where you can explore tons of options and iterate quickly before landing on a direction still has value and still has a place in the design process
    - **RevolutionaryHead384** (1↑): The discussion was about design deliverable as code, not prototypes
    - **Limit_Cold** (1↑): Yea this is great but note it means you now own 2 design systems and have to manage drift between them, people are going to be updating from both sides, so unless you have extra hands on deck it can/will end up as more work. It does make me wonder why we are putting major time into canvas systems only to recreate it in code. As someone who manages both.
- **monmonandthefellas** (3↑): Thank you for sharing! This is cool to hear from someone in the trenches.  
  
Could you specify the full stack of software you used in each stage, or at least the AI-generated HTML prototypes?  
  
And could you disclose at least which industry this enterprise project was in?
  - **Rough-Mortgage-1024** (1↑): For prototype/storybook it was Figma MCP + Claude Code.  Figma make (for prototype ) was not considered coz of how closed ecosystem it is and was not good with translating the ui to code plus the limited models.

By having the code on our computer, it gave the option to switch between different providers as well. .
- **Travsterable** (3↑): I’m just curious how you’re able to sync your storybook with your design system in figma. For my company, we do have storybook, but the components created on code there are not up to date, whereas our design system on figma is extensive and more detailed. 

In this case, how do you ensure a 1:1 sync? For designers to just look directly at storybook instead of figma? That’s assuming your storybook is complete, but if not, then how? That’s been my bottleneck.
  - **Rough-Mortgage-1024** (1↑): As per the new workflow, design integration with storybook becomes a step before the dev handoff stage. So when a developer inspects the code on figma, the storybook components are already ready and linked using code connect ready to be consumed
- **Qb1forever** (2↑): Only question that matters is how much if a salary bump does it come with?
  - **Rough-Mortgage-1024** (1↑): Not immediately but it becomes the differentiator in this ai era I would say.
- **Select_Stick** (2↑): Then we blame everyone else about the problems of the design industry but we can’t blame anyone but ourselves when we start making up these job titles 🤦🏽‍♂️
  - **Rough-Mortgage-1024** (1↑): TBH designer enginner as a role has been in this industry for some time. The only difference now is, anyone can move to this role vs earlier u needed to have some dev background
- **alygraphy** (1↑): >We treated everything as a reusable skill: Figma analysis → component mapping → Storybook generation → code connect → guideline checks.

Can you give more examples about this reusability? Also what is your current source of truth though to what to follow for the final production?
  - **Rough-Mortgage-1024** (2↑): figma to component was one of the reusable skill we created. so next time i have a component thats needs to be synced, i can use this skill and it does the same steps of making sure it follows our dev standards. another one was html to component where u can convert the html prototype broken down into components adhering to our storybook standards
- **notsoextraordinary99** (1↑): Hey, I am a frontend dev and I have little bit of hands on exp in ux too. And I am trying get into design engineering. So what all things do I need to study or prep for this role ?
- **el_paro** (1↑): oh yes! regression to 2010 web design because we don’t know what “product” stands for…
- **BusyCraft20009** (1↑): Hey Rough-Mortgage-1024,

This is an incredible breakdown. The distinction you made between "vibe coding" a fast prototype versus the actual heavy lifting of making it production-ready is where a lot of teams are hitting a wall right now.

I really appreciate your point about **Designers contributing directly to Storybook instead of stopping at Figma.** Traditionally, the biggest friction point in product design is the messy handoff where things get "lost in translation" between static canvas frames and live code components.

Even without having deployed this specific combination of Figma MCP and custom skills yet, looking at this from a design system perspective makes a lot of sense. By turning component mapping, code connections, and guideline checks into automated, repeatable "skills," you're essentially building a self-sustaining bridge that lets designers see how their layouts behave in a real browser environment much earlier in the cycle.

I’m curious about the designer experience in your "Design-system-first" approach: When moving directly from Figma into Storybook via AI automation, **how much did the designers have to shift their mental model regarding layout structures, auto-layout constraints, or naming conventions to ensure the AI mapped the components cleanly without breaking the system?**

Thanks for sharing these lessons—this feels like a glimpse into the actual future of design operations.
