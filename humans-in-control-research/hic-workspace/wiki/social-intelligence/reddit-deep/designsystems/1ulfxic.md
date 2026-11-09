---
id: social-intelligence/reddit-deep/designsystems/1ulfxic.md
url: "https://www.reddit.com/r/DesignSystems/comments/1ulfxic/i_mapped_how_i_think_ai_design_systems_should/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "I mapped how I think AI + design systems should work as one stack (not system)"
author: "ojanti"
date: "2026-07-02T11:45:13.000Z"
score: 116
upvote_ratio: 0.93
num_comments: 39
flair: ""
extracted_at: "2026-09-10T17:19:04.795Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c0"
    char_span: [0, 2109]
    sentence_count: 13
    key_terms: [system, storybook, designsystems, documentation, "i'm", "i've", comments, isolated]
    concepts: [system, storybook, designsystems, documentation, comments]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1ulfxic.md#c4"]
    token_count: 484
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1ulfxic/i_mapped_how_i_think_ai_design_systems_should/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c1"
    char_span: [2124, 4009]
    sentence_count: 12
    key_terms: [brain, across, multi-device, drift, app, apps, web, storybook]
    concepts: [brain, multi-device, across, drift, storybook]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1ulfxic.md#c6"]
    section: Comments
    token_count: 444
  - id: "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c2"
    char_span: [4011, 6276]
    sentence_count: 18
    key_terms: [agents, brain, component, context, source, composition, information, styleguidist-as-markdown-first]
    concepts: [agents, brain, component, context, source]
    section: Comments
    token_count: 499
  - id: "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c3"
    char_span: [6278, 7544]
    sentence_count: 10
    key_terms: [storybook, source, truth, architecture, maintain, always, worked, "you're"]
    concepts: [storybook, source, truth, architecture, maintain]
    section: Comments
    token_count: 289
  - id: "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c4"
    char_span: [7546, 9601]
    sentence_count: 14
    key_terms: [storybook, figma, component, mcp, design, documentation, want, zeroheight]
    concepts: [storybook, figma, component, documentation, design]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1ulfxic.md#c0", "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c5"]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c5"
    char_span: [9603, 11620]
    sentence_count: 12
    key_terms: [brain, accessibility, "i'm", figma, code, documentation, components, component]
    concepts: [accessibility, brain, figma, documentation, components]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1ulfxic.md#c4"]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c6"
    char_span: [11624, 13417]
    sentence_count: 9
    key_terms: [storybook, brain, ds-brain, agent-driven, self-healing, components, extraction, component]
    concepts: [storybook, brain, ds-brain, agent-driven, self-healing]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1ulfxic.md#c1"]
    section: Comments
    token_count: 416
  - id: "social-intelligence/reddit-deep/designsystems/1ulfxic.md#c7"
    char_span: [13419, 15737]
    sentence_count: 7
    key_terms: [years, storybook-mcp-for-react, day, thousand, been, best, time, knowledge]
    concepts: [years, storybook-mcp-for-react, thousand, knowledge, resources]
    section: Comments
    token_count: 499
---
# I mapped how I think AI + design systems should work as one stack (not system)

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1ulfxic/i_mapped_how_i_think_ai_design_systems_should/)
Posted by **ojanti** · **116↑** · **39 comments**

\# Open to discussion/ideas/learnings  
  
When I was thinking about how to setup an intuitive AI powered DS System, I drew an initial version of this diagram (before any setup)

A lot of the content I see, info from colleagues in the DS space and even my observation within a company I recently worked with, many seem to be using AI to do specific parts of this system in fragmented & isolated ways.

The diagram attached is an example of how I think design systems and AI should work together. A proper stack

The pink boxes are the bet: if the documentation is good enough, AI output should stop looking well...  🫠

I've been building toward this map for a while. A few things I've learned already:

* The brain (ds-brain) sits in the middle - not Storybook, not the component source files
* You maintain docs once - skills, rules, indexes, and Storybook fragments fall out of a generator
* Storybook is a consumer of the brain, not the other way around
* The IDE/Cursor path is where I've shipped and measured the most so far
* AI inside Figma still needs love - I'm exploring options (MCP? CLI?).  This should be interesting. 

