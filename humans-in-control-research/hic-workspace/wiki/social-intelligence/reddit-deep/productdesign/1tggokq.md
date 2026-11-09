---
id: social-intelligence/reddit-deep/productdesign/1tggokq.md
url: "https://www.reddit.com/r/productdesign/comments/1tggokq/why_do_ai_design_tools_skip_the_thinking_part_i/"
kind: "social-post"
source: "reddit-deep: r/productdesign"
subreddit: "productdesign"
title: "Why do AI design tools skip the thinking part? I got frustrated and built An AI Design Agent. Would love your brutal honest feedback"
author: "Extension_Gain7275"
date: "2026-05-18T08:50:17.000Z"
score: 0
upvote_ratio: 0.25
num_comments: 1
flair: ""
extracted_at: "2026-09-10T17:19:06.258Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/productdesign/1tggokq.md#c0"
    char_span: [0, 1812]
    sentence_count: 14
    key_terms: [png, design, https, d0eacf7f4a3cde7afcde3b504d3c686c46b2cf3f, preview, format, productdesign, fleck]
    concepts: [design, https, productdesign, preview, format]
    related_chunks: ["social-intelligence/reddit-deep/productdesign/1tggokq.md#c1"]
    token_count: 504
    sources: [{"n":"reddit-deep: r/productdesign","u":"https://www.reddit.com/r/productdesign/comments/1tggokq/why_do_ai_design_tools_skip_the_thinking_part_i/","kind":"social-post","date":"2026-05-18","author":"Extension_Gain7275","subreddit":"productdesign"}]
  - id: "social-intelligence/reddit-deep/productdesign/1tggokq.md#c1"
    char_span: [1814, 3448]
    sentence_count: 11
    key_terms: [png, fleck, https, preview, design, format, width, auto]
    concepts: [fleck, https, preview, design, format]
    related_chunks: ["social-intelligence/reddit-deep/productdesign/1tggokq.md#c0"]
    token_count: 479
    sources: [{"n":"reddit-deep: r/productdesign","u":"https://www.reddit.com/r/productdesign/comments/1tggokq/why_do_ai_design_tools_skip_the_thinking_part_i/","kind":"social-post","date":"2026-05-18","author":"Extension_Gain7275","subreddit":"productdesign"}]
  - id: "social-intelligence/reddit-deep/productdesign/1tggokq.md#c2"
    char_span: [3450, 5381]
    sentence_count: 13
    key_terms: [fleck, feedback, want, f6ae37b473dc80ad1e31bc55f46c5a3d226d2ca2, thinking-first, figma, frustration, community]
    concepts: [fleck, feedback, thinking-first, frustration, figma]
    token_count: 462
    sources: [{"n":"reddit-deep: r/productdesign","u":"https://www.reddit.com/r/productdesign/comments/1tggokq/why_do_ai_design_tools_skip_the_thinking_part_i/","kind":"social-post","date":"2026-05-18","author":"Extension_Gain7275","subreddit":"productdesign"}]
---
# Why do AI design tools skip the thinking part? I got frustrated and built An AI Design Agent. Would love your brutal honest feedback

