---
id: social-intelligence/reddit-deep/uxdesign/1s6miya.md
url: "https://www.reddit.com/r/UXDesign/comments/1s6miya/where_has_ai_actually_earned_a_place_in_your_ux/"
kind: "social-post"
source: "reddit-deep: r/uxdesign"
subreddit: "uxdesign"
title: "Where has AI actually earned a place in your UX workflow?"
author: "First-Bumblebee-9600"
date: "2026-03-29T05:18:53.000Z"
score: 12
upvote_ratio: 0.75
num_comments: 21
flair: "How do I… research, UI design, etc?"
extracted_at: "2026-09-10T17:19:34.951Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/uxdesign/1s6miya.md#c0"
    char_span: [0, 1012]
    sentence_count: 8
    key_terms: [using, stakeholder, synthesis, comments, thinking, uxdesign, workflow, curious]
    concepts: [using, stakeholder, synthesis, comments, thinking]
    token_count: 241
    sources: [{"n":"reddit-deep: r/uxdesign","u":"https://www.reddit.com/r/UXDesign/comments/1s6miya/where_has_ai_actually_earned_a_place_in_your_ux/"}]
  - id: "social-intelligence/reddit-deep/uxdesign/1s6miya.md#c1"
    char_span: [1027, 3052]
    sentence_count: 11
    key_terms: [use, interaction, requirement, too, everything, something, creating, original]
    concepts: [interaction, requirement, everything, something, creating]
    section: Comments
    token_count: 456
  - id: "social-intelligence/reddit-deep/uxdesign/1s6miya.md#c2"
    char_span: [3054, 4622]
    sentence_count: 10
    key_terms: [tokens, synthesis, through, higher, build, costs, model, notes]
    concepts: [tokens, synthesis, through, higher, build]
    section: Comments
    token_count: 355
  - id: "social-intelligence/reddit-deep/uxdesign/1s6miya.md#c3"
    char_span: [4624, 5696]
    sentence_count: 6
    key_terms: [research, components, getting, design, equal-armadillo4525, build, figma, final]
    concepts: [research, components, getting, design, build]
    section: Comments
    token_count: 252
---
# Where has AI actually earned a place in your UX workflow?

Source: [reddit-deep: r/uxdesign](https://www.reddit.com/r/UXDesign/comments/1s6miya/where_has_ai_actually_earned_a_place_in_your_ux/)
Posted by **First-Bumblebee-9600** · **12↑** · **21 comments**

I’m curious what people are actually using AI for in UX right now beyond the hype.

For me it’s been way more useful around the edges than in the actual core product thinking. I still do the real design work in Figma, but I’ve been using Claude for synthesis/writing and stuff like Runable or Gamma when I need to rough out stakeholder decks, quick concept directions, or internal docs faster.

What hasn’t really clicked for me yet is using AI for actual interaction design decisions. It can help me get unstuck, but I still don’t trust it with the thinking part.

So I’m curious, what has actually stayed in your workflow?

Research synthesis  
UX writing/content  
Flows/wireframes  
Stakeholder decks  
First-pass concepts  
Or not using it at all?

## Comments

- **Ancient-Range3442** (22↑): Anything where it can churn through a bunch of known stuff.

Anytime you try and get it to ‘think’ it’s pretty awful.

I feel like there’s lots of people getting these mixed up and put too much confidence into output of thing when asking it for decision making.
  - **Plyphon** (4↑): Analysing documentation is great.

Getting it to make first draft flows is awful
- **Davaeorn** (3↑): Sometimes I use Figma’s “replace text” function to populate a lot of real looking component data at once
- **mootsg** (7↑): All of the above. And this is only temporary; workflows themselves are being reviewed and redesigned _around_ AI.

I actually don’t see any way around this; sprinkling AI into existing processes here and there just isn’t the best use of AI or human resources.

[What hasn’t really clicked for me yet is using AI for actual interaction design decisions. It can help me get unstuck, but I still don’t trust it with the thinking part.]

What I do is isolate the requirement and feed it into AI. It cannot be too narrow (otherwise AI isn’t pulling its weight in coming up with something original), or too broad (AI will just give a generic suggestion) Depending on what the AI comes up with, I would design the interaction myself, especially if the requirement is already complex enough to stump me.
  - **reddotster** (3↑): LLMs can’t come up with something novel or original. The way they work is that they just endlessly remix everything in their training data based on whatever inputs you provide. So while what they output may be novel to you, it pretty much already exists somewhere in a way related to your inputs.
- **affalatoon** (6↑): Brainstorm features, UX writing, identifying edge cases,  creating mockups, flowcharts, documenting maps, mind maps, userflow charts, creating prototypes, and full stack development, i use it for everything except surveys, first click tests, card sorting and other research methods that require human input. I use it to draft documents for me.

Its all about promoting the right way, piece by piece through various tools. AI knows how to build, but doesn't know what to build. So, with guardrails it has substantially reduced my workload.
- **s8rlink** (2↑): Design system documentation, prototypes for user testing and some note synthesis — although I feel I still have the need to verify which slows things down and I might start comparing just taking my own notes after a call vs having to check Ai synthesis. 

But with the recent alude token consumption modification if it stays I will probably cancel my plan and just go back to my own processes. On Friday it went through some call transcriptions and I got the session limit message after that. So I’m not moving up to higher plans as this will be their way to get you to pay more and more. 

Once we have to pay for how much Ai really costs I think we’ll see the value isn’t there until we make nuclear fusion a reality or something like that
  - **reddotster** (3↑): Yeah, people see that the “cost of inference” is going down, and that’s true when you look at the cost of a specific model, like gpt 4, but newer models aren’t cheaper yet, they burn more tokens generating each response, and then we are now feeding them even more tokens with each input. So overall, our costs are higher. And the model providers are subsidizing tokens.
- **E-RA** (2↑): Mainly prototyping were I find it very helpful (mostly for vibe-coding more realistic flows). I have also tried it from time to time for summarizing research notes, but so far not to impressed by it. 

Recently I have found it quite nice for getting up initial drafts if creating something brand new. Mainly for getting over the blank canvas as it adds all the components needed, export it to Figma and then I can explore different directions etc.
- **HamlinHamlin_McTrill** (2↑): When you work at a place mature enough to have templates with your design system components, or have the AI tool synced to build from your DS, it’s amazing to prototype with or build full end to end flows that are like 80% there. It allows you to test and get alignment on solutions, then you can do final polish and design in Figma.
- **Equal-Armadillo4525** (1↑): Synthesizing user research.
- **usmannaeem** (1↑): Summarizing research.  
Categorizing research repo.
- **Shot-Print3497** (1↑): It formats my documentation. That's it. If I have to use it for anything else I'll probably fuck off to another job


Edit: in the interest of full transparency I'll say I also use it to generate realistic looking data for tables and such, and for placeholder text before final copy is established
