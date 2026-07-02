---
id: social-intelligence/reddit-deep/productmanagement/1pfud0q.md
url: "https://www.reddit.com/r/ProductManagement/comments/1pfud0q/new_product_owner_for_agentic_ai_solutions_what/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "New Product Owner for Agentic AI Solutions, what should I learn next?"
author: "kabronski"
date: "2025-12-06T17:11:33.000Z"
score: 16
upvote_ratio: 0.71
num_comments: 21
flair: "Learning Resources"
extracted_at: "2026-06-14T15:28:02.845Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1pfud0q.md#c0"
    char_span: [0, 1186]
    sentence_count: 8
    key_terms: [agentic, product, productmanagement, service, solutions, technical, comments, roadmap]
    concepts: [agentic, product, productmanagement, service, solutions]
    token_count: 260
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1pfud0q/new_product_owner_for_agentic_ai_solutions_what/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1pfud0q.md#c1"
    char_span: [1200, 3065]
    sentence_count: 18
    key_terms: [use, cases, workflows, systems, thinking, workflow, levers, matter]
    concepts: [workflows, cases, systems, thinking, workflow]
    section: Comments
    token_count: 422
  - id: "social-intelligence/reddit-deep/productmanagement/1pfud0q.md#c2"
    char_span: [3067, 3625]
    sentence_count: 3
    key_terms: [framework, learning, tools, "it's", approachable, theoretical, accessible, interested]
    concepts: [framework, learning, tools]
    section: Comments
    token_count: 125
  - id: "social-intelligence/reddit-deep/productmanagement/1pfud0q.md#c3"
    char_span: [3627, 5886]
    sentence_count: 8
    key_terms: [claude-with-the-anthropic-api, context, course, recommend, agents, agent, evals, start]
    concepts: [claude-with-the-anthropic-api, context, course, recommend, agents]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/productmanagement/1pfud0q.md#c4"
    char_span: [5557, 5890]
    sentence_count: 1
    key_terms: [deanondelivery, instrumented, observations, reasoning, recording, reviewing, assuming, products]
    section: Comments
    token_count: 65
  - id: "social-intelligence/reddit-deep/productmanagement/1pfud0q.md#c5"
    char_span: [5892, 8134]
    sentence_count: 16
    key_terms: [learning, interviews, customers, use, requirements, focus, tools, meetings]
    concepts: [learning, interviews, customers, requirements, focus]
    section: Comments
    token_count: 500
  - id: "social-intelligence/reddit-deep/productmanagement/1pfud0q.md#c6"
    char_span: [8136, 9111]
    sentence_count: 8
    key_terms: [understanding, build, using, need, rag, sure, unfortunately, deeplearning]
    concepts: [understanding, build, using]
    section: Comments
    token_count: 228
---
# New Product Owner for Agentic AI Solutions, what should I learn next?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1pfud0q/new_product_owner_for_agentic_ai_solutions_what/)
Posted by **kabronski** · **16↑** · **21 comments**

I recently got promoted from IT Service Manager (Service Desk) to Product Owner for Agentic AI Solutions in my company. We’ve built a Virtual Agent using an agentic AI framework, and part of my role is to work with multiple technical teams (AI/ML, developers, PMs, architecture) to get Service Desk workflows and use cases added to their roadmap.

I’m familiar with GenAI and use Copilot/ChatGPT daily, but I’m still new to agentic AI. I want to deepen my knowledge so I can communicate effectively with the technical teams, understand feasibility, make good product decisions, and help shape our roadmap.

For anyone with experience in AI product management, agent-based systems, or enterprise AI deployments, what areas should I focus on learning? Any courses, certifications, or resources you’d recommend for someone moving into agentic AI?

Appreciate any guidance from folks who’ve been down this path.

## Comments

- **DeanOnDelivery** (42↑): Unpopular opinion: I would politely defer the folks pitching Cursor, Claude Code, RAG, MCP, n8n, LangFlow, <name your agentic doom here>. These tools come and go. Budgets swing. Security torpedoes half of them. If your whole plan is "I learned Tool X," congrats, you just signed up to be AI version of the JIRA Slinging ticket monkey 

Why? Because your job is product, not AI tool-turbation.

And since you actually asked about use cases, here’s the real starting point. Service agents only matter if they move leverz: fewer tickets, faster resolutions, lower costs, less waste, safer workflows, smarter escalation routing, and don't forget compliance issues. Your best use cases live exactly where workflows are repetitive, rules-based, slow, or overloaded. That is your hunting ground. If an agent doesnt hit one of those levers, it is a generative money pit dressed up as innovation theatre.

Then learn how these systems think, not just what they run on:
Autonomy (what it can do alone)
Goals (what good outcomes look like)
Context (what it considers)
Guardrails (what it must not do)
Observability (how you see why it did what it did)

When sizing new use cases, use a simple lens for any workflow that might be ready for agentrification:
1) What universe is it in?
2) What rulez govern it?
3) What steps does it follow or need?
4) What systems must it call?

If you can answer those, you can talk to AI, ML, and engineering without pretending youre writing the production code yourself or leaning on hope as a strategy.

