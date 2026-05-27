---
url: "https://www.reddit.com/r/cscareerquestions/comments/1mk8zj6/the_fact_that_chatgpt_5_is_barely_an_improvement/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "The fact that ChatGPT 5 is barely an improvement shows that AI won't replace software engineers."
author: "cs-grad-person-man"
date: "2025-08-07T19:07:34.000Z"
score: 4416
upvote_ratio: 0.91
num_comments: 880
flair: ""
extracted_at: "2026-05-26T12:54:26.363Z"
extraction_method: "praw-deep"
research_goal: "Identify emerging needs in the remote work sector."
---

# The fact that ChatGPT 5 is barely an improvement shows that AI won't replace software engineers.

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1mk8zj6/the_fact_that_chatgpt_5_is_barely_an_improvement/)
Posted by **cs-grad-person-man** · **4416↑** · **880 comments**

I’ve been keeping an eye on ChatGPT as it’s evolved, and with the release of ChatGPT 5, it honestly feels like the improvements have slowed way down. Earlier versions brought some pretty big jumps in what AI could do, especially with coding help. But now, the upgrades feel small and kind of incremental. It’s like we’re hitting diminishing returns on how much better these models get at actually replacing real coding work.

That’s a big deal, because a lot of people talk like AI is going to replace software engineers any day now. Sure, AI can knock out simple tasks and help with boilerplate stuff, but when it comes to the complicated parts such as designing systems, debugging tricky issues, understanding what the business really needs, and working with a team, it still falls short. Those things need creativity and critical thinking, and AI just isn’t there yet.

So yeah, the tech is cool and it’ll keep getting better, but the progress isn’t revolutionary anymore. My guess is AI will keep being a helpful assistant that makes developers’ lives easier, not something that totally replaces them. It’s great for automating the boring parts, but the unique skills engineers bring to the table won’t be copied by AI anytime soon. It will become just another tool that we'll have to learn.

I know this post is mainly about the new ChatGPT 5 release, but TBH it seems like all the other models are hitting diminishing returns right now as well.

What are your thoughts?

## Comments

- **raccoonDenier** (804↑): You have to understand that a lot of decisions aren’t based on how good AI is. It just has to be good enough to convince the non-technical person making decisions at an organization. As you can probably guess, the bar there is pretty low.
  - **ThePiousInfant** (250↑): AI ultimately thrives at convincing non-experts in a given field that it is an expert in that field.
    - **digital_soapbox** (85↑): This reminds me of what Elon Musk has built his empire on.
    - **IMovedYourCheese** (2↑): So AI is a typical Reddit commenter.
  - **[deleted]** (27↑): YES! Thanks for saying that
  - **ceevar** (26↑): The early movers will regret it and hopefully that causes some market correction.
  - **No_Confusion_7236** (4↑): Not even that! It just has to be dictated by market conditions, aka what a handful of VCs and CEOs want to happen. They piled all their cash into AI, so guess what is going to happen? Doesn’t matter what the tech actually can do or not.
- **Due_Satisfaction2167** (1437↑): As before, it’s essentially like paying a small amount of money to have the gestalt mind of Stack Overflow write some code for you.
  - **NotACockroach** (8↑): When I was in uni 10 years ago as a joke I made a vim plugin that would take a search prompt and insert the first code block from stack overflow.
  - **SkySchemer** (7↑): I like to think of it as Stack Overflow but without the attitude.
  - **puripy** (15↑): Wow, you just reminded me that I haven't visited SO in over a year now and I almost forgot about it's existence. There were barely any days I wud spend without SO in my early career(2010s). AI sure does replace industries. The change is just invisible..

Edit:
When I meant industries, I do mean a whole industry is now almost gone. Yes, edtech websites like geeksquad, SO, W3S and many more are all gone. If many such websites are not tracking any traffic, then it's obviously an industry that's gone. Not just a mere website.
    - **Jake0024** (17↑): SO is not an "industry"

AI is a new tool. Tools replace other tools, not industries. Automobiles replaced horses, but horses are a tool--not an industry
- **dowcet** (220↑): A helpful assessment of where we are right now: https://martinfowler.com/articles/pushing-ai-autonomy.html
  - **deviantbono** (306↑): > The model would generate features we hadn't asked for, make shifting assumptions around gaps in the requirements, and declare success even when tests were failing. 

