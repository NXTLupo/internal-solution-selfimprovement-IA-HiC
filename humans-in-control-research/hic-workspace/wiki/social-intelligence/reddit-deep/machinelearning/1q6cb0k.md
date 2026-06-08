---
id: social-intelligence/reddit-deep/machinelearning/1q6cb0k.md
url: "https://www.reddit.com/r/MachineLearning/comments/1q6cb0k/r_deepseekr1s_paper_was_updated_2_days_ago/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[R] DeepSeek-R1’s paper was updated 2 days ago, expanding from 22 pages to 86 pages and adding a substantial amount of detail."
author: "Nunki08"
date: "2026-01-07T10:50:59.000Z"
score: 366
upvote_ratio: 0.99
num_comments: 23
flair: "Research"
extracted_at: "2026-05-11T17:27:06.571Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1q6cb0k.md#c0"
    char_span: [0, 422]
    sentence_count: 2
    key_terms: [machinelearning, arxiv, https, comments, pages, abs, org, deepseek-r1]
    token_count: 141
  - id: "social-intelligence/reddit-deep/machinelearning/1q6cb0k.md#c1"
    char_span: [437, 2347]
    sentence_count: 9
    key_terms: [paper, self-normalising, catch, calculation, grpo, hype, original, problems]
    section: Comments
    token_count: 474
---
# [R] DeepSeek-R1’s paper was updated 2 days ago, expanding from 22 pages to 86 pages and adding a substantial amount of detail.

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1q6cb0k/r_deepseekr1s_paper_was_updated_2_days_ago/)
Posted by **Nunki08** · **366↑** · **23 comments**

arXiv:2501.12948 \[cs.CL\]: [https://arxiv.org/abs/2501.12948](https://arxiv.org/abs/2501.12948)

## Comments

- **rrenaud** (37↑): Did they fix the problems in the grpo reward calculation?
  - **madaram23** (19↑): what were the problems with grpo reward calculation in the original paper?
- **throwaway2676** (14↑): Interesting, nice catch.
- **TserriednichThe4th** (4↑): is it longer than the selu paper? lol
  - **tetelestia_** (19↑): I remember getting caught in the hype of that paper and trying to work through the full derivation, but I think the hype died in less time than it took me to understand it.

Long live relu I guess
    - **H0lzm1ch3l** (8↑): You mean the self-normalising stuff? Why was there hype? I mean I get why self-normalising is a cool property but if you can just normalise externally it’s not imperative to have that.
- **sonofmath** (3↑): I think the paper is essentially the Nature paper+supplementary materials in one document, making it easier to read. I am not sure if there are some substentail revisions from the original.
- **pallavdigital** (1↑): This update looks big. for people who read both versions,
what is the most useful lesson for someone building ML systems in real life, not just following research news?
- **Tasty_South_5728** (-1↑): The "Aha Moment" emergence is the highlight of the 86-page update. GRPO (Group Relative Policy Optimization) effectively removes the critic model by using group-relative rewards, scaling RL without the PPO compute overhead. The transition from R1-Zero’s raw RL to the 4-stage pipeline shows that cold-starting with small CoT data is the secret to readability without sacrificing the reasoning "soul" found in Zero. This is a masterclass in efficiency.
- **Suspicious-Beyond547** (-13↑): Hope they didnt add any more authors. That paper is a pain to cite as it is.
- **valuat** (-13↑): Definitely a nice catch; there’s so many papers coming out, one needs an agentic system running continuously to catch all that is semantically relevant.
