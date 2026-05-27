---
url: "https://www.reddit.com/r/cscareerquestions/comments/1rn8e3g/have_we_professional_developers_already_lost_the/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Have we, professional developers, already lost the battle against vibe coding?"
author: "yes_u_suckk"
date: "2026-03-07T12:06:38.000Z"
score: 767
upvote_ratio: 0.86
num_comments: 663
flair: "Experienced"
extracted_at: "2026-05-23T20:15:57.470Z"
extraction_method: "praw-deep"
research_goal: "Identify a comprehensive new strategy for co-op based on the current statement of work for NU, prior projects with NU, and fresh industry analysis of experiential learning and co-op engagement tactics to improve learner's chances of gaining meaningful experiential learning opportunities from pre-enrollment to graduate school\n"
---

# Have we, professional developers, already lost the battle against vibe coding?

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1rn8e3g/have_we_professional_developers_already_lost_the/)
Posted by **yes_u_suckk** · **767↑** · **663 comments**

I work as an IT consultant and I have 20 years of experience. Recently I've been doing interviews with potential new clients. Last week I had one with a major Fintech company (we're talking one of the biggest in the world, hundreds of engineers).

During the interview, they asked me how I approach an unfamiliar codebase. I said what I always say: I start by reading the unit tests to understand intent, then go through existing documentation and diagrams, then I read the actual code to build a mental model of what's happening.

The interviewer looked at me and asked: "Why don't you just ask AI to explain it to you? It's much faster."

I explained that AI can be a useful tool here, but I want to genuinely understand the code and I want to be certain I'm not internalizing a hallucinated explanation and building on top of it. The interviewer was visibly disappointed.

Then they asked about my approach to developing new features or fixing bugs. Same story. I walked through my process: reproduce the issue, trace it through the code, understand the root cause, write a fix, test it.

Again: "Why not just use an AI agent to find the bug and fix it for you? It's much quicker."

I gave the same reasoning about hallucinations and wanting confidence in the code I ship. The interviewer's response genuinely stunned me:

"That's only a problem if you don't check the results afterward. Nowadays it's much easier to just let AI do all the work and check it at the end."

I didn't get the job. The feedback was essentially that I *don't use AI enough.* Here's the thing though: I wish I could say this was an isolated incident.

Last month, my current client (the largest hospitality company in Europe) held a workshop for all their developers. Tech leadership stood up in front of the entire engineering org and essentially told everyone they should be vibe coding. The reasoning was identical to what I heard in that Fintech interview: AI makes everything quicker, just let it do the work and check the results at the end.

So now I've seen this from two sides: I got rejected by a company for not using it enough, and I'm watching another company actively mandate it from the top down. These aren't small companies, these are massive, established companies with complex systems: one handling people's money, one handling millions of bookings across an entire continent.

I'm still processing all of this. I'm not anti-AI. I use it daily, but there's a difference between using AI as a tool that improves your understanding and using it as a replacement for having any understanding at all.

My question to this community: is this the new normal? Have companies fully bought into "AI does the work, humans spot-check" as an engineering philosophy? And if so... what does that mean for those of us who still believe that actually understanding what your code does is a professional responsibility, not a productivity bottleneck?

Because right now I feel like the dinosaur in the room and I'm not sure I want to evolve into whatever this is.

## Comments

- **Neither_Bookkeeper92** (692↑): ngl this thread is wild because both sides have valid points but theyre talking past each other lol. i work in cloud infra and use AI coding tools daily - it speeds up understanding unfamiliar codebases a LOT. but i still verify everything it tells me. thats not vibe coding thats just being smart about your tools.

the real issue nobody talks about is how juniors build intuition if theyre never actually in the trenches debugging stuff themselves. i already see junior devs shipping AI-generated terraform that works... until it doesnt. and they have zero clue how to fix it because they never learned the fundamentals.

companies are in the fuck around phase rn and the find out phase is coming when those AI-generated codebases become unmaintainable. your skills will be MORE valuable then not less.

hang in there man. 20 years of experience doesnt become worthless overnight
  - **michownz** (108↑): This is exactly how I have been thinking about it. Developers with actual experience will become a rare species.
    - **consultinglove** (30↑): Which is okay. We’re going to have two levels of developers: vibecoders that use AI for everything without full understanding, and in-depth experts that still use AI for everything but can also fix things when problems come up

As AI gets better, the vibecoders will become more and more effective. And yes, there will be fewer and fewer “true experts” over time