So... exactly like human engineers?
    - **LetgomyEkko** (177↑): Except it forgets what it just wrote for you after 5 min
    - **Fidodo** (23↑): You know the industry is cooked because actually good engineers are so rare. Me and my team must be in an elite minority because we're actually proud of what we've built, have a process, and are not satisfied with the code quality of AI agents.
    - **DynamicHunter** (14↑): Except you can’t ever hold it accountable
    - **read_the_manual** (8↑): The difference is that human engineers can learn, but LLM will continue hallucinate.
    - **Livid_Possibility_53** (2↑): Same but worse. Atleast Humans can explain/justify their assumptions. Also humans can correct their wrong assumptions - "Well I thought this was fine but now I see the error in my ways". AI kind of self corrects but not in a sticky sense - just like an RNN (which is what chain of thought uses). For all that GPT does so well, it still exhibits the same shortcomings of classic ML.
  - **pkpzp228** (30↑): This is a good read, I say that as somone who works exceptionally deep in the SWE AI space all day every day.  One thing that frustrates me in regards to getting involved in the generic AI conversations that you find around here is how whoefully uneducated the public is about how AI is being used in software development at scale and in the most bleeding edge use cases.

Without getting into the argument I would point people at the section in this article that describes "multi agent workflows".  This is how AI is being leveraged.  One thing that the author calls out is that they chose from a couple pre made tools that enabled this ability, they also call out they did not use different models.  They chose this option vs creating their own agentic workflows.

Organizatons are in fact creating their own multi agentic workflows leveraging MCP and context engineering, specifically they're a creating agents that are bounded to specific contexts and play within their lanes for the most part, for example Architecture mode, planning mode, ideation, implementation, test, integration, etc. where these agents work automously and asynchronously.  Memory is also being implemented in a way that gives agents the ability to learn from past iterations and optimize on success.

Again not here to argue but I will say using an AI companion chatbot or a place you plug code into and ask for results is like chisseling a wheel out of stone while others are building a rocket to Mars at this point.  

If you're really interesting in understanding the cutting edge of AI in development I recommend this read as an intro [AI Native Development](https://danielmeppiel.github.io/awesome-ai-native/), full disclosure I'm not the author, but a colleague of mine is.
    - **Particular-Way-8669** (23↑): I do not think that it is secret but looking at your comments I think that you are way overhyping those work flows. First of all those "chat bots" you call as primitive absolutely do use agentic work flow under the hood these days.

Furthermore you talk about bleeding edge use cases which I categorically disagree with. Because use case actually assumes it is being used. If it was actually used in such a way human engineers would be obsolete by now. Multi agentic work flow is not rocket science either, you just have many, many agents talking to each other burning millions of tokens doing so. Not only is it not guaranteed to bring expected results (althought there are big hopes and money in it), it is not even guaranteed to be cheaper than humans were those results achieved.
    - **gravity_kills_u** (5↑): As an MLE doing a lot of architecture I am put off by the AI companies business case of replacing staff.  This will end badly.

I am equally frustrated by SWE types preaching the gospel of wholesale AI failure due to inevitable bubble collapse, as if leetcode somehow did not include AI/ML algorithms for optimization etc.  as if ML algorithms are not ubiquitous in multiple industries.  It’s hard to find any US companies not using models.  Developers without some relevant data science experience might be in for lots of pain eventually.

My point is that these are tools that neither replace humans nor lack industrial utility.
    - **numerical_panda** (5↑): So, over the past century we developed formal programming languages so that we are *unambiguous* about how we want to run our business processes.

But now we want to go back to using natural (and beautifully ambiguous) languages to specify our business processes?

And then we need a human to make sure that the formal language it spits out is *actually* what we want?

What sorcery is that?

We do realize that as we write less and less formal language, we diminish our ability to judge and assess formal language presented to us? i.e. if you don't practice writing, you'll get poorer at reading.
    - **CerealBit** (15↑): >One thing that frustrates me in regards to getting involved in the generic AI conversations that you find around here is how whoefully uneducated the public is about how AI is being used in software development at scale and in the most bleeding edge use cases.

90% of people in this sub have never coded anything beyond a hello-world application, given the content I see on this sub every day.
    - **terebat_** (8↑): It's easy to regress to certain viewpoints such as "AI will take over jr dev" or the converse viewpoint, "AI is useless". It's the type of stuff that'd easily get upvoted, rather than actual thought into how things can be better utilized and *are* being utilized. 


Focusing on incremental improvements in model space is focusing on the tree rather than the forest... There's been tremendous innovation in the application space. Many orgs are using agents throughout the org as you said, across multiple verticals. 


They are beyond useful if you're an expert, and can be reasonable even if not - hence why things like code reviews from more senior members are a thing. 


