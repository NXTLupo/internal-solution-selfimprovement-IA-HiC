---
url: "https://www.reddit.com/r/MachineLearning/comments/1sucjwp/new_optimizer_rose_low_vram_easy_to_use_great/"
url_hash: "deba11fb58"
kind: "article"
source: "Reddit Deep: r/machinelearning"
title: "[New Optimizer] 🌹 Rose: low VRAM, easy to use, great results, Apache 2.0 [P]"
author: ""
date: "2026-04-24T11:05:37.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:34:56.275745+00:00"
chars: 11003
---

# [New Optimizer] 🌹 Rose: low VRAM, easy to use, great results, Apache 2.0 [P]

Source: [Reddit Deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1sucjwp/new_optimizer_rose_low_vram_easy_to_use_great/)

Hello, World! I recently released a new PyTorch optimizer I've been researching and developing on my own for the last couple of years. It's named "Rose" in memory of my mother, who loved to hear about my discoveries and progress with AI.

Without going too much into the technical details (which you can read about in the GitHub repo), here are some of its benefits:

- It's stateless, which means it uses less memory than even 8-bit AdamW. If it weren't for temporary working memory, its memory use would be as low as plain vanilla SGD (***without*** momentum).
- Fast convergence, low VRAM, and excellent generalization. Yeah, I know... sounds too good to be true. Try it for yourself and tell me what you think. I'd really love to hear everyone's experiences, good or bad.
- Apache 2.0 license

You can find the code and more information at: https://github.com/MatthewK78/Rose

Benchmarks can sometimes be misleading. For example, sometimes training loss is higher in Rose than in Adam, but validation loss is lower in Rose. The actual output of the trained model is what really matters in the end, and even that can be subjective. I invite you to try it out for yourself and come to your own conclusions. With that said, here are some quick benchmarks.

---

MNIST training, same seed:

[Rose] lr=3e-3, default hyperparameters
```text
Epoch 1: avg loss 0.0516, acc 9827/10000 (98.27%)
Epoch 2: avg loss 0.0372, acc 9874/10000 (98.74%)
Epoch 3: avg loss 0.0415, acc 9870/10000 (98.70%)
Epoch 4: avg loss 0.0433, acc 9876/10000 (98.76%)
Epoch 5: avg loss 0.0475, acc 9884/10000 (98.84%)
Epoch 6: avg loss 0.0449, acc 9892/10000 (98.92%)
Epoch 7: avg loss 0.0481, acc 9907/10000 (99.07%)
Epoch 8: avg loss 0.0544, acc 9918/10000 (99.18%)
Epoch 9: avg loss 0.0605, acc 9901/10000 (99.01%)
Epoch 10: avg loss 0.0668, acc 9904/10000 (99.04%)
Epoch 11: avg loss 0.0566, acc 9934/10000 (99.34%)
Epoch 12: avg loss 0.0581, acc 9929/10000 (99.29%)
Epoch 13: avg loss 0.0723, acc 9919/10000 (99.19%)
Epoch 14: avg loss 0.0845, acc 9925/10000 (99.25%)
Epoch 15: avg loss 0.0690, acc 9931/10000 (99.31%)
```

[AdamW] lr=2.5e-3, default hyperparameters
```text
Epoch 1: avg loss 0.0480, acc 9851/10000 (98.51%)
Epoch 2: avg loss 0.0395, acc 9871/10000 (98.71%)
Epoch 3: avg loss 0.0338, acc 9887/10000 (98.87%)
Epoch 4: avg loss 0.0408, acc 9884/10000 (98.84%)
Epoch 5: avg loss 0.0369, acc 9896/10000 (98.96%)
Epoch 6: avg loss 0.0332, acc 9897/10000 (98.97%)
Epoch 7: avg loss 0.0344, acc 9897/10000 (98.97%)
Epoch 8: avg loss 0.0296, acc 9910/10000 (99.10%)
Epoch 9: avg loss 0.0356, acc 9892/10000 (98.92%)
Epoch 10: avg loss 0.0324, acc 9911/10000 (99.11%)
Epoch 11: avg loss 0.0334, acc 9910/10000 (99.10%)
Epoch 12: avg loss 0.0323, acc 9916/10000 (99.16%)
Epoch 13: avg loss 0.0310, acc 9918/10000 (99.18%)
Epoch 14: avg loss 0.0292, acc 9930/10000 (99.30%)
Epoch 15: avg loss 0.0295, acc 9925/10000 (99.25%)
```

I used a slightly modified version of this: https://github.com/facebookresearch/schedule_free/tree/main/examples/mnist

Highest accuracy scores from 20 MNIST training runs (20 epochs each) with different seeds:

```python
from scipy.stats import mannwhitneyu

rose = [99.34, 99.24, 99.28, 99.28, 99.24, 99.31, 99.24, 99.21, 99.25, 99.33, 99.29, 99.28, 99.27, 99.30, 99.33, 99.26, 99.29, 99.26, 99.32, 99.25]
adamw = [99.3, 99.15, 99.27, 99.2, 99.22, 99.3, 99.22, 99.15, 99.25, 99.29, 99.2, 99.22, 99.3, 99.23, 99.2, 99.25, 99.22, 99.28, 99.32, 99.22]

result = mannwhitneyu(rose, adamw, alternative="greater", method="auto")
print (result.statistic, result.pvalue)
```

Mann-Whitney U result: `292.0` `0.006515916656300127`

---

Memory overhead (optimizer state relative to parameters):

- Rose: 0×
- SGD (no momentum): 0×
- Adafactor: ~0.5-1× (factorized)
- SGD (momentum): 1×
- AdaGrad: 1×
- Lion: 1×
- Adam/AdamW/RAdam/NAdam: 2×
- Sophia: ~2×
- Prodigy: ~2-3×

---

OpenAI has a challenge in the GitHub repo `openai/parameter-golf`. Running a quick test without changing anything gives this result:

> [Adam] final_int8_zlib_roundtrip_exact val_loss:3.79053424 val_bpb:2.24496788

If I simply replace `optimizer_tok` and `optimizer_scalar` in the `train_gpt.py` file, I get this result:

> [Rose] final_int8_zlib_roundtrip_exact val_loss:3.74317755 val_bpb:2.21692059

I left `optimizer_muon` as-is. As a side note, I'm not trying to directly compete with Muon's performance. However, a big issue with Muon is that it only supports 2D parameters, and it relies on other optimizers such as Adam to fill in the rest. It also uses more memory. One of the biggest strengths of my Rose optimizer is the extremely low memory use.

Here is a more detailed look if you're curious (warmup steps removed):

[Adam]
```text
world_size:2 grad_accum_steps:4
sdp_backends:cudnn=False flash=True mem_efficient=False math=False
attention_mode:gqa num_heads:8 num_kv_heads:4
tie_embeddings:True embed_lr:0.05 head_lr:0.0 matrix_lr:0.04 scalar_lr:0.04
train_batch_tokens:16384 train_seq_len:1024 iterations:200 warmup_steps:20 max_wallclock_seconds:600.000
seed:1337
< 20 warmup steps were here >
step:1/200 train_loss:6.9441 train_time:156ms step_avg:155.60ms
step:2/200 train_loss:18.0591 train_time:283ms step_avg:141.70ms
step:3/200 train_loss:12.4893 train_time:373ms step_avg:124.43ms
step:4/200 train_loss:7.8984 train_time:461ms step_avg:115.37ms
step:5/200 train_loss:6.7623 train_time:552ms step_avg:110.46ms
step:6/200 train_loss:6.7258 train_time:640ms step_avg:106.74ms
step:7/200 train_loss:6.5040 train_time:729ms step_avg:104.14ms
step:8/200 train_loss:6.5109 train_time:817ms step_avg:102.16ms
step:9/200 train_loss:6.1916 train_time:906ms step_avg:100.61ms
step:10/200 train_loss:6.0549 train_time:994ms step_avg:99.45ms
step:200/200 train_loss:3.8346 train_time:18892ms step_avg:94.46ms
step:200/200 val_loss:3.7902 val_bpb:2.2448 train_time:18893ms step_avg:94.46ms
peak memory allocated: 586 MiB reserved: 614 MiB
Serialized model: 67224983 bytes
Code size: 48164 bytes
Total submission size: 67273147 bytes
Serialized model int8+zlib: 11374265 bytes (payload:17178912 raw_torch:17224025 payload_ratio:3.91x)
Total submission size int8+zlib: 11422429 bytes
final_int8_zlib_roundtrip val_loss:3.7905 val_bpb:2.2450 eval_time:67924ms
final_int8_zlib_roundtrip_exact val_loss:3.79053424 val_bpb:2.24496788
```

[Rose]

`optimizer_tok = Rose([{"params": [base_model.tok_emb.weight], "lr": token_lr, "base_lr": token_lr}], lr=token_lr, stabilize=False, compute_dtype=None)`

`optimizer_scalar = Rose([{"params": scalar_params, "lr": args.scalar_lr, "base_lr": args.scalar_lr}], lr=args.scalar_lr, stabilize=False, compute_dtype=None)`

