---
id: social-intelligence/reddit-deep/figmadesign/1vmc7ac.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1vmc7ac/i_made_a_figma_plugin_mcp_that_lets_claude_build/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "I made a Figma plugin (+ MCP) that lets Claude build editable frames using your actual design system"
author: "Flashy-Alfalfa-9"
date: "2026-08-12T12:03:53.000Z"
score: 51
upvote_ratio: 0.9
num_comments: 13
flair: "resources"
extracted_at: "2026-09-10T17:19:11.233Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c0"
    char_span: [0, 1945]
    sentence_count: 1
    key_terms: [figma, editable, claude, design, frames, linter, figmadesign, mcp]
    concepts: [editable, figma, claude, design, frames]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c1", "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c2", "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c3"]
    token_count: 438
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1vmc7ac/i_made_a_figma_plugin_mcp_that_lets_claude_build/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c1"
    char_span: [1960, 3697]
    sentence_count: 6
    key_terms: [mcp, claude, official, figma, flashy-alfalfa-9, components, generates, checking]
    concepts: [claude, official, flashy-alfalfa-9, figma, components]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c0", "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c2", "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c3"]
    section: Comments
    token_count: 413
  - id: "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c2"
    char_span: [3699, 5518]
    sentence_count: 3
    key_terms: [checking, claude, calls, figma, like, mcp, mine, components]
    concepts: [checking, claude, calls, components, figma]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c0", "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c1", "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c3"]
    section: Comments
    token_count: 447
  - id: "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c3"
    char_span: [5520, 6842]
    sentence_count: 8
    key_terms: [claude, figma, figma-console-mcp, plugin, rules, mcp, hardcoded, southleft]
    concepts: [claude, figma-console-mcp, figma, plugin, rules]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c0", "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c1", "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c2"]
    section: Comments
    token_count: 291
  - id: "social-intelligence/reddit-deep/figmadesign/1vmc7ac.md#c4"
    char_span: [6844, 7653]
    sentence_count: 4
    key_terms: [flashy-alfalfa-9, browse, flaude, trying, https, able, app, been]
    concepts: [flashy-alfalfa-9, browse, flaude, trying, https]
    section: Comments
    token_count: 224
---
# I made a Figma plugin (+ MCP) that lets Claude build editable frames using your actual design system

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1vmc7ac/i_made_a_figma_plugin_mcp_that_lets_claude_build/)
Posted by **Flashy-Alfalfa-9** · **51↑** · **13 comments**

i’ve been testing almost every AI design tool that comes out, and the loop is always the exact same: you type a prompt, get a flat mockup image back, and then spend two hours rebuilding the whole thing by hand in figma anyway.

a png of a button is not a button. the AI gets to do the fun part and leaves you with the data entry.

so over the past few weeks i built a plugin and MCP that connects claude directly to your figma canvas. instead of generating flat images, it builds actual figma frames with auto layout, real text styles, and component mapping.

two technical things ended up being way more interesting than i expected:

1. **screenshot to editable layers:** you can paste a screenshot of a screen you like onto the canvas and have claude break it down into native, editable layers. to keep it from hallucinating spacing, i added a pixel-diff check where it compares its generated vector frame against the original image and adjusts padding/gaps until it aligns.
2. **a linter for AI laziness:** LLMs love taking lazy shortcuts in figma (like drawing fake icon vectors from scratch instead of using proper components, or hardcoding random text sizes). i had to write a custom linter that inspects the generated node tree and calls claude out when it cuts corners. watching it fail a linter check and clean up its own layer structure never gets old.

it’s been my daily driver for a few weeks now—mostly for taking real-world UI inspiration and instantly turning it into editable frames mapped to our design system components.

happy to answer anything about how it works under the hood, handling figma's node tree, or the MCP

## Comments

- **hollowgram** (16↑): Isnt this what the official Figma MCP enables already? What is the benefit of this vs that? Scant on info here.
  - **Flashy-Alfalfa-9** (3↑): fair, i was light on details in the post. wrote a longer comparison in the other comment, but the short version: the official mcp generates and trusts whatever claude made. mine generates and then distrusts it.

worth being clear that this isn't a prompt trick. you talk to claude, but the checking is actual software: a figma plugin that screenshots the build, a server that pixel-diffs it against the reference, and a structural linter with about 24 hardcoded rules (hand-drawn icons instead of components, fake avatar circles, text below contrast, wrong font sizes). claude can't talk its way past any of it. the screen is either under the diff threshold and lint-clean or it isn't done, and watching claude fail its own review and then fix itself is basically the product.

