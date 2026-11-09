---
id: social-intelligence/reddit-deep/figmadesign/1s2exku.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1s2exku/new_bridging_design_and_code_with_ai_agents_in/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "New: Bridging Design and Code with AI Agents in Figma"
author: "jahaganiev"
date: "2026-03-24T14:13:03.000Z"
score: 39
upvote_ratio: 0.83
num_comments: 41
flair: "feature release"
extracted_at: "2026-09-10T17:19:11.218Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1s2exku.md#c0"
    char_span: [0, 804]
    sentence_count: 3
    key_terms: [the-figma-canvas-is-now-open-to-agents, figma, agents, design, https, figmadesign, com, www]
    concepts: [the-figma-canvas-is-now-open-to-agents, figma, agents, design, figmadesign]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1s2exku.md#c2"]
    token_count: 195
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1s2exku/new_bridging_design_and_code_with_ai_agents_in/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1s2exku.md#c1"
    char_span: [819, 2755]
    sentence_count: 12
    key_terms: [code, use, claude, figma, already, prompt, get, pay]
    concepts: [claude, figma, already, prompt, something]
    section: Comments
    token_count: 438
  - id: "social-intelligence/reddit-deep/figmadesign/1s2exku.md#c2"
    char_span: [2757, 4525]
    sentence_count: 10
    key_terms: [figma, switch, https, com, eventually, design, coded, light]
    concepts: [figma, switch, eventually, https, design]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1s2exku.md#c0"]
    section: Comments
    token_count: 439
  - id: "social-intelligence/reddit-deep/figmadesign/1s2exku.md#c3"
    char_span: [4529, 5277]
    sentence_count: 6
    key_terms: [need, existing-geologist94, nousername0101010, get, like, paid, stackenblochen23, transparent]
    section: Comments
    token_count: 191
---
# New: Bridging Design and Code with AI Agents in Figma

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1s2exku/new_bridging_design_and_code_with_ai_agents_in/)
Posted by **jahaganiev** · **39↑** · **41 comments**

Figma has launched an open beta enabling AI agents to design directly on the canvas using a new Model Context Protocol (MCP) server, shifting the platform toward AI-human collaboration. This update allows agents to interact with native Figma elements, maintain design system consistency, and bridge development tools like Cursor and Claude Code with the canvas. You can read the full guide on the Figma help center.

[https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/)

## Comments

- **brycedriesenga** (18↑): Yeah, the charging for usage thing, I get for the remote version, but there should be nothing preventing the MCP from working all locally.
  - **FlakyCronut** (12↑): Next they’re going to charge manual design work per click.
- **FactorHour2173** (8↑): We can already use Anthropics new Claude Code and Claude Coworking agents features just released in research preview limited to paid Claude pro and max users running on MacOS to do this for us.

It works directly with your computer and uses “connectors” like Figma. And if a connector doesn’t exist, it can (with your permission) control your computer, and use it the same way you would.

No one is going to pay for this Figma feature if they’re already paying for something like Claude code or GirHub Copilot.

Figma is consistently putting the cart before the horse trying to get ahead of a rapidly evolving AI that is slowly swallowing it whole.
- **Clear-Secretary-8185** (18↑): Figma are shooting themselves in the foot by charging for this. It's an opportunity to use agents to get over some of the grindier parts of the design process, but they expect people to pay to use 3rd party tools to overcome Figma's bottlenecks? Doesn't wash.

Also if people are designing with an AI (probably one they're already paying for) why would they pay extra when they can go straight from prompt to code? To generate designs they won't use?
  - **Aindorf_** (18↑): I think there are currently issues with the prompt to code approach a lot of designers really can't stand. Being able to go back and forth from canvas to code would be great, because I for one would rather click on an object and make a minor change rather than write a detailed prompt and consume tokens to so something that should just be a few clicks. Prompting sucks. It may be more efficient than doing a large complex task manually, but it is way worse than just making simple fixes manually. 

If I need to turn a light switch off, I don't want to describe to a robot where the switch is, which switch I want it to act upon and what the position of that switch would be. I'd rather get up and turn the light switch off. This could allow for the best of both worlds. Prompt complex tasks, manually complete basic ones.
    - **brycedriesenga** (2↑): I do like Figma adding this, but there are some tools helping to address those issues as well. Cursor's Design Sidebar is an example or Agentation's Layout Mode. 

https://cursor.com/docs/agent/tools/browser#design-sidebar
https://www.agentation.com/blog/layout-mode
- **mnizinski** (9↑): There is a plugin called Figma bridge that does this at no cost. Been using it for a week and it’s game changing.
- **Due_Bandicoot_4903** (10↑): Neat, but if that is going to be a similar shit show as it has been with figma make credits its gonna be a big fail: 

*"We're quickly improving how Figma supports AI agents. This will eventually be a usage-based paid feature, but is currently available for free during the beta period."*
- **captain-j** (3↑): How is this different to [Figma Console MCP](https://docs.figma-console-mcp.southleft.com/) (free third-party read/write to canvas)? Other than having to pay for it eventually 🙄
  - **FlakyCronut** (2↑): I won’t be surprised if Figma starts heavily limiting API access tokens
- **Raii44** (3↑): Could someone explain this update in simple, the video is from Figma is super confusing
  - **jahaganiev** (2↑): Now you may bring your coded pages into Figma applying existing Figma Design System. Previously, it was impossible to do that.  
  
It's still beta and might not be perfect, requires some testing and see how accurately it can convert coded pages into Figma.  
  
Hope that helps!
    - **Raii44** (1↑): What's the use of it? our Devs are barely managing to develop existing mocks
- **nousername0101010** (2↑): Tried this, works like shit!
- **stackenblochen23** (1↑): What does „a paid API“ mean exactly? Do we need to be on a paid plan (like read write variables)? It’s a great next step they offer here and enabling this directly in figma without any need for third party software is huge. But they need to be transparent on their pricing.
- **Existing-Geologist94** (1↑): I lost 2 hours trying to get Cursor to build an example dashboard using my design system. Either the output is unusable, or I’m doing something wrong. I’d burn through a ton of credits and patience just to get it to an acceptable level…
