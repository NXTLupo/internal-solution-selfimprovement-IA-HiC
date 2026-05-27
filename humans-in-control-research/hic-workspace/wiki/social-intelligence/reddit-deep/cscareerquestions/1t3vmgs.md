---
url: "https://www.reddit.com/r/cscareerquestions/comments/1t3vmgs/why_do_people_have_such_radically_different_views/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Why do people have such radically different views on how AI will affect the industry?"
author: "dfphd"
date: "2026-05-04T21:39:07.000Z"
score: 85
upvote_ratio: 0.86
num_comments: 108
flair: ""
extracted_at: "2026-05-19T17:57:56.741Z"
extraction_method: "praw-deep"
research_goal: "Identify strategic opportunities for Northeastern University to enhance experiential learning and co-op success, specifically focusing on First Year Student Preparedness, unifying fragmented student data into a 360 student profile, improving advisor capabilities, and strengthening corporate partner development. Leverage deep industry research, stakeholder transcripts, social data, articles, and news to inform this strategic analysis."
---

# Why do people have such radically different views on how AI will affect the industry?

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1t3vmgs/why_do_people_have_such_radically_different_views/)
Posted by **dfphd** · **85↑** · **108 comments**

TL;DR: The reason people have such wildly different views on how much work AI will replace or eliminate is because different industries/companies have fundamentally different exposure levels to said automation. So think about that before arguing with someone about how far AI will go in automating *everyone's* SWE jobs

This is something that's becoming more and more apparent as I talk about it with friends and colleagues - everyone has radically different views of just how disruptive AI will be for SWE. I was talking to a friend of mine who I greatly, greatly respect and he was very excited about just how much work AI was taking off his plate, and how disruptive this was going to be.

And I told him that I don't see it that way - that at a company like mine, so much of the work needed to get projects done still needs a buttload of human involvement. That there's basically no foundation on which you can expect agents or models to operate in order to accomplish the things that are core to our company.

And it made me realize - yes, at *my* company. His company? Smaller company, and he built out a startup and is now working with startups. My company's main focus? Making stuff. His? Services. 

When I discuss this with friends who are in similar companies to mine - 25K+ employees across the globe, companies where the main product is not software, companies that have been around a really long time and have had decades worth of opportunities to accumulate technical debt, etc. - I hear basically an echo of opinions: AI is a great tool, but the bulk of the work will still require people understanding how solutions come together in the real world first, and coding of solutions second. And we are 5, 10 years away of highly dedicated efforts to build out the data, infrastructure, process, governance structures needed to actually be able to start deploying a substantial volume of agents that do meaningful work.

Also, risk: these are companies that have been around for 50+ years. If they're going to die, they're going to die slowly and everyone in the company is 100% more likely to prefer to let the company die slowly than taking huge risks that might take the company down overnight - even if it means missing out on homeruns. 

But if you work at a smaller company, where your main product is software, where you can rearchitect your entire company in a couple of months if you so choose to, where you've been around less than 5 years so your tech debt is tiny *and most importantly, where the future is not promised and you need to take risks to even have a chance to be around in 2 years?* Yeah, those are companies where AI *will* be disruptive. Because only the companies that gamble and win will win, and that has always been the case.

I think the same is true of companies - even large ones -  where software is the main product. If anything because there will at the very least be mature enough data, infrastructure, devops, etc., in place to let you take some risks, and because the upside is tremendous. 

So yeah, your opinion of AI if you work at Procter & Gamble, Coca Cola, Lenovo, Nestle, Toyota, GE, United, Pepsi, Chevron, Exxon, Kraft, etc., is going to be very different than your opinion if you work at Apple, Google, Uber, etc, and that is still going to be very different than if you work at a startup or small company. 

AI will be disruptive overall, I don't think that's a question. But the degree to which it disrupt things in the long term I think is murky because it's hard to tell on a net/net basis how many jobs it will eliminate from each of those companies, vs. how many more jobs it will create at some of the other companies (especially the first group) to enable the type of foundational work that will be necessary to eventually get to the point where they can take full advantage of AI.

## Comments

