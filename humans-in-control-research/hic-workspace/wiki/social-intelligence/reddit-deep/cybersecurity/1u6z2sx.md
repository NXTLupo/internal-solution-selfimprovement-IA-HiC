---
id: social-intelligence/reddit-deep/cybersecurity/1u6z2sx.md
url: "https://www.reddit.com/r/cybersecurity/comments/1u6z2sx/how_are_teams_handling_mcp_tool_surface_exposure/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "How are teams handling MCP tool surface exposure?"
author: "Nihcas_Sachin"
date: "2026-06-16T01:00:52.000Z"
score: 12
upvote_ratio: 0.79
num_comments: 19
flair: "AI Security"
extracted_at: "2026-06-20T17:52:50.777Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1u6z2sx.md#c0"
    char_span: [0, 2214]
    sentence_count: 14
    key_terms: [agent, tools, tool, server, mcp, call, cybersecurity, orchestrator]
    concepts: [agent, tools, server, cybersecurity, orchestrator]
    token_count: 471
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1u6z2sx/how_are_teams_handling_mcp_tool_surface_exposure/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1u6z2sx.md#c1"
    char_span: [2228, 4346]
    sentence_count: 11
    key_terms: [agent, access, restrict, needed, gets, use, zero, everything]
    concepts: [agent, access, restrict, needed, everything]
    section: Comments
    token_count: 471
  - id: "social-intelligence/reddit-deep/cybersecurity/1u6z2sx.md#c2"
    char_span: [4348, 6199]
    sentence_count: 7
    key_terms: [agent, policylayer, nearlyrichtossing, wrapper, deterministic, solution, gateway, issues]
    concepts: [agent, policylayer, nearlyrichtossing, deterministic, wrapper]
    section: Comments
    token_count: 415
  - id: "social-intelligence/reddit-deep/cybersecurity/1u6z2sx.md#c3"
    char_span: [6201, 7240]
    sentence_count: 4
    key_terms: [a-practical-guide-for-secure-mcp-server-development, vibecoding, https, adunlikely486, com, comments, reddit, awesome-mcp-security]
    concepts: [vibecoding, https, adunlikely486, comments, reddit]
    section: Comments
    token_count: 271
---
# How are teams handling MCP tool surface exposure?

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1u6z2sx/how_are_teams_handling_mcp_tool_surface_exposure/)
Posted by **Nihcas_Sachin** · **12↑** · **19 comments**

Something I keep running into when thinking about MCP deployments - the protocol makes it pretty straightforward to discover and call tools, but making sure a specific agent should be able to see or call a tool for a given task is super diff

When an agent calls `tools/list`, it gets back everything the server exposes. A customer support agent, a code review agent, an HR workflow agent all see the same tool set if they're hitting the same MCP server. Whether they should all be able to call `db_execute` or `github_push` is a question goes well beyond the scope of what MCP can control out of the box

The typical response I've heard is "just don't expose dangerous tools" or "put dangerous tools behind a separate server." That makes sense up to a point. But in practice, the same tool can be appropriate for one task and not another. A Jira update is fine for a project management agent. It's not obvious that a support triage agent should be calling it at all.

I'm trying to reason through where the right place is to enforce this. Options I keep coming back to:

* At the MCP server itself, filter tools/list based on some context header the agent passes
* At a gateway or proxy in front of the server, intercept tools/list and tools/call
* At the orchestrator level, before the agent even gets credentials to reach the server
* Accept the broad surface and rely on the server-side tool implementations to check permissions before executing

Each of these has tradeoffs. The server-side filter requires every tool author to trust the agent's context claims. The gateway approach requires maintaining a routing/policy layer. The orchestrator approach still doesn't stop a compromised or prompt-injected agent from calling whatever it can reach once it has credentials.

What are people actually doing in production environments with non-trivial MCP deployments? Is this solved by tool design patterns I'm not aware of, or is it still an open problem?

## Comments

- **itsmanmo** (4↑): i always find it funny that the industry spent years preaching zero trust and least privilege, then ai showed up and suddenly we're comfortable giving agents access to everything and hoping the prompt behaves
  - **ajferreyros** (1↑): Agent Zero needs what Agent Zero needs
