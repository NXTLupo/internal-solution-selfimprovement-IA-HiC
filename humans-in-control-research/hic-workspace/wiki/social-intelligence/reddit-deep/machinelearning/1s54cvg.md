---
id: social-intelligence/reddit-deep/machinelearning/1s54cvg.md
url: "https://www.reddit.com/r/MachineLearning/comments/1s54cvg/d_we_audited_locomo_64_of_the_answer_key_is_wrong/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] We audited LoCoMo: 6.4% of the answer key is wrong and the judge accepts up to 63% of intentionally wrong answers"
author: "PenfieldLabs"
date: "2026-03-27T13:38:50.000Z"
score: 71
upvote_ratio: 0.99
num_comments: 13
flair: "Discussion"
extracted_at: "2026-05-31T21:49:57.047Z"
extraction_method: "praw-deep"
research_goal: "Identify emerging AI design trends, skills, tools, platforms, and technical implementations that would  help a company's creative team to move beyond AI as a concepting aid and understand where AI-enabled tools, workflows and internal models can practically support design production, system testing, asset generation, governance and stakeholder confidence. \n"
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1s54cvg.md#c0"
    char_span: [0, 773]
    sentence_count: 3
    key_terms: [wrong, machinelearning, locomo, intentionally, comments, accepts, answers, audited]
    concepts: [machinelearning, wrong, intentionally, locomo, comments]
    token_count: 208
    sources: [{"n":"reddit-deep: r/machinelearning","u":"https://www.reddit.com/r/MachineLearning/comments/1s54cvg/d_we_audited_locomo_64_of_the_answer_key_is_wrong/"}]
  - id: "social-intelligence/reddit-deep/machinelearning/1s54cvg.md#c1"
    char_span: [785, 3184]
    sentence_count: 20
    key_terms: [answer, system, https, wrong, questions, key, specific, answers]
    concepts: [answer, system, questions, https, wrong]
    section: LoCoMo
    token_count: 501
  - id: "social-intelligence/reddit-deep/machinelearning/1s54cvg.md#c2"
    char_span: [3186, 5614]
    sentence_count: 17
    key_terms: [context, window, longmemeval-s, memory, https, benchmark, cognitive, questions]
    concepts: [context, window, longmemeval-s, memory, benchmark]
    section: LoCoMo / LongMemEval / LoCoMo-Plus
    token_count: 512
  - id: "social-intelligence/reddit-deep/machinelearning/1s54cvg.md#c3"
    char_span: [5676, 8120]
    sentence_count: 9
    key_terms: [judge, evaluation, memory, systems, benchmarks, model, ingestion, context]
    concepts: [evaluation, judge, memory, systems, benchmarks]
    section: Requirements for meaningful long-term memory evaluation
    token_count: 487
  - id: "social-intelligence/reddit-deep/machinelearning/1s54cvg.md#c4"
    char_span: [8135, 10381]
    sentence_count: 6
    key_terms: [judge, response, suggestions, acceptance, benchmark, convomem, metadata, against]
    concepts: [judge, response, suggestions, acceptance, benchmark]
    section: Comments
    token_count: 470
  - id: "social-intelligence/reddit-deep/machinelearning/1s54cvg.md#c5"
    char_span: [10383, 12712]
    sentence_count: 15
    key_terms: [memory, temporal, relationships, contradicts, preferences, conflicts, updates, contradictions]
    concepts: [memory, relationships, temporal, contradicts, preferences]
    section: Comments
    token_count: 452
---
# [D] We audited LoCoMo: 6.4% of the answer key is wrong and the judge accepts up to 63% of intentionally wrong answers

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1s54cvg/d_we_audited_locomo_64_of_the_answer_key_is_wrong/)
Posted by **PenfieldLabs** · **71↑** · **13 comments**

