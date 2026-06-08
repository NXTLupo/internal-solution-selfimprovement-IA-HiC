---
id: social-intelligence/reddit-deep/machinelearning/1qpc4ap.md
url: "https://www.reddit.com/r/MachineLearning/comments/1qpc4ap/r_we_opensourced_fashn_vton_v15_a_pixelspace/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[R] We open-sourced FASHN VTON v1.5: a pixel-space, maskless virtual try-on model trained from scratch (972M params, Apache-2.0)"
author: "JYP_Scouter"
date: "2026-01-28T14:00:33.000Z"
score: 103
upvote_ratio: 0.97
num_comments: 19
flair: "Research"
extracted_at: "2026-05-30T18:47:17.338Z"
extraction_method: "praw-deep"
research_goal: "Identify emerging AI design trends, essential skills, practical tools, key platforms, and technical implementations. This research will enable creative teams to move beyond AI concepting, specifically detailing applications in design production, system testing, asset generation, governance, and stakeholder confidence."
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1qpc4ap.md#c0"
    char_span: [0, 2301]
    sentence_count: 10
    key_terms: [machinelearning, models, model, diffusion, releasing, comments, garment, open-sourced]
    token_count: 513
  - id: "social-intelligence/reddit-deep/machinelearning/1qpc4ap.md#c1"
    char_span: [2303, 3343]
    sentence_count: 1
    key_terms: [fashn-vton-1, fashn-ai, huggingface, garment, person, tryonpipeline, architecture, https]
    token_count: 307
  - id: "social-intelligence/reddit-deep/machinelearning/1qpc4ap.md#c2"
    char_span: [3358, 5085]
    sentence_count: 17
    key_terms: [time, use, distribution, https, model, inference, technical, representation-comparison]
    section: Comments
    token_count: 442
  - id: "social-intelligence/reddit-deep/machinelearning/1qpc4ap.md#c3"
    char_span: [5087, 6973]
    sentence_count: 10
    key_terms: [glasses, model, fit, currentscurrents, clothes, data, does, something]
    section: Comments
    token_count: 440
  - id: "social-intelligence/reddit-deep/machinelearning/1qpc4ap.md#c4"
    char_span: [6975, 7485]
    sentence_count: 3
    key_terms: [training, reckon, open, appreciate, nuclearvii, available, extremely, obviously]
    section: Comments
    token_count: 131
---
# [R] We open-sourced FASHN VTON v1.5: a pixel-space, maskless virtual try-on model trained from scratch (972M params, Apache-2.0)

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1qpc4ap/r_we_opensourced_fashn_vton_v15_a_pixelspace/)
Posted by **JYP_Scouter** · **103↑** · **19 comments**

We just open-sourced FASHN VTON v1.5, a virtual try-on model that generates photorealistic images of people wearing garments directly in pixel space. We trained this from scratch (not fine-tuned from an existing diffusion model), and have been running it as an API for the past year. Now we're releasing the weights and inference code.

# Why we're releasing this

Most open-source VTON models are either research prototypes that require significant engineering to deploy, or they're locked behind restrictive licenses. As state-of-the-art capabilities consolidate into massive generalist models, we think there's value in releasing focused, efficient models that researchers and developers can actually own, study, and extend commercially.

We also want to demonstrate that competitive results in this domain don't require massive compute budgets. Total training cost was in the $5-10k range on rented A100s.

