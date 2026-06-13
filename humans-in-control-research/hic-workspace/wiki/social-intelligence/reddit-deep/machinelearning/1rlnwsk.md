---
id: social-intelligence/reddit-deep/machinelearning/1rlnwsk.md
url: "https://www.reddit.com/r/MachineLearning/comments/1rlnwsk/d_ama_secure_version_of_openclaw/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] AMA Secure version of OpenClaw"
author: "ilblackdragon"
date: "2026-03-05T17:36:21.000Z"
score: 180
upvote_ratio: 0.92
num_comments: 114
flair: "Discussion"
extracted_at: "2026-05-31T23:36:38.259Z"
extraction_method: "praw-deep"
research_goal: "Map emerging AI design trends, essential skills, practical tools, platforms, and technical implementations that enable a company's creative team to integrate AI beyond concepting. Focus on applications supporting design production, system testing, asset generation, governance, and stakeholder confidence."
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1rlnwsk.md#c0"
    char_span: [0, 1667]
    sentence_count: 18
    key_terms: [openclaw, machinelearning, incredibly, comments, ironclaw, security, machine, version]
    token_count: 392
  - id: "social-intelligence/reddit-deep/machinelearning/1rlnwsk.md#c1"
    char_span: [1669, 3753]
    sentence_count: 13
    key_terms: [policy, access, information, credential, prevention, database, actions, ensure]
    token_count: 440
  - id: "social-intelligence/reddit-deep/machinelearning/1rlnwsk.md#c2"
    char_span: [3755, 4074]
    sentence_count: 3
    key_terms: [ironclaw, com, github, agent, http, nearai, near, confidential]
    token_count: 87
  - id: "social-intelligence/reddit-deep/machinelearning/1rlnwsk.md#c3"
    char_span: [4088, 4554]
    sentence_count: 3
    key_terms: [skills, "won't", able, run, ilblackdragon, rahulgoel1995, implementing, credentials]
    section: Comments
    token_count: 115
  - id: "social-intelligence/reddit-deep/machinelearning/1rlnwsk.md#c4"
    char_span: [4556, 6410]
    sentence_count: 12
    key_terms: [ilblackdragon, llms, github, here, ironclaw, project, contributors, https]
    section: Comments
    token_count: 479
  - id: "social-intelligence/reddit-deep/machinelearning/1rlnwsk.md#c5"
    char_span: [6412, 8232]
    sentence_count: 9
    key_terms: [ironclaw, ilblackdragon, confidential, lookatmywormhole, people, everyone, identity, releases]
    section: Comments
    token_count: 428
  - id: "social-intelligence/reddit-deep/machinelearning/1rlnwsk.md#c6"
    char_span: [8234, 10550]
    sentence_count: 8
    key_terms: [security, confidential, data, run, prevent, access, ilblackdragon, architecture]
    section: Comments
    token_count: 493
  - id: "social-intelligence/reddit-deep/machinelearning/1rlnwsk.md#c7"
    char_span: [10552, 12745]
    sentence_count: 24
    key_terms: [near, something, ironclaw, action, confidential, ecosystem, priority, excited]
    section: Comments
    token_count: 501
---
# [D] AMA Secure version of OpenClaw

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1rlnwsk/d_ama_secure_version_of_openclaw/)
Posted by **ilblackdragon** · **180↑** · **114 comments**

There’s a major risk that OpenClaw will exploit your data and funds. So I built a security focused version in Rust. AMA.

I was incredibly excited when OpenClaw came out. It feels like the tech I’ve wanted to exist for 20 years. When I was 14 and training for programming competitions, I first had the question: why can’t a computer write this code? I went on to university to study ML, worked on natural language research at Google, co-wrote “Attention Is All You Need,” and founded NEAR, always thinking about and building towards this idea. Now it’s here, and it’s amazing. It already changed how I interact with computing. 

Having a personal AI agent that acts on your behalf is great. What is not great is that it’s incredibly insecure – you’re giving total access to your entire machine. (Or setting up a whole new machine, which costs time and money.) There is a major risk of your Claw leaking your credentials, data, getting prompt-injected, or compromising your funds to a third party. 

I don’t want this to happen to me. I may be more privacy-conscious than most, but no amount of convenience is worth risking my (or my family’s) safety and privacy. So I decided to build IronClaw.

What makes IronClaw different?

It’s an open source runtime for AI agents that is built for security, written in Rust. Clear, auditable, safe for corporate usage. Like OpenClaw, it can learn over time and expand on what you can do with it. 