Source: [reddit-deep: r/productdesign](https://www.reddit.com/r/productdesign/comments/1tggokq/why_do_ai_design_tools_skip_the_thinking_part_i/)
Posted by **Extension_Gain7275** · **0↑** · **1 comments**

I've been a Senior Product Designer for 10+ years, mostly in fintech and AI companies in London.

A few months ago I got frustrated enough to actually do something about it.

Every AI design tool I tried had the same problem. They were incredibly fast at generating screens. Beautiful mockups in seconds. But they all skipped the part that actually matters, the thinking.

Nobody was asking:

* Is this idea worth building before you spend weeks on it?
* Who exactly is the user and what flows do they need?
* Is this screen accessible? Does it pass WCAG 2.2 AA?
* What does the developer actually need to implement this properly?
* How do you document this work into a portfolio case study?

So I built Fleck AI, an AI Design Agent that thinks before it designs and builds and tackles all of that in one flow.

[Fleck AI](https://preview.redd.it/ev142tdjsu1h1.png?width=1896&format=png&auto=webp&s=d0eacf7f4a3cde7afcde3b504d3c686c46b2cf3f)

[Everything in one flow](https://preview.redd.it/9x71gep2tu1h1.png?width=1520&format=png&auto=webp&s=1bc6993d9728881e6fe5b32392275046ee59e41a)

[Fleck AI-Agent](https://preview.redd.it/6c3gbcw8zu1h1.png?width=1915&format=png&auto=webp&s=43ca25038f549fbff19a197f342dea37374f85e6)

**Here's what it actually does:**

**1. Idea Validation:** describe your product, get a scored analysis (0-100) across market fit, monetisation, competitive edge, scope clarity. With specific reasoning, not generic advice. Before you touch a canvas.

[Fleck AI-Idea Validation](https://preview.redd.it/fm6jesulvu1h1.png?width=1842&format=png&auto=webp&s=fcf516534a4d5d9acf766669cffa66e12c8d2e93)

**2. Design Studio:** infinite canvas, multi-screen flows, wireframe and hi-fi modes. But with Design Memory, set your brand rules, constraints, and personas once and Fleck applies them to every screen automatically. No re-explaining context every session.

[Fleck AI-Design Studio](https://preview.redd.it/645i9vfvvu1h1.png?width=1912&format=png&auto=webp&s=d0827e324b2077507a1494009d1410102ec02119)

**3. UX Audit:** upload any design (even a competitor screenshot or live website) and get instant analysis: Nielsen heuristics, WCAG 2.2 AA compliance, visual hierarchy, cognitive load. With severity-ranked fixes. PDF export ready to share with clients or stakeholders.

[Fleck AI-UX Audit](https://preview.redd.it/mqkv6sqdvu1h1.png?width=1912&format=png&auto=webp&s=0ec08d38e7bc42cef2d0401899073f1271d06d66)

I ran it on Airbnb's website as a test. The results were genuinely interesting, caught several real accessibility issues and navigation inconsistencies that even a polished product like Airbnb has. Here's the shared audit if anyone wants to see what the output actually looks like: [**https://fleck.ai/shared/review/1qq8sxqiam**](https://fleck.ai/shared/review/1qq8sxqiam)

**4. PRD Generation:** turns your sitemap and personas into a stakeholder-ready product requirements document. Lives inside your design project, not in a separate tool.

[Fleck AI-PRD](https://preview.redd.it/b4izu5gmwu1h1.png?width=1911&format=png&auto=webp&s=64cce4c119dee588824584bad578d0b88428da5d)

**5. Dev Handoff:** One ZIP for designers and developers: print-ready spec PDF, color/type/spacing tokens (CSS, JSON, Tailwind), per-screen previews and specs, dev notes, and a runnable Vite + React + Tailwind app with local assets.

[Fleck Ai-Handoff](https://preview.redd.it/cnqxptq1yu1h1.png?width=1915&format=png&auto=webp&s=f6ae37b473dc80ad1e31bc55f46c5a3d226d2ca2)

**6. Portfolio Case Study Generator:** three modes: fully automated from your project files, guided interview where Fleck asks you questions like a senior mentor, or manual section-by-section with tone selection.  


**The core philosophy is simple:**

Most AI tools are output-first. Fleck is thinking-first. It works upstream of Figma (strategy and validation) and downstream of it (handoff and documentation). Not trying to replace Figma, trying to own the thinking layer that Figma doesn't touch.

**Where it is right now:**

I built it in public, it's ready, and now I want to know what this community actually thinks.

Today I'm opening it up properly and would genuinely love feedback from this community specifically, before official launch.

**A few things I'm curious about:**

* Does the "thinking-first" angle resonate with how you actually work? Or do you just want faster screen generation?
* Is UX Audit something you'd actually use on client work or your own designs?
* What's missing that would make this a daily tool for you?
* Is the pricing ridiculous, reasonable, or too cheap? 

Not here to just promote, genuinely want to know what designers and founders think. The product exists because of a real frustration I had every day in my job. I want to know if that frustration is universal or just me.

Try it free at [**fleck.ai**](http://fleck.ai) and give me your feedback. **%0 free credits. (**no credit card required)

Be as harsh as you want. Designer feedback is the only feedback that matters here.

**Hamid**   
Founder, Fleck AI
