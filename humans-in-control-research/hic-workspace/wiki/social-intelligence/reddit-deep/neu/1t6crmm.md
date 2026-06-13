---
id: social-intelligence/reddit-deep/neu/1t6crmm.md
url: "https://www.reddit.com/r/NEU/comments/1t6crmm/running_out_of_claude_credits_mahoraga_is_here/"
kind: "social-post"
source: "reddit-deep: r/neu"
subreddit: "neu"
title: "Running out of Claude credits? Mahoraga is here."
author: "Own-Professional3092"
date: "2026-05-07T14:48:50.000Z"
score: 15
upvote_ratio: 0.7
num_comments: 25
flair: "Co-op & Career"
extracted_at: "2026-06-05T17:08:22.597Z"
extraction_method: "praw-deep"
research_goal: "Identify strategic opportunities for Northeastern University to enhance experiential learning and co-op success, specifically focusing on First Year Student Preparedness, unifying fragmented student data into a 360 student profile, improving advisor capabilities, and strengthening corporate partner development. Leverage deep industry research, stakeholder transcripts, social data, articles, and news to inform this strategic analysis. \n"
chunks:
  - id: "social-intelligence/reddit-deep/neu/1t6crmm.md#c0"
    char_span: [0, 1846]
    sentence_count: 15
    key_terms: [claude, models, mahoraga, northeastern, local, run, honestly, "you're"]
    token_count: 448
  - id: "social-intelligence/reddit-deep/neu/1t6crmm.md#c1"
    char_span: [1848, 2296]
    sentence_count: 6
    key_terms: [ratio, llm-as-judge, appreciated, round-robin, evaluation, similarity, structural, embedding]
    token_count: 113
  - id: "social-intelligence/reddit-deep/neu/1t6crmm.md#c2"
    char_span: [2310, 3576]
    sentence_count: 10
    key_terms: [own-professional3092, greedyworking1499, credits, claude, people, linkedin, premium, friend]
    section: Comments
    token_count: 346
  - id: "social-intelligence/reddit-deep/neu/1t6crmm.md#c3"
    char_span: [3578, 4575]
    sentence_count: 2
    key_terms: [affectionate-net5939, credits, premium, enough, own-professional3092, shot-marketing-9227, limit, get]
    section: Comments
    token_count: 294
---
# Running out of Claude credits? Mahoraga is here.

Source: [reddit-deep: r/neu](https://www.reddit.com/r/NEU/comments/1t6crmm/running_out_of_claude_credits_mahoraga_is_here/)
Posted by **Own-Professional3092** · **15↑** · **25 comments**

Northeastern gives us 300 a month, 500 if you're lucky, and premium seats if you're really lucky. By no means is that a small amount; it really is a useful resource that all students should honestly be abusing. (not to cheat on your NUpath courses, but to learn!) 

However tokens are getting more expensive, models are heavier, and i know a bunch of kids that run out before the end of the month. they wait for northeastern, but there are a million students here, and they just can't give us more and more. I personally use claude in my co-op as well, which eats usage. 

"So just use a local model," a smart freshman kid would say. local models run on your own device, and are essentially free. However cloud models like claude, chatgpt, most mainstream subscription models are just smarter and logically sound. 

I built **Mahoraga**, which routes simple tasks using contextual bandits (LinUCB) to local models to cut costs, as well as increase speed. Most work you do consists of bash, edit, etc. honestly pretty quick and light commands that claude really shouldn't have to run. All local inference, all free. Cloud escalation exists but only fires on retry.

So if you're doing CS/Business/honestly whatever nowadays and want to build/ship more often this might be the solution. Clone the repo, fork the repo, everything is **opensource** so you can use claude to implement this if you run into difficulty. Runs on your computer, no one else gets the data except you. (not me, not northeastern). 

Fork, Clone, Star, Steal: [github.com/pockanoodles/Mahoraga](https://github.com/pockanoodles/Mahoraga)

I ran 192 tasks across 8 agents (4 local Ollama models, 4 cloud CLIs) on a 16GB MacBook Pro, forcing round-robin so every agent got every prompt. Quality is scored by a 4-layer heuristic system (novelty ratio, structural checks, embedding similarity, length ratio). Zero API cost for evaluation, and no LLM-as-judge.

Results, tables, and analysis is on the github. If you study CS/DS/AI, you probably know more than me. Input would be appreciated.

## Comments

- **GreedyWorking1499** (6↑): How many people do you know run out of Claude credits monthly? Because I only know 1 (me)
  - **Own-Professional3092** (4↑): A bunch of my friends are CS students, and we happened to have one guy who sweats on claude all day. Naturally, we all hopped on and we consistently run out of credits now.   
  
I know a bunch of people that request credits every month tho. People use it to create their own trading tools, all kinds of cool stuff.
    - **GreedyWorking1499** (3↑): That’s interesting. I’m the Claude guy of my friend group so I ran out but my closest friend only got to like $200 and we just graduated so we took hard classes.
  - **LeopardAway2812** (1↑): Its pretty easy when running claude on large projects. I ran out of credits in about a week for the past 2 months and luckily this month I got a premium seat.
    - **GreedyWorking1499** (1↑): A premium seat? What is that and how do you get it?
- **Well_-Oiled_Machine** (2↑): GOod Stuff!
  - **Own-Professional3092** (1↑): I appreciate it, well-oiled machine.
- **Kadabrium** (2↑): Linkedin?
  - **Own-Professional3092** (1↑): My LinkedIn is connected to my GitHub. 

Btw did u comment cause of the code, or cause of the name mahoraga. I really hope it is the latter. 

I really have to catch up to modulo.
- **puppyytpugs** (2↑): I have the Claude premium seat, 😭 how much does it actually give
  - **Shot-Marketing-9227** (2↑): how do u get that ?
    - **Sky_Master007** (2↑): Even i got it since the enterprise account showed i exhausted my limit which i didn't
  - **Shadow-Browser** (2↑): More than 1k$ I guese. The limit resets every 5hrs
- **Affectionate-Net5939** (2↑): How are people getting 500$ credits and premium seats, last month I ran out of credit and requested for additional credits but there was no response
  - **Sky_Master007** (2↑): They don't give you any because 300$ is enough already
    - **Affectionate-Net5939** (2↑): lol I know ppl who have received 500$ and 300$ is a lot but it is not enough for me
- **Sabana400** (2↑): Nice bro!
  - **Own-Professional3092** (1↑): Love you too brother
- **PayaPya** (2↑): this is actually pretty clever and solves my pain points you should post on product hunt (or just try to get more eyes on this)
