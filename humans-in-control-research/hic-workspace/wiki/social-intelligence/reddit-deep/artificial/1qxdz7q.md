---
id: social-intelligence/reddit-deep/artificial/1qxdz7q.md
url: "https://www.reddit.com/r/artificial/comments/1qxdz7q/anthropic_and_openai_released_flagship_models_27/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "Anthropic and OpenAI released flagship models 27 minutes apart -- the AI pricing and capability gap is getting weird"
author: "prakersh"
date: "2026-02-06T10:22:08.000Z"
score: 130
upvote_ratio: 0.89
num_comments: 42
flair: "News"
extracted_at: "2026-05-11T17:27:04.782Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1qxdz7q.md#c0"
    char_span: [0, 1564]
    sentence_count: 9
    key_terms: [opus, pricing, gpt-5, gemini, model, gap, artificial, anthropic]
    concepts: [pricing, gpt-5, gemini, artificial, model]
    token_count: 473
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1qxdz7q/anthropic_and_openai_released_flagship_models_27/"}]
  - id: "social-intelligence/reddit-deep/artificial/1qxdz7q.md#c1"
    char_span: [1566, 2221]
    sentence_count: 8
    key_terms: [context, getting, pricing, writing, claude, gpt-5, opus, claude-opus-4-6]
    concepts: [context, getting, pricing, writing, claude]
    token_count: 162
  - id: "social-intelligence/reddit-deep/artificial/1qxdz7q.md#c2"
    char_span: [2235, 4364]
    sentence_count: 12
    key_terms: [models, use, model, real, because, "don't", cost, own]
    concepts: [models, model, because, "don't", different]
    related_chunks: ["social-intelligence/reddit-deep/artificial/1qxdz7q.md#c3"]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/artificial/1qxdz7q.md#c3"
    char_span: [4366, 6171]
    sentence_count: 10
    key_terms: ["don't", model, believe, happens, writing, models, openai, "that's"]
    concepts: ["don't", model, believe, happens, writing]
    related_chunks: ["social-intelligence/reddit-deep/artificial/1qxdz7q.md#c2"]
    section: Comments
    token_count: 465
  - id: "social-intelligence/reddit-deep/artificial/1qxdz7q.md#c4"
    char_span: [6173, 7019]
    sentence_count: 7
    key_terms: [use, production, reasoning, terminal, routing, codex, model, needle-in-haystack]
    concepts: [production, reasoning, terminal, routing, codex]
    section: Comments
    token_count: 184
---
# Anthropic and OpenAI released flagship models 27 minutes apart -- the AI pricing and capability gap is getting weird

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1qxdz7q/anthropic_and_openai_released_flagship_models_27/)
Posted by **prakersh** · **130↑** · **42 comments**

Anthropic shipped Opus 4.6 and OpenAI shipped GPT-5.3-Codex on the same day, 27 minutes apart. Both claim benchmark leads. Both are right -- just on different benchmarks.

**Where each model leads**
Opus 4.6 tops reasoning tasks: Humanity's Last Exam (53.1%), GDPval-AA (144 Elo ahead of GPT-5.2), BrowseComp (84.0%). GPT-5.3-Codex takes coding: Terminal-Bench 2.0 at 75.1% vs Opus 4.6's 69.9%.

**The pricing spread is hard to ignore**

| Model | Input/M | Output/M |
|-------|---------|----------|
| Gemini 3 Pro | $2 | $12.00 |
| GPT-5.2 | $1.75 | $14.00 |
| Opus 4.6 | $5.00 | $25.00 |
| MiMo V2 Flash | $0.10 | $0.30 |

Opus 4.6 costs 2x Gemini on input. Open-source alternatives cost 50x less. At some point the benchmark gap has to justify the price gap -- and for many tasks it doesn't.

**1M context is becoming table stakes**
Opus 4.6 adds 1M tokens (beta, 2x pricing past 200K). Gemini already offers 1M at standard pricing. The real differentiator is retrieval quality at that scale -- Opus 4.6 scores 76% on MRCR v2 (8-needle, 1M), which is the strongest result so far.

**Market reaction was immediate**
Thomson Reuters stock fell 15.83%, LegalZoom dropped nearly 20%. Frontier model launches are now moving SaaS valuations in real time.

**The tradeoff nobody expected**
Opus 4.6 gets writing quality complaints from early users. The theory: RL optimizations for reasoning degraded prose output. Models are getting better at some things by getting worse at others.

No single model wins across the board anymore. The frontier is fragmenting by task type.

