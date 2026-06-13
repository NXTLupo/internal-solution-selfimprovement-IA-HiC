---
id: articles/reddit-deep-r-machinelearning/cce859eccb.md
url: "https://www.reddit.com/r/MachineLearning/comments/1lh741j/d_rlgrpo_for_lossless_compression_of_text/"
url_hash: "cce859eccb"
kind: "article"
source: "Reddit Deep: r/machinelearning"
title: "[D] RL/GRPO for lossless compression of text passages into 'least token representation', then using this emergent 'language' as the basis for reasoning instead of english"
author: ""
date: "2025-06-21T21:18:36.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:35:39.848178+00:00"
chars: 6677
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "articles/reddit-deep-r-machinelearning/cce859eccb.md#c0"
    char_span: [0, 2080]
    sentence_count: 12
    key_terms: [compression, machinelearning, english, tokens, demonstration, model, capability, experiment]
    token_count: 439
  - id: "articles/reddit-deep-r-machinelearning/cce859eccb.md#c1"
    char_span: [2082, 4445]
    sentence_count: 19
    key_terms: [model, language, compress, context, message, something, user, sample]
    token_count: 513
  - id: "articles/reddit-deep-r-machinelearning/cce859eccb.md#c2"
    char_span: [4447, 5803]
    sentence_count: 9
    key_terms: [hidden, tokens, token, space, state, mapping, weights, states]
    token_count: 286
  - id: "articles/reddit-deep-r-machinelearning/cce859eccb.md#c3"
    char_span: [5806, 6996]
    sentence_count: 7
    key_terms: [tokens, model, compression, dimensional, continuous, understand, radarsat1, thought]
    token_count: 236
---
# [D] RL/GRPO for lossless compression of text passages into 'least token representation', then using this emergent 'language' as the basis for reasoning instead of english

Source: [Reddit Deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1lh741j/d_rlgrpo_for_lossless_compression_of_text/)

Hi folks, I came up with a thought experiment recently that I cannot stop obsessing over. I have shared this with people. Everybody skims through it for a couple minute and then calls me schizophrenic. I feel isolated and unfortunately feel that I am in fact losing my mind because people do not interact honestly with my ideas. If you know of any theorems, papers or principles in ML that clearly disprove my concept, it could be very therapeutic for me as well. Why don't I simply write the code and try it out? It's a complicated RL setup and I have to bend the libraries a bit to implement it fully.

Here goes nothing...

---

The goal of this experiment is to train a model to take any token sequence, and reduce it to fewer tokens such that the hidden states remain analogous, i.e. a perfect lossless mapping exists back to english. How few tokens does it take to represent any given piece of information? Can the polysemic quality of tokens be augmented?

**Demonstration in GPT-4**

Attached to the post is a *real* demonstration of this capability being elicited by prompting as far back as GPT-4 in 2023. It proves that the capability is present in some capacity within the pre-trained models, on standby for reinforcement and amplification.

**Training Method**

We train a LLM to develop internal symbolic languages for compression:

* `<compress>`: Model learns to compress underlying meaning/message of arbitrary text samples (wikipedia articles, code, etc.) into symbolic representations.
* `<decompress>`: Same model reconstructs original english meaning from symbols
* Reward compression efficiency, reconstruction fidelity, and embedding varentropy metrics that pressure towards saturating the available semantic bandwidth.

RL goes like this:

1. Context (A): User message asks model to compress a given sample of information pulled at random from a dataset. Assistant replies and is prefixed with <compress> similar to training a reasoner where the output is prefixed with <think>.,
2. Context (B): User message asks model to decompress the given output from (A). Assistant replies with information in english,
3. Context (C): user message asks some other unrelated static model to compare initial sample to decompressed sample, and produce a list of deviations and inaccuracies.,
4. *\[optional\]* Contexts (A) and (B) are rewritten so the user message is the simplest possible operator usage pattern ("compress/decompress this")
5. Apply GRPO to rollouts and backpropagate gradients for contexts (A) and (B), rewarding shorter compression length whilst factoring in (C)'s penalties.

This dual-task RL environment perhaps results in a 'strange attractor' dynamic. In order for the decompression task to succeed, it needs to form a meta-model (i.e. metacognition) of how then language model compresses language.

This preliminary capability can then be used to compress arbitrary context window, removing redundancies, etc. The model's compression of tokens could also be steered. Because this is only step one. If you have seen the DeepSeek-R1-zero model, we discover that LLMs trained with RL without a reward on keeping to a single language results in the model discovering an extremely alien reasoning process. It effectively anneals grammar, syntax, and the partitioned notion of different human languages to wield everything at once.

What I suggest is that we first focus on developing the language by compressing, *then* we have SFT to constrain the model onto this newly discovered language.

yay or nay? 😟

--- TOP COMMENTS ---
[28↑ fooazma] Nobody (including OP) seems to care about critical meaning loss in the compress-uncompress chain. The original (last sentence) says, correctly, that untyped can do more (in fact it can do anything a TM can do). The reconstructed version says the goal is to do more that what the untyped calculus could. Nope, this is not the goal. It all comes down to a tiny change in a grammatical particle "more of something" versus "more than something".
[20↑ chulpichochos] My guy, not exactly the same, but Microsoft published something very similar two years ago:

https://github.com/microsoft/LLMLingua

It uses a small LlM to prune / compress by removing tokens that are only for human use and not salient for attention.
[33↑ divided_capture_bro] You'll never get a one to one mapping since no two tokens have identical embeddings. The ability to map to a lower dimensional token space relies on this.
[-8↑ psychonucks] One token individually yes, but the sum of the whole is more than the parts. After the embedding comes the hidden states. Imagine that the weights and hidden state together represent a dynamical continuous space. Thus the embedding-space of tokens is not encoding meaning, but rather a space of operations that can update or mutate the hidden state wrt to the dynamic of the weights, and this is what actually becomes the logits over the token vocabulary. All this to say: entirely different tokens and paragraphs can mean just about the same thing. The tokens simply activate an 'image' or 'world' inside the hidden states which is the real abstract message. The logic of each token operation over this hidden state is itself conditionally defined by the context up until it, which is very powerful.
[15↑ divided_capture_bro] The continuity is what bites you for actual 1:1 mapping between token sequences.


Look up "undercomplete autoencoder invertability" for why this sort of thing won't work. 


It will be hard for people to supply proofs for your exact question since this is more or less common knowledge. You will not get unique mappings from a lower dimensional space into a higher dimensional one.
[5↑ radarsat1] i feel like while the idea may have some merit, it may be already superseded by continuous chain of thought, which similarly develops its own thought tokens but leaves them in continuous space instead of sampling
[2↑ psychonucks] Indeed. I think both approaches might hold equivalent power for reasoning. But, tokens are more easily exchangeable and transplantable. Perhaps we can do a second experiment where we train with a reward constraint so that another model not trained for this can still understand it through few-shot prompting. Or, maybe training the model to describe its compression scheme in the optimal way so that any past LLM can zero-shot understand. Near instant capability upgrade / free lunch to all existing AI infrastructure and models without any new code or model.
[1↑ radarsat1] unironically I wonder how far you could get using codes derived from just applying zip compression to a lot of relevant text and assigning visible tokens to them
