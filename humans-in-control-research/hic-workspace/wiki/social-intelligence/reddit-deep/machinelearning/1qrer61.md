---
id: social-intelligence/reddit-deep/machinelearning/1qrer61.md
url: "https://www.reddit.com/r/MachineLearning/comments/1qrer61/d_what_framework_do_you_use_for_rl_posttraining/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] What framework do you use for RL post-training at scale?"
author: "ReinforcedKnowledge"
date: "2026-01-30T19:06:41.000Z"
score: 35
upvote_ratio: 1
num_comments: 16
flair: "Discussion"
extracted_at: "2026-05-11T17:27:06.578Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c0"
    char_span: [0, 1933]
    sentence_count: 11
    key_terms: ["i'm", function, machinelearning, custom, post-training, framework, comments, support]
    token_count: 454
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c1"
    char_span: [1935, 3948]
    sentence_count: 12
    key_terms: [issues, github, https, com, like, "i'd", "i'm", verl]
    token_count: 489
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c2"
    char_span: [3950, 4409]
    sentence_count: 3
    key_terms: [possible, slime, github, sglang, https, thudm, using, com]
    token_count: 123
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c3"
    char_span: [4423, 6535]
    sentence_count: 14
    key_terms: [framework, verl, training, around, end, trade-off, openrlhf, sharding]
    section: Comments
    token_count: 464
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c4"
    char_span: [6537, 8001]
    sentence_count: 13
    key_terms: [model, please, help, "i'm", used, question, training, improve]
    section: Comments
    token_count: 324
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c5"
    char_span: [8003, 9991]
    sentence_count: 16
    key_terms: [reinforcement-learning-full-pipeline, unsloth, reinforcedknowledge, use, always, calisweetleaf, "don't", simpo]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c6"
    char_span: [9722, 11045]
    sentence_count: 10
    key_terms: [environments, reinforcedknowledge, appreciate, interacts, function, custom, based, fully]
    section: Comments
    token_count: 288
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c7"
    char_span: [11047, 12732]
    sentence_count: 14
    key_terms: [like, "it's", verl, slime, using, frameworks, framework, function]
    section: Comments
    token_count: 389
  - id: "social-intelligence/reddit-deep/machinelearning/1qrer61.md#c8"
    char_span: [12734, 13577]
    sentence_count: 8
    key_terms: [though, thanks, reinforcedknowledge, check, mind, rlyx, try, straightforward]
    section: Comments
    token_count: 195
---
# [D] What framework do you use for RL post-training at scale?

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1qrer61/d_what_framework_do_you_use_for_rl_posttraining/)
Posted by **ReinforcedKnowledge** · **35↑** · **16 comments**

Hi!

I'm sorry if I'm not using the correct tag, I didn't know which one to pick, and I'm sorry if the question is not aligned with the sub's purpose, please let me know if that is the case and feel free to block the post as well.

I'm trying to do some post-training at a somewhat large scale, but I'm struggling with some of the known frameworks out there.

For some context, I'm trying to do RL on function calling. This is more of a long-term research project, and I'd like to have the flexibility of writing my own environments and algorithms or modify the existing ones.

