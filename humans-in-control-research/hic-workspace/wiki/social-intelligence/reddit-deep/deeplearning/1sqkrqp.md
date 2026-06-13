---
id: social-intelligence/reddit-deep/deeplearning/1sqkrqp.md
url: "https://www.reddit.com/r/deeplearning/comments/1sqkrqp/the_nonautoregressive_decoder_won_cpu_neural_tts/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "The non-autoregressive decoder won CPU neural TTS - benchmarks across Piper, MeloTTS, Kokoro, Parler-TTS, XTTSv2"
author: "gvij"
date: "2026-04-20T09:54:33.000Z"
score: 16
upvote_ratio: 0.9
num_comments: 1
flair: ""
extracted_at: "2026-05-11T17:26:50.057Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1sqkrqp.md#c0"
    char_span: [0, 1531]
    sentence_count: 3
    key_terms: [real-time, rtf, decoder, cpu, piper, onnx, vits, deeplearning]
    token_count: 460
  - id: "social-intelligence/reddit-deep/deeplearning/1sqkrqp.md#c1"
    char_span: [1533, 3521]
    sentence_count: 8
    key_terms: [architecture, blog, gauravvij, frontier, variants, better, faster, github]
    token_count: 431
---
# The non-autoregressive decoder won CPU neural TTS - benchmarks across Piper, MeloTTS, Kokoro, Parler-TTS, XTTSv2

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1sqkrqp/the_nonautoregressive_decoder_won_cpu_neural_tts/)
Posted by **gvij** · **16↑** · **1 comments**

Ran a comparison of five contemporary neural TTS models on CPU only (8 cores, no GPU), using identical test phrases and measuring real-time factor (RTF = synthesis\_time / audio\_duration).

What the numbers look like:

* Piper Low (5.8MB, VITS/ONNX) — RTF \~0.0007 (1409x real-time)
* Piper Medium (62MB, VITS/ONNX) — RTF \~0.0004 (2483x)
* Piper High (110MB, VITS/ONNX) — RTF \~0.00013 (7603x)
* MeloTTS (162MB, VITS + BERT embeddings, 44.1kHz) — RTF 0.164 (\~6x real-time)
* Kokoro (82M params, StyleTTS2 / diffusion-based) — RTF 0.205 (\~5x real-time)
* Parler-TTS Mini (880M, T5 encoder + DAC codec + custom decoder) — RTF 6.94 (slower than real-time)
* XTTSv2 (2.3B, GPT2-based AR decoder) — unrunnable on CPU, requires 8GB+ VRAM

The architectural story is what I found interesting, not the specific numbers:

**Parallel-decode architectures dominate CPU inference by \~5 orders of magnitude over autoregressive ones.** Piper's VITS-based decoder runs through ONNX Runtime and produces audio \~7600x faster than playback. XTTSv2's GPT2-based decoder, which predicts audio tokens one at a time conditioned on prior outputs, can't be meaningfully accelerated on CPU because the dependency chain forbids parallelization.

Parler-TTS is the interesting middle case. It's not fully autoregressive in the WaveNet sense, but the T5 → DAC token → audio pipeline still has sequential bottlenecks in the DAC decoding stage. At 880M parameters it should be tractable on CPU, but the serialization in the decode path puts it at 7x slower than real-time. Size alone doesn't predict CPU viability — decoder topology does.

Quality-wise, StyleTTS2 (Kokoro) still edges ahead of the VITS variants on informal listening, particularly on prosody and stress placement. Diffusion-based synthesis is clearly contributing something that flow-based vocoders aren't fully capturing yet. So "faster architecture" hasn't collapsed into "better architecture" — there's still a quality frontier where Kokoro and newer diffusion-style models are ahead, and a deployment frontier where non-AR VITS dominates.

Some open questions I didn't get to:

* NaturalSpeech 3 and other diffusion-TTS variants on matched hardware — anyone have numbers?
* Does INT8 quantization close the gap for Parler-type architectures, or is the bottleneck structural rather than compute-bound?
* Fish Speech and WhisperSpeech would both be good additions to this comparison

Full methodology, per-phrase breakdowns, and charts: [https://github.com/gauravvij/neural\_tts/blob/main/blog/neural\_tts\_evolution.md](https://github.com/gauravvij/neural_tts/blob/main/blog/neural_tts_evolution.md)

Disclosure: the benchmarks and accompanying blog post were produced by NEO AI engineer, from a single high-level prompt - it handled the research, environment setup, model integration (including resolving API quirks across Piper's AudioChunk objects, Kokoro's generator interface, and Parler's memory footprint), and the writeup.

## Comments

- **hucchsuulemaga** (3↑): I don't understand the second graph: you mention that lower is better, but Piper, which you yourself have mentioned elsewhere as being much much faster than all others, is shown to be highest here?
