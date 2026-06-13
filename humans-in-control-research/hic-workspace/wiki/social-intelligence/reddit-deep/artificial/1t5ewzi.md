---
id: social-intelligence/reddit-deep/artificial/1t5ewzi.md
url: "https://www.reddit.com/r/artificial/comments/1t5ewzi/spent_two_days_at_the_ai_agents_conference_in_nyc/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "Spent two days at the AI Agents Conference in NYC. Most of the companies there were betting on the wrong moat."
author: "jradoff"
date: "2026-05-06T14:41:07.000Z"
score: 147
upvote_ratio: 0.92
num_comments: 89
flair: "Research"
extracted_at: "2026-05-11T17:27:04.775Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c0"
    char_span: [0, 2141]
    sentence_count: 17
    key_terms: [engineering, agents, companies, outcomes, software, old, artificial, conference]
    token_count: 457
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c1"
    char_span: [2143, 4461]
    sentence_count: 18
    key_terms: [prompt, architecture, architectures, observability, magic, engineering, open-source, data]
    token_count: 457
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c2"
    char_span: [4463, 5776]
    sentence_count: 8
    key_terms: [layer, prompt-architecture-as-product, risk, industries, regulated, wrapper, middle, "isn't"]
    token_count: 276
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c3"
    char_span: [5790, 7401]
    sentence_count: 11
    key_terms: [replacementready394, likely, critical, agentic, because, systems, whether, agents]
    section: Comments
    token_count: 367
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c4"
    char_span: [7403, 8636]
    sentence_count: 7
    key_terms: [replacementready394, agentic, bright-secretary-710, does, full, gets, jobs, png]
    section: Comments
    token_count: 332
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c5"
    char_span: [8638, 10788]
    sentence_count: 13
    key_terms: [mcp, systems, integrations, legacy, problem, implemented, integration, data]
    section: Comments
    token_count: 495
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c6"
    char_span: [10790, 12965]
    sentence_count: 17
    key_terms: ["it's", coding, different, use, good, hard, want, understand]
    section: Comments
    token_count: 480
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c7"
    char_span: [12967, 15026]
    sentence_count: 15
    key_terms: [programming, because, people, going, "doesn't", having, "don't", programmers]
    section: Comments
    token_count: 430
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c8"
    char_span: [15028, 16323]
    sentence_count: 7
    key_terms: [something, common, system, integration, understand, different, substrate, enough]
    section: Comments
    token_count: 289
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c9"
    char_span: [16325, 17999]
    sentence_count: 8
    key_terms: [software, own, connectors, companies, database, players, early, means]
    section: Comments
    token_count: 358
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c10"
    char_span: [18001, 19395]
    sentence_count: 9
    key_terms: [knowledge, converts, software, startup, domain, people, demonstrate, effectively]
    section: Comments
    token_count: 321
  - id: "social-intelligence/reddit-deep/artificial/1t5ewzi.md#c11"
    char_span: [19397, 21614]
    sentence_count: 18
    key_terms: [saas, cloud, companies, costs, company, "you're", doubling, industry]
    section: Comments
    token_count: 475
---
# Spent two days at the AI Agents Conference in NYC. Most of the companies there were betting on the wrong moat.

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1t5ewzi/spent_two_days_at_the_ai_agents_conference_in_nyc/)
Posted by **jradoff** · **147↑** · **89 comments**

One speaker (a VC) said his number for evaluating AI-native startups is ARR per engineer, and that the number ought to be going up. Almost every talk and every booth at the AI Agents Conference was selling a fix for something that broke this year when agents hit production. Observability, governance, supervisor agents, data substrates, "someone's gotta babysit the bots."  
  
But what's actually still going to be around in a couple years? What's defensible and durable?

The old SaaS pitch was simple. We bundle the expensive engineering investments and domain expertise into a tool. You'd pay for the tool and generate outcomes, but it would be rare for the software company to have real alignment to the actual value created from those outcomes. 

That's breaking from two ends at once. In the direct-from-imagination era we're moving towards, engineering labor is approaching free. One of the most telling trends is the shift from companies bragging about the size of their engineering teams, towards how much ARR they can generate per engineer.  
  