We've been able to lower a ton of operational efforts through varying agents across the org. This concretely resulted in a lower heacount increase than we would have had otherwise.
    - **Western_Objective209** (5↑): it feels like they are halving the distance between a good engineer and the bot every iteration. GPT5 was the big headline, but anthropic quietly released opus 4.1 and it is noticeably better at the agentic workflow than opus 4.0 and sonnet 4.0. GPT5 kind of feels like they are just trying to catch up to anthropic tbh.

With that said, I agree I've been going deep into agentic AI workflows and honestly I think it's at the point where it could take half the jobs in my dept from the guys who just maintain legacy code and make their annual tweaks
- **thephotoman** (70↑): They talk about replacing us because they don't want to have to employ us.

That's it.  It's a bunch of middle managers thinking that they're qualified to work the line, wanting to increase their pay by reducing their own head counts, and thinking that they'll survive the round of layoffs because they're special and keep the operation moving.

Also, based on how underwhelming ChatGPT5's improvement is, the technology *isn't* getting appreciably better. I suspect that we've already hit the limits of what LLMs can do effectively. They're impressive because they can pass a Turing test, but being able to pass a Turing test doesn't require correctness (and indeed may be limited by correctness: people believe bullshit all the time).
  - **VibrantCanopy** (12↑): They can't even pass a Turing test. Ask ChatGPT to explain music theory some time, then drill down. It can't keep it all straight.
    - **Dilie** (3↑): Yes I just experienced it is really bad at music theory. It even has a hard time with basic theory. I asked it how many families there are in diminished chords and it answered wrong on such a simple question.
  - **Bricktop72** (3↑): It will replace middle management before it replaced software engineers.
    - **thephotoman** (2↑): Yeah, and it really should. Zoom and Teams can provide meeting summaries, and as such the need for managerial delegation will see reduction. 

But the problem is that middle management wants their power games. They’re absolutely lost when there is nobody around for them to lord over, and the fact that they have senior management’s ear means that their views are taken most seriously.
- **bluegrassclimber** (259↑): My thoughts are that Claude-4-sonnet is really good and way better than chatgpt 4.

I haven't tried chatgpt 5 yet. I see it's available though, so I'm going to try it for my next story.

I use these models with Cursor AI and am a huge fan. I find coding way more relaxing. Nonetheless, one can't simply be a BA and use it, I still need to be a senior developer IMO to harness it correctly.

EDIT: after trying chatgpt 5, i like claude more. ChatGPT 5 was doing so crazy shit and churning and churning, it can't be trusted.
  - **TheNewOP** (36↑): > I find coding way more relaxing.

I feel the same way, but it's important to realize that this doesn't mean we're more productive. It just means that the cognitive load and stress from programming is lower.
  - **[deleted]** (26↑): I got Claude to create a few hundred lines of unit tests. Then I added a feature and had it modify the test. Iterate on that a few times. Then once Claude couldn’t fix a failing unit test it wrote. It was so painful to debug I deleted the test and wrote it by hand.
    - **ClvrNickname** (14↑): Even in writing boilerplate unit tests, which is one of AI's strengths, I've found you have to be very careful, because AI is really good at writing proper-seeming tests that don't actually test the thing you want them to. It's really easy to miss something like that when it's buried in a thousand lines of code that were all written at once, and it feels like the extra scrutiny you have to put into the code review largely cancels out the time savings.
    - **bluegrassclimber** (15↑): yeah at first it was a miracle for unit tests, but i agree. it does crazy shit and mocks up stuff and overall i hate unit tests with or without AI equally as much lol
  - **name-taken1** (20↑): I'm convinced we've hit a general plateau. Newer models will really just be about micro improvements: getting better at managing context, more reliable with tool calls, etc. But they really aren't getting fundamentally smarter or more creative at their core.

So, yeah, it'll not take anyone's jobs.
    - **Normal-Book8258** (8↑): Maybe but this was what everyone was saying before Sonnet 3 and then 3.5 came out.
I'm not saying it'll keep taking huge leaps forward but I wouldn't lose faith just yet. Remember chatGPT 5 isn't geared towards coding like Claude is.
  - **india2wallst** (8↑): ChatGPT needs lot of default prompting to make the output concise and serious. Claude does this out of the box. Yes you can get rid of the idiotic emojis and the sycophantic followup task requests.  I think OpenAI is more generous with usage limits in paid tier while I run out of Claude pro usage limits pretty fast.
  - **Primofinn** (2↑): People expect too much
