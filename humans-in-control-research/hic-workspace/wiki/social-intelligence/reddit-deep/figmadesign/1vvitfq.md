---
id: social-intelligence/reddit-deep/figmadesign/1vvitfq.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1vvitfq/how_is_figma_ai_agent_actually_working_for_you/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "How is Figma AI Agent actually working for you?"
author: "sadafxkhan"
date: "2026-08-22T17:44:35.000Z"
score: 40
upvote_ratio: 0.82
num_comments: 35
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.227Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1vvitfq.md#c0"
    char_span: [0, 1764]
    sentence_count: 14
    key_terms: [agent, figma, design, using, workflow, system, created, claude]
    concepts: [agent, figma, design, using, workflow]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vvitfq.md#c1"]
    token_count: 400
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1vvitfq/how_is_figma_ai_agent_actually_working_for_you/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1vvitfq.md#c1"
    char_span: [1779, 3836]
    sentence_count: 13
    key_terms: [figma, sadafxkhan, tasks, agent, functioning, time, use, repetitive]
    concepts: [figma, sadafxkhan, tasks, functioning, agent]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vvitfq.md#c0"]
    section: Comments
    token_count: 502
  - id: "social-intelligence/reddit-deep/figmadesign/1vvitfq.md#c2"
    char_span: [3838, 4985]
    sentence_count: 7
    key_terms: [don, use, sadafxkhan, regularly, helping, been, work, extraordinarily]
    concepts: [sadafxkhan, regularly, helping]
    section: Comments
    token_count: 306
---
# How is Figma AI Agent actually working for you?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1vvitfq/how_is_figma_ai_agent_actually_working_for_you/)
Posted by **sadafxkhan** · **40↑** · **35 comments**

I’ve been using the Figma AI Agent for quite a while now, to the point that I’ve basically stopped using Make for the last couple of months.

Since the Figma Agent came out, I’ve been doing a lot of my workflow directly through it. I’ve also created a few custom skills that run within the Figma Agent itself.

The biggest thing for me has been connecting my design system. At this point, I’d say the Agent gets around 60% of the job done when it comes to connecting elements to my existing design system. I’ve also created skills that go back and check whether anything is missing from the design system, which has made the workflow much more useful.

Honestly, I feel like it’s doing a better job for my workflow than Claude right now. That said, I haven’t used Claude Design extensively enough to make a completely fair comparison.

So I’m curious how everyone else is using Figma Agent:

* Are you actually using it in your day-to-day UX/design workflow?
* How well is it working with your design system?
* Have you created custom skills for it?
* Do you prefer it over Claude Design, or are you thinking of switching?
* Do you see yourself using Figma Agent more in the future?

Also, since Config 2026, I feel like Figma has actually done a few things really well. I haven’t tried Motion yet, so I’d love to hear about that too.

What features or workflows do you think Figma is particularly strong at right now?

Would love to hear how other designers are using the Agent in real projects rather than just demos.

## Comments

- **Formal_Reputation_50** (27↑): Agent has been a toss up. 

Sometimes it performs well with repetitive tasks, but not with the thoroughness or quality I’m looking for. 

Figma MCP with a good model has proven to be more reliable for me.
  - **sadafxkhan** (2↑): I think it is true for all agents and AI tools out there. But I am thinkjng do some AB testing with MCP + claude and Figma agents  with same prompt.
- **thedoommerchant** (6↑): Just began stress testing it this week with our design system to do simple tasks. Sometimes it just works and it’s glorious at handling grunt work or repetitive tasks of creating breakpoint frame variants, or updating tables or forms. I did find it breaking things unrelated to what I was asking it to do, which has me hesitant to be too reliant on it. Next week I’m going to try and use it to generate some concepts for a more ambiguous flow I’m working through. 

So my initial impression is that it’s not useless, but it hasn’t gained my truest just yet. Plus it can take a while to spin up and do basic tasks, which IMO won’t be worth the token spend when limits are enforced.
  - **sadafxkhan** (-2↑): It does, time to time, replace my primary button to add some zazziness to it, for that I run a skill. Maybe try that.
- **Oak65** (9↑): I use it to power any variable based system entirely no I've stopped manually creating and linking tokens which has been a huge time saver. Also anytime a project hits a deadend, usually because of a lack of features from Figma I use agent to build me that feature and it's making my company alot money.
  - **sadafxkhan** (3↑): By building feature, you mean plugin?
    - **Oak65** (7↑): Yeh the Figma plugin agent . Example, making a tif exporter and importer with layers that become smart objects in Photoshop. Actually Photoshop functioning export from Figma with fully functioning layers at starting resolution, custom arrangement tools and a bunch of stuff
- **pucelles** (8↑): \> Announcing a new AI Tool

\> we’re so done

\> Never mind it’s shit

\> we’re so back 

\> repeat
- **hamdelivery** (3↑): I use it pretty regularly. I don’t / don’t want to use it to make stuff from scratch but it does a ton of the annoying grunt work for me extraordinarily well.
- **mazdacxfive** (3↑): While I don’t expect it to be perfect (yet) I’m happy with the overall direction. It’s saving me a lot of time.
- **sandwichlounge** (3↑): I’ve been using it to animate UI for demos and marketing purposes. It’s been awesome.
- **not_larrie** (6↑): Extremly inconsistent but there are certain tasks I love it for such as creating a large list of variants in a component for example.
  - **sadafxkhan** (1↑): A good one!
- **infinitejesting** (2↑): I don’t design with it, but the skills are kinda helpful for quick advice. It also can fix stuff like linting, getting rid of legacy connections, or helping me build modes for weird stuff. So basically just helping me use basic Figma functionality to work around bugs or my ignorance.
- **Gh0st_Pirate_LeChuck** (6↑): I don’t know how others use it regularly. I went through all my credits just making a hamburger menu.
  - **sadafxkhan** (14↑): It’s in beta mode, it’s free for now.
