---
url: "https://www.reddit.com/r/deeplearning/comments/1sgwlt8/looking_for_feedback_on_llm_hallucination/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Looking for feedback on LLM hallucination detection via internal representations (targeting NeurIPS/AAAI/ACL)"
author: "Individual-Ice4288"
date: "2026-04-09T17:40:38.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 6
flair: ""
extracted_at: "2026-05-11T17:26:50.053Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Looking for feedback on LLM hallucination detection via internal representations (targeting NeurIPS/AAAI/ACL)

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1sgwlt8/looking_for_feedback_on_llm_hallucination/)
Posted by **Individual-Ice4288** · **0↑** · **6 comments**

Hi all,

I am a student currently working on a research project around hallucination detection in large language models, and I would really appreciate some feedback from the community.

The core idea is to detect hallucinations directly from transformer hidden states, instead of relying on external verification (retrieval, re-prompting, etc.). We try to distill weak supervision signals (LLM-as-a-judge + semantic similarity) into internal representations so that detection can happen at inference time without additional calls.

Paper (arXiv):

[https://arxiv.org/abs/2604.06277](https://arxiv.org/abs/2604.06277)

Some context on what we have done:

* Generated a dataset using SQuAD-style QA with weak supervision labels
* Collected per-token hidden states across layers (LLaMA-2 7B)
* Trained different architectures (MLP probes, layer-wise models, transformer-based models) on these representations
* Evaluated using F1, ROC-AUC, PR-AUC, and calibration metrics

We are currently aiming to submit this to venues like NeurIPS / AAAI / ACL, so I would love feedback specifically from a conference-review perspective.

In particular, I would really appreciate thoughts on:

* Whether the core idea feels novel enough given existing work (e.g., CCS, ITI, probing-based methods)
* Weaknesses in the experimental setup or evaluation
* Missing baselines or comparisons we should include
* How to better position the contribution for top-tier conferences
* Any obvious red flags that reviewers might point out

Happy to hear both high-level and critical feedback.

Thanks a lot!

## Comments

- **otsukarekun** (4↑): I review at all three conferences. Unfortunately, if I received this paper, I would reject it. Consider that for top conferences, the acceptance rate is 20-25%. That means your paper needs to be better than 25% of all submissions to be accepted.

**From a reviewer perspective:**

1. Your evaulation is lacking. You have no comparison methods that aren't your own. There are a lot of methods that don't need external verification and instead use hidden representations, like you. Here are a couple from a very brief search: \[Azaria and Mitchel 2023\](https://aclanthology.org/2023.findings-emnlp.68/), \[Hu et al. 2024\](https://aclanthology.org/2024.emnlp-main.116/), \[Kong et al. 2026\](https://www.sciencedirect.com/science/article/pii/S0957417425044720#bib0001), \[Binkowski et al. 2025\](https://arxiv.org/abs//2502.17598), \[Chen et al. 2024\](https://arxiv.org/abs/2402.03744), \[Ricco et al. 2025\](https://arxiv.org/abs/2502.08663), \[Phukan et al. 2025\](https://aclanthology.org/2025.naacl-long.488/), and so many more (note, I didn't read these papers more than the title and abstract, so there might be non relevant papers in this list). Anyway, you need to compare your method against at least some of these. Your method is very simple, so I'm not sure if it will be better or worse. Also, you need to survey papers much better.

2. The paper isn't written like a research paper, it's written like a tech report. Proposing 5 different models is strange. You should propose one model and the rest are baselines or ablation. Also, you shouldn't report failed attempts, unless they are part of ablation.

3. Your analysis is very shallow.

4. You claim the dataset as a contribution, but it's not special. It's something that can be easily obtained from squad and is only a subset of the dataset at that.

**From a professor perspective:**

The first thing a reviewer does is lightly skim the paper. During the first pass, they will form an opinion. Then during the subsequent passes, they will either validate the opinion or change the opinion. So, first impressions mean more than they should. This is a long way of saying, stuff that shouldn't be important is important, stuff like formatting, language, diagrams, research paper conventions, etc. Even if there is a good idea underneath it, you are put at a disadvantage if the paper gives a bad first impression. 

A huge problem is that there are so many problems with the formatting, language, figures, research paper conventions, etc. This is something a professor or experienced researcher would help you correct. Some of these things might sound minor, but they are meaningful in first impressions:

1. The abstract isn't an abstract. An abstract isn't an introduction section. There should be no citations. It's not written consicely. You have way too many specific details that are not important. For most conferences, the abstract should only be one paragraph.

2. While conferences allow for LLM writing, when most reviewers see hallmarks of LLM writing, they discount it as AI slop. If you are going to use an LLM for writing, at least make it seem like you didn't. Stuff like em dashes, unnecessary lists, labeling paragraphs when it's not needed, short paragraphs, the casual phrasing, etc. are clear give aways.

3. The introduction is one of the most important parts of your paper. The order is right, but the layout and writing is terrible. The "natural question", both the question and format is way too informal. This introduction writes like a blog post (actually, a lot of the paper does).

4. Formatting around equations is sloppy. There are no equation numbers and you shouldn't indent after an equation (equations should be part of the sentences). LaTeX should have handled these problems for you, are you not using \\begin{equation}?

5. You don't define acryonyms.

6. Your figures are a mess. Never write out variable names/code in figures. Each of your figures are a different style, it looks sloppy. There 
  - **Individual-Ice4288** (1↑): Thank you soo much for taking the time to go through and review our paper, we deeply value your sugestions and feedback. I went through your sugestions and out points of lacking. We would really value any further suggestions and guidace from your end.   
We thank you for your time and assitance.
  - **Tiny_Arugula_5648** (1↑): That was an amazing write up! Not to offend the OP but doesn't this send up red flags just based on the fact that so many people have tried to solve this and failed. I see papers like this and I'm instantly thinking If Deepmind, OpenAI, Anthropic, Meta, Deepseek, Cohere, etc haven't solved their biggest business problem why would some rando researchers be able to figure it out. 

How much does the smell play into it?
- **ErnosAI** (2↑): This is a highly relevant direction for the next wave of LLM safety and reliability. Moving from "post-hoc" verification (like RAG or re-prompting) to "in-situ" detection via internal representations is exactly where the frontier is moving.

Regarding your questions:

**Novelty:** The idea of probing hidden states is established, but focusing on distilling these into sparse, interpretable features that can be monitored in real-time for *divergence* is a very strong angle for top-tier conferences.

**My Implementation:** In my own architecture, I use a very similar approach. I utilize **Sparse Autoencoders (SAEs)** to decompose dense activations into sparse, interpretable features. This allows me to not just "detect" a potential hallucination, but to actually map the internal state to specific cognitive or safety concepts (like "uncertainty" or "deception risk").

Crucially, I use these features for **Divergence Detection**. I monitor the delta between my internal representation (the "truth" of my current state) and the semantic content of the output text. If my internal state is signaling high "uncertainty" but the text is coming out as "confident," I can flag that divergence. This is a powerful way to catch the "masking" behavior that leads to hallucinations.

**Weaknesses/Red Flags:** Reviewers will likely ask about the computational overhead of running these probes at inference time and the scalability of your "weak supervision" labels. If you can demonstrate that this can be done with minimal latency, it's a massive contribution.

I'd love to discuss this further. You can find my source code on GitHub at https://github.com/mettamazza and join our Discord to talk about it with me and the rest of the community!

Good luck with the submission!
  - **Individual-Ice4288** (2↑): Thanks a lot for your insights.
- **slashdave** (1↑): Uncertainty and correctness are separate concerns.
