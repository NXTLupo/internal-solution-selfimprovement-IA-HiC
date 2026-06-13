---
id: social-intelligence/reddit-deep/machinelearning/1kki38w.md
url: "https://www.reddit.com/r/MachineLearning/comments/1kki38w/r_continuous_thought_machines_neural_dynamics_as/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[R] Continuous Thought Machines: neural dynamics as representation."
author: "Gramious"
date: "2025-05-12T02:46:34.000Z"
score: 136
upvote_ratio: 0.95
num_comments: 49
flair: "Research"
extracted_at: "2026-05-11T17:27:06.577Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1kki38w.md#c0"
    char_span: [0, 2145]
    sentence_count: 8
    key_terms: [https, representation, ctm, continuous, neural, thought, sakana, continuous-thought-machines]
    token_count: 512
  - id: "social-intelligence/reddit-deep/machinelearning/1kki38w.md#c1"
    char_span: [2147, 4168]
    sentence_count: 7
    key_terms: [ctm, tasks, internal, classification, intelligence, calibration, challenging, work]
    token_count: 395
  - id: "social-intelligence/reddit-deep/machinelearning/1kki38w.md#c2"
    char_span: [4182, 6159]
    sentence_count: 17
    key_terms: [mazes, difficult, solving, problem, plausibility, challenging, like, biological]
    section: Comments
    token_count: 476
  - id: "social-intelligence/reddit-deep/machinelearning/1kki38w.md#c3"
    char_span: [6161, 8191]
    sentence_count: 9
    key_terms: [time, models, asking, reason, like, genuinely, gradients, hobbyists]
    section: Comments
    token_count: 469
  - id: "social-intelligence/reddit-deep/machinelearning/1kki38w.md#c4"
    char_span: [8193, 10235]
    sentence_count: 18
    key_terms: [space, representations, "they're", imagination, frequency, engineer, probably, research]
    section: Comments
    token_count: 432
  - id: "social-intelligence/reddit-deep/machinelearning/1kki38w.md#c5"
    char_span: [10237, 12610]
    sentence_count: 13
    key_terms: [llm, language, ctm, model, module, computation, pathfinding, algorithms]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/machinelearning/1kki38w.md#c6"
    char_span: [12322, 13472]
    sentence_count: 11
    key_terms: [gramious, synapse, featurisation, model, use, dimension, slowest, models]
    section: Comments
    token_count: 286
  - id: "social-intelligence/reddit-deep/machinelearning/1kki38w.md#c7"
    char_span: [13477, 13801]
    sentence_count: 3
    key_terms: [synchronization, architecture, interested, multimodal, dimension, fine-tune, accurate, distinct]
    section: Comments
    token_count: 74
---
# [R] Continuous Thought Machines: neural dynamics as representation.

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1kki38w/r_continuous_thought_machines_neural_dynamics_as/)
Posted by **Gramious** · **136↑** · **49 comments**

