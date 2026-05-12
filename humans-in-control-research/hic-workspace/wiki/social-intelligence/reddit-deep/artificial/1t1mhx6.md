---
url: "https://www.reddit.com/r/artificial/comments/1t1mhx6/uber_burned_its_entire_2026_ai_coding_budget_in_4/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "Uber burned its entire 2026 AI coding budget in 4 months - $500-2k per engineer per month"
author: "jimmytoan"
date: "2026-05-02T10:44:48.000Z"
score: 830
upvote_ratio: 0.95
num_comments: 328
flair: "Discussion"
extracted_at: "2026-05-11T17:27:04.762Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Uber burned its entire 2026 AI coding budget in 4 months - $500-2k per engineer per month

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1t1mhx6/uber_burned_its_entire_2026_ai_coding_budget_in_4/)
Posted by **jimmytoan** · **830↑** · **328 comments**

Uber deployed Claude Code to engineers in December 2025. By April 2026, the company had consumed its entire annual AI budget - not because the tool failed, but because adoption took off faster than anyone planned.

The numbers: 95% of Uber engineers now use AI tools monthly. 70% of committed code originates from AI. Monthly costs per engineer are running $500 to $2,000, depending on usage. The company's CTO said they're "back to the drawing board" on AI budgeting for next year.

What's notable is what this implies for the industry. Most enterprises are still treating AI coding tools as a line item they can forecast like a SaaS seat license - fixed cost, predictable renewal. Uber's experience suggests the actual cost driver is adoption intensity, not seat count. A team that uses Claude Code heavily for multi-step agentic work generates orders of magnitude more API spend than one that uses Copilot for autocomplete.

The companies that haven't hit this wall yet probably will. Uber's R&D spend is $3.4B annually, so even at the high end this is manageable for them. For a smaller engineering org, an unforecast 4x budget overrun on AI tooling could genuinely disrupt hiring or infrastructure plans.

The interesting question isn't whether this is worth the cost - Uber clearly thinks it is or they'd restrict access. It's whether the productivity gains have been measured in a way that's comparable to the spend. 

Has your company tried to put actual numbers on the AI coding ROI, or is it mostly vibes and velocity estimates?

## Comments

- **wre380** (256↑): What in gods name is Uber R&D spending $3,4B on?

Infra and upkeep, marketing, lobbying, legal; sure. But R&D? What is left to R or D for a gig platform?
  - **___fallenangel___** (122↑): I assume they're desperately scrambling to abate the impending Waymo uberpocalypse
    - **Cheesegasm** (43↑): Uber gutted their self driving division years ago
    - **BuilderOfDragons** (1↑): Lol what?  You'd have to pay me to get in a waymo.  A human I don't know driving me around is bad enough, I definitely don't trust a robot built by people I don't know
    - **voronyz** (1↑): More like cyber cabs giving $5 rides
    - **nonamenomonet** (1↑): The unit economics of Waymo have never made sense to me tbh
  - **ivereddithaveyou** (27↑): R&D is anything that you can reasonably say is hard to do. And at uber scale there will be a lot they can justify.

Some jurisdictions get tax breaks for R&D.
    - **nickleback_official** (7↑): They ditched their self driving efforts years ago. It’s hard to imagine what else uber needs besides a barely functional web app. I imagine it’s like twitter and laying off 90% of the staff would make no difference lol.
    - **xoxide** (1↑): Yeah it's about that section 174 tax breaks
    - **General-Jaguar-8164** (0↑): In the Netherlands any software written is part of R&D spending in tech and non-tech companies
  - **Outside_Rent174** (19↑): They keep figuring out how to make their app worse.
    - **A_Neighbor219** (2↑): That takes time, money, and talent. Or something like that. 😆
  - **Otherwise_Repeat_294** (15↑): When is mandatory for your performance review to use llms, you will find a way to consume those tokens
  - **DerWasserspeier** (7↑): I can't speak for Uber, but I know at my company, a lot of our general analytics work can be claimed as R&D for tax purposes. Which means normal data exploration (and compute costs & the salaries of analysts, data scientists, and machine learning engineers) gets classified as R&D. I bet that is at least some of the >3B Uber is spending money on.
  - **SharpStrategist** (7↑): They have AI systems that determine the price of your ride based on how badly you need you ride, how lax you are about spending money, and how likely you are to not do the ride if its too expensive

