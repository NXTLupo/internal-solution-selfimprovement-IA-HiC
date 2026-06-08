---
id: social-intelligence/reddit-deep/deeplearning/1t0rdri.md
url: "https://www.reddit.com/r/deeplearning/comments/1t0rdri/i_have_been_finetuning_llama_31_8b_with_qlora_for/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "I have been fine-tuning llama 3.1 8b with QLoRA for a classification task in my thesis (nothing exotic, rank 16, unsloth, standard stuff)"
author: "Kortopi-98"
date: "2026-05-01T12:00:00.000Z"
score: 45
upvote_ratio: 0.97
num_comments: 9
flair: ""
extracted_at: "2026-05-11T17:26:50.046Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, higher_ed]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1t0rdri.md#c0"
    char_span: [0, 1595]
    sentence_count: 9
    key_terms: [synthetic, like, learning, classification, deeplearning, data, genuinley, comments]
    token_count: 387
  - id: "social-intelligence/reddit-deep/deeplearning/1t0rdri.md#c1"
    char_span: [1610, 3917]
    sentence_count: 7
    key_terms: [synthetic, data, model, honestly, right, like, real, different]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/deeplearning/1t0rdri.md#c2"
    char_span: [3611, 4262]
    sentence_count: 5
    key_terms: [synthetic, data, real, model, classification, distributions, stylistically, fine-tuning]
    section: Comments
    token_count: 133
---
# I have been fine-tuning llama 3.1 8b with QLoRA for a classification task in my thesis (nothing exotic, rank 16, unsloth, standard stuff)

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1t0rdri/i_have_been_finetuning_llama_31_8b_with_qlora_for/)
Posted by **Kortopi-98** · **45↑** · **9 comments**

I spent like 2 weeks building a synthetic dataset using an LLM api. 5k examples, carefully prompted, checked a random sample manually and it looked clean. trained on it, eval results were mid. not terrible but not where i needed them to be.

My advisor was like just try the 200 examples we annotated by hand and see what happens. I thought there was no way 200 would beat 5k but sure whatever lets waste 40 minutes 🙄 I ran it on a 5090 I rented on hyperai cause our lab cluster was booked as usual.

The 200 hand-labeled ones outperformed the 5k synthetic set by a pretty embarrassing margin. I genuinley sat there staring at the eval output for a minute like... what.

After some digging I think what happend is the synthetic data had these subtle formatting patterns that the model was latching onto instead of learning the actual task. like it wasnt learning my classification labels it was learning the LLMs writing quirks lol. As soon as I mixed like 1k synthetic with the 200 real ones things improved even more which kinda confirmed the synthetic data wasnt garbage, just not good enough on its own.

Most tutorials out there still tell people to just generate more data when results are bad. IMO, for domain stuff thats genuinley terrible advice 😬

## Comments

- **FitSurround1082** (7↑): The synthetic data style leaking thing is way more common than people realize. Had almost the same thing happen on a completely different task, took me forever to figure out what was going wrong.
- **ssupchi** (5↑): For the ratio honestly i just start with only real data and add synthetic in increments until eval stops improving. No formula, just patience. It is annoying but it works.
- **BlueDolphinCute** (3↑): i had something similar where my synthetic data kept using phrases like "based on the context" and "it can be inferred that" because thats just how the generator talked. model basically learned to classify based on whether something sounded like chatgpt wrote it but the mixing approach is honestly the move though.
- **CalligrapherCold364** (2↑): the formatting artifact thing is such a sneaky failure mode, the model learns the shape of the data not the task nd eval looks fine until u actually stress test it. the 200 real examples as an anchor nd synthetic on top is probably the move for most domain tasks, ur advisor was right nd honestly that ratio finding is the useful thing to take out of this for ur thesis
- **BackpackingSurfer** (2↑): Haha yes! Interesting side note, Stanford ai index report talks about the “data wall” phase labs are in right now. Massive web scraping only gets you so far, so labs may need data licensing agreement with platforms like Reddit (Gemini has one) and Pinterest (basically a massive intent graph for images). They also discuss about synthetic data, but the risk of course of model poisoning and the “need” for HITL verification.
- **spidermonkey12345** (1↑): Nothing more frustrating than your advisor being right lmao.
- **AcanthocephalaFit766** (1↑): Sloop ad bag 💰
- **ai_without_borders** (1↑): this is shortcut learning basically. model finds low-level features correlated with labels instead of the semantic signal. quick sanity check that catches it before you spend compute: train a logistic regression on embeddings to separate synthetic vs real. if it gets >65% accuracy the distributions are different enough that your main model will probably exploit the same features. takes a few minutes and has saved me from multiple wasted training runs
- **Melodic_Resolve2613** (0↑): Ran into exactly this fine-tuning Llama variants for a domain classification task at work. The synthetic data was technically correct but stylistically uniform  the model just memorized the generation pattern. Mixing even a small real set broke that artifact completely. Your 1k synthetic + 200 real result lines up with what I hve seen. Data diversity > data volume every time.
