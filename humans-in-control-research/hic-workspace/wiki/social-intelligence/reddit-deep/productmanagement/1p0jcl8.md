---
id: social-intelligence/reddit-deep/productmanagement/1p0jcl8.md
url: "https://www.reddit.com/r/ProductManagement/comments/1p0jcl8/does_anyone_have_a_clear_raci_on_product_and_tech/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Does anyone have a clear RACI on product and tech teams?"
author: "canacho93"
date: "2025-11-18T18:13:58.000Z"
score: 4
upvote_ratio: 0.67
num_comments: 16
flair: "Stakeholders & People"
extracted_at: "2026-06-14T15:28:02.846Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1p0jcl8.md#c0"
    char_span: [0, 1682]
    sentence_count: 11
    key_terms: [productmanagement, "i'm", trying, been, devs, head, boundaries, engineers]
    concepts: [productmanagement, trying, boundaries, engineers, comments]
    token_count: 364
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1p0jcl8/does_anyone_have_a_clear_raci_on_product_and_tech/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1p0jcl8.md#c1"
    char_span: [1696, 3811]
    sentence_count: 24
    key_terms: [team, people, teams, responsible, raci, step, take, want]
    concepts: [people, responsible, teams, depends, getting]
    section: Comments
    token_count: 482
  - id: "social-intelligence/reddit-deep/productmanagement/1p0jcl8.md#c2"
    char_span: [3814, 6216]
    sentence_count: 18
    key_terms: [team, testing, career, function, influence, ladders, manager, level]
    concepts: [testing, career, function, influence, ladders]
    section: Comments
    token_count: 509
  - id: "social-intelligence/reddit-deep/productmanagement/1p0jcl8.md#c3"
    char_span: [6218, 7890]
    sentence_count: 11
    key_terms: [the-limits-of-raci-and-a-better-way-to-make-decisions, people-and-organizational-performance, expectations, communicate, engineering, stakeholder, job, risk]
    concepts: [expectations, communicate, engineering, stakeholder, potential]
    section: Comments
    token_count: 375
  - id: "social-intelligence/reddit-deep/productmanagement/1p0jcl8.md#c4"
    char_span: [7892, 9996]
    sentence_count: 23
    key_terms: [raci, article, problem, authoritative, interesting, isn, want, authority]
    concepts: [authoritative, article, problem, interesting, authority]
    section: Comments
    token_count: 465
  - id: "social-intelligence/reddit-deep/productmanagement/1p0jcl8.md#c5"
    char_span: [9998, 11967]
    sentence_count: 18
    key_terms: [roles, product, person, engineering, devs, like, understand, pressure]
    concepts: [roles, product, person, engineering, understand]
    section: Comments
    token_count: 428
---
# Does anyone have a clear RACI on product and tech teams?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1p0jcl8/does_anyone_have_a_clear_raci_on_product_and_tech/)
Posted by **canacho93** · **4↑** · **16 comments**

I'm fairly new to being a PM, so I'm still figuring out boundaries and have had some friction in trying to figure out those boundaries. 

I'm more used to startup dynamism, problem solving rather than figuring out who's responsible of problem solving, but in this new work environment I was already called out by the head of engineers for appearing 'authoritative' with the devs. So, now I'm trying to be respectful of everyone's agency and not be so pushy as to appear to be trying to step over a leader's authority. 

We've done some simple deployments lately, with conversational AI agents to profile and help customers before sending them further down the pipeline. However, the head of engineers has not been overseeing these projects, seemingly because he's been more focused on a larger scale AI project and a CPaaS he's building. Which has led to the devs deploying solutions that have not been fully tested and has caused unsent messages, duplicated messages and converted leads that were lost because we didn't send them along through the right APIs.

My question is, what is the full scope of my responsibilities as a PM in these cases? Am I at fault of those testing oversights or should the senior devs and head have taken charge? Who's in charge of documenting those post-mortems? And, in general, is there a rule of thumb for me to better understand how and where to push the team to improve quality?

## Comments

