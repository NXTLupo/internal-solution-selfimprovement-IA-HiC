---
id: social-intelligence/reddit-deep/anthropic/1sqcfvp.md
url: "https://www.reddit.com/r/Anthropic/comments/1sqcfvp/100_usage_after_my_first_ever_prompt_pro/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "100% usage after my FIRST EVER PROMPT (pro subscription)"
author: "XeClutch"
date: "2026-04-20T02:22:54.000Z"
score: 1227
upvote_ratio: 0.94
num_comments: 273
flair: "Complaint:snoo_biblethump:"
extracted_at: "2026-05-11T17:26:51.911Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, saas, workforce]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c0"
    char_span: [0, 1799]
    sentence_count: 9
    key_terms: [prompt, breakpoint, component, data-binding, subscription, razor, base, page]
    token_count: 438
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c1"
    char_span: [1814, 2085]
    sentence_count: 3
    key_terms: [create, torwinmarkov, something, stoichk0v, develop, minutes, prompts, weekend]
    section: Comments
    token_count: 77
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c2"
    char_span: [2087, 3897]
    sentence_count: 11
    key_terms: [refund, month, "i'm", max, account, credit, dead0k87, cancel]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c3"
    char_span: [3671, 4811]
    sentence_count: 6
    key_terms: [imagine, without, claude, design, prompt, "can't", share, usage]
    section: Comments
    token_count: 331
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c4"
    char_span: [4813, 6872]
    sentence_count: 10
    key_terms: [claude, prompt, codex, using, problem, better, limit, specific]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c5"
    char_span: [6874, 8616]
    sentence_count: 4
    key_terms: [claude-prompting-best-practices, code, prompt-engineering, build-with-claude, claude, prompt, source, paper]
    section: Comments
    token_count: 404
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c6"
    char_span: [8618, 10695]
    sentence_count: 14
    key_terms: [claude, singularity42, build, "don't", good, stop, contractor, community]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c7"
    char_span: [10370, 11911]
    sentence_count: 10
    key_terms: ["shouldn't", sometimes, solution, another, because, githubs, perfect, "they're"]
    section: Comments
    token_count: 359
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c8"
    char_span: [11913, 13947]
    sentence_count: 14
    key_terms: [file, claude, prompt, truthputer, something, desktop, minutes, nothing]
    section: Comments
    token_count: 487
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c9"
    char_span: [13949, 15864]
    sentence_count: 18
    key_terms: [minutes, claude, best-practices, server, wanted, code, extremely, pitfalls]
    section: Comments
    token_count: 461
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c10"
    char_span: [15866, 17568]
    sentence_count: 12
    key_terms: [context, claude, plan, used, jcradio, amazon, blazor, prompt]
    section: Comments
    token_count: 463
  - id: "social-intelligence/reddit-deep/anthropic/1sqcfvp.md#c11"
    char_span: [17570, 19035]
    sentence_count: 11
    key_terms: [claude, settings, long, adaptive, friendly, thinking, prompt, trying]
    section: Comments
    token_count: 394
---
# 100% usage after my FIRST EVER PROMPT (pro subscription)

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1sqcfvp/100_usage_after_my_first_ever_prompt_pro/)
Posted by **XeClutch** · **1227↑** · **273 comments**

I am absolutely astounded.. Is this really to be expected? I literally JUST got a Pro subscription, and my very first prompt nuked my daily usage limit and apparently 13% of my total weekly limit?

Are my expectations just way too high? Has something gone horribly wrong? Is this a known issue?

Extra "context";

* I'm using Claude Code beta plugin in Jetbrains Rider IDE.
* Fairly small non-production codebase for a C# Blazor project.
* Prompt started at \~9pm EST
* Prompt consumed a bit under 1k tokens in total
* "Baked for 43m 38s"

**EDIT:** Here was my prompt:

