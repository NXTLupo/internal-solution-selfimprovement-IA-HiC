---
url: "https://www.reddit.com/r/OpenAI/comments/1ndj2wx/the_ai_nerf_is_real/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "The AI Nerf Is Real"
author: "exbarboss"
date: "2025-09-10T16:31:38.000Z"
score: 878
upvote_ratio: 0.92
num_comments: 163
flair: "Article"
extracted_at: "2026-05-11T17:27:05.358Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# The AI Nerf Is Real

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1ndj2wx/the_ai_nerf_is_real/)
Posted by **exbarboss** · **878↑** · **163 comments**

Hello everyone, we’re working on a project called IsItNerfed, where we monitor LLMs in real time.

We run a variety of tests through Claude Code and the OpenAI API (using GPT-4.1 as a reference point for comparison).

We also have a Vibe Check feature that lets users vote whenever they feel the quality of LLM answers has either improved or declined.

Over the past few weeks of monitoring, we’ve noticed just how volatile Claude Code’s performance can be.

https://preview.redd.it/46k0sbqw6dof1.png?width=2652&format=png&auto=webp&s=9c539f632be894082574a2f98e28a6b14d3480d6

1. Up until August 28, things were more or less stable.
2. On August 29, the system went off track — the failure rate doubled, then returned to normal by the end of the day.
3. The next day, August 30, it spiked again to 70%. It later dropped to around 50% on average, but remained highly volatile for nearly a week.
4. Starting September 4, the system settled into a more stable state again.

It’s no surprise that many users complain about LLM quality and get frustrated when, for example, an agent writes excellent code one day but struggles with a simple feature the next. This isn’t just anecdotal — our data clearly shows that answer quality fluctuates over time.

By contrast, our GPT-4.1 tests show numbers that stay consistent from day to day.

And that’s without even accounting for possible bugs or inaccuracies in the agent CLIs themselves (for example, Claude Code), which are updated with new versions almost every day.

What’s next: we plan to add more benchmarks and more models for testing. Share your suggestions and requests — we’ll be glad to include them and answer your questions.

