---
id: social-intelligence/reddit-deep/figmadesign/1thepzu.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1thepzu/spent_a_month_solving_the_problem_because_our_ai/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Spent a month solving the problem because our AI agent kept ignoring design tokens. How does your AI workflow look like?"
author: "Old-Wolf-2491"
date: "2026-05-19T06:44:39.000Z"
score: 4
upvote_ratio: 0.61
num_comments: 22
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.219Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1thepzu.md#c0"
    char_span: [0, 2006]
    sentence_count: 28
    key_terms: [tokens, problem, agent, figma, figmadesign, file, component, hardcoded]
    concepts: [tokens, problem, agent, figmadesign, figma]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1thepzu.md#c2"]
    token_count: 462
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1thepzu/spent_a_month_solving_the_problem_because_our_ai/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1thepzu.md#c1"
    char_span: [2021, 3599]
    sentence_count: 12
    key_terms: [danflashes19, tokens, markdown, design, information, code, file, spacing]
    concepts: [danflashes19, tokens, markdown, design, information]
    section: Comments
    token_count: 390
  - id: "social-intelligence/reddit-deep/figmadesign/1thepzu.md#c2"
    char_span: [3601, 5437]
    sentence_count: 13
    key_terms: [figma, plugin, tokens, agent, old-wolf-2491, use, hexcode, vast-broccoli-5862]
    concepts: [figma, plugin, tokens, old-wolf-2491, agent]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1thepzu.md#c0"]
    section: Comments
    token_count: 475
---
# Spent a month solving the problem because our AI agent kept ignoring design tokens. How does your AI workflow look like?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1thepzu/spent_a_month_solving_the_problem_because_our_ai/)
Posted by **Old-Wolf-2491** · **4↑** · **22 comments**

Not a rant. Just something I needed to get off my chest after living inside this problem for way too long.

We have a 24 member design-dev team. Tokens set up properly in Figma. color, spacing, typography, the whole thing. Semantic naming. Variable collections. Modes for light/dark. It looked clean.

Devs still hardcoded `#1A1A2E` directly in the stylesheet.

Every time.

I used to think it was a discipline problem. Turns out it was a visibility problem. The tokens existed, but nothing was *surfacing* them at the point where a AI agent actually needed them, when they're staring at a component trying to implement it.

The gap isn't that Ai agent don't care about tokens. It's that the handoff never made tokens the path of least resistance.

So I started building a tool to fix exactly that. Two months in. It:

* Audits components and flags which ones are actually bound to tokens vs hardcoded values
* Auto-generates specs per component including which token maps to which property
* Tells you the % of your file that's "tokenized" so you can actually track progress

The audit part was the most eye-opening. First time I ran it on our main file token coverage was just 34%. We thought we were at 80%+.

The next problem I'm trying to solve: getting those tokens out of Figma and into the formats AI agents can actually read. Not a JSON export no one reads. More like... the files that sit inside a dev's project and get consumed automatically.

Still working on it. Just curious if this resonates with anyone else.

**How tokenized is your Figma file, honestly? And do your devs / agent actually reference tokens during implementation or does that step just... not happen?**

## Comments

- **DanFlashes19** (7↑): Design.md file is your answer. It’s a standardized markdown file format that solves exactly what you’re saying
  - **Old-Wolf-2491** (1↑): Thanks u/DanFlashes19 Let me give a try. Any thoughts on how it communicates tokens to agent?
    - **DanFlashes19** (1↑): I’m not totally sure I understand the question. It’s a markdown file that lists the tokens and all of that in a format that agents can read effectively.
- **C0git0** (3↑): Our Figma files are 100% tokenized and we have a plugin that checks design docs for best practices. Literally every value is a token or variable. Color, spacing, text. 

On the code side. Lint for token use, don’t rely on an AI agent. Code tools have the same result every time and are designed to check stuff like hard coded colors.
- **Munnayi** (2↑): My recent [similar post](https://www.reddit.com/r/FigmaDesign/s/PxdEayCGJq) may have some feedback you find useful, I’m just in the process of defining a similarly fragmented ai context.
- **Timberlapse** (1↑): Just a pragmatic example, there are more than one way:

Export your tokens, even Screenshots are enough. Tell claude (other AIs are good,too. You create a markdown basically) to interview yourself to create a skill for Design system Work/component creation. 

Typically these involve:
- Tokens for color, spacing, etc(primary and semantic)
- target framework
- Layout information (grid,pattern,spacings,rhythm,etc)
- components examples and how they are built in Code 

And basically every information that's not explicit but adds value to the execution.

When you now use Figma MCP to draw from figma automaticlly, tell the AI to use that skill when coding components towards Storybook for example.
  - **Old-Wolf-2491** (2↑): What if agent infers to a different hexcode (from screenshot) than the actual hexcode in figma. (via MCP). which hexcode will it refer to? would it lead to hallucination?
    - **Timberlapse** (2↑): Set up a rule in the skill. You decide which Token is the important one. Something like "Always use tokens for colors and spacing. If the figma value don't match, refer to this skills Tokens.md" 

This can go deep. 

Also If things get more complex Take a look at Claude.md and hooks. But starting with a Skill and work yourself up would be my approach. 

Edit: some typos
- **c0no** (1↑): Just wondering, can you share the tool/plugin?
  - **Old-Wolf-2491** (1↑): Sure, [https://www.figma.com/community/plugin/1612756059828219731](https://www.figma.com/community/plugin/1612756059828219731)
- **stvn-pxl** (1↑): I just published a figma plugin which has an export function for the dev handover.. with that they can simply turn tokens into usable design tokens in code with a script.. hit me up if you want the plugin link..
- **Vast-Broccoli-5862** (1↑): Why would you need tool for this?
You can just ask agent to audit whole codebase to make sure there is no hardcoded hexcode.
Agent will give you same report of 34% with action items.
You can add custom instructions of such stuff in guidelines.md so agent always follows it.
Also agent can understand both .md file and .json.
So use whichever you want to use it to store your tokens.
  - **Old-Wolf-2491** (1↑): True u/Vast-Broccoli-5862 , I was more worried about claude token burn & its expenses here.  
Creating a tool resolved token costing issue as it works on a API call, does audit and returns response.
