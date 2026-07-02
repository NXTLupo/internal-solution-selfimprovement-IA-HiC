---
id: articles/reddit-deep-r-openai/e1ab923faa.md
url: "https://www.reddit.com/r/OpenAI/comments/1ndj2wx/the_ai_nerf_is_real/"
url_hash: "e1ab923faa"
kind: "article"
source: "Reddit Deep: r/openai"
title: "The AI Nerf Is Real"
author: ""
date: "2025-09-10T16:31:38.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:32:14.163776+00:00"
chars: 2824
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "articles/reddit-deep-r-openai/e1ab923faa.md#c0"
    char_span: [0, 1847]
    sentence_count: 15
    key_terms: [day, isitnerfed, code, quality, august, claude, openai, next]
    concepts: [isitnerfed, quality, august, claude, openai]
    token_count: 461
    sources: [{"n":"Reddit Deep: r/openai","u":"https://www.reddit.com/r/OpenAI/comments/1ndj2wx/the_ai_nerf_is_real/"}]
  - id: "articles/reddit-deep-r-openai/e1ab923faa.md#c1"
    char_span: [1849, 2952]
    sentence_count: 7
    key_terms: [ambientocclusion, guardrails, response, already, imagine, latency, purple, black]
    concepts: [ambientocclusion, guardrails, response, already, imagine]
    token_count: 259
---
# The AI Nerf Is Real

Source: [Reddit Deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1ndj2wx/the_ai_nerf_is_real/)

Hello everyone, we’re working on a project called IsItNerfed, where we monitor LLMs in real time.

We run a variety of tests through Claude Code and the OpenAI API (using GPT-4.1 as a reference point for comparison).

We also have a Vibe Check feature that lets users vote whenever they feel the quality of LLM answers has either improved or declined.

Over the past few weeks of monitoring, we’ve noticed just how volatile Claude Code’s performance can be.

https://preview.redd.it/46k0sbqw6dof1.png?width=2652&format=png&auto=webp&s=9c539f632be894082574a2f98e28a6b14d3480d6

1. Up until August 28, things were more or less stable.
2. On August 29, the system went off track — the failure rate doubled, then returned to normal by the end of the day.
3. The next day, August 30, it spiked again to 70%. It later dropped to around 50% on average, but remained highly volatile for nearly a week.
4. Starting September 4, the system settled into a more stable state again.

It’s no surprise that many users complain about LLM quality and get frustrated when, for example, an agent writes excellent code one day but struggles with a simple feature the next. This isn’t just anecdotal — our data clearly shows that answer quality fluctuates over time.

By contrast, our GPT-4.1 tests show numbers that stay consistent from day to day.

And that’s without even accounting for possible bugs or inaccuracies in the agent CLIs themselves (for example, Claude Code), which are updated with new versions almost every day.

What’s next: we plan to add more benchmarks and more models for testing. Share your suggestions and requests — we’ll be glad to include them and answer your questions.

[isitnerfed.org](http://isitnerfed.org)

--- TOP COMMENTS ---
[248↑ ambientocclusion] Imagine any reasonable developer wanting to integrate this tech into a business process.
[95↑ Bnx_] I can’t imagine things, I just see black.
[38↑ PTSDev] it's called aphantasia... but you probably already know that ..I hate it! 😭
[3↑ goddammit_butters] when I look in the toilet bowl, it's purple. Purple and black!
[2↑ Ok-Confection8181] How do you plan for things? Like building new workflows/flow charts? For example, when you need to Think through processes to build a new system or complete your tasks?
[3↑ kirlandwater] Underrated response
[12↑ Wunjo26] My company is going all in on using LLMs to solve simple deterministic problems that have already been solved with code written by humans. They were talking about response latency from the agent and how adding guardrails increases latency and so they’re considering not having guardrails lol
[1↑ ambientocclusion] Hahahaha! And why not also swap in the cheapest LLM each month? I hope you don’t end up on the maintenance team, after all the “architecture astronauts” have gotten their promotions!
