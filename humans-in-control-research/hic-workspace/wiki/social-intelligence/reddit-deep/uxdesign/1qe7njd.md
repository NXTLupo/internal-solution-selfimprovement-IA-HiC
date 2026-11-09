---
id: social-intelligence/reddit-deep/uxdesign/1qe7njd.md
url: "https://www.reddit.com/r/UXDesign/comments/1qe7njd/future_workflow_of_ui_ux_design/"
kind: "social-post"
source: "reddit-deep: r/uxdesign"
subreddit: "uxdesign"
title: "Future workflow of UI / UX design"
author: "Top-Calendar-7428"
date: "2026-01-16T05:41:02.000Z"
score: 0
upvote_ratio: 0.27
num_comments: 28
flair: "How do I… research, UI design, etc?"
extracted_at: "2026-09-10T17:19:34.951Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/uxdesign/1qe7njd.md#c0"
    char_span: [0, 1414]
    sentence_count: 7
    key_terms: [designers, coding, design, agents, become, output, observations, community]
    concepts: [designers, coding, design, observations, agents]
    token_count: 317
    sources: [{"n":"reddit-deep: r/uxdesign","u":"https://www.reddit.com/r/UXDesign/comments/1qe7njd/future_workflow_of_ui_ux_design/"}]
  - id: "social-intelligence/reddit-deep/uxdesign/1qe7njd.md#c1"
    char_span: [1429, 2206]
    sentence_count: 3
    key_terms: [design, use, materials, mootsg, cloud, figma, top-calendar-7428, alternatives]
    concepts: [design, materials, mootsg, cloud, figma]
    section: Comments
    token_count: 189
  - id: "social-intelligence/reddit-deep/uxdesign/1qe7njd.md#c2"
    char_span: [2208, 3617]
    sentence_count: 13
    key_terms: [design, because, addflo, cause, keep, less, sure, want]
    concepts: [design, because, addflo, cause]
    section: Comments
    token_count: 325
  - id: "social-intelligence/reddit-deep/uxdesign/1qe7njd.md#c3"
    char_span: [3619, 5389]
    sentence_count: 25
    key_terms: [browser, code, data, optimize, probably, already, because, missing]
    concepts: [browser, optimize, probably, already, because]
    section: Comments
    token_count: 417
---
# Future workflow of UI / UX design

Source: [reddit-deep: r/uxdesign](https://www.reddit.com/r/UXDesign/comments/1qe7njd/future_workflow_of_ui_ux_design/)
Posted by **Top-Calendar-7428** · **0↑** · **28 comments**

Hi folks - i have been vibe coding a few apps lately and i have been into product for last 10 years. lately, i have become quite curious how UI / UX design field will evolve with the rise of coding agents. Few observations first:

1. Getting started on a new feature / product has become easier than ever. Designers & PMs can now use prototyping to get a better feel of what's possible.
2. While vibe-coded output is generic design at first, designers with taste can steer the output into a more polished output
3. If designer can leverage coding agents, why can't they start raising PRs directly - eliminating dev handovers. (i know code quality is questionable today but may not be tomorrow).

With above observations, i have following questions for the community:

1. would cursor / claude code + a browser will become the new design tool for the designers? how important would precise edits (those difficult to do by prompts) be in future?
2. when and how often would designers want a canvas-view of their screens? why wouldn't using the actual prototype in browser be enough in most cases?
3. what roadblocks does the community see in designers actually raising PRs with help of coding agents?

## Comments

- **mootsg** (11↑): Regulated industries like mine (finance) still have trouble allowing staff to access cloud services. AI tools require designers to upload proprietary materials to servers in another country, with scant reassurance that these materials won’t be copied, repurposed, or straight up appear in some stranger’s design.

Fun as vibe coding is, I really don’t see AI going beyond design ideation.
  - **ponchofreedo** (3↑): This is a real concern and honestly have not seen enough people bring this up.
  - **Top-Calendar-7428** (1↑): so you don't use figma at your current company? if not, what do you use for design?
    - **mootsg** (1↑): It took a long time to get approval to use Figma: there are few viable alternatives, and the cloud is a mature technology. 

AI on the other hand is just 2 years old, yet the implications on IP and privacy are massive. It’s just not going to be any time soon.
- **Master_Ad1017** (7↑): LMFAO these AI hype really shows how clueless y’all about what design actually is aren’t you. Y’all like saying suddenly musicians left their instruments or at least their midi controller cause suno can basically make music for them. Or how writers stop writing in their own cause AI can write to them.
  - **addflo** (2↑): It will all circle back. All these fantasy use-cases are fun to play with, but the benefit is really small. What they do, though, is they keep hiding the real issues with the entire product process, leading to more of the same, but less supervised.
- **addflo** (2↑): 1. Maybe for figuring out what they want, more or less, because the main issue with most projects is clearing up specs and making sure the solution fits the users and market.
2. "Taste" has nothing to do with user needs. Divorcing yourself from empathy is what leads you to design a bunch of stuff and hope one sticks, father than lead research and determine how intentional decisions are.
3. Unlikely, because just as with design, there are nuances you wouldn't know are important. I would also want them to keep track of the bigger picture, and know where they can optimise. If we're talking about a POC, sure, draft away. Otherwise, let devs experiment.

Answers:
1. You're already working in the browser. The whole point of Figma was to have an OS independent tool, so they went the browser app route. The options of generating and exporting code are already very useful. Next step will probably be to link with APIs in dev mode, probably do some automation testing. But I don't see it happening too soon. 
1.1 Precise edits are essential, since that's what makes the difference between working code, and buggy code.
2. Every time. Your brain doesn't comprehend the idea of pages on a screen, not as it does with a physical book. A canvas helps you iterate very fast and keep track mentally of your progress.
2.1. Because a WYSIWYG is going to add an extra friction layer. You'll be switching from edit to preview so often it will become annoying. And instead of doing that, you'll just open up ankther browser oage with the live view to make sure the changes get implemented as you need them to be.
3. Very hard to review. Accountability. Logic errors. Security flaws. Missing to optimise for bottlenecks because LLMs don't understand context. Self-awareness of limits. Creating more work for developers than they save. Missing existing branches.

I could go on, but the LLMs are not good enough yet for me to prompt my way out of work 🙄
- **sabre35_** (2↑): Taste will ALWAYS be the differentiator.
  - **[deleted]** (1↑): The only thing is that UX is not a matter of taste, but a matter of data.
    - **sabre35_** (1↑): Hard disagree here. You can be data-informed but data doesn’t always paint the full picture. 

Goodhart’s Law. There’s a point where if you only optimize for data, you lose track of the human aspect of design.

It’s easy to optimize for metrics, it’s incredibly difficult to design a good experience.
