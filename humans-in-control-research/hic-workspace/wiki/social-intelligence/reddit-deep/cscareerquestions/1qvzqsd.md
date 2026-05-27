---
url: "https://www.reddit.com/r/cscareerquestions/comments/1qvzqsd/company_shifting_toward_prompt_first_engineering/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Company shifting toward “Prompt first” engineering"
author: "blaze_seven"
date: "2026-02-04T20:21:56.000Z"
score: 110
upvote_ratio: 0.94
num_comments: 81
flair: "Experienced"
extracted_at: "2026-05-20T12:57:40.624Z"
extraction_method: "praw-deep"
research_goal: "Identify a comprehensive new strategy for co-op based on the current statement of work for NU, prior projects with NU, and fresh industry analysis of experiential learning and co-op engagement tactics to improve learner's chances of gaining meaningful experiential learning opportunities from pre-enrollment to graduate school\n"
---

# Company shifting toward “Prompt first” engineering

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1qvzqsd/company_shifting_toward_prompt_first_engineering/)
Posted by **blaze_seven** · **110↑** · **81 comments**

I’m about 5 years into my career and I’ve been working at a financial tech company (~150 employees) for the past year. 

I had my annual performance review last  month where the director of engineering and the CTO both went on this rant about AI-development is the only path forward and “human engineered code” isn’t enough anymore. I’m very opposed to AI for a multitude of reasons, but have been using it at work to assist in some tasks (test generation and debugging). 

In the last week, they’ve tripled down. We’ve had posts in company channels stating “Prompt-first is the only way” and that we need to start spending time in our personal time to get better with ai-development strategies or “the alternative would be to ignore this and fall behind in your career and at the company”.

I know this probably isn’t uncommon anymore, but is this true that this is the future? Do I really need to spend time learning to prompt-programming?

## Comments

- **LowFruit25** (102↑): It’s happening in many places right now. 
My first thought always is “what is there to learn?”.

I picked up writing prompts in English in a couple of days and read a few documentation pages about the coding CLIs I use. It’s really not that difficult and you can get going quickly. I recommend you do so.

The buzzwords “prompt engineering” or “prompt first” have been invented by non-technical people who were previously reliant on developers to build their product (they mostly don’t like developers because money).

So when suddenly a new thing allowed them to cosplay as builders and be treated as knowledgeable they ate all that shit up.

Now they’re threatening you with “falling behind” as an emotional tactic to make their conviction feel validated. Please remember this going forward. I think it’s bullying.
  - **Scoopity_scoopp** (52↑): This is the real answer.

Non technical people feel like they have a leg up for once and think they have a clue what they’re talking about.

So they’re doubling down on it so they feel like insecure.

The loudest people often know the least and its always management
    - **DynamicHunter** (15↑): Exactly. Management and MBAs are so shocked that AI can do their jobs, and since their jobs are sooooo important then it can replace engineers entirely.
  - **Difficult-Cricket541** (9↑): they are hoping they can fire people and reduce staff. they are hoping this is easy and they can lower wages on remaining staff. 

  
cost of AI is going to skyrocket in the next few years. They are making massive investments and they are all losing money. Would not surprise me if a coding AI will be $75,000 for a 1 year license. That is still cheaper than a developer.
    - **Squidalopod** (3↑): >they are hoping they can fire people and reduce staff. 


100%. This is virtually always the motivation in an industry that constantly chases short-term gains.
    - **yourapostasy** (1↑): Right now, with the heavily subsidized pricing, frontier models behind even “just” a Ralph Loop running “only” 12 hours a day rack up way more than $75K per year. It is still early days with these tools and I already have to be judicious in how I leverage them. People are already running into unadvertised consumption limits. I’m not excited for what the bill will be when the real costs are built into the prices.

At these prices with even a doubling in token consumption efficiency, I’m either passing off grunt work to the models (basically ditching offshore teams) or making very targeted higher-level use. Solopreneur companies of dozens to thousands of agents would still be a tightrope act to “make payroll”, not the “bootstrap your next unicorn for the price of a Starbucks a day” hope some people have.
  - **stevefuzz** (5↑): Lol I still remember the day, as an engineer, that I realized all the tools and specialty shit was just plain text. I was like, you normies (non devs) are so lame.
  - **AlignmentProblem** (3↑): The main thing that's tricky to learn these days is optimal context management. Learning what you need to prompt well isn't difficult by comparison, especially for people with a standard software engineering skillset.
    - **Ibaneztwink** (3↑): isn't context management just knowing what and how to prompt for the most part
  - **PianoConcertoNo2** (3↑): One thing I haven’t seen mentioned is - teams have become very diverse, with many members who are non English as a first language having a place on them. 

