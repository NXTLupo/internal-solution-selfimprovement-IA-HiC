---
id: social-intelligence/reddit-deep/figmadesign/1tx3zio.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1tx3zio/do_you_think_figma_agent_will_eventually_replace/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Do you think Figma Agent will eventually replace most plugins?"
author: "Lumpy-Feedback-5732"
date: "2026-06-04T23:22:35.000Z"
score: 11
upvote_ratio: 0.87
num_comments: 24
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.235Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c0"
    char_span: [0, 843]
    sentence_count: 6
    key_terms: [figma, plugins, agent, figmadesign, specialized, eventually, workflows, comments]
    concepts: [figma, plugins, figmadesign, specialized, agent]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c1", "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c3", "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c4"]
    token_count: 184
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1tx3zio/do_you_think_figma_agent_will_eventually_replace/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c1"
    char_span: [858, 2761]
    sentence_count: 19
    key_terms: [figma, use, credits, expensive, cost, claude, agent, plugins]
    concepts: [figma, credits, expensive, claude, agent]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c0", "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c4"]
    section: Comments
    token_count: 465
  - id: "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c2"
    char_span: [2763, 3090]
    sentence_count: 3
    key_terms: [agents, guidelines, submitting, hydration, business, deepseek, recently, rejected]
    concepts: [agents]
    section: Comments
    token_count: 67
  - id: "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c3"
    char_span: [3092, 5265]
    sentence_count: 13
    key_terms: [plugins, plugin, functionality, figma, consistency, specialized, automation, precision]
    concepts: [plugins, plugin, functionality, consistency, specialized]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c0", "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c4"]
    section: Comments
    token_count: 469
  - id: "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c4"
    char_span: [5267, 6727]
    sentence_count: 10
    key_terms: [figma, specialized, plugins, agent, spatial, sandwichembarrassed7, lumpy-feedback-5732, smellslikesponge]
    concepts: [figma, specialized, plugins, agent, spatial]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c0", "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c1", "social-intelligence/reddit-deep/figmadesign/1tx3zio.md#c3"]
    section: Comments
    token_count: 326
---
# Do you think Figma Agent will eventually replace most plugins?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1tx3zio/do_you_think_figma_agent_will_eventually_replace/)
Posted by **Lumpy-Feedback-5732** · **11↑** · **24 comments**

Hi everyone,  
With all the recent discussion around Figma Agent, I'm curious how people see the future of specialized Figma plugins.  
  
AI seems useful for things like understanding context, generating designs, and making suggestions.  
  
At the same time, some workflows feel more rule-based, such as design system transformations, repetitive actions, and applying the same operation across hundreds of layers.  
  
Do you think Figma Agent will eventually cover most plugin workflows?  
Or do you think specialized plugins will continue to have a place alongside it?

## Comments

- **rock_x_joe** (12↑): I think it will come down to what the specific task is. If it's something you might do many times down the road and you need a deterministic output, you're better off but having the ai build a plugin that scripts that functionality and then you can run it whenever you need at no additional token cost
  - **marxcie** (2↑): Shameless self promotion: exactly what I’ve built. https://www.figma.com/community/plugin/1620556386343160879/codefig
  - **Lumpy-Feedback-5732** (0↑): Agreed. That feels like the best i think .. use AI to build the workflow, then use automation to execute it consistently.
- **Wolfr_** (6↑): No because AI credits will cost money and specialized plugins can do some tasks better. So I think they will coexist. But… some plugins might just become agent skills. That’s gonna be the evo.
- **creative_idiot_** (4↑): Agent will be super expensive to use. Figma will be expensive than claude and that's my main worry. 

I had exhausted 3000 figma ai credits within 3 days using Make. And extra usage is more expensive.

Now that you can edit local codebase directly on make and agent available for design, figma ai credits will get spent up quickly adding up costs.
  - **Northernmost1990** (2↑): Yep, this. You can get a taster for the upcoming cost by booting up Pencil.dev and Claude Code using token-based billing. The most basic of UI tasks will cost you tens of dollars, which may sometimes be worth it, but it sure as hell ain't gonna be no free buffet.

Even with judicious use, I'd expect monthly costs to creep up to four figures.
    - **creative_idiot_** (2↑): Yup. And figma is pretty closed ecosystem and profit focused. They won't show upfront how much claude tokens you actually use. They just show their vague ai credits. I'm pretty sure they have mark up on that. They have limits in MCP/rest API. So external tools won't be that useful too.

I recently tried submitting plugin with byok agents which works exactly like figma agents but with better design.md, prompt hydration, skills etc which gives claude quality output even with deepseek. It was not using MCP or rest API. They rejected it stating it doesn't align with their guidelines under business sense. ykwim. 

(Their guidelines literally states - we may not approve plugins that harm figma's business, recreate figma functionality or allow user to access or use figma functionality in a manner intented to avoid fees)
  - **Lumpy-Feedback-5732** (2↑): I had a similar experience recently while building a landing page. I managed to burn through all 3,000 AI credits in a single day.  
That’s one of the reasons the idea of using AI to build the workflow, then automation to execute it, makes a lot of sense to me.
- **its_sameena** (2↑): I see them coexisting. AI is great for ideation and context-aware tasks, but many plugin workflows need precision, consistency, and predictable outputs especially for design systems and bulk operations. Those are areas where specialized plugins still have a strong advantage.
- **its_sameena** (2↑): I don’t see specialized plugins going away anytime soon.
AI is great for creative exploration and understanding intent, but many plugin workflows are built around precision, consistency, and automation at scale. For those use cases, dedicated plugins will likely remain valuable even if AI becomes the front end that helps users access them more easily.
- **kekeagain** (2↑): Not for the long run of the immediate future... the price of AI is subsidized by Figma/investors at the moment.  The real cost would make you think twice.  Companies are starting to lock down their AI budgets.  The frugal individual will stop to think if this is doable using Figma's current feature set before getting a blowtorch to light a cigar.  The smarter one will then look to see if there is a plugin that can do it for them.  The smartest one will be able to differentiate when it's deterministically possible and have AI write a custom local plugin for them so they don't need to spend tokens each time.
- **Complete-Scratch-899** (3↑): In general, the minimalist, "clean and slick" grid dominating the web today isn't actually a pure aesthetic choice—it's a compromise we've been forced into by the rigid constraints of the HTML box model. Because translating fluid geometry into standard code is so painful, web layouts have stayed locked in vertical boxes.

That’s exactly why specialized plugins aren't going anywhere, even with Figma Agent on the horizon. AI is fantastic at understanding context or spitting out a quick layout, but it completely falls apart when it comes to strict, rules-based spatial execution.

We actually tested this recently with our new spatial engine. We had Gemini generate raw structural code for a presentation. The AI handled the rough structure instantly, but fumbled the color nuances, precision curves, and exact layer logic. We had to bring the vector file into Figma to visually fine-tune it before firing it straight to the web as a live app. Don't get me wrong, this is not a bad workflow combination!

Figma Agent will probably handle the generic, repetitive tasks, but specialized plugins will always have a place.
  - **Lumpy-Feedback-5732** (1↑): That's a good way to put it.  
AI is great at getting you close to a solution, while specialized tooling still has an advantage when consistency and predictable results matter.
- **smellslikesponge** (1↑): It better, or the Figma canvas as we know it is over.  I'm struggling to decide if traditional figma ui design is over.
- **SandwichEmbarrassed7** (1↑): Looking forward to Figma adding /skills functionality to their agent, which then will replace most custom plugins.
- **Bedelia_1212** (1↑): I think Figma takes what works and it might be implemented in a future build, but it has to be general and enough of a painpoint.