It’s what happens to all technology. There aren’t a lot of people nowadays that know how to maintain mainframes anymore. But we also just have fewer mainframes
    - **Tim-Sylvester** (1↑): And almost nobody makes barrels or candles or pencils by hand, either!
    - **ReiOokami** (1↑): But does it matter since ai now can figure it all out?
    - **ShustOne** (1↑): I don't think the distribution will change much. There are already tons of seniors that make me wonder how they got their jobs. I think standouts will still stand out with the new tools. And those same people will work to ensure they understand the code just like now.
    - **Hotfro** (1↑): I’m fine with that more job security for us devs that have experience already before AI.
  - **GoblinBurgers** (18↑): The bigger issue is the juniors not being equipped with the right tools to progress
    - **buxA_** (12↑): Yea they push you to use ai tools and finish tasks fast
  - **HypnotizedPlatypus** (18↑): What do you mean "You verify everything it tells you"? If I ask it "how is xyz feature implemented" and it tells me, if i then go and scan through each line of code, each class involved, why did I ask the AI in the first place? 😭. I dont mean this as a dig i just dont see the point in asking if you're just gonna go look yourself after
    - **rustycocacola** (26↑): Scanning code is quicker than writing it. What takes you longer a code review or implementing a story?
    - **buxbox** (2↑): Depending on how you prompt it, there can be overcomplicated implementations and oversights on the AI’s part; this introduces software instability or just make it longer to debug with down the line. As others mentioned, it’s faster to review code rather than implementing.
    - **SanityInAnarchy** (1↑): It can accelerate finding the relevant code, which means less I have to read. And it can tell me things that are easier to verify than they are to discover. It can help if you get too high-level of an explanation, and you follow up with something like "I want to check this myself. Can you cite the specific code that does this?"

Basically, it's being a smarter grep, especially when you didn't quite know what to grep for.

I do think this makes OP's interview experience a little unhinged, though. The tool is a slightly faster grep. Imagine losing an interview (or worse, a job) because you admitted to using GNU grep instead of `rg` sometimes. The people running the show seem to really think micromanaging tool use at this level is a good idea.
    - **WellHung67** (1↑): AI (meaning an LLM here) hallucinates, and it is impossible to prevent hallucinations, fundamentally there is a theoretical limitation that cannot be overcome. So if you don’t read it, then you are guaranteeing your code will have hallucinations. And the hallucinations are not fixable - having an LLM “review” the code doesn’t prevent them or fix them, it’s a fundamental theoretical limit.

So if you don’t read it, then you are leaving the bugs in the program that can be anything - there’s no rhyme or reason to hallucinations. Of course humans ship code with bugs too but humans can learn and develop practices to reduce bugs in code. AI cannot. So it’s the difference between leaving bugs generated by a random text output, which is a vast space, vs human produced bugs, which are easier to identity “how” they happen once discovered and fixed.

So yes you should read the code, if you don’t then you are leaving AI hallucinations in your code and there is no way to figure out why those specific ones appeared.

Also, even if there was a perfect AI (that isn’t possible with LLMs but assume in theory it was) then if there is any ambiguity in your prompt, the LLM is free to do what it wants which could be a bug (or it has to ask you to clarify further and this process will take time as well).

I haven’t yet seen any evidence that the hallucination problem is not a dead end for the whole LLM field
  - **powerfulsquid** (2↑): Insightful af and couldn’t have said it better myself as someone with 20 YOE in the industry.
  - **Won-Ton-Wonton** (1↑): The issue with Juniors is NOT that they are not in the trenches.


It's that the goal of the business does not align with the expectations of a Junior.


The Junior is being asked to deliver the results of a Senior, without being a Senior or paid as a Senior.


Either deliver the code or be fired. To hell with your desire to understand anything or get better. Get. The. Code. Out.
  - **FluffySmiles** (1↑): Exactly. 

And may I add that it really, really helps if you know how to get the most out of AI, through using and stretching and (effectively) using it as a peer partner in more than just coding. And the senior partner is always human. 

It’s learning the environment from which mistakes will be made.
  - **Scottoulli** (1↑): It’s like all the new pilots that rely on automation fly the plane. Until the pitot tube ices over and you plane falls out of the sky
  - **comicrack** (1↑): This is exactly what happened when engineers at NASA began relying fully on and inherently trusting computers and computer programs to do complex math for automating rocket trajectory, stabilization and navigation.  When a single programming error was found to be the cause of a catastrophic launch failure, they realized that they needed to develope computer programming/engineering as an actual discipline. A method of writing, testing, and debugging code.  It is considered to be the catalyst for the creation of the modern computer developer and programming profession. NASA needed skilled coders that wouldnt just maverick the solution.

This is now where we are with AI.  Those companies who implicitly trust AI generated code without thorough testing, debugging, and analysis by experienced/educated coders will encounter their own version of catastrophic failures. 