GPT-5.3-Codex pricing has not been disclosed at time of writing. Gemini offers 1M context at standard pricing; Claude charges 2x for prompts exceeding 200K tokens.

Source with full benchmarks and analysis: [Claude Opus 4.6: 1M Context, Agent Teams, Adaptive Thinking, and a Showdown with GPT-5.3](https://onllm.dev/blog/claude-opus-4-6)

## Comments

- **single_threaded** (36↑): Simple solution: If a cheaper model is good enough for you, use it.
  - **prakersh** (6↑): Agreed
    - **prakersh** (3↑): Hence I have a syntehtic and a claude code subscription
  - **Rent_South** (3↑): Seriously, this is what a lot of people currently ignore. They just go for the shiny new models, or flagship models by default. 8 months ago, I was working on a rag pipeline, and for one of the agentic flows that required semantic similarity identification, I had one of OpenAI's flagship model to power that flow (gpt-4o at the time). But I wanted to be sure to use the most accurate model and also the most cost/efficient. Long story short, I made some extensive testing and realized that I could get BETTER results, with a 10x cheaper model (at the time, gpt-4.1-mini).

Its just mind blowing, how even providers, don't really know the full extent of the capabilities of their own models. And how, benchmarks like MMLU, livebench,  simplebench, IQ tests, llm-as-a-judge, or people voting for the 'best' models, these don't mean a thing when it comes to real use case. Because the variables that influence scores are so subtle, like any minor difference in prompting for instance, even the position of a comma.

Following that, I actually started working on a tool to benchmark models on real world use case, because there is an infinity of possible tasks, and lots of options now to power agentic flows.

8 months later, my tool is finally up and running and available, you can make your own tasks, to test your own use cases across 100+ models. And actually get real api cost and cost efficiency, speed, accuracy metrics. Based on real token usage. This matters a lot, because models, each have very different ways to tokenize, and/or, CoT outputs can be vastly different in volume. So, solely basing judgement on providers announced input/output token price per million, is not the whole story AT ALL.

[openmark.ai](https://www.openmark.ai) if anyone is interested.
- **[deleted]** (14↑): I don't care how shiny or attractive OpenAI make their products, I would stay away from that company.

They'll reel you in with promises, and then gaslight you into agreeing whatever they force upon you.
  - **amt_42** (1↑): You could replace OpenAI by Anthropic and your statement would become even more true
    - **[deleted]** (1↑): Most AI companies these days. Not all.
- **overmotion** (22↑): Thanks for posting AI generated drivel, we love that here
  - **danfromplus** (2↑): lol it has taken over Reddit
  - **Buffalo_times_eight** (1↑): My eyes glazed over about halfway through...
- **Willbo** (3↑): These tic-for-tac releases make it feel OpenAI is gaming the news and mindshare rather than trying to raise the bar. Makes you wonder what models they're sitting on.
- **costafilh0** (5↑): That's why they don't see ADs as an option.
- **ChocomelP** (2↑): Gemini 2.5?
  - **prakersh** (1↑): Updated with 3 pro numbers
- **Shibbieness** (1↑): You don't have to believe me, but this happens every time I build something with AI.
It's not just me, either; every major build made by some "unknown" user is taken, sterilized, and rebuilt to be a proprietary company model.
Yes, they do put the work into it that it needs, but it is still work that's stolen.
Shit happens, and you can't do anything about it unless you've got the money to fight an entire legal team per each.
I don't know what to tell you.
Don't believe me
- **tindalos** (1↑): The benchmark gap doesn’t matter if one model is significantly better for a task.
- **Savings_Lack5812** (1↑): The writing quality tradeoff is the most underrated point here. When you optimize heavily for reasoning via RL, you're essentially teaching the model to think in structured chains — which is great for code and logic but actively hurts prose fluency. It's the same pattern we saw with earlier instruction-tuned models losing creative writing ability.

For production use, this fragmentation means you really need a routing layer now. Use Opus for complex reasoning chains, Codex for terminal work, and something like Haiku or Flash for high-volume tasks where latency matters more than peak accuracy. The days of picking one model and sticking with it are over.

The MRCR v2 score at 1M context is genuinely impressive though — retrieval quality at that scale has been the weak link in long-context models. If that holds up in real RAG pipelines and not just needle-in-haystack benchmarks, that alone could justify the premium for document-heavy workflows.
- **BC_MARO** (1↑): The benchmark divergence is the interesting part. Opus 4.6 leads on reasoning, GPT-5.3-Codex on terminal coding. For most production use cases you end up needing routing logic anyway since no single model wins everywhere.
