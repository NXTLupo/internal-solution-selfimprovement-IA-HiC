---
id: social-intelligence/reddit-deep/machinelearning/1kr9w8l.md
url: "https://www.reddit.com/r/MachineLearning/comments/1kr9w8l/p_openevolve_open_source_implementation_of/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[P] OpenEvolve: Open Source Implementation of DeepMind's AlphaEvolve System"
author: "asankhs"
date: "2025-05-20T16:54:04.000Z"
score: 216
upvote_ratio: 0.99
num_comments: 54
flair: "Project"
extracted_at: "2026-05-11T17:27:06.573Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c0"
    char_span: [0, 592]
    sentence_count: 3
    key_terms: [alphaevolve, machinelearning, implementation, "deepmind's", openevolve, comments, source, system]
    token_count: 142
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c1"
    char_span: [617, 1194]
    sentence_count: 3
    key_terms: [programs, using, program, code, llms, modifications, context-rich, continuously]
    section: What is OpenEvolve?
    token_count: 111
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c2"
    char_span: [1223, 1573]
    sentence_count: 1
    key_terms: [gemini-flash-2, works, openai-compatible, multi-objective, checkpointing, optimization, distributed, engineering]
    section: What makes it special?
    token_count: 84
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c3"
    char_span: [1616, 2318]
    sentence_count: 3
    key_terms: [optimization, evolved, arrangements, mathematical, minimization, successfully, alphaevolve, constrained]
    section: "We replicated AlphaEvolve's results!"
    token_count: 131
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c4"
    char_span: [2349, 2661]
    sentence_count: 1
    key_terms: [openai-compatible, api, claude-sonnet-3, gemini-flash-2, architecture, generations, inference, cerebras]
    section: LLM Performance Insights
    token_count: 77
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c5"
    char_span: [2684, 3083]
    sentence_count: 2
    key_terms: [openevolve, github, codelion, https, com, examples, main, tree]
    section: "Try it yourself!"
    token_count: 99
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c6"
    char_span: [3098, 5309]
    sentence_count: 10
    key_terms: [openevolve, crossover, operators, packing, optimization, traditional, evaluation, implements]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c7"
    char_span: [5311, 7327]
    sentence_count: 12
    key_terms: [openevolve, optillm, own, different, funsearch, codelion, mutation, parallel]
    section: Comments
    token_count: 461
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c8"
    char_span: [7329, 9140]
    sentence_count: 8
    key_terms: [openevolve, asankhs, mutation, program, gemini-flash-2, evolve, using, controller]
    section: Comments
    token_count: 467
  - id: "social-intelligence/reddit-deep/machinelearning/1kr9w8l.md#c9"
    char_span: [9142, 10122]
    sentence_count: 3
    key_terms: [openevolve, codelion, github, https, blob, com, open, controller]
    section: Comments
    token_count: 266
---
# [P] OpenEvolve: Open Source Implementation of DeepMind's AlphaEvolve System

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1kr9w8l/p_openevolve_open_source_implementation_of/)
Posted by **asankhs** · **216↑** · **54 comments**

Hey everyone! I'm excited to share **OpenEvolve**, an open-source implementation of Google DeepMind's AlphaEvolve system that I recently completed. For those who missed it, AlphaEvolve is an evolutionary coding agent that DeepMind announced in May that uses LLMs to discover new algorithms and optimize existing ones.

## What is OpenEvolve?

OpenEvolve is a framework that **evolves entire codebases** through an iterative process using LLMs. It orchestrates a pipeline of code generation, evaluation, and selection to continuously improve programs for a variety of tasks.

The system has four main components:
- **Prompt Sampler**: Creates context-rich prompts with past program history
- **LLM Ensemble**: Generates code modifications using multiple LLMs
- **Evaluator Pool**: Tests generated programs and assigns scores
- **Program Database**: Stores programs and guides evolution using MAP-Elites inspired algorithm

## What makes it special?

