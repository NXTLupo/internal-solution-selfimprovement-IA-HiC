---
id: social-intelligence/reddit-deep/figmadesign/1uiyjbd.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1uiyjbd/i_built_an_opensource_alternative_to_figmas/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "I built an open-source alternative to Figma's official MCP server"
author: "Strong_District_9922"
date: "2026-06-29T17:10:41.000Z"
score: 28
upvote_ratio: 0.82
num_comments: 23
flair: "resources"
extracted_at: "2026-09-10T17:19:11.233Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1uiyjbd.md#c0"
    char_span: [0, 2265]
    sentence_count: 18
    key_terms: [figwright, official, mcp, server, code, requests, project, limits]
    concepts: [figwright, official, server, requests, project]
    token_count: 497
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1uiyjbd/i_built_an_opensource_alternative_to_figmas/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1uiyjbd.md#c1"
    char_span: [2267, 2361]
    sentence_count: 1
    key_terms: [github, awdr74100, figwright, https, com]
    concepts: [github, awdr74100, figwright, https]
    token_count: 31
  - id: "social-intelligence/reddit-deep/figmadesign/1uiyjbd.md#c2"
    char_span: [2376, 4373]
    sentence_count: 13
    key_terms: [figwright, mcp, claude, design, figma, code, "it's", need]
    concepts: [figwright, claude, design, figma, mcpservers]
    section: Comments
    token_count: 495
  - id: "social-intelligence/reddit-deep/figmadesign/1uiyjbd.md#c3"
    char_span: [4375, 6408]
    sentence_count: 9
    key_terms: [figma, plugin, server, "it's", local, canvas, remote, mcp]
    concepts: [figma, plugin, server, local, canvas]
    section: Comments
    token_count: 481
  - id: "social-intelligence/reddit-deep/figmadesign/1uiyjbd.md#c4"
    char_span: [6410, 8395]
    sentence_count: 11
    key_terms: [figma, using, mcp, opencode, tried, code, post, momobytez]
    concepts: [figma, using, opencode, tried, momobytez]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/figmadesign/1uiyjbd.md#c5"
    char_span: [8397, 8601]
    sentence_count: 1
    key_terms: [components, building, install, minutes, project, running, github, please]
    section: Comments
    token_count: 49
---
# I built an open-source alternative to Figma's official MCP server

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1uiyjbd/i_built_an_opensource_alternative_to_figmas/)
Posted by **Strong_District_9922** · **28↑** · **23 comments**

https://i.redd.it/4qzzmqo299ah1.gif

Hi everyone,

I've been working on a free, open-source tool called **Figwright** as an alternative to Figma's official MCP server, and I thought some of you might find it useful.

The biggest pain point for me was the usage limits. The official MCP server only includes **6 free requests per month**. If you need more, you have to purchase a Dev seat, and even then there are still daily request limits (around 200–600 requests depending on the plan). Figwright runs entirely on your local machine, so there are no usage limits and no subscription fees.

Another thing I wanted to improve was making the generated code actually fit an existing project. Instead of producing generic output, Figwright reads your current tech stack and reuses your existing components, design tokens, icons, and project conventions. The generated code is meant to integrate into your codebase instead of becoming another template that needs rewriting. Since everything runs locally, your Figma files never leave your machine.

It's also **bidirectional**. The official MCP server only reads Figma into code, while Figwright can also write back to the canvas. You can ask your AI agent to create a pricing section, build an Auto Layout hierarchy, or add new UI directly inside Figma, and it'll actually construct the design for you.

One feature I personally like is that it isn't a black box. The plugin includes an **Activity** tab where you can inspect every MCP tool call along with the raw payload sent to the AI, so it's easy to see exactly what context was shared. If something goes wrong, the **Debug** tab can generate a complete diagnostics bundle that you can paste into a GitHub issue, making bugs much easier to reproduce.

It works with AI coding agents like **Claude Code**, **Cursor**, and other MCP-compatible clients.

If you're interested, give it a try on a real project. Feedback, bug reports, feature requests, and GitHub stars are all greatly appreciated.

