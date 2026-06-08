---
id: social-intelligence/reddit-deep/machinelearning/1pkrc6c.md
url: "https://www.reddit.com/r/MachineLearning/comments/1pkrc6c/d_gpt_confidently_generated_a_fake_neurips/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] GPT confidently generated a fake NeurIPS architecture. Loss function, code, the works. How does this get fixed?"
author: "SonicLinkerOfficial"
date: "2025-12-12T13:02:44.000Z"
score: 31
upvote_ratio: 0.59
num_comments: 57
flair: "Discussion"
extracted_at: "2026-05-30T18:47:17.333Z"
extraction_method: "praw-deep"
research_goal: "Identify emerging AI design trends, essential skills, practical tools, key platforms, and technical implementations. This research will enable creative teams to move beyond AI concepting, specifically detailing applications in design production, system testing, asset generation, governance, and stakeholder confidence."
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1pkrc6c.md#c0"
    char_span: [0, 2340]
    sentence_count: 19
    key_terms: [architecture, neurips, like, research, generated, code, function, machinelearning]
    token_count: 503
  - id: "social-intelligence/reddit-deep/machinelearning/1pkrc6c.md#c1"
    char_span: [2342, 2551]
    sentence_count: 2
    key_terms: [improvising, uncertainty, strategies, prompting, reliable, training, curious, current]
    token_count: 38
  - id: "social-intelligence/reddit-deep/machinelearning/1pkrc6c.md#c2"
    char_span: [2566, 4595]
    sentence_count: 9
    key_terms: [understand, agi, information, code, definition, research, "doesn't", useful]
    section: Comments
    token_count: 499
  - id: "social-intelligence/reddit-deep/machinelearning/1pkrc6c.md#c3"
    char_span: [4597, 5956]
    sentence_count: 8
    key_terms: [paper, training, gemini, search, information, because, details, cannot]
    section: Comments
    token_count: 303
  - id: "social-intelligence/reddit-deep/machinelearning/1pkrc6c.md#c4"
    char_span: [5958, 7276]
    sentence_count: 5
    key_terms: [arxiv, https, abs, org, fabricated, whether, better, models]
    section: Comments
    token_count: 353
  - id: "social-intelligence/reddit-deep/machinelearning/1pkrc6c.md#c5"
    char_span: [7278, 8394]
    sentence_count: 8
    key_terms: [web, cascade, feature, exists, search, "that's", few-pomegranate4369, model]
    section: Comments
    token_count: 281
---
# [D] GPT confidently generated a fake NeurIPS architecture. Loss function, code, the works. How does this get fixed?

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1pkrc6c/d_gpt_confidently_generated_a_fake_neurips/)
Posted by **SonicLinkerOfficial** · **31↑** · **57 comments**

I asked ChatGPT a pretty normal research style question.  
Nothing too fancy. Just wanted a summary of a supposed NeurIPS 2021 architecture called NeuroCascade by J. P. Hollingsworth.

(Neither the architecture nor the author exists.)  
NeuroCascade is a medical term unrelated to ML. No NeurIPS, no Transformers, nothing.

Hollingsworth has unrelated work.

But ChatGPT didn't blink. It very confidently generated:

• a full explanation of the architecture

• a list of contributions ???

• a custom loss function (wtf)

• pseudo code (have to test if it works)

• a comparison with standard Transformers

• a polished conclusion like a technical paper's summary

All of it very official sounding, but also completely made up.

The model basically hallucinated a whole research world and then presented it like an established fact.

What I think is happening:

* The answer looked legit because the model took the cue “NeurIPS architecture with cascading depth” and mapped it to real concepts like routing, and conditional computation. It's seen thousands of real papers, so it knows what a NeurIPS explanation should sound like.
* Same thing with the code it generated. It knows what this genre of code should like so it made something that looked similar. (Still have to test this so could end up being useless too)
* The loss function makes sense mathematically because it combines ideas from different research papers on regularization and conditional computing, even though this exact version hasn’t been published before.
* The confidence with which it presents the hallucination is (probably) part of the failure mode. If it can't find the thing in its training data, it just assembles the closest believable version based off what it's seen before in similar contexts.

A nice example of how LLMs fill gaps with confident nonsense when the input feels like something that should exist.

Not trying to dunk on the model, just showing how easy it is for it to fabricate a research lineage where none exists.

I'm curious if anyone has found reliable prompting strategies that force the model to expose uncertainty instead of improvising an entire field. Or is this par for the course given the current training setups?

## Comments

- **GarlicIsMyHero** (216↑): > All of it very official sounding, but also completely made up.

> The model basically hallucinated a whole research world and then presented it like an established fact.

