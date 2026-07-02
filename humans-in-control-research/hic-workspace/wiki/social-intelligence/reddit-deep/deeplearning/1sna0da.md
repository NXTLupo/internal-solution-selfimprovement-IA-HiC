---
id: social-intelligence/reddit-deep/deeplearning/1sna0da.md
url: "https://www.reddit.com/r/deeplearning/comments/1sna0da/i_evolved_the_structure_of_llm_reasoning_chains/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "I evolved the structure of LLM reasoning chains using evolutionary algorithms"
author: "Prudent-Delay4909"
date: "2026-04-16T17:18:17.000Z"
score: 0
upvote_ratio: 0.33
num_comments: 2
flair: ""
extracted_at: "2026-05-11T17:26:50.058Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1sna0da.md#c0"
    char_span: [0, 1862]
    sentence_count: 7
    key_terms: [reasoning, evolutionary, tree-of-thought, evolved, hand-designed, deeplearning, dags, structures]
    concepts: [reasoning, evolutionary, tree-of-thought, hand-designed, evolved]
    token_count: 473
    sources: [{"n":"reddit-deep: r/deeplearning","u":"https://www.reddit.com/r/deeplearning/comments/1sna0da/i_evolved_the_structure_of_llm_reasoning_chains/"}]
  - id: "social-intelligence/reddit-deep/deeplearning/1sna0da.md#c1"
    char_span: [1876, 3847]
    sentence_count: 10
    key_terms: [dags, random, parallelism, call-matched, nodes, node, baselines, branching]
    concepts: [random, parallelism, call-matched, nodes, baselines]
    section: Comments
    token_count: 452
---
# I evolved the structure of LLM reasoning chains using evolutionary algorithms

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1sna0da/i_evolved_the_structure_of_llm_reasoning_chains/)
Posted by **Prudent-Delay4909** · **0↑** · **2 comments**

Sharing a small research project I just published as a free preprint.

**Problem:** Chain-of-Thought, Tree-of-Thought, Graph-of-Thought - all use reasoning structures designed by humans. What if we searched for the structure automatically?

**Approach I have taken:** I encoded reasoning strategies as DAGs (directed acyclic graphs) and evolved them. Nodes = reasoning operations (decompose, verify, solve, compare). Edges = information flow. Used standard evolutionary operators - mutation, crossover, tournament selection.

**Key result:** On a 1.5B parameter model (Qwen-2.5-1.5B), evolved topologies matched hand-designed Tree-of-Thought (both 0.720) and crushed random DAGs (0.360) and linear chains (0.420). The interesting part is that evolution independently discovered parallel branching structures without ever being shown one.

**Honest/Real limitations:**

* Small model, synthetic math problems (not GSM8K/MATH)
* Ties hand-designed baselines, doesn't beat them
* 5 runs, modest population sizes
* Call-matched random DAGs also scored 0.700, which needs more investigation

Total compute: \~97 minutes on a free Colab T4. Full code included - you can reproduce everything.

📄 [https://zenodo.org/records/19614078](vscode-file://vscode-app/private/var/folders/bg/40x_z89d6_j_t16f0888s5x80000gn/T/AppTranslocation/65C6966B-7A99-464F-88CE-D1B41A11BA3D/d/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html)

Looking for feedback, especially from anyone who has worked with structured reasoning or evolutionary search.

## Comments

- **Scared-Tax4747** (1↑): Pretty cool that evolution rediscovered parallel branching on its own - that's the kind of emergent behavior that makes these experiments worth doing even when they just tie baselines

  
The call-matched random DAGs hitting 0.700 is definitely suspicious though, makes me wonder if there's something about the problem setup that's making structure less important than expected. Did you control for the number of reasoning steps or just total API calls?

  
Also curious about the mutation operators you used - were you just randomly adding/removing edges or did you have more sophisticated graph mutations? With only 97 minutes on a T4 the search space seems pretty constrained
  - **Prudent-Delay4909** (1↑): yes, the emergent parallelism is what kept me going even when the numbers didn't blow past the baselines.

also good catch on the CM-Random thing, and I want to be clear about it, I controlled for total LLM calls (node count), not reasoning depth. So the call-matched random DAGs had the same number of nodes (4) as RTE-Best. you are right that this is a problem: with 4 nodes and random edges, a lot of those random DAGs are going to end up with some accidental branching just by the geometry of small graphs. There aren't that many ways to wire 4 nodes into a DAG, and most of them aren't purely linear.

So the honest/clean version is like: the "topology matters" story is very strong when you compare evolved structures against *linear chains* (0.720 vs 0.420) or against random DAGs of *varying* sizes (0.720 vs 0.360). But within the narrow slice of 4-node DAGs specifically, yeah, structure seems to matter less or more precisely, most 4-node DAGs already have enough parallelism to do okay. That is actually an interesting finding in itself (maybe "parallelism is easy to stumble into at small scale"), but it does weaken the narrative and I should dig into it more. A depth-controlled comparison would be a much better test.
