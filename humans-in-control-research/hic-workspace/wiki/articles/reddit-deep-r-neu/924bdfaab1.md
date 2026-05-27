---
url: "https://www.reddit.com/r/NEU/comments/1t6crmm/running_out_of_claude_credits_mahoraga_is_here/"
url_hash: "924bdfaab1"
kind: "article"
source: "Reddit Deep: r/neu"
title: "Running out of Claude credits? Mahoraga is here."
author: ""
date: "2026-05-07T14:48:50.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-19T18:05:30.025090+00:00"
chars: 3098
---

# Running out of Claude credits? Mahoraga is here.

Source: [Reddit Deep: r/neu](https://www.reddit.com/r/NEU/comments/1t6crmm/running_out_of_claude_credits_mahoraga_is_here/)

Northeastern gives us 300 a month, 500 if you're lucky, and premium seats if you're really lucky. By no means is that a small amount; it really is a useful resource that all students should honestly be abusing. (not to cheat on your NUpath courses, but to learn!) 

However tokens are getting more expensive, models are heavier, and i know a bunch of kids that run out before the end of the month. they wait for northeastern, but there are a million students here, and they just can't give us more and more. I personally use claude in my co-op as well, which eats usage. 

"So just use a local model," a smart freshman kid would say. local models run on your own device, and are essentially free. However cloud models like claude, chatgpt, most mainstream subscription models are just smarter and logically sound. 

I built **Mahoraga**, which routes simple tasks using contextual bandits (LinUCB) to local models to cut costs, as well as increase speed. Most work you do consists of bash, edit, etc. honestly pretty quick and light commands that claude really shouldn't have to run. All local inference, all free. Cloud escalation exists but only fires on retry.

So if you're doing CS/Business/honestly whatever nowadays and want to build/ship more often this might be the solution. Clone the repo, fork the repo, everything is **opensource** so you can use claude to implement this if you run into difficulty. Runs on your computer, no one else gets the data except you. (not me, not northeastern). 

Fork, Clone, Star, Steal: [github.com/pockanoodles/Mahoraga](https://github.com/pockanoodles/Mahoraga)

I ran 192 tasks across 8 agents (4 local Ollama models, 4 cloud CLIs) on a 16GB MacBook Pro, forcing round-robin so every agent got every prompt. Quality is scored by a 4-layer heuristic system (novelty ratio, structural checks, embedding similarity, length ratio). Zero API cost for evaluation, and no LLM-as-judge.

Results, tables, and analysis is on the github. If you study CS/DS/AI, you probably know more than me. Input would be appreciated.

--- TOP COMMENTS ---
[7↑ GreedyWorking1499] How many people do you know run out of Claude credits monthly? Because I only know 1 (me)
[5↑ Own-Professional3092] A bunch of my friends are CS students, and we happened to have one guy who sweats on claude all day. Naturally, we all hopped on and we consistently run out of credits now.   
  
I know a bunch of people that request credits every month tho. People use it to create their own trading tools, all kinds of cool stuff.
[3↑ GreedyWorking1499] That’s interesting. I’m the Claude guy of my friend group so I ran out but my closest friend only got to like $200 and we just graduated so we took hard classes.
[1↑ LeopardAway2812] Its pretty easy when running claude on large projects. I ran out of credits in about a week for the past 2 months and luckily this month I got a premium seat.
[1↑ GreedyWorking1499] A premium seat? What is that and how do you get it?
[2↑ Well_-Oiled_Machine] GOod Stuff!
[1↑ Own-Professional3092] I appreciate it, well-oiled machine.
[2↑ Kadabrium] Linkedin?
