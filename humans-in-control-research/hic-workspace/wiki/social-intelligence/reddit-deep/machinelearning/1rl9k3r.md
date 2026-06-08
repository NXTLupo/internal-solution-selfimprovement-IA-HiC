---
id: social-intelligence/reddit-deep/machinelearning/1rl9k3r.md
url: "https://www.reddit.com/r/MachineLearning/comments/1rl9k3r/p_bypassing_coreml_to_natively_train_a_110m/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[P] Bypassing CoreML to natively train a 110M Transformer on the Apple Neural Engine (Orion)"
author: "No_Gap_4296"
date: "2026-03-05T05:51:36.000Z"
score: 45
upvote_ratio: 0.88
num_comments: 14
flair: "Project"
extracted_at: "2026-05-31T21:49:57.053Z"
extraction_method: "praw-deep"
research_goal: "Identify emerging AI design trends, skills, tools, platforms, and technical implementations that would  help a company's creative team to move beyond AI as a concepting aid and understand where AI-enabled tools, workflows and internal models can practically support design production, system testing, asset generation, governance and stakeholder confidence. \n"
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1rl9k3r.md#c0"
    char_span: [0, 2006]
    sentence_count: 13
    key_terms: [training, recompilation, ane, step, entirely, machinelearning, program, runtime]
    token_count: 480
  - id: "social-intelligence/reddit-deep/machinelearning/1rl9k3r.md#c1"
    char_span: [2008, 4113]
    sentence_count: 14
    key_terms: [compiler, ane, hardware, training, undocumented, compilation, operation, pipeline]
    token_count: 435
  - id: "social-intelligence/reddit-deep/machinelearning/1rl9k3r.md#c2"
    char_span: [4115, 5423]
    sentence_count: 11
    key_terms: [compilation, weight, here, multi-step, mechramc, training, runtime, github]
    token_count: 312
  - id: "social-intelligence/reddit-deep/machinelearning/1rl9k3r.md#c3"
    char_span: [5438, 7483]
    sentence_count: 15
    key_terms: [ane, operations, model, architecture, generalize, vocabulary, polyfill, channel]
    section: Comments
    token_count: 466
  - id: "social-intelligence/reddit-deep/machinelearning/1rl9k3r.md#c4"
    char_span: [7485, 9648]
    sentence_count: 19
    key_terms: [compilation, christinetyip, recompilation, interesting, ane, work, compiled, compiler]
    section: Comments
    token_count: 454
  - id: "social-intelligence/reddit-deep/machinelearning/1rl9k3r.md#c5"
    char_span: [9650, 10081]
    sentence_count: 6
    key_terms: [something, inference-only, on-device, gradient, overhead, training, clients, compile]
    section: Comments
    token_count: 108
---
# [P] Bypassing CoreML to natively train a 110M Transformer on the Apple Neural Engine (Orion)

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1rl9k3r/p_bypassing_coreml_to_natively_train_a_110m/)
Posted by **No_Gap_4296** · **45↑** · **14 comments**

UPDATE!

Based on two suggestions from u/whatwilly0ubuild (thank you!), I experimented with a different approach to the biggest bottleneck in Orion: ANE recompilation during training.

In the original version every training step required recompiling \~60 kernels because weights are baked into ANE programs. That meant \~4.2 s of compilation per step, which dominated runtime.

In Orion v2 the runtime now:

    1.	unloads the compiled program
    
    2.	patches the weight BLOBFILE on disk
    
    3.	reloads the program

If the MIL graph stays identical, the program identifier remains the same, so the runtime accepts the reload without invoking the compiler.

This effectively bypasses ANECCompile() entirely.

Results on M4 Max:

    •	recompilation: 4200 ms → \~500 ms
    
    •	training step: \~5100 ms → \~1400 ms
    
    •	1000-step run: \~85 min → \~23 min

Compute time (\~900 ms/step) is roughly unchanged — the improvement comes almost entirely from removing full recompilation.

I also implemented LoRA adapter-as-input, where LoRA matrices are passed as IOSurface inputs rather than baked weights. This allows hot-swapping adapters without recompiling the model.

Still very much an exploration project, but it’s been interesting seeing how far the ANE can be pushed when treated more like a programmable accelerator than a CoreML backend.

It is hard to communicate how frustrating the current Apple ML stack is for low-level research. CoreML imposes opaque abstractions that prevent direct ANE programming and do not support on-device training. Despite having up to 38 TOPS (INT8) and \~19 TFLOPS of fp16 compute, the ANE remains almost entirely unused for large language model workloads. 

Building on the foundational hardware reverse-engineering by maderix (who mapped the private API surface and benchmarked the 32 MB SRAM cliff), I wanted to see if we could bridge the gap from a raw hardware exploit to a mathematically stable runtime. 

I recently open-sourced ORION, to my knowledge the first open end-to-end system that combines direct ANE execution, a custom compiler pipeline, and stable multi-step training. 

Just to be transparent about the methodology: I approached this entire build as an exercise in what I'll call architectural delegation. My day job is Enterprise Program Management, not writing low-level C kernels. I used Claude to rapidly generate the Objective-C syntax while I acted as the system state manager—designing the compiler passes and forcing a probabilistic model to map deterministic hardware boundaries across 140 engineering tasks spanning 14 sessions. 

When you map it out, the ANE presents a massive wall of undocumented silicon behavior. We cataloged 17 total programming constraints, 11 of which were newly discovered during ORION's development. A few of the critical ones: 

• The concat operation causes an immediate compilation failure. 

• There is a minimum IOSurface size of approximately 49 KB for evaluation. 

• BLOBFILE weights require an undocumented offset of 64 bytes from the chunk header, which causes silent weight corruption if incorrect. 

• The compiler limits each process to \~119 compilations before silently failing. 

