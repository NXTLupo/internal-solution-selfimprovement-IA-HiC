---
url: "https://www.reddit.com/r/MachineLearning/comments/1kr9w8l/p_openevolve_open_source_implementation_of/"
url_hash: "5ffff3ee23"
kind: "article"
source: "Reddit Deep: r/machinelearning"
title: "[P] OpenEvolve: Open Source Implementation of DeepMind's AlphaEvolve System"
author: ""
date: "2025-05-20T16:54:04.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:35:06.211302+00:00"
chars: 5675
---

# [P] OpenEvolve: Open Source Implementation of DeepMind's AlphaEvolve System

Source: [Reddit Deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1kr9w8l/p_openevolve_open_source_implementation_of/)

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

--- TOP COMMENTS ---
[62↑ newjeison] Damn it's only been a week
[13↑ Plaetean] This community is so insane
[23↑ Imnimo] How does the circle packing you found compare to the previously-known state of the art?

https://erich-friedman.github.io/packing/cirRsqu/
[12↑ JustOneAvailableName] https://github.com/codelion/openevolve/blob/main/examples/circle_packing/circle_packing_460.png I guess it's this one. Both are (rounded) 2.634+
[8↑ asankhs] I was able to replicate the Google DeepMinds 2.635 which is the new SOTA. The number and a figure is from what was generated during the run. The actual program that it came up with has an optimization phase as mentioned in the example’s readme so running it a few times will produce different results. One of those was 2.635 but I didn’t have the visualize on for it so couldn’t capture it.
[1↑ Ok-Look2421] I find it curious that the optimal packing method has symmetry. I suppose that makes sense though.
[10↑ asankhs] Thanks for the interest everyone! Several of you asked about how OpenEvolve implements genetic algorithms with LLMs, so I wanted to share some technical details:

Unlike traditional GAs, OpenEvolve reimagines the core evolutionary operators:

\*\*Mutation:\*\* Instead of random bit flips, we use LLMs as sophisticated mutation operators. In \`controller.py\`, our LLM ensemble generates targeted code modifications or full rewrites based on the problem context and previous attempts.

\*\*Selection:\*\* Implemented in \`database.py\`, we use a combination of MAP-Elites (maintaining diversity across feature dimensions) and island-based populations. This gives us both exploration and exploitation - crucial for breaking through optimization plateaus.

\*\*Crossover:\*\* Rather than explicit bit-swapping, crossover happens implicitly. We provide the LLM with multiple parent programs as "inspiration", and the model's understanding of code allows it to combine concepts in ways traditional crossover operators never could.

\*\*Fitness Evaluation:\*\* Our cascade evaluation system (in \`evaluator.py\`) implements a multi-stage process where promising solutions gradually undergo more intensive testing.

The most exciting part? Traditional mutation operators would never discover \`scipy.minimize\` on their own, but our LLM-driven evolution found it naturally after exploring simpler geometric approaches first.

If you're implementing your own version or extending OpenEvolve, check out \`database.py\` (selection) and \`controller.py\` (mutation) to see our approach in more detail!
[7↑ Rotcod] Cool project!

I wonder if the requirement for low latency is because you are doing one sample per step? Given the evolutionary style algorithm I'd have thought you could do many steps & evaluations in parallel. Pretty sure FunSearch, the predecessor, could! What are your plans for the project?
