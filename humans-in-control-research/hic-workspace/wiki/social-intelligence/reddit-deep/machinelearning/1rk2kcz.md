---
id: social-intelligence/reddit-deep/machinelearning/1rk2kcz.md
url: "https://www.reddit.com/r/MachineLearning/comments/1rk2kcz/p_i_trained_qwen2515b_with_rlvr_grpo_vs_sft_and/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[P] I trained Qwen2.5-1.5b with RLVR (GRPO) vs SFT and compared benchmark performance"
author: "jayminban"
date: "2026-03-03T21:44:35.000Z"
score: 25
upvote_ratio: 0.86
num_comments: 13
flair: "Project"
extracted_at: "2026-05-11T17:27:06.578Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1rk2kcz.md#c0"
    char_span: [0, 1883]
    sentence_count: 18
    key_terms: [training, rlvr, sft, reasoning, performance, gsm8k, data, machinelearning]
    token_count: 424
  - id: "social-intelligence/reddit-deep/machinelearning/1rk2kcz.md#c1"
    char_span: [1885, 2900]
    sentence_count: 2
    key_terms: [rlvr-vs-sft-qwen2, rtx, jayminban, gsm8k, checkpoints, https, grpo, project]
    token_count: 388
  - id: "social-intelligence/reddit-deep/machinelearning/1rk2kcz.md#c2"
    char_span: [2915, 5239]
    sentence_count: 10
    key_terms: [entropy, runs, bonus, model, did, training, curious, dataset]
    section: Comments
    token_count: 469
  - id: "social-intelligence/reddit-deep/machinelearning/1rk2kcz.md#c3"
    char_span: [5241, 7648]
    sentence_count: 13
    key_terms: [sft, model, reasoning, rlvr, different, patterns, scales, improvement]
    section: Comments
    token_count: 502
---
# [P] I trained Qwen2.5-1.5b with RLVR (GRPO) vs SFT and compared benchmark performance

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1rk2kcz/p_i_trained_qwen2515b_with_rlvr_grpo_vs_sft_and/)
Posted by **jayminban** · **25↑** · **13 comments**

Hello everyone. I trained Qwen2.5-1.5B-Instruct with RLVR and SFT on the GSM8K dataset. RLVR boosted math reasoning by +11.9 points. SFT degraded it by -15.2.

SFT (Supervised Fine-tuning): Standard next-token prediction training on labeled data.

RLVR (Reinforcement Learning with Verifiable Rewards): The training approach behind DeepSeek-R1. The model is reinforced to produce responses that earn higher rewards from a verifiable signal (e.g., correct math answers). This is what enabled models to generate their own chain-of-thought reasoning and led to dramatic improvements in reasoning and agentic tasks.

I ran three experiments:

1. RLVR vs SFT on GSM8K train split: Standard training and comparison.
2. Cheating analysis: Training directly on the GSM8K test set to measure data contamination effects.
3. One-example RLVR: RLVR training with only a single example from two different data sources.

Results:

RLVR training significantly improves GSM8K performance while also improving unrelated MATH scores, suggesting general reasoning improvement, even when training with only one example.

SFT degrades performance significantly on both benchmarks regardless of train or test data. SFT appears to override the model's pretrained knowledge, making it mimic surface patterns without actually improving reasoning ability. Notably, SFT does reduce the no-answer rate, meaning the model learns to produce answers in the expected format, but the answers themselves are less accurate.

See the training progression plots and results table above.

GPU whirring that went into this project:

|Experiment|GPUs|Duration|Epochs|
|:-|:-|:-|:-|
|GRPO GSM8K Train|6× RTX 4090|32h 12m|13|
|GRPO GSM8K Test|8× RTX 3090|20h 09m|30|
|GRPO GSM8K 1-Example|8× RTX 3090|11h 16m|\-|
|GRPO DSR 1-Example|8× RTX 3090|12h 43m|\-|
|SFT GSM8K Train|1× RTX 5090|2h 46m|7|
|SFT GSM8K Test|1× RTX 5090|1h 06m|15|
|Benchmarking 388 Checkpoints|1× RTX 5090|17h 41m|\-|

388 checkpoints were benchmarked for this project. Every prompt, model response, and extracted answer across all benchmarks is logged in a SQLite database, over 2.4 million rows, viewable live on Hugging Face Spaces via Datasette!