- **lhorie** (109↑): Also, a lot of people are just plain misinformed about what AI can and cannot do as it pertains to a SWE's day-to-day work. Cue students spiraling about not being able to get jobs and blaming it on the AI narrative.
  - **hibikir_40k** (41↑): Or, on the other end, people that only used a free web chatbot, and assuming that's the extent of LLM utility for coding. It's not different camps that see the same data very differently, but typically people that aren't looking at anywhere near the same practical results.
    - **Cuddlyaxe** (12↑): I mean I think even free web chat bots are pretty decent atp. You can get Sonnet for free for example, just not Code

I think the bigger issue is that a lot of people straight up haven't used LLMs since they basically released and just assume they are in the same state, and then people who dislike LLMs will jump on that bandwagon 

I have legitimately seen some people argue that LLMs are entirely useless and overhyped on even days and that they are a massive capitalist plot which will render the entire country unemployed on odd ones.

To be clear AI is a nuanced issue with *a lot* of real negatives, but at the same time there is an entire section of the internet that will blindly latch onto anything negative about it. That's why water usage is still brought up for example even though it's pretty much just misinformation
  - **No-Project-2353** (4↑): I use AI to code in gamedev but it’s pretty much “write statement in c# to extrude ray vector from an x,y coordinate on screen” and “write statement to detect if ray intersect with plane”. I don’t vibe code in traditional sense but use it as a tool so I can make a camera controller that performs 2D rotation but in 3D plane from a top down view. 

I still have plenty of context for what happens and don’t feel my skills atrophy, it really is just a tool.
  - **DynamicHunter** (-2↑): That doesn’t mean companies will hire juniors again though, and junior positions plummeted after GPT came out in 2022. Not just for software, but for a lot of industries where the busy work was done by new grads learning the ropes.
- **Scratches7** (40↑): Another talking point here is that some devs work on safety critical software with regulations and other devs align divs.
  - **ObstinateHarlequin** (12↑): Yep. I was just mentioning this in another thread a few days ago - working in the aerospace industry, all my coworkers and I still write all our code manually because NO ONE is comfortable trusting safety-critical software to LLMs (to say nothing of even getting a model into certain secure environments).
  - **AntiDynamo** (4↑): Yep - work in cyber, there are high expectations for the code we ship and we really can’t afford to be introducing vulnerabilities to ourselves or our clients. Our use of AI assistance is heavily controlled and monitored. Clients are *very* apprehensive on it as well
  - **dfphd** (4↑): True.

I actually remember in the 2020/2021 peak of the market how it felt like there was a large group of people that just had jobs because we needed people who could pump out even mediocre Python code, and so people with like a year of Python experience were getting jobs just to go build basic-ass ML models with like 40 lines of python in a Jupyter Notebook.

When I think about the "disruption" of AI, I think that is one of the areas where disruption will be very real... and not gonna lie, kinda warranted? Like, there was no world where it was reasonable for a 22 year old kid making $120K a year just to write shitty Python code. 

Matter of fact, I think a big reason why a lot of executives are pushing so hard the other way right now (which is also totally wrong btw) is because they still have a bad taste in their mouth from getting pushed around by devs for 2-3 years and for once feeling like they were the ones having to sell themselves to candidates instead of the other way around.

To me, it feels like this "we dont need developers anymore" is equal parts misguided hubris, trying to hype up their company's AI adoption, and seething resentment for when the job market went crazy and never wanting to go back to that again.

(Which, mind you, not hiring juniors is ironically the best way to ensure this happens again)
  - **Vyleia** (1↑): We are a lot to work with safety critical software, with regulations (health, defense, …) to intensively use AI though, if that was part of the point you were making?

Or if it was that AI struggle to align divs, then I’d have to partly agree tbh.
  - **Appropriate-Rip9525** (-3↑): Most industries who require safety critical software has started using their own company restricted llms to generate code. 

Will it be implemented without review, no. But we use LLM's a lot in higher level cyber security.
    - **Phantom_54321** (1↑): Cyber security teams for higher level cyber security things   