TLDR: tools matter last. Systems thinking matters first. Use cases come from broken workflows, not tech demos.

Learn the levers, frame the approach, nail the decompositional thinking, and then design the workflow. The stack will mutate six times before your next reorg, but those fundamentals never go stale.

Would say more, but Im wrapping up a long flight across the Atlantic. DM if you want the agentic PM framework and workflow breakdown rubric I happened to be working on during the ride (and prior to reading this post).
  - **tintomoody** (2↑): Would be interested to see your framework.
  - **cpt_fwiffo** (1↑): It's not just about learning the tools for the sake of learning the tools. It's often the quickest and most accessible way to learn something practical that makes the theoretical more approachable and that also happens to be relevant here and now.

I do completely agree that it's about moving levers, but not knowing the current basic tools and techniques when talking to engineers and customers isn't going to go well.
- **PlayfulCause6440** (4↑): I am working on a similar product, within our in-house work management tool i am trying to build a context graph, which would ideally keeps broadening and which helps maintain the context across teams at different hierarchical levels, which help teams aligned with the business needs and try to reduce over engineering and unnecessary resource wastages. Based on my experience i would suggest you to focus more memory, context management rather than going behind the buzz word “agentic”!
- **ThePin1** (2↑): I know you asked for course but I would start using a coding agent like Claude code vs browser based prompting. You’ll start to notice how agents are different. I would also recommend building an agent yourself.
- **maplegranny** (2↑): I recommend Hugging Face’s AI Agents course. It’s technical but don’t let that put you off, it will run through how AI Agents work (especially in the first sections) in a good level of detail and will also cover briefly some detail on how LLMs work and what RAG is.
  - **JoeBogan420** (2↑): Found this course pretty good for non-tech folks [https://anthropic.skilljar.com/claude-with-the-anthropic-api](https://anthropic.skilljar.com/claude-with-the-anthropic-api)
  - **PumpkinGator** (0↑): Would you recommend it for someone who doesn’t know Python? I see it’s a prerequisite but curious if I could get by.
    - **maplegranny** (1↑): I don’t know python and found the course helpful, just doing unit 0 and 1 so you cover the explanations of the concepts. Then it gets into implementation which is more technical and less useful if you’re not building.
- **walrusrage1** (2↑): Evals evals evals. I find they almost start to replace traditional AC for these types of nondeterministic products
  - **DeanOnDelivery** (1↑): You're assuming their virtual agent is already instrumented to capture the stepwise context state with the chain of reasoning with request/response time series events ... and catalog them as traces and with a system of reviewing and recording observations into goldens, training tuples, etc ...

Kinda a big ask given the context and constraints identified by the OP.
    - **walrusrage1** (0↑): I'm not assuming anything. OP asked where to start for learning. As PMs, you need to provide requirements for how agents behave to engineering. Evals are a critical part of this in the early stages. Their team doesn't have the testing infra for it? Build it..
- **oakye** (1↑): wrt tools, I would make sure you work with your Privacy/Security/compliance team if your company is big enough to have one; you don’t want lax privacy that could be using company info (even if it’s acronyms in a service ticket).

My challenge is finding tools that fit the above and can be cross-platform. We use Google for Business (Gmail, Docs, etc), zoom, Slack, Salesforce, Atlassian products, Lucidchart, Figma, and Glean….  Gemini seems limited only to its family of Google products (and then still limited). I need to play more with Glean agents. If anyone has answers to a cross platform tool that meets security requirements then I’d focus on those to attempt the use cases. 100% agree work on the use cases and ideal happy path first as no tech replaced that…
- **poloshark36** (1↑): Would highly recommend learning how Cursor can help you in your interviews with customers. It can be a really powerful tool if you create prompt guidelines for it. You can use tools that take transcripts from meetings, upload them into Cursor and then have it export a an XML file that follows the prompt you've given it before. 

If you've done 15-25 interviews with customers or you have been in a ton of meetings with different internal teams that week, you can then have it export meeting notes in a way that allows you to have next steps.

The best part is you can take all those notes and then feed them back into the agent to give you summaries of your interviews and give it a better contextual understanding of the project you're working on.

Completely changed my workflow now that I don't have to reexplain project context over and over again.
- **cpt_fwiffo** (0↑): You should focus on learning as much as you can about AI and about developing AI based services and you should focus on learning as much as you can about the needs of your customers and users.

I recommend that you take the time to go through a number of tutorials on how to build AI agents using different concepts such as MCP, RAG, etc, using both no/low-code tooling and writing all the code yourself.

Make sure that you can explain any moderately common modern AI concept on a higher level, and make sure that you really understand what you are talking about.
  - **Rationalist_in_Chi** (5↑): What you described is like 3 month effort @ 4 hours per day. OP needs a study plan for Monday. Sorry, couldn't help it. 😇


Unfortunately there isn't really a "playbook" for what to learn and how. 


I think the DeepLearning content from Andrew NG is pretty good. The RAG modules particularly. 


More than any one set of tools or "stack", I think understanding the build trade-offs for a any solution is most critical.
    - **cpt_fwiffo** (1↑): Well, these are examples things op would need to have an understanding of as soon as possible. They need to start somewhere.