There are important differences to ensure security:  
–Moving from filesystem into using database with clear policy control on how it’s used   
–Dynamic tool loading via WASM & tool building/custom execution on demand done inside sandboxes. This ensures that third-party code or AI generated code always runs in an isolated way.  
–Prevention of credential leaks and memory exfiltration – credentials are stored fully encrypted and never touch the LLM or the logs. There’s a policy attached to every credential to check that they are used with correct targets..  
–Prompt injection prevention - starting with simpler heuristics but targeting to have a SLM that can be updated over time  
–In-database memory with hybrid search: BM25, vector search – to avoid damage to whole file system, access is virtualized and abstracted out of your OS   
–Heartbeats & Routines – can share daily wrap-ups or updates, designed for consumer usage not “cron wranglers”  
–Supports Web, CLI, Telegram, Slack, WhatsApp, Discord channels, and more coming  
Future capabilities:  
–Policy verification – you should be able to include a policy for how the agent should behave to ensure communications and actions are happening the way you want. Avoid the unexpected actions.  
–Audit log – if something goes wrong, why did that happen? Working on enhancing this beyond logs to a tamper proof system.

Why did I do this? 

If you give your Claw access to your email, for example, your Bearer token is fed into your LLM provider. It sits in their database. That means \*all\* of your information, even data for which you didn’t explicitly grant access, is potentially accessible to anyone who works there. This also applies to your employers’ data. It’s not that the companies are actively malicious, but it’s just a reality that there is no real privacy for users and it’s not very difficult to get to that very sensitive user information if they want to.

The Claw framework is a game-changer and I truly believe AI agents are the final interface for everything we do online. But let’s make them secure. 