Yet now there’s a focus on detailed, English specific context prompts and document generation, which requires combing through a large amount of text searching for errors that are 100% included. 

Are non-English as a first language devs being purposefully pushed out? 

It seems like a very obvious question, yet I see it being constantly glossed over, to the point it seems purposeful and targeted by these companies. I don’t get it..
    - **LowFruit25** (10↑): Documentation was in English since the beginning. I think strong English was always a prerequisite for tech work.
  - **ILikeCutePuppies** (1↑): I think there are some legitimate tactics to getting the llm to work well and lots of different approaches.  However it's a very difficult skill to sell if you ever leave.  Many people think they have the superior approach.  

Also some of the approaches became less valuable as the llm starts doing them automatically... like always writing tests and testing the code it writes.

Things are moving so fast that any book about best practices will be out of date tomorrow.  The one thing about reviewing it's diffs for projects that are not throwaway or for personal use might stay for a while but everything else will probably be automated.

I do think interviews of the future should be more focused on reviewing code rather than writing it.
  - **[deleted]** (0↑): Uh no it isn’t that simple, it’s how I’m able to get substantially better results than my coworkers. It’s not that hard either but you do need to learn some important concepts.
  - **PaddingCompression** (-15↑): Becoming effective at "vibe coding" is not trivial - it's not just a prompt, it's how to use context windows, how to break down a problem, how to manage what ends up in a prompt vs. skills/MCPs, etc., how to keep the AI going for hours at a time in a testing/debugging without going off-the-rails or getting bored so you can multitask, etc.

This is IMO way harder than learning how to be good at ML, how to write C++ using all the features and avoid UB, how to write good Rust code etc. - this is a skill.
    - **LowFruit25** (12↑): I get good results with the setup I have. I keep just the things I need.

Context management is giving the AI files, docs and access to things you’d normally need anyway.

Breaking down a problem is the same behavior as with regular coding, programmers know this.

Long running is fine with multiple checkouts and a bash loop with a validation env for your tests.

Don’t create fake agentic complexity just because you’re now trying to compensate for doing nothing.


Anyone enlighten me if there’s more please. I really want to learn if my stuff ain’t it.
    - **GoodishCoder** (3↑): It's all pretty trivial and it's only going to get easier. Knowing what context you need is part of the equation whether you're writing from scratch or using an AI tool. If you know what context you need, it's pretty easy to tell the AI. If you don't tell the AI, it still generally finds the context on its own. 

MCP is in a similar boat, if you would use something when manually writing your code, start up the relevant MCP. I would guess MCP is eventually going to be phased out in favor of more baked in functionality. 

Generally speaking it doesn't seem to go off the rails unless you feed it too much at once, if you feed it tasks similar to how you would break it down in your head, generally the only thing to do is a little clean up at the end. 

Worst case scenario you tell it to make a plan first then tell it to execute on the plan.
    - **69Cobalt** (3↑): I don't entirely disagree that there is some nuance involved depending on your use case, but what about the above is different from some variation of "create a plan -> break down into subcomponents -> establish success conditions & loop "? And of the variations of it how many are just hand wavy "improvements" that you have no real way to test the validity of outside of your personal feelings about it?

I don't claim to be an expert in the area but I've been using agentic tooling at work for quite a while and the only significant leap I've noticed (outside of general model improvements) was the ability to perform tool calls, everything outside of that seems like window dressing or convinience features not a fundamental step forward.
    - **tenfingerperson** (2↑): Not really, all these things are at the end of the day are understanding how to use descriptive human language and limitations, it is in no way harder than learning those languages in depth.
    - **throwaway0845reddit** (2↑): Agreed on what is needed to become effective but it’s not harder than the latter. I guess only if one’s skills of English are not good, so you have trouble elucidating to the AI about complex programming flows then it is way harder. But I think many of those models support other languages too?
- **supyonamesjosh** (108↑): Them asking you to spend personal time is a red flag regardless of the ask.

Who knows if this is the future. I’m in on AI telling you things and out on AI doing things for you so I doubt AI searches like copilot will ever go away, but we’ll see where building programs goes
  - **Unlucky-Ant-9741** (-22↑): Learning in your own time is standard in the cs industry.

I would estimate  in my role that I do 20 hours per week unpaid overtime doing just that.
    - **FlyingRhenquest** (21↑): Sounds like wage theft to me.
    - **dayne195** (14↑): What the fuck. 20? I hope it's fun for you, that seems entirely unnecessary
- **president__not_sure** (14↑): lol. a concise example of everything that's wrong with the world. the guys on the top of the ladder don't know shit about shit.
  - **Longjumping-Donut655** (6↑): Their heads are so far up their asses that Amazon just leaves their packages at their sphincters.
