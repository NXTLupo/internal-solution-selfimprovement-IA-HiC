---
id: social-intelligence/reddit-deep/figmadesign/1vz7ao0.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1vz7ao0/designing_a_scalable_figma_design_system_for_50/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Designing a scalable Figma Design System for 50+ white-label clients. am I thinking about Variables and modes correctly?"
author: "fxspeculator"
date: "2026-08-26T19:35:19.000Z"
score: 11
upvote_ratio: 0.87
num_comments: 21
flair: "help"
extracted_at: "2026-09-10T17:19:11.229Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1vz7ao0.md#c0"
    char_span: [0, 2384]
    sentence_count: 10
    key_terms: [system, components, variables, design, figma, client, different, contrast]
    concepts: [components, system, variables, design, figma]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vz7ao0.md#c4"]
    token_count: 513
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1vz7ao0/designing_a_scalable_figma_design_system_for_50/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1vz7ao0.md#c1"
    char_span: [2399, 3799]
    sentence_count: 10
    key_terms: [collections, brand, extended, appearance, collection, platform, client, need]
    concepts: [collections, brand, extended, appearance, collection]
    section: Comments
    token_count: 297
  - id: "social-intelligence/reddit-deep/figmadesign/1vz7ao0.md#c2"
    char_span: [3801, 5770]
    sentence_count: 11
    key_terms: [agent, color, variables, use, colors, combinations, collections, applied]
    concepts: [variables, agent, color, combinations, colors]
    section: Comments
    token_count: 447
  - id: "social-intelligence/reddit-deep/figmadesign/1vz7ao0.md#c3"
    char_span: [5772, 7759]
    sentence_count: 12
    key_terms: [claude, figma, initial, project, newyorkbourne, brand, maybe, start]
    concepts: [claude, figma, newyorkbourne, initial, project]
    section: Comments
    token_count: 465
  - id: "social-intelligence/reddit-deep/figmadesign/1vz7ao0.md#c4"
    char_span: [7763, 9931]
    sentence_count: 15
    key_terms: [system, design, divergence, samuelbroombyphotog, figma, claude, create, collections]
    concepts: [system, design, samuelbroombyphotog, divergence, figma]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vz7ao0.md#c0"]
    section: Comments
    token_count: 496
  - id: "social-intelligence/reddit-deep/figmadesign/1vz7ao0.md#c5"
    char_span: [9933, 10334]
    sentence_count: 8
    key_terms: [key, need, represented, typography, changing, figuring, general, spacing]
    section: Comments
    token_count: 90
---
# Designing a scalable Figma Design System for 50+ white-label clients. am I thinking about Variables and modes correctly?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1vz7ao0/designing_a_scalable_figma_design_system_for_50/)
Posted by **fxspeculator** · **11↑** · **21 comments**

Hey everyone,

I’m starting to work on a Design System for a travel/public transport app that will eventually be white-labeled for around 50 different clients

The current Design System already has:

* color tokens and styles
* basic components/atoms and variants (buttons, inputs, shadows, etc.)
* but no Figma Variables yet
* very few larger components/molecules/organisms
* no real system for handling different themes/brands

My initial idea was to migrate the existing tokens into Figma Variables and use modes for different visual configurations:

* Light
* Dark
* Contrast
* client 1
* client 2
* …50

The main application would support Light/Dark/Contrast, while the white-label client versions would probably use Light/Contrast.

I would also like to build the component architecture more systematically:

**Atoms → Molecules → Organisms → Templates/Screens**

For example:

Button + Input + Date Picker → Search Form → Search Screen

The goal is to have **one Design System and one set of components**, rather than creating a separate Design System for every client. Ideally, changing the brand/theme would update the UI through Variables without having to modify the components themselves.

However, I’m wondering if having 50+ client brands as Figma modes is actually the right approach.

Would you instead separate **appearance modes** (Light/Dark/Contrast) from **brand/client themes**, using semantic variables that map to different brand values?

For example:

Button → color/action/primary

rather than:

Button → Client1/red-500

So the same component could be reused across all 50+ brands.

I’m also curious about the current state of **Figma AI**. If I build a well-structured component library with Variables and larger reusable components, can Figma AI actually help generate new screens using those existing components, or is that still too unreliable for a production Design System?

I’d really appreciate feedback from anyone who has built a similar **multi-brand / white-label Design System in Figma**.

**How would you structure this?**

## Comments

- **NckyDC** (23↑): Good luck… looks like the start of a nightmare
- **OatmealNinja** (9↑): I’m actually doing something similar now. 

I’d probably use **Extended Collections for the 50 brands rather than 50 modes**. Think of it as:  
**Modes = appearance variations** → Light / Dark / High Contrast  
**Extended Collections = brand implementations** → Client A / Client B / Client C…

Note: I think you need an enterprise license for extended collections. 

Keep components bound to semantic tokens like color/action/primary, and let each brand extension provide the appropriate values. That gives you one component system and one token contract without creating a massive Brand × Appearance matrix.

One additional question: **does this system also need to support Web, iOS, and Android?** If so, I’d account for platform as a separate architectural dimension too. You may ultimately have **shared primitives/semantics → platform-specific collections → brand extensions**, rather than trying to make one collection handle brand, appearance, and platform simultaneously.
  - **linnes613** (2↑): Came here to say this! You’d have your primitives which are all the raw values assigned. And then have a mode collection for light/dark/contrast and extended collections for each brand. If you need to support multiple platforms or screen sizes, you’d have another collection for “device” or “platform”. 