This should be common knowledge at this point
    - **mij303jim** (1↑): That’s not a complex algorithm at all
  - **Foreign_Skill_6628** (6↑): one of the largest R&D items would be to create better algorithms for lowering compute costs, since Uber as a service is professionally solving the traveling salesman problem millions of times a day/week/month. Since this is an NP=Hard problem, any incremental advancements in algorithm improvement will pay for themselves over time.

That, and robotic driving to compete with Waymo.
    - **wre380** (3↑): Well yes, but $3,4B. That is 20.000 engineers @ $170k. how hard is this problem? Since it is r&d there are no prod infra coste here.
    - **Mammoth-Tourist-6000** (1↑): Not any..
  - **End0rphinJunkie** (2↑): Keeping the routing, dynamic pricing and fraud detection running at global scale takes thousands of engineers. Its way more complex under the hood than just connecting two phones.
    - **wre380** (0↑): I know. I get why 40M rides/day takes a lot of infra to run.

Maybe i dont understand R&D? I always thought that would be dev/staging only. So before scale happens.
  - **dawtips** (3↑): They once used Google maps but switched to their own homegrown system. I wouldn't be surprised if they were building their own AI CLI and coding platforms to sustain their operations long term.
    - **PuddleWhale** (1↑): They still use google maps to some extent. They never built a homegrown system, they purchased part of Microsoft Maps and took in 100 of their engineers in 2020 and then again in 2025 and that's part of their "homegrown" system. There's literally no press release or video interview anywhere of them having created their own independent mapping system.
    - **Watada** (1↑): > I wouldn't be surprised if they were building their own AI CLI and coding platforms to sustain their operations long term.

They clearly aren't if they just blew through their budget without noticing.
  - **pogkaku96** (1↑): They brought back the self driving research again.
- **Ecsta** (22↑): My org has a $500 token budget per person per month. Using Claude Opus 4.7 I can burn through that in a few days. 

People have no idea how expense Claude is when you have an enterprise license paying API pricing. It's vastly more than the subscription.
  - **No_Barnacles** (3↑): Is Opus 4.7 that much better than 4.6 that the 4x cost is worth it?
    - **Ecsta** (4↑): No, but anecdotally they've nerfed 4.6 so you wind up needing to use 4.7 anyways. Also I read that 4.6 was being discontinued in June.
  - **Main-Lifeguard-6739** (2↑): I do $500 in half a day without even pushing it. Prices are crazy.
  - **darien_gap** (1↑): And inference is about to get a lot more expensive.
    - **Anen-o-me** (2↑): Right before it become ubiquitous and cheap. This is a temporary problem and rising prices will generate enormous new supply given a few years. 

It is caused by a supply crunch due to unexpected demand. That's a really good thing, it means AI has amazing economic uses with high demand.
- **Born-Exercise-2932** (60↑): the budget burndown is the interesting part. 95% monthly usage means the tools actually got adopted, which almost never happens with enterprise software rollouts. most companies would kill for that adoption rate. the cost problem is real but it's a much better problem to have than low utilization on something you paid for
  - **Trakeen** (19↑): It was already being used. Once it got ‘approved’ all the engineers switched so they would keep their jobs

Everyone doing software work in enterprise companies has been using this stuff for at least the last 12 months, if not longer
    - **Frigidspinner** (16↑): and anyone else in IT/tech is being told if they dont use it, they will get shitcanned
    - **non_standard_model** (3↑): Is there any evidence that people are being told to use AI or lose their jobs? I’ve heard this but I’ve never seen this in practice.
  - **Ecsta** (7↑): It's more insane that 5% are not using it when they were likely told "use it or else". I can't imagine being an engineer and not using it. Even if you hate using AI to write code, it's handy for jira ticket cleanup, document writing, code reviews, etc.
    - **Fit-Dentist6093** (2↑): It's Uber. 5% of the engineers are probably working another job or haven't turned on their work computer in months.
    - **kleptican** (1↑): There are more engineers that would be happy AI never came about. I’m in the group of never use it but I’m being forced. Maybe documentation and writing a ton of tests, of which you have to review everything anyway, but I can’t imagine being an engineer and relying on it for code reviewing and everything else
    - **Strong-Violinist8576** (-4↑): The 5% are backend engineers who know that if they use it Uber goes the Amazon way, or the github way, or the Microsoft way, or the...


Get it?


> Even if you hate using AI to write code, it's handy for jira ticket cleanup, document writing, code reviews, etc. 


No, it is not.


*Maybe* documentation, but even then you're just creating approximated slop. 


Using it for code reviews is insanity.
  - **notfulofshit** (2↑): It's all gamed. It's not surprising that there is heavy token usage if the metric that is being watched is token usage.
  - **mare35** (1↑): If you don't adopt it or if you usage is low , you will be fired 😂.What do you mean "adopted" it's mostly forced.Use the tools so that you can keep your job.
