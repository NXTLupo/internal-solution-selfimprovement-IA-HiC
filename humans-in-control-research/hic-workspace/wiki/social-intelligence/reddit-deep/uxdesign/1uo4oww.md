---
id: social-intelligence/reddit-deep/uxdesign/1uo4oww.md
url: "https://www.reddit.com/r/UXDesign/comments/1uo4oww/how_did_you_actually_transition_from_figma_to/"
kind: "social-post"
source: "reddit-deep: r/uxdesign"
subreddit: "uxdesign"
title: "How did you actually transition from Figma to Claude for rapid prototyping?"
author: "treesandtheories"
date: "2026-07-05T15:14:24.000Z"
score: 90
upvote_ratio: 0.92
num_comments: 56
flair: "How do I… research, UI design, etc?"
extracted_at: "2026-09-10T17:19:34.960Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c0"
    char_span: [0, 1824]
    sentence_count: 22
    key_terms: [figma, claude, transition, prototype, prototyping, design, rapid, did]
    concepts: [figma, claude, transition, prototype, prototyping]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c1", "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c3", "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c6"]
    token_count: 400
    sources: [{"n":"reddit-deep: r/uxdesign","u":"https://www.reddit.com/r/UXDesign/comments/1uo4oww/how_did_you_actually_transition_from_figma_to/"}]
  - id: "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c1"
    char_span: [1839, 3478]
    sentence_count: 14
    key_terms: [figma, claude, design, cases, important, prototype, rebuild, winning]
    concepts: [figma, claude, design, cases, important]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c0", "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c3", "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c6"]
    section: Comments
    token_count: 403
  - id: "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c2"
    char_span: [3480, 4681]
    sentence_count: 8
    key_terms: [figma, html, plugin, use, components, jcoudriet, already, claude]
    concepts: [figma, plugin, components, jcoudriet, already]
    section: Comments
    token_count: 301
  - id: "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c3"
    char_span: [4683, 6760]
    sentence_count: 13
    key_terms: [testing, claude, figma, design, rounds, ortizdupri, ultimately, change]
    concepts: [testing, claude, figma, design, rounds]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c0", "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c1", "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c6"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c4"
    char_span: [6524, 6864]
    sentence_count: 1
    key_terms: [figma, ruskerdoo, applied, biggest, playing, started, testing, claude]
    concepts: [figma]
    section: Comments
    token_count: 89
  - id: "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c5"
    char_span: [6866, 8737]
    sentence_count: 15
    key_terms: [thecrazystupidgamer, claude, experimenting, components, realized, design, screen, tokens]
    concepts: [thecrazystupidgamer, experimenting, claude, components, realized]
    section: Comments
    token_count: 430
  - id: "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c6"
    char_span: [8739, 9602]
    sentence_count: 10
    key_terms: [figma, claude, use, starting, motion, point, mcp, treesandtheories]
    concepts: [figma, claude, starting, motion, point]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c0", "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c1", "social-intelligence/reddit-deep/uxdesign/1uo4oww.md#c3"]
    section: Comments
    token_count: 210
---
# How did you actually transition from Figma to Claude for rapid prototyping?

