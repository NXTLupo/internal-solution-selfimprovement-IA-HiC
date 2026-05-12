---
url: "https://www.reddit.com/r/artificial/comments/1recjbv/i_built_a_fully_playable_fps_using_only_prompts/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "I Built a Fully Playable FPS Using Only Prompts (No Manual Code)"
author: "Futuristocrat"
date: "2026-02-25T12:59:32.000Z"
score: 68
upvote_ratio: 0.64
num_comments: 101
flair: "Project"
extracted_at: "2026-05-11T17:27:04.778Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# I Built a Fully Playable FPS Using Only Prompts (No Manual Code)

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1recjbv/i_built_a_fully_playable_fps_using_only_prompts/)
Posted by **Futuristocrat** · **68↑** · **101 comments**

Hello!

I want to share an experiment I’ve been running.

Over the past few weeks, I’ve been developing a desktop HTML first-person shooter called Zombie Slayer. The core constraint of the project is this: every line of code was generated through prompts. I never manually edited the source.

For context: I have never built a 3D game before, and I’ve never programmed in HTML. I also have nearly zero coding experience. This project has been less about traditional development and more about testing the boundary conditions of prompt-driven creation.

The game was built in Antigravity using Gemini 3 Pro, with Three.js handling real-time 3D rendering. All geometry is procedurally generated at runtime. Sound effects are synthesized dynamically, and the music was also generated with AI (Suno). The entire playable build is under 900KB in file size and is an easily shareable HTML file.

From a systems perspective:

\- HTML desktop game (<1MB total footprint)

Procedural geometry generated at runtime

Real-time sound generation

\- 10 escalating stages with objectives + economy layer (coin-based Black Market)

\- Enemy scaling model (each kill increases enemy population and variety)

\- Weapon and physics modifiers (jetpack thrust, anti-gravity cannon, nuke projectile, etc.)

\- Dynamic environmental interactions (flood events, teleport well, destructible elements)

To my knowledge, this may be the first playable first-person shooter built entirely through prompting (at least at this level of complexity and intentional design). If I’m wrong, I’d genuinely love to see comparable examples.

The goal is to continue expanding the game exclusively through prompts and release it for free.

I’d appreciate any technical feedback, skepticism, or discussion. I’m treating this as an open experiment in what “AI-native” game development might look like.

## Comments

- **PotentiallyAPickle** (89↑): "Programmed in HTML" breaks my brain. This world is fucked for real.
  - **jferments** (58↑): This is how you know it was actually vibe coded lol
  - **myUninhibitedSelf** (29↑): HTML is not a programming language, it is a markup language. I would imagine the majority of the coding is in JavaScript.
    - **Futuristocrat** (8↑): I think you’re correct. This is all still very new to me and I called it html programming since the end result is an html file. It primarily uses three.js as the rendering engine.
  - **Ambitious-Charge-432** (3↑): Sadly people said that before LLM came to be :(
  - **Lorebreaker_ofArarat** (1↑): For real though, how do you advise kids about coding nowadays? I'm not a computer science person and I get middle schoolers who are interested in coding and I truly don't know what the right answer is now.
    - **myUninhibitedSelf** (2↑): Ask them about what type of project would interest them, and work towards that. Search engines are your friend. The internet was built by and for computer programmers to search for and share programming knowledge.
- **arealpartyboy** (25↑): that's awsome. now do gta 6
- **xlnc2608** (13↑): Impressive for someone with zero experience
  - **Futuristocrat** (10↑): Thank you. I always wanted to make a game, just never had the time to learn. Unreal Engine has been installed but unopened on my computer for years. Using prompts and natural language is a game changer for me.
- **EchoStarz1** (19↑): That’s pretty wild. This is probably one of the best ones I’ve seen. I’m surprised it handled a FPS decently
  - **daemon-electricity** (4↑): I'm assuming Three.JS was used. It's surprisingly pretty capable. It also has decent shader support.
  - **Futuristocrat** (7↑): Thank you! Saying it took a ton of prompting to get to this level would be an understatement.
- **floopm** (4↑): could you share what was the running cost for prompt engineering so far? looks pretty good
  - **Futuristocrat** (7↑): I used Gemini Ultra for this, which cost me about $650 over three months (with a discount for the first month). That being said though, I have a primary purpose for Ultra that is not gaming or code creation (I use it professionally for video creation). Which means I would have bought it regardless.
    - **floopm** (1↑): Thanks appreciated
- **theagentledger** (4↑): the interesting technical challenge here isn't the individual features, it's keeping coherent state across a whole system as it grows. enemy scaling that talks to the economy layer, physics that interacts with environment events -- that kind of cross-system coupling is where prompt-driven dev usually falls apart. curious how you handled context limits as the codebase grew past a certain size, or did Antigravity manage the chunking for you?
  - **ikeif** (1↑): This is my concern - I'm not a game developer, so I can't adequately discuss it, but I know code.

And OP is listing off "I'm using X, Y, Z" but then in the comments they don't know what it's doing or how it works, saying it's "written in HTML."

Without looking at the code, maybe it really is using the libraries it claims, maybe it's doing the wrong thing with the wrong libraries that leaves it as a memory leak, or a gaping security flaw - which can't be guessed without having access to the code itself.
    - **theagentledger** (1↑): fair skepticism, but the 'written in HTML' thing is honestly just how people describe single-file browser games. three.js + cannon-es compile down to one HTML bundle that looks like a monolith. the code quality concern is real though - at 21k lines with no dev reviewing it, you're flying blind on architectural debt. for a personal/demo project that's fine. i wouldn't ship it.
  - **Futuristocrat** (1↑): Antigravity managed it all for me. The game is currently 21,000 lines of code. I believe I am near the halfway point of the input token limit and haven’t run into any issues yet. I am hoping that by the time this game gets near the token limit, the next version of Gemini will have been released with a higher limit.
    - **theagentledger** (1↑): good to know on the chunking. 21k lines is a legit milestone. the token limit ceiling is real but yeah context windows keep growing - might just be a race you can win by continuing. be curious if the cross-system coupling stays clean as it scales or if you start hitting subtle state drift between subsystems
- **thetreecycle** (11↑): That’s actually pretty impressive
  - **Futuristocrat** (3↑): Thank you!
- **LordAmras** (3↑): Can you ask Gemini to share a link to it ?
- **relightit** (3↑): i feel i should try this but not knowing coding i think i would be in for a bad time, especially if i am  not "that" passionate about the idea. was thinking of building  an "idle game".   how many hours you estimate i would have to put into this? 200? more?
  - **Futuristocrat** (7↑): Start your game designing process on your phone while watching TV. This was how I started. I just used my Gamini app and asked it to “create a self contained html first person shooter game I can play on my phone.” Keep building on it from there. You’ll reach a hard limit around 4,000 lines of code, at which point you can transition over to an AI agent like Antigravity. But just being able to test out game ideas on my phone was awesome.
- **BloodMossHunter** (2↑): thats super cool and something i wanted to do too.. do u think it would be hard to make something simple like shooting a gun and have realistic objects physics where bullets would penetrate through, move boxes, etc?
  - **Futuristocrat** (2↑): Not difficult at all. You can just prompt your way there. For example, regarding physics, here is a link to a game I recently promoted together. No code was manually edited. [Martin’s Cube Knockdown](https://martinjacob.net/AI-games/Physics-121025.html)
    - **BloodMossHunter** (1↑): ty