- **mister-noggin** (14↑): It depends. There's no single answer. It depends on how your company, your teams, and you want to work. It might also change depending on what's going on. If I have some extra time, I might take on some stuff that devs normally would. If I'm buried I might ask them to do a little extra.

I don't really care for RACI charts as a concept. They're too inflexible, too complicated, and get in the way of making decisions and getting work done. It seems most places I see them pop up are dysfunctional, people are looking to cover themselves, or both.
  - **yeezyforsheezie** (11↑): I have a different take. Forcing a rigid RACI you found online on your team is absolutely a recipe for disaster, however it is a useful starting point to align your teams. I’ve worked with tons of teams, especially when you have new people joining often, and the top thing that causes friction is who’s responsible for what, and beyond that, it’s what is there to be responsible for. The reality is that every team everywhere does it differently, and you need to have the same playbook if you want to play well together. 

What I suggest is this:

1. Define what you and your team thinks is the full product development lifecycle for an idea, opportunity, or feature that comes your way. Map that out step by step. You can Google a PDLC or ask ChatGPT and build/take away from there. This helps your entire team (and org) anchor on what your team does to deliver products. Hopefully this goes more upstream to how your team identifies and prioritizes something.

2. Define the RACI. This is the foundation to establish clarity on who needs to do what for things you’ve decided as necessary for your team (from step 1 above). QA is important but you don’t have a dedicated QA person? Then assign someone on your team. The benefit here is to also clearly call out if someone is getting overloaded or making cases for hiring for specific roles like UXR or PMM. This also helps people raise their hands on area they want to be Informed or Consulted (and if it’s agreed upon) to make sure the don’t feel left out.


This is not to say that people won’t be wearing multiple hats and leaning in where resources are lacking, but at least this builds an understanding of “these are the things we need to do to be successful” and holding everyone accountable to some part of that process.
- **allergicturtle** (3↑): I only see them when things are dysfunctional. Can also vary widely by team size. Ideally teams are given clear, metric driven goals with a timeline, and left to co-create together.
- **masterCAKE** (2↑): It depends on the product function career ladders at your company and the culture of your team. Whenever I start with a new team, I collate the career ladders for each function and the level of everyone on my team. Then I'll get together with the team and do a brown bag on what each function is and isn't responsible for. It sounds like something they should already know, but every single time I've done it, it's resolved huge points of friction across XFN and the team finds it really helpful.

