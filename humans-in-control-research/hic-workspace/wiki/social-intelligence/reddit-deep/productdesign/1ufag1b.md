---
id: social-intelligence/reddit-deep/productdesign/1ufag1b.md
url: "https://www.reddit.com/r/productdesign/comments/1ufag1b/how_is_frustrating_designing_with_claude/"
kind: "social-post"
source: "reddit-deep: r/productdesign"
subreddit: "productdesign"
title: "How is frustrating designing with Claude?"
author: "Short-Spinach-256"
date: "2026-06-25T13:43:54.000Z"
score: 16
upvote_ratio: 0.77
num_comments: 36
flair: ""
extracted_at: "2026-09-10T17:19:06.259Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/productdesign/1ufag1b.md#c0"
    char_span: [0, 1180]
    sentence_count: 10
    key_terms: [design, because, claude, productdesign, "i'm", everything, comments, chatbot]
    concepts: [design, productdesign, because, claude, everything]
    related_chunks: ["social-intelligence/reddit-deep/productdesign/1ufag1b.md#c2", "social-intelligence/reddit-deep/productdesign/1ufag1b.md#c3"]
    token_count: 266
    sources: [{"n":"reddit-deep: r/productdesign","u":"https://www.reddit.com/r/productdesign/comments/1ufag1b/how_is_frustrating_designing_with_claude/"}]
  - id: "social-intelligence/reddit-deep/productdesign/1ufag1b.md#c1"
    char_span: [1195, 2693]
    sentence_count: 13
    key_terms: [product, head, background, miserable, replies, likely, "that's", "won't"]
    concepts: [product, background, miserable, replies, likely]
    section: Comments
    token_count: 372
  - id: "social-intelligence/reddit-deep/productdesign/1ufag1b.md#c2"
    char_span: [2695, 4778]
    sentence_count: 23
    key_terms: [figma, claude, design, code, prototypes, like, great, ruskerdoo]
    concepts: [figma, claude, design, prototypes, great]
    related_chunks: ["social-intelligence/reddit-deep/productdesign/1ufag1b.md#c0", "social-intelligence/reddit-deep/productdesign/1ufag1b.md#c3"]
    section: Comments
    token_count: 483
  - id: "social-intelligence/reddit-deep/productdesign/1ufag1b.md#c3"
    char_span: [4780, 6083]
    sentence_count: 5
    key_terms: [design, use, skovalik, perception-first-design, claude, github, stunning-variety-285, https]
    concepts: [design, skovalik, claude, github, https]
    related_chunks: ["social-intelligence/reddit-deep/productdesign/1ufag1b.md#c0", "social-intelligence/reddit-deep/productdesign/1ufag1b.md#c2"]
    section: Comments
    token_count: 300
---
# How is frustrating designing with Claude?