use Traditional AI/ML which are Deterministic in nature   
not llms which are probabilistic in nature
- **lookitskris** (20↑): The echo chamber of social network algos is also a big factor
- **TheStoon2** (23↑): I work at a Telco, we get regulations shoved up our ass... At least half of AI use-cases are a NO GO, and the other half is genuinely useful.
  - **EnthusiasmTop8815** (10↑): This is really interesting to me because my company has clients in regulated industries and it's wild to see how they interpret the regulations differently. For example in banking I know of one top ten US bank that doesn't want to touch AI and another top ten bank that is all in on AI, both presumably governed by the same regulation frameworks that applies to all "too big to fail" US banks.
    - **dfphd** (2↑): From talking to friends:

Some of these companies in highly regulated industries sometimes get a little bit adventurous and want to start acting like tech companies. And to that effect, sometimes they bring people from tech companies to do tech company shit - which can go horribly wrong when they start getting fast and loose with how they interpret regulations. 

All that to say - it might not be a difference in interpretation, but rather a difference in their risk tolerance.
    - **TheStoon2** (2↑): I don't work in the US market, I work for European clients. Their regulations are quite strict, though I fully understand what you mean that rules are interpreted differently. I guess it just depends on the culture of the company and how comfortable management is with creative interpretations.
- **c-u-in-da-ballpit** (20↑): Because this sub has a huge share of students and new grads who don’t know what they’re taking about
  - **joz42** (2↑): And because even if you work as a software engineer, you might have no idea how it works at other companies or industry branches.
- **FriscoeHotsauce** (27↑): Because the sales pitch of AI today is a massive fraud. The Large Language Models are real, but the promise of AI is a complete lie that does not scale.


Some history, Google published their landmark "Attention is all you need" paper in 2017. At the time, the researchers made an assumption that the method for training models wouldn't scale particularly well, which is one of the reasons Google was a bit slow on the LLM bandwagon. And ultimately they were right I think, we've hit a plateau. Just throwing data at the models is not making them significantly better anymore. But, I think they underestimated just how far you could go with LLMs.


At their core, LLMs are still just (extremely advanced) predictive text generators. Given the collective of all published texts on the internet and a context prompt, what words come next? It's an insane machine we've built, but it's still a predictive text generator.


The lie comes from the sales pitch of some very experienced con men, that the capabilities of these tools will do whatever magic you can imagine. But specifically the con was aimed at extremely wealthy businesses who are struggling to keep their profits going up and to the right as we slide into an inevitable recession. The people pouring *literally trillions* of dollars into this technology do not understand how it works or what it's limitations are. 45% of the S&P 500 is *heavily* exposed to AI focused tech companies.


So here's where it falls apart; LLMs are not a viable business model as a service. It is not profitable to spend tens of billions training new models, and then lose billions on compute as people pay OpenAI and Anthropic for inference tokens. These companies are private, so we don't know their financials, but the warning signs are everywhere. OpenAI has raised *and spent* hundreds of billions of dollars, and has something stupid like a -95% profit margin. We do not know how much money they lose on inference, but we *know* that they do. OpenAI is excluding their CFO from discussions about data center build outs, probably because she's been raising concerns about their potential IPO. They also were forced (by their investors I assume) to admit that they missed their profit growth targets this quarter. Remember that they only need to 20x their revenue to break even.


On top of that, the hundreds of billions OpenAI spent on training can be ripped off by someone like Deepseek for a fraction of the cost (by inferring weights) and sold for a fraction of the cost. Prices can not go up by 20x because no one will pay at that price.


So you have a number of camps in this environment.


- AI fans bought in on the hype, either organically or because they stand to lose a lot of money if the financial bubble bursts
- AI doomers who hate the tech
- A growing number of people catching on to the con