[isitnerfed.org](http://isitnerfed.org)

## Comments

- **ambientocclusion** (248↑): Imagine any reasonable developer wanting to integrate this tech into a business process.
  - **Bnx_** (95↑): I can’t imagine things, I just see black.
    - **PTSDev** (38↑): it's called aphantasia... but you probably already know that ..I hate it! 😭
    - **goddammit_butters** (3↑): when I look in the toilet bowl, it's purple. Purple and black!
    - **Ok-Confection8181** (2↑): How do you plan for things? Like building new workflows/flow charts? For example, when you need to Think through processes to build a new system or complete your tasks?
    - **kirlandwater** (3↑): Underrated response
  - **Wunjo26** (12↑): My company is going all in on using LLMs to solve simple deterministic problems that have already been solved with code written by humans. They were talking about response latency from the agent and how adding guardrails increases latency and so they’re considering not having guardrails lol
    - **ambientocclusion** (1↑): Hahahaha! And why not also swap in the cheapest LLM each month? I hope you don’t end up on the maintenance team, after all the “architecture astronauts” have gotten their promotions!
  - **Sad_Background2525** (17↑): It’s not the devs I promise. 

I got branded as a complainer because I fought against stupid AI garbage so now I just nod my head and do what the guy with a lambo tells me to do.
  - **Wapook** (7↑): It’s important to note that there is a difference between APIs developers use and the chat bot or coding agent products provided by those same organizations. OpenAI can and will adjust the models, routers, and system prompts underpinning ChatGPT. Messing around with their API models is a different story. As with any external integration critical to your product, if you’re not monitoring the quality you get back from it, you’re open to trouble.
  - **FeepingCreature** (5↑): Have you met employees tho.
    - **ambientocclusion** (3↑): “Resume-driven development” for the win!
  - **ChallengeSweaty4462** (2↑): That's why they use AI- because they can't imagine anything besides profit.
    - **ambientocclusion** (1↑): Those juicy, juicy RSUs, oh baby
  - **Business_Diver_4982** (2↑): For years I've thought that was just normal. Some days I really fucking hate my brain.
  - **The_Real_Slim_Lemon** (2↑): “Imagine” bro there was a post yesterday on a developer using AI as a production regex tool
    - **ambientocclusion** (1↑): They obviously deserve a promotion and stock!
  - **MaxwellHoot** (2↑): def GPT_JSON_decoder(input_json):
    - **ambientocclusion** (1↑): Ohhhhh…..Didn’t someone do a joke GPT math library already? 🤪
  - **Ormusn2o** (3↑): Yup. Who would pick this over the reliable and consistent humans from which this variability basically never happens.
    - **ambientocclusion** (1↑): LOL. At least humans usually keep their opinions on Hitler to themselves while at work!

But seriously: Has anyone deployed a reliable chatbot that replaces first-line Customer Support people? It seems like it ought to be a slam dunk.
- **[deleted]** (96↑): How do you control for people being influenced by negative reporting and social media posting on changes and updates?
  - **exbarboss** (18↑): We don’t have a mechanism for that right now - the Vibe Check is just a pure “gut feel” vote. We did consider hiding the results until after someone votes, but even that wouldn’t completely eliminate the influence problem.
    - **cobbleplox** (67↑): The vibe check is just worthless. You can get the shitty "gut feel" anywhere. I realize that's the part that costs a whole lot of money, but actual benchmarks you run are the only thing that should be of any interest to anyone. Oh and of course you run the risk of your benchmarks being detected if something like this gets popular enough.
    - **[deleted]** (12↑): All you have to do is look at Reddit upvotes and see how much the snowball effect influences such things though. Often if an incorrect answer gets some momentum going people will aggressively downvote the correct one. I guess herd mentality is just human nature.
    - **br_k_nt_eth** (5↑): Respectfully, that’s not a great way to do sentiment analysis. It’s going to ruin your results. There are standard practices for this kind of info gathering that could make your results more accurate.
    - **phoenixmusicman** (4↑): > the Vibe Check is just a pure “gut feel” vote.

You're essentially dressing up people's feelings and presenting it as objective data. 

It is not an objective benchmark.
    - **bullcitytarheel** (2↑): You realize including “vibes” makes everything you just posted worthless, right?
    - **DataGaia** (0↑): Maybe change to or add a media/headlines sentiment tracker?
- **rorowhat** (21↑): Are they just updating the models on the fly? Or what is the reason for this variance.
  - **exbarboss** (12↑): We’d love to know that too.
    - **uwilllovethis** (2↑): I take it you have temperature set to 0 for deterministic output (otherwise your results could simply be due to probability). Nevertheless, I’m not sure it’s still relevant, but there used to be this problem where sparse MoE LLM APIs could not be deterministic even when setting temperature at 0. Have a look here: https://152334h.github.io/blog/non-determinism-in-gpt-4/
    - **throwawayyyyygay** (3↑): Likely they have a couple different “tiers” for each model. Ie. one witb slightly more or less parameters. And they triage API calls into these different tiers.
  - **thinkbetterofu** (2↑): using ones brain they can surmise that most all ai companies serve quantized models at peak use time to meet demand with less downtime
    - **rorowhat** (3↑): That's too much work, if anything they are messing with context length since that is easily done on the fly and can save a lot of memory.
- **Lukematikk** (35↑): why are you only measuring gpt-4.1 daily, but claude every hour? Could it be that the volatility is just related to demand throughout the day, and you're missing 4.1 volatility entirely because your sample rate is so low?
- **twbluenaxela** (8↑): I noticed this in the early days of GPT 4. Great model, SOTA, but OpenAI did nerf it by implementing restrictions in it's content policies. Many people said it was nonsense, but I still firmly believe it. It happens with all the models. Gemini 2.5 3/25 was a beast. The current Gemini is still great. But still short of that release. 

Costs must be cut. 

And performance follows. That's just how things go.
- **FeepingCreature** (6↑): I think this is issue 2 from the [Anthropic status page](https://status.anthropic.com/).

> Resolved issue 2 - A separate bug affected output quality for some Claude Haiku 3.5 and Claude Sonnet 4 requests from Aug 26-Sep 5. A fix has been rolled out and this incident has been resolved.
  - **exbarboss** (0↑): It’s very interesting that we saw the same fluctuations on our side - and then they’re reported as "bugs". Makes you wonder - are these only classified as bugs after enough complaints from the user base?
    - **FeepingCreature** (1↑): I mean, it's definitely good to report them. But they say, at least, that they never intentionally degrade quality, which is a pretty strong claim.
- **Lumiplayergames** (6↑): What is this due to?
  - **exbarboss** (4↑): The reasons aren’t really known - our tests just demonstrate the degraded behavior, not what’s causing it.
  - **LonelyContext** (1↑): Probably, if I had to guess, model safety or other such metrics which come at the expense of raw performance.
- **TigglyWiggly95** (13↑): Thanks for all the hard work!
- **Amoral_Abe** (16↑): Yeah, the people denying it are bots or trolls or very casual users who don't need AI for anything intensive.
  - **Shining_Commander** (6↑): I long suspected this issue and its soooo nice and validating to see its true.
  - **whatsgoodbaby** (1↑): No one needs AI for anything intensive
- **AIDoctrine** (10↑): Really appreciate the work you're doing with IsItNerfed. Making volatility visible like this is exactly what the community needs right now. This is actually why we built FPC v2.1 + AE-1, a formal protocol to detect when models enter "epistemically unsafe states" before they start hallucinating confidently. Your volatility data matches what we found during extended temperature testing. While Claude showed those same performance swings you described, our AE-1 affective markers (Satisfied/Distressed) stayed 100% stable across 180 tests, even when accuracy was all over the place.  
This suggests reasoning integrity can stay consistent even when surface performance varies. Opens up the possibility of tracking not just success/failure rates, but actual cognitive stability.  
We open-sourced the benchmark here: [https://huggingface.co/datasets/AIDoctrine/FPC-v2.1-AE1-ToM-Benchmark-2025](https://huggingface.co/datasets/AIDoctrine/FPC-v2.1-AE1-ToM-Benchmark-2025)  
Would love to explore whether AE-1 markers could complement what you're doing. Real-time performance tracking (your strength) plus reasoning stability detection (our focus) might give a much fuller picture of LLM reliability.
