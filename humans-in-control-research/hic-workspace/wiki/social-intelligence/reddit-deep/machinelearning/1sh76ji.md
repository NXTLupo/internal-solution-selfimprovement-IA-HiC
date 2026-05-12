---
url: "https://www.reddit.com/r/MachineLearning/comments/1sh76ji/started_a_video_series_on_building_an/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "Started a video series on building an orchestration layer for LLM post-training [P]"
author: "ReinforcedKnowledge"
date: "2026-04-10T00:24:33.000Z"
score: 4
upvote_ratio: 0.75
num_comments: 2
flair: "Project"
extracted_at: "2026-05-11T17:27:06.581Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Started a video series on building an orchestration layer for LLM post-training [P]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1sh76ji/started_a_video_series_on_building_an/)
Posted by **ReinforcedKnowledge** · **4↑** · **2 comments**

Hi everyone!

Context, motivation, a lot of yapping, feel free to skip to TL;DR.

A while back I posted here asking [\[D\] What framework do you use for RL post-training at scale?](https://www.reddit.com/r/MachineLearning/comments/1qrer61/d_what_framework_do_you_use_for_rl_posttraining/). Since then I've been working with [verl](https://github.com/verl-project/verl.git), both professionally and on my own time. 

At first I wasn't trying to build anything new. I mostly wanted to understand veRL properly and have a better experience working with it. I started by updating its packaging to be more modern, use \`pyproject.toml\`, easily installable, remove unused dependencies, find a proper compatibility matrix especially since vllm and sglang sometimes conflict, remove transitive dependencies that were in the different requirements files etc. Then, I wanted to remove all the code I didn't care about from the codebase, everything related to HF/Nvidia related stuff (transformers for rollout, trl code, trtllm for rollout, megatron etc.), just because either they were inefficient or I didn't understand and not interested in. But I needed a way to confirm that what I'm doing was correct, and their testing is not properly done, so many bash files instead of pytest files, and I needed to separate tests that can run on CPU and that I can directly run of my laptop with tests that need GPU, then wrote a scheduler to maximize the utilization of "my" GPUs (well, on providers), and turned the bash tests into proper test files, had to make fixtures and handle Ray cleanup so that no context spills between tests etc.

But, as I worked on it, I found more issues with it and wanted it to be better, until, it got to me that, the core of verl is its orchestration layer and single-controller pattern. And, imho, it's badly written, a lot of metaprogramming (nothing against it, but I don't think it was handled well), indirection and magic that made it difficult to trace what was actually happening. And, especially in a distributed framework, I think you would like a lot of immutability and clarity. 

So, I thought, let me refactor their orchestration layer. But I needed a clear mental model, like some kind of draft where I try to fix what was bothering me and iteratively make it better, and that's how I came to have a self-contained module for orchestration for LLM post-training workloads. But when I finished, I noticed my fork of verl was about 300 commits behind or more 💀

And on top of that, I noticed that people didn't care, they didn't even care about what framework they used let alone whether some parts of it were good or not, and let alone the orchestration layer. At the end of the day, these frameworks are targeted towards ML researchers and they care more about the correctness of the algos, maybe some will care about GPU utilization and whether they have good MFU or something, but those are rarer. And, I noticed that people just pointed out claude code or codex with the latest model and highest effort to a framework and asked it to make their experiment work. And, I don't blame them or anything, it's just that, those realizations made me think, what am I doing here? hahaha

