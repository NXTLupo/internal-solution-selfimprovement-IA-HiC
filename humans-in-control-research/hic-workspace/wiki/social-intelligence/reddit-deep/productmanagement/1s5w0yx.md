---
id: social-intelligence/reddit-deep/productmanagement/1s5w0yx.md
url: "https://www.reddit.com/r/ProductManagement/comments/1s5w0yx/how_are_your_enterprise_dev_teams_actually_using/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "How are your enterprise dev teams actually using AI?"
author: "PinegroveZen"
date: "2026-03-28T09:41:28.000Z"
score: 7
upvote_ratio: 0.71
num_comments: 39
flair: ""
extracted_at: "2026-06-24T22:14:23.449Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c0"
    char_span: [0, 1506]
    sentence_count: 9
    key_terms: [using, customer-specific, productmanagement, systems, integrations, enterprise, interested, comments]
    concepts: [customer-specific, productmanagement, using, systems, integrations]
    token_count: 319
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1s5w0yx/how_are_your_enterprise_dev_teams_actually_using/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c1"
    char_span: [1520, 3506]
    sentence_count: 27
    key_terms: [agents, code, add, copilot, agent, good, need, developers]
    concepts: [agents, copilot, agent, developers, understand]
    section: Comments
    token_count: 451
  - id: "social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c2"
    char_span: [3508, 5578]
    sentence_count: 9
    key_terms: [enterprise, teams, context, product, systems, legacy, pinegrovezen, prototyping]
    concepts: [enterprise, teams, context, product, systems]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c5"]
    section: Comments
    token_count: 450
  - id: "social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c3"
    char_span: [5580, 7714]
    sentence_count: 12
    key_terms: [code, legacy, like, initiative, knowledge, something, codebase, question]
    concepts: [legacy, initiative, knowledge, something, codebase]
    section: Comments
    token_count: 476
  - id: "social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c4"
    char_span: [7716, 9537]
    sentence_count: 16
    key_terms: [dev, because, context, experienced, code, don, codebase, starting]
    concepts: [because, context, experienced, codebase, starting]
    section: Comments
    token_count: 382
  - id: "social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c5"
    char_span: [9539, 11210]
    sentence_count: 9
    key_terms: [build, building, teams, use, want, year, complex, context]
    concepts: [build, building, teams, complex, context]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c2"]
    section: Comments
    token_count: 377
  - id: "social-intelligence/reddit-deep/productmanagement/1s5w0yx.md#c6"
    char_span: [11212, 12037]
    sentence_count: 4
    key_terms: [specific, context, people, new, use, nkondratyk93, enterprise, centrally]
    concepts: [specific, context, people]
    section: Comments
    token_count: 169
---
# How are your enterprise dev teams actually using AI?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1s5w0yx/how_are_your_enterprise_dev_teams_actually_using/)
Posted by **PinegroveZen** · **7↑** · **39 comments**

I’m a product person at a mid-to-large enterprise with roughly 500–700 employees, lots of interconnected systems, and some customer-specific customizations layered on top of a broader platform.

Leadership is asking how AI can help speed up our roadmap on the dev side. The challenge is that our codebase is large, our systems are intertwined, and a lot of the value depends on domain knowledge that lives in people’s heads.

The truth is I don't think anyone feels super confident of using AI to create net positive gains within our current products.

But I don't want to be closed minded, if there are PMs in these types of Orgs, would love to hear some thoughts.    
  
I’m not really talking about using AI to be more productive or generate docs. I’m more interested in how engineering/product teams are actually using it to move big multi-quarter initiatives faster.

* What use cases have been the most realistic for complex codebases and integrations?
* What guardrails or rollout patterns have worked in your orgs?
* What would you avoid because it sounds good but doesn’t work in practice?

I’m especially interested in advice from people at companies with lots of integrations, internal systems, or customer-specific configuration.

## Comments

- **beth_maloney** (16↑): I'm pretty tired so will keep this short. You need to invest in the AI rollout for it to be effective. You can't just give everyone a copilot/claude licence and hope for the best. 

Initially you should concentrate on getting knowledge out of people's heads and somewhere the agents can access it. Rough order of priorities