Source: [reddit-deep: r/uxdesign](https://www.reddit.com/r/UXDesign/comments/1uo4oww/how_did_you_actually_transition_from_figma_to/)
Posted by **treesandtheories** · **90↑** · **56 comments**

My company is starting to use Claude for rapid prototyping. We’re not replacing Figma completely. Figma will still be used for the design system, visual polish, and handoff. Right now we’re only talking about rapid prototyping, not AI-generated production code.

What I’m struggling with is the transition itself.  
I keep seeing people say things like “I don’t use Figma anymore” or “I prototype directly in Claude,” but I don’t really see anyone talk about what the first few weeks/months look like.

For example, let’s say I build a prototype in Claude, test it with users, iterate a few times, and by version 4 the big UX problems are already solved. At that point I’m probably faster polishing the UI in Figma because changing spacing, typography, colors, etc is just easier for me there. So what happens after that? Do you just do the final round of testing with a Figma prototype? Or do you somehow keep your Claude prototype updated with the polished Figma version? Or am I thinking about this the wrong way?

I’m also wondering what you prepared before making the transition. Did you create prompt templates first? Design principles (we’ve been wanting to do this for ages but somehow managed to go on without it. Is it finally the time it becomes mandatory?)? Documentation for your design system? Or did you just start using Claude and figure it out as you went?

Would love to hear from people who have actually gone through this transition. I’m interested in how your workflow changed and what surprised you the most. Thanks for your help!

## Comments

- **profesionalyconfused** (67↑): Claude is the sketch, Figma cleans it up. We used it for the first ugly version, then moved the winning flow back into Figma for edge cases, design system checks, and handoff so the team wasnt arguing over a throwaway prototype forever.
  - **sabre35_** (29↑): Find this to be backwards tbh. When you’re sketching, you want to be able to iterate spatially on a spread. Why limit yourself to just one viewport at a time. 

To me this process feels uninspiring and somewhat dreadful.
    - **Ruskerdoo** (16↑): You’re both right. 

In some cases, gen-AI is the better tool for rough explorations. For example, when statefulness is important. 

In other cases, Figma is better, when layout is important. 

Part of good design is knowing which tools to use for a given situation.
    - **MrFireWarden** (5↑): I think what is meant is that ideation and initial concepting can happen in Claude, then finalization can happen in Figma. 

Which seems logical .. but now that agents are in Figma, such a workflow doesn't really need Claude.
  - **treesandtheories** (3↑): How did you actually move the winning flow into Figma? Did you rebuild it manually, import it somehow, or use a plugin? I’m still trying to figure out how to do it efficiently
    - **fismortar** (7↑): I didn’t find a lot of success with the Figma mcp, it caused me more heartache than not. I actually just rebuild from the prototype using my own design system components from scratch. It’s not mega quick but it allows me to configure things properly and exactly like my eng team likes them without relying on an import to maybe do it right. 

At this stage of my career I can build in Figma at light speed if I’ve already solved the problems so it works for me as a team of 1.5.
  - **alsaltml** (2↑): this is the way
- **jcoudriet** (31↑): Claude is great for ideation and rapid prototyping, and Figma is great for detailing edge cases, refining the design, and team collaboration. Unless it's a 0-1 project, the prototype is a throwaway because it won't yet meet design-system and engineering standards. I use the Figma plugin to move the HTML into Figma. Things are rapidly changing, so we'll see how this flow ages. Also, the Figma Agent could be a way to transition the imported HTML to match components. It will take some human tuning.
  - **treesandtheories** (6↑): Thank you, this is really helpful! When you say you use a Figma plugin to move the HTML into Figma, are you referring to html.to.design plugin? And when you mention Figma Agent matching components, is it something you’ve already done?
    - **jcoudriet** (5↑): No worries, we're all finding our way :-)

There are so many out there, but here is the one from Figma that Claude, ChatGPT, and Kiro use to import prototypes. https://www.figma.com/downloads/chrome-extension/ 

I've used it for lots of mundane tasks (e.g., spacing X by on a straight line or exploration wireframes using DS). What is important is not to see it as taking the import and changing it, but using it as a reference for the agent to rebuild it. It's not 100%, but it gets you further.
  - **MrFireWarden** (3↑): That's exactly a thing we do. Sometimes, we'll pull patterns in from other apps we produce, or from competition, and have an agent convert them to our design system.
- **mgd09292007** (11↑): My company failed by trying to force us to ship code directly from Claude to engineering.  I pushed back hard on that because there needs to be a source of truth.  It was an ultimately a disaster.  I pushed for Claude design to do the concept validation for testing but Figma to be the source of truth.  Ultimately I was let go for it, but I maintain my position that AI is not there yet outside of rapid ideation and user testing of early concepts and that Figma still has it strong place
- **Azstace** (5↑): When the engineers say something can’t be done, Claude builds it in a minute and we send it over to them
- **OrtizDupri** (7↑): Not sure why you would need another round of testing after four (!!!) rounds - especially if you’re just cleaning up the design
  - **treesandtheories** (2↑): I don’t know, that’s what I’ve been doing my entire career. I just have to make sure that the final version is tested. I don’t wanna assume even little things like “of course this slight change of colors won’t change how the user will interact”, unless there’s time constraints. Do you not? But let’s say you only did 2 rounds of testing and then polished it in Figma, and somehow you thought you needed a final testing, would you build a prototype in Claude again?
    - **OrtizDupri** (1↑): That’s what the two rounds of testing are for? I mean I guess you could throw the Figma MCP at Claude and say “build this” (or use Figma Make) but feels like once the UX is locked in and you’ve applied your design system, there’s no more testing to be done
- **Ruskerdoo** (10↑): Your biggest enemy isn’t what you don’t know, it’s that you haven’t just jumped in and started playing yet. 

No amount of reddit comments will make you feel more prepared. Set some time aside and start experimenting. Keep your expectations low and take small bite sized steps. 

There genuinely isn’t a right way to use this stuff yet.
  - **multiclauding** (3↑): Yes — experimenting is key. Every bit of progress I’ve made with Claude Code has started with “let’s see what it can do with this…”. That’s how I realized it can crank out HTML artifacts to facilitate design reviews. That’s how I realized I could describe a problem and end on “Thoughts?” and it could brainstorm with me. Everything my stakeholders see is curated and refined by me — I’m still the designer. But now I have a small team of robot minions researching this, fleshing out IA alternatives, and putting together clickable prototypes so close to the production UI that the engineers have literally mistaken them for prod during refinement meetings.
- **Any_Owl2116** (3↑): Just jumped in, that’s it really. Tried making different UI, interactions, etc. many git hub repos and tools helped along the way but I found those out on accident. Take a transcript from a YouTube video you like and ask the llm to help you learn the way it’s taught.
- **TheCrazyStupidGamer** (2↑): To get closer to my thought of design, I create components and one screen that uses them all or most of them, then feed that data along with the tokens into claude for development. Works surprisingly well.
  - **treesandtheories** (1↑): How do you give the components and screen to Claude? Through MCP, screenshots, exported assets, or something else?
    - **TheCrazyStupidGamer** (1↑): Exports. That with the tokens that you can export with a plugin or copy from the dev tab does it for me.
- **sabre35_** (2↑): Copy the link to your Figma frame, tell it to start building the prototype, iterate from there. Connect your MCP first. 

Beats whatever trash is smart animate. Figma motion seems highly manual unless you’re doing intricate motion work.
  - **treesandtheories** (1↑): This is actually the workflow I’m trying to understand. How much do you usually have in Figma before handing it to Claude? Or are you talking about an iteration of an existing design?
    - **sabre35_** (1↑): I’ll have a set of screens that are like 80-100% the way there. Use them as the boilerplate starting point to iterate further in Claude. 

There is no “correct” process. You could throw in a messy wireframe and use that as a starting point if you wanted to. 

I just prefer to spit out all my ideas in Figma and pick the coolest ones to start prototyping in Claude.
- **Viridian_Rose** (2↑): Figma MCP. Use an IDE with Claude or another agent and connect to Figma MCP. Write back to Figma from your prototype
