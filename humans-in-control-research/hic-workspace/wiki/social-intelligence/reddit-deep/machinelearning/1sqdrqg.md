---
id: social-intelligence/reddit-deep/machinelearning/1sqdrqg.md
url: "https://www.reddit.com/r/MachineLearning/comments/1sqdrqg/sgocr_a_spatiallygrounded_ocrfocused_pipeline_v1/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "SGOCR: A Spatially-Grounded OCR-focused Pipeline & V1 Dataset [P]"
author: "Dreeseaw"
date: "2026-04-20T03:24:59.000Z"
score: 8
upvote_ratio: 0.91
num_comments: 26
flair: "Project"
extracted_at: "2026-05-11T17:27:06.574Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1sqdrqg.md#c0"
    char_span: [0, 1702]
    sentence_count: 6
    key_terms: [spatially-grounded, text, machinelearning, dataset, verification, flash, https, model]
    token_count: 413
  - id: "social-intelligence/reddit-deep/machinelearning/1sqdrqg.md#c1"
    char_span: [1704, 2542]
    sentence_count: 5
    key_terms: [looking, process, hyperparameter-searchy, less, loop, human-grounded, autoresearch, bootstrapped]
    token_count: 170
---
# SGOCR: A Spatially-Grounded OCR-focused Pipeline & V1 Dataset [P]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1sqdrqg/sgocr_a_spatiallygrounded_ocrfocused_pipeline_v1/)
Posted by **Dreeseaw** · **8↑** · **26 comments**

Hello everyone!

I've been independently researching & developing small-but-powerful vision-language models (VLMs) and noticed a gap in visual datasets - none were teaching my model to simply ground text in imagery, but trying to get it to reason about the text or about the scene itself. This lead me down a 2 week side-side-project to create SGOCR, an open source dataset pipeline for generating spatially-grounded, OCR-focused VQA tuples with tons of rich metadata to support diverse VLM training strategies. 

[Code](https://github.com/cothogonal/sgocr-dataset-pipeline)

[v1 dataset](https://huggingface.co/datasets/dreeseaw/SGOCR)

My development began with simply prompting Qwen2.5-VL locally and grew into a multi-stage beast. At one point, my OCR-stage looked for concensus between 3 text recognition models (Parseq), my anchor stage did the same between GroundingDino, Florence 2, and SAM 3.1, and verification required passes from both Gemini 3.1 Pro & ChatGPT 5.3 Codex to pass. I discovered that less is more in this case, and landed on using Nvidia's nemotron-ocr-v2 for text extraction, a combination of Gemma4 with a Qwen3-VL fallback for anchor discovery & labeling, and then gemini-2.5-flash as a teacher model with simple grounding checks for verification. I got away with using the smaller 2.5 Flash teacher model due to the highly grounded annotations provided in context allowing flash to focus on semantics. 

I utilized an agentic loop for development after first creating a dataset review frontend that would store my personal accept/reject/maybe marks to be referenced as human-grounded context later. I bootstrapped this process into a quality score that reflected the aspects of questions I accepted, and from there the rest was much easier to automate. I run a custom optimization loop agent, based on Karpathy's autoresearch (which I found a bit too hyperparameter-searchy), that uses a sweep-based process that allows better holisitc observation, an oppurtunity to make code changes, and less risks of good ideas dying earlier due to their evals being slightly less than another variant's. 

I'm looking for general feedback and interested if other people were looking for something like this, or building similar VLMs. Thanks for reading!