1. Add agents.md to the repos and to sub projects as appropriate. Research what makes a good agents.md and don't just use the agent to generate one. Whenever the agent makes a mistake add that info to the agents.md
2. Refactor the code base to remove legacy code and simplify code. This will make it easier for code agents to understand your code base. Agents are very good at refactoring so this will be much faster then before AI
3. Add skills for common actions. Add it for creating JIRA tickets, reading logs, etc. Anything that requires knowledge about your company/setup but doesn't always need to be in context 
4. Training sessions from developers who are making heavy use of AI

Lots more stuff you can do but I think the above are a good starting point.
  - **TechFlameMaster** (7↑): Spot on. I support the developer tools for 38K developers. You need to invest in that roll-out strategy. And you Layed it out perfectly. 

We’re a GitHub shop, so we’re deep into their ecosystem. Heavy users of GitHub copilot, beginning to used their Copilot Coding Agent. But we are also launching other platforms like Codex. 

All of this requires a concerted effort to engage the developer community to leverage these tools. Investing that now and you’ll see the gains.
  - **PinegroveZen** (4↑): Thanks for that. I'll just be super clear that I'm not in engineering but still wish to understand. From what I gather, to do this, there is pretty significant upfront cost to getting AI ready. You can correct me if I read that wrong.

But with an org that is 20-30 years old, there is lots of legacy code that will have to be 'simplified'. 

That said, this is really good high level so appreciate the thoughts.
    - **TechFlameMaster** (1↑): Engineers who are properly trained on the AI tools can make big strides in reducing g tech debt from old systems
- **frustrated_pm26** (7↑): the gap between what enterprise teams say they're doing with AI and what they're actually doing is massive. the official answer is 'code generation and testing.' the reality is most devs are using it as a search engine replacement to understand legacy systems nobody documented. the teams getting real value are the ones that gave their AI tools access to their actual product context - not just the codebase, but the decision history, the customer requirements, and the architectural constraints. without that context, the AI generates code that compiles but doesn't solve the right problem. how is your team handling the context gap between what the AI can see and what it needs to know?
  - **Afton11** (3↑): Hear hear - I work in a megacorp and why you described is 100% what’s actually happening.  Leadership looooves to be invited by AI sales people to speak at conferences at great length about how “AI enabled” we apparently are 😂.
    - **PinegroveZen** (1↑): Perception is not reality. 

From what I see, start ups and small teams are using AI to create/ship fast. Do things like prototyping. Then I see Product influencers basically talking about how they personalized their workflow, but haven't seen much practical application to making it useful in legacy product/enterprise platforms.

This thread has been helpful!
  - **PinegroveZen** (1↑): Hey thanks for sharing your thoughts here. I read stuff on LI all the time about AI gains but it almost always seems to prototyping and rarely something in legacy systems.   


The pattern I'm gathering here is that AI in enterprise has some potential but there is a healthy up front cost that has to be weighed against other things.   
  
Any way, I ask because I'm part of strategic teams and all of these costs involve tradeoffs to how we progress through the year. 

To answer your question " how is your team handling the context gap between what the AI can see and what it needs to know?" --- I don't think we've handled that at all. Which is why I even started this thread. :)
  - **DaveC271** (1↑): That’s why I built the platform that I have, the context and knowledge gap lives not just in code, but in people’s head, different documentation, hubspot and crm tools. It also lives in the team, legacy knowledge and old architectural designs that were made on a teams call and bugs that were fixed in an incident wash up
- **Confident-Corner3987** (3↑): This is a really honest take, and seems to be pretty common in complex environments.

The biggest shift I’ve seen is that AI doesn’t really speed up multi-quarter initiatives directly. It usually speeds up the friction.

Things like:
understanding legacy code faster

tracing dependencies across systems

onboarding new engineers into complex domains

reducing back-and-forth during design and review

Where teams tend to struggle is trying to apply AI at the “big initiative” level instead of the workflow level.

What’s worked better in practice is:
pick a specific, low-risk engineering workflow (e.g., debugging, test generation, code explanation), put light guardrails around it, and run it as a controlled pilot.