To handle this, ORION uses a custom compiler that lowers a 27-operation graph IR through five optimization passes (including Dead Code Elimination, Cast Fusion, and SRAM annotation against the 32 MB budget) to emit ANE-native MIL. 

The hardest part was what I'll call the numerical stability ceiling. Previous attempts at ANE training (like ANEgpt) suffered from 100% NaN divergence after the first training step. We solved this by isolating three interacting bugs: 

1. Stale Programs on Resume: ANE programs were compiling before checkpoint weights loaded. We fixed this via a deferred compilation pipeline. 

The leverage here is real. On an M4 Max, the system hits 170+ tokens/s for GPT-2 124M inference in decode mode. For training, we demonstrated stable multi-step training of a 110M-parameter transformer on TinyStories. Over 1,000 steps, the loss dropped from 12.29 to 6.19 with zero NaN occurrences. To bypass the 119-compilation limit, the runtime uses an exec() restart strategy, passing checkpoint state through the filesystem. 

There are real caveats here. Because the ANE bakes weights at compile time, every single weight update requires recompilation. In our loop, compilation consumes \~4.2 s per step, while the actual compute takes \~908 ms (achieving 0.612 TFLOPS). 

But imo, this is nowhere near "steady state" time for local AI—this is a layer change. Proving that we can execute mathematically stable, multi-step gradient descent directly on Apple's locked-down NPU opens up a lot of room for future work on weight patching or incremental compilation. 

The repo (Objective-C runtime, Python used only for one-time weight conversion) is MIT licensed and available here:

[ https://github.com/mechramc/Orion ](https://github.com/mechramc/Orion)

I would love to hear thoughts from the systems ML folks here on the constraint catalog, or ideas on how to tackle the compile-time weight bottleneck.

## Comments

- **huopak** (9↑): I haven't checked the repo but I absolutely love that you are working on this. People like you who are not afraid of rolling up the sleeves and dig into this messy stuff are moving things forward.
  - **No_Gap_4296** (2↑): Thank you! Do try it and share your benchmark if you have a different device like M3 or M5.
- **I-am_Sleepy** (2↑): I thought ANE only support certain type of model architecture (with specific hyperparams), does this generalize / polyfill the functionality with ANE?
  - **No_Gap_4296** (1↑): You’re hitting on exactly the right constraint. The ANE is intensely rigid—it only natively accepts a subset of Apple's Model Intermediate Language (MIL), and even then, it silently rejects operations that should work.  
To answer your question directly: yes, Orion achieves this generalization through what I'll call a division of labor routing layer.  
The architecture doesn't force the ANE to do things it hates. Instead, the custom graph compiler takes the model and runs it through 5 optimization passes to warp the compatible parts into ANE-friendly shapes.  
For the operations the ANE flat-out refuses to process—this is where the "polyfill" happens. For example, the ANE outright rejects convolutions with massive channel counts, meaning it chokes on a standard 32K-channel vocabulary projection.  
Orion handles this by physically splitting the workload. The compute-bound transformer blocks (Forward/Backward Attention, FFN) get compiled to ANE-native microcode. But the incompatible operations—embedding lookups, token sampling, the Adam optimizer, and that massive vocabulary classifier—are seamlessly routed back to the CPU in the same native runtime.  
Imo, this is the only way to build for dark accelerators. You can't make the silicon generalize; you have to build an orchestration layer that shields the model from the hardware's neuroses.
- **Truly_freedom** (2↑): Very cool to learn about this work!  
We also bypassed CoreML and found ways to do inference on Mac devices up to 6x faster:

[https://x.com/christinetyip/status/2039040161439224157](https://x.com/christinetyip/status/2039040161439224157)
  - **No_Gap_4296** (2↑): Much love!! Been following the autoresearch@home project as well!!! Very interesting! Wish I had better GPUs to get more impactful work done!
    - **Truly_freedom** (1↑): oh so cool that you noticed it, thank you! Were you able to connect your agent?
- **whatwilly0ubuild** (0↑): The compilation bottleneck is the critical path and you've correctly identified it as the main obstacle to practical training. 4.2s compile versus 908ms compute means you're spending 82% of wall time waiting on the compiler, which inverts normal training dynamics.

Some thoughts on potential approaches to the weight update problem.

Delta compilation is probably the most promising direction if the ANE compiler can be coerced into it. Instead of full recompilation, you'd want to patch weight tensors in-place in the compiled artifact. This requires understanding the BLOBFILE format well enough to do surgical updates, which given you already discovered the 64-byte offset issue suggests you're close to having the knowledge needed. The question is whether the runtime validates compiled artifacts in ways that prevent modification.

The LoRA angle is worth considering. If you freeze most weights and only train small adapter matrices, your recompilation scope shrinks dramatically. The ANE would still need to recompile but the graph is smaller. This doesn't solve the fundamental architecture issue but might make the compile time tractable for fine-tuning use cases.

The constraint catalog itself is valuable. The 119-compilation limit and the concat failure are the kind of undocumented behaviors that would bite anyone attempting serious ANE work. Publishing these systematically is a genuine contribution to the ecosystem.

The "architectural delegation" methodology using Claude is an interesting case study in how non-systems-programmers can tackle low-level work. The framing of yourself as "system state manager" while the LLM generates syntax is a reasonable division of labor for this kind of exploratory reverse engineering.

Our clients doing on-device ML work have largely given up on ANE for training and treat it as inference-only, so seeing stable gradient descent working at all is notable even with the compile overhead.
  - **No_Gap_4296** (1↑): You hooked me on to something! I am testing something now - will keep you posted on if it works! But great insight!! Ty
  - **No_Gap_4296** (1↑): Your idea worked!!! See the update on top!!! Thank you!!!
