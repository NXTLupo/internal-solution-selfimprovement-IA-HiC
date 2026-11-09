---
id: articles/marktechpost/b5cd1fbabe.md
url: "https://www.marktechpost.com/2026/10/07/liquid-ai-releases-open-weight-d1-3b-and-d1-omni-600m-multimodal-decision-models-with-zero-output-tokens/"
url_hash: "b5cd1fbabe"
kind: "article"
source: "MarkTechPost"
title: "Liquid AI Releases Open-Weight d1-3B and d1-omni-600M: Multimodal Decision Models With Zero Output Tokens"
author: ""
date: "Wed, 07 Oct 2026 18:23:45 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:49:14.240366+00:00"
chars: 6158
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:49:13.648Z"
relevance: 20
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "e8accb32f09c7901"
relevance_by_goal: {"aa6916010743":20}
chunks:
  - id: "articles/marktechpost/b5cd1fbabe.md#c0"
    char_span: [0, 278]
    sentence_count: 1
    key_terms: [liquid-ai-releases-open-weight-d1-3b-and-d1-omni-600m-multimodal-decision-models-with-zero-output-tokens, marktechpost, d1-omni-600m, open-weight, multimodal, decision, releases, liquid]
    concepts: [marktechpost]
    token_count: 88
    sources: [{"n":"MarkTechPost","u":"https://www.marktechpost.com/2026/10/07/liquid-ai-releases-open-weight-d1-3b-and-d1-omni-600m-multimodal-decision-models-with-zero-output-tokens/","kind":"article","date":"2026-10-07"}]
  - id: "articles/marktechpost/b5cd1fbabe.md#c1"
    char_span: [280, 2384]
    sentence_count: 23
    key_terms: [model, d1-omni-600m, decision, text, liquid, answer, d1-3b, reads]
    concepts: [model, d1-omni-600m, decision, liquid, answer]
    related_chunks: ["articles/marktechpost/b5cd1fbabe.md#c3"]
    token_count: 512
    sources: [{"n":"MarkTechPost","u":"https://www.marktechpost.com/2026/10/07/liquid-ai-releases-open-weight-d1-3b-and-d1-omni-600m-multimodal-decision-models-with-zero-output-tokens/","kind":"article","date":"2026-10-07"}]
  - id: "articles/marktechpost/b5cd1fbabe.md#c2"
    char_span: [2123, 4052]
    sentence_count: 19
    key_terms: [d1-3b, audio, benchmarks, encoder, d1-omni-600m, scores, averages, decision]
    concepts: [d1-3b, audio, benchmarks, d1-omni-600m, encoder]
    related_chunks: ["articles/marktechpost/b5cd1fbabe.md#c3"]
    token_count: 512
    sources: [{"n":"MarkTechPost","u":"https://www.marktechpost.com/2026/10/07/liquid-ai-releases-open-weight-d1-3b-and-d1-omni-600m-multimodal-decision-models-with-zero-output-tokens/","kind":"article","date":"2026-10-07"}]
  - id: "articles/marktechpost/b5cd1fbabe.md#c3"
    char_span: [3837, 5613]
    sentence_count: 22
    key_terms: [d1-3b, d1-omni-600m, takes, jetson, liquid, open, decision, question]
    concepts: [d1-3b, d1-omni-600m, takes, jetson, liquid]
    related_chunks: ["articles/marktechpost/b5cd1fbabe.md#c1", "articles/marktechpost/b5cd1fbabe.md#c2"]
    token_count: 512
    sources: [{"n":"d1-3B, d1-omni-600M, Decider 4B, Decider 35B-A3B, Winnow-12B model cards. Index ","u":""}]
  - id: "articles/marktechpost/b5cd1fbabe.md#c4"
    char_span: [5406, 6439]
    sentence_count: 9
    key_terms: [d1-omni-600m, intelligence, marktechpost, artificial, learning, platform, telegram, d1-3b]
    concepts: [d1-omni-600m, intelligence, marktechpost, artificial, learning]
    token_count: 238
    sources: [{"n":"MarkTechPost","u":"https://www.marktechpost.com/2026/10/07/liquid-ai-releases-open-weight-d1-3b-and-d1-omni-600m-multimodal-decision-models-with-zero-output-tokens/","kind":"article","date":"2026-10-07"}]
---
# Liquid AI Releases Open-Weight d1-3B and d1-omni-600M: Multimodal Decision Models With Zero Output Tokens

