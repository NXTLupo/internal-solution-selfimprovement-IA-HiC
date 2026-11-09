---
id: social-intelligence/reddit-deep/designsystems/1u2z8qq.md
url: "https://www.reddit.com/r/DesignSystems/comments/1u2z8qq/anyone_successfully_forcing_ai_agents_claude_code/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "Anyone successfully forcing AI agents (Claude Code, Cursor) to follow a central design system?"
author: "EntropyGoAway"
date: "2026-06-11T13:33:51.000Z"
score: 43
upvote_ratio: 0.98
num_comments: 28
flair: ""
extracted_at: "2026-09-10T17:19:04.796Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c0"
    char_span: [0, 1415]
    sentence_count: 15
    key_terms: [claude, design, project, designsystems, code, comments, central, agents]
    concepts: [claude, design, designsystems, project, comments]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c4", "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c6"]
    token_count: 322
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1u2z8qq/anyone_successfully_forcing_ai_agents_claude_code/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c1"
    char_span: [1430, 3668]
    sentence_count: 29
    key_terms: [instructions, validation, context, instead, design, reject, schema, probabilistic]
    concepts: [instructions, validation, probabilistic, context, instead]
    section: Comments
    token_count: 457
  - id: "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c2"
    char_span: [3670, 6074]
    sentence_count: 22
    key_terms: [validation, gate, component, model, registry, prompt, schema, system]
    concepts: [validation, component, model, registry, prompt]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c3"
    char_span: [6076, 8612]
    sentence_count: 26
    key_terms: [composition, gate, registry, standard, exactly, system, doing, props]
    concepts: [composition, registry, standard, exactly, system]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c4"
    char_span: [8614, 10834]
    sentence_count: 21
    key_terms: [design, system, components, claude, agent, token, repo, bit]
    concepts: [design, system, components, claude, agent]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c0", "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c6", "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c7"]
    section: Comments
    token_count: 509
  - id: "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c5"
    char_span: [10836, 12364]
    sentence_count: 11
    key_terms: [pattern, button, components, bit, patterns, "you're", component, versioned]
    concepts: [pattern, components, button, patterns, "you're"]
    section: Comments
    token_count: 337
  - id: "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c6"
    char_span: [12366, 14452]
    sentence_count: 15
    key_terms: [design, claude, system, agent, rules, new, work, component]
    concepts: [design, claude, system, agent, rules]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c0", "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c4", "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c7"]
    section: Comments
    token_count: 486
  - id: "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c7"
    char_span: [14454, 15601]
    sentence_count: 3
    key_terms: [design, ai-design-system-drift, https, blog, http, design-md-guide, system, use]
    concepts: [design, ai-design-system-drift, design-md-guide, https, system]
    related_chunks: ["social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c4", "social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c6"]
    section: Comments
    token_count: 301
---
# Anyone successfully forcing AI agents (Claude Code, Cursor) to follow a central design system?

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1u2z8qq/anyone_successfully_forcing_ai_agents_claude_code/)
Posted by **EntropyGoAway** · **43↑** · **28 comments**

Hey all,

Looking for real-world setups here. Our corporate design system and component library live in a central web project; that’s our absolute source of truth.

I want AI coding agents (specifically tools like Claude Code) to strictly stick to it. If I ask it to review a frontend PR or write a new feature, I need it to use our exact components and design tokens. Zero rogue CSS, zero custom hex codes, no weird margins.

The solution has to be portable. We have a bunch of separate repos, and I want to be able to drop a config or a script into any new project so the AI is instantly boxed into our design rules.