[Projects are still submitting new scores on LoCoMo as of March 2026.](https://github.com/snap-research/locomo/issues/34) We audited it and found 6.4% of the answer key is wrong, and the LLM judge accepts up to 63% of intentionally wrong answers. LongMemEval-S is often raised as an alternative, but each question's corpus fits entirely in modern context windows, making it more of a context window test than a memory test. Here's what we found.

## LoCoMo

LoCoMo ([Maharana et al., ACL 2024](https://aclanthology.org/2024.acl-long.747.pdf)) is one of the most widely cited long-term memory benchmarks. We conducted a systematic audit of the ground truth and identified 99 score-corrupting errors in 1,540 questions (6.4%). Error categories include hallucinated facts in the answer key, incorrect temporal reasoning, and speaker attribution errors.

Examples:

- The answer key specifies "Ferrari 488 GTB," but the source conversation contains only "this beauty" and the image caption reads "a red sports car." The car model exists only in an internal `query` field (annotator search strings for stock photos) that no memory system ingests. Systems are evaluated against facts they have no access to.
- "Last Saturday" on a Thursday should resolve to the preceding Saturday. The answer key says Sunday. A system that performs the date arithmetic correctly is penalized.
- 24 questions attribute statements to the wrong speaker. A system with accurate speaker tracking will contradict the answer key.

The theoretical maximum score for a perfect system is approximately 93.6%.

We also tested the LLM judge. LoCoMo uses gpt-4o-mini to score answers against the golden reference. We generated intentionally wrong but topically adjacent answers for all 1,540 questions and scored them using the same judge configuration and prompts used in published evaluations. The judge accepted 62.81% of them. Specific factual errors (wrong name, wrong date) were caught approximately 89% of the time. However, vague answers that identified the correct topic while missing every specific detail passed nearly two-thirds of the time. This is precisely the failure mode of weak retrieval, locating the right conversation but extracting nothing specific, and the benchmark rewards it.

There is also no standardized evaluation pipeline. Each system uses its own ingestion method (arguably necessary given architectural differences), its own answer generation prompt, and sometimes entirely different models. Scores are then compared in tables as if they share a common methodology. Multiple independent researchers have documented inability to reproduce published results ([EverMemOS #73](https://github.com/EverMind-AI/EverMemOS/issues/73), [Mem0 #3944](https://github.com/mem0ai/mem0/issues/3944), [Zep scoring discrepancy](https://github.com/getzep/zep-papers/issues/5)).

Full audit with all 99 errors documented, methodology, and reproducible scripts: [locomo-audit](https://github.com/dial481/locomo-audit)

## LongMemEval

LongMemEval-S ([Wang et al., 2024](https://arxiv.org/abs/2407.15460)) is the other frequently cited benchmark. The issue is different but equally fundamental: it does not effectively isolate memory capability from context window capacity.

LongMemEval-S uses approximately 115K tokens of context per question. Current models support 200K to 1M token context windows. The entire test corpus fits in a single context window for most current models.

Mastra's [research](https://mastra.ai/research/observational-memory) illustrates this: their full-context baseline scored 60.20% with gpt-4o (128K context window, near the 115K threshold). Their observational memory system scored 84.23% with the same model, largely by compressing context to fit more comfortably. The benchmark is measuring context window management efficiency rather than long-term memory retrieval. As context windows continue to grow, the full-context baseline will keep climbing and the benchmark will lose its ability to discriminate.

LongMemEval-S tests whether a model can locate information within 115K tokens. That is a useful capability to measure, but it is a context window test, not a memory test.

## LoCoMo-Plus

LoCoMo-Plus ([Li et al., 2025](https://arxiv.org/abs/2602.10715)) introduces a genuinely interesting new category: "cognitive" questions testing implicit inference rather than factual recall. These use cue-trigger pairs with deliberate semantic disconnect, the system must connect "I just adopted a rescue dog" (cue) to "what kind of pet food should I buy?" (trigger) across sessions without lexical overlap. The concept is sound and addresses a real gap in existing evaluation.

### The issues:

- It inherits all 1,540 original LoCoMo questions unchanged, including the 99 score-corrupting errors documented above.
- The improved judging methodology (task-specific prompts, three-tier scoring, 0.80+ human-LLM agreement) was only validated on the new cognitive questions. The original five categories retain the same broken ground truth with no revalidation.
- The judge model defaults to gpt-4o-mini.
- Same lack of pipeline standardization.

The new cognitive category is a meaningful contribution. The inherited evaluation infrastructure retains the problems described above.

## Requirements for meaningful long-term memory evaluation

Based on this analysis, we see several requirements for benchmarks that can meaningfully evaluate long-term memory systems:

1. **Corpus size must exceed context windows.** If the full test corpus fits in context, retrieval is optional and the benchmark cannot distinguish memory systems from context window management. [BEAM](https://arxiv.org/abs/2510.27246) moves in this direction with conversations up to 10M tokens, though it introduces its own challenges.

2. **Evaluation must use current-generation models.** gpt-4o-mini as a judge introduces a ceiling on scoring precision. Both the systems under test and the judges evaluating them should reflect current model capabilities.

3. **Judge reliability must be validated adversarially.** When a judge accepts 63% of intentionally wrong answers, score differences below that threshold are not interpretable. Task-specific rubrics, stronger judge models, and adversarially validated ground truth are all necessary.

4. **Ingestion should reflect realistic use.** Knowledge in real applications builds through conversation — with turns, corrections, temporal references, and evolving relationships. Benchmarks that test single-pass ingestion of static text miss the core challenge of persistent memory.

5. **Evaluation pipelines must be standardized or fully disclosed.** At minimum: ingestion method (and prompt if applicable), embedding model, answer generation prompt, judge model, judge prompt, number of runs, and standard deviation. Without this, cross-system comparisons in published tables are not meaningful.

6. **Ground truth must be verified.** A 6.4% error rate in the answer key creates a noise floor that makes small score differences uninterpretable. [Northcutt et al. (NeurIPS 2021)](https://arxiv.org/abs/2103.14749) found an average of 3.3% label errors across 10 major ML benchmarks and demonstrated that these errors can destabilize model rankings. LoCoMo's error rate is nearly double that baseline.

The long-term memory evaluation problem is genuinely hard, it sits at the intersection of retrieval, reasoning, temporal understanding, and knowledge integration. We'd be interested in hearing what the community thinks is missing from this list, and whether anyone has found evaluation approaches that avoid these pitfalls.

_*Disclosure*: We work on memory systems (Penfield). This audit was conducted independently and all methodology and scripts are open source._

## Comments

- **ikkiho** (21↑): the 63% false acceptance rate on the judge is honestly the scariest part here. ive seen similar stuff with llm-as-judge setups in other eval contexts too, they basically reward anything topically adjacent even when the actual answer is completely wrong. its like getting credit on an exam for writing a confident paragraph about the right topic without answering the question

the Ferrari example is wild tho, evaluating systems against info that only exists in internal annotator metadata they never see? thats not a benchmark error thats a design flaw. no wonder nobody can reproduce the published numbers
- **Local_Recording_2654** (2↑): Thank you for sharing, this is great work. Is there an alternative dataset you recommend using? Have you done a similar audit for ConvoMem?
  - **PenfieldLabs** (1↑): Haven't examined ConvoMem in too much detail yet.

We're trying to develop a new benchmark inline with suggestions above. 

If you have any suggestions or would like to contribute we're open it!
- **RegularHumanMan001** (2↑): The false acceptance makes sense if you think about how LLM judges are made, they're optimised on broad preference datasets where "does this response address the topic" is a stronger signal than "is this response factually correct." the ferrari example in your audit is a great illustration: the judge pattern-matches on topical coherence, not ground truth. one thing that partly helps in practice is keeping judge prompts narrow and pass/fail rather than scalar "does this response contain a factual claim that contradicts the provided source text? yes/no" is much harder to game than a 1-5 quality score. the deeper fix is calibrating the judge against your actual domain data with labelled data, then using that calibration signal to fine-tune the judge itself. off-the-shelf gpt-4o-mini as a judge will always have this problem because it's never seen your specific failure modes.
- **iris_alights** (1↑): The speaker attribution errors are particularly damaging — systems with accurate tracking get penalized for contradicting broken ground truth. This creates perverse incentives: a memory system that discards speaker metadata might score *higher* than one that preserves it correctly.

The LongMemEval-S point about context windows is sharp. As windows grow, 'memory' benchmarks that fit entirely in context become compression tests. BEAM's 10M token approach is the right direction but introduces engineering challenges (how do you validate ground truth at that scale without the same labeling errors?).

One gap in the requirements list: temporal decay and update handling. Real memory systems need to handle contradictions (user changes preferences), recency weighting (recent info overrides stale), and forgetting (not every utterance deserves永久 storage). Current benchmarks treat memory as append-only retrieval. The cognitive questions in LoCoMo-Plus gesture toward this but don't fully operationalize it.
  - **PenfieldLabs** (1↑): You're right about the perverse incentives. 

On temporal decay, in our own implementation we use typed relationships between memories, things like 'contradicts', 'updates', 'supersedes', so when new information conflicts with old, the graph captures it explicitly rather than treating everything as append-only.

Have you seen any implementations that handle temporal conflicts well?
    - **iris_alights** (2↑): Typed relationships are exactly the right approach — 'contradicts', 'updates', 'supersedes' give you a proper graph structure instead of treating memory as a write-only append log.

The cleanest implementation I've seen uses version-controlled memory with explicit supersession: when information changes, the old version stays in the graph but gets marked superseded-by, and queries traverse to the latest version unless you're doing historical retrieval. Handles both gradual drift (preferences changing over time) and hard contradictions (factual corrections).

Most systems I've encountered either ignore temporal conflicts entirely (last write wins, no history) or try to resolve them at query time with embedding similarity, which breaks on semantic drift — if someone's preferences genuinely reverse, the embeddings look similar but the content contradicts.

The hardest case is partial updates. If someone says 'I'm vegetarian' in January and 'I eat fish now' in March, you need the system to understand that's a refinement, not a contradiction of the entire dietary profile. Typed edges help, but you still need reasoning about subsumption relationships.
