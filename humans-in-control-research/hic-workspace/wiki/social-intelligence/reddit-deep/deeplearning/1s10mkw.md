---
id: social-intelligence/reddit-deep/deeplearning/1s10mkw.md
url: "https://www.reddit.com/r/deeplearning/comments/1s10mkw/structured_6band_json_prompts_beat_chainofthought/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Structured 6-band JSON prompts beat Chain-of-Thought, Few-Shot, and 7 other techniques in head-to-head tests"
author: "Financial_Tailor7944"
date: "2026-03-22T23:21:02.000Z"
score: 0
upvote_ratio: 0.36
num_comments: 7
flair: ""
extracted_at: "2026-05-11T17:26:50.055Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1s10mkw.md#c0"
    char_span: [0, 1900]
    sentence_count: 3
    key_terms: [structured, prompt, specificity, chain-of-thought, analysis, format, tables, deeplearning]
    token_count: 498
  - id: "social-intelligence/reddit-deep/deeplearning/1s10mkw.md#c1"
    char_span: [1902, 2345]
    sentence_count: 3
    key_terms: [https, paper, doi, spec, reconstruction, peer-reviewed, reproducible, mdalexandre]
    token_count: 111
  - id: "social-intelligence/reddit-deep/deeplearning/1s10mkw.md#c2"
    char_span: [2359, 4525]
    sentence_count: 18
    key_terms: [model, real, format, method, tasks, json, like, test]
    section: Comments
    token_count: 503
---
# Structured 6-band JSON prompts beat Chain-of-Thought, Few-Shot, and 7 other techniques in head-to-head tests

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1s10mkw/structured_6band_json_prompts_beat_chainofthought/)
Posted by **Financial_Tailor7944** · **0↑** · **7 comments**

I tested 10 common prompt engineering techniques against a structured JSON format across identical tasks (marketing plans, code debugging, legal review, financial analysis, medical diagnosis, blog writing, product launches, code review, ticket classification, contract analysis).

**The setup:** Each task was sent to Claude Sonnet twice — once with a popular technique (Chain-of-Thought, Few-Shot, System Prompt, Mega Prompt, etc.) and once with a structured 6-band JSON format that decomposes every prompt into PERSONA, CONTEXT, DATA, CONSTRAINTS, FORMAT, and TASK.

**The metrics** (automated, not subjective):

- **Specificity** (concrete numbers per 100 words): Structured won 8/10 — avg 12.0 vs 7.1
- **Hedge-free output** (zero "I think", "probably", "might"): Structured won 9/10 — near-zero hedging
- **Structured tables in output**: 57 tables vs 4 for opponents across all 10 battles
- **Conciseness**: 46% fewer words on average (416 vs 768)

**Biggest wins:**

- vs Chain-of-Thought on debugging: 21.5 specificity vs 14.5, zero hedges vs 2, 67% fewer words
- vs Mega Prompt on financial analysis: 17.7 specificity vs 10.1, zero hedges, 9 tables vs 0
- vs Template Prompt on blog writing: 6.8 specificity vs 0.1 (55x more concrete numbers)

**Why it works (the theory):** A raw prompt is 1 sample of a 6-dimensional specification signal. By Nyquist-Shannon, you need at least 2 samples per dimension (= 6 bands minimum) to avoid aliasing. In LLM terms, aliasing = the model fills missing dimensions with its priors — producing hedging, generic advice, and hallucination.

The format is called sinc-prompt (after the sinc function in signal reconstruction). It has a formal JSON schema, open-source validator, and a peer-reviewed paper with DOI.

- Spec: https://tokencalc.pro/spec
- Paper: https://doi.org/10.5281/zenodo.19152668
- Code: https://github.com/mdalexandre/sinc-llm

The battle data is fully reproducible — same model, same API, same prompts. Happy to share the test script if anyone wants to replicate.

## Comments

- **necroforest** (1↑): Lmao nyquist Shannon?? Crank slop
  - **Financial_Tailor7944** (1↑): It is all love for you
- **Agitated_Space_672** (1↑): The metrics measured do not necessarily mean that this method improves results. Are there any experiments using this on real tasks or benchmarks?


The model still has to guess what you want when it generates json object.
  - **Financial_Tailor7944** (1↑): The 10 tasks in the test were real tasks, not synthetic benchmarks: marketing plans, code debugging, legal review, financial analysis, medical diagnosis, blog writing, product launches, code review, ticket classification, and contract analysis. Each ran on Claude Sonnet with automated scoring, not opinion.

On your second point: the model doesn't generate the JSON. You write it. The 6-band structure is the input format, not the output. You fill in persona, context, data, constraints, format, and task before sending.   
  
The model receives 6 explicit dimensions instead of guessing them from a single sentence. It's a spec you write, not a response the model produces.

please go to this website to test it out : [tokencalc.pro](http://tokencalc.pro)
- **valuat** (1↑): For reproducibility, you could include the data scripts in the repo as well. Full experiment. You could even add the option to use open-weight models with vLLM or ollama. You’ll get more visibility (and stars) if people can test it themselves right out of the box
  - **Financial_Tailor7944** (1↑): thank you so much, gonna do that right now
- **nian2326076** (0↑): Looks like you've done a thorough comparison! For interview prep, focusing on how you structure your responses is really important. The 6-band JSON format you mentioned is kind of like how people use the STAR method for behavioral interviews, breaking experiences into situation, task, action, and result. If you're trying out different techniques, it might help to practice with real interview questions to see which method helps you communicate your thoughts best. Using a resource like [PracHub](https://prachub.com?utm_source=reddit) to do mock interviews can help you figure out what works well in real situations.