This follows our [human parser release](https://www.reddit.com/r/MachineLearning/comments/1qax221/p_opensourcing_a_human_parsing_model_trained_on/) from a couple weeks ago.

# Architecture

* **Core:** MMDiT (Multi-Modal Diffusion Transformer) with 972M parameters
* **Block structure:** 4 patch-mixer + 8 double-stream + 16 single-stream transformer blocks
* **Sampling:** Rectified Flow (linear interpolation between noise and data)
* **Conditioning:** Person image, garment image, and category (tops/bottoms/one-piece)

# Key differentiators

**Pixel-space operation:** Unlike most diffusion models that work in VAE latent space, we operate directly on RGB pixels. This avoids lossy VAE encoding/decoding that can blur fine garment details like textures, patterns, and text.

**Maskless inference:** No segmentation mask is required on the target person. This improves body preservation (no mask leakage artifacts) and allows unconstrained garment volume. The model learns where clothing boundaries should be rather than being told.

# Practical details

* **Inference:** \~5 seconds on H100, runs on consumer GPUs (RTX 30xx/40xx)
* **Memory:** \~8GB VRAM minimum
* **License:** Apache-2.0

# Links

* **GitHub:** [fashn-AI/fashn-vton-1.5](https://github.com/fashn-AI/fashn-vton-1.5)
* **HuggingFace:** [fashn-ai/fashn-vton-1.5](https://huggingface.co/fashn-ai/fashn-vton-1.5)
* **Project page:** [fashn.ai/research/vton-1-5](https://fashn.ai/research/vton-1-5)

# Quick example

    from fashn_vton import TryOnPipeline
    from PIL import Image
    
    pipeline = TryOnPipeline(weights_dir="./weights")
    person = Image.open("person.jpg").convert("RGB")
    garment = Image.open("garment.jpg").convert("RGB")
    
    result = pipeline(
        person_image=person,
        garment_image=garment,
        category="tops",
    )
    result.images[0].save("output.png")

# Coming soon

* **HuggingFace Space:** Online demo
* **Technical paper:** Architecture decisions, training methodology, and design rationale

Happy to answer questions about the architecture, training, or implementation.

## Comments

- **DeepAnimeGirl** (10↑): 1. Do you use x-pred to v-loss formulation as done in (https://arxiv.org/abs/2511.13720)?
2. Are you using time shifting? Are you sampling time uniformly or from logit normal distribution? (https://bfl.ai/research/representation-comparison)
3. How well does the model behave at different input resolutions? What about aspect ratios? Have you considered something like RPE-2D? (https://arxiv.org/abs/2503.18719)
  - **JYP_Scouter** (11↑): 1. We primarily use standard L2 loss with flow matching as the training target. We also apply additional weighting to non-background pixels, since the background can be restored during inference.
2. Yes, we use time shifting during inference, along with a slightly modified logit-normal time distribution rather than uniform sampling.
3. The model was trained at a fixed 2:3 aspect ratio. This was largely a dataset and budget-driven decision, as most of our data was in 3:4 and 2:3 formats, and training at a fixed shape allowed us to compile the model more efficiently.

We are preparing an in-depth technical paper that will go into significantly more detail on all of these points. We expect to release it in the next 1 to 2 weeks.
- **Aware_Photograph_585** (6↑): Awesome!  Can't wait to read the technical paper!
  - **JYP_Scouter** (2↑): Thanks for giving me more motivation to finish writing it faster 🤗
- **neverm0rezz** (5↑): Looks great! What MMDiT variant do you use?
  - **JYP_Scouter** (4↑): The base MMDiT is taken from BFL's FLUX.1, but we're not using text; We adapted the text stream to process the garment image instead. 

There are also a few more tweaks like adding category (tops, bottoms, one-pieces) as extra conditioning for modulation. 

Everything will be explained in-depth in the upcoming technical paper!
- **currentscurrents** (6↑): Does this attempt to model the fit of the clothes at all? E.g. if your garment is a large, and the person in the image is a small, will it appear oversized?
  - **jrkirby** (3↑): Probably not. While this is a pretty nice technical accomplishment, I think it completely misses the point of why people try clothes on in the first place. We need to know if they'll fit (that is, do the physical dimensions match our body), not what it'll look like if it does fit.
    - **JYP_Scouter** (6↑): u/currentscurrents u/jrkirby No this model can't visualize a "bad fit", we simply don't have enough data showcasing bad fits to train a diffusion model to do this. 

It still has its uses though, virtual try-on is not just about sizing, it's also about styling, content creation (cutting photoshoot costs), even memes
- **infinitay_** (3↑): I presume this doesn't work with glasses since in the examples provided some images had glasses but it only swapped the clothes? That's a damn shame. Otherwise, fantastic model! I was really hoping someone would work on something that properly supported glasses so we wouldn't have to siphon our data to those glasses try-on companies, handing over all our facial data.
  - **JYP_Scouter** (1↑): Unfortunately liked you've noticed this doesn't support glasses, but our human parser (segmentation model) does recognize glasses, so in theory someone can take this open-source release and, if they have the dataset for it, fine-tune this model to also support glasses.

We'd be happy to provide guidance if someone's interested in taking on this project.
    - **infinitay_** (2↑): Yea I was exploring your GitHub repo when I found the parser and saw you were segmenting glasses. I wish I was knowledgeable in the field so I could take something on like that.

I reckon it's hard to get the required dataset. It'll be easy to find pictures of the glasses obviously, but I reckon you also need photos of people wearing them in various angles, lighting, and subjects.
- **sid_276** (2↑): Extremely good work
  - **JYP_Scouter** (1↑): Thanks, I appreciate it 🙏
- **NuclearVII** (0↑): Open weights is not open source.

Is the training set and training code publicly available?
- **aglet_factorial** (0↑): Is anyone else worried about this just being another deepfake machine?