The current profession of computer programming will need to add AI code review and analysis to their discipline.  Unless it is shown that doing that analysis manually using legacy tried and true techniques achieves the same goal faster AND more reliably than their acceptable tolerance for failure with AI, you will need to begin incorporating optimizing AI code analysis, review and testing/debugging techniques into your repertoire. In the end you may still have to go back and do it manually without AI and explain why it took twice as long than if you had just done it without AI from the beginning.

Unfortunately, few if any universities may be teaching this effectively but it may fall to existing industry professionals to develope the techniques and literally write the book on how to optimize AI code analysis and review of the results.
  - **Leading-Ability-7317** (1↑): I think a lot of the engineering focus is going to shift to system and integration tests.  

If you have solid coverage there from a scenario/requirements, security, fuzzing and validation testing then I think things will go well.  Coincidentally this is also true for old school development.  But, in my experience it is rare to see truly good test suites outside of FAANG level companies.
  - **eightslipsandagully** (1↑): I guess the thinking is that AI models will improve quickly enough for this not to be an issue? I'm very skeptical though - I think we're in the long tail of LLM improvement and the companies are losing money at an insane rate. The inevitable enshittification is gonna be crazy and those of us with experience should be laughing
- **chaos_battery** (47↑): Last year I was let go from a team that was vibe coding very heavily. This was a company with thousands of employees across the globe. Basically they started an innovation team that was going to jump from project to project every few months and vibe code their way to success for quick wins. They wanted to turn out MVP prototypes, constantly demo them so executives could feel like they're getting a good deal, and then hand it off to a traditional development team to maintain and work on. 

As you know, AI tends to produce decent code with good practices baked in but when you have several other developers on a team also generating mountains of AI code it sort of acts like giant icebergs of good code in isolation that all have to come together at some point. The pull requests averaged 80 to 100 files. The laughable part was we still tried to assign people on a team to do a human review and I didn't even bother. Just let copilot review it and if you address those concerns then you can merge. 

I feel sorry for the teams that have to maintain or build out any of the applications that team produces. They are leaving a giant pile of tech debt in their wake and I don't think they see it for that. But they're iterating fast and trying to turn out results quicker with weekly demos. I found the environment exhausting constantly justifying your existence. It was one of those traditional scenarios where leadership has some arbitrary deadline and they want to see how high they can make you jump. I'm just a little too old and a little too jaded to play into that dog and pony show. I came in and did good work but I'm not going to kiss their ring.
  - **SanityInAnarchy** (4↑): Meanwhile: We're discovering that a bunch of human-authored tech debt we've been living with for years is *even worse* for AI. The AI doesn't complain about it, it doesn't get emotional, but it does churn out worse code as that piles up.
  - **Enculin** (6↑): "As you know, AI tends to produce decent code with good practices baked in"


No that's not my experience, for me I find the architecture to be very lack luster when you ask more than a few functions.
  - **Cute-Performance4911** (1↑): This has been my experience too but the flow is too strong. People are casually sending in 4000-5000 line code reviews with no awareness of what's going.

  
And pushing back on it seems like a surefire way to get on the chopping block.
    - **chaos_battery** (1↑): It seems like if you need the job, it's one of those situations where you just need to be agreeable like a good little worker be even though they are piling up the tech debt heavily. They are betting their future for today because they want results right now.
- **Primary_Excuse_7183** (39↑): When vibe coders build an entire application and try to implement it into a system they have 0 understanding about and the implications of…. They’ll need someone with experience to undo the mess. technical debt is real.
  - **Godunman** (1↑): True. That's what "vibe coding" is, just throwing together vibes to see what something can look like, best used for proof of concepts. That's also not what OP is describing, which is debugging, learning, and working on an existing codebase. If you aren't using AI to at least *try* those things you're going to fall behind. Let it do its thing in the background and do that at the same time if you really want.
    - **Primary_Excuse_7183** (1↑): Yep. people say coding is dead and yada yada. The smart companies know that AI will augment the mundane. But having an AI enable engineer working faster and more efficient at what can make them more money is what’s going to differentiate the next group of breakout tech companies.
- **Key_Turnover_4564** (463↑): You are a good engineer, just not a good consultant. Not good enough to quickly understand what your clients were looking for and pivot.
  - **Zestyclose-Durian-97** (182↑): He is neither a good engineer.

A good engineer makes use of the available tools to get the desired outcomes. Not asking AI about the codebase, to implement boilerplate code etc is similar to coding in notepad or measuring with coins instead of using a ruler.

If you don't want to be replaced you need to understand that AI, when used in a good way, makes one quite a lot more productive. Learn how to use it and don't lag behind.