Source: [MarkTechPost](https://www.marktechpost.com/2026/10/07/liquid-ai-releases-open-weight-d1-3b-and-d1-omni-600m-multimodal-decision-models-with-zero-output-tokens/)

Liquid AI has released Open d1, two open-weight multimodal models in its d1 decision model family. d1-3B reads text and images. d1-omni-600M reads text with an image, or text with audio. Neither model writes text. Each returns calibrated, typed answers in one forward pass with zero output tokens. The target is real-time decisions on the NVIDIA stack: DGX servers, RTX workstations, and Jetson edge boards.
Is it deployable? Yes. Both checkpoints are on Hugging Face, load through Transformers, and have day-one llama.cpp support. The LFM Open License v1.0 allows free commercial use below $10 million in annual revenue. d1-omni-600M is an early research release with no published latency figures.
What is a decision model?
A generative LLM writes its answer token by token, and your code parses it. A decision model takes a state and a set of named questions. It reads them once and returns a probability for every allowed answer. The Liquid AI define three question types:
- noul: a yes or no question, returned as P(yes).
- choice: one label from named options, with a full probability distribution.
- score: a probability-weighted position on an ordered rubric of 2 to 10 levels.
Several questions can share one state in a single call. Every response reports output_tokens: 0. Liquid AI recommends d1 for routing, moderation, intent classification, reranking, LLM-as-a-judge scoring, agent guardrails, and visual inspection. Neither checkpoint is a chat model.
How are d1-3B and d1-omni-600M built?
d1-3B has 3.12B parameters and starts from LFM2.5-VL-3B, a decoder-only vision-language model. Liquid AI averaged the weights of LFM2.5-2.6B with that model’s text backbone. It then fine-tuned several checkpoints with different seeds and data mixtures, and merged them again. It uses a 400M SigLIP2 NaFlex vision encoder and a 32,768-token context. Long inputs, shuffled answer options, and fixing data shortcuts mattered more than advanced techniques.
d1-omni-600M has 587M parameters and starts from LFM2.5-Encoder-350M, a bidirectional encoder. That covers a 381M shared trunk and decision head, a 94M vision encoder, and a 112M audio encoder. The audio encoder is a 17-layer FastConformer. Context is 16,384 tokens. Audio clips are capped at 30 seconds. A request carries images or audio, never both. Audio training covered English speaker-to-assistant requests only.
Where does Open d1 fit best?
- Support and ticket triage: One d1-3B call can answer a yes or no refund check, pick the owning team, and rate urgency over the same message, with zero output tokens to parse.
- Real-time visual inspection and moderation at the edge: d1-3B reads a 384px image in 35 ms on Jetson AGX Thor, and Liquid AI’s Open d1 Arcade runs it frame by frame on live camera input for content moderation and gesture control.
- Voice-command routing on small devices: d1-omni-600M takes up to 30 seconds of speech alongside text and returns the speaker’s intent or topic directly. Its card lists voice-command routing and agent guardrails among its recommended uses.
How does d1 perform on benchmarks?
On Decision Index v0.2.1, d1-3B scores 48.57. That beats every model under 10B and edges Decider 35B-A3B (47.11). Only Winnow-12B scores higher at 50.02. Liquid AI ran the official scorer itself, so d1 scores are not leaderboard submissions. d1-3B leads the Tools (74.5) and Arts (36.3) categories but trails on Knowledge (23.8).
Across seven public text benchmarks, d1-3B averages 82.9, ahead of Decider 4B at 81.1. d1-omni-600M averages 78.4 and posts the top Civil Comments (95.8) and PAWS-X (79.5) scores. On 11 image benchmarks, d1-3B averages 74.1 against 73.9 for its base model. Liquid AI calls audio decision benchmarks an open problem.
How fast is d1-3B on NVIDIA hardware?
Liquid AI measured end-to-end latency, one warm request at a time. One question takes 8 ms on an RTX 4090 and 9 ms on an AMD MI325X. On Jetson, AGX Thor takes 16 ms, AGX Orin takes 26 ms, and Orin Nano takes 50 ms. On Jetson AGX Thor, three questions over one state take 20 ms versus 16 ms for one. The RTX 4090 figure uses model.compile(mode="reduce-overhead"). Without it, one question takes 16 ms. NVIDIA’s Jetson AI Lab also hosts d1-3B guides.
How does Open d1 compare with other open decision models?
Sources: d1-3B, d1-omni-600M, Decider 4B, Decider 35B-A3B, Winnow-12B model cards. Index scores as listed on the d1 cards. Latencies use different hardware and workloads, so they are not directly comparable.
How do you run d1 locally?
d1-3B needs transformers>=5.14 and trust_remote_code=True. d1-omni-600M needs transformers>=5.15. Both expose system_one(state, questions) for one state and system_one_batch for packed requests. Liquid AI recommends float16 for d1-omni-600M on GPU, since bfloat16 changed some top answers. You can try ten camera-driven d1-3B demos in the Open d1 Arcade space. With NVIDIA, Liquid AI also showed d1-3B navigating Isaac Sim from a Jetson.
Key Takeaways
- d1 models output probabilities over fixed options in one pass, never generated tokens.
- d1-3B scores 48.57 on Decision Index v0.2.1, the best result under 10B.
- d1-3B answers one question in 8 ms on an RTX 4090.
- d1-omni-600M handles text with images or audio at 587M parameters.
- License is free for commercial use below $10M annual revenue.
Check out the d1-3B, d1-omni-600M and Technical details. All credit goes to the researcher of this project. Also, feel free to follow us on Twitter and don’t forget to join our 150k+ML SubReddit and Subscribe to our Newsletter. Wait! are you on telegram? now you can join us on telegram as well.
Asif Razzaq is the CEO of Marktechpost AI Media Inc.. As a visionary entrepreneur and engineer, Asif is committed to harnessing the potential of Artificial Intelligence for social good. His most recent endeavor is the launch of an Artificial Intelligence Media Platform, Marktechpost, which stands out for its in-depth coverage of machine learning and deep learning news that is both technically sound and easily understandable by a wide audience. The platform boasts of over 2 million monthly views, illustrating its popularity among audiences.
