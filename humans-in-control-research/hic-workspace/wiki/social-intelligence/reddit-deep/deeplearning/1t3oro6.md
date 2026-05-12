---
url: "https://www.reddit.com/r/deeplearning/comments/1t3oro6/can_synthetic_pretraining_improve_reasoning_in/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Can synthetic pretraining improve reasoning in very small (<1B) models? Yes."
author: "m_sap"
date: "2026-05-04T17:37:45.000Z"
score: 13
upvote_ratio: 0.85
num_comments: 2
flair: ""
extracted_at: "2026-05-11T17:26:50.051Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Can synthetic pretraining improve reasoning in very small (<1B) models? Yes.

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1t3oro6/can_synthetic_pretraining_improve_reasoning_in/)
Posted by **m_sap** · **13↑** · **2 comments**

We trained a 0.8B model on math data, then repeated the same run with synthetically rewritten versions of that data. The generator is also a 0.8B model, with no thinking mode.

Three rewriting styles, all with the same idea: make the training text more explicit, more step-by-step, and easier to learn from.

What we found:

\- All three variants beat the baseline on GSM8K and MATH500

\- Few-shot gains are 2–3× larger — the model gets meaningfully better at using examples in context

\- Synthetic models reach the same performance as the baseline using 3–6× fewer training tokens

Two things that surprised us:

\- You don't need a bigger generator. A same-size non-thinking model is enough.

\- The source data doesn't need to be noisy. We saw strong gains on an already heavily curated corpus.



Still an open question: how much of this is genuine reasoning improvement vs. distilling the teacher? We discuss it at the end. Would love to hear what people think.

X [https://x.com/matteosaponati/status/2048691691171786990?s=20](https://x.com/matteosaponati/status/2048691691171786990?s=20)  
📄 [https://tufalabs.ai/research/enhancing-reasoning-small-language-models/](https://tufalabs.ai/research/enhancing-reasoning-small-language-models/)

## Comments

- **Massive_Connection42** (2↑): AI slop
  - **m_sap** (0↑): why do you say so?
