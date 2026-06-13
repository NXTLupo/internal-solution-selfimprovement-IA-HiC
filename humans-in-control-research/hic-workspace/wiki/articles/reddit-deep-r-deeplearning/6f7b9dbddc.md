---
id: articles/reddit-deep-r-deeplearning/6f7b9dbddc.md
url: "https://www.reddit.com/r/deeplearning/comments/1swsbca/we_proved_that_every_supervised_model_youve_ever/"
url_hash: "6f7b9dbddc"
kind: "article"
source: "Reddit Deep: r/deeplearning"
title: "We proved that every supervised model you've ever trained has a geometric blind spot; and adversarial training makes it worse, not better"
author: ""
date: "2026-04-27T03:36:29.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:33:58.393236+00:00"
chars: 12000
industries: [ai_research]
industry_method: llm
chunks:
  - id: "articles/reddit-deep-r-deeplearning/6f7b9dbddc.md#c0"
    char_span: [0, 2451]
    sentence_count: 20
    key_terms: [training, model, texture, erm, distribution, directions, supervised, data]
    token_count: 515
  - id: "articles/reddit-deep-r-deeplearning/6f7b9dbddc.md#c1"
    char_span: [2453, 4188]
    sentence_count: 14
    key_terms: [jacobian, erm, pgd, directions, representations, adversarial, tdi, robustness]
    token_count: 454
  - id: "articles/reddit-deep-r-deeplearning/6f7b9dbddc.md#c2"
    char_span: [4190, 6095]
    sentence_count: 8
    key_terms: [blind, ratio, spot, jacobian, nuisance, geometric-analysis-of-deep-learning, model, erm]
    token_count: 498
  - id: "articles/reddit-deep-r-deeplearning/6f7b9dbddc.md#c3"
    char_span: [6097, 7808]
    sentence_count: 15
    key_terms: [directions, preference, uniformly, across, correlations, distribution, adversarial, rlhf]
    token_count: 402
  - id: "articles/reddit-deep-r-deeplearning/6f7b9dbddc.md#c4"
    char_span: [7810, 9720]
    sentence_count: 10
    key_terms: [tdi, model, frobenius, jacobian, theorem, distribution, "it's", norm]
    token_count: 509
  - id: "articles/reddit-deep-r-deeplearning/6f7b9dbddc.md#c5"
    char_span: [9722, 11536]
    sentence_count: 8
    key_terms: [picture, adversarial, learn, "it's", always, grass, fine-tuning, specific]
    token_count: 418
  - id: "articles/reddit-deep-r-deeplearning/6f7b9dbddc.md#c6"
    char_span: [11538, 12286]
    sentence_count: 5
    key_terms: [models, nightmarelogic420, generalisation, intraluminal, self-driving, taranpula39, confidence, end-to-end]
    token_count: 189
---
# We proved that every supervised model you've ever trained has a geometric blind spot; and adversarial training makes it worse, not better

Source: [Reddit Deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1swsbca/we_proved_that_every_supervised_model_youve_ever/)

# The Setup: What Does ERM Actually Force Your Model to Learn?

Every production model trained today uses empirical risk minimization. You minimize expected loss on labeled data. Simple.

Here's what we proved: **any ERM minimizer must retain non-zero Jacobian sensitivity in every direction that predicts training labels — including directions that are pure nuisance at test time.**

This isn't a training failure. It isn't fixable with more data, bigger models, or longer training. It's a theorem about what the supervised objective *is*.

The formal statement: for any encoder φ\* minimizing supervised loss on a distribution where nuisance feature n has correlation ρ with labels:

>

The right-hand side is strictly positive and **independent of model capacity and dataset size.** It depends only on the data distribution. This bound holds for MSE, cross-entropy, and any other proper scoring rule.

Plain language: **if texture predicts your training labels, your model cannot stop being sensitive to texture. Suppressing it would cost task loss. This is forced.**

# One Theorem, Four Things You Already Knew Were Problems

This is what I find most interesting about the result. Four empirical findings that were previously treated as separate phenomena with separate explanations turn out to be corollaries of this single structural fact:

**1. Non-robust features (Ilyas et al. 2019)** — ERM must encode any label-correlated direction, including imperceptible ones. Adversarial examples exist in exactly those directions. They transfer across models because the blind spot is determined by the *data distribution*, not the individual model.

**2. Texture bias (Geirhos et al. 2019)** — When local texture statistics are easier label predictors than global shape, ERM cannot discard them. Texture bias is a geometric consequence of ERM under correlated nuisance, not an architectural inductive bias.

**3. Corruption fragility (Hendrycks & Dietterich 2019)** — Common corruptions perturb exactly the nuisance-sensitive directions that cannot be suppressed under ERM. Degradation under unseen shifts is unavoidable, and its expected magnitude scales with ρ².

