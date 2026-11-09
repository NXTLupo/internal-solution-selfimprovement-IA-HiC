---
id: social-intelligence/reddit-deep/figmadesign/1tk53ap.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1tk53ap/figmas_ai_agent_an_honest_review/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Figma's AI Agent - an honest review"
author: "_srirachacha"
date: "2026-05-22T02:03:13.000Z"
score: 80
upvote_ratio: 0.94
num_comments: 56
flair: "feature release"
extracted_at: "2026-09-10T17:19:11.225Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c0"
    char_span: [0, 1705]
    sentence_count: 12
    key_terms: [figma, agent, using, figmadesign, took, comments, consider, helping]
    concepts: [figma, figmadesign, agent, using, comments]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c7"]
    token_count: 403
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1tk53ap/figmas_ai_agent_an_honest_review/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c1"
    char_span: [1707, 4073]
    sentence_count: 19
    key_terms: [file, designs, files, compare, requirements, asked, interesting, comparison]
    concepts: [designs, files, compare, requirements, interesting]
    token_count: 499
  - id: "social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c2"
    char_span: [4075, 4372]
    sentence_count: 3
    key_terms: [genuinely, curious, stories, success, enough, figure, moment, seeing]
    token_count: 71
  - id: "social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c3"
    char_span: [4387, 5576]
    sentence_count: 7
    key_terms: [sparklypelican, design, use, agents, claude, "isn't", tools, code]
    concepts: [sparklypelican, design, agents, claude, "isn't"]
    section: Comments
    token_count: 309
  - id: "social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c4"
    char_span: [5578, 7550]
    sentence_count: 11
    key_terms: [design, ai-design-system-mcp-example, intodesignsystems, agent, figma, information, file, new]
    concepts: [ai-design-system-mcp-example, design, intodesignsystems, information, agent]
    section: Comments
    token_count: 477
  - id: "social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c5"
    char_span: [7552, 9650]
    sentence_count: 15
    key_terms: [figma, because, components, rename, need, production, curious, design]
    concepts: [figma, because, components, rename, production]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c6"
    char_span: [9416, 9802]
    sentence_count: 2
    key_terms: [curious, functionality, production, cobradave, component, missing, replace, through]
    concepts: [curious]
    section: Comments
    token_count: 98
  - id: "social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c7"
    char_span: [9804, 10944]
    sentence_count: 6
    key_terms: [figma, already, history, investigatorapart279, tools, using, weave, org]
    concepts: [figma, already, history, tools, using]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1tk53ap.md#c0"]
    section: Comments
    token_count: 278
---
# Figma's AI Agent - an honest review

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1tk53ap/figmas_ai_agent_an_honest_review/)
Posted by **_srirachacha** · **80↑** · **56 comments**

**TLDR: it's slow, minimally helpful, and I'm not super impressed.** 

I work at a larger organization. I'd consider myself a Figma expert. I have been using Figma for over 4 years and I am very well versed in using components, variables, Design Systems, etc. 

I keep a list of things that I want AI to be able to do in Figma when I come across tasks in my workflows I feel could be automated. I want it to do my tedious tasks like showing me my unnamed layers, helping me compare long lists of product requirements to actual designs as a final check before handoff, and helping me make sure all my screens have design consistencies across flows. This is the stuff that takes time and clicks, and any way to reduce that is something I'd consider using. 

I spent a couple of hours today testing the Figma agent right inside my files and had a couple of standout observations.

1. **It is slow**  
Right now the agent doesn't consume credits in beta. It measures every prompt answer in the amount of time it took to generate the answer. Simple answers took about 10-30 seconds. I had a group of 4 frames with many layers on them and asked the AI to swap a token out on all the backgrounds and flip the text color to another token so you could read the text. This task would have taken me maybe less than a minute with some deep clicking or the multi selection tool. But **it took the AI over 4 minutes** to swap these tokens, and it even changed a few elements it wasn't supposed to. 

I also asked it to make me 3 mobile concept screens based on an original screen I already had made and shipped to see how creative it would get. Got nothing impressive, and it took about 5 minutes to generate them. It did use components from our UI kit which was interesting to see, but I would have had to go back into the designs and swap in proper components and polish the designs to get it to be semi shippable. Most of the layouts were pretty generic and while it brought some interesting concepts, I probably could have sketched something similar in a wireframe in a similar amount of time. 

2. **Helpful? Maybe.** It will evaluate your screens and look for inconsistencies across flows, but since the answer comes back in text inside the chat canvas, you have to find the discrepancies in the actual Figma file yourself. Sometimes it will link to a screen or a section, but if your files are huge, it's going to take forever.

Potential positive: It will summarize files or pages. If you're not the one who built the file, it could be useful for getting a quick understanding or finding something specific, but eventually when it will cost $ to run this AI, it would be cheaper and probably better to just talk to the person who made the file. The bigger the file, the longer the summary generation will take. 

3. **Product requirement comparison? Not exactly.** I straight up asked it if it would compare requirements to my designs to see if it matched up. It said it couldn't identity proper logic or flow mapping but would be able to compare technical specs if I provided them. We also don't document our technical specs as requirements, so that felt like a lacking feature.

4. **No historical comparison**. I tried a prompt that was more summary based and asked the AI to summarize what had changed in a file the last few days so I could catch up as if I had missed a few days and someone else was working on my designs. It told me it could not compare historical versions of files. This would actually be one of the more helpful features to have because we have many designers in the same files working fast, but the agent couldn't deliver this info.

Do I see potential? **Maybe**. Needs to be so much faster and contextual for me to see more value, especially if one day it will cost credits to use.

Do I feel threatened by it? Not at the moment. 

Did I find it useful enough for me to start using it every single day? **No. I am still trying to figure out how I would use this daily, if at all.**