The real losers of all this are juniors and new grads, the business world needs to wake up to it. They don't have the experience, knowledge and skills of seniors to be able to guide AI in a good direction, verify and iterate fast. AI is not making them more productive, it just makes them produce shit. Then businesses all say "We need to get seniors to be as productive with AI as possible". Wonder what'll happen since they cut the talent pipeline?
    - **AndorinhaRiver** (37↑): A good translator makes use of the available tools to get the desired outcomes. Not asking Google Translate about the text, to infer meaning, etc. is similar to coding in notepad or measuring with coins instead of using a ruler.

If you don't want to be replaced you need to understand that Google Translate, when used in a good way, makes one quite a lot more productive. Learn how to use it and don't lag behind.
    - **danintexas** (23↑): > A good engineer makes use of the available tools to get the desired outcomes. Not asking AI about the codebase, to implement boilerplate code etc is similar to coding in notepad or measuring with coins instead of using a ruler.

This hit home hard. I was stuck in the learning phase of development for literally years because I thought using an IDE or looking on stack over flow was cheating. LITERALLY the same thing with AI. LLMs are an amazing tool. 

End of the day we are here to make a widget. What ever tool gets us there is cool with me. 

I believe there are some who are in development because it is seen as a 'smart' career. They liked the rush of solving complex problems and having others look at them as some sort of wizard. 

Just build the widget. Read a book and study the classics like philosophy or physics to be a wizard and actually BE smart and not act like you are. I am rambling at this point. lol
    - **[deleted]** (3↑): Thank you. I’m a decade in and I firmly believe the discussion is long over.

If you are an engineer today and you refuse to use AI, you will be left behind and you will lose your job.  The productivity increase my team has seen now that almost everyone is using Sonnet is utterly ridiculous. 

We have an older (very experienced) dev on the team who isn’t really using AI and he’s kinda in hot water for not delivering as fast as everyone else now.

A lot of us literally don’t even have a choice because the higher ups have fully bought into AI. It doesn’t matter though because as of this year, I now believe that Claude is an invaluable tool. We are exiting the Google/StackOverflow age.

Like others have said. It takes a good engineer to not make slop with AI, but a good engineer combined with a good AI agent is going to be the standard for SE moving forward. 

We even have AI recording, listening to, and facilitating all of our Teams meetings now. The more context we feed it the better it gets, and it is now catching things that humans are missing.

I guarantee if OP interviewed at my company he would get the same rejection.

I think a lot of people in here fail to remember that our bosses and their bosses care about one thing and one thing only.
    - **mexican_restaurant** (1↑): Being completely honest with you, as a senior engineer, super selfishly… it’s not necessarily bad news to me personally that the pipeline is being tightened/shut off for the ounce of job security that adds for me haha.

It’s not surprising though at all, all the businesses that I’ve seen putting the time into hiring and training and using senior time to mentor… all of those juniors end up leaving anyway because they grow and see that their skills are now super marketable elsewhere (and/or that place also doesn’t understand that they don’t owe the Eng anything, and still need to promote quickly and move them through the ranks to keep from leaving), leaving these places that put the time into it holding the bag. The places that I knew of that were doing it (and had good junior programs!) aren’t anymore…

Part of me thinks this change of course may actually be a blessing in disguise for would-be software engineering students though… simply put the demand for this type of role has changed and morphed into something else. Seems like there would naturally be a change in supply of new (traditional) eng grads…
    - **Automatic_Tailor_598** (1↑): What your describing isn't vibe coding though. Not as I understand it. What your describing is using AI. 

Vibe coding is "build me an app to do X" and then using it. Not understanding how it works.
    - **yticmic** (1↑): Yeah it's like refusing to use unit tests or a compiler. It's a tool.
    - **Hotfro** (1↑): I think it may be up to seniors to push back. Do not let juniors ship their code without you reviewing it first. If it’s trash add comments, if they keep making the same mistake fire them.
    - **Kyanche** (1↑): > If you don't want to be replaced you need to understand that AI, when used in a good way, makes one quite a lot more productive. Learn how to use it and don't lag behind.

Honestly at this point why bother hiring people with CS degrees? Just go direct the AI yourself.
    - **OkPosition4563** (1↑): Also the chance of you misunderstanding something while analyzing the code base is a million times higher than AI "hallucinating" something wrong.
    - **Cute-Performance4911** (1↑): It's not as big a problem for companies as you make it out to be.

There'll always be some 5% of juniors who somehow managed to make their way into roles. That 5% will be enough to take the reins 20 years from now.

Hiring juniors so that we have workers tomorrow is overrated in today's world.
- **PartyParrotGames** (30↑): Your interviewer is falling into the "Verification Gap". They believe "checking the output" is a trivial final step they can accomplish with vague overviews. However, you're a 20+ year veteran in the industry. You know that effectively verifying a change in a massive, complex, production codebase is a whole lot harder and time consuming than just writing the code from scratch. We know people are full of shit when they say they verified a codebase works, but then they can't actually explain \*how\* it works in detail other than "the AI figured it out".