*"i am having considerable issues trying to get two-way data-binding to work on my blazor app. i have created a component base in my UI lib which handles raising events, calling a state change when values have changed, etc. setting a breakpoint in the beginning of \`SetBoundValueAsync\` and the breakpoint is only ever hit on startup when the page is first being rendered. my home screen is currently serving as a test page and when using the \`EnumSelect\` and the \`Textbox\`, changing those values in the UI never triggers the aforementioned breakpoint and the "Value: " labels are never updated"*

Fwiw, the codebase consists of a <50 line homepage in Razor which is effectively a test page. My UI library contains 4 WIP controls (each with small \`.razor\` and \`.razor.cs\` files) and a component base (just a C# class). The component base is the biggest part of the app and it's still under 200 lines and is all boiler plate prop decls and some WIP two-way data-binding code.

## Comments

- **torwinMarkov** (111↑): This weekend I used Claude to help me develop and create a slide deck. I hit my daily usage limit in 4 prompts. Took me about 5 minutes.
  - **Stoichk0v** (21↑): Same thing last time, I asked it to create something from a file, all tokens gone.

 I'm really unhappy I paid the yearly subscription.
    - **Significant-Run-4764** (8↑): I think you can ask for a refund, not sure though ..
    - **Ok_Bar_7253** (5↑): You better cancel that sooner unless they fix their stuff. Everyone is recommending Codex lately
    - **Dead0k87** (1↑): Cancel and request refund
    - **fiorm** (1↑): Same here. Can you really get a refund?
    - **Final-Frosting7742** (1↑): Adaptive thinking is killing your Claude. Try [these settings](https://www.reddit.com/r/Anthropic/comments/1sqcfvp/comment/ohir4gt/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button).
    - **Pe4rs** (1↑): I accidentally found a hack for this. If you paid the 200 for the year of pro, you can upgrade to Max 5x monthly for 100/month which actually gives you a refund as account credit and switches you to Max for the month. I got 70ish in account credit and then you can just not renew or get Max again the second month using the account credit.l so it will only cost me 30 next month.
    - **jpcirig** (1↑): I'm in the same boat.  That's why I'm here today - to see if I'm doing something wrong.  But - I see others are facing the same issue
  - **ResearchFrequent2539** (6↑): Try downgrading to 2.1.71. It helped me
  - **Dead0k87** (3↑): seems like these agents are not ready for average consumers as a product. Proper experience opens on Max accounts :(
    - **FilthyCasual2k17** (5↑): This is unforuntatelly really true, I just went from 20$ to 100$ and the difference is night and day. It's way more than 5x more work done, and I can only imagine 200$ is even crazier since it's 20x usage, but ffs you can't expect people to pay this kind of money for such a tool...
  - **AffectionateAd3271** (8↑): Was it in design cause I spent that shit in three prompts lmao
    - **Icy_Slice** (1↑): Give Impeccable a try, it has helped me so much.
  - **vitorroman** (1↑): I'm new to this and also like to use it to design and create slide decks. I've been trying but after one month I'm still leaning. I can't imagine a prompt that would do this. Can you share it with me, without the specifics about your company? I think I'd learn a lot on how to structure it
  - **webdevverman** (1↑): Next time you get the chance, prompt Claude and then afterwards I noticed my usage just kept going up without any further interaction
  - **Final-Frosting7742** (1↑): Adaptive thinking is killing your Claude. Try [these settings](https://www.reddit.com/r/Anthropic/comments/1sqcfvp/comment/ohir4gt/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button).
  - **drakness110** (1↑): The 4 pump chump
- **Normal_Capital_234** (125↑): >Baked for 43m 38s

There is your problem. What was your prompt?
  - **JohnMateersThumb** (127↑): "Create Claude. Make no mistakes."
  - **ShelZuuz** (42↑): "Download Chromium and rewrite it in assembler for every platform released since 1970".
    - **Space646** (2↑): Oh and add comments on every single line!
  - **thegentlecat** (17↑): I can let Codex run for that long five times over and still not hit the 5h limit though
    - **Own-Airline-9387** (8↑): This. I know the prompt can always be better, but it doesn't change the fact that using Codex feels almost impossible to hit the limit.
    - **vintage_culture** (2↑): They have to do this, otherwise people won’t switch from Claude to Codex
    - **RogueTampon** (1↑): If you can do that with Codex and create something equally as good as Claude, then you probably didn’t need to be using Claude in the first place.
    - **Curly_Toes** (1↑): Is this limit for plus or pro subscribers?
  - **XeClutch** (13↑): Updated the OP to include the original prompt and some more context for my project.
    - **ZucchiniSky** (16↑): The biggest thing I would have changed about your prompt would have been to give it an explicit task, like "figure out why the 2-way binding isn't working". That makes it a lot clearer to the LLM what it needs to do. But it likely knew what you wanted it to do anyway.

I'm suspecting what happened was that the LLM didn't know what the issue was immediately, and then spent the whole 40 minutes overthinking the problem instead of using a debugger to understand the problem better. I've found that Claude has a tendency to think through code issues instead of using tools to gather more information, which is just not a viable strategy for certain types of bugs. I have found that I often have to instruct Claude to use specific tools or techniques to debug issues to get better results. E.g. write this specific test or suite of tests and use them to verify your changes.
    - **Adept-Priority3051** (19↑): You used no formalized and established structure, provided no examples, no XML tags. 

You simply provided a vague prompt. 

This is exactly the type of prompt everyone is roasting you about with their ridiculous examples.
    - **Normal_Capital_234** (5↑): I recommend reading this. [https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
    - **notyourancilla** (1↑): Didn’t tell it to make no mistakes, rookie error
    - **Nimweegs** (1↑): The easiest way to improve prompts is just asking Claude to make a prompt, genuinely.
  - **styczynski_meow** (1↑): This is really absurd time. For comparison I can tell you what you can do in 43 mins on max effort (this is real example I did few days ago as part of exploratory prototyping for some SoA numeric algorithms):
- Look at this source of paper fetched from arxiv and rewrite this SIMD code into HWY scalable vectors by looking up intrinsics for one choose arch 
- Benchmark the execution and optimise allocations (gave it a long list of what I expect to benefit performance but left it as open question)
- Here’s the second paper that has code written in Rust along with source code - compare approaches and try to implement optimisations from that paper
- Write me a long very verbose report of what you did along with code samples, pseudocode, diagrams and reference to both papers and their source code
- Iterate in a loop spawning subagent for review (here’s long list of guidelines what I expect)

I’m familiar with both papers but doing everything by hand would take me good week of work. Now I can benchmark this myself, choose right solution and stick with it later (saves a ton of time on exploratory work)

And this was done in about 45mins of max effort (including review loop with subagents - and they gave some good non-trivial ideas about optimising access to matrices)
- **whaleordolphin** (86↑): This community is surreal. No matter what you post or how much detail you share, people still reduce it to “skill issue.” Claude Code spending 43 minutes on a tiny codebase is not user error. It is supposed to be smart enough to know when to stop. Bloody hell. Stop defending a dumbass model.
  - **siloldn** (17↑): We're so close to "git gud" responses from the community
    - **SBAWTA** (5↑): Learn to roll and parry
    - **Cautious-Bug9388** (1↑): Git pull gud
  - **This_Organization382** (12↑): 43 "unknown" minutes of runtime clearly passes _some_ of the blame to OP
    - **Singularity42** (0↑): Why? I don't see why Claude shouldn't stop after a bit and ask if you want to continue. I have seen other agents do that.
  - **betty_white_bread** (5↑): If the issue is the user's skill at using the tool, such reduction is perfectly valid and warranted. If I hired a contractor and said "Build my a deck for my backyard" and gave no specifics, I don't get to complain when they build something elaborate and expensive, rightly sticking me with the bill.
    - **Singularity42** (4↑): That's a weird analogy. A good contractor wouldn't just go and build something crazy without giving a quote or asking the client any questions first.
    - **NewShadowR** (2↑): No. Common sense and reason is a thing. You don't go building the deck for an average person with gold and diamond and "rightly stick" anyone with the bill lol. That would never pass in a court of law.
  - **SaintMartini** (1↑): Sad part is that nothing is ever good enough for them. People can have extensive githubs and be coding their entire lived and they'll still insult them calling them names or a bot, when they themselves have posts where they're making programs that are a few files or less and often copying from githubs that Claude found. Stuff like this shouldn't be happening with Opus, simply because it never used to happen. Models shouldn't be getting worse. People just feel they're better because of the slow burn decline inbetween releases.
  - **Boofschneef** (1↑): Lol brother if you look at the prompt, it makes perfect sense why this happened
  - **Bodo_TheHater** (1↑): I was going to say it’s surreal how stupid this flex is in general, but you went another way…
  - **MartinMystikJonas** (0↑): AI main strength IMHO is exactly that it can tirelessly iterate until it find solution. It is perfect for debugging weird bugs but sometimes it can just consume your quota when it tries to find a solution. But it requires giving it exact requirements and good feedback loop - otherwise it burns throught your quita without any results. It is pointless to complain that AI does not work as you wish it should. It can be very effective tool but sometimes it can do dumb things. It is limittaion of current technology and complaining cannot change that. You need to learn work with it as it is.
    - **Salty-Bid1597** (2↑): How are you meant to learn if you only get one prompt then have to wait 5 hours for another one?
  - **alOOshXL** (-5↑): People like to suck ass 
What you expect 2 prompts with you 20$????

Be thankful you can login to your account in pro plan

Or buy 274 max accounts you broke nibba
    - **AreWeNotDoinPhrasing** (2↑): I think people might have missed the sarcasm
  - **SirWobblyOfSausage** (0↑): Last week they said they had a bug that caused a lot of issues, two days before most of the shills were "show us your prompt". "Impossible I've been working 5 days straight". 

Nothing worse than corporate brown-nosers.
- **truthputer** (61↑): Idk why you let it go for 40 minutes without stopping it, it should have been extremely obvious something had gone wrong after it doing nothing for five minutes.

Ok, here’s what you need to do:

Install the desktop Claude client. Ignore the IDE plugin for now, that may have bugs.

Fire up the desktop client and toggle to Code mode, point it at your project directory. The very first thing you should do is ask it to make a CLAUDE.md file that maps your project. After it has done that, then you should be ready to work.

In your prompt you should give a brief background of what you’re trying to do, state the problem - then (important) tell it what you want it to do.

In your prompt above it wasn’t clear to me what you were doing and you never even asked it a question. You need to find your voice, make it something like this:

“I’m working on an app that does X, using Blazor. There’s a component base in file <insert file path> that handles events and I’m trying to bind the Textbox <name> in <insert file path>, but events don’t seem to be firing when the text box is changed. Can you please help diagnose?”

I did a complete refactor of a 3D game engine using Claude Code Pro, so it really is usable if you take care and understand what you’re asking it to do.
  - **GuideZ** (4↑): Got any good sources for how to structure/write  the CLAUDE.md file? I'm also in game development, so highly interested in your approach/setup
    - **truthputer** (4↑): They have an entire documentation section of their website about how to use this stuff that is worth looking through:

[https://code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices)

But basically you just ask Claude to generate a CLAUDE.md file and it figures out a first version. You can then go in and edit it to tweak it's behavior to your preferences.

You can also have a nested structure, with a minimal one at the root of your project, then one inside each top-level folder within your project. So if you have a client and server, and you're only working on the server side it only needs to read up about the server. However you want.
  - **MarkMatson6** (18↑): Extremely obvious *the very first time*??  Dude, odds of knowing *how* to stop it at that point should be unexpected.
    - **nnomadic** (5↑): There should be better UI for walking people through this stuff.
    - **betty_white_bread** (0↑): So, documentation doesn't exist?
  - **Singularity42** (2↑): I think you are confusing "this is how it works" with "this is how it should work". 


Sure. If you know what you are doing you can avoid the pitfalls. But a good tool wouldn't have the pitfalls in the first place.

They could design it to not sit spinning for 40 minutes in the first place with no messages. There is no reason for that. At a minimum they could make it stop after X minutes and ask if you want it to continue.

Just because that's the way it is. Doesn't mean it should be.
  - **SCWeak** (1↑): > Idk why you let it go for 40 minutes without stopping it, it should have been extremely obvious something had gone wrong after it doing nothing for five minutes.

I dunno, I used Claude Code for the first time 2 days ago. Gave it my prompt for what I wanted, it worked through everything and spat out a program that did almost exactly what I wanted. I left it alone for around 40 minutes while it did its thing, other than accepting or denying certain permissions. Another prompt and it got exactly what I wanted. 

The second prompt pushed me over my limit, but I had £15 free credit too, so it used £6 of that.
- **Scriptease84** (6↑): I remember when I used Claude the first time to make a plan and read some screenshots and when I was done with the planning to do the actual work, it was 80%
- **MartinMystikJonas** (7↑): My guess: It was not able to replicate described problem from vague prompt you gave it so it repeatedly tried many approches until your quota was gone. This can happen when you gave it too vague or mutually exclusive requirements.
- **jcradio** (10↑): Damn. Are you trying to build an Amazon clone?
  - **CacheConqueror** (3↑): An Amazon clone is a waste of tokens, unless you change the UI and fix the search function
  - **XeClutch** (3↑): Not even close lmao. The very beginnings of a Blazor UI library. I updated the OP with more detail
    - **Aakburns** (2↑): Blazor aye? Used it for years. Never will again.
    - **jcradio** (1↑): That's crazy. I use it daily, for hours, and haven't got any limits yet.
- **liskov-substitution** (3↑): Do spend some time on setting up your env ( Claude can do that for you ) if you don’t have the max plan the best way already is to delegate bulk actions to ‘lesser’ agents and models.

There is a talk from on of the higher ups at Claude that goes about these things.

The gist of it spend 20-30m talking creating context digesting the context. Then go into plan mode ( clears your context again ) and laser focus completes your job.

And just repeat that proces.

https://preview.redd.it/des1bd0gyawg1.jpeg?width=3394&format=pjpg&auto=webp&s=4872c8cae228b2a76a8418de9d8629490e6ecf45

It can go for very long but you have the manage token usage etc.

I wouldn’t say skill issue but do spend some time before you start diving in and expecting magic fixes. It does work like that to some extent but you are the pilot 🧑‍✈️. Pilots manage the plane, the fuel, the safety of passengers.
- **Final-Frosting7742** (3↑): Try these settings in ./.claude/settings.json : 

    {
      "effortLevel": "medium",
      "env": {
        "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING": "1",
        "CLAUDE_CODE_DISABLE_1M_CONTEXT": "1"
      }
    }

Adaptive thinking is what's sabotaging your Claude. A few days ago my Claude started overthinking endlessly and burning all its tokens while accomplishing nothing. Never happened before. I found the solution: just disable adaptive thinking that became enforced for no reason. After i modified settings.json, everything went back to normal. Try it.
- **stiky21** (27↑): Congrats on a 40min prompt session

Are you daft?
  - **Veritas_McGroot** (26↑): >> First ever prompt

>> Are you daft?

And 2nd most liked comment lol... what a great community, very begginer friendly
    - **DrSlaggathor** (1↑): Well, you’re on Reddit. 

Maybe I’m over-generalizing but friendly people who aren’t trying to one-up each other are rare, let alone the communities
  - **awolbull** (0↑): I'm having claude help me create a mmo game and I have to rip it hard to use my 5 hour limit, and even that only happens if I'm long, long, long into context trying to get through an issue.  This shit fud is crazy.