Standard prompt engineering or stuff like [`CLAUDE.md`](http://CLAUDE.md) feels way too fragile and prone to hallucinations as things scale.

How are you actually handling this? Are you auto-generating local JSON schemas/tokens for the AI to read? Setting up brutal linters that reject the AI's code if it tries to cheat? Or is there a cleaner way to hook an agent into a remote web project?

Appreciate any insights or workflows that save you from constantly babysitting the AI's CSS. Thanks!

## Comments

- **Brandon_Bell_Systems** (21↑): It’s the same problem I was dealing with and had to work through in real time at the application layer. But the good news is that the pattern transfers here too.

The real issue is that prompt-based rules are constraints without anything to anchor to. It feels like the AI can be bad at following instructions. But what I’ve learned overtime is how every session is a blank slate and the only thing holding it together is the context. The context can shift. When you use CLAUDE.md, that gives it instructions, but the instructions are probabilistic, meaning they hold until context shifts, you start a new session, or the model gets confused, balancing multiple tasks and objectives. In that balancing act, sometimes the design constraint ends up losing in the process.

What I learned through experience is that the fix needs to be structural, and that no prompt-level instruction would have the effect I wanted. What you’re describing is essentially what I ended up building which is a portable configuration that enforces design rules deterministically. I call it the Deterministic Core + Validation Gate. It works like this.

1. Extract your design tokens and component signatures into a machine-readable schema.JSON works fine. Every color, spacing value, component prop signature, and forbidden pattern is explicitly declared. This is your ground truth. It's a specification instead of just a prompt. It’s something the model can anchor to.

2. Generate a validation script from that schema. Before AI-generated code hits the repo, the script runs. It checks: hex codes that don't match tokens → reject. Margins outside the spacing scale → reject. Components not from the library → reject. This isn't an AI constraint. It's a build step that can’t hallucinate or reinterpret my intent.

3. The AI's job changes. Instead of "follow these rules" (probabilistic), the AI receives the schema and is told, "Your output will be validated against this. The validation is non-negotiable. If it fails, it gets rejected and you iterate." I call this giving the AI “operational accountability”. The AI is now operating from a fixed understanding of its role instead of just guessing what "correct" looks like.

Once I got it figured out it started working much better for me. I learned through trial and error how a prompt is just telling the model what it shouldn’t do more than anything. A validation gate tells the model that it’s structurally impossible to do that same thing. The prompt is just a request, but the gate was actually working as a gate that blocks the model from doing the things I don’t want it to.

I’ve been building this way for a while, but I finally published my Deterministic Core research and methodology about a week ago. If you’re interested, the link is in my bio.

TLDR:

The solution is to stop asking the AI to follow the rules. Give it a fixed standard, validate deterministically, and let the AI operate within boundaries it is not allowed to cross. 

Hope this helps.
  - **callmemrwolfe** (6↑): Yes. 💯 this. Thank you so much for taking the time to get this all in a post. Once you have this schema and validation you’ll have opened the door to so many more possibilities.
  - **spudulous** (1↑): This is a really nice, flexible system. But you’re only really sharing tokens between teams here at the atomic level. If you have a mature design system with molecules and organisms, like date pickers or functional tables, how do you stop the AI making their own versions of those and using the ones in the design system repo?
    - **Brandon_Bell_Systems** (1↑): Good question, and it is actually the same mechanism, just extended further up the stack.  
The schema doesn’t stop at tokens because it contains component signatures too. For something like a date picker, you declare the allowed component name, its prop interface, and valid usage patterns. Then the validation gate checks two things: is this component actually in your registry, and are the props being passed valid for it?

So when the AI generates code that tries to build its own date picker from scratch, the validation catches it. The gate looks at the file, sees a component name that isn't in the registry, and marks it as an unpermitted override pattern. The code fails validation and never even hits the repo.

You can also declare forbidden patterns explicitly right in the schema as a rule, like blocking any custom implementations of molecules or organisms that already exist in the registry. This is a hard gate that blocks the code from entering. It does more than a prompt asking the model to behave.

For functional tables, same logic. You define what a table component looks like in your system, what props it accepts, and what composition patterns are allowed. If the AI proposes a table implementation that isn't the registry version, or if it tries to pass props the registry table doesn't support, the check fails.

Even if the AI tries to bypass the registry entirely by dumping a raw, un-nested mess of inputs, hooks, and divs directly into a page file, the structural schema catches that too. You can enforce page-level composition rules that declare exactly which organisms are permitted to own form states. If a file contains loose input primitives outside of an approved organism layout, the gate triggers a structural mismatch.

The thing I learned is that most of this is already enforceable at the static analysis level. You do not need AI to validate AI. You just need a schema and a deterministic check. The gate is simply comparing what the AI produced against what you declared as valid. That comparison is computable and it does not drift.

Now, where it gets interesting is composition rules. If your design system says a date picker must always be wrapped in a form field organism with specific props, you can encode that as a dependency rule. Then if the AI generates a standalone date picker outside that pattern, the gate catches it. It is the same mechanism, but it’s checking structure instead of just checking presence.

The core insight stays the same: give the AI a fixed standard to anchor to, then validate against that standard deterministically before the output ever reaches your repo. The standard can cover tokens, components, composition patterns, or forbidden overrides. The gate scales because it is not doing inference. It’s just doing a comparison.

What you are describing about mature design systems is exactly where this becomes valuable. When you have real organisms being used across teams, you do not want one-off versions proliferating. The gate prevents that by making non-registry components structurally impossible to commit.
- **icorovi** (4↑): Doing exactly this (building in code Capsule UI, my own take on DS).  
  
Three things that actually work together (for my setup):

1. Make the system machine-readable. I have an ai-context/ folder with a token cheatsheet (Figma name → CSS var → Tailwind class), a component index, and a hard-rules.md with explicit constraints written for an LLM, not a human. This is the CLAUDE.md entry point, the agent reads it before touching anything.

2. Deterministic token pipeline. Figma variables → Token Studio → DTCG JSON → Style Dictionary → CSS custom properties. One command syncs design to code. The agent never sees hex values in components, only CSS variables it can look up.

3. Per-component spec files with a "Rules for Claude Code" section. Generic token docs aren't enough. Each component gets its own .md with numbered constraints that capture the non-obvious stuff: decisions that look wrong to an LLM but are correct per the design.

Linters on top to catch anything that slips through. The spec files live in one central repo, consuming repos reference them as a submodule. Drop in, done.

More upfront work than a prompt but so far it scales.
- **General-sentience** (6↑): This has been working great:

1) Use Claude Design (CD)  
2) Create design system in CD by pointing at repo containing design system components.   
3) Create project template in CD set up to reference #2 and for good measure keep your repo folder added to context when you talk to CD about your new project so that if need be it can dig back into repo if it failed to   capture entire design system fully as part of #2  
4) Just make sure to not have CD agent set to Haiku (oops! I’ve done this to my own detriment by accident)