The next time this happens, try something like flipping the script and asking to go deep into the details. "I'm curious, in a system as critical as this Fintech's core ledger, how do you handle the Verification Gap? If an AI generates a 500-line change, how do your engineers verify the concurrency safety or the edge-case handling without performing the exact deep-dive process I just described?"

The truth is, you can't actually verify these things without digging into the code with the process you described exactly. You cannot truly understand it without reading through it. You may think you understand it, the same way an AI thinks it one-shot the ambiguous prompt given to it with limited context or clarification, but you don't \*know\* it. iykyk
  - **seventeenninetytoo** (10↑): I worked for years at a major electronic health records company that has an entire QA division dedicated to verification. Mostly black box verification doing by manipulating the UI like an end user. They keep countless spreadsheets of workflows and expected behavior. They had approximately 1 QA per 2 engineers when I was there. That's a FTE salaried role doing nothing but verifying the software all day every day. And QA was the bottleneck on most projects.

Trust me, verification is slow and expensive. At least in domains where it truly matters. And the cost of verification scales super-linearly with the number of modules due to the cross-functional verification needed. Maybe in random consumer-facing SaaS where the domain inherently means bugs don't cause major loss, it will be fine to just crank out AI slop and barely verify it. But even that will have limits. Paying users still expect things to work even if the software is just a novelty, and they churn if it doesn't. Then in domains where correctness is a matter of life-or-death, or of major financial loss, verification will have to scale to match the AI output. And that is going to be expensive.

This is why I'm not too worried about these industry changes. I foresee the amount of real engineering work to be done actually growing with AI, not shrinking. AI is very good at automating the generation of boilerplate in CRUD apps, sure. But that was never the most valuable part of software engineering. It's just a means to an end.
  - **OlegStotsky** (1↑): Lol is this meant to be a satire? This is clearly written by LLM
- **burningburnerbern** (21↑): I am so confused about all of this. It’s like what are we even doing anymore. I’m seeing people use AI to generate prompts. I honestly feel like we’re just turning into monkies passing things around. Create an agent that creates other agents. What the hell are we doing?!?!
  - **buffet-breakfast** (1↑): The job of developer is dead. It’s been automated.
  - **obama_is_back** (0↑): Writing software has always been about passing data around.
- **mehdalotian** (477↑): Senior here with probably an unpopular opinion, I would’ve agreed with you two years ago but now using AI to code and ensuring it’s correct and meets team code standards afterwards is expected. Agents are actually that good now. With ten years of experience you should be able to do a cursory glance and know if it’s bs or not and focus more on system integration/design  (what AI can’t and should never do).
  - **suckitphil** (114↑): Bingo. AI isnt going away. It is very powerful though, and we should use it for as long as we can until they start pulling the purse strings.


However we should be mindful what we send it isnt just a single word prompt, you actually need to give it context and decent direction otherwise its a loss of money.
    - **sandysnail** (2↑): > AI isnt going away.

i'm not gonna even argue against its use cases here but I do want to argue that it doesnt matter how good it is if it costs to much. and right now they are giving it away HIGHLY subsidized. Companies are gonna make different calculations based on cost once these AI companies cant burn BILLIONS every year
    - **cookingboy** (-16↑): Just remember whatever AI is today is the worst it will *ever* be. ChatGPT was released just 3 years ago and just 12 months ago using AI for coding was in its infancy, if not seen as a bad joke  (so much so I passed on an opportunity to invest in Anthropic at $20B valuation 12 months ago, missing out a 20x return in 12 months).

Now 12 months later it's pretty much settled conclusion that the latest Claude/Codex are far better at coding than pretty much any human engineers, and even when it comes to architecture and design I would say they now operate solidly at a Google/Metal L5 level if you setup the context and other infra correctly.
  - **Away-Turnover-1894** (83↑): Definitely an unpopular opinion here but one that I agree with. OP I'm sorry to say this but I think your perception here might be a bit backwards. The problem is not that the vibe coders have won out, the problem is that your skill set is actually quite behind. And it shows from the fact that you still believe AI is not good enough to do the majority of research and implementation. You haven't been using it enough.

I work at a shop with a huge codebase and integrations across many different internal services, and despite the complexity we are nearing the point where AI can implement anything end to end. AI is catching bugs during reviews that humans miss. AI is able to draft designs for us that fit perfectly into our existing architecture.