- **danmikrus** (11↑): Most of my colleagues are salivating about AI and are straight up vibe coding. They produce slop that works half the time and spend a ton of time trying to get it to actually work later. Plus they are mostly front end guys who claim to have success with it.
- **createthiscom** (8↑): “prompt first” lol. I guess that side steps the negative connotation associated with “vibe coding”.
- **CydeWeys** (5↑): >we need to start spending time in our personal time to get better with ai-development strategies

That doesn't make any sense to me.  You're already working 40 hours per week at your job; doing what they ask of you (prompt engineering) during the time they pay you is reasonable, and also, that's more than enough time.  A full-time job is \~2,087 hours per year!
- **octocode** (5↑): imagine how much money you’ll save the company when you replace the CTO with a thin wrapper around an LLM
- **Scoopity_scoopp** (7↑): I lik AI because I think it’s helpful.

But more and more often do I go down the trap of following what GPT says.

Then I give up and google and that would’ve been 20xs faster.
- **metamucil_buttchug69** (30↑): >I’m very opposed to AI for a multitude of reasons

Are you opposed to saying "would you like fries with that"? Because thats what you'll be doing if you don't adapt. Theres an expectation among senior leaders that the modern AI tooling is a true 10x productivity multiplier. Jira/Ticket to PR is the way forward to them. 


I'm not saying I buy it 100%, but the way to make a long career in tech work is to adapt. You're not going to outlast the AI irrational exuberance, at least play along for now.
  - **blaze_seven** (15↑): I think that’s a fair point. I’m just caught up in this dilemma of personally not liking the impacts that ai is making on the environment and society. But at the same time, I like my job and I do want to advance. 

I definitely can put up with it and work on those skills for now. It’s just feels hypocritical in my head of being so opposed, but that’s something I’ll have to wrestle with myself
    - **capitalsigma** (0↑): If you play video games at home, the power draw of your GPU is probably comparable to whatever accelerator is running your LLM queries. Do you refuse to play video games because of the environmental impact? After all, an 8 hour gaming session consumes a lot more watts than a few minutes of LLM calls.
    - **silly_bet_3454** (-1↑): I mean this is the real world basically. The entire economy is deeply plugged into the AI stuff, you're not gonna be able to just avoid it all because you care about the environment. Everyone wants the environment to be sustained, all else equal. You're not special, respectfully.

If you want to pursue your pet causes first and foremost in life instead of focus on making money, you can do that, but you should go all in on that if that's gonna be your life. If you go get a job at another tech company because they seem vaguely less AI obsessed, you're really not doing anyone any favors.
    - **metamucil_buttchug69** (-6↑): well this is getting off topic, I don't know where you work or what your life philosophy is but I think the question of environmental impact gets pretty murky.


Yes in data centers are power hungry, yes hardware is more and more disposable and we're still not great at recycling e-waste, but its not hard to conceive that the overall positive impact of AI is going to outweigh the environmental impacts and that technology advancement will mitigate environmental impacts. You could argue computing in general has a negative environmental impact, the internet has negative impact, and we should all be living like the Amish. But thats ignoring all of the advancements computing and the internet brought us. And the reality is the mega wealthy aren't going to live like the amish, they will fly around the world and own multiple homes and create as much environmental impact as they please while people write articles about how we shouldn't be asking AI stupid questions.
    - **PaddingCompression** (-9↑): Which has more of a carbon footprint - you, or your use of Claude Code?

As long as the AI's carbon footprint is less than it would take a human to get the same thing done, it's a net positive.  Back of the napkin 3 minute guesstimates for me put maxing out Claude Code Max for 5 hours at about a week's groceries for a human in carbon footprint - which is probably a net win given how much productivity maxing out can make it (for me that's usually working in a flow state with multiple sessions running and moving between them)
- **Economy_Dog9458** (11↑): Prompt first doesn’t mean vibe coding. Prompt first means developing your skills at building a specific and clear prompt, and seeing if the AI can do most of if not all of the leg work for you. If the result is nasty code you don’t want to use, that’s okay, but sometimes it’ll surprise you and now it’s saved hours. The worst case is that you spent 15 minutes typing in a prompt and reviewing code, so a single success story is a win.
  - **PaddingCompression** (11↑): Practicing this also means learning how to cajole to AI to write good rather than nasty code.  So many people try a prompt and are like "I tried that, the AI sucked at writing that code" - part of it is to understand how the AI works well enough to properly delegate to it.
    - **studio_bob** (20↑): My experience is that once I get to the point of needing to significantly "cajole" the LLM it is, 9 times out of 10, about to start wasting my time. I feel like knowing when to throw in the towel and just do something yourself is a key "skill" here.
