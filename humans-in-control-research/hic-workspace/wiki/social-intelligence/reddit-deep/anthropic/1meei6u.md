---
url: "https://www.reddit.com/r/Anthropic/comments/1meei6u/to_all_those_who_whine_complain_and_got_pissed_off/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "To all those who whine, complain, and got pissed off"
author: "astmatik"
date: "2025-07-31T21:46:17.000Z"
score: 914
upvote_ratio: 0.94
num_comments: 202
flair: ""
extracted_at: "2026-05-11T17:26:51.921Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# To all those who whine, complain, and got pissed off

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1meei6u/to_all_those_who_whine_complain_and_got_pissed_off/)
Posted by **astmatik** · **914↑** · **202 comments**

An engineer with 15+ years of experience here.
I write code every day, and make a comfortable living with it.
I use Claude code Sonnet 4 for absolutely every task I do these days. I find it very smart and reliable (around a solid middle level engineer on my scale). Whenever I have issues, I notice it's actually me who didn't give enough verbal context or specified the problem precisely.
I never hit any usage limit.

So, when I see people are using Opus, and saying it's getting stupid, degraded, expensive etc, I sincerely and genuinely don't understand what on earth you're talking about.

## Comments

- **StackOwOFlow** (116↑): 16+ YOE Principal Engineer here. I share your opinion. I can't speak as much for frontend work but Claude + Opus 4 has 10-20x'd my productivity on all matters backend related. And for hobby projects it has been a boon for setting up sleek-looking frontend/mobile apps that I never really had the time for before AI.
  - **nivix_zixer** (11↑): How does it 10x-20x your backend productivity? I simply don't trust it and find I have to review the code, which is much slower than just writing it myself. 13+ YOE engineer here. Would like to 10x my productivity to maybe work on side projects more.
    - **StackOwOFlow** (25↑): Refactoring legacy codebases, writing shims, writing unit tests, creating API stubs/documenting lengthy APIs, managing IAC (helm charts/terraform), and all the mind-numbing busywork that's needed but gets in the way of the core application logic.  
I don't give it free reign over anything, but reviewing the output that is 80% correct is faster than writing it from scratch in many instances, especially if you're stickler for TDD.

Edit: I also see a lot of people who've only used Sonnet 4 and never Opus 4 [jump to conclusions about code quality](https://www.reddit.com/r/agi/comments/1mcdkoh/comment/n5wd1i6/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button) only to [change their minds](https://www.reddit.com/r/agi/comments/1mcdkoh/comment/n62nsqe/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button) after trying Opus 4 (not implying it's the case for you, but if you haven't used Opus 4, I highly recommend trying it). Some people are reporting a drop in quality over the past week due to cost-cutting behind the scenes, though I haven't experienced it with my usage.
    - **sseses** (13↑): 20+ YOE. Feeling oldddd -- and your skepticism is 100% valid because you're asking the right question. Reviewing complex, unfamiliar code that you didn't write *is* often slower than writing it yourself. The 10x claim feels absurd if you think the goal is to have the AI write critical logic.

The productivity gain isn't from that. It's from a fundamental shift in your role from **writer** to **architect and delegator**.

The mental model that works is this: treat the AI like a hyper-fast, slightly naive junior engineer. You wouldn't trust a junior with core architecture, but you'd absolutely delegate well-defined, tedious tasks to them all day long. My workflow is:

1. **Isolate everything.** I use `git worktrees` so each AI session is a disposable branch that can be nuked without a second thought.
2. **Delegate the obvious, mundane boilerplate.** Don't use it for clever logic. For example, instead of manually typing out a 15-property interface from a requirements doc, I'll delegate:Please generate a typescript interface called EcommerceOrder; place it in src/ecommerce/types.d.ts -- please comment with specific detail from the production requirements i am about to paste: <product requirements>

It spits out 30 lines of commented code in 5 seconds. Is it perfect? Maybe not. But reviewing and fixing two lines is infinitely faster than typing 30 yourself.

The 10x-20x boost isn't from one big "wow" moment. It's the aggregated savings from dozens of these small delegations a day:

* Generating boilerplate interfaces/classes.
* Writing the first draft of unit tests for a simple, pure function.
* Scaffolding out a new file structure.
* Getting a "second opinion" by asking it to refactor an existing module with a new design principle.

Each one saves you 2-5 minutes of tedious typing, but more importantly, it preserves your cognitive energy for the architectural problems that actually require your years of experience. That's how you get time back for side projects.
    - **aquaja** (1↑): Codebase and language probably influences quality but I think the difference between those that have great results and those that don’t might be in the context engineering applied via spec breakdown into quality technical issue descriptions with clear expectations on acceptance criteria and any other design contraints. The more guard rails we build into the context the more an AI agent can produce expected results. I think of it like having a dev team but not documentation on tech stack and coding conventions, automated tests etc.
    - **kunfushion** (1↑): Use Claude code + cursor and validate every change as it happens. Rather than letting it run wild and review at the end, that way you can stop it from going down a bad path right from the start and don’t have to wait for it to get all its work done.