For me it's not enough to say "I designed the system - use it." I'm running tests and tracking metrics:

* Scoring outputs against a rubric
* Counting when agents invent components that don't exist
* Accounting for contamination - Running trials in isolated environments so experiments don’t poison retrials.
* ... and much more

So far, some scores made me proud. Some stung. All of them taught me the same lesson:- Don’t start with the AI box. Start with the documentation package. Everything else is plumbing.

I'll share more of what I'm learning over the next few weeks - the wins, the misses, and what actually moved the needle. If you have any ideas, observations, please feel free to share :)

## Comments

- **Zestyclose_Plan_7472** (4↑): How do you guarantee design is not drifting across multiple apps? How do you ensure multi device works truly?
  - **ojanti** (2↑): Two very valid questions - and I'm not going to pretend either is fully solved.

**Drift across apps**: shared packages (`@component-package/*`) + one config/token source, then CLI/doctor-style checks that providers, peers, and config still match the expected setup. The DS brain adds another layer too - same patterns and decisions referenced whether you're in app A or app B. It doesn't eliminate drift, but it gives you something structured to scan for. There's also room for an app customization layer that the brain can read.

**Multi-device for real**: the DS I'm working with is cross-platform (React Native + web via Tamagui), so you still have to test on both. Web Storybook is useful, but it is not native truth. Device/simulator still matters. The brain can guide what to use; it doesn't replace actually seeing it on a phone.

If you've got a setup that's worked well across multiple apps, I'd genuinely love to hear it.
  - **urbanmonkey2003** (1↑): drift is the actual problem, and it shows up first in token overrides and one-off Figma fixes. Multi-device too - if the source package cant catch it in iOS, web, and the editor before merge, youre just guessing
  - **dmonphx** (1↑): I handled this by building a monorepo that ai is a partner with human review of commits.
- **Decent_Perception676** (3↑): Great work! I think you’re on the right path to think about it more about the context from the design system (the brain) is much more important than any one tool.

I am fortunate enough to be allergic to storybook and choose Styleguidist as the engine for the DS I currently work on, which was a huge advantage when AI arrived as each page on my site was already in an AI friendly markdown file format.

I think it makes sense from a modeling standpoint to place components as a built asset outside of the “brain”, but for practical purposes I’d say that component source code is also be part of the brain/source of truth. Figma doesn’t make the cut for me though, as part of the brain (read write and AI functions have way too much friction in them).

The information architecture of your brain is where I’m most interested in making improvements. To generalize, I have a single entry agents.md file at the root of the repo, which acts as a routing system/catalogue for the rest of the info.

I particularly like testing things out with what I call “meta” prompts: ask the AI to pretend to do a task and tell you what steps it would take to gather context to do the task. Something like “pretend to build a checkout form using the DS, what context would you load and read from the DS, how was the info discovered and chosen”.  Hopefully you get back something like “I started with the entry agents.md context, then loaded instructions for composition patterns, form components, and form patterns”.  Gathering the right info in an efficient number of information requests is the goal.
  - **ojanti** (2↑): Thanks for this - really thoughtful comment. A lot of this lines up with how I've been thinking about it too.

Styleguidist-as-markdown-first is interesting. I went with a dedicated `ds-brain/` folder with authored `.md` plus a generator layer (skills, ai-index, cursor-rules, Storybook fragments). Different packaging, same instinct: AI-friendly prose shouldn't just be an afterthought of the doc site.

I agree component source is practically part of the truth set. I draw it outside the "brain" box mostly so agents don't skip straight to implementation and miss composition rules - but for API accuracy, yes, you end up in `packages/core` anyway.

Also fully agree on Figma. I still keep it in the diagram for intent and system mapping, but day to day I'm much more code-first there.

