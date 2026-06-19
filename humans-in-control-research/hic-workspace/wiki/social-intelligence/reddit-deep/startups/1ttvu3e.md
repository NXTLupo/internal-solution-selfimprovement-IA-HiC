---
id: social-intelligence/reddit-deep/startups/1ttvu3e.md
url: "https://www.reddit.com/r/startups/comments/1ttvu3e/is_this_a_real_business_opportunity_or_not_i_will/"
kind: "social-post"
source: "reddit-deep: r/startups"
subreddit: "startups"
title: "Is this a real business opportunity or not? (i will not promote)"
author: "Beckagard"
date: "2026-06-01T15:33:07.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 5
flair: "I will not promote"
extracted_at: "2026-06-18T13:35:25.318Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/startups/1ttvu3e.md#c0"
    char_span: [0, 2142]
    sentence_count: 17
    key_terms: [vendor, agent, erp, clients, harness, "i'm", build, api]
    token_count: 488
  - id: "social-intelligence/reddit-deep/startups/1ttvu3e.md#c1"
    char_span: [2144, 3487]
    sentence_count: 12
    key_terms: [server, skills, build, erp, mcp, moat, workflows, automate]
    token_count: 304
---
# Is this a real business opportunity or not? (i will not promote)

Source: [reddit-deep: r/startups](https://www.reddit.com/r/startups/comments/1ttvu3e/is_this_a_real_business_opportunity_or_not_i_will/)
Posted by **Beckagard** · **1↑** · **5 comments**

I'm a consultant (employed, not freelance) doing AI/automation work for small manufacturers (sub 200 employees) in a small EU country. Almost all of them run the same legacy ERP. The vendor is a smaller European player that owns \~70% of this market. The ERP vendor is very closed off, expensive, slow to innovate, painful to integrate with, mediocre support, etc etc. Slow incumbant basically.

Working with these clients daily, I see huge volumes of manual ERP tasks that are automatable (with AI, not without). I've built and maintained agents/workflows for SMEs for quite a while now, so I'm confident I can build an agent harness which automates a large share of what I'm watching people do by hand. The demand is real and I already have the client access and trust.

The problem is that everything routes through this vendor's API. I can't buy API access myself (they will deny me). Rather clients have to license it from the vendor, which is really expensive, and I plug into that, hosting the solution in their tenant or myself.

Now I'm struglging to see if there's a legit product here for years down the line, or if this is just something that I can extract value from for a year or two at most before the vendor and the clients themselves catch up.

There are two ways to build this:

**Option A: Bespoke web app + Agent Harness.** I build my own interface, wrap the ERP API as tools for an agent, and sell it as a tailored product: chat, history, scheduled tasks, workflows specific to their manufacturing context. Full control over UX. The risk: I'd essentially be shipping a ChatGPT/Claude desktop re-skin with the ERP wired in with a custom agent harness for each client. But if the vendor ever ships their own official MCP server (or agent harness) that clients can plug into ChatGPT for free. I wonder if my custom solution will be enough real value-add in comparison.

**Option B: Just the MCP server + SKILL.md.** I build an MCP server around the ERP API plus a library of skills that automate their specific workflows, and clients plug it into whatever AI they already pay for (ChatGPT, Claude, Copilot), if any. Most of they don't even have that in place yet. My honest guess is this captures \~70% of the value with a fraction of the build. But then what am I actually charging for? A monthly retainer for the MCP server plus writing and maintaining the skills? Living inside the constraints of someone else's chat interface?

So the real question I want input on:

What's the moat in either option, and is there even a moat to begin with? I see so many wrappers and re-skins daily doing very well, simply becasue the market is too ignorant or lazy to just learn how to use SKILLs or even just buy a ChatGPT enterprise license and use connectors.

Or am I overthinking this? Is "I have the client relationships, the trust, and I know exactly which workflows to automate" already moat enough, and the right move is just to sell the bespoke thing and not agonize over defensibility and long term growth/revenue?

## Comments

- **yndy000** (1↑): Ship today something you can charge for. Then think on how to expand the relationship. Ultimately you can build a full ERP solution and totally replace the old ERP.