Looking over the career ladders before I do this exercise with the team gives me a heads up on where points of friction will be. I have each XFN create and present their own slide. If it's misaligned with their career ladder, I ask that XFN's manager to weigh in. If it overlaps with other functions, we talk about it until responsibilities are MECE. If the career ladder is missing major functions needed for product development, I talk about it with my manager and the manager of whatever function we agree should own it (come with a proposal so the answer doesn't default to you).
- **MockStarNZ** (2↑): Setting the level of testing is not your responsibility, however you can inadvertently influence it. For example, if a PM is pushing for speed of delivery and tight deadlines then oftentimes it’s the testing that suffers first. 
Also, vague or unclear requirements/use cases can result in testing the wrong thing; a really good engineer could see this and ask for more clarity.

There is a certain base level of quality and testing you should be able to expect, without having to explicitly ask for it. 

This is what a retro or postmortem should work out. What was the cause for lack of testing. Was there something that you could have done or not done that could influence the quality. The majority of the accountability lays with the engineers but there are things a PM can do to influence it. 

If the cause lays entirely with the team, then that needs to be discussed with the EM, you should work together to set expectations for the team, and the EM and Senior Engineers should do the work to make sure the team are hitting those expectations.
- **Rustybot** (2↑): RACI is a fine tool for cross-dept/group/company projects where it’s important that the right people are involved at the right level.

The situation you describe is not one of those situations. It’s the engineering teams lack of adherence to its own practices.

As a PM it’s your job to determine what a product needs to be, for whom, based on stakeholder priorities and limitations, and to communicate a consensus decision and its pros and cons to the stakeholders. It’s not your job to enforce testing frameworks on devs for an absentee engineering lead.
  - **canacho93** (1↑): But, ultimately, if a product fails does it not affect me as well? Regardless of the reason. Or is that too much pressure to put on myself?
    - **Rustybot** (2↑): In a healthy org, failures are an expected potential outcome of any project that contains risk. That’s why getting stakeholder buy-in is critical. You can’t sugarcoat the future, you have to communicate the costs and the potential upside and downsides. 

Managing for uncertainty and achieving your goals despite risk is the job. One of the critical aspects of hitting goals reliably is managing risk.
- **Bowmolo** (2↑): Since reading [this McKinsey piece](https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-organization-blog/the-limits-of-raci-and-a-better-way-to-make-decisions) I avoid RACI as much as I can.

Most likely, you are not in the position to convince the Org to drop that concept (so am I), but the article calls out some problems with RACI that may help you to prevent mistakes.
  - **canacho93** (1↑): Sounds interesting! Thanks for the article
  - **babydemon90** (1↑): Interesting. I’m considering doing a RACI as I need to restructure some teams under me, and I want there to be clear expectations about roles and responsibilities. That article really seems like it’s the same thing, just slightly different definitions of the letters tho
    - **Bowmolo** (1↑): I had a different impression.

Besides that, for the task you mentioned, I consider the nature of work and it's flow towards providing value to be way more important.
- **DeanOnDelivery** (2↑): If someone already thinks you’re being authoritative, a RACI is about the last thing you want to roll in with. It reads like “let me formalize authority by assigning responsibility.” It won’t fix the dynamic, and it definitely won’t soften your presence with the devs.

Put another way, what you’re dealing with isn’t a responsibility-chart problem. It’s an influence problem. The head of engineering isn’t showing up for these smaller deployments. The devs are filling gaps. You’re filling gaps. And the only person upset is the one who isn’t actually in the work. That’s office politics, not lack of documentation.

If you want a tool for your own sanity, a DACI is better than a RACI since it focuses on who’s actually driving the outcome. A private Mendelow power map can also help you understand who you need to involve, how often, and with what kind of message. But none of these tools matters if you’re not building influence without authority. That’s the soft skill that keeps PMs alive.

Meaning, don’t dismiss people calling you authoritative. It’s a signal that others don’t feel invited. Slow down. Get back to the PM basics and walk them through the problem you’re solving and for whom before even hinting at roles or ownership. Ask more questions. Create room for them to shape the solution instead of feeling drafted into it.

And the testing issues? Those weren’t yours alone. Senior devs should have caught them and the engineering lead should have been present. But the way you navigate that mess isn’t with charts. It’s with diplomacy, clarity, and influence. Consider instead a collaboration on how we might want to test. The who will shake itself out if done as a dialog.

Point is, a great PM doesn’t muscle decisions, let alone roles. A great PM makes the right path feel like the team’s (or stakeholder's) idea.
  - **canacho93** (1↑): Thanks for the input! The intention behind the question was not really to come back and present a RACI chart (I would've discussed it internally instead), but for me to understand roles. 

I spent close to 6 years out of tech and product roles. PM roles seem very ethereal and changing to me from one definition to the next. Almost like no one really understands it, textbook people describe it as something magical and in practice they just seem to do quasi mundane tasks like just being a barrier between business and devs. So, I'm trying to better understand my role to try and do office politics better (I 100% percent realize the head of engineering calling me authoritative is just him being whiny, but it does reflect I put unnecessary pressure)
- **El_Kikko** (2↑): As a PM, your job is to identify the person on the project team who during discovery / requirements gathering has the biggest range in blood pressure changes during the meetings. 




That's the person you should listen to and the person who will only ever need the slightest of gentle pushes to provide the appropriate hammer response at the resource(s) you've found to be slacking.
- **Independent_Pitch598** (-1↑): Look at Revolut school. 

PM owns product and makes all/final decision. 

Basically, you as PM should order changes in product and Devs role is - execute. 

Sometimes they can drive their own (non-business) initiatives, if there is a room for them in backlog.