It seems like it’s slower than letting it auto change code, but doing this is a great compromise between speed and reliability. You can steer it every step of the way
  - **Perfect_Parsley_9919** (3↑): Same, it kinda sucks for frontend work for me but its pretty good at backend
    - **[deleted]** (1↑): The secret is to understand a bit frontend and you are good to go. Be precise as possible and give examples.
  - **halilk** (3↑): 15+ yoe distinguished engineer; I concur. For me the secret sauce is creating phased implementation plans and ask Claude Code to ask me clarifying questions before jumping into implementation, creating self sufficient loops to continuously test and improve and TDD. 
Self compacting when I am done with a chunk of work before I even hit the context limit warning works wonders. 
I recently added Atlassian mcp server so I can point it to jira tickets and confluence articles as well. I am able to ingest any prior artifact (diagrams, issue descriptions, conceptual documents) I can complete work in a day what could easily take 1-2 weeks.
It also never complains, I can make it work at the weekends too. 
I am addicted to this really.
    - **belheaven** (1↑): Not Alone, bro. Weekend user here now. Ex-CC addicted, just freed from the Matrix hahaha
  - **binaryl0ver** (2↑): may i ask you how you use it to boost your productivity? like what plan are using and are you only using the website or the claude code to run it in the terminal? i have no idea on how to maximize the use of AI for my daily day to day coding.
    - **StackOwOFlow** (2↑): IDE (in my case, IntelliJ or Cursor) + Claude Code plugin
  - **[deleted]** (1↑): You'll find the dumbest AI users on AI subs, that's why
  - **Arkanta** (1↑): This but I don't even use opus. It's insane the value I get out of the Pro plan with claude code

Sure I sometimes get limited, but I just use this time to review docs I was asked to, write specs, update the jira, etc
  - **r3eus** (1↑): Can I have your opinion, how does ChatGPT compare in regards to helping your work? Is Claude better? 

Currently trying to decide to switch or not but I really like ChatGPT's memory..
    - **StackOwOFlow** (1↑): Claude Code is just better for coding. There isn't a cost-effective way to use ChatGPT for this (if you use API credits you'll burn right through them). I just use my ChatGPT plus account to ask high level questions, get initial surveys/outlines, or vet research approaches if needed.
  - **Prize_Bar_5767** (1↑): As a Principal engineer do you still write code(at work)?
    - **StackOwOFlow** (1↑): Less and less so on any particular project. More to advance tooling that spans teams, improve best practices, and shepherd cats. Alignment takes up the most time. Thankfully living documentation is easier to produce than ever.
  - **thread_creeper_123** (1↑): What backends do you use? Laravel, nextjs, vanilla php?
    - **StackOwOFlow** (4↑): Spring Boot and Beego
- **960be6dde311** (56↑): This website encourages outrage mobs. That's probably why you don't understand them.
- **mrbubs3** (25↑): I feel that the posters who do this are going "write me a SaaS for lead funneling" and then get mad when Claude doesn't do a very specific thing it wants. I'm a senior level engineer that has used Claude and Gemini for numerous refactor jobs and the quality is astounding. It does 90% of what I need with a handful of prompts and handles context very well. The only real issue is it sometimes gets into an editing loop where it alternates between two approaches, but an additional prompt solves that.
  - **mat8675** (7↑): “It didn’t even integrate to my CRM”

“Did you ask it to?”

“Uh, no - what do you mean. AI is so dumb”

I think it’s hilarious that the people who scream about AI sucking are the same ones that will be the first to tell you it just parrots things back at you…🤔
    - **Somewhat_Ill_Advised** (5↑): So I’m decidedly NOT a software engineer but after one day where Claude wrote a gorgeous backend and then I spent 6 hours debugging the front end, I figured out the issue was ME. Specifications == instructions == prompts. The better your conceptual design, the better your experience.
    - **mrbubs3** (3↑): The void is looking back at them
  - **junkmailkeep** (3↑): You mean "make discord" isn't going to make discord. /s But really, I feel like 80% of the problems I've seen online are people just saying vague things like "fix it" instead of describing the problem. I treat it like a 5 year old that's really good at programming. I need to direct it and explain things, and then it works really well.
    - **ikeif** (3↑): I told it to make a Facebook killer, and it deleted my social media accounts. Dumb AI!

