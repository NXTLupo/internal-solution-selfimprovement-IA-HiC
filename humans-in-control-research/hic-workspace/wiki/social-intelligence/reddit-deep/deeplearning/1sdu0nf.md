---
url: "https://www.reddit.com/r/deeplearning/comments/1sdu0nf/we_just_released_nandimini150m_a_150m_model_with/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "We just released Nandi-Mini-150M — a 150M model with factorized embeddings and layer sharing (no benchmaxing)"
author: "Nice-Resolution2620"
date: "2026-04-06T09:28:38.000Z"
score: 19
upvote_ratio: 1
num_comments: 6
flair: ""
extracted_at: "2026-05-11T17:26:50.051Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# We just released Nandi-Mini-150M — a 150M model with factorized embeddings and layer sharing (no benchmaxing)

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1sdu0nf/we_just_released_nandimini150m_a_150m_model_with/)
Posted by **Nice-Resolution2620** · **19↑** · **6 comments**

We’re the team behind Rta AI Labs and we just open-sourced our first small model: Nandi-Mini-150M base.[https://huggingface.co/Rta-AILabs/Nandi-Mini-150M](https://huggingface.co/Rta-AILabs/Nandi-Mini-150M). Instead of starting with an existing architecture, we experimented with a few efficiency-focused tweaks:

* Factorized embeddings to reduce memory footprint
* Layer sharing (16×2 configuration giving us effective 32 layers)

The model was trained from scratch on \~525B tokens covering English and 10 other languages. It currently supports 2k context length. Important note: We haven't applied any benchmaxing trick. This is one of those best fine-tunable model on different downstream tasks. The model card reflects that honestly, we wanted to release the weights and code first so the community can try it out. At only 150M parameters, this is clearly a tiny model aimed at edge devices, on-device inference, or research into efficient small-scale architectures. We don’t expect it to compete with much larger models, but we’re curious to see how these architectural choices perform in real-world usage. We also submitted a PR to Hugging Face Transformers to add support:  
[https://github.com/huggingface/transformers/pull/45101](https://github.com/huggingface/transformers/pull/45101) . Would love to hear community's feedback & suggestions. It would help us a lot as we work on the next versions (we’re planning 500M and 1B models).Happy to answer any questions about the architecture or training setup.Thanks for checking it out!

## Comments

- **meet_minimalist** (5↑): What is factorised embeddings?
- **Intraluminal** (3↑): Having a GGUF version would make it more approachable for more people.
  - **Nice-Resolution2620** (6↑): this is just the base model, thank you for the feedback, we will make gguf for instruct version, which we will open source by end of this week
- **PainterEffective9584** (2↑): Working fine ⛱️
- **resbeefspat** (2↑): curious how the layer sharing holds up after fine-tuning, like does the shared weight scheme cause any gradient interference or does it stay pretty stable across tasks?