- **Works with any LLM** via OpenAI-compatible APIs
- **Ensembles multiple models** for better results (we found Gemini-Flash-2.0-lite + Gemini-Flash-2.0 works great)
- **Evolves entire code files**, not just single functions
- **Multi-objective optimization** support
- **Flexible prompt engineering**
- **Distributed evaluation** with checkpointing

## We replicated AlphaEvolve's results!

We successfully replicated two examples from the AlphaEvolve paper:

### Circle Packing
Started with a simple concentric ring approach and evolved to discover mathematical optimization with scipy.minimize. We achieved 2.634 for the sum of radii, which is 99.97% of DeepMind's reported 2.635!

The evolution was fascinating - early generations used geometric patterns, by gen 100 it switched to grid-based arrangements, and finally it discovered constrained optimization.

### Function Minimization
Evolved from a basic random search to a full simulated annealing algorithm, discovering concepts like temperature schedules and adaptive step sizes without being explicitly programmed with this knowledge.

## LLM Performance Insights

For those running their own LLMs:
- Low latency is critical since we need many generations
- We found Cerebras AI's API gave us the fastest inference
- For circle packing, an ensemble of Gemini-Flash-2.0 + Claude-Sonnet-3.7 worked best
- The architecture allows you to use any model with an OpenAI-compatible API

## Try it yourself!

