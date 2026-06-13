---
id: articles/reddit-anthropic/67e6d4ecfb.md
url: "https://reddit.com/r/Anthropic/comments/1sj9558/mythos_is_mostly_hype_also_the_bugs_it_found_were/"
url_hash: "67e6d4ecfb"
kind: "article"
source: "reddit: anthropic"
title: "Mythos is Mostly Hype... (also the bugs it found were mostly unexploitable and exaggerated...)"
author: ""
date: "2026-04-12T08:44:12.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T13:52:21.544811+00:00"
chars: 3512
industries: [ai_research, saas]
industry_method: llm
chunks:
  - id: "articles/reddit-anthropic/67e6d4ecfb.md#c0"
    char_span: [0, 1652]
    sentence_count: 1
    key_terms: [anthropics-claude-mythos-isnt-a-sentient-super-hacker-its-a-sales-pitch-claims-of-thousands-of-severe-zero-days-rely-on-just-198-manual-reviews, claude-mythos-isnt-a-sentient-super-hacker-its-a-sales-pitch-claims-of-thousands-of-severe-zero-days-rely-on-just-198-manual-reviews, https, ai-cybersecurity-after-mythos-the-jagged-frontier, com, tomshardware, anthropic, artificial-intelligence]
    token_count: 509
  - id: "articles/reddit-anthropic/67e6d4ecfb.md#c1"
    char_span: [1654, 3738]
    sentence_count: 9
    key_terms: [models, anthropic, vulnerability, exploits, e2f78c7ec1655fedd945366151ba54fcb9580508, exploit, https, open-source]
    token_count: 476
---
# Mythos is Mostly Hype... (also the bugs it found were mostly unexploitable and exaggerated...)

Source: [reddit: anthropic](https://reddit.com/r/Anthropic/comments/1sj9558/mythos_is_mostly_hype_also_the_bugs_it_found_were/)

Source: [https://www.tomshardware.com/tech-industry/artificial-intelligence/anthropics-claude-mythos-isnt-a-sentient-super-hacker-its-a-sales-pitch-claims-of-thousands-of-severe-zero-days-rely-on-just-198-manual-reviews](https://www.tomshardware.com/tech-industry/artificial-intelligence/anthropics-claude-mythos-isnt-a-sentient-super-hacker-its-a-sales-pitch-claims-of-thousands-of-severe-zero-days-rely-on-just-198-manual-reviews)

Free access: [https://clearthis.page/?u=https%3A%2F%2Fwww.tomshardware.com%2Ftech-industry%2Fartificial-intelligence%2Fanthropics-claude-mythos-isnt-a-sentient-super-hacker-its-a-sales-pitch-claims-of-thousands-of-severe-zero-days-rely-on-just-198-manual-reviews](https://clearthis.page/?u=https%3A%2F%2Fwww.tomshardware.com%2Ftech-industry%2Fartificial-intelligence%2Fanthropics-claude-mythos-isnt-a-sentient-super-hacker-its-a-sales-pitch-claims-of-thousands-of-severe-zero-days-rely-on-just-198-manual-reviews)

Source 2: [https://aisle.com/blog/ai-cybersecurity-after-mythos-the-jagged-frontier](https://aisle.com/blog/ai-cybersecurity-after-mythos-the-jagged-frontier)

Key quotes:

\- Anthropic's blog and [verbose 250-page report](https://www-cdn.anthropic.com/8b8380204f74670be75e81c820ca8dda846ab289.pdf) on the model... includes over **20 pages** of Anthropic staff waxing lyrically about their novel impressions of the new model and its **"fondness for particular philosophers."**

\- Alongside the repeated suggestions from Anthropic and its staff that we should be concerned, nay, terrified, of what AI like Claude Mythos can do, they repeatedly suggest they're **unsure if this new AI is conscious.**

\- In the case of the FFMPeg vulnerability that has existed for 16 years, [**Anthropic's own analysis**](https://red.anthropic.com/2026/mythos-preview/) of the release suggested **"This bug ultimately is not a critical severity vulnerability," and "would be challenging to turn this vulnerability into a functioning exploit."**

\- Mythos reportedly found several potential exploits in the Linux kernel, but was **unable to exploit any of them** because of Linux's defense-in-depth [security](https://www.tomshardware.com/tag/security) systems. A number of the exploits had also been [recently patched, too,](https://github.com/torvalds/linux/commit/e2f78c7ec1655fedd945366151ba54fcb9580508) making it rather confusing why they were included in the total.

\- We took the specific vulnerabilities Anthropic showcases in their announcement, isolated the relevant code, and ran them through small, cheap, open-weights models. Those models recovered much of the same analysis. **Eight out of eight models detected Mythos's flagship FreeBSD exploit, including one with only 3.6 billion active parameters costing $0.11 per million tokens.** A 5.1B-active open model recovered the core chain of the 27-year-old OpenBSD bug.

TL;DR: Thousands of zero-days is false because most of the bugs were unexploitable or low-severity and they also only verified less than 200 of the bugs and extrapolated from there. Their research paper is mostly marketing hype. Eight cheap open-source models were able to find their exploits.

There is one impressive thing here: An AI model can parse through a complex open-source project. However, with a month and endless compute, there's no doubt Opus could do the same. Unfortunately, **Anthropic never compared models directly (hmm why would they not compare models directly, that's kind of the whole point...?)** so we'll never know.
