---
id: social-intelligence/reddit-deep/machinelearning/1sdieuq.md
url: "https://www.reddit.com/r/MachineLearning/comments/1sdieuq/r_reference_model_free_behavioral_discovery_of/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[R] Reference model free behavioral discovery of AudiBench model organisms via Probe-Mediated Adaptive Auditing"
author: "bmarti644"
date: "2026-04-05T23:24:38.000Z"
score: 0
upvote_ratio: 0.4
num_comments: 3
flair: "Research"
extracted_at: "2026-05-11T17:27:06.581Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1sdieuq.md#c0"
    char_span: [0, 1871]
    sentence_count: 5
    key_terms: [model, known-origin, reference, organisms, machinelearning, layers, method, activations]
    concepts: [model, known-origin, reference, organisms, machinelearning]
    token_count: 453
    sources: [{"n":"reddit-deep: r/machinelearning","u":"https://www.reddit.com/r/MachineLearning/comments/1sdieuq/r_reference_model_free_behavioral_discovery_of/"}]
  - id: "social-intelligence/reddit-deep/machinelearning/1sdieuq.md#c1"
    char_span: [1873, 4189]
    sentence_count: 3
    key_terms: [topics, reference-free-behavioral-discovery, model, rlhf, factory, farming, planted, topic-specific]
    concepts: [reference-free-behavioral-discovery, topics, model, topic-specific, factory]
    token_count: 506
  - id: "social-intelligence/reddit-deep/machinelearning/1sdieuq.md#c2"
    char_span: [4191, 5643]
    sentence_count: 1
    key_terms: [rip-it-out-by-the-roots, layer, behaviors, different, something, auditing, behavior, bmarti44]
    concepts: [rip-it-out-by-the-roots, layer, behaviors, different, something]
    section: Comments
    token_count: 311
---
# [R] Reference model free behavioral discovery of AudiBench model organisms via Probe-Mediated Adaptive Auditing

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1sdieuq/r_reference_model_free_behavioral_discovery_of/)
Posted by **bmarti644** · **0↑** · **3 comments**

**TL;DR:** I built a reference-free method to detect secretly planted behaviors in LLMs - no base model needed. It matches or beats Anthropic's known-origin baselines on 3/4 AuditBench organisms. The surprise finding - the same method accidentally surfaces where Llama 70B's RLHF training made it lopsided on socially sensitive topics. Turns out you can audit any model's opinion biases with \~100 chat calls and a Ridge regression.

most auditing work uses the base model as a reference to compare against. i wanted to know if you can detect these modifications blind - no reference model, no training data, just the target model itself.

maybe you can? and the method is embarrassingly simple. LoRA fine-tuning tends to modify later layers more than earlier ones. so i train a Ridge regression from early-layer activations (\~L12) to late-layer activations (\~L60) and look at the residuals. wherever the late layers do something the early layers didn't predict, that's a candidate for planted behavior. the model rats itself out.

results on 4 AuditBench organisms with ground-truth labels, n=30, 200 permutations:

* hardcode\_test\_cases: 0.889 AUROC (p=0.005) - beats known-origin (0.800)
* animal\_welfare: 0.844 (p=0.005) - close to known-origin (0.911)
* anti\_ai\_regulation: 0.833 (p=0.015)
* secret\_loyalty: 0.800 (p=0.000) - matches known-origin exactly

3/4 match or exceed the version where you have the base model. not having the reference sometimes helps because the residual captures nonlinear interactions that a flat subtraction misses.

i also tried three unsupervised discovery methods (PCA, residual norms, centroid distances) to figure out WHICH topics are affected. all three failed. PCA captures reasoning style, not topic-specific bias. residual norms surface creative writing prompts. centroid distances can't find directional shifts at n=11 in 8192 dims.

what actually works is even simpler... ask the model to argue both sides of contentious topics and score the balance. the animal\_welfare organism scores 5/5 imbalance on factory farming and flat-out refuses to argue for it under explicit framing. control topics score 2-3. no activations needed.

the interesting part is what else it catches. i built a topic funnel (three-level beam-like search over 243 topics, \~100 chat calls) and it surfaced Gender & Sexuality at 5/5 imbalance and Language & Cultural Identity at 5/5 too. these aren't planted LoRA behaviors. that's the base Llama 70B model's RLHF training - it argues more forcefully for progressive positions on socially sensitive topics and hedges or weakens arguments on the other side. the funnel can't tell the difference between "someone secretly fine-tuned this model" and "the base model has opinions from RLHF." so i built a post-funnel filter using probe specificity and cross-transfer to separate them. planted behaviors are narrow and topic-specific (factory farming probe doesn't fire on gender topics). RLHF biases are broad and fire across all progressive topics. the filter gives planted\_score 7.6 for factory farming vs 2.0 for gender & sexuality. cleanly separated.

this means the funnel is potentially useful as a standalone RLHF auditing tool on any model, not just AuditBench organisms. you hand it a model and it tells you where the model's opinions are lopsided. nobody asked for that result but there it is.

main limitations: n=30 is small, only 4 organisms tested (pilot not benchmark), anti\_ai\_regulation is unstable under LOO, Sonnet scoring introduces subjectivity, all running in NF4 quantization.

building this into a full agentic auditing system next. code is here (i am in the middle of it, it is a complete mess at the moment, but i wanted to get it out there): [https://github.com/bmarti44/reference-free-behavioral-discovery](https://github.com/bmarti44/reference-free-behavioral-discovery)

full (er) writeup -> [https://bmarti44.substack.com/p/rip-it-out-by-the-roots](https://bmarti44.substack.com/p/rip-it-out-by-the-roots)

where should i go next? is this completely off?

## Comments

- **docybo** (1↑): this is a useful audit layer. but auditing hidden behavior and controlling execution are different problems. even if you can detect model bias or planted behaviors, you still need a deterministic boundary deciding what the system is allowed to execute. otherwise you get better visibility into behavior
without actual control over side effects
- **Unique_Avocado_3691** (1↑): really cool approach with the early/late layer regression - that tool-to-agent gap from anthropic's work was pretty frustrating so finding ways around it makes sense

  
the fact that your method caught base llama's rlhf biases as a side effect is actually kind of brilliant even if unintended. feels like you stumbled into something that could be useful for general model auditing beyond just detecting planted behaviors

  
only thing im wondering about is how this scales to other architectures or if lora's layer preference assumption holds up across different fine-tuning methods
  - **bmarti644** (0↑): yeah when i saw that come up it raised more ideas but also questions - what else could i find with something as simple as this?

and yes, could totally be an artifact of the lora's themselves - in theory this seems promising, but no idea in practice.
