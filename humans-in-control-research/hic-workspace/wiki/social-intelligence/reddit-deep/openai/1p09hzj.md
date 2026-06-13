---
id: social-intelligence/reddit-deep/openai/1p09hzj.md
url: "https://www.reddit.com/r/OpenAI/comments/1p09hzj/gemini_30_pro_vs_gpt_51_benchmark/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "gemini 3.0 pro vs gpt 5.1 Benchmark"
author: "Sea-Efficiency5547"
date: "2025-11-18T11:28:49.000Z"
score: 1011
upvote_ratio: 0.97
num_comments: 183
flair: "News"
extracted_at: "2026-05-11T17:27:05.355Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c0"
    char_span: [0, 301]
    sentence_count: 1
    key_terms: [openai, comments, gemini, sea-efficiency5547, pro, performance, reddit-deep, benchmark]
    token_count: 98
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c1"
    char_span: [315, 1677]
    sentence_count: 5
    key_terms: [gemini-3-pro-model-card, deepmind-media, https, model-cards, googleapis, impressive, web, archive]
    section: Comments
    token_count: 380
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c2"
    char_span: [1679, 3867]
    sentence_count: 13
    key_terms: [training, models, questions, problems, apex, data, question, because]
    section: Comments
    token_count: 477
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c3"
    char_span: [3869, 5683]
    sentence_count: 15
    key_terms: [gemini, model, aime, google, questions, data, guardrails, training]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c4"
    char_span: [5685, 6978]
    sentence_count: 11
    key_terms: [gemini, like, released, chatgpt, no-philosopher3977, sea-efficiency5547, knew, too]
    section: Comments
    token_count: 345
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c5"
    char_span: [6980, 8489]
    sentence_count: 10
    key_terms: [gemini, chatgpt, programming, work, different, machines, feature, manuals]
    section: Comments
    token_count: 352
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c6"
    char_span: [8491, 9408]
    sentence_count: 7
    key_terms: [google, gemini, look, lot, sure, hallucinating, fantasy-512, information]
    section: Comments
    token_count: 213
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c7"
    char_span: [9410, 11050]
    sentence_count: 12
    key_terms: [google, gemini-3-pro-model-card, sirrece, something, context, million, noticed, release]
    section: Comments
    token_count: 452
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c8"
    char_span: [11052, 12625]
    sentence_count: 10
    key_terms: [thinking, dc0b8eef0d96e79c449b38a9add429d4ae672f9f, math, problems, coding, gemini, solved, years]
    section: Comments
    token_count: 446
  - id: "social-intelligence/reddit-deep/openai/1p09hzj.md#c9"
    char_span: [12627, 13646]
    sentence_count: 5
    key_terms: [coding, claude, development, benchmarks, better, gemini, bench, chart]
    section: Comments
    token_count: 245
---
# gemini 3.0 pro vs gpt 5.1 Benchmark

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1p09hzj/gemini_30_pro_vs_gpt_51_benchmark/)
Posted by **Sea-Efficiency5547** · **1011↑** · **183 comments**

Gemini 3.0 Pro has better performance than any model OpenAI has released so far.

## Comments

- **user0069420** (140↑): The model card was released at : https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf

But is now taken down
  - **thynetruly** (38↑): It's true, I downloaded it before it got taken down.
    - **Longjumping_Area_944** (7↑): Can you upload it somewhere?
  - **Hauven** (27↑): Seems to be true. Damn those benchmarks are impressive, I hope the model is as impressive in reality. Google Search also confirms that the URL did indeed exist for a brief time.
    - **dudevan** (14↑): It will be impressive for about 2-3 weeks. The cycle continues.
  - **sami_exploring** (10↑): You can find it in the internet archive: https://web.archive.org/web/20251118111103/https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf
    - **az226** (2↑): Link for mobile users https://web.archive.org/web/20251118111103if_/https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf
  - **Public-Brick** (1↑): in the "leaked" model card, it says knowledge cutoff was January 2025. This doesnt make much sense as this was the one of Gemini 2.5 pro.
- **birdomike** (123↑): For context on the MathArena Apex score:

-Most math benchmarks are pretty useless now because models have likely seen the problems in their training data and just "memorized" the logic patterns.

-Apex prevents this by using problems from 2025 competitions (after the training cutoff). That explains the massive gap—the other models are stuck at ~1% because they can't rely on memory/training data, which makes Gemini’s 23% the first real sign of solving novel problems rather than just pattern-matching.
  - **Embarrassed_Bread_16** (21↑): ok but dont these models have different cutoff points? what is the methodology of apex in such case? it takes different subsets of tasks?
    - **birdomike** (28↑): Apex doesn't change the test questions for each model. It uses a fixed set of the hardest problems from 2025 competitions (like the IMO or AIME).

The whole point is that these problems are "future data" relative to when most of these models were trained. If Gemini 3 is scoring this high, it either genuinely solved them (reasoning) or its training data is so new that it scraped the 2025 answers (contamination). But given the gap (23% vs 1%), it looks like genuine reasoning.
  - **FateOfMuffins** (10↑): No that's not what Apex is. Aside from 2024 AIME, almost all of the math evals are done with 2025 contests. 