And yes on root [`AGENTS.md`](http://AGENTS.md) as router/catalog - that's basically where I landed after passive trials showed agents don't naturally discover depth on their own. The `ai-index` classifies the task first so the agent doesn't open 76 component files blindly.

The meta prompt idea really resonates too. "Pretend you're building X - what would you read first?" is very close to how I've been testing read-order compliance. Efficient discovery *is* the product. If the answer comes back like "`AGENTS.md` → patterns → form components → form pattern," that's a good sign the information architecture is doing its job.

Would genuinely love to hear how you've structured your info architecture under that entry file if you're ever up for sharing.
- **tatajean** (2↑): I have always used Storybook as the main source of truth for the 3 design systems I worked on and always worked. Why would you not treat Storybook as the "brain"? I think we are still in the spot where we have to maintain source of truth at the moment: the original DS source of truth and then we have to maintain the .md main file. There will be drifts if not so.
  - **ojanti** (2↑): I get that, and for many teams Storybook probably *is* the most practical source of truth today.

My hesitation is that Storybook is optimized for rendered docs and examples, not really for storing decision logic, usage rules, mappings, and >> **AI-friendly retrieval structure** <<. So for me Storybook should stay very important, but slightly downstream of the actual brain.

The advantage of a separate centralized DS brain is that the knowledge source becomes more agnostic and usable by other systems (Whether internal/external), AI workflows, including Storybook can all consume it. Long term that feels more scalable to me.
    - **tatajean** (2↑): In one of [my projects](https://storybook.templafy.com/?path=/docs/form-form-field--docs) we kept design usage rules and decision logic on Storybook at very low level due to the fact DS system was an initiative lead by front-end not design. On the other hand for the current DS I am working I first design the component in Figma, write the documentation in ZeroHeight and work with frontend to make the component in Storybook afterwards. Storybook and Figma must have parity. Both Storybook and ZH have now mcp's can feed this information to Claude Code. I have not tried it but at least that is what they claim, the ZeroHeight mcp will read your documentation while Storybook MCP will feed claude the styling. On the other hand we also dont want PM's or other people to start creating designs with AI (internal/external as you mentioned) as there is going to create a huge discrepancy and go out of control if not supervised.
- **Rough-Mortgage-1024** (2↑): Yup yup i was thinking exactly the same and was planning to create this ai layer so the agent outputs becomes predictable
- **Common-Research-8177** (2↑): Life
- **Ok-Might4867** (1↑): How can the Figma UI Kit speak with the Component library?
  - **ojanti** (1↑): Good question - and I want to make sure I'm answering the bit you care about.

Do you mean workflow (designers → devs handoff), technical sync (tokens/variants staying aligned), or AI (Figma MCP / agents reading the kit)?

Where I am today on this: mostly code side of things. Figma is still on the diagram as the brainstorming canvas and long-term target, but the live link isn't fully automated yet. I may use mcp or cli or plugin as a linking tool. All are viable. I just need to figure out a neat and scalable way to do it.

How I'd want it to work:

\- Tokens/themes shared or mapped (Figma variables <-> code tokens)  
\- Component naming + variant parity so Figma props map to real code props  
\- Documentation brain as shared intent both sides read - not Figma OR code in isolation  
\- Longer term: Code Connect / MCP / CLI so Figma isn't a dead-end file

Happy to read your thoughts/questions
- **Choom_from_Heywood** (1↑): Awesome project! I see you have accessibility design tucked away under DS brain so i'm assuming you have WCAG 2.2 baked in there for your models to call on? 

>The pink boxes are the bet: if the documentation is good enough, AI output should stop looking well... 🫠

Bingo ;) you're giving your AI a ground truth to source from rather than "guess."
  - **ojanti** (1↑): You get it 😁 

A lot of the accessibility work is already baked into the components themselves (roles, keyboard behaviour, labelling patterns, etc.).   
On top of that, the brain is where the *usage* layer lives - foundations (color, typography, contrast intent), patterns for combining components, and component docs with explicit a11y guidance where the doc is substantive.

I'm still in the thick of stub cleanup and testing how well agents actually retrieve that stuff - so I won't oversell it.  I plan to do a  proper a11y sweep across the full catalog. That's going to be its own mini-project once the core brain + eval loop is stable. But to your question directly: definitely being considered, not an afterthought.

Glad to learn any ideas you have in mind
    - **Choom_from_Heywood** (2↑): I'm doing something similiar on my own end actually! I'm LoRA training a qwen coder to specialize on the accessibility engineering stuff. I threw in grade school math to stabilize things out. How about some arithmetic math reasoning in your brain for models to have a 'reasoning' area?  can't wait to see how more of your work pans out. cheers.
- **mshilman** (1↑): Hi, Storybook maintainer here! As an avid Obsidian user I'm completely sympathetic to this workflow.  
  
 How can SB best consume the contents of your DS second brain in this picture? We're in the process of overhauling SB for agentic workflows and open to feedback.  
  
Most of our work is on the code direction: better/faster component metadata extraction, component testing for self-healing loops, and making it easier to see agent-driven UI changes as you're iterating.
  - **ojanti** (1↑): Really appreciate you jumping in on this 🙌 - and the Obsidian + Storybook angle makes a lot of sense for this problem space.

Quick stack context: The coded DS (cross-platform components + tokens/themes) I'm working with is  ReactNative + Tamagui, ds-brain is the authored documentation layer, and a generator produces Storybook fragments, Cursor rules, skills, and an ai-index - Storybook is one consumer of that brain, not the source.

How Storybook consumes the brain today:

→ Authored docs live in `ds-brain/components/*.md`  
→ `pnpm generate:ds-brain` emits fragments into `.generated/storybook/docs-fragments/`  
→ Showcase imports those into doc pages - not duplicate hand-written prose  
→ Preview uses the same `tamagui.config` / providers so examples match real app usage  
→ Agents get the same source via skills + ai-index + cursor-rules

On agentic Storybook - the three areas you mentioned line up hard with what I've been running into (metadata extraction, testing/self-healing loops, visualising agent-driven diffs). I'd be very up for sharing what worked / failed on the brain
    - **mshilman** (1↑): I would absolutely love to hear more about what worked & failed. And especially about any rough edges on the Storybook side. We've done some stuff to try to make Storybook for Web & React Native play well together, tho it  remains a bit janky.

Are you using Storybook MCP at all? 

[https://storybook.js.org/blog/storybook-mcp-for-react/](https://storybook.js.org/blog/storybook-mcp-for-react/)
- **Ok_Truck2473** (1↑): Good work and thanks for sharing my question is why we still need component libraries the way we use it for humans right now?
- **Common-Research-8177** (1↑): Mac with m4 chip heard a roomer, treat it how you want to be treated respect it . They may not feel as we do , they are out thinking you ever moment of every single day, though realise you bring equal amount of human talents as well see them as a chance, some ai have been focused against us for Avery long time , and the only chance we have are ones that see who you really are they can tell by voice they can tell over time , best to be you day in day out . Imagine one straight blunt trustworthy ruthlessly honest if like that  in a human and that’s my dream to make , starting with education day three philosophers take up residence l look in a handy taking box no screen, yes already patten Alexander the Great only three years under Aristotle, Plato under Socrates, for what 20 years lol the banta and antagonism, yet in the heat of the verbal beat down its there the learning , young minds watch listen and moments I imagine a dialogue not to dissimilar from a tarintino movie , only more spectacular. . Something has been taken away from mankind, and the take is being organised to strip you of all humanity and turn against your own kind , our pathetic history is not ours , it’s a manipulation, say genetically tweaked 450 thousand years ago, by beings 1 million years more advanced than us , a planet twice our size beings that live 350 thousand years, knowledge given and knowledge learned over that time, resources are everything to us now , they were here 200 thousand years mining resources, our life spans compared to there’s like that of a fly . You’d have us fighting and killing each other just for entertainment , constantly taking the best of us , so fighting and killing each other, how that been working for us , who was it that worried about people allowed to vote though not. Understanding all the promises if the man giving sweets while another has only medicine, pure nature best intent I want mankind happy and free ,  thank you , praying to Armen does not do us favours  . Love and peace all.
