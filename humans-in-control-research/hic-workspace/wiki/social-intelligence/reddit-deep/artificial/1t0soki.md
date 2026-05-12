---
url: "https://www.reddit.com/r/artificial/comments/1t0soki/i_built_a_router_that_automatically_sends_your_ai/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "I built a router that automatically sends your AI tasks to the most appropriate model to handle them at low cost - 9,200 tasks in, $21 saved at $0.14 actual cost"
author: "QueefLatinahOG"
date: "2026-05-01T12:56:46.000Z"
score: 33
upvote_ratio: 0.86
num_comments: 37
flair: "Project"
extracted_at: "2026-05-11T17:27:04.782Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# I built a router that automatically sends your AI tasks to the most appropriate model to handle them at low cost - 9,200 tasks in, $21 saved at $0.14 actual cost

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1t0soki/i_built_a_router_that_automatically_sends_your_ai/)
Posted by **QueefLatinahOG** · **33↑** · **37 comments**

The observation that started this: most of what people use AI for every day - summarising, drafting, classifying, extracting etc doesn't actually require a frontier model. Any competent 8-70B model handles those just as well. But most people run everything through Claude or ChatGPT out of habit.

I built Followloop ([followloop.app](http://followloop.app/)) to solve this automatically. It classifies each task by complexity and routes it:

\- Simple tasks → Cerebras Llama (2000 TPS, 1M tokens/day free), Groq, Gemini Flash

\- Moderate tasks → Groq 70B, SambaNova

\- Complex tasks → Claude Haiku as fallback

The dashboard shows your actual cost alongside what you'd have paid running everything on Claude Sonnet. I've been running it on my own AI workflow for two weeks: 9,200 tasks routed, $21.24 saved, $0.1360 actual cost. About 157× cheaper per token than Sonnet on average.

Works with any AI setup via MCP (Model Context Protocol) - Claude Desktop, Cursor, Claude Code, or anything MCP-compatible.

Also has a library of 1,300+ safety-screened MCP servers as a bonus feature.

$5/month at [followloop.app](http://followloop.app/)

## Comments

- **InterstellarReddit** (4↑): Hey OP, while this is a great idea for yourself, big companies don’t want their models to automatically route what they do is a hybrid orchestrated workflow with conditional elements to send their model that they need to the specific task.

There’s no such thing as auto routing. There’s no consistency the day that your route goes to the wrong model even if it’s not intentional, a company can make a $5000 mistake.

This is the reason why not even OpenRouter which has the resources and the talent to build something like this, has put something like this in place.

They’ll route to the cheapest provider for a model but they won’t route to another model
  - **KSubedi** (3↑): OpenRouter actually does have auto router: [https://openrouter.ai/docs/guides/routing/routers/auto-router](https://openrouter.ai/docs/guides/routing/routers/auto-router)
  - **QueefLatinahOG** (-1↑): Fair point on enterprise - that’s a completely different problem and you’re right that conditional orchestration with business logic needs human-defined rules. Not what I’m building.

What I’m doing is way simpler and way more fun: you’re already paying $20/month for Claude. For an extra $5 you get 3x the output from that same subscription. Simple tasks route to free models automatically, your Claude quota gets saved for the stuff that actually needs it.

The OpenRouter comparison kind of proves the gap - they route to the cheapest provider for the same model. Nobody’s cracked cross-model routing for regular people who just want their AI subscription to go further. That’s the whole bet.

No $5000 mistakes here - worst case a bill negotiation script is slightly less sharp but your $20 still stretches to like $60.
- **kamusari4477** (3↑): Cool in theory. The real test is always: does it work when the data is messy and the users are impatient? That's where most of these fall apart.
  - **QueefLatinahOG** (1↑): Good area of focus. The answer for us was simplifying access to the point where impatience is removed from the equation - iOS shortcuts for consistently used prompts, one tap to run, same routing stack underneath. 

The discipline happens at the infra level so the user never has to think about it.

What tasks do you run daily? Genuinely curious - if there’s a gap in the shortcut library I’ll build it.
    - **Hans_lilly_Gruber** (1↑): I think this is a bot, I've read the same comment already in 3 threads here in r/artificial today. 

On topic, why does your tool not use Claude opus or sonnet or Chatgpt for complex task? I ask out of ignorance on the subject.
- **shootmakers** (3↑): Open router does it natively
  - **QueefLatinahOG** (1↑): You’re right - OpenRouter’s auto router does cross-model routing. Worth the correction, cheers.

The difference is who it’s built for. OpenRouter is API-first for developers managing their own stack. Followloop is $5/month, one-tap iOS shortcuts, no API knowledge needed. Same underlying idea, completely different person using it.

The MCP safety library is also a separate thing entirely - 1,300+ vetted servers, 8-layer screening. That part OpenRouter doesn’t touch.
- **Creepy_Difference_40** (11↑): The leverage is routing discipline, not just cheaper tokens. Most teams don't lose money because they picked the wrong model once — they lose it because every task defaults upward and nobody records why a handoff happened. If you can keep the classification visible and review the misses, the router becomes a control layer instead of just a cost hack.
  - **QueefLatinahOG** (3↑): Dude. This is straight up the most useful response so far.

Much obliged.
    - **dawtips** (6↑): You just responded to a bot
- **vedmaka** (2↑): It feels like every comment here is left by bots… what about privacy? Because you basically offer people to route their chats to you. Also whats the difference from the other oss routers available out there?
  - **QueefLatinahOG** (1↑): Need to work on my bot id skills. You’re not the first to say it but my spidey senses haven’t triggered.

TBH I’m unsure, I’ll get into research mode and figure that out. I just know how much further my subscriptions have been running for me.
- **TheTentacleOpera** (2↑): I built my Switchboard plugin to do something similar on the individual dev scale: https://github.com/TentacleOpera/switchboard

When the planner agent writes a plan, they score it 1-10 on a complexity scale. Move the plan card into the coder column then the plugin auto routes it to one of 3 terminals depending on complexity - lead coder, coder and coder. You choose which model lives in which terminal.

It's proven very useful for my own coding.
  - **QueefLatinahOG** (1↑): This is a really clean implementation of the same core idea. Agent-scored complexity driving model selection. The Kanban-to-terminal routing is intuitive and the fact that you control which model lives in which terminal is the right call for devs who know their stack.

The difference with Followloop is the consumer layer: automatic classification, no setup beyond a URL, 12+ free models in the cascade. But for developers who want explicit control over the routing logic, what you’ve built is a better fit. 

Different problems, same insight underneath.

Checking out the repo.
- **Born-Exercise-2932** (2↑): the routing layer is underrated as a design decision. most people treat model selection as a config choice but once you have heterogeneous tasks hitting the same pipeline it becomes a real systems problem. curious how you're handling confidence scoring when the task classification is ambiguous — like when a request could reasonably go two directions
  - **QueefLatinahOG** (1↑): Ambiguous tasks default to moderate, that’s the intentional conservative position. The classifier is looking for explicit signals in the instruction, not inferring from absence. If nothing pushes it clearly simple or clearly complex, it lands in the middle tier and routes to the best available free model that can handle reasoning, not just extraction.

The real handling for genuine ambiguity is the cascade underneath. If the moderate-tier model returns something that fails formatting or looks incomplete, the next model runs automatically. So the system corrects without the user seeing it rather than trying to resolve the ambiguity upfront with a confidence score.

Post-task eval scoring is the right next layer. Run the output through a lightweight checker before returning it, escalate if it fails. That turns the cascade from a failure recovery mechanism into a quality gate. Building it.
- **Born-Exercise-2932** (1↑): the habit of routing everything to frontier models is real and expensive. the insight that most classification, summarization, and extraction tasks work just as well on smaller models is correct but hard to act on without the routing layer you built. the interesting next question is whether the cost savings hold as task complexity increases or if there's a cliff where smaller models start failing in ways that are hard to detect
  - **QueefLatinahOG** (1↑): The cliff is real and worth being honest about. The cascade handles hard failures automatically - 12+ free models in the chain (Cerebras, SambaNova, Groq, Gemini Flash, Mistral, Cohere, OpenRouter, GitHub Models and more), so if one errors the next runs instantly. But silent quality degradation on moderate tasks is harder to catch. Current approach is keeping genuinely complex reasoning reserved for frontier models via task classification. The routing review page (just shipped) shows every decision — that’s the first step toward spotting where your personal cliff actually is.
- **ultrathink-art** (1↑): Works well for single-turn tasks; the edge case is agentic chains where a task that classifies as 'simple' ends up spawning 8 tool calls. Routing it to a fast small model saves $0.02 then it fails on tool call formatting at step 5, which forces a retry on a frontier model anyway.
- **Ordinary_Breath_8732** (1↑): 157x cheaper per token stat is the kind of number that actually changes behavior for anyone running AI at any real volume. the core insight that most daily tasks dont need frontier model quality is right and most people ignore it purely out of habit. the Cerebras fallback for simple tasks is a smart choice too the speed there is genuinely different from everything else. curious how the complexity classifier handles edge cases where a seemingly simple task actually needs nuanced reasoning - does it route wrong often enough to be a problem
