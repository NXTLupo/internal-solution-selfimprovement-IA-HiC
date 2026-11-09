---
id: articles/reddit-deep-r-figmadesign/00d4de2abf.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1onhh63/any_designers_using_cursor_or_any_other_ai_agent/"
url_hash: "00d4de2abf"
kind: "article"
source: "Reddit Deep: r/figmadesign"
title: "Any designers using Cursor or any other AI agent for creating prototypes?"
author: ""
date: "2025-11-03T17:08:41.000Z"
tier: 
method: "source-native"
extracted_at: "2026-09-10T17:25:28.937095+00:00"
chars: 3160
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:25:28.978Z"
relevance: 65
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "37510223ecd02c4b"
relevance_by_goal: {"5a163910d68e":65}
chunks:
  - id: "articles/reddit-deep-r-figmadesign/00d4de2abf.md#c0"
    char_span: [0, 2122]
    sentence_count: 13
    key_terms: [cursor, figma, using, designs, design, prototypes, designers, get]
    concepts: [cursor, figma, using, designs, prototypes]
    token_count: 465
    sources: [{"n":"Reddit Deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1onhh63/any_designers_using_cursor_or_any_other_ai_agent/","kind":"article","date":"2025-11-03","subreddit":"figmadesign"}]
  - id: "articles/reddit-deep-r-figmadesign/00d4de2abf.md#c1"
    char_span: [2124, 3381]
    sentence_count: 9
    key_terms: [figma, vercel, library, github, guide-to-the-figma-mcp-server, component, prototype, working]
    concepts: [figma, vercel, library, github, component]
    token_count: 332
    sources: [{"n":"Reddit Deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1onhh63/any_designers_using_cursor_or_any_other_ai_agent/","kind":"article","date":"2025-11-03","subreddit":"figmadesign"}]
---
# Any designers using Cursor or any other AI agent for creating prototypes?

Source: [Reddit Deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1onhh63/any_designers_using_cursor_or_any_other_ai_agent/)

Hi everyone

  
I was curious to know if designers are using Cursor to directly create prototypes instead of creating designs in Figma. If you are one of them, could you tell me these:

* For what kinds of projects do you work directly in Cursor, and for what you still use Figma?
* What are the key benefits because of which you are directly designing in Cursor?
* Are other stakeholders, especially developers, welcoming of this or do they still prefer Figma designs?
* How do you share you Cursor prototypes with other and how do you get feedback on them?
* What are some problems in Cursor based design workflow that you wish were solved?

  
I myself am a developer and heavily use Cursor for designs. However, I wanted to get the perspective of professional designers if they also find it useful.

  
Thanks

--- TOP COMMENTS ---
[36↑ K05M0NAUT] I am using Figma to create the designs first, then using the Figma MCP server which hosts my component library (which is a branded version of tailwinds/shadcn components basically) I then provide the design link to cursor which can then build the html, css, JavaScript. Id say it gets it about 80-90% right. 

This might seem backwards, I feel like a lot of people are using AI to start common sense design work and the output is subpar.

Don’t rely on the AI to design the solution, that’s what humans are better at, use AI to build the working prototype so you can test better and get feedback faster.
[4↑ rahtid_my_bunda] Different ways to do it tbh. The tech is so novel that I don’t think saying one way is the right way makes sense. It’s also good for rapidly scaffolding lots of approaches to achieve certain functions within constraints.

Try building a detailed list of workflows, requirements, constraints and turn it into a spec. Get the AI to fill in gaps based on other prompts, inspirations and understanding or have it ask for clarity.

From there you can also do fast validations on micro flows and take what you want into Figma.
[3↑ ExplorerTechnical808] I'm not sure if I get it correctly. What do you mean by "the Figma MCP server hosts my component library"? As in, you have a replica of the Shadcn component library in Figma that a LM (e.g. in Cursor) reads via the Figma MCP to determine styles? (I guess you then have the identical shadcn library in code that matches the one in Figma, right?)
[3↑ K05M0NAUT] https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server
[2↑ radchad074] We went down the path of using make first,  rapid prototype and found that is made a lot more work and created a bunch of unknowns,  now my team is doing your process which is working a lot better.
[1↑ Vaibhav_Sinha] Thanks for your reply.

Once you build the working prototype using AI, how do you share it with others to collect feedback?
[1↑ eist5579] If you don’t have an internal server, you could consider hosting on vercel.  

That would be a GitHub > vercel setup.  It’s chill.  Set up your GitHub.  Set up your vercel.  Link the GitHub repo to a vercel deployment (via Vercel) and you are rolling friend!
[1↑ szdesign] and it even gets text boxes, checkmarks right?