You can vibe-code much of what those booths were selling in a few days or weeks if you have the domain knowledge.  The old software model was actually based on under-utilization; the most profitable SaaS companies are frequently those whose customers underuse it (fixed price for the customer, but variable cloud costs for the vendor).  
  
Pricing is moving to "token markup." Maybe we'll get to 2-4x revenue for the software, because outcomes are more valuable; but margin compresses because transactional intelligence (i.e., the cost of running the LLMs that power many systems) is basically arbitraging token costs against outcome value.

So everyone on that floor was implicitly betting on a new moat to replace the old one.  I'm not too confident that these will hold...

The most popular bet was on encoded domain expertise (e.g., the sales engineers at Harvey, a legal AI platform, are actually lawyers). I think this works \*now\* because we're still in the phase of "wow, this technology works like magic."  I'm less convinced this is actually durable.  
  
Why: Prompt architecture is text. It's portable. The expertise underneath it is often abundant (e.g., there are over a million lawyers in the USA). The righteous destiny for this category ought to be open marketplaces of prompt architecture and/or crowdsourced best-practices. Not trade secrets. The companies trying to build closed prompt moats are going to lose to open ones that iterate faster (which simply parallels the fact that much software engineering is rapidly becoming commoditized to agentic engineering and the burgeoning quantity of ready-made GitHub repos).

There are many people pursuing the data substrate; in short, this mirrors the early days of the Web when everyone scrambled to open up legacy data to dynamic standards-based Web UI. Agents will have 100-1000x the data demands of these Web apps, so it makes sense that we need tools to connect them, govern them and comply with regulatory obligations.  
  
Newer entrants extend this further, wiring up databases, pipelines, Slack threads, and tickets into context graphs agents can reason over. As I noted above, all this still seems magical. Connect a database, watch an agent crawl the schema and produce a chatbot interface and easy-to-change dashboards.

But strip the magic away and most of these are prompt architectures on top of LLMs plus a data-ingestion layer. Once data-access standards mature (MCP is already doing this) and prompt architectures go open-source (alongside much of this wisdom increasingly getting pretrained into the LLMs themselves), that magic stops being proprietary. You'll be defending yourself against the same architecture built internally by your customer's eng team, or against an open-source version that's objectively better.

