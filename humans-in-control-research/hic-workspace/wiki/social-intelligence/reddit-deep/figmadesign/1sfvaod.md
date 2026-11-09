---
id: social-intelligence/reddit-deep/figmadesign/1sfvaod.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1sfvaod/how_to_handle_figma_right_in_2026/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "How to handle Figma right in 2026?!"
author: "Fred__erick"
date: "2026-04-08T14:59:02.000Z"
score: 32
upvote_ratio: 0.76
num_comments: 29
flair: "help"
extracted_at: "2026-09-10T17:19:11.235Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c0"
    char_span: [0, 2027]
    sentence_count: 8
    key_terms: [figma, design, claude-code-for-designers-32a519264d8e8014860ee41ca47b7b8a, claude, https, figmadesign, code, new]
    concepts: [figma, design, claude, figmadesign, components]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c1", "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c2", "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c4"]
    token_count: 513
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1sfvaod/how_to_handle_figma_right_in_2026/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c1"
    char_span: [2029, 3901]
    sentence_count: 15
    key_terms: [figma, change-opacity-on-a-referenced-color-variable-20641, claude, suggest-a-feature-11, components, forum, use, design]
    concepts: [change-opacity-on-a-referenced-color-variable-20641, figma, suggest-a-feature-11, components, claude]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c0", "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c2", "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c4"]
    section: Comments
    token_count: 472
  - id: "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c2"
    char_span: [3903, 5645]
    sentence_count: 18
    key_terms: [figma, code, components, design, use, makes, using, llm]
    concepts: [components, figma, design, makes, using]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c0", "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c1", "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c4"]
    section: Comments
    token_count: 432
  - id: "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c3"
    char_span: [5647, 7301]
    sentence_count: 9
    key_terms: [cursor, trying, figma, process, using, works, everything, sakhtaadmi]
    concepts: [cursor, trying, figma, process, everything]
    section: Comments
    token_count: 426
  - id: "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c4"
    char_span: [7303, 8699]
    sentence_count: 6
    key_terms: [figma, claude, design, code, tutorials, slightlysarcastic75, often, don]
    concepts: [figma, claude, design, tutorials, often]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c0", "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c1", "social-intelligence/reddit-deep/figmadesign/1sfvaod.md#c2"]
    section: Comments
    token_count: 336
---
# How to handle Figma right in 2026?!

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1sfvaod/how_to_handle_figma_right_in_2026/)
Posted by **Fred__erick** · **32↑** · **29 comments**

AI is becoming part of our everyday design tools – including Figma. I use **Figma Make** for quick inspiration and early ideas, but honestly, that's where it stops for me.

**The Problem with Figma Make**

Once you try to bring a generated design into Figma and actually work with it, things fall apart quickly:

* Auto Layout is missing on most containers
* Default font sizes are too small
* Not all effects transfer correctly
* Colors and components from design systems don't display properly
* You can only paste one design at a time into Figma

And real talk – does anyone actually know what the different models in Figma Make are each good for? The docs don't really explain it.



**Claude Code + Figma via MCP – Sounds Weird, But it Works**

