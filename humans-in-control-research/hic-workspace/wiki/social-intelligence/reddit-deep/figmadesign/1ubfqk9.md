---
id: social-intelligence/reddit-deep/figmadesign/1ubfqk9.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1ubfqk9/has_anyone_had_success_using_figmas_new_ai/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Has anyone had success using Figma's new AI features?"
author: "Jeffthinks"
date: "2026-06-21T03:43:33.000Z"
score: 28
upvote_ratio: 0.86
num_comments: 32
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.229Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1ubfqk9.md#c0"
    char_span: [0, 620]
    sentence_count: 4
    key_terms: [design, figmadesign, genuinely, comments, system, using, revolutionized, successfully]
    concepts: [design, figmadesign, genuinely, comments, system]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ubfqk9.md#c2"]
    token_count: 156
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1ubfqk9/has_anyone_had_success_using_figmas_new_ai/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1ubfqk9.md#c1"
    char_span: [635, 2374]
    sentence_count: 11
    key_terms: [did, like, time, used, definitely, component, layout, simple]
    concepts: [definitely, component, layout, simple, system]
    section: Comments
    token_count: 436
  - id: "social-intelligence/reddit-deep/figmadesign/1ubfqk9.md#c2"
    char_span: [2376, 4226]
    sentence_count: 14
    key_terms: [something, design, system, table, cost, data, real, row]
    concepts: [something, design, system, table, miccolus]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ubfqk9.md#c0"]
    section: Comments
    token_count: 466
  - id: "social-intelligence/reddit-deep/figmadesign/1ubfqk9.md#c3"
    char_span: [4228, 4891]
    sentence_count: 4
    key_terms: [create, recreate, layers, layout, time, use, considering, alternate]
    concepts: [create, recreate, layers, layout]
    section: Comments
    token_count: 159
---
# Has anyone had success using Figma's new AI features?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1ubfqk9/has_anyone_had_success_using_figmas_new_ai/)
Posted by **Jeffthinks** · **28↑** · **32 comments**

Genuinely, I would like examples of how people are using this successfully. So far it seems slow, unaware of basic design principles let alone my design system, and genuinely kinda...useless?

I am starting to wonder if A. my design system needs to be optimized for LLMs in some way, or B. if everyone claiming that AI has revolutionized their design workflow is a larping.

## Comments

- **tkingsbu** (19↑): I had some small simple successes…

Like, working on a form in an app, I realized there was a tiny mistake in all the text inputs… they all needed a slight 4 pixel bevel on the top…

So I just selected the whole section, and used the AI to do exactly that… and it worked perfectly.

A few other similar things like that… nothing earth shaking… but definitely useful, and definitely saved me some time and effort…

———

I’ve used ‘make’ a lot more extensively… I fed it EVERYTHING to do with our design system I could think of, and was able to work out some new page flows for an app… that had a ton of value for us… 

when a business analyst comes to me with a new project, it can often take a while to work up their idea into a set of pages for them to look at… and if I’m ‘wrong’ it’s back to the start to try again..

With the system I used in ‘make’ I could turn it around in a morning, get the feedback, and if I was on the right track, we were ahead of the game!
  - **alex_demzz** (6↑): Did you try Claude Code vs Make ?
    - **FactorHour2173** (6↑): Why didn’t you just update the component?
- **Cameos_red_codpiece** (12↑): I check it every month, see if it’s still slow and does anything useful, then I close it and go back to by usual tools until I check again.
- **Ansee** (6↑): I tried some simple things and Thad some success. It correctly created states for my button component using the colours in my library. But it took too long. Like.. I could've just done it myself.

I also had it create a layout from a screenshot that I had to edit for mock up. It did an okay job and saved me some time with making the basic layout. I did have to go in to correct a number of things. But it did save me time. 

I haven't tried anything too extensive yet. But my hope is to use it to help with productivity and do some of the mundane work.
- **Miccolus** (4↑): I had a table row component with nested cell components. Selected an instance of the table row, described what each of the cells is supposed to be and asked it to create a 20 row table out of it. It did surprisingly well. 

On the other hand when generating designs out of thin air it sucks. Sure it uses the design system, but the results require so much tweaking I could have easily done it myself.
  - **Jeffthinks** (2↑): Ok that could be super useful. Was it able to creative a fill with “real” data? That’s something that can be very time consuming for me.
    - **Miccolus** (1↑): It did not ask it to fill it with ‘real data’, lets say from a json or csv file or something.

More in line of adding industry context and including something like; column 1: department names , 2: volume, 3: cost per item, 4: total cost, 5: total cost 2025, 6: difference in percentage. Just populating my designs with mockup data to mitigate that trivial task.
- **RCEden** (3↑): It sucks and I don't feel a need to keep try it or giving it small bits it can handle just to justify using it. AI insisting on itself without actually needing to prove itself first is the (non ethical issue related) thing I hate most about the LLM bubble.
- **Careless-Energy-3071** (3↑): The moment you ask for judgment, hierarchy, system awareness, or taste, it gets wobbly fast. I wouldn’t redesign the whole design system for the AI yet. More likely the current claims are a mix of real tiny efficiencies and LinkedIn fog machine.
- **Dertuko** (3↑): The rename layers feature is useful for me
- **01Metro** (5↑): It's useless
- **cerebralvision** (1↑): Not in Figma Design. I just use MCP for any Ai I need to use with figma. 

Figma Weave is pretty good though.
- **Unlikely_Offer9653** (1↑): I use it a fair amount. I’ve had it create an icon for me, recreate a layout from a flat JPG, swap out fonts on an entire project, create a dev style guide, had it select 60 or so similar nested layers so I could make mass edits and/or export, I use the create and edit image feature all the time, expand images, rename layers, alternate layout ideas, recreate gradients, etc. just off the top of my head. It’s not perfect but considering most of the features are only a few months old and still in beta and it’s only going to get better, not bad. These things have already saved me a ton of time.