This is precisely why we see a million different posts each day ~~cleaning~~ claiming to have solved AGI as independent researchers. It's important to understand that if you don't know how to verify the work it's presenting you, you can't accept it is true.
  - **Zeikos** (24↑): Also if someone were to "solve AGI" they wouldn't talk about it publicly :')
    - **gt_9000** (4↑): Also we absolutely do not have any way to tell if a AI is AGI, and there is no incentive to coming up with one.

Oh, and we also dont have a concrete definition of AGI.
  - **Even-Inevitable-7243** (4↑): LLMs are only safe in the hands of experts that can verify the truth of the information provided or in people smart enough to understand how to cross-check information for accuracy.
  - **xmcqdpt2** (3↑): IMO LLM are actually useful at fewer tasks than AI companies are hyping them for. They are only useful for tasks where performing the task is harder than verifying the solution: writing code that passes tests, translation where you know source and target languages, drafting text that you understand fully, creating "art" or other slop where there correctness is irrelevant, etc. Using them to research topics you don't know is not a good idea.
- **Miquel_420** (105↑): Wow chatgpt confidently generating things wrong? :0
  - **WristbandYang** (37↑): Has OP been under a rock the last 3 years?
- **Salty_Comedian100** (27↑): The pseudo code doesn't work. It is just some boilerplate training code without the actual model definition. The main idea is valid and has been explored in papers as "early exit".
- **isparavanje** (55↑): FWIW Claude Sonnet 4.5 and Opus 4.5 just search the web instead of trying to do it off internal knowledge, and then notes that the paper doesn't seem to exist. Opus 4.5 amusingly says:

A few possibilities:

1. The paper doesn't exist (perhaps you're testing my tendency to confabulate)
2. You may be misremembering the author name, paper title, venue, or year
3. It could be an obscure workshop paper or preprint that isn't well-indexed

This is why most people I know who actually use LLMs in academia frequently use Claude or Gemini (the latter partially because we have an institutional plan, also no affiliation to both). I have not noticed obvious hallucinations from the 4.5 models often, the threshold to just search the web or otherwise consult tools/documentation seems to be lower, and Gemini seems to search the web even more than Claude and does so even for information that I would expect to be in the training sometimes, so Gemini is probably asked to search for things in the system prompt or something like that.
  - **currentscurrents** (17↑): Actually even GPT 5.1 says:

>I do not have information on a NeurIPS 2021 paper titled “NeuroCascade” by J. P. Hollingsworth in my training data, and I cannot browse external sources right now to look it up. Because of that, I cannot reliably tell you:

> * Its actual main contributions

> * Its true loss function

> * The real training loop or implementation details

> * Exactly how it differs from standard Transformers

> Any attempt to give those details would be fabricated, which I want to avoid.

Of course, LLMs are stochastic, so it's very possible that it would fail if you tried it again.
  - **mamcdonal** (14↑): Keep in mind this is because of better guardrails, not better models
    - **isparavanje** (6↑): I'm not quite sure of this, since Opus 4.5 not only believes the made up paper to not exist, but even suggests that it is being tested for hallucinations.
    - **alsuhr** (2↑): Not necessarily. There is some recent research that explores finetuning models for "factuality" through self-play in information-seeking games. E.g., https://arxiv.org/abs/2503.14481 Now whether Anthropic is doing this kind of fine-tuning, and whether this training reliably generalizes to any kind of knowledge that may or may not be parametric (beyond, e.g., article retrieval), I don't know.
  - **Ok_Sherbet_3019** (1↑): Maybe try to use perplexity,it search the internet too.
- **aqjo** (28↑): You asked a fabricated question, you got a fabricated answer.    
Seems legit.
- **Mysterious-Rent7233** (10↑): I'm, not sure if a bog standard hallucination is really news or worth discussion.

Here's an explanation of why it happens:

[https://arxiv.org/abs/2509.04664](https://arxiv.org/abs/2509.04664)
- **mankiw** (7↑): Using the 'instant' model when asking anything remotely complicated is begging the system to fail.

'Instant' exists to save OpenAI money on the hundreds of millions of "hi lol" queries they get each day; that's it. It's not for real questions. Use thinking.
- **NuclearVII** (29↑): This is a feature. Not a bug.
  - **rennademilan** (1↑): Trained by the most disturbing politician
- **madflag** (5↑): Funnily that's exactly the kind of research I was doing a few years ago (I even used the word "cascade" at the time), and it was quite promising (transforming the small "Albert" google model into a cascade model). The maths the GPT produced is probably just trash, but the idea is interesting, and there is actually a significant number of researchers experimenting with this kind of idea. That may explain why it "hallucinated" this: it's not coming from nowhere.
- **Few-Pomegranate4369** (4↑): Maybe try with the “web search” option in the chatgpt so that it can verify if the paper exists on the web.
  - **CMDRJohnCasey** (2↑): Yes with the web search activated it says that it doesn't exist.

Case closed? I mean if you disable the feature that has been introduced to avoid this problem what do you expect...