Also do you envision the variables to be in code too? If so, might check out Tokens Studio. Ofc you can use any agent AI to do what TS can do but it’s a bit more user friendly when trying to build an entire token system, esp one that needs to translate in code too. Figma Agent should apply your variables once you create them but you must create a skill that teaches it to read your variables and how to use them. You will want one no matter what agent you use. In my exp, even with a skill it doesn’t get it 100% accurate so it takes time to train your agent to apply correctly.
- **Legato895** (4↑): Maybe you could pull this off with extended collections. But it will start getting laggy.
- **Vegetable-Space6817** (2↑): So every color is a category color. Right. ☠️  
50 shades of grey.
- **Master_Editor_9575** (2↑): No one can answer your questions because design systems should be bespoke to the needs of their users. 

This is a pointless exercise that will either result in you heavily modifying every single time, or your clients getting a design system that doesn’t truly fit them by you having tried to standardize things in a vacuum.
  - **Simply-Curious_** (3↑): He's trying to rebuild SHADCN
- **eugene_simpleton** (2↑): Are you imagining that the 50+ brands will be mostly color-driven collections? Most applied DS are only using a small number of semantic colors for primary, secondary, and maybe a few other rarely applied tertiary colors. (aside from things like severity / status colors for success/warning/error, etc.)  
  
The number of combinations that you can actually use reliably with passable contrast ratios in a light dark mode that actually look good are going to be exhausted before you get to 50 brands. Other dimensions you might try are things like typography, spacing, along with color, but you might want to better define what you think anchors a "brand", otherwise you're just going to be play whack-a-mode on color combinations. 

I mean I guess it's possible, but I wouldn't start with the Figma mechanics first. I'd start with what kinds of Templates / Screens will built. If it's for enterprise-type applications that are heavy on tables, forms, and data visualization create a few designs and then ask yourself what would be "branded" - a logo and a handful of semantic color tokens? I think you'll find there will be fewer things to "brand" than maybe what you're imagining.

In any case, maybe work backwards and let some of the applied designs inform what needs to be in your brand rather than overly complicating everything upfront worried about the variable architecture.
- **NewYorkBourne** (2↑): UntitledUI - link to Claude MCP, and off you go.
  - **fxspeculator** (2↑): Can you elaborate how could I use Claude for that? Will he create screens with set components and variables?
    - **liketreefiddy** (3↑): Maybe if you ask him nicely and take him out to dinner. Flowers wouldn’t hurt.
    - **prollynotsure** (2↑): Hook it up to Figma console mcp and go to town.
    - **NewYorkBourne** (1↑): Apologies for delay...I responded to someone else in the comments, but here's how I use the UntitledUI design system between Figma and Claude...  
  
1. After the initial setup in Figma, you can duplicate the original project and rename to whatever you want in Figma - make sure it's the browser version so you can copy the URL in Claude.   
2. Once that's finished, you can start a project in Claude and link it to the brand guidelines and viz ID for the new project.  
3. Once that's done, run an initial query to make the initial updates to the system, which in my experience, includes the colors, fonts, logos, images, and general creative direction. *Note that this step can take a while and require a lot of approvals between Claude/Figma. There's probably a way to make this easier, but I like keeping an eye on the updates as they come through.*    
4. Ask claude to remove excess colors and styles   
  
That's it. I've done this for a few clients and I've been able to set their teams up with a workable system that they can scale. All up, this take about a half of a day to finalize and make client ready.
  - **Bubbly-Manner6843** (2↑): \+1 UntitledUI  
  
Pro tip: ask Claude to build a "Figma bridge" and it'll create a plugin you can open in Figma files so Claude can access everything MUCH faster. Better workflow than their rubbish MCP.
    - **NewYorkBourne** (1↑): I use the UntitledUI design system as the baseline system for all of my projects. You can re-style every element of the system to support your approved design. It also provides a pattern library for marketing and application based projects. Between Figma and Claude, I’m able to drive all of the modifications via prompt, and then do all of the custom design work in Figma quickly.
- **prollynotsure** (1↑): Extended collections for brands. Alts as modes, might be easier to manage in Token Studio if you want to add more dimensions to this. Still sounds like a nightmare regardless. Good luck.
- **samuelbroombyphotog** (1↑): I would recommend creating a baseline template for these, then using that template for individual files for each client. Have them be roughly consistent but there will be divergence inevitably and one brand’s divergence will piss down the chain and create complexity in every other brand. Multi-collections are fine if you are militantly strict, and even then, you’ll still be forced to create divergence outside of that.
  - **samuelbroombyphotog** (1↑): I tend to have three collections, colour (for primitives and tints), themes (semantic for sections/pages), and responsive (breakpoints). I’ve built an export tool that interprets that structure into a drop-in component system that extends beyond basic tokens (think scaled text, responsive line height, css classes etc), and that collection structure serves it really well
- **sheriffderek** (1↑): Your question amounts to “how to I design a design system” - which is just too big of a question for a comment to answer. 

What have you tried? How about you make a project with one component - and see how it goes? 

But the key here - is that you need to know which things are shared and which change. Is the typography the same across all 50? Is the general spacing the same? Are just a few icons and key brand colors changing? Start figuring it out and seeing what actually needs to be in the 50 brands. The less the better. And why do you really need them all represented in Figma anyway? Who is going to use that?
