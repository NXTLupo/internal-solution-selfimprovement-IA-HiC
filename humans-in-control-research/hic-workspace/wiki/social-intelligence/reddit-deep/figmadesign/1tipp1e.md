---
id: social-intelligence/reddit-deep/figmadesign/1tipp1e.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1tipp1e/the_figma_design_agent_is_here/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "The Figma design agent is here"
author: "kekeagain"
date: "2026-05-20T15:49:05.000Z"
score: 166
upvote_ratio: 0.93
num_comments: 80
flair: "figma updates"
extracted_at: "2026-09-10T17:19:11.224Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1tipp1e.md#c0"
    char_span: [0, 1848]
    sentence_count: 2
    key_terms: [components, agent, the-figma-agent-is-here, design, figma, variables, comments, canvas]
    concepts: [components, the-figma-agent-is-here, agent, design, variables]
    token_count: 403
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1tipp1e/the_figma_design_agent_is_here/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1tipp1e.md#c1"
    char_span: [1863, 3635]
    sentence_count: 12
    key_terms: [figma, competitors, designing, steffenc7, variables, probably, design, screen]
    concepts: [figma, competitors, designing, steffenc7, variables]
    section: Comments
    token_count: 466
  - id: "social-intelligence/reddit-deep/figmadesign/1tipp1e.md#c2"
    char_span: [3637, 4166]
    sentence_count: 3
    key_terms: [clear-secretary-8185, components, eliminated, agressive, correctly, southleft, specially, breaking]
    section: Comments
    token_count: 128
  - id: "social-intelligence/reddit-deep/figmadesign/1tipp1e.md#c3"
    char_span: [4168, 6236]
    sentence_count: 16
    key_terms: [figma, mcp, southleft, agents, design, switch, bait, like]
    concepts: [figma, southleft, agents, design, switch]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1tipp1e.md#c4"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/figmadesign/1tipp1e.md#c4"
    char_span: [5985, 6748]
    sentence_count: 6
    key_terms: [different, claude, design, i-keeplosingaccounts, nothingevernevermore, figma, shame, fool]
    concepts: [different, claude, design, figma, shame]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1tipp1e.md#c3"]
    section: Comments
    token_count: 187
---
# The Figma design agent is here

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1tipp1e/the_figma_design_agent_is_here/)
Posted by **kekeagain** · **166↑** · **80 comments**

