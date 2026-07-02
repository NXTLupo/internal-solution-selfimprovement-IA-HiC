---
id: social-intelligence/reddit-deep/anthropic/1mvxpqt.md
url: "https://www.reddit.com/r/Anthropic/comments/1mvxpqt/claude_code_now_have_context_hook/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "claude code now have /context hook"
author: "Appropriate_Tank_824"
date: "2025-08-21T01:35:45.000Z"
score: 646
upvote_ratio: 1
num_comments: 79
flair: ""
extracted_at: "2026-05-11T17:26:51.909Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, saas]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/anthropic/1mvxpqt.md#c0"
    char_span: [0, 261]
    sentence_count: 1
    key_terms: [anthropic, comments, reddit-deep, context, claude, posted, reddit, source]
    concepts: [anthropic, comments]
    token_count: 79
    sources: [{"n":"reddit-deep: r/anthropic","u":"https://www.reddit.com/r/Anthropic/comments/1mvxpqt/claude_code_now_have_context_hook/"}]
  - id: "social-intelligence/reddit-deep/anthropic/1mvxpqt.md#c1"
    char_span: [275, 1918]
    sentence_count: 7
    key_terms: [stingraycharles, mcp, tokens, tools, anthropic, already, certain, context]
    concepts: [stingraycharles, tokens, tools, anthropic, already]
    section: Comments
    token_count: 435
  - id: "social-intelligence/reddit-deep/anthropic/1mvxpqt.md#c2"
    char_span: [1920, 3500]
    sentence_count: 8
    key_terms: [github, https, com, bitching, jomon003, moaning, playmcp, useful]
    concepts: [github, https, bitching, jomon003, moaning]
    section: Comments
    token_count: 504
---
# claude code now have /context hook

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1mvxpqt/claude_code_now_have_context_hook/)
Posted by **Appropriate_Tank_824** · **646↑** · **79 comments**

seems like they have this in 1.0.86

## Comments

- **stingraycharles** (44↑): This also highlights that you should not just randomly add MCP tools: in your screenshot they account for almost 50% of the tokens used. 

Super useful feature!

Now let’s give us those realtime session limits metrics and we’re good to go 😊
  - **alvvst** (4↑): I only have 4 MCP, and it takes 8k tokens already
  - **probello** (2↑): I created a tool that will update the Claude code status line with full token utilization burn rate reset timer, etc. https://www.reddit.com/r/Anthropic/s/J5g5zEYoKL
    - **FloofBoyTellEm** (1↑): How am I the first comment? Surprised you got zero feedback on your thread as well. Dead internet theory? :)
  - **KingChintz** (1↑): Also shows that we need to scope down the tools from any MCP you’re using to reduce it even further
    - **stingraycharles** (2↑): Yeah, TBH that’s a feature that Anthropic could add to CC, to just disable certain tools from certain MCP servers so that they’re not longer included.
  - **Substantial-Thing303** (1↑): It also highlighted that it has way too much info for custom agents in context.  I have 4 custom agents, yet they are using 4.6k tokens on a clean start.  Just the descriptions would take much less than that, so are their specific prompts are already stored in context too?
    - **stingraycharles** (1↑): Apparently they are, which seems weird to me.
  - **Appropriate_Tank_824** (1↑): tested a few mcps for browser automations, but couldn't be satisfied with any of it other than playwright. tho it doesn't connect to my current session and auth. any recommendations?
    - **_0x00_** (6↑): https://github.com/hangwin/mcp-chrome

This should use your current session and auth but I think it's a terrible idea to give an LLM basically the keys to your whole digital life.
    - **xmontc** (2↑): Did you try browser-tools? https://github.com/AgentDeskAI/browser-tools-mcp
    - **WorthAdvertising9305** (2↑): [https://github.com/jomon003/PlayMCP](https://github.com/jomon003/PlayMCP) has been great. Built on top of playwright, but has a lot of tools, which is a bad thing for tokens.
- **Langdon_St_Ives** (57↑): For once a useful post interrupting the constant bitching and moaning. Ty!
  - **Appropriate_Tank_824** (7↑): you are welcome
  - **oxygen_addiction** (-6↑): The bitching and moaning is highly justified.
    - **Bobodlm** (6↑): Cry more crocodile tears! 

If the ToS/product is so bad, why are you here?
    - **Plantanddogmyfriend** (2↑): Lmfao.
    - **nooruponnoor** (2↑): ![gif](giphy|wJxiy4J8cQDkI)
- **manojlds** (17↑): It's a slash command, not a hook
  - **martyz** (3↑): ![gif](giphy|B4ZgcoPTHYXL2)
- **thread-lightly** (4↑): Oooh thats some good sheaaat!
  - **Appropriate_Tank_824** (1↑): oh yesss
- **fiftytacos** (2↑): Nice
- **allinasecond** (2↑): I absolutely love this.

Anthropic's just the superior company. The details man...
- **k2ui** (2↑): Incredible feature tbh
- **sublimegeek** (2↑): Now I wonder if we can have this in our status line
- **Patient-Swordfish335** (2↑): oof, I got excited that they'd added a hook that let you modify the context before it was sent over to the api. Now that would have been interesting.
- **nizos-dev** (2↑): This is super useful! Thank you!