I have a preference for FSDP (and other parallelism paradigms but through Pytorch's \`DeviceMesh\` and custom code if possible) and vLLM but I can adapt if needed. Ideally the framework can just support the "mainstream" models out of the box (Qwen, Mistral etc.) but I don't mind writing support for the model I want to use if needed. Currently I have tried this:

\- [verl](https://github.com/verl-project/verl) (from ByteDance): the latest release is from last month but there are fixes almost every day I think. I did spend quite some time in understanding it and its architecture and it should be pretty good but I wanted to try a small "toyish" setup first with just pattern matching of the function call made by the model on the expected call (so a custom reward function), and with a custom agent loop that does not load all of the dataset's tool but I hit import errors that I had to fix in the repo itself and whatnot and I don't know how much struggle I'll have to go through later on. Which doesn't really bother me but I want to know if there are better alternatives.

\- [torchforge](https://github.com/meta-pytorch/torchforge) (from meta-pytorch): this seems ideal to me but it is very early in development, I had issues just running their tests and I can do a lot of hacky stuff to get my way through but I'd prefer not and I'm not totally sure I have the capability to get my way through everything since they use Monarch instead of Ray and I'm not familiar with it at all.

\- [OpenRLHF](https://github.com/OpenRLHF/OpenRLHF:): I haven't tried it yet, though I'm familiar with Deepspeed, I'm mostly familiar with Pytorch's FSDP and they don't seem to support it yet. But it doesn't bother me, I just haven't had the chance to look at it yet. But they seem to be lightweight, which I like. It is updated less frequently than verl but I think it's still up to date.

\- [trl](https://github.com/huggingface/trl:): I used it for SFT quite a lot so I know it's limitations and I don't think it's the right fit for my use case.

\- I also looked at NVIDIA's [Gym](https://github.com/NVIDIA-NeMo/Gym) and [RL](https://github.com/NVIDIA-NeMo/RL). It seems like Gym is the infra and RL is the algo / optimization, I'd prefer ideally one library that does both, like the others instead of having to do the pipelining myself. And I don't like the fact that you can't just \`uv add\` them or \`pip install\`. Granted I can clone the repos and install them in my codebase as editables, but I haven't tried yet, maybe there will be dependency issues or just CUDA issues, I did struggle a lot in the past with installing NVIDIA repos.

I'd be very grateful if you can share your experience on this. Thanks!

  
EDIT: What I mean by imports issues in verl are imports of deprecated code from transformers even though verl itself relies on recent releases of transformers. So not issues of my code not importing stuff from verl correctly. I also saw some optional dependency group that relies on an old unmaintained package it seems and I'd just like to avoid having to deal with these issues.

EDIT 2 : Z.ai seems to be using https://github.com/THUDM/slime[slime](https://github.com/THUDM/slime) for their GLM models and I haven't looked in-depth into it but it's using Megatron and SGLang from what I see in the README.md and I'm not familiar with them. I'd like to reduce the overhead as much as possible, if possible. I'm sure it's possible to replace SGLang with vLLM without much issues (I think), but I'd prefer it if there are other alternatives.

## Comments

- **AccordingWeight6019** (11↑): In my experience, no framework really disappears once you want both scale and algorithmic flexibility. Most of the mature stacks optimize for a fairly opinionated RLHF loop, and the friction shows up as soon as you step outside that path, like custom rewards or agent loops. Verl and OpenRLHF are probably closest to “researcher friendly,” but you already noticed the trade-off: you pay in paper cuts around dependencies and abstractions that were not designed for your exact setup. One pattern I have seen work is to treat the framework as scaffolding only for rollout, sharding, and logging, and keep the actual RL logic thin and local, even if that means reimplementing parts. FSDP plus vLLM is doable, but you usually end up writing glue code anyway, regardless of which library you start from. At that point, the question becomes whether the framework is saving you time on distributed systems or just constraining how you experiment. For long-term projects, I tend to favor the one that makes it easiest to delete or bypass pieces later, even if the initial setup feels rough.
  - **ReinforcedKnowledge** (3↑): Thanks for your reply! I think what you said is pretty wise, especially about the glue code and no framework really disappearing. At the end of the day you have to choose one end of the trade-off that makes most sense for you I guess. But yeah, I will think about it, thanks! I think the pattern you describe is sound, that's the hardest part, I don't want to deal with distributing, scaling or handling rollout and sharding and all of the headaches that come with that, will just accept whatever the framework provides in that regard.
- **dhruvnigam93** (7↑): I have just started playing around with post training and I reached a very similar conclusion as you. 
verl seems to be mature. OpenRLHF does not seem very active - lots of open issues and no PR recently.

verl uses ray which I think is critical for RL to be able to separate the training from the inference. It also uses vllm. 

I've been playing around with verl to post training a small qwen model.

I will let you know how it goes. Please blog about your journey on your blog! And please let me know if I can help you in any way. I can help you with your project - I'm looking to get hands on experience with post training. I have plenty of access to A100s and am willing to put them to use.
  - **ReinforcedKnowledge** (3↑): Thanks for your comment! Yeah Ray is pretty good and I see it being used a lot for the moment. There is also Monarch, used in TorchForge, but can also be used independently for distributed training, but I'm not really familiar with it and it's also still early development, compared to Ray which is battle tested and has been around for a long time.

And thanks for the idea to document this, I'll try my best at figuring this out for the moment and hopefully it can help us all!

If you have anything you want or can share please don't hesitate, will do the same as soon as I have something running. I was also thinking of starting with a small Qwen model. I started with an instruct model and my question is how much can we improve such a model on agentic while retaining the rest of its capabilities. I don't know if the question is interesting in and of itself but I was hoping that through my exploration and learning I'd nail down how to improve the model to be extremely good on a subset of tools (like just web search or just a company's internal set of tools etc.). I'm interested if you have other ideas or want to collaborate!

I have a bunch of SFT experiments but I don't know if they'll be interesting to anyone 😅
- **m98789** (2↑): Unsloth?
  - **ReinforcedKnowledge** (1↑): Hmmm, I'm not totally sure. I have to say that I'm not familiar with Unsloth, but at the early times of Unsloth I was hearing about many such libraries, like Axolotl etc. I don't know what became of them but I see people on local llama using Unsloth a lot. I don't know why but it has always been in my mind the library for fine-tuning using constrained hardware.
- **daeron-blackFyr** (2↑): I just recently released a multi-method full reinforcement learning pipeline that is dead simple to run, setup involves just editing a yaml file. Id love it if you wanted to check out/use it as Im always looking for feedback.  
[https://github.com/calisweetleaf/Reinforcement-Learning-Full-Pipeline](https://github.com/calisweetleaf/Reinforcement-Learning-Full-Pipeline) is the repo link.I recommend this combination for a stable baseline. To start with sft use Magpie-Align/Magpie-Pro-300K-Filtered. Then for GRPO use AI-MO/NuminaMath-CoT (specifically the 'problem' column) Reward Modeling (RM) & PPO I recommend nvidia/HelpSteer2. For KTO go for ​trl-lib/kto-mix-14k. Finally DPO & SimPO ​Dataset: argilla/distilabel-intel-orca-dpo-pairs for DPO and princeton-nlp/SimPO-UltraFeedback (for SimPO). Not meaning to self promote but I am always looking for feedback and anyone who may use it. Thank you for your time and I hope you check it out. If you have any questions please feel free to message me or reply Id be happy to help.  
The decided pipeline implemented utilizes full implements of SFT,PPO,DPO,GRPO,SimPO, KTO and IPO. The inference optimizer module provides Best-of-N sampling with reranking, Monte Carlo Tree Search (MCTS) for reasoning, Speculative decoding, KV-cache optimization, and Flash Attention 2 integration.
  - **ReinforcedKnowledge** (2↑): Hey! Just going through the codebase quickly doesn't seem to be what I need. I'll give you in a few days a more detailed review about why it's not what I can use, at least not for the moment, and what I think about it and other nitpicks and/or qualities. But, I appreciate the recommendations you make about data etc. I'm not familiar with them honestly but I appreciate you sharing that.
- **[deleted]** (1↑): I think I understand you , but i got confused. Just to clarify, when you say you're doing "RL on function calling," are you aiming for a fully custom environment where the model interacts with tools (e.g. via function call strings) and gets rewarded based on correctness or utility of those calls? Or are you targeting a more narrow band—like pattern matching against an expected API usage without full tool execution?
  - **ReinforcedKnowledge** (1↑): My bad! I should have clarified better. I'm planning on fully custom environments where the model interacts with tools and gets reward based on that. The environments might not necessarily be mine, I might use environments that people have shared before if they exist.

With verl right now I'm just trying pattern matching because it's an "easy" thing to do, using xLAM dataset for prompts, it has a lot of different functions so it won't make sense to implement them all so just doing pattern matching. But this is just to learn the framework and understand how it works, not the end goal. And still I couldn't get it to run yet 😅

Verl, and I think the other frameworks as well, do offer a somewhat good enough abstractions to do all of that, I just feel like they're not mature enough yet. The only issues I encountered right now in verl are importing stuff that is not used anymore by your dependency, dependencies that have not been maintained for a while etc. I don't like to hack my way in a repo and build it as an editable if I can just install the wheel from PyPI directly. But verl does seem like the most mature compared to all of the others. Maybe OpenRLHF as well.

Maybe this makes sense because function calling is only gaining much traction recently and it's heavily tied to the tooling environments and also tied to coding as well in terms, whether as a task or similar infra. And this is like the secret recipe of most big labs, I guess. The latest Meituan paper, the LongCat one, they talk a lot about the data for function calling but it's only ideas and their framework DORA is not open source. I think many other companies are doing the same.

Z.ai seems to be using https://github.com/THUDM/slime[slime](https://github.com/THUDM/slime) for their GLM models but I'd prefer not to get lost in frameworks. It's using Megatron and SGLang and I'm not familiar with them. I'd like to reduce the overhead as much as possible, if possible.

Maybe I should just focus on verl and fork it and try contributing to it.
- **Appropriate_Willow27** (1↑): Try [RLYX](https://github.com/goddoe/RLYX). It’s designed with research workflows in mind. Lightweight, modular, and easy to customize without digging through abstraction layers. The codebase is clean and straightforward, so you can actually understand what’s happening under the hood. If you’re planning to experiment with custom reward functions or modify training loops, it’s much less painful than some of the heavier frameworks.
  - **ReinforcedKnowledge** (2↑): Thanks will check it out! It seems like a hobby project though? I don't mind though if it's well done then that's all it matters. Will check it out though thanks!
    - **Appropriate_Willow27** (2↑): It was recently used in a publication, thus definitely worth a look.
