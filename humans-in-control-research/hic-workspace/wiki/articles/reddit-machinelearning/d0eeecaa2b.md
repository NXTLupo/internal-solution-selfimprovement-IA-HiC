---
id: articles/reddit-machinelearning/d0eeecaa2b.md
url: "https://reddit.com/r/MachineLearning/comments/1p82cto/d_got_burned_by_an_apple_iclr_paper_it_was/"
url_hash: "d0eeecaa2b"
kind: "article"
source: "reddit: MachineLearning"
title: "[D] Got burned by an Apple ICLR paper — it was withdrawn after my Public Comment."
author: ""
date: "2025-11-27T13:35:17.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T13:52:13.861421+00:00"
chars: 3719
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "articles/reddit-machinelearning/d0eeecaa2b.md#c0"
    char_span: [0, 2304]
    sentence_count: 24
    key_terms: [paper, issue, bug, got, machinelearning, quality, hallucinations, model]
    token_count: 500
  - id: "articles/reddit-machinelearning/d0eeecaa2b.md#c1"
    char_span: [2306, 3939]
    sentence_count: 12
    key_terms: [paper, community, quality, irresponsible, been, reviewers, because, comment]
    token_count: 318
---
# [D] Got burned by an Apple ICLR paper — it was withdrawn after my Public Comment.

Source: [reddit: MachineLearning](https://reddit.com/r/MachineLearning/comments/1p82cto/d_got_burned_by_an_apple_iclr_paper_it_was/)

So here’s what happened. Earlier this month, a colleague shared an Apple paper on arXiv with me — it was also under review for ICLR 2026. The benchmark they proposed was perfectly aligned with a project we’re working on.

I got excited after reading it. I immediately stopped my current tasks and started adapting our model to their benchmark. Pulled a whole weekend crunch session to finish the integration… only to find our model scoring absurdly low.

I was really frustrated. I spent days debugging, checking everything — maybe I used it wrong, maybe there was a hidden bug. During this process, I actually found a critical bug in their official code:

* When querying the VLM, it only passed in the image path string, not the image content itself.

The most ridiculous part? After I fixed their bug, the model's scores got even lower!

The results were so counterintuitive that I felt forced to do deeper validation. After multiple checks, the conclusion held: fixing the bug actually made the scores worse.

At this point I decided to manually inspect the data. I sampled the first 20 questions our model got wrong, and I was shocked:

* **6 out of 20 had clear GT errors.**
* The pattern suggested the “ground truth” was model-generated with extremely poor quality control, leading to tons of hallucinations.
* Based on this quick sample, the GT error rate could be as high as **30%**.

I reported the data quality issue in a GitHub issue. After 6 days, the authors replied briefly and then immediately closed the issue. That annoyed me — I’d already wasted a ton of time, and I didn’t want others in the community to fall into the same trap — so I pushed back. Only then did they reopen the GitHub issue.

Then I went back and checked the examples displayed in the paper itself. Even there, I found at least *three* clear GT errors.

It’s hard to believe the authors were unaware of how bad the dataset quality was, especially when the paper claims all samples were reviewed by annotators. Yet even the examples printed in the paper contain blatant hallucinations and mistakes.

When the ICLR reviews came out, I checked the five reviews for this paper. Not a single reviewer noticed the GT quality issues or the hallucinations in the paper's examples.

So I started preparing a more detailed GT error analysis and wrote a Public Comment on OpenReview to inform the reviewers and the community about the data quality problems.

The next day — the authors withdrew the paper and took down the GitHub repo.

Fortunately, ICLR is an open conference with Public Comment. If this had been a closed-review venue, this kind of shoddy work would have been much harder to expose.

So here’s a small call to the community: For any paper involving model-assisted dataset construction, reviewers should spend a few minutes checking a few samples manually. We need to prevent irresponsible work from slipping through and misleading everyone.

Looking back, I should have suspected the dataset earlier based on two red flags:

* The paper’s experiments claimed that GPT-5 has been surpassed by a bunch of small open-source models.
* The original code, with a ridiculous bug, produced higher scores than the bug-fixed version.

But because it was a paper from Big Tech, I subconsciously trusted the integrity and quality, which prevented me from spotting the problem sooner.

This whole experience drained a lot of my time, energy, and emotion — especially because accusing others of bad data requires extra caution. I’m sharing this in hopes that the ML community remains vigilant and pushes back against this kind of **sloppy, low-quality, and irresponsible** behavior before it misleads people and wastes collective effort.
