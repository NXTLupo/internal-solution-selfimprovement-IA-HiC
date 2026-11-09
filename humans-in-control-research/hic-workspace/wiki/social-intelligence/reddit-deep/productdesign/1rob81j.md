---
id: social-intelligence/reddit-deep/productdesign/1rob81j.md
url: "https://www.reddit.com/r/productdesign/comments/1rob81j/im_building_an_ai_design_agent_for_product/"
kind: "social-post"
source: "reddit-deep: r/productdesign"
subreddit: "productdesign"
title: "I’m building an AI Design Agent for product designers — would love your feedback"
author: "Extension_Gain7275"
date: "2026-03-08T17:47:02.000Z"
score: 5
upvote_ratio: 0.86
num_comments: 10
flair: ""
extracted_at: "2026-09-10T17:19:06.257Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/productdesign/1rob81j.md#c0"
    char_span: [0, 1619]
    sentence_count: 3
    key_terms: [product, png, design, https, preview, format, width, designers]
    concepts: [product, design, https, preview, format]
    related_chunks: ["social-intelligence/reddit-deep/productdesign/1rob81j.md#c1"]
    token_count: 474
    sources: [{"n":"reddit-deep: r/productdesign","u":"https://www.reddit.com/r/productdesign/comments/1rob81j/im_building_an_ai_design_agent_for_product/"}]
  - id: "social-intelligence/reddit-deep/productdesign/1rob81j.md#c1"
    char_span: [1626, 2514]
    sentence_count: 3
    key_terms: [png, https, b8fc135e439e14fe8107b46d2ae31cf22a84ebfe, preview, format, fleck-design, width, auto]
    concepts: [https, preview, fleck-design, format, width]
    related_chunks: ["social-intelligence/reddit-deep/productdesign/1rob81j.md#c0"]
    token_count: 288
  - id: "social-intelligence/reddit-deep/productdesign/1rob81j.md#c2"
    char_span: [2529, 4035]
    sentence_count: 10
    key_terms: [like, "that's", especially, reference, workflow, commercialtruck4322, agent, audit]
    concepts: ["that's", especially, reference, workflow, agent]
    section: Comments
    token_count: 312
---
# I’m building an AI Design Agent for product designers — would love your feedback

Source: [reddit-deep: r/productdesign](https://www.reddit.com/r/productdesign/comments/1rob81j/im_building_an_ai_design_agent_for_product/)
Posted by **Extension_Gain7275** · **5↑** · **10 comments**

Hi everyone 

I'm a product designer & founder, and recently started building something called **Fleck**.

[Fleck-Homepage](https://preview.redd.it/ypveiyutwung1.png?width=1462&format=png&auto=webp&s=8e10a6feacc67d7a1dfcc59e056e5faba1c2f77b)



The idea is to create an **AI Design Agent for product designers** that helps turn product ideas into real design outputs faster.

Instead of just generating UI screens, the goal is to support the **full product design workflow**.

Right now, Fleck focuses on things like:

• **AI Mentor** → Guide designers from idea to product concept  
• **UX Flows** → Generate user journeys and product structure  
• **UX Audit** → Analyze designs-usability & accessibility frameworks  
• **Design Converter** → Turn sketches or screenshots into UI  
• **Figma Integration** → Export designs directly to Figma  
• **Portfolio Builder** → Generate case studies for design portfolios

[Fleck-Design Mentor](https://preview.redd.it/rp2z08n8xung1.png?width=1462&format=png&auto=webp&s=4ce42b562aacb003e64eeab5c8bbce04bb97127b)



[Fleck-Design Mode](https://preview.redd.it/fpezluxhxung1.png?width=1459&format=png&auto=webp&s=a3db5ee83a46a3598146cd350065d980d80a115c)



[Fleck-UX Audit](https://preview.redd.it/9kc07zdfyung1.png?width=1464&format=png&auto=webp&s=3715c3c50504b59621a785c20c1ef796bc32493b)

  


[Fleck-Design Converter](https://preview.redd.it/8fr27ravyung1.png?width=1457&format=png&auto=webp&s=b8fc135e439e14fe8107b46d2ae31cf22a84ebfe)



[Fleck-Design Mode](https://preview.redd.it/phpekp96zung1.png?width=1456&format=png&auto=webp&s=76494c1760647ed1319c4f8ce3a16d41a758025e)



[Fleck-Case study](https://preview.redd.it/1mw1bhmfzung1.png?width=1456&format=png&auto=webp&s=8665fd9c0a2a50088b3321f0844860e57b1e3241)

I'm still shaping the direction and would really love to hear what other designers think.

A few things I'm curious about:

* Would something like this actually be useful in your workflow?
* Which part would be most valuable? (UX reviews, flows, design conversion, etc.)
* What would you want an **AI design mentor** to help with?

If anyone wants to check it out, it’s here:  
  
[https://fleck.ai](https://fleck.ai)

Really appreciate any thoughts or feedback 🙏

## Comments

- **Otherwise_Wave9374** (2↑): This looks like a legit use case for an AI agent (multi-step workflow, not just "generate a screen"). The UX audit + flow generation pieces seem like the highest leverage, especially if it can reference a design system and keep decisions consistent across a project. How are you handling memory/context between steps so it doesnt "forget" constraints? Some agent workflow notes that might be relevant: https://www.agentixlabs.com/blog/
- **CommercialTruck4322** (2↑): The UX audit piece is what caught my attention most. Honestly that's where I feel like I'm constantly second-guessing myself, especially on accessibility stuff. Having something that can actually reference real frameworks instead of just spitting out generic feedback would be genuinely useful. The portfolio/case study builder also feels like a sleeper feature, that part of the job takes forever and nobody really talks about how painful it is.

One thing I'm curious about is how the AI mentor handles the more ambiguous early-stage stuff, like when you don't even have a clear problem statement yet. That's usually where I get stuck and most tools just assume you already know what you're building. If Fleck can actually help work through that messy thinking phase, I think that's where it'd really stand out from everything else out there.
- **Brave_Bother5162** (1↑): would love this but have concerns for protection/privacy when collaborating on ideas with it - similar to how Claude approaches this.