[https://huggingface.co/spaces/jayminban/RLVR-vs-SFT-Qwen2.5-1.5b](https://huggingface.co/spaces/jayminban/RLVR-vs-SFT-Qwen2.5-1.5b)

For detailed analysis, all plots, training code, data, checkpoints, and more, check out the full project on GitHub.

[https://github.com/jayminban/RLVR-vs-SFT-Qwen2.5-1.5b](https://github.com/jayminban/RLVR-vs-SFT-Qwen2.5-1.5b)

Any feedback or ideas for my next project are greatly appreciated!

## Comments

- **BP041** (4↑): the SFT degradation result isn't surprising but it's good to see it quantified so cleanly. SFT on narrow task data tends to override the pretrained knowledge distribution -- the model learns to pattern-match the output format rather than actually reasoning.

the interesting part for me is the RLVR generalization to MATH scores. that suggests GRPO is training something more fundamental than GSM8K task memorization.

curious if you tracked policy entropy during the GRPO runs. in our experience with RL-based fine-tuning, entropy collapse is one of the main failure modes -- the model starts converging on near-identical chain-of-thought patterns. did you see that in the 1-example runs, or did entropy stay healthy throughout?
  - **jayminban** (0↑): Entropy stayed healthy overall. The full dataset runs show gradual decline without collapse, and both 1-example runs actually show some mid-training entropy recovery. I added an entropy bonus along with KL loss to the GRPO training, which likely helped keep things stable. The entropy plots are on the GitHub repo if you're curious.

I did check model responses throughout training. The CoT patterns look similar across checkpoints but differ slightly. Any advice on how to systematically measure this? I've been reading through responses manually but wondering if there's a better approach.
    - **BP041** (2↑): entropy bonus + KL in combination makes sense — KL stops it drifting too far from reference while entropy bonus keeps exploration live.

the mid-training recovery on 1-example runs is the interesting part. my guess is the entropy bonus kicks in harder when the model has less data to overfit on, so you get a natural correction. full dataset runs have more gradient signal competing against it.

did you tune the entropy coefficient separately per run or keep it fixed? curious whether it needed calibration against the reward scale, or whether a fixed value held up across both dataset sizes.
    - **BP041** (2↑): For systematic CoT measurement, embedding-based approaches tend to work better than manual review at scale. Embed the full reasoning chain from each checkpoint (just the CoT, not the final answer), cluster them, and track centroid drift across checkpoints — a cluster shift usually shows up before accuracy differences do.

If you want something lighter: extract structural features instead — step count, presence of self-correction phrases ('wait', 'let me recalculate'), ratio of verification steps to generation steps. Those three distributions tell you whether the model learned genuinely different reasoning patterns or just the same pattern with better final answers.

Have you seen mean reward per step change much across checkpoints, or is the improvement concentrated in the final token?
- **Alternative_Set_8364** (2↑): Looking good question what is the idea about RL outperforming SFT, what about small LORA's with freezing weights over finetuning whole model on small dataset or is there some intuition why not to do it like that?
  - **jayminban** (1↑): I think this result shows the different aspects of two different training methods, SFT and RLVR. SFT seems like an appropriate method for injecting knowledge that the model didn't have. RLVR seems like the right method for improving the model's ability to utilize that knowledge! I used full finetuning instead of LoRA to try altering all parameters.
- **ProfessionalLaugh354** (1↑): interesting comparison but i'd be careful drawing conclusions from a 1.5b model. GRPO tends to show much bigger gains at larger scales where the policy has enough capacity to actually shift its reasoning strategy. at 1.5b you're mostly just reshuffling surface patterns, so SFT can look deceptively competitive.
- **Successful_Plant2759** (0↑): The SFT degradation finding is really interesting and aligns with what the DeepSeek R1 paper hinted at. SFT essentially teaches the model to \*imitate\* the format of correct answers without developing the underlying reasoning capability. It memorizes surface patterns rather than learning to actually think through the problem.

The one-example RLVR result is particularly striking. The fact that a single verifiable example is enough to unlock generalized reasoning improvement suggests the model already has latent capabilities—RLVR just teaches it to \*use\* them through the reward signal, while SFT actively suppresses them by overwriting with pattern matching.

Would be curious to see how this scales—does the gap between RLVR and SFT widen or narrow as you go from 1.5B to 7B to 32B? My intuition says the gap narrows at larger scales since bigger models have more robust representations that are harder to overwrite with SFT.