**4. Robustness–accuracy tradeoff (Tsipras et al. 2019)** — Suppressing nuisance-correlated directions removes information ERM uses for in-distribution accuracy. The tradeoff isn't architectural. It's the cost of closing a blind spot the supervised objective opened, and its magnitude is predictable from ρ.

These four research programs, years of papers, are all measuring different faces of the same geometric object.

# The PGD Result: This Is The Part That Surprised Me

Here's the table that made me double-check the code three times:

|Method|Jacobian Fro ↓|TDI@0 ↓|
|:-|:-|:-|
|ERM (B0)|34.58|1.093|
|VAT|5.01|1.276|
|**PGD-4/255**|**2.91**|**1.336**|
|PMH (ours)|8.08|**0.904**|

PGD achieves the **lowest Jacobian Frobenius norm** — a 12× reduction from ERM. By every metric the robustness literature has used, PGD is "smoothing" the representations.

But its **clean-input geometry is worse than ERM** (TDI 1.336 vs 1.093).

The mechanism, which our Corollary 4 predicts: PGD compresses the Jacobian in the adversarial direction, like squeezing a balloon. The sensitivity doesn't disappear — it redistributes into other directions. The Jacobian becomes nearly rank-1 (anisotropy index ≈ 2.1 for PGD vs 32.4 for ERM). When you probe isotropically — which is what TDI does, and what you're implicitly doing at test time — those concentrated directions dominate and geometry is worse.

**The field has been reading low Jacobian Frobenius norm as evidence that adversarial training smooths representations. This is wrong. It measures magnitude redistribution, not geometric repair.**

# Why CKA, Intrinsic Dimension, and Jacobian Fro All Miss This

This is the diagnostic result. On the exact same comparison (ERM vs PGD vs PMH):

|Metric|What it says|
|:-|:-|
|CKA|Ranks PGD more similar to ERM than PMH (0.91 vs 0.88) — **inverted**|
|Intrinsic dimension|42.3 / 44.1 / 38.7 — within noise, **useless**|
|Jacobian Fro|Ranks PGD **best** (2.91) — exactly opposite the truth|
|**TDI**|Correctly identifies PMH best (0.904), PGD worst (1.336)|

Every metric the geometric-analysis-of-deep-learning literature uses is blind to Jacobian anisotropy. A model with sensitivity concentrated in one direction (rank-1 Jacobian) looks *great* on Frobenius norm — small magnitude — but is geometrically broken under isotropic probing.

TDI measures expected squared path-length distortion under isotropic perturbation. This is the quantity Theorem 1 bounds. Nothing else measures it.

# Scale Makes It Worse, Not Better

We measured the blind spot ratio across three BERT-family model sizes. A ratio below 1.0 means the encoder is more sensitive to surface-form variation (nuisance) than to semantic variation (signal):

|Model|Parameters|Blind Spot Ratio|
|:-|:-|:-|
|DistilBERT|66M|0.860|
|BERT-base|110M|0.765|
|BERT-large|340M|0.742|

The ratio decreases monotonically. **Larger models encode nuisance more precisely, not less**, because greater capacity enables more faithful encoding of every label-correlated feature.

This is a direct theoretical prediction, not a post-hoc observation: Theorem 1 says the blind spot magnitude scales with the nuisance-label correlation in the training distribution, and larger models approximate the Bayes predictor more closely, which means they encode the nuisance *better*.

If you've been counting on scale to fix robustness, this result is uncomfortable.

# Fine-Tuning Amplifies the Blind Spot

We measured paraphrase drift on BERT across three conditions:

|Condition|Paraphrase Drift|
|:-|:-|
|Pretrained backbone|0.0244|
|ERM fine-tuned (SST-2)|0.0375 (+54%)|
|PMH fine-tuned|0.0033 (−11× vs ERM)|

Task-specific ERM fine-tuning increases the blind spot by 54% relative to the pretrained model. The mechanism is straightforward: task labels introduce new spurious correlations (sentence length predicting sentiment, format predicting preference), and Theorem 1 says the model must encode them.

The implication for RLHF is direct and uncomfortable. Preference labels carry spurious correlations — verbosity, formatting, surface markers of confidence. If the theorem applies (and there's no reason it wouldn't), RLHF is mathematically guaranteed to encode these alongside genuine preference signal. Sycophancy and length bias aren't bugs in a specific implementation. They're theorems about what RLHF does to representations.

# The Fix: One Additional Training Term

Once you understand the mechanism, the fix is clear. You need to penalize the Jacobian *uniformly across all input directions*, not in one adversarial direction (PGD) and not in one arbitrary direction (standard augmentation).

Proposition 5 proves: among all zero-mean perturbation distributions, Gaussian noise is the **unique** distribution that penalizes the Jacobian Frobenius norm uniformly across all input directions. Any other distribution — including adversarial — hits some directions more than others.