Still sometimes need to remind it of some things, but 90% it does a good job.
  - **agilek** (2↑): Do you really have a design system or a visual styleguide?
- **joshkuttler** (3↑): Disclosure: I'm on the Bit team - biased, but this is the exact problem we built for.

CLAUDE.md fails at scale because it's a description of your design system, not the thing itself. The model drifts. Linters just react after the fact.

What works: make the AI read the real components. With Bit, your design system lives as versioned components on a central scope (your source of truth), and Bit runs an MCP server that Claude Code / Cursor connect to. The agent can then search for an existing component, read its real API + actual token values, and import it, instead of inventing colors and a random margin.

Portable by default: no per-repo config that rots. Point any repo's agent at the same MCP server + scope and it's instantly boxed into the same library.

The shift: instead of prompting the AI toward your system, you give it tools to consume it like a dev would: search, read, import.

[https://bit.cloud/](https://bit.cloud/)
  - **agilek** (3↑): Josh, can it follow established patterns above component level? Making sure button always looks like a button is easy. Hard part is making it work for large scale patterns across screen, apps or a different products in a consistent way.
    - **joshkuttler** (1↑): Great question, and you're right that's the actual hard part. Short answer: yes, because in Bit patterns are components too.

A button is a leaf. But a page layout, a dashboard shell, a "list + filters + detail" pattern, an onboarding flow - those are just higher-order components that compose the leaves. They get versioned and published to the central scope exactly the same way, so the agent reads and imports a DashboardLayout or EntityTablePage the same way it reads a Button. The consistency mechanism doesn't change as you go up the abstraction ladder - you're never asking the AI to reassemble the pattern from primitives, you're handing it the pattern as a unit.

For the cross-app / cross-product layer, Bit has scopes and platforms: a scope groups a domain's components, and a platform composes whole apps from them. So "every product's settings screen works the same way" becomes a shared composed component, not a convention you hope each team re-implements. When you change the pattern, every consumer sees it as a versioned update - not a manual re-copy.

So the rule of thumb: if a pattern is worth being consistent, make it a component. The AI then consumes structure the same way it consumes a button: search, read, import - at any scale.
- **magnakai** (2↑): Yeah. We have pretty exhaustive per-component docs. We provide those to the agent via an mcp server. Works pretty well, especially when also ingesting a design from Figma that is also using the design system. There’s a bit of info in a skill to help guide it along too. It’s very simple in practice, it’s just providing much more context on request to narrow the options substantially.
  - **agilek** (1↑): Do you also have larger parts than individual components documented (organisms, pages, flows..)? What’s your experience so far?
    - **magnakai** (2↑): I’m talking from the component library perspective. We do have some organisms, but we don’t own pages and flows.
- **violins-ontelevision** (2↑): Definitely - been doing it for a year now. It’s getting better and better…Claude design is not necessary although I am a designer so that makes the Claude code be great at design 😎

You make the system, json is good, explain the system and have your agent write the rules. Doesnt have to be json but used to be kindof the one best way. Then put it in a design rules markdown that lives in your project directory and everytime you iterate on a new feature or improvement you have to tell Claude code to follow it.

You may want to have a designer make you one ;) the same way I’d need to have my developer give me a walk thru of their important rules files I need to cite when I work so that my work doesn’t destroy their work.

Basically you’ve got prompt modulation where you’ll have certain things always in your prompt, to ground the agent, then add in the new feature stuff.
- **Expert-Stress-9190** (1↑): Not inherently, I have found that it will still break it even if you repeat it, add it to memory or claude md eventually. It might not do it the first iteration but 30+ in, its going to create some new styles you didnt ask for (even if you tell it not to do that)

Theres some audits on this if anyones interested comparing different tools i.e Figma Make vs Lovable and etc that gives better insight on how it breaks. 

[https://overlayqa.com/blog/ai-design-system-drift/](https://overlayqa.com/blog/ai-design-system-drift/)
- **cmeliak** (1↑): I know that it is probably not a solution directly for you, but we are using a tailwind where the config is an actual "design system" and when you simply tell the agent to use only allowed classes and does not use custom "tailwind classes", agent simply follow the rules.
- **jzdesign** (1↑): 3 things helped me a lot:  
1. have a map of ui components & tokens as [DESIGN.md](http://DESIGN.md) and include that in [CLAUDE.md](http://CLAUDE.md)

2. Every PR actually use Cladue code hook to update the [DESIGN.md](http://DESIGN.md)

3. If needed you can even implement custom lint to infuse error/warning when using design token out of system
- **drdinguswoah** (1↑): This design system tool can export your whole DS as a [DESIGN.md](http://DESIGN.md) file, here's the article about it [https://zaklad.app/blog/design-md-guide](https://zaklad.app/blog/design-md-guide)
