---
url: "https://www.reddit.com/r/deeplearning/comments/1sva0b9/qwen_36_27b_vs_qwen_36_35b_a3b_vs_gemma_4_models/"
url_hash: "e32e80cfef"
kind: "article"
source: "Reddit Deep: r/deeplearning"
title: "Qwen 3.6 27B vs Qwen 3.6 35B A3B vs Gemma 4 models Throughput on H100"
author: ""
date: "2026-04-25T11:48:17.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:34:22.583858+00:00"
chars: 2791
---

# Qwen 3.6 27B vs Qwen 3.6 35B A3B vs Gemma 4 models Throughput on H100

Source: [Reddit Deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1sva0b9/qwen_36_27b_vs_qwen_36_35b_a3b_vs_gemma_4_models/)

Ran a vLLM serving benchmark across 8 small and mid-size models on a single H100 80GB. Two patterns came out clearly enough to be worth sharing.



Setup:

\- vLLM 0.19.1, vllm bench serve

\- 100 prompts per run, 128 in / 128 out tokens

\- Concurrency: 1, 4, 8, 16

\- Single run per cell, treat sub-10% gaps as noise



Throughput at c=16 (tok/s):

\- Gemma 4 E2B-it: 3180

\- Gemma 4 E4B-it: 2015

\- Qwen 3.6 35B-A3B-FP8: 1243

\- Gemma 4 26B-A4B-it: 1033

\- Qwen 3.6 35B-A3B: 718

\- Qwen 3.6 27B-FP8: 557

\- Qwen 3.6 27B: 439

\- Gemma 4 31B-it: 226



Pattern 1: MoE/expert architectures dominate dense at matched scale.

\- Gemma E2B (\~2B) hit 14x the throughput of Gemma 31B dense on the same GPU.

\- TTFT under load: 55 ms vs 4.1 seconds.

\- Mechanism: decode is bandwidth-bound at low/moderate batch (\~2 FLOPs/byte vs H100's \~1000 FLOPs/byte needed to saturate compute), so cutting active params per token directly cuts HBM traffic.

\- Scaling efficiency c=1 → c=16: E2B 13.2x, 35B-A3B BF16 only 4.1x. Consistent with the larger MoE saturating bandwidth earlier.



Pattern 2: FP8 lift is much larger on MoE than dense.

\- Qwen 35B-A3B FP8 vs BF16: +73% throughput

\- Qwen 27B dense FP8 vs BF16: +27%

\- The 27% number is what you'd expect from halving weight traffic (not quite 2x because activations and KV cache aren't halved).

\- The +73% on MoE is harder to explain from bandwidth alone. Could be FP8 enabling better expert routing kernels in vLLM, or the BF16 MoE being more severely bandwidth-bound. Curious if anyone has profiling data.



Open questions:

\- Does the MoE FP8 advantage hold at longer contexts where attention starts dominating compute?

\- Does the same pattern extrapolate to 100B+ MoEs?



Disclosure: The complete experimentation setup, evaluation and analysis was performed end to end by Neo AI Engineer based on my initial task prompt and then I also evaluated it manually.

--- TOP COMMENTS ---
[1↑ randoomkiller] I might be dumb but the c=16 (tok/s) means that you are setting a constant token per sec speed? Then what are the numbers afterwards? Like does the Gemma4-26B-4A achieves 16 or 1033 token per second?
[1↑ vasco_pm] I think c stands for concurrent users.
So c=16 means these are the output speeds with 16 users at the same time.
[1↑ FortiTree] Your test result is makes sense at raw numbers but the 128 token in/out is not realistic. In real agentic flow, prompt processing token will dominate and skew the whole thing up, especially with concurrent requests and prefilled cache hit.

I'd run another tests with context size 32K, 64K, 128K and 200K with various prefilled prompt 20%, 50%, 90% to see how they fair. Throughput numbers would drop significantly.

Prompt cache hit will also make or break your speed/throughput