Source: [reddit-deep: r/productdesign](https://www.reddit.com/r/productdesign/comments/1ufag1b/how_is_frustrating_designing_with_claude/)
Posted by **Short-Spinach-256** · **16↑** · **36 comments**

In the company I work for, the Head of Product wants to switch any design activity from Figma to Claude Code. He says that this way developers won't have to code frontend. He has not a design or product background, so he's trying to optimize everything without knowing how the design process works.

I'm not sure about this because the more I try to use Claude the more irritated I become with it. I don't like the "chatbot" interaction, it's a huge loss of time for me and the results are so disappointing. Also, I honestly think I'm loosing skills as a designer because I'm more focused on talking with a bot, fixing graphic bugs instead of actually thinking about features and problems.

I don't want to focus on one tool, because design is about processes and ideas and not only tools, but I prefer using my hands to create something instead of delegating everything to a chatbot.

What do you think? Are you in a similar situation?

## Comments

- **natelikesdonuts** (13↑): Our head of product went this route late last year. The tools have likely improved but it was a horrible experience. It was hard to track changes, designers were miserable, devs were miserable, no one could get a sense of overall flow and edge cases, and the quality of our product tanked--fast.

If your situation is similar, there's no point in telling them the downsides. They won't listen. They are likely reacting to leadership directives, some sort of ai psychosis (seriously), or a combination of the two.
  - **Swimming_Anywhere_30** (2↑): Agree! We are in the experimenting phase and let's say what we observe and not pretend this shit is working for now. Our core job was never about ui or mockups to begin with but that's all everyone else sees us for anyway. So screw it.... And let the product tank. That's how the world will learn .
- **_Tenderlion** (9↑): Your Head of Product has no product background?
  - **ssliberty** (1↑): It’s the same at my company, they are mostly business or customer service background
- **AffectionateCat01** (4↑): Bruh. Claude isn't good in design at all 😂 he spends too much time on LinkedIn
- **abillionsuns** (2↑): Most of these replies seem AI-assisted at best. Maybe what you really need to do is find a new team because the head of product has stuck it up their own behind.
  - **LuHamster** (1↑): These as in replies in this thread?
- **hyrumwhite** (2↑): > He says that this way developers won't have to code frontend

Your poor frontend. Claude sucks at design, and is mediocre at code
  - **ssliberty** (1↑): I disagree. Claude is ok for basic design and very lazy at code. Sucks for internal tools big time
- **AccessibleTech** (4↑): Claude Design takes Figma files as an upload and configures the frontend. You can draw on the Canvas and tell Claude to fix content you don't like. Once done, it wraps everything up for a Claude Code hand off.
  - **Swimming_Anywhere_30** (1↑): Did you try with figma MCP?
- **Ruskerdoo** (3↑): In my experience, fully coded prototypes are a great way to do design/developer handoff. They can communicate details quickly, where Figma documentation would take hours.

They’re also great at communicating statefulness, and edge-cases. Especially compared to Figma.

The other big advantage is around conducting usability tests. Coded prototypes tend to fall down less often than click through Figma prototypes.

All of that said, Claude code, or whatever LLM-powered IDE you prefer, is just a tool. And honestly, it’s not that great for exploring layouts or specific visual design approaches. I often find myself going back to Figma once I’ve built an initial prototype to prove out a user flow. Figma lets me polish the details in a way that Claude code makes very difficult.

Establishing a hard rule like this seems shortsighted to me. Good designers should be fluent in a variety of tools and choose the one that works best based on the situation.
  - **thesturgga** (1↑): How are you getting your CC designs back into Figma? Or simply recreating them? I’ve explored some options but haven’t landed an ideal workflow.
    - **Ruskerdoo** (1↑): The short answer is that I don’t!

That return pathway is still not a solved problem. Which is wild considering how straightforward it should seems like it should be to convert html/css into Figma layouts.

We simply don’t try to maintain our design system in Figma anymore. And we only use Figma for exploration, not as a source of truth.
- **TanukiTrix** (1↑): What do you mean you don't like the chatbot interaction?

Claude Code is very powerful tool for coming up with mockups and first drafts, just depends on how well a prompt is crafted. I'd start with that and then add custom designs to make whatever you create more unique. Best thing about it you save time with front end and can focus more on design.
  - **Pew_Pew_Lasers** (1↑): They mean that, as a designer, it’s ~~fun~~ in the craft to ”work with our hands” and use a mouse to move things around until it looks right. Having to write a short story to do the same thing feels shitty because if they loved writing they would have studied to be a copywriter.
    - **abillionsuns** (3↑): Designers are using tools optimised for decades to help them achieve their goals, saying "it's fun" to use those tools risks trivialising a very skilled profession.
- **isperg** (1↑): To avoid those 50 first dates and prompts that fall short: try 
https://github.com/skovalik/conduct-platform and save time learning how to do context engineering from scratch. This will run you through how to successfully scaffold research/planning to get those hifi html pages you can polish rather than fuss with to output.

https://github.com/skovalik/perception-first-design to automate design decisions.
- **Stunning-Variety-285** (1↑): Use Claude design, just discovered it recently
