---
id: social-intelligence/reddit-deep/machinelearning/1q6igw3.md
url: "https://www.reddit.com/r/MachineLearning/comments/1q6igw3/p_reengineered_the_fuzzypattern_tsetlin_machine/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[P] Re-engineered the Fuzzy-Pattern Tsetlin Machine from scratch: 10x faster training, 34x faster inference (32M+ preds/sec) & capable of text generation"
author: "ArtemHnilov"
date: "2026-01-07T15:33:08.000Z"
score: 33
upvote_ratio: 0.9
num_comments: 13
flair: "Project"
extracted_at: "2026-05-11T17:27:06.579Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1q6igw3.md#c0"
    char_span: [0, 1859]
    sentence_count: 6
    key_terms: [training, tsetlin, faster, inference, machinelearning, implementation, fuzzy-pattern, optimizations]
    token_count: 466
  - id: "social-intelligence/reddit-deep/machinelearning/1q6igw3.md#c1"
    char_span: [1865, 2749]
    sentence_count: 4
    key_terms: [shall, https, com, prince, code, come, king, optimization]
    token_count: 241
  - id: "social-intelligence/reddit-deep/machinelearning/1q6igw3.md#c2"
    char_span: [2763, 3808]
    sentence_count: 5
    key_terms: [symbolic-discrete, artemhnilov, plausible, generate, millions, model, cpu, hdc]
    section: Comments
    token_count: 275
  - id: "social-intelligence/reddit-deep/machinelearning/1q6igw3.md#c3"
    char_span: [3810, 4946]
    sentence_count: 5
    key_terms: [artemhnilov, character-level, tsetlin, generation, machines, binary, arxiv, https]
    section: Comments
    token_count: 304
---
# [P] Re-engineered the Fuzzy-Pattern Tsetlin Machine from scratch: 10x faster training, 34x faster inference (32M+ preds/sec) & capable of text generation

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1q6igw3/p_reengineered_the_fuzzypattern_tsetlin_machine/)
Posted by **ArtemHnilov** · **33↑** · **13 comments**

Hi everyone,

I’ve recently finished re-engineering the Fuzzy-Pattern Tsetlin Machine (FPTM) from the ground up. My goal was to leverage low-level optimizations to see just how much throughput I could squeeze out of the architecture.

The results are pretty wild. By focusing on cache locality and SIMD instructions, the new implementation is up to **10× faster in training** and **34× faster in inference** compared to the original FPTM.

**MNIST Benchmarks (Ryzen 7950X3D):**

* ⚡ **Throughput:** 4 GB/s
* 🧠 **Inference:** 32M+ predictions/sec (98% accuracy)
* ⏱️ **Training:** 1000 training epochs in just 11 seconds

**Key Engineering Optimizations:**  
To get this performance, I focused on:

* Extensive use of Bitwise operations and SIMD instructions.
* A specialized, cache-friendly memory layout.
* BitSet indexing over literals for handling very large, sparse binary vectors.
* Automatic selection of UInt8/UInt16 TA states.
* Model "compilation" to minimize memory overhead.

**Why speed matters (Generative Tsetlin Machines):**  
Because this implementation is so efficient, it is now practical to explore generative tasks with Tsetlin Machines. I implemented a character-level text generator using FPTM with HDC hypervectors and Monte Carlo sparse context subsampling.

Here is the raw output from the model generating text in the style of Shakespeare:

    ROMEO:
    The father's death,
    And then I shall be so;
    For I have done that was a queen,
    That I may be so, my lord.
    
    JULIET:
    I would have should be so, for the prince,
    And then I shall be so;
    For the princely father with the princess,
    And then I shall be the virtue of your soul,
    Which your son,--
    
    ESCALUS:
    What, what should be particular me to death.
    
    BUCKINGHAM:
    God save the queen's proclaim'd:
    Come, come, the Duke of York.
    
    KING EDWARD IV:
    So do I do not know the prince,
    And then I shall be so, and such a part.
    
    KING RICHARD III:
    Shall I be some confess the state,
    Which way the sun the prince's dead;
    And then I will be so.

  
**Code & Examples:**  
The code is open source and available here:  
[https://github.com/BooBSD/Tsetlin.jl](https://www.google.com/url?sa=E&q=https%3A%2F%2Fgithub.com%2FBooBSD%2FTsetlin.jl)

I’d love to hear your thoughts on the optimization approach or the generative output!

## Comments

- **Medium_Compote5665** (3↑): If a symbolic-discrete model can generate plausible text and run at tens of millions of preds per second on the CPU,
then the space of “viable” models is larger than we care to admit.
  - **ArtemHnilov** (-1↑): Can you share a link to a symbolic-discrete model that can generate plausible text and run at tens of millions of predictions per second on CPU, please?
    - **Medium_Compote5665** (3↑): https://github.com/BooBSD/Tsetlin.jl
Tell me what you think of this.
- **CireNeikual** (3↑): Great work! The combination of FPTM and HDC/VSA sounds very interesting to me, and it looks like it gets some neat results too! Do you think it might be worth going all the way and re-writing this in C? Also, which HDC/VSA are you using, I have found that BSDC-SEG codes work particularly well.
  - **ArtemHnilov** (8↑): An ML researcher from AstraZeneca rewrote my previous implementation in Rust, but it didn't yield any significant performance gains. Julia is already nearly as fast as C/C++/Rust/Zig for this workload.

For the Shakespeare character-level text generation example, I used basic dense binary HDC hypervectors.
- **__Maximum__** (2↑): First time hearing this. What is this FPTM?
  - **ArtemHnilov** (1↑): [https://arxiv.org/pdf/2508.08350](https://arxiv.org/pdf/2508.08350)
- **1deasEMW** (2↑): Tm was never broadly adopted. Was this more for practice/fun or do you plan to scale tm, kinda like how some ppl did for rkwv
  - **ArtemHnilov** (5↑): Until recently, the common claim was that Tsetlin Machines were only useful for binary classification. I’ve now achieved nearly 95% test accuracy on the Fashion-MNIST dataset, demonstrated character-level text generation, and trained contextual word embeddings using Fuzzy-Pattern Tsetlin Machine that show arithmetic-like relationships (e.g., *King − Man + Woman ≈ Queen*). Tsetlin Machines clearly have more potential than they’re often given credit for — it is just that not many people are actively researching them.
    - **1deasEMW** (2↑): I’ll check your repo, sounds like an interesting wor
- **Chocolate_Pickle** (4↑): Did an LLM generate this post?
  - **ArtemHnilov** (5↑): Proofread.
