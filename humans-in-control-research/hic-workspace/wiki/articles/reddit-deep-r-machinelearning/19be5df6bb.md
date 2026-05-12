---
url: "https://www.reddit.com/r/MachineLearning/comments/1rlnwsk/d_ama_secure_version_of_openclaw/"
url_hash: "19be5df6bb"
kind: "article"
source: "Reddit Deep: r/machinelearning"
title: "[D] AMA Secure version of OpenClaw"
author: ""
date: "2026-03-05T17:36:21.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:30:40.417581+00:00"
chars: 5089
---

# [D] AMA Secure version of OpenClaw

Source: [Reddit Deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1rlnwsk/d_ama_secure_version_of_openclaw/)

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

--- TOP COMMENTS ---
[32↑ rahulgoel1995] OpenClaw got exposed with 21,000+ public instances and malicious skills, how can we trust IronClaw won't suffer the same fate once it goes viral?
[26↑ ilblackdragon] There are a number of protections that we already have and implementing. 

Credentials are always encrypted and never touch LLM so skills won't be able to exfiltrate them. Skills are not able to run scripts on the main host - they can only run inside a container. 

We are planning to do red teaming and proper security review as well as we stabilize the core.
[92↑ highdimensionaldata] Damn, named author on Attention Is All You Need. That’s celebrity status round here.
[27↑ xantrel] Yeah, I was honestly reading fully expecting a vibe coded project from someone with no idea of how LLMs really work. That thought got shutdown as soon as I got to that line.
[3↑ AnosenSan] I mean, not to lower their credit, but the breakthrough is not as much on ML than security here. So their experience with LLMs is virtually irrelevant. Although I tend to be more trusting than a vibe coded project indeed.
[37↑ ilblackdragon] Great to be here!
[1↑ banatage] Big fan Illia! Glad that you’re here!
[3↑ sooham] Sorry but is this Polosukhins project?