If you don't know this, then you are behind and you need to upskill. This is why you were not hired. Your mindset was great when humans had to write most of the code, but the job has changed. Regardless of your personal opinions on it, you'll have to either get on board or you will miss the boat.
    - **NewAccountToReply55** (72↑): A) By letting AI do all the coding for you, you are actively unlearning what you used to know. There will come a time you will no longer be able to review what the AI did because you no longer know how to do it yourself, because it has been years since the last time you actually did it yourself.

B) Who will review and check what AI did, once the current generation of developers is retired? If nobody is actually coding anymore, nobody can acquire the knowledge to be able to review AI code.
    - **Longjumping-Donut655** (40↑): “Upskill”. Specify one way in which letting some AI do everything for you, and just stamping its work is a skill
    - **nugget_meal** (6↑): What are they paying you for then?
    - **SanityInAnarchy** (5↑): > You haven't been using it enough.

Thing is, we've been told this from the beginning. "The tools are better now," or "It's a skill you have to learn," or especially the old "You need to use it or you'll be left behind." This despite *also* constantly hearing "It's not perfect," and "It's only going to get better," and "Just make sure to always check its work."

So, recently, I've found it's finally getting from a point of pretty consistent net *negative* productivity to at least somewhat useful. But I've also seen the code produced by letting the AI "implement anything end to end." It's at the point where it's *much* more effective to catch problems early -- problems in design, actual implementation bugs, even just style problems where this is gonna turn into a 1kloc PR that no one wants to review.

Because otherwise, you'll be faced with that 1kloc PR that *looks* okay, and this will be both more difficult and less interesting than whatever prompting you did that led up to it, so you'll ask the AI to review:

> AI is catching bugs during reviews that humans miss.

This is unsurprising, it's been doing that for awhile.

What it's also doing is writing bugs that no human would write. Some of them are easier to catch than human bugs, and some are much harder, because the code always *looks* clean -- it's missing all the code smells that a human leaves when they're getting sloppy.

That 1kloc PR isn't a hypothetical, by the way. I have a specific one that sticks in my mind because while it superficially looks okay, the commit message wasn't *amazing* by my standards but was better than a lot of juniors, the code may have had more duplication than needed and a bunch of obnoxious comments explaining what each bit of code did instead of why...

So it didn't stand out to the author, reviewer, or the AI that each was obviously relying on, that it had:

* Broken a critical production tool. The kind of tool you only really need in emergencies.
* Seen a unit test failing because this tool was broken.
* Tweaked the test to mock more things so it passed *despite* the tool being broken.

I think that says a lot about the state of things. You can of course steer the AI better to avoid that kind of thing, but your main tools for doing so are carefully reading the code (which is harder with AI than it is with humans), and better testing (but the AI is also making massive changes to tests).

So at a certain point, if you're not using your brain enough, quality *will* drop. And this will compound -- tech debt hits the bots harder than it hits humans if it isn't cleaned up. But the top-down mandates pushing this have much easier measures of features shipped than they do of tech debt, so the impact of this is gonna be a bit delayed. And the humans who are the most enthusiastic adopters are gonna be the ones who don't catch the problems early, don't wanna review the gigantic PRs later, and so they ship faster and get promoted more often.

We're about to find out just how much downtime the market can actually bear.
    - **throwAway123abc9fg** (7↑): What boat? In your worldview, how long do you think your company is going to keep paying you to watch ai work?
    - **Ok_Cancel_7891** (1↑): How big is the codebase?
  - **Kaizukamezi** (16↑): I don't think its a 100% true that AI agents are good enough on their own. The tools integration with AI agents has improved a lot. But I also think developers have also adapted to how to use AI a bt better - but its also why not only is AI not going to be a replacement for engineers, it instead is a highly personalised tool akin to vim or zsh. Engineers now know what questions to ask, and what the packet size (hehe) of each question should be to get the best result out of AI agents. Most devs I talk to including me just end up writing psuedocode in plain English and get one shot results. BUT hand the same tool to a non dev or even a junior/grad, they'll not get equally performant or spec compliant results because their questions might be too big or too vague. The novelty of AI IMO is just that it is a new UI to write code. That's about it.

I am not saying AI is as good as the prompt. Prompt engineering as a field/skill is a Linkedin fluff scam. I think the prompt is as good as the engineer. You don't get better at prompting, you get better at engineering and to do that you have to use AI sparingly, and that's a cost leadership in all orgs have to accept - its inevitable. AI will never be good enough/cheap enough to do things on its own by very nature of LLMs. You become better by asking the right questions, prototyping different solutions, seeing things fail in action etc and none of that has changed. From a purely cynical perspective, I think AI is too expensive to be sustainable and that's where the bubble is. The peak novelty of it was realised a year ago, since then only engineers have evolved, AI not so much.
    - **Mephisto6** (2↑): Exactly

In the end i use AI in the sinilar way I would approach a problem.