The GitHub is here: [github.com/nearai/ironclaw](http://github.com/nearai/ironclaw) and the frontend is [ironclaw.com](http://ironclaw.com). Confidential hosting for any agent is also available at [agent.near.ai](http://agent.near.ai). I’m happy to answer questions about how it works or why I think it’s a better claw!

## Comments

- **rahulgoel1995** (30↑): OpenClaw got exposed with 21,000+ public instances and malicious skills, how can we trust IronClaw won't suffer the same fate once it goes viral?
  - **ilblackdragon** (26↑): There are a number of protections that we already have and implementing. 

Credentials are always encrypted and never touch LLM so skills won't be able to exfiltrate them. Skills are not able to run scripts on the main host - they can only run inside a container. 

We are planning to do red teaming and proper security review as well as we stabilize the core.
- **highdimensionaldata** (91↑): Damn, named author on Attention Is All You Need. That’s celebrity status round here.
  - **xantrel** (28↑): Yeah, I was honestly reading fully expecting a vibe coded project from someone with no idea of how LLMs really work. That thought got shutdown as soon as I got to that line.
    - **AnosenSan** (3↑): I mean, not to lower their credit, but the breakthrough is not as much on ML than security here. So their experience with LLMs is virtually irrelevant. Although I tend to be more trusting than a vibe coded project indeed.
  - **ilblackdragon** (38↑): Great to be here!
    - **banatage** (1↑): Big fan Illia! Glad that you’re here!
  - **sooham** (3↑): Sorry but is this Polosukhins project?
    - **ashwin_wang** (1↑): YES，you can see [ilblackdragon](https://github.com/ilblackdragon) in [https://github.com/nearai/ironclaw/graphs/contributors](https://github.com/nearai/ironclaw/graphs/contributors)
- **copajack** (22↑): As a pioneer in Transformers, what's your take on the  LLMs vs World Models debate aka are LLMs enough to get us to AGI? In other words: Is attention really all you need?
  - **ilblackdragon** (16↑): Haha, I do think LLMs construct their own version of world model. There is def more work needed on how to make this effective. I think there is still research needed to better adapt to new data, long term context and more things. Likely will be combination of techniques.
- **certain_entropy** (16↑): Does IronClaw require being used in conjunction with Near and as consequence require a paid plan? The website makes it seem as if there's no free local install setup though the github is more ambiguous.
  - **ilblackdragon** (18↑): There is local install indeed. We need to update the website.

Binaries are here: [https://github.com/nearai/ironclaw/releases/tag/v0.15.0](https://github.com/nearai/ironclaw/releases/tag/v0.15.0)
- **ilblackdragon** (11↑): Thanks everyone for your questions! Going to wrap up for now.  
  
Looking forward to doing this again in the future.
- **lookatmywormhole** (18↑): When you originally were a part of "Attention is All you Need", did you envision the autonomous agents to materialize just as OpenClaw (and now IronClaw) did? What's your biggest "I told you so", and what's your biggest "never expected that!"
  - **ilblackdragon** (27↑): I don't think I envisioned in exactly this format, but we def were discussing having an AI that is able to take actions, that can see what you see and act on your behalf.

Def big part for me was coding ability - we started NEAR AI effectively to build that in 2017. So I was telling everyone that you will just talk to computer and won't need to write code anymore, and people were thinking we are delusional :) Now it's pretty clear we are there.

Unexpected - I think I'm always surprised how reckless people are :) feeding all of their identity and credentials to 3rd parties who even allowed to use their data for training, review it and etc. Especially I saw someone offering a smart routing service by a random startup and people just switch to use it without realizing that startup has access to all of their data and identity now. Hopefully we can fix this in a principal way.
- **lookatmywormhole** (7↑): Would it be safe to run IronClaw on my current device or should it still live in confidential hosting or VPS?
  - **ilblackdragon** (5↑): Confidential hosting gives you:

 \- always on

 \- confidential inference

 \- we are adding various additional services that are going to be bundled into subscription like Brave Search

If you are a developer - you can run one locally too, but it def require a bit more setup and maintenance from you.
- **Ancient-Carpet309** (6↑): With your experience co-creating the Transformer architecture and founding NEAR, what’s your endgame for agent privacy? Will we eventually run these agents entirely on local devices to completely rule out cloud data leaks, or is confidential hosting like agent.near.ai the permanent sweet spot?
  - **ilblackdragon** (9↑): Local devices have a large set of limitations - it's only on when you are on it, if it's mobile - the energy consumption is prohibitive, it's really hard to run complex research/long running tasks. 

I am obviously biased, but I do think confidential cloud is the right middle ground - it gives close to local device guarantees while solving for "always on" and energy problems. 

You can also have more sophisticated data retention / access control policy. For really privacy conscious you can setup an agent that auto deletes data or requires 2FA to access some information in confidential cloud based on some events. E.g. while you are traveling across borders it adds extra shields, to prevent unauthorized access.
- **atomatoma** (6↑): first, i totally appreciate the security focused architecture, but presumably, the human (or worse, the non-expert human guided by an LLM) could always blow security holes leaking credentials or PIP.  how would you address concerns that people might say they are using iron claw (so your data is safe), but then do so in a way that still violates a security policy?    
  
i guess i'm asking for something akin to the type of safety analysis that was done on software back in the day when some software systems needed to be certified, which took ages.  so, what tools do we have to help in that regard, to make sure that security is being enforced, to the point where the system will prevent misguided configuration.
  - **ilblackdragon** (7↑): There are few answers here:

 \- We are trying to max out defense in depth, to protect the user even from themself. Credentials are binded on the core level to specific domains, so you can't really send your google account oauth to non google domain, for example. So even if user approved to run malicious script it should prevent from credential exfiltration. 

 \- Data and action policy is something we are designing - including previewing potential outcome of a given action. Letting a separate LLM call interpret an action before taking it. There are some trade offs in convenience and speed with this that are trying to find a sweet spot.

 \- Red teaming and various analysis is def something we are targeting as we stabilize the versoin.
- **Turbulent-Sky5396** (4↑): Big fan of your work and NEAR -- some questions:

1. Will it be possible to programatically spin up IronClaw clusters for users downstream if I want to offer agents in my product? some sort of API?

2. For NEAR, is there plans of opening up confidential shard via API? both transactions and signing? If so, any dates here would be awesome!

3. What is the most important priority short-term? NEAR seems to have some magical technology, but not too much of an ecosystem to showcase it -- is the gap developer/apps or something else?

4. Do you think NEARs privacy features will face regulatory scrutiny, either for the chain itself or apps?

5.  What are you most excited for this year? Can be either professional/personal!
  - **ilblackdragon** (4↑): 1. Yes, we are planning to add this soon as there is a lot of demand.

2. Yes, the main challenge is that all viewing APIs didn't have a signature so there is no way to scope the operations for viewing. Need to update eveything for that. Also on a smart contract side it's even more complex - as there is new meta data needed that provides what information at what scope should be available. So a lot of work to wire everything in.

3. The priority is going to market across consumer and B2B directions. For Intents ecosystem is Ledger, Trust, SwapKit, LiFi, Infinex, and 30+ chains. Expanding to more partners, chains and assets. For AI - bringing IronClaw hosting and confidential inference to businesses to really use them. For [near.com](http://near.com) \- it's more real users transacting in privacy.

4. We have really focused on creating a pragmatic confidentiality that deters crime. There are a number of AML methods we are leveraging.

5. I'm really excited for my IronClaw to become my 10x leverage on running NEAR :)