Would love to hear success stories if you have them. Genuinely curious about how to make this tool work for me, but not seeing much at the moment.

## Comments

- **SparklyPelican** (15↑): All these design agents are borderline useless for most use cases right now, in my opinion.
  - **aldoraine227** (2↑): Yeah but the vibe is sort out how to use this or….
    - **SparklyPelican** (1↑): Or what? If your company forces you to use these solutions and you don’t like it, maybe you should look elsewhere.
  - **INFINITE-ESPORTS** (1↑): true
- **BisforBurning** (10↑): It doesn't have much that isn't available through Claude Code with the Figma MCP. There are custom tools to create and edit designs, but it isn't doing well at the things I need, applying a design on to other templates, or generating new design directions that match an existing brand.
  - **_srirachacha** (5↑): Heard. Unfortunately we have very limited access to certain AI tools at my organization. Claude Code is not an approved tool for us yet, so this is as close as we can get at the moment.
  - **jhtitus** (2↑): I recognized it as exactly code-to-canvas from the way it builds frames. I’m sticking with cc and my repo of growing .md docs. It gets faster and more accurate daily.
    - **Playful-Ear52** (2↑): Remember .MD is for human consumption, .JSON is for your agents!

[https://intodesignsystems.substack.com/p/ai-design-system-mcp-example](https://intodesignsystems.substack.com/p/ai-design-system-mcp-example)  
Diana Wolosin tested meta data formats and JSON was more accurate and consumed 80% less tokens. You read that right.
    - **Jessievp** (1↑): Can you explain that workflow a bit or point me to some (easy) resources/tutorials? I dabbled around with figma mcp + cc but the results are subpar and take a loooong time (generating new screens + 1hr and a shitty result). And I dont know how to improve it 😅
  - **Express-Pea-1917** (2↑): Hey, weird question: I am working on brilliant. design (figma alt, embedded ai agent from the start..). We're about to release our own design systems in ai support and I would love to test it out on what you talked about (applying a design on to other templates, or generating new design directions that match an existing brand). Any chance you could send me the actual figma files you tried this on, what was the result, and so on? Would love to see how we compare
    - **BisforBurning** (1↑): My file is full of proprietary information, but if you send me a file and desired prompt, I can try it and send it back. 

One thing I noticed was that if doing multiple designs it falls back to scripted updates, so you have to ask for a design or edit in a new chat with one frame selected to trigger their create or edit design tools.

Also it's doing much better when the file is fully set up with assets and variables, rather than having one example of the brand style. 

I'm experimenting with using a claude.md page, memory page, etc to record and share information with the agent.it would be nice if I could use hooks to force it to read certain pages or add a record of what changed to a work log page after each session
- **hana0519** (5↑): Interesting 🤔 thanks for sharing the use cases, OP! Honestly your use cases feel quite sophisticated that I didn’t expect the agent to be good at 😅 

I found it encouraging that it is using the Design Systems to generate new designs. The ability to immediate tweak it to with my own hands feels good.
- **Diligent-Plane-2640** (3↑): It is in alpha right now. They are going to improve the new ai agent because of people like you giving them reviews. I expect it to get much better! Thanks for the write up. Sounds promising
- **Careless-Energy-3071** (2↑): I don’t need Figma AI to “design” for me. I need it to survive boring production tasks without making me babysit it for longer than the task would take manually.
  - **Liam_leighton01** (1↑): I think though, you may argue whether those production tasks materially matter anymore. Figma is becoming a communication tool, as designers can now more easily peak into, access codebases as a means of understanding source of truth. That is the positioning some take.
- **EyeAlternative1664** (5↑): My colleague used it yesterday. It updated 1000 components for him while he made a coffee. He was pretty impressed.
  - **RCEden** (6↑): What did they mean? because if your components and DS are built well enough that could have been a single change to a base component getting pushed out to everything else. maybe it's just hyperbole but I literally can't think of a single time where 1000 components need updating and I've worked on massive enterprise libraries.
  - **_srirachacha** (3↑): Hm. Maybe I have work to do on my prompting!! This would be nice in some cases!
- **OctoSaurusRex** (2↑): Im curious as to why you’re complaining about the rename layers thing when that has been a part of Figma for more than a year now
  - **_srirachacha** (2↑): I don't like the rename layers feature because I can't see what it's actually naming them to. Sometimes I want to be able to approve the name switches because of context for devs. Or at least have Figma tell me where the layer with the missing name is so I can go and rename it myself.
    - **Illustrious_Ad6286** (2↑): Just use find and replace tool
- **cobradave** (1↑): I’m curious if you’ve tried Figma’s MCP for some of this functionality through Cursor, Claude, or Codex. The speed is a bit faster on quick edits but I’m very curious how well trained the agent is on component production. 

Thanks for the write up!
  - **_srirachacha** (2↑): Our org has a long approval time for AI. I believe one of those tools just got approved for us. With this underwhelming feature release, it might be enough to motivate me to start learning how to use some of these other tools.
    - **jhtitus** (0↑): If your using Figma Design Agent, you’re already using Claude Code.
- **Oferlaor** (1↑): I wonder (assuming your org doesn’t get blocked) how it compares to “Buddy”, the previous AI companion plugin. 

Not sure a lot of Figma users actually care about history, many designers just add more and more stuff side by side to recall history instead of changing it in the same designs.
- **InvestigatorApart279** (1↑): Is anyone else getting a 404 error while trying to log into Figma Weave with “Continue with Figma”?

It worked for me yesterday, but today after clicking the Figma login button it says:
“404 - This page couldn't be found.”

I already tried:

- clearing cache/cookies
- incognito mode
- different browser
- VPN on/off

Still not working. Is this a server issue or did something change after the Weavy → Figma Weave migration?