Ask AI to give me a first wuick overview.

Ask it to check it’s own assumption

Ask it to plan first. To divide the problem into subtasks.

To write summary files, solve sublroblem first, ask me for feedback at the right stage, write tests and metrics to verify. 

Then i evaluate the system design choices it made and propose changes.

I’m guiding it with the same mental models I use to work. Modularize, plan and abstract in the right way to increase context length.
  - **CriticalCorduroy** (16↑): Um, yeah I will call bs to an extent on this take. I use Claude Code and it’s genuinely useful. I wouldn’t work without it at this point. However I’ve had coworkers constantly generate complete slop because they don’t prompt effectively or review the outputs. You can use LLMs as a productivity tool, but you have to get your mind around the result just like if you hand-wrote the code.
  - **tacopower69** (12↑): I actually agree but this is some sort of shill/bot account. upvote ratio is too bizzare.
    - **Ornery-Car92** (41↑): This is like completely obvious, they all are saying the same sensationalistic shit just worded slightly differently, with perfect grammar and punctuation:

"Use AI or get left behind."

"The world has changed. AI or die."

"Claude now does everything for me. It even fucks my wife."
    - **AndorinhaRiver** (12↑): It probably is, there's been *tons* of astroturfed bs like that lately.

Also the fact that they're praising agentic coding but also simultaneously saying you need to check your code, is pretty crazy because those two basically contradict each other lol
  - **Etiennera** (2↑): This is right. I'm OP's story I think the problem is treating hallucinations like the boogeyman instead of demonstrating the ability to leverage AI while working around them.
  - **SLW_STDY_SQZ** (2↑): While these LLMs are not what their creators hype them to be I completely agree. At my org we all pretty much use it and we have a pretty large complex codebase that serves high traffic application. It has been very productive for my team, even with manually careful reviews things that used to take 3 days to a week are now done in a day or less. Not only that but we now have much higher confidence in our output bc it just doesn't create and run unit tests, but we have configured it to do full e2e tests on the running services, something we honestly never had the time for in the past except for very critical high visibility things. Now we have it for everything.

Not only that but through the use of MCPs you can give it access to your documentation and monitoring tools and the debug and incident triage is just incredible, this is even more of a game changer than the coding bit imo.

My feeling is a lot of ppl are just firing these things up without doing any setup, or they are setting them up incorrectly bc of the fundamental lack of understanding of how they work, and then get not such great results.
  - **CCB0x45** (2↑): Weird that this is an unpopular opinion. It's the truth. Yes youve lost "the battle" with AI, the tools have changed the industry and if you aren't using them then you will be slower and less productive.
  - **chescov77** (1↑): Exactly, sounds more like someone resisting to adapt to the technology than an actual problem.
  - **CapitalDiligent1676** (1↑): Thank goodness! It's like saying you used to be a carpenter and now you're a laborer. But it's a different job! That's not a good thing.
- **d3d-z7n** (114↑): 14 YoE, here.
It’s a daily part of my routine, and usually first tool I reach for. I work on a highly distributed system processing petabytes of data a day.

It’s like having an ungodly fast, mostly competent junior engineer in my pocket, but one that needs thorough supervision. Great for methods and classes, not so much for ecosystems and complex ideas like concurrency.

God help the future of this industry because I don’t know how the young ones are going to get the necessary experience to identify the bullshit.
  - **sam-lb** (24↑): Yeah, this problem is broader than software engineering. Hank Green calls it the disappearance of apprenticeship. Honestly I'm looking forward to the world where the heap of shit piled up by shortsighted companies becomes so overwhelming that they're forced to put down the magic genie and get some actual people to address the issues. I'm glad I had 10 solid years to program without generative AI (and learn other concepts without AI for that matter) because otherwise I'd be a useless sack of shit dependent on outsourcing all my decisions and thoughts to an unreliable, hallucinating machine.

I used to _love_ AI before it was hijacked by insufferable, greedy, soulless fucks who converted ideas of tremendous value into new ways to exploit and subjugate people. Shouldn't be surprised I guess. Data science is still interesting, but now it's got a big dark stain on it.
  - **natekohl** (16↑): This tracks with my experience as well: pretty useful for low-hanging fruit, but gets bogged down quickly on trickier problems. Exactly like a human intern/junior engineer.

Unfortunately the tricky stuff is like 95% of my job.

And this is what confuses me now: are the folks who claim engineers won't exist in a year only working on easy stuff? Being a SWE would be SO MUCH EASIER if it was just stringing together simple classes and functions.
    - **[deleted]** (5↑): Do you think Most SWE jobs at random no name companies involve anywhere nearly as much tricky stuff as your job? If even 20% of SWE jobs are taken that is a massive loss to the industry and will reduce wages
    - **SerRobertTables** (2↑): Anecdotally, the people claiming engineers won’t exist in a year are frontend JS devs or people selling courses. Sometimes both.
  - **Zestyclose-Stick-165** (14↑): I'll second this. I get a similar feeling, with additional observations.