(Kidding)
    - **czmax** (1↑): I end up taking with it like a co-engineer. Explaining what I’ve changed on the backend and discussing the error or what was wrong and then discussing the fix — again all like it’s a person. I enjoy staying in the flow and taking out loud. As a result my thoughts are clearer and the model has my vision in its context. Meaning its next response is more like what I want. Win win.
    - **Illustrious_Bid_6570** (1↑): I treat it like a junior dev, I ask nicely, I even say thank you. My wife now thinks I'm mad 🤬
  - **[deleted]** (1↑): I feel that the more used people get with their LLMs, the more "human-like" it sounds and pretends to be, the more people treat them with intrinsic human-like capacities (understand intent, subtext, etc.). The directions get less specific, the prompting gets more vague, etc, because it's assumed, like a human, that LLMs would get the context. 

When it doesn't, user gets upsets and think the LLMs got worse.
  - **Arkanta** (1↑): This. I use gemini to help me plan out the work as it's great at exploring big codebases even over multiple repositories. I then edit the plan myself and give it to claude for implementation.
Wanna use something we use internally? I tell it to look at other repositories on my hard drive for how we do things. I have a CLAUDE.md for my work repositories telling it about common patterns and what I expect (like, run tests/code formatting before making a pr, etc). See claude often fall into the same trap? Just tell it in your CLAUDE.md!

Of course for some stuff I do it more simply with a bit of one shot prompting, but speccing works better just like in real life with junior devs.
And just like real life, well scoped tasks and small PRs get things done smoother than asking it to one shot 10 features.

You need to put some work in to get results, and I don't even think I'm going that overboard as I didn't get into custom agents (not a fan).
- **chidave60** (18↑): 40 years as dev/arch. Claude as a coding partner has completely reinvigorated my career. You get to a point where you’ve seen all the for loops and you hate the minutia. Claude lets you skip the minutia and actually direct and design.

No clue what people are complaining about.
  - **paranoid_panda_bored** (1↑): This!
- **Azaryen** (12↑): SAME !

I don't understand these posts. Just use the service and try to get as much as you can out of it, switch if you're not happy. Been using for a month now, $100 plan, only had 1 long service interrupted occurence and never noticed any big dropoff in quality (Golang, Python, Rust).

I'm beginning to think most people complaining about quality don't know how to supervise it / aren't actually working in IT / can't write clear technical specs or tests. If you provide CC a clear feedback loop - documentation, linter check, write tests, build, deploy, test the live code - and restrict the scope of your request to a single feature, it can figure out most of the thing itself.

While it can code, it can't read your mind or replace basic work methodology.
  - **ParkingAgent2769** (1↑): CC always goes off the rails for me no matter how specific I am. I’ve even tried running my queries though opus to then give to itself as a plan. Either I’m missing a trick here or people are exaggerating its capabilities
    - **fsharpman** (1↑): What exactly are you asking it to do?
- **Slow_Ad_2674** (4↑): Im pretty sure anthropic runs sonnet and opus heavily quantised when demand is high.

From a business point of view it makes sense, because it’s harder to prove than not having service at all.

It’s not a secret that they have resource limitations.
- **EXPATasap** (4↑): I still can’t believe anyone at all pays for the $200 a month lol, what am I missing here, seriously, lol I am beginning to think, although not sure how, but, I’m beginning to think I’m missing out here, missing something…, API make up the difference? (I do endorse the $20 + API Magicks of course!!) please lemme know… maybe? ☺️😊🙃
  - **Ok-Adhesiveness-4141** (0↑): I am paying 20 USD a month and am not happy.
  - **midnightsmoketrail** (0↑): Once I introduced sub-agents, custom commands, and hooks, I started hitting the limits of the $20 plan more frequently. Ultimately, I decided to upgrade which I find is totally worth it when you think about the value it provides.
- **cyberspace-jockey** (3↑): Around 14 years of experience here. I'm using the max plan. Totally agree with you on this.

And to add I use Elixir, which has far less training data which would typically mean that it should perform more poorly, yet for me Claude Code is indispensable.

The only times I'm seeing it fail is in similar situations that you mention; if I don't provide enough context and more importantly when I don't have a good design in mind.

To engineer is to "**design** and build".

You're rewarded for designing. Claude code WILL BUILD IT if the design is there. The more time you spend thinking through the problem, defining constraints and writing out edge cases, the more you'll be rewarded during Claude's build phase, it's that simple.

It will also make mistakes, just like any engineer will and with that you can't trust the output 100%. If you have a design and think from first principles, it's often much easier to spot those mistakes though.
- **Present_Hawk5463** (3↑): *This post was deleted for reasons the author chose not to disclose. [Redact](https://redact.dev/home) was used, possibly for privacy, opsec, or preventing automated scraping of the content.*

chubby sip ancient public full saw connect axiomatic quickest tub
  - **[deleted]** (1↑): Oh good, next I'm going to head over the Crayola sub and post about how upset I am that my crayons didn't make the Mona Lisa for me and my drawings look like shit. Seems reasonable based on my expectations of Crayola so I'm justified, right?
- **Hk0203** (3↑): It works great for me. Developer for 20+ years.
I wonder if the people spreading FUD are really just doing it to chase people away to leave more compute for us ;)