**GitHub:**  
[https://github.com/awdr74100/figwright](https://github.com/awdr74100/figwright)

## Comments

- **stackenblochen23** (7↑): Looks great! How does it compare to southleft‘s Figma Console MCP?
  - **jerpes1** (5↑): I was thinking the same thing. Southlefts mcp has been a godsend from the days of slogging away on the official figma mcp. Would love to understand how this performs against it.
    - **Strong_District_9922** (2↑): Figwright author here. Honestly both are good — Console MCP is stronger for plugin debugging and cloud/remote setups.

The main difference is that Figwright is pretty opinionated: it's built around one specific workflow instead of trying to be a neutral do-everything tool. It's context-aware — it reads your actual stack (React/Vue/Svelte, Tailwind/CSS) and reuses your existing components and tokens rather than dumping raw node data, both directions.

Where I'm taking it is less "design <-> code" and more the whole PM -> design -> frontend -> backend loop. Since the plugin reads Figma directly, it can spit out the context downstream agents actually need — like generating an \`AGENTS.md\` straight from a design — so everyone's working from the same source.

Both free and open source, so worth trying both on your own file.
- **luyao010424** (1↑): good!run successfully😍
- **Potential-Document60** (1↑): How would I go about adding this if I do not pay for Claude code? Where should I paste into the claude\_desktop\_config.json file?
  - **Strong_District_9922** (2↑): You don't need Claude Code or any paid plan. Figwright is just a local MCP server, so the free Claude Desktop app runs it fine — it's the config-file kind (Settings -> Developer -> Edit Config), not the paid "Connectors" tab.

Open the config that way and paste this — if there's already an "mcpServers" block, just add the "figwright" entry inside it:

    {
      "mcpServers": {
        "figwright": {
          "command": "npx",
          "args": ["-y", "@figwright/mcp@latest"]
        }
      }
    }

Then fully quit and reopen Claude Desktop (you'll need Node.js 24+ installed).

One gotcha: the server is only half of it — also install the Figma plugin (grab the zip from the latest GitHub release, then Figma desktop -> Plugins -> Development -> Import plugin from manifest) and open it, or there's nothing on the Figma side to connect to. Then ask your agent to run \`ping\` to confirm.

(Not tied to Claude, either — since it's a standard MCP server, Cursor/Cline and other free clients work the same way.)
- **qodeninja** (1↑): wait so is this working with a canvas remotley, or is this some local interface
  - **Strong_District_9922** (1↑): Local, all of it. The MCP server runs on your machine and talks to a Figma plugin over a local WebSocket (127.0.0.1) — nothing goes through the cloud or the Figma REST API. The plugin runs inside your Figma app and acts on whatever file you currently have open, live, via the Figma Plugin API.

So it's not driving some remote canvas by URL — it's your open canvas, and your file contents never leave your machine.

That said, extending to the cloud is something I'm actively looking at — I'm just being deliberate about it, since the priority is finding the approach that stays lowest-cost for users (ideally still free, no extra setup) rather than bolting on a paid hosted layer.
- **TheTechGuy22** (1↑): Looks really cool, stumbled upon this after my Figma MCP calls exhausted, gonna try this now.
- **Astronominai** (1↑): it's not working similar to the official remote server and uses more token than usual usage.
  - **Strong_District_9922** (2↑): You're right on both counts, and thanks for flagging it — no defensiveness here.

The "works differently from the official remote server" part is on purpose: it's local + provider-first rather than hosted, so it hands the model the full picture instead of a pre-chewed result.

And that's exactly why token usage runs higher. Right now my priority is being as faithful and complete as possible in what it feeds the LLM — accuracy first — and the honest cost of that is more tokens than it ultimately should use.

Token efficiency is a later phase on the roadmap (trimming usage without losing fidelity); I just hadn't gotten to it yet. Reports like yours are genuinely motivating, though, so I may pull it forward. Really appreciate you taking the time.
- **MomoBytez** (1↑): Hey, I've made a post to ask about the figma MCP with a custom code agent.

Do you maybe have any knowledge on it please?,

From what I read it seems to work fine with Claude code and other supported ides, but I want to have my node js agent deployed, so it cannot make use of The figma plugin or desktop app.
  - **MomoBytez** (1↑): https://www.reddit.com/r/FigmaDesign/s/QIVMCwt9ea
- **Deep_Ad1959** (1↑): the stars you'll pull from this post aren't the number i'd track. for a local-first tool the signal that predicts whether it lives is the second run: of everyone who installs it this week, how many still fire it on a real project past week two. a star is a one-time upvote, the reopen is intent. the other thing that'll quietly bite you is that you'll keep shipping fixes and improvements nobody notices, so whatever channel tells your early users what actually changed ends up mattering more than the initial star spike.
- **Competitive_Slip6290** (1↑): Great Effort, I wanted to ask If it works with Open Code as well? As I have tried using OpenCode using the Figma MCP and it can’t draw on Figma.

Will this solve that issue of mine?
  - **Competitive_Slip6290** (1↑): Update, I tried and it works with the OpenCode. I have tried it by using OpenCode and I have experimented with Figwright. Good stuff. There’s a thing missing, it can’t add properties in the component.
- **Limp_Mud_9679** (1↑): Just tested with Codex using gpt-5.5 and it's amazing. Great work with this open source mcp  
I was frustrated using the official figma mcp because the free tier is just ridiculous.  
so I went looking for an alternative that actually used FIGMA instead of other softwares and I found this post.

Thank you so much!

All I did was ask gpt on codex" please help me to install this open source mcp" and paste the github link and within 2 minutes I had it running and I am now building figma components from my project code.