I work with 2 mid-level and one junior humans. We all use AI coding assistants a lot, except that the junior guy tends to make a hash of it way too often. As if it actually didn't help him at all.
In the end, I have to keep tabs on this process and its results. It is more draining than ever before. It feels like I was running a considerably larger team, but still had to pay attention to fine detail. 

29 YoE and I thought I've seen it all. But I haven't seen this before.
  - **Fruloops** (15↑): >God help the future of this industry because I don’t know how the young ones are going to get the necessary experience to identify the bullshit.

They won't, most likely, and the reliability of software is bound to go down. I'm looking forward to the inevitable fiasco
  - **chaos_battery** (26↑): That's the problem. Companies are salivating over the efficiency gains of AI and it's sort of working right now because you have senior engineers that can monitor the output and know when it's crap. Who knows maybe the additional compute they are building out in data centers in addition to improvements in the models will eventually be enough to bridge the gap. But if that doesn't end up working very well, they are making a serious bet that they won't need those junior engineers in the future. Vibe coding is also a bet that you won't need to worry about the quality of your code base because AI will always be reading it so let the text at just load on....
    - **Manodactyl** (8↑): 25 yoe here. Depends on too many factors to make a blatant statement. In my time ive gone from copying example code from a text book to copying code from a stack overflow post to having AI write code (no copying needed since it writes it in the ide) all of these have reduced the amout of time that I’m physically writing code from scratch but has increased the amount of time that I’m reading, understanding and tweaking code to do what it actually needs to do.

AI can help with this as well, I can feed it unfamiliar code and it can give me a mostly correct analysis of the code to help get the overall picture of what it’s doing. Otherwise I’m there building that mental model myself either by reading the code or by stepping through it. Bot having to do this step is a huge time saver. 

The thing that always slowed me down in the past was trying to figure out where/how to start something. AI can quickly give me some code to start with that I can then take and run with. 

AI does a decent job when you ask it to for a method that does X. It’s not so great at putting all those methods together to achieve the desired result.
    - **edgmnt_net** (1↑): Not necessarily. Companies have done / can do a lot of stupid stuff that takes anywhere from a few months to a few years to fail catastrophically. Focusing on code generation with no real means to control higher order concerns like "WTF am I going to do with this 30kLOC PR" (and especially once the codebase grows on a slop diet) is a dead giveaway.
  - **t-tekin** (2↑): “I don’t know how the young ones are going to get the necessary experience to identify the bullshit”

With the same way we did right?

In engineering you slowly learn the right level of trust you should be giving to different code bases, tools, systems, humans around you and teams/companies by the results you get from these. Weird issues, lack of quality lowers the trust slowly. And your spidey senses slowly starts to get better. 

I have worked with bullshitter engineers in the past. The same thing, you know they were bullshitter from experience or from their results. You learn and adjust your trust levels towards that individual. 

Exactly the same process for AI. Results speak for themselves. Folks will learn how much trust should be shown when. 

And once you lose the trust, you get curious and dig in.

I am already seeing good juniors doing this. 

The others that use AI as a crutch and trust it 100%? Either they didn’t go through that learning yet, or they never will and they weren’t going to be good engineers anyways. Even for old school engineers the ones that show 100% trust to everything and don’t get curious to dig in was disastrous.
  - **Pale_Sun8898** (-1↑): Yeah we are horked in 10 years when all current seniors start retiring.  AI might be so good by then it won’t matter
    - **skkkrrrrrrrrrrrrrrrr** (6↑): Many seniors are in their 30s
- **Tree8282** (13↑): Im in tech sales and my clients are fintech execs. They hear the AI buzz and would literally ONLY buy the products if there’s some AI integration. After they use our products/solutions, the feedback is that they’re happy but they don’t touch the AI at all.

So it’s not your fault imo. You’re doing the best practices, but clients are often not technical, or has not touched code in a while, and genuinely believes the AI hype.

Our company’s strategy is now to sell our core products by selling AI but not actually expecting them to use it. I think it can translate to your case where you can just say you’re gonna use AI but actually do it yourself, which is a much better outcome than your vibe coding competitors
- **Perfect-Campaign9551** (11↑): They aren't wrong. The latest models like codex 5.3 and 5.4 kick ass. They are insanely accurate from my use so far even with bugs they spot things I didn't see. 


They don't actually hallucinated much these days


Hell yes I'm going to used codex to explain the code before I try reading it
