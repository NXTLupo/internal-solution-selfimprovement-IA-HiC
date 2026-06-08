---
id: social-intelligence/reddit-deep/machinelearning/1srufft.md
url: "https://www.reddit.com/r/MachineLearning/comments/1srufft/bulding_my_own_diffusion_language_model_from/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "Bulding my own Diffusion Language Model from scratch was easier than I thought [P]"
author: "Encrux615"
date: "2026-04-21T17:23:47.000Z"
score: 132
upvote_ratio: 0.97
num_comments: 30
flair: "Project"
extracted_at: "2026-05-11T17:27:06.571Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1srufft.md#c0"
    char_span: [0, 1265]
    sentence_count: 11
    key_terms: [diffusion, machinelearning, https, model, code, com, like, comments]
    token_count: 309
  - id: "social-intelligence/reddit-deep/machinelearning/1srufft.md#c1"
    char_span: [1280, 2632]
    sentence_count: 10
    key_terms: [diffusion, pretty, idiot, like, grandiose, transport, optimal, technical-debate1303]
    section: Comments
    token_count: 322
  - id: "social-intelligence/reddit-deep/machinelearning/1srufft.md#c2"
    char_span: [2634, 3809]
    sentence_count: 6
    key_terms: [diffusion, transformer, discrete, because, family, models, pitter-patter-rain, "it's"]
    section: Comments
    token_count: 297
  - id: "social-intelligence/reddit-deep/machinelearning/1srufft.md#c3"
    char_span: [3811, 5984]
    sentence_count: 11
    key_terms: [diffusion, encrux615, did, project, similar, architecture, shakespeare, lot]
    section: Comments
    token_count: 504
  - id: "social-intelligence/reddit-deep/machinelearning/1srufft.md#c4"
    char_span: [5986, 6173]
    sentence_count: 2
    key_terms: [implementing, implemented, annoying, batching, breaking, training, without, actual]
    section: Comments
    token_count: 34
---
# Bulding my own Diffusion Language Model from scratch was easier than I thought [P]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1srufft/bulding_my_own_diffusion_language_model_from/)
Posted by **Encrux615** · **132↑** · **30 comments**

Since I felt like I was relying on Claude Code a lot recently, I wanted to see how hard it is to implement a diffusion language model from scratch without the help of AI-Generated code. So I built one while waiting for the training for my master's thesis.

This is what I got after a few hours of training on my MacBook Air M2. I trained on the tiny Shakespeare dataset from Karpathy and prompted "to be, "

    To be, fo hend!
    
    
    
    First her sense ountier to Jupits,
    
    be horse.

Words of wisdom! The model has around 7.5M Params and vocabulary size is 66 (65 chars + \[MASK\]. I definitely did not train long enough, but I ran out of time for this one.

Projects like these help me make sense of big scary words like (discrete) diffusion, encoder, decoder, tokenizer. Maybe this encourages someone :)

Check out the code here if you're interested: [https://github.com/Encrux/simple\_dlm](https://github.com/Encrux/simple_dlm)

Thanks for reading! Be horse.

## Comments

- **Top_Association_3449** (19↑): pretty impressive for few hours training on M2, my old laptop would probably catch fire trying this lol
- **adrianchase_alt** (14↑): Before I actually read the discrete diffusion paper, I thought it was this grandiose discretisation of traditional diffusion with elegant math but no its literally identical to image diffusion by using the vocab distribution as our continuous target. Felt like an idiot not realising in retrospect
  - **Technical-Debate1303** (4↑): It can be pretty grandiose! In the masked diffusion neural sampler they use some pretty hardcore stochastic optimal transport
    - **adrianchase_alt** (3↑): What??? isn't optimal transport of gaussians just a linear interpolation? Thats what made rectified flow so simple. Unless you're talking about non riemannian flow matchign
  - **Encrux615** (3↑): Same lol.

Too often I let myself get scared by these terms that just end up completely chill once you really start sitting down. 

I usually try spinning „feeling like an idiot“ into a positive, because the boost in self-confidence feels pretty good.
    - **adrianchase_alt** (1↑): Haha I agree! A learner's goal is to make past you seem like an idiot 😊 and thats a good thing!
  - **unlikely_ending** (-1↑): Yeah same.
The word diffusion is confusing and unnecessary.
Denoising is the key word.

And at its heart, it's really just a variant on the same theme as all the transformer family, I.e. predict the blanked out token(s).  Admittedly a very clever variation.
    - **adrianchase_alt** (4↑): Um. I think diffusion is fine - it's objectively a langevin sampling process, what's confusing to me is "discrete" - because nothing is discrete, we're just working in probability space. And the transformer family is irrelevant to the training objective - the original diffusers from DDPM and Stable Diffusion 1.5 were U-Nets...
    - **unlikely_ending** (0↑): (I mean, in the case of text)
- **meet_minimalist** (5↑): Hey,
I have trying to learn the fundametals of diffusion language models. Can you share some resources which help me with fundamentals?
  - **namey-name-name** (3↑): I’d recommend just reading the Llada paper https://arxiv.org/pdf/2502.09992

The basic concept is fairly simple. Maybe helps if you ask an LLM to generate pseudo code or a diagram for you.
  - **pitter-patter-rain** (2↑): Following because going through something similar plus I don’t have background in diffusion models either
  - **Encrux615** (3↑): Honestly, mostly the papers I guess?

But there's also a lot of content on YouTube and some blog posts. Sorry I don't have anything more concrete. The basic concept of Discrete Diffusion for text really is not too complicated, though! I highly suggest you to just implement it yourself like I did.
- **SamKhan23** (2↑): I feel similar to how you felt, and was thinking of doing a similar project once this cycle is finally over and I have a break. Can’t wait for next week
- **Fresh-Resolution182** (2↑): "Be horse." is unironically better Shakespeare than half the fine-tuned story models I have tried lmao
- **DigThatData** (1↑): try training an adapter to retrofit a pre-trained autoregressive foundation model for diffusion sampling
  - **Encrux615** (1↑): Interesting idea, I’ll look into it when I have the time.
- **Worried-Squirrel2023** (1↑): this is the kind of project that builds real intuition. once you've implemented one from scratch the failure modes of the production diffusion LMs make a lot more sense. would be curious to see how it scales from tiny shakespeare to something with proper vocab size, the noise schedule sensitivity changes a lot at scale.
  - **Encrux615** (1↑): Thank you for the kind words!

If you got the compute, knock yourself out! 

I made sure the code is easy to reproduce. The hardest part is getting a text document large enough.
- **hl_lost** (1↑): "be horse" goes hard tbh

cool project though. building stuff from scratch is still the best way to actually learn whats going on under the hood. i did something similar with a basic transformer a while back and it clicked way more than reading papers ever did
- **AI_Conductor** (1↑): Nice work. The thing that surprises most people who do this is that the architecture is the easy part, the infrastructure to actually train and evaluate it is what takes 90 percent of the time. Curious what your hardest debugging session was, because the war story is usually more useful to readers than the architecture summary.
  - **Encrux615** (1↑): Really the most frustrating part is wrangling data types and dimensions. I did implement backprop in the past so I kinda knew what I was getting into, but it’s annoying still.

Also implementing batching is annoying AF. You just implemented all the logic and now you gotta touch every single thing again without breaking it just so you can do some actual training.