Once you can show consistent gains there, it becomes much easier to expand.

The orgs that get stuck are usually trying to jump straight to transformation without that middle step.
  - **PinegroveZen** (1↑): Yeah I wouldn't say we are stuck or unstuck, just that the question has been raised -- "Can we use AI to speed up?"

Fortunately, its not an initiative we are being forced with. But something to explore and understand what starting looks like.
- **ii-_-** (3↑): Making it up as we go along, just like every company
- **brianly** (2↑): There is a misconception is around legacy code. It’s normally true that if you just ask Claude to do something with the codebase that it’ll struggle. That’s not a surprise and a human wouldn’t be looking across the whole codebase without experience and making changes in that way.

Any kind of competent dev that is new to the codebase is going to be expected to start around the edges because that requires less context. This is exactly where AI tools should be applied to begin. In time the whole codebase is instrumented for AI.

If an experienced dev with no AI experience is given these tools (I’d assume an element of curmudgeonry behavior from an experienced enterprise dev resulting in closed-mindedness) they have the context in their head but don’t know how this affects the AI. Lack of training and a growth mindset result in struggles if you don’t have training or change management. 

Devs have pride in writing code for humans. That isn’t the only job any more. These people naturally focus on elements affecting humans whereas your very productive dev who cares less about the craft may not get as blocked on the supposed quality of output. 

Obviously, you don’t want to generate garbage but you can be held back by those who overly focus on how things used to work. Mid-level devs without this baggage often use AI more effectively because they see a cross-roads and an AI future where they are the senior dev in that context.
  - **PinegroveZen** (1↑): Wow, this is one of my favorite responses. What I'm seeing across these answers is that a starting point needs to be defined and established.

I think the biggest risk here of using AI to speed up development is suggesting a plan in the wrong way. I really like how palatable starting around the edges is. That makes the most sense to me. 

And just to share my sense of the dev perspective, they generally seem open but also don't think code is the hard part. The hard part is understanding how what they build now affects 10-20 years of legacy code, how it interacts with other systems, and the technical approach because of that.

Great thoughts here, thank you.
- **hippohoney** (2↑): in complex systems ,ai helps most with understanding not building ,codebase exploration ,impact analysis and test generation .full feature delivery is still very human driven in practice
- **gtwooh** (2↑): Drowning in a sea of PRs
- **robobearded** (2↑): it feels like my org had the opposite experience from most of the comments I read in the thread. we went all in on AI and it actually helped a ton, even with messy legacy code. big rewrites and migrations got like 5x faster with AI support.

That said, it wasn’t just tell Claude what to build and hope it'll work. teams (v senior devs) spent a couple weeks upfront just digging into codebases with AI, building proper context, setting instructions  & guardrails, and from what I hear in meetings, that prep made all the difference. t

rough pattern was: build context first, then start with super trivial stuff, document what works/doesn’t, add tons of automated tests (with AI), then ramp up into more complex tasks.
- **UgotGoose** (2↑): I am at a similar sized company. The engineers have all had Github Copilot for over a year now. Last year there was some experimentation with cursor. Some improvement, but not significant. This year we’re doing more of a wider rollout focused on adoption. We want to give teams space to use Claude (Code) to build want they want to build rather than force its use on roadmap.

We figure that the teams will become more familiar with the tech if they are driven to use it building tools that they find fun to build. They can then take those skills gained without the pressure of a sprint burn down and apply that to work.

I believe that the gains are tough to centrally plan. This is new tech that evolves quickly. Companies that have more people exploring and crafting new ways to make this stuff work for your org will do far better than the ones who attempt to redesign workflows top down. Weave the curiosity into the culture by creating forums for people to show off what they built and what they learn.
- **nkondratyk93** (2↑): from the PM side - the biggest blocker we hit in enterprise AI rollouts isn’t the tooling, it’s context. dev teams with tightly coupled systems and lots of tribal knowledge find that generic AI tools give mediocre results until you actually invest in feeding them the right context.we’ve had more success with targeted use cases (specific module, specific type of task) than broad "everyone use Copilot" mandates.