Apex are simply a collection of questions that no LLM is able to consistently get correct out of all of the final answer contests held this year, as of a certain date. If any LLM is able to get a question correct consistently, then it would not be included in the Apex collection. 

You can see their explanation in more detail here: matharena.ai

It has nothing to do with training data and I question the entire premise of models seeing the exact question in training because why are base models generally not able to do math problems in general then? Checking whether or not a model has been benchmaxxed is more about using a train/test dataset using questions that have occurred both before and after a models release. Since there cannot be any questions after Gemini's release yet, this is impossible to test right now (just because the questions are after the supposed training knowledge cutoff does not prevent it from being accidentally used in the training data. Matharena specifically highlights models that are released after the competition date). 

What I mean by this is, suppose you have 2 models released in between AIME 2024 and 2025. If model A scores 90% on AIME 2024 but only 75% on AIME 2025, while model B scores 85% on AIME 2024 and 84% on AIME 2025, then likely model A was trained specifically on the questions and is less able to generalize outside of distribution. 

The next time we can really test this for Gemini 3 (because math contests are getting saturated) is the Putnam exam held on Dec 6. 

Apex here has nothing to do with whether or not the questions are in training data. They were simply types of questions that LLMs found hard as of October ish 2025
  - **pseudonerv** (7↑): Or a first real sign of seeing the problem in training
  - **Tolopono** (1↑): Livebench uses the same tactic and llms score very high on it
- **Rayen2** (220↑): Google will be the winner of the ai race.
  - **Illustrious-Money-52** (125↑): Google has a huge data and money advantage.
Already with 2.5 I started using Gemini more than GPT.

But competition is only good.
Let them "slaughter".
Greater innovation and lower price for us consumers.
    - **Ok_Potential359** (42↑): OpenAI turned to shit with their guardrails. Gemini and Claude continue to impress me. High hopes for Gemini.
    - **TofuTofu** (2↑): Data, money, chips, talent, customers. They are top tier in all these. Only thing stopping google from winning is google.
    - **Embarrassed_Bread_16** (1↑): did they say something about price of this model?
    - **grayjet** (1↑): I've entirely switched from ChatGPT to Gemini.  Guardrails are more reasonable and it's not as agreeable, but still a bit too sycophantic at times.  Also, NanoBanana is super good for image-editing.
  - **New_World_2050** (23↑): These are really impressive numbers considering openais model only came out days ago.

Looks like I'm changing to Gemini now lol
    - **The0zymandias** (-4↑): i thought gemini was really tacky?
  - **Sea-Efficiency5547** (23↑): Considering that Gemini 3.0 Pro was released only six days apart from GPT 5.1, it now feels like the gap between them has become way too big.
    - **the_mighty_skeetadon** (10↑): OpenAI only released 5.1 when they did because they knew Gemini 3 was coming. Same with Grok 4.1. 

It's why there were obvious missing pieces to both launches - benchmarks, reports, API access, etc.

They knew they were about to get smoked and wanted their products to have a moment in the sun. Fwiw, 5.1 is actually a great idea in my opinion.
    - **No-Philosopher3977** (-7↑): I don’t think so. It’s a race to AGI not this
  - **slippery** (8↑): I've been saying this for a while. DeepMind is the apex predator team and they have the cash flow and hardware.
- **absentlyric** (44↑): Ive commented before here. I love ChatGPT for the most human like experience when it comes to conversations that are more abstract, hobbies, or regular everyday things.

But I use Gemini exclusively for anything in my trade work, and logic related. I can throw work manuals at it, and it can decipher them with ease. ChatGPT hallucinates a little too much for it to be as dependable.

ChatGPT is my Cadillac, smooth comfortable ride, but Gemini is my Heavy Duty work truck, not as fancy, but does a damn good job hauling work.
  - **GamingDisruptor** (23↑): The money is made with the Heavy Duty truck. The other actually cost the company money.
  - **slog** (1↑): That's interesting. I haven't messed around with Gemini much so don't have anything that even resembles a controlled experiment, but anecdotally, the AI responses in Google searches are pretty rough with hallucinations. Maybe I'll try with some more specific asks and my own documents.
    - **absentlyric** (3↑): Im a Toolmaker by trade, I have to run a lot of CNC machines, each one is different with different software. With Gemini (Pro) I can tell it what machine Im on, what controller it uses, and it can give me the exact programming codes if Im programming something with G-Code, and I always review it before putting it to the test. So far, Gemini has not made any mistakes. But ChatGPT just can't seem to handle it, or it gives me generic M-G Codes that may or may not work.

A really nice feature of Gemini is I can upload manuals. Some of those machines have 900 page manuals dealing with programming, maintenence, etc, and once uploaded, it will tell me everything I need to know.