```text
world_size:2 grad_accum_steps:4
sdp_backends:cudnn=False flash=True mem_efficient=False math=False
attention_mode:gqa num_heads:8 num_kv_heads:4
tie_embeddings:True embed_lr:0.05 head_lr:0.0 matrix_lr:0.04 scalar_lr:0.04
train_batch_tokens:16384 train_seq_len:1024 iterations:200 warmup_steps:20 max_wallclock_seconds:600.000
seed:1337
< 20 warmup steps were here >
step:1/200 train_loss:6.9441 train_time:173ms step_avg:173.15ms
step:2/200 train_loss:6.4086 train_time:305ms step_avg:152.69ms
step:3/200 train_loss:6.2232 train_time:433ms step_avg:144.21ms
step:4/200 train_loss:6.1242 train_time:557ms step_avg:139.24ms
step:5/200 train_loss:5.9950 train_time:681ms step_avg:136.23ms
step:6/200 train_loss:6.0386 train_time:806ms step_avg:134.38ms
step:7/200 train_loss:5.9189 train_time:933ms step_avg:133.22ms
step:8/200 train_loss:5.8817 train_time:1062ms step_avg:132.78ms
step:9/200 train_loss:5.5375 train_time:1192ms step_avg:132.43ms
step:10/200 train_loss:5.4599 train_time:1322ms step_avg:132.25ms
step:200/200 train_loss:3.7445 train_time:24983ms step_avg:124.91ms
step:200/200 val_loss:3.7390 val_bpb:2.2144 train_time:24984ms step_avg:124.92ms
peak memory allocated: 584 MiB reserved: 612 MiB
Serialized model: 67224983 bytes
Code size: 48449 bytes
Total submission size: 67273432 bytes
Serialized model int8+zlib: 11209724 bytes (payload:17178912 raw_torch:17224025 payload_ratio:3.91x)
Total submission size int8+zlib: 11258173 bytes
final_int8_zlib_roundtrip val_loss:3.7432 val_bpb:2.2169 eval_time:65817ms
final_int8_zlib_roundtrip_exact val_loss:3.74317755 val_bpb:2.21692059
```

---

Visual comparisons of training between AdamW and Rose: https://www.reddit.com/r/StableDiffusion/comments/1ss85os/training_comparison_adamw_on_the_left_rose_on_the/

---

[Update Rule]
```text
# 1. Decoupled weight decay
θ ← (1 − η_wd · λ) · θ

# 2. Gradient centralization (optional)
g̃_i ← g_i − mean(g_i)          # mean over all non-leading axes

# 3. Per-slice range
R_i ← |max(g̃_i)| − min(g̃_i)   # one scalar per slice

# 4. CV trust gating (optional)
μ_R ← mean(R),  σ_R ← std(R)   # across all slices
τ  ← μ_R / (σ_R + μ_R)         # equivalently 1/(1 + CV)
D_i ← (1 − τ) · μ_R + τ · R_i  # lerp between global and local

# 5. Update
θ ← θ − η · g̃ / D
```

--- TOP COMMENTS ---
[30↑ lostmsu] 45 lines of train logs, but no update rule in the post?
[4↑ ECF630] Good point, thanks. I've added it to the post.
[17↑ Jojanzing] I see you've compared it against ~~SGD~~ AdamW on MNIST on a single training run using a single seed, and achieve a maximum performance difference of 0.04% Have you compared it across several runs / seeds to see if the difference is at all significant, and not just random noise?
[5↑ ECF630] Yes, performance is consistent across seeds. The MNIST test is Rose vs AdamW, not SGD. Fine-tuning the FLUX.1-dev (12B parameters) image diffusion model is showing excellent results. Performance is generally on-par or exceeds AdamW, but with the memory requirements of SGD. It also trains a bit "differently," since it is not momentum-based like most optimizers. If you look at training loss in that MNIST test, you'll see it's much higher with Rose, but accuracy is also on-par or higher than AdamW, which points to better generalization. Higher training loss also appears in other tests as well, such as with the aforementioned FLUX.1-dev fine-tuning, but nevertheless converges well.
[7↑ Jojanzing] Can you then share the results of those repeated runs, with a *non-parametric test (e.g. Mann-Whitney U test) to determine whether the difference is meaningful?
[8↑ MrRandom04] How is it vs Muon and how is it vs AdamW / Muon on something harder than MNIST? Try FashionMNIST maybe?
[5↑ lucellent] Also curious about the comparison to Muon. For my projects optimizers barely differ in memory usage, it's not like you'd be saving tens of hundreds of thousands of VRAM anyway. Muon is the current SOTA.
[3↑ ECF630] It's not a direct competitor to Muon, it's more a replacement for AdamW. Even Muon needs AdamW or another optimizer to fill in the gaps, since it only works on 2D matrices. Also, memory requirements for Rose is simply parameters + gradients + temporary working memory, nothing else. Others have had success with Rose training large complex models such as LTX 2.3 (22B parameters) and FLUX.2-dev (32B).
