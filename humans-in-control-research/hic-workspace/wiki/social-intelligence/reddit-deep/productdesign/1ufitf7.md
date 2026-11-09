---
id: social-intelligence/reddit-deep/productdesign/1ufitf7.md
url: "https://www.reddit.com/r/productdesign/comments/1ufitf7/designers_would_you_actually_want_to_make_changes/"
kind: "social-post"
source: "reddit-deep: r/productdesign"
subreddit: "productdesign"
title: "Designers: would you actually want to make changes directly in the codebase via AI, instead of in Figma?"
author: "Trungks_Ousi"
date: "2026-06-25T18:46:46.000Z"
score: 3
upvote_ratio: 0.67
num_comments: 19
flair: ""
extracted_at: "2026-09-10T17:19:06.260Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/productdesign/1ufitf7.md#c0"
    char_span: [0, 1355]
    sentence_count: 14
    key_terms: [like, codebase, productdesign, want, comments, product, someone, canvas]
    concepts: [codebase, productdesign, comments, product, someone]
    token_count: 319
    sources: [{"n":"reddit-deep: r/productdesign","u":"https://www.reddit.com/r/productdesign/comments/1ufitf7/designers_would_you_actually_want_to_make_changes/"}]
  - id: "social-intelligence/reddit-deep/productdesign/1ufitf7.md#c1"
    char_span: [1370, 3537]
    sentence_count: 18
    key_terms: [code, claude, design, prototypes, engineers, codebase, use, nonote7867]
    concepts: [prototypes, claude, design, engineers, codebase]
    section: Comments
    token_count: 511
  - id: "social-intelligence/reddit-deep/productdesign/1ufitf7.md#c2"
    char_span: [3539, 5398]
    sentence_count: 19
    key_terms: [everything, figma, code, time, properly, getting, better, faster]
    concepts: [everything, figma, properly, getting, better]
    section: Comments
    token_count: 440
  - id: "social-intelligence/reddit-deep/productdesign/1ufitf7.md#c3"
    char_span: [5400, 6085]
    sentence_count: 10
    key_terms: ["don't", work, designers, right, get, lot, decisions, prompting]
    concepts: ["don't", designers, right]
    section: Comments
    token_count: 169
---
# Designers: would you actually want to make changes directly in the codebase via AI, instead of in Figma?

Source: [reddit-deep: r/productdesign](https://www.reddit.com/r/productdesign/comments/1ufitf7/designers_would_you_actually_want_to_make_changes/)
Posted by **Trungks_Ousi** · **3↑** · **19 comments**

Genuine question, because I keep seeing this workflow pitched as the future. The idea is you skip the whole Figma-handoff-to-dev loop entirely. You describe a change, or tweak something, an agent like Claude Code applies it straight to the real codebase, and you see it live in the actual product.  
On paper it kills the telephone game. No more opening the build and finding the dev shipped it 80% like your design. But it also drops you into a world of existing components, conventions, and constraints, where the thing fights back in ways a Figma canvas never does. You’re not on a blank canvas anymore. You’re in someone else’s house with someone else’s rules.  
So setting aside whether the AI is even capable of it yet, do you actually want to work this way? Is leaving the design tool and getting your hands in the codebase “freeing”? Or does it just turn you into a junior dev with extra steps?  
And if you’ve actually tried it on a real product, not a demo, I really want to hear it. Did it feel like power, or did it feel like a trap?

## Comments

- **abillionsuns** (5↑): People with cybersecurity skills are going to eat well for the next decade.
- **NoNote7867** (5↑): !@#$%^&*()_
  - **Trungks_Ousi** (0↑): So FE are now just code reviewers?
    - **NoNote7867** (3↑): !@#$%^&*()_
- **Ruskerdoo** (4↑): For small fixes, especially visual design adjustments, for sure! 

When preparing to hand off new features or functionality, I prefer handing off actual coded prototypes. When building those prototypes, it’s often easier to use the codebase as a starting point than building from scratch. But I never merge those prototypes back into the production codebase. The engineers only use them as a starting point. 

I still do a lot of design outside Claude Code, but when I do use CC, I like to have the codebase as an option.
- **laternerdz** (3↑): It depends a lot on whether the development environment and code is setup in a way that supports it. Also you’d have to be comfortable with git. You’d also need to know when to quit noodling in code and go back to the drawing board. You’d also need the right team communication and expectations to tell you how much leniency there is for experimentation on the process.

Its **not** an easy transition at scale at all. For examples of that, I’d look to Block or another large established design department, to see if they’ve published info on how successful they’ve been in closing the gap between design and code.

Part of what I love and hate about this practice, 20 years later, is that the tools and craft change often enough that there’s no standards. There are no rules.

And on your last question: I’m designing and claude coding a MacOS app from scratch for a side project, and so far so good. I think having experience coding and collaborating with engineers, knowing how to talk to engineers about the work, helps a ton too because the way im using claude code is as a developer agent.
- **mp-product-guy** (3↑): I don’t want the responsibility of managing production code. So no.
- **SuitableLeather** (2↑): I work this way now. Currently I only do UI and copy changes through Claude. They’re always reviewed by multiple check systems and an engineer. 

For more complex work — If everything works properly on local then I’d feel comfortable pushing to the code base. I think the main problem is that the expectations of output for the role will grow, but faster iteration is also expected. Can’t have both
- **KaleidoscopeProper67** (2↑): I’m doing it a lot. It’s great for certain aspects of the process, but not a replacement for everything. It works better for smaller updates, figuring out edge cases, prototyping interactions/animations, and QA. 

I still sketch on paper and use Figma for the broader explorations, big changes, flows and IA, etc. Basically whenever the challenge is to figure out what to do in the first place. 

But once I have a good sense of where I’m going, I’ll move into code to build it out and figure out the last set of details. This feels faster and better than spec’ing everything in Figma, handing it to an engineer, then chasing them down with QA asks.
- **hollowgram** (2↑): Framer 3.0 nails it in that you can do both. Imagine suggesting to video editor to edit just with prompts. Hah.
- **Ok-Theme-8256** (2↑): I have only basic knowledge of html and css so... Maybe with a proper course but I feel that as everything in this job I need to lean all by myself and I'm quite tired of it. I learn everyday with Claude but I've no time to do it properly. Also, it seems to me to lose focus on users. But maybe it's only the extreme hot in Paris that talk
- **Paris_dans_mes_reves** (2↑): Idk man, after Config I’m getting pretty excited to go back and forth between code and my ol’ reliable Figma canvas. Installed Xcode yesterday. 

That said, it’s a lot more work. The act of designing takes time. Getting it to function exactly right was rarely something we had time to do in prototypes - the rest gets described to highly capable FE engineers who can make it come to life. 

At least right now, prompting again and again to get something looking and working *just* right will be putting a lot more work on designers’ plates.
  - **Swimming_Anywhere_30** (2↑): It's a lot of work. The same amount of work I'd like to put into ideation rather than refining a mockup I could I done yesterday on figma. 

I don't know if that's just me. Im all for the AI game don't get me wrong. But I don't know if us designers, know what problem we are solving for apart from making the engineer life easier ... I'm yet to find an answer to that...

Wasn't our value always upstream? Close to the product decisions .  Design systems made creating mockups a peice of cake. So idk
