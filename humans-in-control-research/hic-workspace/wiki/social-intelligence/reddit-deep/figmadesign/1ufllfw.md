---
id: social-intelligence/reddit-deep/figmadesign/1ufllfw.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1ufllfw/moving_designs_between_claude_code/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Moving designs between Claude Code, Github/Production, Design Systems, and Figma... How are you managing it best?"
author: "hparamore"
date: "2026-06-25T20:29:24.000Z"
score: 25
upvote_ratio: 0.86
num_comments: 39
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.228Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c0"
    char_span: [0, 1681]
    sentence_count: 12
    key_terms: [figma, component, code, design, direction, claude, system, figmadesign]
    concepts: [figma, component, design, direction, claude]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c3", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c4", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c5"]
    token_count: 387
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1ufllfw/moving_designs_between_claude_code/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c1"
    char_span: [1696, 2679]
    sentence_count: 6
    key_terms: [file, components, context, product, prototypes, design, great, get]
    concepts: [components, context, product, prototypes, design]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c2", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c3", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c4", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c5"]
    section: Comments
    token_count: 226
  - id: "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c2"
    char_span: [2681, 4648]
    sentence_count: 13
    key_terms: [design, components, prototype, use, jfoulkes2001, get, something, anything]
    concepts: [design, components, prototype, jfoulkes2001, something]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c1", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c4", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c5"]
    section: Comments
    token_count: 493
  - id: "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c3"
    char_span: [4650, 6580]
    sentence_count: 17
    key_terms: [design, figma, code, designer, work, system, back, get]
    concepts: [design, figma, designer, system, prototypes]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c0", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c1", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c4", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c5"]
    section: Comments
    token_count: 451
  - id: "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c4"
    char_span: [6582, 8730]
    sentence_count: 25
    key_terms: [figma, design, storybook, claude, components, right, code, use]
    concepts: [figma, design, storybook, components, claude]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c0", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c1", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c2", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c3", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c5"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c5"
    char_span: [8732, 10507]
    sentence_count: 17
    key_terms: [design, claude, figma, system, text, components, sometimes, one-text-box-per-line]
    concepts: [design, claude, figma, system, components]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c0", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c1", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c2", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c3", "social-intelligence/reddit-deep/figmadesign/1ufllfw.md#c4"]
    section: Comments
    token_count: 429
---
# Moving designs between Claude Code, Github/Production, Design Systems, and Figma... How are you managing it best?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1ufllfw/moving_designs_between_claude_code/)
Posted by **hparamore** · **25↑** · **39 comments**

**Code → Figma: anyone gotten AI to rebuild a Figma file using actual component instances?**

Long-time Figma/design system person here. The forward direction is basically solved for me: I build the system in Figma, build the React/Compose version for devs and agents, then hand a design to Claude and it builds it—correctly swapping in matching components most of the time. \~80% right out of the gate, so I just polish the big stuff.

The **reverse** is where I keep hitting walls, and it's the direction I actually care about now. The reason: after you've been vibe coding for a while (\*Cough\* read: an over-zealous product manager...), the code drifts ahead of the design, and Figma stops being the source of truth. I want a clean way to pull those code changes *back* into Figma so the file reflects reality again.

Problem is, Figma's AI builds from links or screenshots but just redraws what it sees—it won't replace elements with real component instances. Clone a site from HTML and you get a button *drawn*, not the button *component*. So the rebuilt file looks right but is detached from the system, which defeats the whole point.

Has anyone found a workflow that gets the code → Figma direction to actually respect the component library? Even partial wins welcome.

*^((Disclosure, I used Claude to summarize my question because the original was about twice as long!))*

## Comments

- **JFoulkes2001** (28↑): What I’m struggling on is how people are getting good usable prototypes from ai, everything I get churned out is useless. Great for quick inspiration and wireframing but I cant get anything useful otherwise
  - **DanFlashes19** (6↑): I’ve created a bunch of context files - a product document that outlines the product and its features in great detail, a design.md file that has all of our base styles, and a components.md file that links to and explains what all of the components are. 

I then build prototypes with all of this context, usually pointing at a Figma file or artboard that I’m trying to prototype.
    - **Wooden_Talk6250** (1↑): This is basically what I do too. Mine's a bit more fragmented than yours. I have a product context file, a decisions file (things that are locked, things that aren't), and then component notes. The design.md / components.md split makes sense though, going to try keeping those separate rather than lumping them.

The bit I haven't solved: when the [components.md](http://components.md) gets out of sync with what's actually in the Figma file after a sprint. Do you update yours manually or have a process for that?
  - **Bram-D-Stoker** (2↑): Claude design is miles ahead of everything else. I think I will never get anything fully useful from it. But I can get something good from it.
    - **JFoulkes2001** (2↑): I’m actually yet to use it, my end goal was to get a working prototype react component, to use in framer. But it was so bad cost a lot of money :/ but I’ll definitely give it a go
    - **hparamore** (1↑): I use it for prototypes, full sites, apps, etc. Microapps? (artifacts that I build and use just for me)   
Its pretty awesome, but requires a bit of learning to be able to take it from what is generated into something that is both shippable, secure, and works.
    - **pickles_garden** (0↑): Did you build out your design system in the Design System feature within Claude Design? Just curious
  - **baummer** (-2↑): Define useless? What do you think a prototype is?
    - **JFoulkes2001** (1↑): Useless as in doesn’t do anything close to what I wanted. Not saying it’s impossible just saying I haven’t gotten it to work how I wanted. Maybe just offer advice instead of trying to be condescending…
