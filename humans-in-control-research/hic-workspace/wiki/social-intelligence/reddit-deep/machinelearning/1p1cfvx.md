---
url: "https://www.reddit.com/r/MachineLearning/comments/1p1cfvx/r_segment_anything_model_3_sam_3_is_released/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[R] Segment Anything Model 3 (SAM 3) is released"
author: "KateSaenko"
date: "2025-11-19T16:34:46.000Z"
score: 153
upvote_ratio: 0.99
num_comments: 22
flair: "Research"
extracted_at: "2026-05-11T17:27:06.576Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# [R] Segment Anything Model 3 (SAM 3) is released

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1p1cfvx/r_segment_anything_model_3_sam_3_is_released/)
Posted by **KateSaenko** · **153↑** · **22 comments**

**Abstract**: *We present Segment Anything Model (SAM) 3, a unified model that detects, segments, and tracks objects in images and videos based on concept prompts, which we define as either short noun phrases (e.g., “yellow school bus”), image exemplars, or a combination of both. Promptable Concept Segmentation (PCS) takes such prompts and returns segmentation masks and unique identities for all matching object instances. To advance PCS, we build a scalable data engine that produces a high-quality dataset with 4M unique concept labels, including hard negatives, across images and videos. Our model consists of an image-level detector and a memory-based video tracker that share a single backbone. Recognition and localization are decoupled with a presence head, which boosts detection accuracy. SAM 3 doubles the accuracy of existing systems in both image and video PCS, and improves previous SAM capabilities on visual segmentation tasks. We open source SAM 3 along with our new Segment Anything with Concepts (SA-Co) benchmark for promptable concept segmentation.*

Paper: [https://ai.meta.com/research/publications/sam-3-segment-anything-with-concepts/](https://ai.meta.com/research/publications/sam-3-segment-anything-with-concepts/)

Demo: [https://aidemos.meta.com/segment-anything](https://aidemos.meta.com/segment-anything)

Code: [https://github.com/facebookresearch/sam3](https://github.com/facebookresearch/sam3)

Website: [https://ai.meta.com/sam3](https://ai.meta.com/sam3)

## Comments

- **SirBlobfish** (41↑): Nice work! It's a shame that Meta laid off some of the people on this team.
- **Striking-Warning9533** (15↑): Doesn't this break the ICLR double blind rules?
- **Objective-Feed7250** (5↑): Insane how fast SAM is evolving.
- **bisorgo** (5↑): Did anybody try SAM3 tracking in cluttered and overlapping environment.
SAM2 was not good at this with lots of oversegmentations.
- **teentradr** (4↑): Can anyone tell me high-level why they chose for a 'vanilla' ViT encoder instead of a hierarchical ViT encoder like in SAM2?  
I thought hierarchical ViTs were way more efficient (especially for high resolution images) and also better multi-scale performance.
  - **say_wot_again** (8↑): They used [Perception Encoder](https://ai.meta.com/research/publications/perception-encoder-the-best-visual-embeddings-are-not-at-the-output-of-the-network/) as the base of their backbone because it has a text encoder that's aligned during pretraining, which works better for deep linguistic understanding for prompts than just taking a vision-only model like DINO or the MAE-trained Hiera and then bolting on an LLM and attempting to align in post training.

In appendix A1 table 11 they compare Perception Encoder to both DINO v2-L and the Hiera-L backbone used by SAM2, with an unaligned language model for the latter two. On both their Segment Anything Concepts dataset and on COCO-O (for out of distribution robustness checks),they find that Perception Encoder with an aligned language model greatly outperforms DINOv2, which in turn outperforms Hiera. While I'm also disappointed that the efficiency of hierarchical ViTs didn't carry the day here, their findings suggest that the hierarchical models don't have the same robustness and semantic understanding as pure ViTs.

And for high resolution, they DO use windowed attention (where an image of 1008 pixels is divided into 3x3 non-overlapping 336x336 chunks), with only four of the 32 layers doing full global attention.
- **aloser** (11↑): We've spent the last few weeks building SAM3 into Roboflow; the model is really good. You can try it out in a playground, use it for auto-labeling datasets, fine-tuning, auto-distillation, & via API today via our platform & open source ecosystem: [https://blog.roboflow.com/sam3/](https://blog.roboflow.com/sam3/)
- **justcuriousaboutshit** (3↑): Seems like a software update and not a new model
  - **currentscurrents** (21↑): According to the paper, it is a new model with a slightly different architecture and a larger dataset.
  - **schludy** (16↑): Text prompting in SAM2 was very experimental and the public model didn't support it. Now the public model seems to have it, which is a pretty big step for a lot of practitioners.
    - **KateSaenko** (7↑): SAM2 never had text prompts. The SAM 1 paper had a proof-of-concept example of prompting with a CLIP text embedding, but the capability was not fully developed or released. However before SAM 3, there have been several papers that combined SAM with object detectors, like GroundedSAM.
- **Efficient-Relief3890** (1↑): It's fascinating to watch SAM develop into a more cohesive organization. The ability to combine text and exemplar images for segmentation and tracking makes the "concept prompt" approach seem like a logical next step.  
  
The most impressive aspect, in my opinion, is the dataset scale (4M concept labels with hard negatives). In real-world scenarios where the previous SAM models had specificity issues, that alone can change performance.  
  
It's also good to see tracking and detection combined under a single framework rather than piecing together disparate models. I'm curious to see how it performs in situations other than carefully chosen benchmarks, such as cluttered scenes, unconventional viewpoints, and lengthy video sequences where identity drift frequently occurs.  
  
Overall, it appears to be a significant advancement, particularly for video PCS.
- **sunshinecheung** (1↑): cool
- **ChrisManson963** (1↑): Great job!