- **ilovefunc** (2↑): The way I’ve been handling this is by not exposing raw APIs directly over MCP. Instead, I expose wrapper scripts as tool calls.

The wrapper owns the secret/API access, and the agent only gets to call a narrow, deterministic operation that I’ve explicitly written. So the agent doesn’t get arbitrary access to everything the MCP server could theoretically expose — it only gets the specific capabilities I choose to make available.

This is the safety model I’m using for TeamCopilot.ai: agents can run approved workflows/scripts, but the sensitive API surface stays behind controlled wrappers.
  - **Nihcas_Sachin** (1↑): dont you restrict the agent too much if you do so
    - **ilovefunc** (1↑): Well, not really, you can, for example, create a script which allows the agent to do any curl command to a service except for with certain paths or payloads depending on what you want to restrict.
    - **bitslammer** (1↑): This is similar to how we've built things and the amount of restriction is both needed and welcome. We have 2 flavors of AI in reality in our org. 

First is the general purpose sort of chatbot/assistant, mostly co-pilot, and the other are systems built with a specific business use case. In that second use case the whole idea is to restrict things to the intended use cases and to limit access to only what is needed to do that. 

We're not deploying anything at all like OpenClaw that can do a million things because that's not needed or wanted at this point.
- **Jony_Dony** (2↑): The prompt injection angle is the part that keeps biting people. Even with a gateway, once the model gets a malicious payload mid-task, the gateway still sees a legitimate caller. Agent identity isn't stable across a long tool-use chain, so static permissions per agent type don't really hold.

What's actually helped: scope credentials per task invocation with short-lived tokens generated at orchestration time. The gateway is necessary but not sufficient unless the identity it validates is tied to a specific task context, not just the agent class.
  - **Nihcas_Sachin** (1↑): how are you defining it - what you are saying is so unprecedented
- **nearlyrichtossing** (1↑): Gateway layer with audit logging seems to be where most teams land, since you need visibility anyway and can enforce policy consistently without trusting every tool implementation to validate permissions correctly.
  - **r00ts** (2↑): This. It's the only way, especially if you have to deal with regulated data, bedrock models, etc.

Just be prepared to need to manually provision every single MCP server before they can be used, deal with compatibility issues with clients, choose between extremely expensive SaaS tools or build/manage your own buggy OSS solution, etc.

Lots of tradeoffs but at the end of the day it's absolutely worth the peace of mind
    - **nearlyrichtossing** (1↑): the provisioning tax is real, but at least you catch incompatibilities before they become security issues instead of after an agent tries to call something and breaks the whole workflow.
  - **PolicyLayer** (1↑): We've got a deterministic solution here. [policylayer.com](http://policylayer.com)
- **Fine_League311** (1↑): Nutze MCP über Quart als Modul so kannst du Eingänge und Ausgänge besser steuern!
- **elef_in_tech** (1↑): The thread's wrapper-script approach (r00ts, ilovefunc) is the right instinct, the wrapper owns the credential, the agent gets a narrow deterministic call. I'd add that the wrapper only fully works if it runs somewhere the agent can't bypass it to reach the underlying API directly. 

If they share a host, a clever agent routes around the wrapper. 

The boundary has to be enforced by the runtime, not just by the agent choosing to use the wrapper. Where are you drawing that enforcement line, process, container, or network?
- **CavalryTactics** (1↑): I built a small AI-governance/guardrail/safeguard tool and the honest origin story is that vibe-coding kept not following instructions and coming from a 10+ years security background, this just made me concerned about all the people vibecoding.  
  
Plugging my solution I use in production for all developers that can evaluate tool calls as a devtool. Hope it helps!

[https://www.reddit.com/r/vibecoding/comments/1u7m7oi/i\_created\_a\_aiagent\_governanceguardrailsafeguard/](https://www.reddit.com/r/vibecoding/comments/1u7m7oi/i_created_a_aiagent_governanceguardrailsafeguard/)
- **Puzzleheaded-Loan238** (1↑): Currently, just holding my breath.
- **AdUnlikely486** (1↑): https://genai.owasp.org/resource/a-practical-guide-for-secure-mcp-server-development/
- **AdUnlikely486** (1↑): https://github.com/Puliczek/awesome-mcp-security