GitHub repo: [https://github.com/codelion/openevolve](https://github.com/codelion/openevolve)

Examples:
- [Circle Packing](https://github.com/codelion/openevolve/tree/main/examples/circle_packing)
- [Function Minimization](https://github.com/codelion/openevolve/tree/main/examples/function_minimization)

I'd love to see what you build with it and hear your feedback. Happy to answer any questions!

## Comments

- **newjeison** (62↑): Damn it's only been a week
  - **Plaetean** (13↑): This community is so insane
- **Imnimo** (23↑): How does the circle packing you found compare to the previously-known state of the art?

https://erich-friedman.github.io/packing/cirRsqu/
  - **JustOneAvailableName** (12↑): https://github.com/codelion/openevolve/blob/main/examples/circle_packing/circle_packing_460.png I guess it's this one. Both are (rounded) 2.634+
  - **asankhs** (8↑): I was able to replicate the Google DeepMinds 2.635 which is the new SOTA. The number and a figure is from what was generated during the run. The actual program that it came up with has an optimization phase as mentioned in the example’s readme so running it a few times will produce different results. One of those was 2.635 but I didn’t have the visualize on for it so couldn’t capture it.
    - **Ok-Look2421** (1↑): I find it curious that the optimal packing method has symmetry. I suppose that makes sense though.
- **asankhs** (10↑): Thanks for the interest everyone! Several of you asked about how OpenEvolve implements genetic algorithms with LLMs, so I wanted to share some technical details:

Unlike traditional GAs, OpenEvolve reimagines the core evolutionary operators:

\*\*Mutation:\*\* Instead of random bit flips, we use LLMs as sophisticated mutation operators. In \`controller.py\`, our LLM ensemble generates targeted code modifications or full rewrites based on the problem context and previous attempts.

\*\*Selection:\*\* Implemented in \`database.py\`, we use a combination of MAP-Elites (maintaining diversity across feature dimensions) and island-based populations. This gives us both exploration and exploitation - crucial for breaking through optimization plateaus.

\*\*Crossover:\*\* Rather than explicit bit-swapping, crossover happens implicitly. We provide the LLM with multiple parent programs as "inspiration", and the model's understanding of code allows it to combine concepts in ways traditional crossover operators never could.

\*\*Fitness Evaluation:\*\* Our cascade evaluation system (in \`evaluator.py\`) implements a multi-stage process where promising solutions gradually undergo more intensive testing.

The most exciting part? Traditional mutation operators would never discover \`scipy.minimize\` on their own, but our LLM-driven evolution found it naturally after exploring simpler geometric approaches first.

If you're implementing your own version or extending OpenEvolve, check out \`database.py\` (selection) and \`controller.py\` (mutation) to see our approach in more detail!
- **Rotcod** (7↑): Cool project!

I wonder if the requirement for low latency is because you are doing one sample per step? Given the evolutionary style algorithm I'd have thought you could do many steps & evaluations in parallel. Pretty sure FunSearch, the predecessor, could! What are your plans for the project?
  - **newjeison** (3↑): The opensource code for FunSearch does not support distributed/parallel processing so the implementation would have to be done on your own.
- **Scew** (5↑): What are the hardware requirements?
  - **asankhs** (9↑): Openevolve will work on most local machines, the LLMs are accessed using OpenAI compatible api so you can use any public api or if you are hosting the model locally use an inference server like optiLLM or ollama.
- **__Maximum__** (3↑): What is different from AlphaEvolve that if added would make it significantly better?

And what  models have you used to replicate their sum of radii results? What else have you tried and failed?
  - **asankhs** (2↑): To improve on there are several directions we can consider. The focus at the moment is to see how we can make it more efficient as doing large experiments likely requires resources we lack. One quick way to see if we can improve the search by using test time compute with optillm - https://github.com/codelion/optillm

You can read about the experience replicating sum of radii results here - https://github.com/codelion/openevolve/tree/main/examples/circle_packing it required working in two phases with different config and system prompt. The models used were Gemini-Flash-2.0 as primary and Claude-Sonnet-3.7 as secondary. 

When running locally it is important to work with a LLM that has low latency. Other good combinations of models that worked for function minimisation example were models from Cerebras - Llama3-8B and Llama-4-Scout. By default using Gemini-Flash-2.0 and Gemini-Flash-2.0-Lite provides good balance for quick experimentation. 

You do need to iterate on the prompt and the abstraction you want to solve the problem. For example for the sum of radii it means evolving the program that searches for the solution vs the construction directly. Other things to keep track of is avoiding the model to return an already implemented algo from a standard library etc.
- **Sirisian** (2↑): Did you run it on your codebase?
  - **asankhs** (1↑): It is a tool to discover an evolve algorithms. You start with an initial program and then use openevolve to find the “best” implementation.
- **combasemsthefox** (2↑): Would be interested to see how many iterations you could do with the new speedy Gemini Diffusion
  - **asankhs** (3↑): Oh yes looking forward to it. I actually used Cerebras with OpenEvolve and having a model that can generate code instantly is very useful.
- **Effective-Law-4003** (2↑): I am interested to know how does it evolve is there a mutation or crossover operator or are high scoring solutions replacing low scoring and the Ilm refines them.
  - **asankhs** (1↑): We evolve the program by using the prompts to guide the process instead of using explicit mutation or crossover operator.
    - **asankhs** (2↑): In the code base you can see this is like a "mutation" -> [https://github.com/codelion/openevolve/blob/985591b3615b0cbcd6787693b171ec94ed3668d6/openevolve/controller.py#L182](https://github.com/codelion/openevolve/blob/985591b3615b0cbcd6787693b171ec94ed3668d6/openevolve/controller.py#L182)

The LLM ensemble receives multiple "inspiration" programs and t**he prompt itself** contains information from multiple programs, allowing the LLM to "recombine" ideas , this is like a crossover  -> [https://github.com/codelion/openevolve/blob/985591b3615b0cbcd6787693b171ec94ed3668d6/openevolve/controller.py#L167](https://github.com/codelion/openevolve/blob/985591b3615b0cbcd6787693b171ec94ed3668d6/openevolve/controller.py#L167)
- **just_redd_it** (2↑): Did anyone have success using open LLMs with that? The simple ones seems to produce invalid diff, which OpenEvolve just threw away. Is there an open model that works better?
  - **asankhs** (2↑): The function minimization example used open llms - [https://github.com/codelion/openevolve/blob/main/examples/function\_minimization/config.yaml#L9](https://github.com/codelion/openevolve/blob/main/examples/function_minimization/config.yaml#L9) I used them via cerebras though since the inference speed with their API is insane.