A bad feature though (And this is where ChatGPT wins so far) is displaying math in its proper form, if I need to calculate hydraulic pressure, etc Gemini spits out some glitchy symbols where as ChatGPT displays it in it's actual form.

 Honestly, I WANT ChatGPT to be able to do everything Gemini does, or vise versa. Eventually one will have to win as Im not going to pay for both per month. Im sure a lot of people are thinking the same.
    - **Fantasy-512** (3↑): I am curious why you think Google AI overviews are hallucinating? It usually gives references to the web sites it got the information from. Are those websites spurious?  It could happen, if say reddit is one of them. LOL
    - **carelet** (1↑): Pretty sure google search AI responses are from weaker and cheaper models, because it is expensive to give everyone that uses google results from a big model when they might not even look at it
    - **magikowl** (1↑): My experience is the exact opposite and while the benchmarks look promising (and the fact that Google is due for some AI success), it will take a lot of successful use before I'd switch to Gemini for work related stuff.  

I threw a few web development/game related tasks at it in AI Studio and it did well.  I saw a comment that really hit home for me in the context of this Gemini 3 Pro release: "crazy that people think openai will just let google have this week".  It seems well established at this point that all the big players have more powerful unreleased models.  I wouldn't put it past OpenAI to release something to steal Google's thunder.  Beyond that, I really don't trust Google with my data so it's hard to want to use their product any more than I have to.
- **Sweaty-Cheek345** (20↑): Google had everything ready to be the leader of the AI race, compute, capacity, innovation in use, user base, reach… even SamA’s hail mary of unrestricted access to NSFW chats (yes, it has that under Gems). All it needed was an attractive frontier model, and now they have it.
- **SirRece** (27↑): Is there a link to this? Like, where is this from?
  - **Crowley-Barns** (29↑): Here you go: https://ia601703.us.archive.org/16/items/gemini-3-pro-model-card/Gemini-3-Pro-Model-Card.pdf
    - **SirRece** (1↑): Okay, so can you link something that is connected to a source? This is a pdf, where did it come from? I am not in the habit of clicking random links.
    - **bymechul** (-2↑): 1 million context window? The promised for 2 million
  - **Sea-Efficiency5547** (11↑): The URL has been shut down. I think Google may have noticed.
    - **SirRece** (2↑): Google may have noticed what though? Why would they want to hide superior performance?
    - **jisuskraist** (1↑): Is up.
- **bartturner** (9↑): Wow!
  - **bnm777** (-9↑): Not really - 5.1 is worse than 5.

They should have compared it with 5.1 Thinking.
    - **Flipslips** (1↑): Why would the base pro model compare to 5.1 thinking? If anything you would do Gemini 3 deep think vs 5.1 thinking.
- **luisbrudna** (9↑): Brutal. Feel the AGI.
- **TheInfiniteUniverse_** (8↑): Look at that MathArena Apex and ScreenShot Pro...the jump is unbelievable. 

At this rate of progress, "math" is literally solved in 2-3 years. And there will be little need for mathematicians from then on.
  - **inigid** (5↑): Andrew Wiles right now..

https://preview.redd.it/al260tddj02g1.jpeg?width=1280&format=pjpg&auto=webp&s=dc0b8eef0d96e79c449b38a9add429d4ae672f9f
  - **Aggressive-Tune832** (6↑): Can’t tell if a statement this ignorant is bait or not.
  - **Delicious_Egg_4035** (5↑): If you really think that math will be solved in 2-3 years at this rate you dont understand how these models work and what math is.
  - **FreshBlinkOnReddit** (1↑): Competition problems (highschool to undergrad level) and real unsolved problems are not anywhere near the same ballpark.


Also mathematics is literally axiomatically unsolvable as a whole. See the incompleteness theorem.
- **Amondupe** (23↑): Still can't beat Claude at coding?  Weird given the hype.
  - **Longjumping_Area_944** (33↑): It beats Sonnet at coding in multiple benchmarks, just not in swebench. However it seems as if Google will be making Gemini 3 widely available at low cost.

That is a very drastic challenge for Anthropic.
    - **CyberAttacked** (9↑): Yeah, but swe bench is the most relevant software engineering benchmark .

Terminal bench and Live Coding bench(which consists of competitive leetcode style problems) are not that important .
  - **ragner11** (46↑): It beat Claude by a good margin in Livecodebench and Terminal-bench and basically neck and neck with it in SWE. Seems Gemini is better at all round software development. SWE-Bench is not the be all end all of coding benchmarks
    - **Dex4Sure** (1↑): my ass. i'd love to see it actually beat claude in coding. benchmarks can always be gamed.
    - **Arcoscope** (-13↑): I would say claude is still more complete and accurate for coding with less compiling errors. But Gemini can make use of more context and is still pretty good in reasoning
  - **ZootAllures9111** (8↑): What? Are we reading the same chart?
  - **gopietz** (11↑): Is this really the essence you take from this chart?
  - **[deleted]** (1↑): Its screen recognition is apparently leagues better than the other models which is useful for certain kinds of programming like game development or anything with a GUI.
