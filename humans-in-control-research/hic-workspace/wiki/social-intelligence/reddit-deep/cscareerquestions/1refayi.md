---
id: social-intelligence/reddit-deep/cscareerquestions/1refayi.md
url: "https://www.reddit.com/r/cscareerquestions/comments/1refayi/i_tracked_job_openings_at_anthropic_for_the_past/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "I tracked job openings at Anthropic for the past year, their hiring tells a different story than their CEO about AI replacing SWEs"
author: "illicity_"
date: "2026-02-25T14:52:12.000Z"
score: 305
upvote_ratio: 0.9
num_comments: 89
flair: ""
extracted_at: "2026-05-19T17:57:56.740Z"
extraction_method: "praw-deep"
research_goal: "Identify strategic opportunities for Northeastern University to enhance experiential learning and co-op success, specifically focusing on First Year Student Preparedness, unifying fragmented student data into a 360 student profile, improving advisor capabilities, and strengthening corporate partner development. Leverage deep industry research, stakeholder transcripts, social data, articles, and news to inform this strategic analysis."
industries: [higher_ed, workforce]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/cscareerquestions/1refayi.md#c0"
    char_span: [0, 1028]
    sentence_count: 4
    key_terms: [anthropic, cscareerquestions, hiring, swe, swes, comments, openings, away]
    token_count: 244
  - id: "social-intelligence/reddit-deep/cscareerquestions/1refayi.md#c1"
    char_span: [1030, 2122]
    sentence_count: 1
    key_terms: [amodei, anthropic-hiring-vs-ai-replacement, dario, ceo, feb, jan, anthropic, engineer]
    token_count: 411
  - id: "social-intelligence/reddit-deep/cscareerquestions/1refayi.md#c2"
    char_span: [2137, 4270]
    sentence_count: 13
    key_terms: [fundamental, models, limitations, chatgpt, https, frenchfreer, information, com]
    section: Comments
    token_count: 509
  - id: "social-intelligence/reddit-deep/cscareerquestions/1refayi.md#c3"
    char_span: [4272, 6328]
    sentence_count: 13
    key_terms: [new, need, use, executives, probably, product, saying, "don't"]
    section: Comments
    token_count: 506
  - id: "social-intelligence/reddit-deep/cscareerquestions/1refayi.md#c4"
    char_span: [6330, 7774]
    sentence_count: 8
    key_terms: [claude, communication, code, tech, believe, company, status, being]
    section: Comments
    token_count: 353
  - id: "social-intelligence/reddit-deep/cscareerquestions/1refayi.md#c5"
    char_span: [7776, 8899]
    sentence_count: 2
    key_terms: [startup, u4fhrvs8if9tandyp, dolphinsfan15521, intensification, intensifies, themselves, available, companies]
    section: Comments
    token_count: 290
---
# I tracked job openings at Anthropic for the past year, their hiring tells a different story than their CEO about AI replacing SWEs

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1refayi/i_tracked_job_openings_at_anthropic_for_the_past/)
Posted by **illicity_** · **305↑** · **89 comments**

Hi all,

It feels like every month a quote from Anthropic goes viral about how SWEs won't exist in the future due to AI.

I wanted to see if Anthropic is actually hiring less as a result of AI. So, I compiled a dataset of their monthly SWE job openings juxtaposed with quotes from execs about AI replacement.

**The results are clear: Anthropic is claiming that SWE jobs will go away, while simultaneously hiring more SWEs than ever.** Since Jan '25 their open SWE roles are up 170% and the curve is accelerating.

It's important to remember that AI companies have an incentive to claim that their tech will automate away jobs because that's what their customers/investors want to hear.

|Month|Count of Open SWE Roles at Anthropic|% Change|Notable Quote from Anthropic Execs|
|:-|:-|:-|:-|
|Jan 2025|43|—||
|Feb 2025|51|\+19%||
|Mar 2025|55|\+8%|*"I think we'll be there in three to six months — where AI is writing 90% of the code."* — Dario Amodei (CEO)|
|Apr 2025|59|\+7%||
|May 2025|65|\+10%|*"AI could wipe out half of all entry-level white-collar jobs."* — Dario Amodei (CEO)|
|Jun 2025|63|\-3%||
|Jul 2025|62|\-2%||
|Aug 2025|52|\-16%||
|Sep 2025|46|\-12%||
|Oct 2025|51|\+11%||
|Nov 2025|55|\+8%|*"Maybe as soon as the first half of next year: software engineering is done."* — Adam Wolff (Engineer)|
|Dec 2025|61|\+11%||
|Jan 2026|84|\+38%|*"I think we might be six to 12 months away from AI doing most of what SWEs do end to end."* — Dario Amodei (CEO)|
|Feb 2026|117|\+39%|*"We're going to start to see the title 'software engineer' go away."* — Boris Cherny (Claude Code Creator)|
|**Jan '25 → Feb '26**|**43 → 117**|**+172%**||