The setup takes a bit of effort, but it's doable. Here's what I noticed:  
[Claude Code to MCP](https://band-spike-a6d.notion.site/Claude-Code-for-Designers-32a519264d8e8014860ee41ca47b7b8a)

* Designs come through pretty well – but almost always as frames, not components
* Prompting is tricky: it's hard to know what to write and what to reference
* If you switch between Figma tabs while Claude Code is running, it sometimes gets confused and mixes them up



**And Now This:**

Yesterday I came across two new things:

* AI Design System
* Figma Make Kits [Make kits](https://help.figma.com/hc/en-us/articles/39241689698839-Get-started-with-Make-kits#h_01KMNBSCFKKRCAY4DKZ8TRT415)

It feels like every single week a new AI feature or AI design solution drops. New possibilities everywhere – and honestly? I can't keep up anymore.

What I'd really love is **official best practices from Figma** – just show us how these tools are actually meant to be used.



**So after all this frustration – here's my real question:**

How are you currently handling:

* **A single component?**
* **A design system?**
* **A design based on an existing system?**
* **A completely new design?**

Are you using AI for any of this – and if so, how? Would love to hear your workflows.

## Comments

- **hemdrup** (19↑): I'm just fighting in the Figma feature request forum for ability to change the opacity of variables without having to disconnect them, which would save so much hassel. Plus, all basic CSS properties like RGBA, Oklch, Rem.

My request in the Figma forum.  
[https://forum.figma.com/suggest-a-feature-11/change-opacity-on-a-referenced-color-variable-20641?tid=20641&postid=196098#post196098](https://forum.figma.com/suggest-a-feature-11/change-opacity-on-a-referenced-color-variable-20641?tid=20641&postid=196098#post196098)
- **eugene_reznik** (5↑): The only way I use ai in Figma specifically is to write custom plugins to automate routine stuff. Or to override some default functions Figma has. But those are all local scripts for now, until I get into more complex stuff (I haven't yet). And thaaat's pretty much it. I tried Figma Make and it wasn't really that much useful for me.
- **AKBWFC** (5↑): Figma is a component library for me, I make them in there then get Claude to put them in a storybook.

I then just prompt Claude to use the components in storybook if I want an interactive prototype.

Or I ask it to use the Figma components if I want to make quick designs and variation. I’ll even sketch out a layout and annotate it and tell Claude to make this with the components from Figma.


One thing I will say is it can still get it wrong but start to use the annotations in Figma. They help a lot. And also stat writing strict rules as you got along, if Claude does something wrong…write a rule for it.
- **tommyohohoh** (10↑): I’m going through this right now actually. Here’s what I’m finding works really well: 

- The design system you built in AI? It’s dead. LLMs don’t know how to read it even after you convert them all to code. 
- Rebuild it using something like Shadcn. Have CC build a whole package including a guidelines file the LLMs can read to learn specific rules for your DS. 
- Here’s the biggest mental shift for me - components, as we thought about them in Figma, needs to shift to coded components. Those are your single source of truth. Use Storybook if you want to be able to browse them. But they live in code now. No more rigid variants. 
- I think using an LLM as an orchestrator in the middle is the place I want to be. Have it work on the canvas when it makes sense, work in the browser when it makes sense. So Figma, Paper, etc are your canvas, use the LLM to build the prototype, use LLM to keep them in sync and moving forward.
  - **ego-lv2** (4↑): Some Notes:
- Figma was never the design system. It’s a blueprint. AI is just helping non-dev designers catch up with the rest of us.

- Shadcn is the new Bootstrap. Using it and AI is shittifying the internet. It’s prevalent because  LLMs have been trained on it the most.

 - take yourtime learning this stuff. Your design fundamentals make you more valuable than a robot.
  - **Fred__erick** (1↑): I think this is what Make kits will do but  where to create the components? Only in Code In Figma and than code?
    - **CommanderCool2** (1↑): Depends where you currently are. Greenfield makes it possible to go directly to code after some design drafts. Brownfield probably has Figma components anyway so you have to move it to code.
- **jellyrolls** (2↑): I want to piggyback off of this thread and ask if anyone has found a good resource learn how to use Figma with Cursor? 

My company is all in on Cursor and I’m in the middle of trying to use it, but I feel so dumb right now as far as understanding what a good process looks like for these two products to work together.
  - **mikblaiz** (6↑): Try this github repo from southleft - https://github.com/southleft/figma-console-mcp 😉
    - **muloka** (1↑): This is the way
  - **sakhtaadmi** (2↑): I use it pretty much daily now. What questions do you have?
    - **jellyrolls** (2↑): I think I'm just getting a little overwhelmed. I started building a new project for my company using one of the free Shadcn libraries and used figma make to build my prototypes. It was messy, but we're moving fast and it works.

I just got approved for my ccursor license and trying to understand a good workflow. In the past I might grab what I can from a PRD, tell Claude to rewrite everything as a prompt for figma make,  and point it to my design system. The result were pretty damn accurate and I would be able to grab what works form Make, and pull it back into a figma file to iterate on, then repeat the process until I got everything dialed in. This might not be the best process, but it's what I've found works for me.

Now trying to do something similar with Cursor and I feel stuck.
  - **Fred__erick** (1↑): Thats one thing I was asking my self as well, if using something like this, is Cursor or Claude Code the best way?
    - **sakhtaadmi** (2↑): In my experience, cursor is a clear winner.
- **No_Drummer4801** (2↑): I am just now trying to learn Figma from zero, and I have not considered using AI to do it, I want to master at least the basics before I know what to ask for. 

It seems many of the tutorials are referencing versions of Figma that arrange the controls/tools differently. The 2026 issue I'm having is "where can I find tutorials that reference the current version?"
- **slightlysarcastic75** (2↑): Figma is becoming purely a component design platform for me now. It’s where I build my legos. Claude Code and Cursor are doing most of the heavy lifting of weaving them together. I haven’t designed a static frame in almost six months and don’t really want to ever again.
  - **Fred__erick** (1↑): Sounds nice, how did you structure your prompt and components and tokens?
- **harrisrichard** (2↑): same boat. figma make's output needs so much cleanup it's often faster to just design from scratch. the auto layout thing especially, 90% of my time is manually fixing what make generated

claude code + mcp is closer to useful imo but the context mixing between tabs is a real problem. i keep one figma window open per project now, helps a bit

honestly i've stopped trying to integrate every new figma ai feature the week it drops. let it bake for a month, see what sticks, then decide
  - **Fred__erick** (1↑): Right now, I often design a lot with Claude and the Figma skills, this is great.
- **StealthFocus** (-6↑): I don’t use Figma for design anymore it’s just an expensive InVision license now so my PMs can comment. I handle everything in Claude Code now.