- **PreparationAdvanced9** (47↑): Use it to prototype or setup greenfield projects from scratch. Once systems get somewhat complex, it simply becomes easier to code yourself.
- **Foreseerx** (109↑): Every technology has its inherent limitations that are not possible to overcome. The biggest issues for me with LLMs is their inaccuracy and their inability to solve non-trivial (read: something that's not googleable/something that the model hasn't trained on) tasks or even sometimes help in those tasks.

Those stem from the inherent limitations of LLMs as a technology and I don't really think they're possible to completely get over in any way that's feasible financially.
  - **Dirkdeking** (27↑): Maybe some other model needs to be explored for LLM's. Chat GPT is also surprisingly bad at chess, to the extent that GM's can easily beat it. But chess AI's are way beyond world champion levels for more than a decade.

 When it comes to programming or doing mathematics, perhaps we need something else. A kind of branching/evolution algorithm that rewards code that comes closer to solving a problem vs code that doesn't. An LLM only regurgitates what a lot of humans already have compiled. That just isn't efficient for certain problems, as you mentioned.
    - **BrydonM** (23↑): It's shockingly bad at chess to the point where an avg casual player can beat it.  I'm about 2000 ELO and played ChatGPT for fun and I'd estimate its ELO to be. somewhere around 800-900.

It'll oscillate between very strong moves and very weak moves. Playing a near perfect opening to then just hanging its queen and blundering the entire game
  - **soricellia** (10↑): But isnt this the biggest improvement with gpt 5? reducing the error and hallucination rate?.. at least based on the benchmarks they showed, its a significant improvement.
    - **SanityAsymptote** (30↑): All AI outputs are hallucination, they're just increasing correlation with reality. 


The fact that you can still access older versions of their LLM (and that they're free/cheaper) seems to indicate that newer versions are just additional post processing and workflow refinements rather than an improved model or different logic paradigm.
    - **BourbonProof** (9↑): tbf the error and hallucination is so damn bad that even a big improvement of like halving the suffering is still incredible bad
  - **claythearc** (2↑): I don’t know how true that really is - it’s very very rare for a novel task to not be a reorganization of already known tasks in a new way. The vast majority of engineering falls within that.
- **Cool-Cicada9228** (36↑): I shared the same thought. It’s somewhat comforting that the pace of change has slowed down. While the tools are useful, they don’t entirely replace all coding jobs (except for junior roles). Another AI winter would mean we retain our jobs for a longer period, and we’d also experience increased software productivity, which is a mutually beneficial outcome.
- **jyajay2** (44↑): Current AI technology won't replace programmers but there may be new AI technologies that will. That being said, once you can replace SWEs with AI you'll be able to replace a whole lot of jobs with it.
  - **rgjsdksnkyg** (8↑): It's doubtful AI will ever replace programmers. I say this not because I think humans are special, but because programming requires specificity, which is driven by intentionality - we write code and design applications to do things we want to do, which are things that generally do not already exist. To do this, we use programming languages, which give us simplifications of operations we want to execute on a processor. This abstraction, alone, limits what we are able to do and our control over how it gets done; we let the compiler substitute tons of assembly for the few lines we wrote, which may or may not represent what we wanted to do (we don't have control over exactly how the program does what it does if we aren't writing the assembly, ourselves).

If we expand on this abstraction, say to a "low" or "no-code" type of language, we surrender more control over what we are producing because we're using less "words" to describe how things should be done. If you ask AI to write you a program to do something, at best, the functionality of what it generates is limited by how well you describe what you want the code to do; else, what is the AI generating? You could spend hours describing exactly how the program should function and what specific details you need built in, but as you approach more specificity with your language, you approach the same complexity you would encounter if you had just wrote the code, yourself. 

Practically, you may think it doesn't matter, because AI can write you something that's maybe 80% of what you need or maybe you can't code and it's already helping you achieve something you couldn't do, but in the real and professional world, where an application has to do something complex and novel, with efficiency, accuracy, and reliability, there's no getting around the work required to describe that, be it through code or natural language.
    - **Megido_Thanatos** (2↑): People simply dont understand that AI cant make decision, they see AI generated a big chunk of code and say "wow, amazing" but they didn't think it only generated follow your command (prompt), an input make by human brain and that is what we should giving credit, not the machine

That already a thing long before AI era. You can did some gg search and copy exact code from StackOverflow and work perfectly fine because the decision still on devs, the code is just the implementation of ideas
- **Timely_Note_1904** (11↑): They have used up all the good quality training data. Improvement depends on an ever increasing pool of good training data.