The observability incumbents: these might do better but only at Stripe-like ubiquity where trust is the overriding value (who doesn't trust Stripe at this point?). The ones who survive are probably going to fuse with the audit and compliance function rather than stay pure observability.

That's why I keep coming back to one arbitrage that seems critical: trust. This will be especially important in regulated industries, but it reminds me of the old (albeit now hilariously outdated) adage about "nobody ever got fired for choosing IBM."  If your competitor can be vibe-coded over a weekend and your customer is a bank, why do they pay you 50x more? It isn't the engineering, it probably isn't even the expertise. The data plumbing will get commoditized, so it can't be that either... It's that you've shifted the risk to a third party who can actually price and defend against risk: SOC2, the named CEO who testifies in court and Congress, a legal team that takes calls, an indemnity wrapper for underwriters. Maybe this means that things actually get commodified into a financialization wrapper, rather than a way to package R&D (FinTech startups back to the front?!)

The version of this future I'd actually bet on: a commodity substrate (LLMs plus open prompt architectures plus standardized data access), topped by a thin layer of regulated insurance companies that price the risk of agent failure in compliance-driven industries. The middle layer (prompt-architecture-as-product vendors) is vulnerable to an awful lot of margin-squeeze.

Most of the floor was trying to build that middle layer.

## Comments

- **Born-Exercise-2932** (12↑): the ARR per engineer metric is interesting but it conflates two very different things: teams that built lean because they were disciplined, and teams that look lean on paper because agents are doing work that used to require headcount. the second group is where the real bets are happening, the question is whether the agents are actually reliable enough to count as staff or whether there's just hidden human oversight that doesn't show up in the org chart
  - **jradoff** (4↑): the trajectory of the metric is likely more important than the baseline value
- **ReplacementReady394** (40↑): I was a recent AI convention in SF and I overheard someone confidently say that full agentic AI is two years away. Straight up snake oil.
  - **HandsomJack1** (18↑): VC driven markets are full of BS as a matter of course. But the level of absolute catagoric lies coming out of AI is at a level I never even imagined. 

Meanwhile, respected analysts who don't have a vested interest in AI are generally projecting that by 2035 AI is likely to have still failed to have achieved broad industry impact. And likely to have improved cost of software development by > 35% (SDLC).

In our company I have put a hold on any agentic work on any critical systems. I refuse to expose ourselves to the bleeding edge of this trainwreck.
    - **ReplacementReady394** (6↑): Smart move. Pick up top talent from doomed companies
    - **Free-Competition-241** (4↑): Wait, you mean you're refusing to deploy unproven architectures and solutions onto critical systems?  Wow.  This is big brain time.  Bravo.

But then again you're in marketing, so that does in fact make you an expert on this and every topic.
  - **jradoff** (17↑): What would "full agentic AI" even mean though?  We have full agentic AI now.  The applications are just not very mature.
    - **ReplacementReady394** (14↑): It was just another buzzword for the guy. He was selling something today with the hopes and promises of tomorrow. I work the majority of the AI shows in SF and it always gets me when a speaker talks about the jobs they can cut (jobs like theirs) with a big enthusiastic smile on their face.
    - **porkusdorkus** (4↑): Agent does your customer service, orders supplies, payroll… throws a company picnic, gets sad it can’t attend, fires everyone.
  - **Bright-Secretary-710** (5↑): Was at this same conference… was one of the worst conferences I have ever been to just jargon talk. And a bunch of combines trying to sell on products I could easily make myself with almost no real value add. This space is insane
    - **ReplacementReady394** (1↑): My favorite was Artisan’s sign that read, “Stop hiring humans.”
    - **jk_pens** (1↑): https://preview.redd.it/ocyqrqdo8lzg1.png?width=864&format=png&auto=webp&s=7f2fdb9d4d0774b9466f20c398e82326118fa24b

All of this has happened before. All of this will happen again.
- **StruggleNew8988** (7↑): It feels less like a moat problem and more like an integration problem, where the value is in the messy middle layer connecting agents to legacy systems.
  - **Heavy-Foundation6154** (4↑): I have to agree. I work on [Airia](http://airia.com)'s integrations team, so literally all I do every day is make sure agents can seamlesly connect to legacy systems. What someone could say is "well MCP solves that" and while that is true, it omits a big part of the picture. I love MCP. I've literally created the worlds more complete MCP Gateway product with just about 1300 (official, no-community written, remote) servers. While Zapier and some of the others have more, really all they do is programmatically wrap the APIs they already had (which is just really bad MCP form and causes too many issues). But the big problem is that many of even the official MCPs like Atlassian or PostHog are poorly implemented (PostHog has 119 tools in theirs... why? smh) so just saying MCP doesn't actually solve anything. The point of integrating with AI is so that the integrations are meaningful, efficient, and SECURE. So while I spend 15 minutes every morning adding a couple new MCP servers to the platform, the entire rest of my day is spent actually improving the integration experience for the LLMs so they can actually do what they need to without risking security/governance or wasting an ungodly number of tokens (Some tool responses are in the 10,000s of tokens when the LLM only needs a small section)

TLDR: You're 100% right, and I proceed to rant about how poorly MCPs (the supposed solution to AI integrations issues) are actually implemented lol
  - **delftblauw** (1↑): I’ve been a data engineer for 20 years, most of it as a consultant helping clients migrate from legacy systems to shiny ERPs.  

Connecting legacy data to new data is a constant problems and systems in an enterprise regularly shift from upgrades to platform changes.  It is never a set it and forget it.  At best you get some consistency in tech debt accrual until you have to pay it off.

The wild thing to me is one business can use the same software in wildly different ways.  One industry may use the free form text “sticky note” on a screen for quick reminders on each customer account, another other may have users using it to log all of their compliance issues for a project.  Same field in the database, wildly different uses that could hold significant challenges integrating.
- **TikiTDO** (5↑): There's one change in mindset that needs to happen. You don't "babysit the bot" you "work with the bot" to "do a thing." It becomes a lot more clear when you treat it like a co-worker that's really good at some things, and just impossibly bad at others. If you can explain in in a flow chart or a workflow file, then great. Use an AI. If you need a mix of agility, multi-domain awareness, and a stake in the long term outcomes of a thing, you probably want a person. It's up to you to give it the work it's good at, and to handle anything it's not good at.

I keep hearing this refrain of "coding will go away, because coding will be so easy so everyone will be doing coding." 

The thing is, coding has never been "hard." You have a logical thing you want to do, and you want to write a logical explanation of what that thing is. The only "hard" part was generally dealing with shit somebody else wrote (be it a different person entirely, or just you in the past). That, and the amount of damage it did to your fingers reaching for all the fuckin punctuation we gotta use. I don't know how people without a decent programmable, ergonomic keyboard live.

The truly "hard" part of coding is learning to understand what sort of things you can and can't do when building systems. What sort of effect decisions will have on the outcomes when the project runs it's course. It's knowing that if you build your entire business on an algorithm that runs in O(n^4) then you might have trouble scaling it to the millions of users you need to be profitable. It's understanding when to make infrastructure decisions, and which you can hold off in order to contain costs. It's being able to speak with different types of stakeholders, and use language they can understand.

In the same way having a typewriter/computer didn't make everyone a novelist, and having a camera on their phone doesn't make everyone a photographer, being able to ask the AI to write code doesn't make people programmers. Internal engineering teams probably aren't going to rewrite your one dashboard, because those teams will already be drowning in requests to rewrite dozens of dashboards. Which will constantly change because of course they will, and the execs trying to explain to the AI what they want will just confuse themselves because they don't understand things like "data relations" and "query compilers". 

Essentially, the thing that people always fail to account for is that having more software doesn't reduce the need for software engineers. It just spreads it out. In other words, people need to accept that they're probably not going to get a job with a sweet paycheck in a huge mega-corp unless they can show a lot of worth. In other words, we're going to see a LOT of programmers suddenly realise; "Hey, I know programming, and I can tell AI how to do things way better than some company with 8 layers of management can."

Mind you, I'm not saying that if you "know programming" that you will somehow do great in the AI age. Knowing programming just means that right now, early on in the AI age, you have a step up compared to people that don't. You still need to develop your actual skills of interacting with AI, understanding what it's doing, and when to stop/steer it, and how to guide it to the outcomes you want. It's just that you can do so through programming easier than you can through many other methods.

As for the common substrate idea; sorry to say, but you've reached that point of dreaming about an impossible ideal. In reality, we're just going to get dozens of splintered, fragmented standards that don't agree with each other... Because of course we are. Nothing about humanity, human history, or human psychology would suggest otherwise. The rest of us will be stuck in the middle trying to find our own middle path.

tldr: [AI infographic](https://imgur.com/a/rYtlM6P)
  - **jradoff** (0↑): I'm not proposing any particular "common substrate" -- simply that crowdsourcing data integration practices and processes into prompting architecture is just a natural extension of what open source codes.  The nature of LLMs and agents is that they also solve for a lot of the interoperability problems of the past, albeit in a less deterministic way.
    - **TikiTDO** (1↑): The way I see it, LLMs already are this "common substrate." At least as much as we're likely to get. If you're not sure about something you can paste it into an LLM and get it tranlsated into something you understand.

Beyond that; honestly it's mostly down to the fact that I've heard conversations about this sort of "common data integration system" for decades now, and I've been involved in such efforts myself. The actual issue you end up having to deal with is "nobody wants to use your system, because they use a different system."

Even in open source there's multiple projects that do the same thing in different ways. You need something generic enough to capture all that complexity, but also simple enough that an average person can understand it. These two concerns end up competing, and I'm not sure how possible it is to reconcile.

So it's not that I'm against the idea. I would love it, and I've even tried to make something like it happen. It's just through that journey I learned enough about human nature to realise the task itself may be impossible, at least for me.
- **nortob** (6↑): You are a mad prophet. Keep preaching.
- **Independent_Tip_2091** (5↑): What about uptime, security, integration reliability, permissions, governance, edge cases, procurement, scaling, observability, maintenance, support, migration and change management? Lots of times companies hire an external vendor because they don’t want to or can’t do it themselves. If you are a retail business, for example, ideally you’d want to focus as much time on selling and zero time on maintaining your own software.
  - **jradoff** (2↑): The barrier to entry in all of the things you listed is decreasing. That means there will be many new entrants (not only "build it yourself" but lots of new competitors building AI-native software) and that means pricing power decreases and margins compress... even if a company prefers not to maintain its own software.
- **jk_pens** (8↑): We are still in the early frothy stage where there are plenty of gaps in the technical framework required to make all of this work reliably at scale, so it’s not surprising that there are a zillion middleware companies trying to plug those gaps. It was similar in the late early stages of the web, in particular I remember there being a bunch of “connect your web site to a database” players who lasted only until big database players had built their own connectors and open source databases with connectors became available and sufficiently reliable. 

A lot of these middleware & gap-filling startups are effectively acquhire plays even if they act like they are not. While there are millions of people now who know how to use AI coding tools, there’s still a relative dearth of people who understand all of this deeply enough to contribute at a large software enterprise. Building solid solutions to AI-created problems, is a way to demonstrate expertise and domain knowledge.
  - **jk_pens** (2↑): Just had a memory reappear: when I was in CS grad school I somehow ended up on a side gig with another student helping a major publication connect their website to a database for collecting survey responses. It took us multiple weeks to get it to work and we had to license software from some startup. I think it still used cgi-bin as the gateway to the DB code. :-P  This would have been in roughly 1995 or so.

Can’t remember the name of the startup, would be interesting to know what happened to them.
  - **jradoff** (1↑): I'm seeing the same parallels!
- **Ok_Recipe_2389** (4↑): The moat that matters in AI services is domain knowledge, not platform. You can build an agent framework in a weekend now. What you cannot shortcut is knowing that a law firm phone intake converts at 2.6% while a properly configured AI form converts at 17.6%. Or that a dental office loses $195K annually to no-shows that a $75/mo automation recovers 30-40% of.

Every company at that conference is building horizontal infrastructure. The value capture happens vertically. The company that knows exactly which workflow in a specific industry bleeds the most money, and can configure off-the-shelf tools to fix it in 30 days, has a moat that no amount of vibe-coding can replicate. You cannot prompt-engineer industry knowledge.
- **That-Signature-6319** (3↑): This honestly feels true. A lot of AI companies are racing to build wrappers and moats, but most of it feels temporary once the tech becomes normal and open source catches up. The real value might end up being trust and reliability, not just the AI itself. Been seeing similar conversations around runable too, where execution is getting easier but trust still matters most.
- **Ttbt80** (3↑): \> the most profitable SaaS companies are frequently those whose customers underuse it (fixed price for the customer, but variable cloud costs for the vendor).

I disagree with this the most, although I don't think it really contradicts your main point. But this is, at best, a gross generalization. 

SaaS profit is not coupled to cloud costs for several reasons. One, SaaS has extremely low cost per additional user. Doubling the number of users on a SaaS doesn't mean doubling cloud costs, unless you're already a huge company and have optimized your cloud infra to the penny. Secondly, even if cloud costs do rise for you to onboard a single user, SaaS often sells on a per-seat or usage-based model, meaning that profits rise as well.

Again, I think this was a very small point in your post overall, but it bugged me enough that I had to say something. The most positive SaaS companies have positive net recurring revenue, and that usually means usage across clients is increasing, not decreasing or staying low.
  - **jradoff** (2↑): Good points here. You're right in that I should have just said COGS (not singled out hosting/cloud expense). 

I'll stand by the claim that pricing according to under-utilization is a widespread strategy in SaaS (not unique it it either: e.g., that's basically the gym membership model). But you're probably right that the truly exceptional companies are less dependent on that margin.