And I remembered that u/[dhruvnigam93](https://www.reddit.com/user/dhruvnigam93/) suggested to me to document my journey through this, and I was thinking, ok maybe this can be worth it if I write a blog post about it, but how do I write a blog post about work that is mainly code, how do I explain the issues? But it stays abstract, you have to run code to show what works, what doesn't, what edge cases are hard to tackle etc. I was thinking, how do I take everything that went through my mind in making my codebase and why, into a blog post. Especially since I'm not used to writing blog post, I mean, I do a little bit but I do it mostly for myself and the writing is trash 😭

So I thought, maybe putting this into videos will be interesting. And also, it'll allow me to go through my codebase again and rethink it, and it does work hahaha as I was trying to make the next video a question came to my mind, how do I dispatch or split a batch of data across different DP shards in the most efficient way, not a simple split across the batch dimension because you might have a DP shard that has long sequences while other has small ones, so it has to take account sequence length. And I don't know why I didn't think about this initially so I'm trying to implement that, fortunately I tried to do a good job initially, especially in terms of where I place boundaries with respect to different systems in the codebase in such a way that modifying it is more or less easy. Anyways.

The first two videos are up, I named the first one "[The Orchestration Problem in RL Post-Training](https://youtu.be/lRlp_sun4vI?si=IrHNOKwxZvWPIjcs)" and it's conceptual. I walk through the PPO pipeline, map the model roles to hardware, and explain the single-controller pattern. The second one I named "[Ray Basics, Workers, and GPU Placement](https://youtu.be/S0o8dIyDtyc?si=C05AfFDZ4HqEPAA1)". This one is hands-on. I start from basic Ray tasks / actors, then build the worker layer: worker identity, mesh registry, and placement groups for guaranteed co-location.

What I'm working on next is the dispatch layer: what the atomic unit of dispatch should be, how to make it token-aware, how to split work across DP shards, what canonical result format workers should return even if they use different local execution strategies, and how the driver merges that back into a clean representation. Most of it is done, but it was the token-aware part that only came to my mind when making the second video and forced me to rethink some parts (mainly some baked in assumptions in how I collect data from worker groups).

That's all the context or motivation of why I started the series. Quick notes, the "codebase" I mentioned, [avrid](https://github.com/ReinforcedKnowledge/avrid), well, I'll try and publish it on PyPI at the end of the series because it's more a module, has almost nothing in it currently, it's just three dataclasses at most because I want the git history to be faithful to the videos. But if anyone wants to explore it I can invite them to the private repo.

Note: the single-controller pattern is just one pattern among many, I don't have an in-depth knowledge of every post-training codebase out there, and it doesn't even have to be something interesting or elegant, I think [OpenRLHF](https://github.com/openrlhf/openrlhf) and [open-intsruct](https://github.com/allenai/open-instruct) from Ai2 just hand-rolled something to make things work and they ship with it so. I think another codebase that really cares about orchestration is [Monarch](https://github.com/meta-pytorch/monarch) / [torchforge](https://github.com/meta-pytorch/torchforge) that use it but I have no experience with that to comment. 

Also, to be clear, this is not a "verl bad, I fixed it" post. verl solves hard problems, it's efficient, it works, and a lot of people use it successfully, including us. They support NPUs, so many backends, rollout engines, algorithms, they even have nvfp4 qat, it's crazy to be able to ship so fast, they do an AMAZING job, and I have deep respect for them, and it's thanks to them that I learned so much. I'm just trying to have a better implementation of it and learn more, I'm just a random engineer. Also, I do not claim I know everything, I do not claim my implementation will be the best, I'll try and grow this series / codebase into a real production ready codebase for post-training LLMs, and maybe someday compete with all the others, I do like a lot these kind of questions, like when and why is your infra sitting idle, what you can do about it, how to reduce bubbles etc., so I'll continue exploring them. But, yeah I'm just a random engineer, if you have any critique, any better ideas, anything that can help me grow and learn more and become better, I'm all ears!

Final note: I'll not post about every video I upload obviously so not to spam the sub, I'll do that on my Reddit account. 

Final final note (I swear): I should not have ads on the videos, I guess, let me know if it's not the case, I just connected with my google account and uploaded the videos so I think it's good. And please, if you decide to watch, watch with x2 hahaha

**TL;DR:**

I’ve been working a lot with verl and, while trying to understand it better, I ended up focusing on its orchestration layer, especially the single-controller pattern. I like the pattern a lot, but I found the implementation too hard to reason about, so I started rebuilding that part in a cleaner, more explicit way as a learning project. That turned into a video series: the [first video](https://www.youtube.com/watch?v=lRlp_sun4vI) explains the orchestration problem in RL post-training conceptually, the [second](https://www.youtube.com/watch?v=S0o8dIyDtyc) starts building the worker layer with Ray, and the next one will be about dispatching work efficiently across DP shards. I’m sharing this mainly for people interested in RL post-training infra / orchestration, and I’d really appreciate feedback from anyone who has worked on similar systems.

## Comments

- **dhruvnigam93** (2↑): Excellent work, I cant wait to go through this!
  - **ReinforcedKnowledge** (1↑): Thanks!