I like to think I have a foot in each camp. LLMs have their uses, and I suspect we'll see really interesting developments over time. My bet is that we'll see smaller, locally run models (I think the SaaS model doesn't work) in specialized scenarios. I think LLMs are too unreliable and too expensive to replace real humans in most contexts. I think the AI companies that are big right now are massive frauds, and are going to cause a catastrophically bad financial crash.


So yeah man. We live in interesting times.
  - **fsk** (1↑): >smaller, locally run models

The first chess computer that beat a grandmaster required a custom supercomputer.  Now, you can run open source Stockfish on your desktop.  There might be a similar amount of progress with LLMs.  The open source LLMs will eventually catch up to the for-profit models, and there probably will eventually be good enough models that run on a desktop.
    - **FriscoeHotsauce** (1↑): Yeah, I mean that's one potential outcome. Why do I need to pay OpenAI in this case? What's their long term business plan exactly? Spend hundreds of billions developing something that's obsolete in ~5 years, before they even have their data centers up and running?

Seems foolish to bet the farm on


But, I guess if that happens then why do these big data centers need to exist? Where's the money in developing the LLM if I can't charge a premium to use it? I feel like the development needs to transfer to something like an open source foundation or government development project or something.
- **allknowinguser** (8↑): It’s simple. It’s not fully understood and it’s still relatively new. Nobody has a crystal ball. Give it some time
- **BigShotBosh** (29↑): We’re still in the early adoption phase, where some people have a complete end to end tooling stack of enterprise AI offerings embedded into company documentation  and haven’t written code in months, and some people are still using Microsoft Copilot 

That’s why a lot of the answers are so wildly divergent 

That and I think there’s some individual bias, people who made tech a personality (programming stickers on their laptop, Aws reinvent hoodies, etc) tend to have a more negative disposition towards AI for obvious reasons, and the crowd that isn’t quite as personally invested are more bullish about it

Not a judgement, just something I noticed
  - **PreparationAdvanced9** (42↑): I find the ppl with the stickers who made tech a personality to be the biggest proponents of AI.
    - **rayred** (11↑): Yeah. Agreed. 

I do also think that just because people work at companies where they don’t code anymore, doesn’t automatically make them a fan. 

Personally, I’m one of those people. Don’t touch code at work ever (practically forced to work this way). And it sucks. I hate it. Things aren’t getting done faster. Code just gets spit out faster. And it suckkkks. Way too many things to keep track of. Way too many bugs going out. And it’s just simply not fun. So there is a lot of complacency going on.
    - **AwesomeOverwhelming** (1↑): I got stickers as a social invitation. I want to talk to others about tech things and invite others into this field who may not think it's for them because representation matters. I'd expect people with similar mindsets to be pretty adaptable to using whatever tool helps get the job done.


I could see folks who get stickers as a a status symbol of how smart/skilled/talented they are not supporting AI because AI threatens the status of this field.
  - **DrMaven** (1↑): I agree. The OP sounds more like they work at an outdated huge company with slow AI adoption, whereas their friend(s) sound like people who work at fast moving modern companies
  - **ivancea** (0↑): > and some people are still using Microsoft Copilot

As of today, it's not about the company you work on. Even if you have no LLMs available at work, as an engineer you should have tried agents already. 

What we see here isn't about POVs, it's the decades old problem of engineers not giving a f*ck about tech and being stagnant in their career.

And well, the stickers don't matter. I know very low-technical devs that have stickers (quite the cringe), and amazing engineers that wear them as they're companies they loved working with, for example.
- **TheGRS** (3↑): It's that bell curve meme basically. If you know very little it seems dumb, if you know a bit it seems amazing, if you know too much it seems dumb.
- **built_the_pipeline** (3↑): \+1 to the company-size framing. F500 fintech here, your read matches mine. The thing your friend's startup gets that big-company senior engineers don't is AI failure tolerance. In a 5-person company shipping fast, an agent that's right 80% of the time saves time, and the 20% gets caught quickly because everyone touches everything.

Same agent in regulated F500: the 20% that's wrong needs an audit trail, a model risk write-up, a backout plan, regulator-readable explanation, and a story for what changed in your control surface. The capability is the same. The institutional risk envelope is not. And no amount of better tooling shrinks that envelope, because it's not a tool gap, it's a regulatory and governance one.

Concrete: I've seen agents land in production at fintechs in 2-3 weeks for internal-only low-risk use cases, and 9-18 months for anything that touches a customer or a money-moving decision. Same model, same prompt template. The work between week 3 and month 18 is exclusively governance, not engineering. EnthusiasmTop8815's banking comparison upthread is the same thing, two banks with the same regs, completely different risk appetites, completely different AI velocities.