Proof is one line from the trace formula: E\_δ\[‖Jφδ‖²\] = Tr(J\^T J Σ\_δ) = σ²‖J‖²\_F iff Σ\_δ = σ²I.

PMH adds one term to the loss:

    L_PMH = ‖φ(x) − φ(x + δ)‖²,   δ ∼ N(0, σ²I)

By first-order Taylor expansion, this ≈ σ²‖J\_φ‖²\_F — directly suppressing the Frobenius norm uniformly. The Gaussian choice isn't heuristic. It's the unique solution.

Results across seven tasks, three modalities, and foundation-model scale:

* Vision (CIFAR-10 ViT): −17.3% TDI
* Language (BERT SST-2): −28.7% TDI, −76.9% paraphrase drift
* Foundation scale (ImageNet ViT-B/16): −23.9% TDI
* CIFAR-10-C (official Hendrycks benchmark, 19 corruption types): +14.82pp mean accuracy, wins 18/19 corruption types
* PGD robustness without adversarial training: 48.94% vs VAT's 32.38% at ε=4/255
* Compute overhead: \~1.3× wall-clock, no architectural changes

The intra-class representation distance increases 64% on ImageNet alongside TDI reduction — a by-product of suppressing nuisance sensitivity that forces the encoder to encode class-relevant features more discriminatively.

# The Diagnostic: TDI

TDI (Trajectory Deviation Index) measures expected squared path-length distortion under isotropic perturbation, the exact quantity Theorem 1 bounds:

    TDI(φ, σ) = (1/L) Σ_ℓ E_{x,δ}[‖φ^(1:ℓ)(x+δ) − φ^(1:ℓ)(x)‖²] / E_x[‖φ^(1:ℓ)(x)‖²]

A perfectly isometric encoder scores 0. TDI requires only a forward pass — no access to model weights or architecture. It's measuring a property the theorem says any model trained on a given distribution must have, not a property of any specific model.

The reason it catches the PGD failure that everything else misses: TDI penalizes Jacobian anisotropy. A rank-1 Jacobian has small Frobenius norm and high TDI simultaneously, because the isotropic probe hits the concentrated direction. Frobenius norm can't see this. TDI is the only measure that can.

# What This Means Practically

**Every production model has this blind spot.** Every real-world dataset has features spuriously correlated with labels. Theorem 1 applies.

**The shape of the blind spot is determined by your data distribution**, measurable from data before training, via the spurious correlations in P(y|x). It's not visible to accuracy metrics, CKA, intrinsic dimension, or Jacobian Frobenius norm. It's measurable with TDI in one forward pass.

**Adversarial training, as standardly implemented, worsens clean-input geometry** while improving one specific adversarial metric. If you care about robustness to distribution shift rather than specific adversarial attacks, PGD is making your model worse.

**PMH repairs the blind spot at every rung of the modern training hierarchy** — from scratch, from pretrained backbones, through fine-tuning. One term, one forward pass overhead, no architectural changes.

**If you're fine-tuning on task labels or preference labels, you're actively worsening the blind spot

--- TOP COMMENTS ---
[14↑ Massive_Connection42] AI slop..this merely a  mystical, esoteric roleplay prompt ritual…
[2↑ Intraluminal] No, I read it, and the technique should work, but it's more limited in where it will work than they think.

It's actually easy to understand intuitively. 

What they're saying is that you can't RELIABLY provide models with only the subject that you want them to learn - let's say 'cows,' and that the model will therefore also always learn to include the other things around the cow, like grass, let's say. This is actually well known, and it's the reason why early AI would sometimes think that a ball was a puppy, because it had seen a bunch of pictures labeled 'puppy' that contained balls.

What they do is, they make the whole picture 'fuzzy.' What that does, in the case of cows, is to make the grass too random to learn, while the 'cow-shape' is still learnable because it's always there, but the grass is not.

The problem is that this only works when the shape you want the AI to learn is #1) fairly large in the picture (so it doesn't get randomized away, and #2) There is nothing else in the picture that is a) too large to randomize (blur) away, and b) is not always in the same position in the picture.

An example of that is breast tumors. They are small, and randomly placed, AND there are often artifacts, like rulers etc., that are in all the pictures in the same place. This is an important thing that AI could help with, but this idea will not work on.
[2↑ taranpula39] This is also supported by the fact that you have to retrain self-driving models for every city to have any confidence that they will not break. So goes for "generalisation" of end-to-end models.
[2↑ NightmareLogic420] Anytime you see a writeup on here that's AI written, you already know it's gonna be trash
[-2↑ damhack] Says the “recursion” prompting nut.

How to say you can’t, and didn’t, read the paper.
[1↑ Massive_Connection42] take your meds…
[5↑ Intraluminal] You're