- **hyruligan** (5↑): https://www.aidesign.guide/ is a pretty helpful resource as well as intodesignsystems they have some articles on there that were really helpful to read on how some of the top teams are rewriting their components to have AI best read it and give better output.
- **firerock31** (4↑): There’s really no clean way to maintain two sources of truth. My process is similar to yours, a mix of Figma and vibe‑coding. Once I’m about 70–80% of the way there, I shift from design to a coded prototype and basically iterate only in code from that point on. The coded experience is just more complete and can handle edge cases that static screens can’t.

But the one thing Figma still does way better is comment tracking. That’s not something you can easily replicate in a coded environment.
- **LunaticNik** (3↑): we play and ideate in figma, and everything else is code. design system deliverables are code. storybook mcp + claude to build out prototypes.
  - **hparamore** (1↑): yeah, I get that that is the proper workflow direction.   
I think I am trying to go for more of what Enigma2118 is mentioning above, which is building supports for the workflow that is changing, where anyone can pop in at any point, and then have their work, edits, etc go forward and backward. 

3 examples;  
1. Designer creates a new design. It gets passed to code, with all of the components all linked up. Devs are happy, designers are happy. etc. (normal)   
2. PM is working on a couple of prototypes. Since they don't really work day-to-day in Figma (plus it is "extra work") when he can just vibe code a prototype. This prototype needs to pull from the design system, saving him work, and allowing customers (and stakeholders) to 100% understand and get behind it. They create it, and now it is approved for design. The designer would then ideally take it back and "finish/rebuild it" in Figma, however there are some times where the designer.... is the one working in vibe code as well. Or at least took ownership of it and tweaked it. So now, I would like a way to more easily get the new designs back into Figma, since we still need a source of truth.   
3. Developers quite often need to build things that were forgotten in the design step. For example, maybe the designer missed a couple of the error states, or some of the edge cases. While they are building them, they need to use and draw from parts of the design system to just make it work. Now, it would be nice to be able to have those code updates and variants be able to somehow make it back into Figma, and have them be linked. 

Those are just a couple of thoughts. But the root cause is: If a designer jumps into a project, and works on the design system, the other points in this flow need updates. It is the same for when a PM or a Dev, or heck, even a over-zealous stakeholder or founder if it is a small business. They will always be jumping in and making/changing things. Getting their changes 1:1 back into figma, so that we can then start to iterate on them is the main priority.
- **cerebralvision** (3↑): Might need to go from Figma to Storybook to create actual components. Then, have your IDE/Claude pull your components from Storybook.
  - **LastFoal** (2↑): Does Storybook have a two-way sync with Figma components like Figma Code Connect does? Or is it a manual pull every time a component updates in Figma? This is highly important for us🥲.
    - **cerebralvision** (1↑): https://developers.figma.com/docs/code-connect/storybook/

https://storybook.js.org/docs/sharing/design-integrations
- **enigma2118** (2↑): What you are seeking is what I have been trying to iron out as well. I see conversations about Claude Design, and one way workflow. I want a cyclical workflow. Any person should be able to jump in at any surface. There’s the right tool for the right job for the right person. Use Claude in the product repo directly. Use Figma Make / V0 / Claude Design with an approximation of your DS (throw away code). Use canvas in Figma. You should be able to start anywhere and move on a circle with no loss in each transition (assuming you have a design system in Figma and in code that is 1:1).

I’ve wanted this since V0 first came out. It seems like everyone is finally circling in on this concept.

But Figma is the only one with a vested interest in keeping Figma as part of that cycle. I agree it should be. If you want fine design, and a design library you can return to to iterate. Figma (or similar canvas design tools) are still the correct tool.

V0 released today the ability to use you actual code design system in V0. That’s partway there.

Figma’s beta options right now seem closest to blending the surfaces and making the transition possible.

TLDR: no, haven’t found the answer yet, the industry itself hasn’t because everyone wants to keep you in their product. But I’m playing with Figma Beta. We will see.
- **NckyDC** (4↑): ai to figma is painful and uselsse. Even the text it renders line by line as sperate individual text boxes, cant even think its a pragraph as one text box. And its claude 4.8.  
I even tried fable when it was active and was shit.
  - **hparamore** (2↑): depends, but overall its not ideal.   
Have you tried using the actual MCP access? or any of the HTML to Figma plugins? they actually work pretty well, they just don't make it match up with the design system stuff. Just recreates it, though it generally does a better job that one-text-box-per-line thing that you mentioned above.
- **Oferlaor** (2↑): Try a Figma plugin called Buddy. It lets you import Claude design prototypes into Figma. It also knows design systems but probably this will need a second step to replace the design with ds components
- **Any_Owl2116** (1↑): Just ask them to read the code base in your GitHub repo or local repo
- **Duo_ikari** (1↑): So I’ve been doing this myself for around 2 weeks now. I basically created a coded version of my design system in Claude design. Then whenever someone does a prototype it will use the DS as a reference. 

I made it by uploading a local copy of my Figma design system. It also has a read me file in it that allows me to setup rules of use. 

So sad it’s been pretty good, but then I ask Claude design to make me a documentation website and it’s kinda fallen down from there. Sometimes it pulls through the Claude DS components but then sometimes it doesn’t. I heard they updated it recently to allow you to import the design system from Claude design into Claude code.