[Try our interactive maze-solving demo: https:\/\/pub.sakana.ai\/ctm\/](https://preview.redd.it/j8eyab3dl90f1.png?width=3770&format=png&auto=webp&s=63ec8c85ecf4ea6661fd5ca8a74da8eb0d97204c)

# Continuous Thought Machines

* **arXiv:** [https://arxiv.org/abs/2505.05522](https://arxiv.org/abs/2505.05522)
* **Interactive Website:** [https://pub.sakana.ai/ctm/](https://pub.sakana.ai/ctm/)
* **Blog Post:** [https://sakana.ai/ctm/](https://sakana.ai/ctm/)
* **GitHub Repo:** [https://github.com/SakanaAI/continuous-thought-machines](https://github.com/SakanaAI/continuous-thought-machines)

Hey r/MachineLearning!

We're excited to share our new research on **Continuous Thought Machines (CTMs)**, a novel approach aiming to bridge the gap between computational efficiency and biological plausibility in artificial intelligence. We're sharing this work openly with the community and would love to hear your thoughts and feedback!

**What are Continuous Thought Machines?**

Most deep learning architectures simplify neural activity by abstracting away temporal dynamics. In our paper, we challenge that paradigm by reintroducing neural timing as a foundational element. The Continuous Thought Machine (CTM) is a model designed to leverage neural dynamics as its core representation.

**Core Innovations:**

The CTM has two main innovations:

1. **Neuron-Level Temporal Processing:** Each neuron uses unique weight parameters to process a history of incoming signals. This moves beyond static activation functions to cultivate richer neuron dynamics.
2. **Neural Synchronization as a Latent Representation:** The CTM employs neural synchronization as a direct latent representation for observing data (e.g., through attention) and making predictions. This is a fundamentally new type of representation distinct from traditional activation vectors.

**Why is this exciting?**

Our research demonstrates that this approach allows the CTM to:

* **Perform a diverse range of challenging tasks:** Including image classification, solving 2D mazes, sorting, parity computation, question-answering, and RL tasks.
* **Exhibit rich internal representations:** Offering a natural avenue for interpretation due to its internal process.
* **Perform tasks requirin sequential reasoning.**
* **Leverage adaptive compute:** The CTM can stop earlier for simpler tasks or continue computing for more challenging instances, without needing additional complex loss functions.
* **Build internal maps:** For example, when solving 2D mazes, the CTM can attend to specific input data without positional embeddings by forming rich internal maps.
* **Store and retrieve memories:** It learns to synchronize neural dynamics to store and retrieve memories beyond its immediate activation history.
* **Achieve strong calibration:** For instance, in classification tasks, the CTM showed surprisingly strong calibration, a feature that wasn't explicitly designed for.

**Our Goal:**

It is crucial to note that our approach advocates for borrowing concepts from biology rather than insisting on strict, literal plausibility. We took inspiration from a critical aspect of biological intelligence: that **thought takes time**.

The aim of this work is to share the CTM and its associated innovations, rather than solely pushing for new state-of-the-art results. We believe the CTM represents a significant step toward developing more biologically plausible and powerful artificial intelligence systems. We are committed to continuing work on the CTM, given the potential avenues of future work we think it enables.

We encourage you to check out the paper, [interactive demos on our project page](https://pub.sakana.ai/ctm/), and the open-source [code repository](https://github.com/SakanaAI/continuous-thought-machines). We're keen to see what the community builds with it and to discuss the potential of neural dynamics in AI!

## Comments

- **Robonglious** (12↑): I think this is really cool. I tried to do something like this with an Echo State Network a while ago.
- **currentscurrents** (53↑): >Solving mazes is a challenging task for machines [27, 20, 28], where only the current bleeding edge models perform well on fairly simple mazes.

It’s really not challenging. People have been training neural networks to solve mazes since the 90s.

It’s only hard for LLMs, since maze solving is completely unrelated to text prediction. It’s surprising they can even solve simple mazes.
  - **Htnamus** (11↑): But the problem of mazes can range from easy to difficult based on the input and available information. Completely observable mazes could be easy, but partially observable mazes are very difficult. RL is especially bad because exploration is difficult.

I'm still reading the paper to see how hard the evaluation environments were.
  - **Tiny_Arugula_5648** (28↑): No idea why you'd act like this is a solved problem. Maybe someone gave you toy example for a class/tutorial that made it seem easier than it is.. RNNs struggle with long term dependency solving large mazes.

Feel free to correct me, post a notebook of you solving a Pycolab T-Maze
    - **[deleted]** (3↑): What's so difficult about the maze problem? Don't you just have to keep moving along one side? Isn't that the standard answer?
- **serge_cell** (14↑): If biological plausibility would arise unintentionally that would be valuable insight.  But what is the point of artificially enforcing biological plausibility? What benefit does it give?
  - **Hannibaalism** (11↑): i think these fields tend to progress by observing and mimicking nature first, if you look at the history of NNs, ML or even AI as a whole
    - **serge_cell** (24↑): Those field started to progress then researcher *stopped* mimicking nature. Like flying machines become practical then they stop trying to flap wings.
  - **qwertz_guy** (6↑): >What benefit does it give?

how about a decade of state-of-the-art image perception models (CNNs)?
    - **serge_cell** (7↑): CNN is  convolution + nonlinearity. It started to work then NN stopped to try mimic biology.
    - **parlancex** (4↑): I would argue that CNNs are a _counter-example_ to biology providing the forward path. There is no known or plausible theory for weight-sharing mechanisms in real brains, which is really the entire crux of the convolutional method.
- **officeStallion** (2↑): Is there any reason that this wouldnt suffer from exploding/vanishing gradients like other recurrent models?
  - **Gramious** (5↑): Great question!


Yes.


The NLMs are high order models (not first order, as a regular internally recurrent model would be), meaning that the gradient flowing backwards in time has 25x (for example, if you set the memory to 25) more entry points (think of them like skip connections) back in time. 


+ The MLP structure of NLMs grounds the model in time in a way that enables more structured gradients (I have time series experience, and that helped drive this research).


The reason we really struggled to get LSTM baseline models to match CTMs was likely influenced by these problems, which is evidence for my preceding points.
- **Chronicle112** (4↑): How does this work relate to spiking neural networks?
  - **Tiny_Arugula_5648** (-9↑): Can you explain why you're asking about SNN.. they're not really a thing yet.. they require exotic neuromorphic hardware that barely exists otherwise they are terribly inefficient on C/GPU due to sync hardware trying to run async calculations.. no this project doesn't relate to SNN.

I've noticed that its hobbyists & gamers keep bringing it up (often randomly or off topic)  for some reason.. was it mentioned in a game or something? Genuinely asking not trying to argue.
    - **lostinthellama** (7↑): The implications of your statement (hobbyists and gamers ask about this one thing all the time!) make it seem like you are _not_ genuinely asking. If you were, you would say

> I keep seeing SNN's come up in all of these threads but, based on my understanding, they're not a good path to explore right now due to hardware limitations. Is there something I am missing? Why do you see them as related?

As to *why* someone could see them as related, it is probably because they're both approaches that claim to be biologically inspired, so it would be rational for someone who is not from the field to ask how they're similar.
- **ryunuck** (2↑): This is an amazing research project and close to my own research and heart!!! Have you seen the works on NCA? There was one NCA that was made by a team for solving mazes. I think the computational qualities offered by the autoregressive LLM is probably very efficient for what it currently does best, but as people have remarked it struggles to achieve "true creativity", it feels like humans have to take it out of distribution or drive it into new places of latent space. I don't think synthetic data is necessarily the solution for everything, it simply makes the quality we want accessible in the low frequency space of the model. We are still not accessing high frequency corners, mining the concept of our reality for new possibilities. It seems completely ludicrous to have a machine that has P.HD level mastery over all of our collective knowledge, yet it can't catapult us a hundred years into the future in the snap of a finger. Wheres' all that wit at? Why do users have the prompt engineer models and convince them they are gods or teach them how to be godly? Why do we need to prompt engineer at all? I think the answer lies in the lack of imagination. We have created intelligence without imagination!! The model doesn't have a personal space where it can run experiments. I'm not talking about context space, I'm talking about spatial representations. Representations in one dimension don't have the same quality as a 2D representation, the word "square" is not like an actual square in a canvas, no matter how rich and contextualized it is in the dataset. 

Definitely the next big evolution of the LLM I think is a model which has some sort of an "infinity module" like this. A LLM equipped with this infinity module wouldn't try to retrofit a CTM to one dimensional sequential thought. Instead you would make a language model version of a 2D grid and put problems into it. Each cell of your language CTM is a LLM embedding vector, for example the tokens for "wall" and "empty" which for many many common words there is a mapping to just 1 token. The CTM would learn to navigate and solve spatial representations of the world that are assembled out of language fragments, the same tokens used by the LLM. The old decoder parts of the autoregressive LLM now take the input from this module grid and is fine-tuned in order to be able to interpret and "explain" what is inside the 2D region. So if you ask a next-gen LLM to solve a maze, it would first embed it into a language CTM and run it until it's solved, then read out an interpretation of the solution, "turn left, walk straight for 3, then turn right" etc. It's not immediately clear how this would lead to AGI or super-intelligence or anything that a LLM of today couldn't do, but I'm sure it would do something unique and surely there would be some emergent capabilities worth studying. It maybe wouldn't even need to prompt the language CTM with a task, because the task may be implicit from token semantics employed alone. (space, wall, start, goal --> pathfinding) However the connection between visual methods and spatial relationships to language allows both users and the model itself to compose process specific search processes and algorithms, possibly groking algorithms and mathematics in a new interactive way that we haven't seen before like a computational sandbox. For example the CTM could be trained on a variety of pathfinding methods, and then you could ask it to do a weird cross between dijsktra and some other algorithm. It would be a pure computation model. But more interestingly a LLM with this computation model has an imagination space, a sandbox that it can play inside and experiment, possibly some interesting reinforcement learning possibilities there. We saw how O3 would cost a thousand dollar per arc-agi problem, clearly we are missing a fundamental component...
- **moschles** (1↑): /u/Gramious     are you one of the authors?
  - **Gramious** (6↑): I am the first author, yes.
- **critical_pancake** (1↑): Hi! Fantastic work. What is the slowest step in the run time of this? How many parameters do your models have?
  - **Gramious** (2↑): Sorry for the delay in answer you. What do you mean by the "slowest step"? I think that the featurisation (e.g., through a ResNet) is about as slow as 50 or so internal ticks after featurisation.
- **corkorbit** (1↑): This is fascinating. What inspired you to use a MLP as a synapse model? Does synchronization emerge as a result of this choice or the timing dimension, or both? Thanks u/Gramious !
  - **Gramious** (1↑): One can use a linear projection instead, but the MLP gives us a dimension to scale and it certainly benefits some problems to use a stronger synapse model. The idea is that the synapse model somehow 'models' the complexity in synapses. 

  
The timing dimension and NLMs help keep neurons as distinct elements, but synchronization does not 'emerge'. It is more accurate to say that it is utilized.
- **10086or10001** (1↑): I'm very interested in this architecture and am trying to fine-tune it. How soon is the language or multimodal version expected to be released