- **YoBro98765** (29↑): Token Maxing in effect. Leadership assumes AI is better and is happy.
  - **Ecsta** (2↑): Enterprise API pricing is vastly more expensive than subscriptions. Even just using it normally for coding you can burn through $500 very fast on Opus 4.7
    - **rsha256** (3↑): sure but they also get negotiated discounts
    - **Melodic_Rhythmic** (1↑): Opus is insanely token intense
    - **AlexTheRedditor97** (1↑): What how does that make sense? Isn’t it supposed to be discounted at scale? And for these FAANG companies with exclusive contracts with these companies supposedly
    - **Fuskeduske** (1↑): 100% i could burn through 2k in tokens in an afternoon if i’m careless enough.

What differentiates a good developer from a bad one, is how effective you can actually use it ( if we are talking only in AI metrics )
- **IsThisStillAIIs2** (5↑): this is exactly the trap, everyone budgets like it’s a seat license but the real variable is how deep into workflows people go once it clicks.

we tried to measure roi and it got messy fast, velocity looks better on paper but you also get more code, more churn, and new kinds of inefficiency that don’t show up cleanly against the spend.
- **XTCaddict** (8↑): At some point you gotta wonder would it be cheaper for these big orgs to just buy GPUs and self host frontier open source models
  - **shamarctic** (3↑): Do we think they are still getting subsidized by VC at this point? Long term it seems inevitable tech forward heavy users of AI will go this route.
    - **StagedC0mbustion** (1↑): I’ve been saying this forever. Especially companies with sensitive or classified data. Off site cloud compute doesn’t make sense. Yet they’re talking about orbital data centers and shit so what do I know
  - **RedPandaExplorer** (2↑): I think this is the future. I think we're going back to on prem once AWS Bedrock and Claude and all of them jack up the prices too much
  - **j3rem1e** (1↑): This is what we do in my current company but honestly, open source models can't compete with a Claude code today
    - **XTCaddict** (1↑): Doesn’t really need to just needs to be good enough, there’s a difference between using them as an engineer and just vibe coding, that being said they aren’t that far behind
- **berndalf** (12↑): Uber lays off thousands of people is the next headline. 

Thousands of former Uber employees forced to take up gig work to make ends meet is the headline after that. 