Here is a [graph view](https://grepjob.com/trends/anthropic-hiring-vs-ai-replacement) of the above data which will be updated every month

## Comments

- **frenchfreer** (78↑): I’ve made this post over, and over, and over again. Stop getting for your information from people with a vested interest in selling AI products. They lie with the express purpose of selling you and your boss AI products. AI researchers have published journals articles over and over again about the FUNDAMENTAL limitations of LLMs. I.e., without a fundamental shift in technology and how these models are created they are about as good as they can fundamentally be. AI isn’t coming for your job.
  - **NWOriginal00** (10↑): I agree that any LLM model has limitations. I don't know how anyone uses these models regularly and does not notice it frequently. Most of the time they seem like geniuses because they mimic intelligence so well. But at least once a week they do something to reveal that they actually don't understand anything and are just following statistical patterns. 

Until we get models that can apply information abstractly, and really understand it, I do not see all white collar jobs going away. As an example, a model that knows everything about the game of chess should be able to apply that knowledge and beat an Atari 2600. But an LLM can't do that type of thing.
  - **Fun_Highway_8733** (8↑): Do you have a link to one of the journals you've read? I believe you, but Id lov to see one of your sources for my own digestion
    - **frenchfreer** (23↑): Here you go:

> [On the Fundamental Limits of LLMs at Scale](https://arxiv.org/abs/2511.12869?utm_source=chatgpt.com)

And

> [Ronghi & Mu, “Fundamental Limits of Accelerating Large Language Models without Compromising Accuracy” (2023, Alan Turing Institute report)](https://www.turing.ac.uk/sites/default/files/2024-01/ronghi_mu_-_fundamental_limits_of_accelerating_large_language_models.pdf?utm_source=chatgpt.com) 

And one specific to how LLMs fail to classify things correctly even with helpful prompting.

> [Hager et al., “Evaluation and mitigation of the limitations of large language models in interpreting lab test results” (2024, medical context)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11405275/?utm_source=chatgpt.com)

I also read a paper last year about how human knowledge limitations are also a limiting factor for LLMs generating new research. There’s a lot of amazing things that LLMs can do, but the gap between what researchers are saying AI can do and what CEOs and executives are saying AI can do is getting wider and wider every day it seems.
  - **silly_bet_3454** (2↑): Hmm I think both sides of the argument are true. That is, yes the executives exaggerate and lie and we should not listen to them, but at the same time it still is very possible that AI is coming for our jobs, it's just a question of which jobs and when and to what degree.
  - **pacman2081** (1↑): When the internet (read Web) came out in 1993, how much impact did it have? I was sending checks by mail even in 2005.
- **Slggyqo** (32↑): “We’re scaling up.” 

“Oh cool, with new AI agents that you invented?”

*turns away in a huff*
- **FeralWookie** (8↑): There may come a point where we don't write lines of code in a specific language. I don't think we will even need human like AGI to get there. But we aren't there today. Based on the past we probably need a few decades of vastly improved tooling to provide the new framework for producing software with AI. Probably will become some kind of pseudo code or template type operation. With a new generation of what will be ultra high level languages.
- **Spicebox** (47↑): Those aren’t the SWE roles that are going to go away. They’re hiring to develop a product that would cause other companies to need less SWE, but development of that product needs staff. Potentially they would lay those people off when they’re done. That’s what they would like you to believe anyway.
  - **nappiess** (4↑): I hope at the very least that all of the "traitors" would get laid off too, but realistically at that point they would all be too rich to care
- **StretchMoney9089** (6↑): Anthropic and the other dragons use this marketing to alienate developers whom do not use AI tools. In clear text: You are a dinosaur if you do not use a LLM of some kind. 

Bombarded enough with this marketing, and you will eventually believe it is true, because it feels like everyone else is using LLMs, so you also have to use it -> Anthropic makes more money. 

CEOs are being invited to go through courses about agents, and the hidden message is the same. If you are a CEO and run a company that do not use AI tools, then you are an idiot. The CEO gets fomo and orders a mass purchase of Claude Code licenses without having a damn clue of how it works.
  - **MBAtoPM** (1↑): Nah Claude code is legit. At my big tech the majority of code is now being generated via Claude.
    - **StretchMoney9089** (3↑): I know it is good. I just adressed OPs question regarding the contradictory communication from these companies. I believe the goal with this kind of communication is making people think they have to buy the tools, else they are screwed, and this is simply not true. There are plenty of software domains and applications where the productivity gain is not real or very small.
    - **b0ound** (1↑): did you big tech produce more result or require less dev for the same amount of work?
- **Krigrim** (14↑): I have only one link to give:

[https://status.claude.com](https://status.claude.com)

lmao.
  - **travybongos69** (2↑): Hey but they ship things really fast!
- **mattspeed112** (11↑): There is a recent paper by HBR that studied a 200 person US tech company and determined that AI does not reduce work.

AI Doesn’t Reduce Work—It Intensifies It https://share.google/u4fHrvs8if9TAnDyP
  - **darth_koneko** (7↑): How can you tell that the intensification was done by the AI use and not by some managers demanding more results now that AI is available and the employees crunching out of fear?
    - **b0ound** (1↑): at the current stage of AI and how things changing, i would agree that it may intensify it. result may flip flop and you need keep "learning" it.
- **DolphinsFan15521** (3↑): Dam and I applied there like 4 times and never even got an email back, I guess I just suck lol.
- **ender42y** (2↑): Wait the guy selling umbrellas might not be honest about the chances of rain later today? I'm shocked!
- **Fearless_Weather_206** (2↑): They are hiring all the seasoned AI SWE folks since they don’t want them to grow a brain and for them to realize they could make a fortune if they make their own startup companies and make their ideas into a product that ends up competing with them.
  - **AndAuri** (3↑): I have seen what kind of people call themselves ai engineer here... safe to say their startup wouldn't go anywhere