[https://www.figma.com/blog/the-figma-agent-is-here/](https://www.figma.com/blog/the-figma-agent-is-here/)

Looks pretty good, anyone use it yet?

\---

Claude summary:

* **Figma's design agent launched today** — it lives directly on the canvas and in the left rail, no separate setup required.
* **It's design-system-aware** — the agent has deep context on your components, tokens, variables, and standards, unlike third-party tools that lack that native access.
* **Key canvas interactions:** start a prompt from any design layer, run parallel prompts to explore multiple ideas simultaneously, and make manual edits while the agent iterates alongside you.
* **Explore directions faster** — generate multiple stylistic approaches or information architectures at once; steer outputs by `@`\-mentioning specific tokens, variables, or components.
* **Automate bulk busywork** — rename variables, swap components across screens, repeat padding changes across flows, populate frames with realistic content, convert screens to dark mode.
* **Design system maintenance** — bulk-update descriptions, tags, naming conventions, and auto-document components with all their states and variants.
* **Works with feedback** — summarize comments, identify themes, model stakeholder perspectives, distill long comment threads into action plans.
* **MCP server relationship:** the agent is for canvas work; the MCP server + `use_figma` is for moving work between code and Figma.
* **Currently in beta rollout** — no credits consumed during beta; AI credits apply at GA. Available for Full seat users on Professional, Organization, and Enterprise plans.

## Comments

- **FloatyFish** (32↑): I’ll be honest, I wasn’t expecting this. I was thinking they’d merge “old” Figma and Figma Make. Virtually all of their competitors who utilize the canvas don’t have a separate tab for coding, it’s all wrapped up in one. 

I’m so curious as to how much this will cost once the beta goes away. Probably won’t be cheap.
  - **Dusty43125** (4↑): Wonder if this will be the larger CONFIG announcement?
  - **RevolutionaryEbb4550** (2↑): It won’t be cheap, and it will be token-based. They already said free for beta, tokens once generally available.
  - **dmfornood** (2↑): probably expensive af. one query on claude's opus with figma mcp burns an entire session's credits with less than stellar results 

(i'm mediocre at prompting)
  - **Ancient-Range3442** (1↑): The competitors do it wrong
- **FENICH** (12↑): This is huge and I really, really hope it is good. Switching between Claude (or any AI) and Figma is annoying and it feels like I am much less productive.
- **Steffenc7** (29↑): I’ve used it. It’s alright for simple task like converting into dark mode or changing/saving values to variables etc.
For brainstorming/drafts and designing it’s still a little to meeh.

But including and understanding context from the rest of the file or DS is really neat
  - **Affectionate-Net3438** (2↑): What do you mean by "designing" when it's still meeh?
    - **Steffenc7** (2↑): I mean it’s not great for: design a screen that xx.

Looks to AI or so
- **Careless-Energy-3071** (6↑): This is exactly the kind of AI tool that makes more sense inside the design tool than bolted on from the outside. If it actually understands components, variables, naming, modes, and library rules, that’s much more useful than another “generate a pretty screen” demo.

I’d be cautious about judging it on net-new design quality. The real test is boring workflow stuff: can it clean up a messy file, apply a system change across 40 frames, document variants correctly, or make dark mode without breaking half the components. If it’s reliable there, it’ll earn its place pretty quickly.
- **3nrRed** (16↑): If this works well, they just eliminated the use of any figma mcp, specially the one from southleft
  - **Clear-Secretary-8185** (23↑): Depends on how agressive the token usage and limits are. 

'Free during beta' is the bait & switch/freemium trap they pulled with Make that caught a lot of people off-guard.
    - **Neighboor** (2↑): How is it a bait and switch if they tell us it’s bait and that it will switch later?
  - **skabob11** (2↑): I think the value of the outside MCP is that you can bring along so much more context from other places versus just trying to put it all into a single text box in Figma.
    - **3nrRed** (1↑): Absolutely! Should’ve been more specific on my first post. The iteration part and creating in Figma can be done hopefully by the new feature. But figma-to-code will still be done by an mcp like southleft MCP figma console.
  - **PuzzleheadedNeck1694** (1↑): It is important that the figma agents know the codebase as well. If they do not, southleft mcp or figma CLI are still the best options especially if you've build custom skills to do stuff. Also if you're using ai for other Workflows out of figma it's still a better option to use the external agents since you already pay the subscription for the LLM provider. Paying twice is a waste.
- **AssignmentDull5197** (14↑): This looks promising if it truly understands your design system context. The bulk ops (rename vars, swap components, dark mode) is where agents actually save time. Interested how it handles constraints. Related agent workflow notes: https://medium.com/conversational-ai-weekly
  - **3nrRed** (4↑): Yeah! Currently I use southleft mcp to achieve what you are mentioning. I create variables, manage them, create component sets, apply the tokenization and even do bulk component swaps. Pretty impressive
    - **hellogaurav_** (1↑): which claude plan do you use?
- **stackenblochen23** (4↑): How is the pricing model? Is it monetized via tokens, like additionally to a professional or enterprise plan?
- **Iscratchmybutt** (6↑): Claude Design killer
- **NothingEverNevermore** (5↑): I'm really excited about this. I like the hands-on feeling design software provides, but it's just mind-numbingly slow when you're iterating. If I want a whole section in a different layout I have to go through so many auto-layout settings. Sometimes it's just faster to tell it what you want. I'm hoping this solves that use case rather than hopping between Claude and Figma constantly.
- **i-keeplosingaccounts** (7↑): Fool me once with figma make, shame on you. Fool me twice with another feature that will be unusable as soon as I integrate it into my workflow, shame on me.
  - **jhtitus** (3↑): I’m holding a different hope here bc it’s Anthropic behind the wheel on this one.