Win win for Uber!
  - **airbarne** (2↑): A self feeding funnel right from uni to the steering wheel. Engineers getting the full Arts experience now.
  - **PuddleWhale** (1↑): This isn't the future, it's the recent pass. They shut down their in person customer support hubs in all US Cities. They used to be called Greenlight hubs and you could go there to pick up an item from a lost and found bin that was tagged to you and do virtually anything in person. Once upon a time. [https://www.reddit.com/r/uber/comments/1sditc4/hello\_all\_im\_surprised\_the\_news\_hasnt\_broken\_out/](https://www.reddit.com/r/uber/comments/1sditc4/hello_all_im_surprised_the_news_hasnt_broken_out/)
- **Badgergeddon** (4↑): Source?
  - **bguberfain** (2↑): Found on hacker news: https://www.briefs.co/news/uber-torches-entire-2026-ai-budget-on-claude-code-in-four-months/
- **Jealous_Strawberry84** (11↑): Uber is a software engineering company, benefits are easy to measure. The real uptake will come when banks, automobile, shipping, heavy industry will start using. Not for their IT, but for their business. It will come for sure, just might take another 2-3 years
  - **redpandafire** (13↑): As someone in those industries listed, AI is already being used. But not the degree software engineers do. We’re not writing harnesses and then walking away to let the agents figure it out. The fact is there is no harness you can write that accounts for all the reactive situations that are common in non-deterministic business environments. You cannot vibe code a shipping lane.
    - **sleeping-in-crypto** (9↑): Yep. Exactly. And that exposes the idiotic bubble that software engineers and people like the AI maxis live in: to them, automating things is straightforward and obvious so OF COURSE AI will replace all workers by next year! So stupid. In the real world you can’t just throw an agent on a non-deterministic situation and expect a good outcome. AI adoption in those industries will be slow and probably limited.

In software, everything is software and so is subject to AI replacement. But the real world isn’t software.
    - **billFoldDog** (5↑): It's actually surprisingly straightforward to put agents in charge of these kinds of workflows.


1. build a flow chart you can look at, and duplicate it in graphviz dot notation so the agents can understand it.
2. Make sure your agent has instructions and tooling to complete each step *with instructions to call a human if one of a predefined set of outcomes isn't reached.*
3. As the system works, every time a human intervenes, either improve the instructions, the tooling, or add additional defined outcomes.


I'm prototyping this right now and is frankly amazing what I can do on $20/mo chatgpt-codex and openclaw , but for a serious business I would be wary of openclaw.
    - **Jealous_Strawberry84** (1↑): That was my point, not there yet. But true value lies in adding decision making and taking risks off by helping research, analysis and predictions. Its going to fix what digitisation couldnt.
    - **inspired2apathy** (1↑): I think you're underestimating both the current tooling and the level of on the fly decision-making required in software engineering.
  - **talkingto_ai** (3↑): Ahhh!!!  Stop it with the negation affirmation, it makes you sound like a gd machine!
  - **hawkeye224** (2↑): How are they easy to measure? If they are then they should translate into revenue/profits. It seems the whole industry has mania about “productivity” and mountains of code with little real world impact to show for it
    - **Jealous_Strawberry84** (1↑): Easy to measure as in features completed per release, story points completed by Ai, speed to production. Standard kpi in software world that are already translated to business value
  - **rudeyjohnson** (1↑): Local LLMs for sure.
  - **jdlyga** (1↑): They’re a ride share and food delivery company. They just happen to have a big software engineering department.
  - **watergoesdownhill** (1↑): The other side of the coin is the sasspocalypse. All these companies are gonna take a hard look at the thousands are spending every month on software they could spin up themselves
    - **Jealous_Strawberry84** (1↑): Naaa, its not that simple
- **DueSatisfaction3230** (6↑): Serious question… how could a person possibly spend that many tokens in a month?  To produce what?  You could have AI stir and test a million lines of code with that budget.  What does an engineer’s day look like in this kind of environment?  Set it up in the morning and then do what?
  - **emefluence** (6↑): Agentic flows with frontier models mean one engineer can work on multiple tickets at once. Set an agent going, switch to the next thing while you're waiting for it to need it's next interaction (can easily be several mins), and on and on. Development starts to look more like answering your emails. Easy to burn through tons of tokens that way. Personally I tend to spend more AI tokens on researching, testing assumptions, documenting business rules, and planning than I do on the actual coding itself - rubbish in rubbish out and all that.
    - **DueSatisfaction3230** (7↑): Yeah.  That’s how I work now with the desktop app.  4.7 1M Max.  $200 a month.  Just hit 98% of weekly quote for the first time.  I just struggle to think what they are asking AI to research, test, or code that uses so many tokens.  I have yet to come up with a coding problem that can’t be solved (easily) within the quota of the subscription.  I’m just wondering what I’m missing.  This is with 30 years of software development experience at every level of company, from literally garage start ups to literally the largest.
  - **Icy_Cartographer5466** (4↑): I do about $200-300 a day at my day job. Opus 4.7 max thinking + working on 2-3 things simultaneously (but often only 1). I could probably double that if I did a better job of keeping a pipeline of ready to go issues. The important tooling is git worktrees + something to notify you when a session needs input. The day is juggling agents that need more input (maybe every 5-30 minutes), manually testing things, reviewing agent code (and instructing it on refinements), and reviewing other engineer’s changes (we still require final human code review separate from the author). And then normal work stuff like meetings, pages, questions on slack, goofing off…
    - **PuddleWhale** (1↑): Did you notice this thread because you are a map professional?
  - **SnooMemesjellies9003** (3↑): I’m using 3-4 agents at any given time at my work, for research, dev work, reviews, etc. Ive been spamming opus 4.6 for everything and was hitting around $4k/month in spend. Now leadership imposed budget limits and I need to start being more mindful of my model choice loll
    - **shadiakiki1986** (1↑): $4/month?
  - **No_Barnacles** (2↑): I use Claude with API usage payment structure for work, and the April bill for my API token was $395. 

This is me doing planning, design, revision, tech shaping, bug fixes, etc through promoting the AI, basically 4-6 hours a day. We are encouraged to use it heavily for all tasks, 

Most of my coworkers range between $100 and $700 a month, but there are a couple outliers who are north of $1k spend per month. One guy's spend was $5k for April! And THAT I just do not understand ... I seriously do not see how I could get more value out of the tool by spending any more than I did, and I don't think he IS getting more value ... just token spend for the sake of it.
  - **hamburglin** (1↑): People still aren't getting it. They aren't using it to write code. They are having the ai do their actual jobs. Analyzing data from mcp servers and making decisions.