also matters that checking is call-hungry, 10 to 15 tool calls per screen, and the official mcp meters reads at 200/day. mine runs through a plugin so there's no meter to hit.
- **Chamezz92** (3↑): What are the main differences/benefits vs the native MCP from Figma that’s available in Claude code?

I used Sonnet earlier this week to build out 40 layouts (pages with desktop, tablet and mobile breakpoints).

They all used proper components, icons and auto-layout, without specifically asking for it.

I just invoked the figma MCP with UX/UI Pro Max and a pretty basic but detailed design brief.
  - **Flashy-Alfalfa-9** (-1↑): fair question, should've put this in the post.

honestly the official mcp is good, and for brief in, layouts out it clearly works, your 40 pages are proof of that.

i built mine for a different reason: i wanted claude to check its own work, and checking eats tool calls like crazy. my loop is build → screenshot → pixel-diff against a reference → structural lint (catches stuff like hand-drawn icons instead of components, grey circles pretending to be avatars, wrong font sizes) → fix → diff again. that's easily 10-15 calls per screen, and the official mcp meters reads at 200/day on pro. one screen of proper checking is 10% of your daily budget. writes are unmetered right now but that's a beta thing figma's said it goes usage-based later, and usage pricing is rough for exactly this kind of "iterate until it matches" workflow.

so mine runs through a regular figma plugin instead , no per-seat meter, flat sub. last night i let it rebuild three webflow templates alongisde others pages unattended  (screenshot attached) and it burned a few hundred calls checking itself. that run just isn't possible on a metered setup.

in short, theirs generates and trusts the output. mine generates, then distrusts the output until a pixel diff and a linter both pass. different jobs really.

curious about your 40 layouts though, did the components come from your own library or did it build them fresh?

https://preview.redd.it/gt84prrqfyih1.png?width=1658&format=png&auto=webp&s=84321a49317448b5b000f8a07d9f6eca8cf7d9b5
- **TheWarDoctor** (3↑): Been doing this with Console MCP for a while, not sure what the benefit to this
  - **Flashy-Alfalfa-9** (1↑): Heya, a longer explanation in my other comment as well, but overall the idea is that you never hit Figma API limits because it connects via our plugin. Second, it's not only prompt-based like a normal MCP setup where Claude just talks to Figma. In our case there's actual software between Claude and your file that checks the work.

Three pieces run on every build: the plugin executes the changes and screenshots the result, a server pixel-diffs that screenshot against your reference and computes a mismatch percentage, and a linter with about 24 hardcoded rules scans the actual layers for stuff like loose vectors that should be components, fake avatar circles, or wrong font sizes.

None of this is Claude grading itself. The verdict comes from code, and the screen can't be marked done until the diff is under threshold and the lint passes. So Claude builds, the software says "not done, 7 defects," Claude fixes, repeat. That loop burns 10 to 15 calls per screen, which is fine through a plugin but eats a metered API budget fast.
    - **TheWarDoctor** (1↑): Figma Console MCP runs locally with a bridge plugin, effectively giving you direct access to the canvas to do whatever. Figma MCP != Figma Console MCP. This bypasses any need to screenshotting. Use cases would be; use it to inventory tokens (or hardcoded places where they should have tokenized), take a coded component and have it build the Figma version, variants props and all, lint a design based on your design system rules so it's not claude grading itself, but against the DS rules. 

[https://github.com/southleft/figma-console-mcp](https://github.com/southleft/figma-console-mcp)

Not trying to rain on your parade and you're trying to fix real problems, there's just other ways to go about it that many of us have been using for some time now.
- **Positron-69** (1↑): can you share the mcp link?
  - **Flashy-Alfalfa-9** (1↑): [https://www.flaude.app/](https://www.flaude.app/) here you go! Also, you can copy-paste already existing -real- flows as editable layers into Figma, so make sure to browse through the Browse section as well.
- **Reptonstudio** (1↑): I really like this project, and I wanted to try it out, but the free plan did not let me create anything. Could you help me with that? I really do want to subscribe, but I have not been able to test it yet.
  - **Flashy-Alfalfa-9** (1↑): Hey! yes you need the active MCP link to be able to connect it with Claude  - send me a dm
