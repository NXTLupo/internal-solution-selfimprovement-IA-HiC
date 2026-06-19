---
id: articles/reddit-deep-r-actuary/bd53fadfae.md
url: "https://www.reddit.com/r/actuary/comments/1ng4wyy/actuarial_ai_for_exam_prep/"
url_hash: "bd53fadfae"
kind: "article"
source: "Reddit Deep: r/actuary"
title: "Actuarial AI for exam prep"
author: ""
date: "2025-09-13T18:26:55.000Z"
tier: 
method: "source-native"
extracted_at: "2026-06-17T19:29:41.624369+00:00"
chars: 4529
engagement: "deliver-a-comprehensive-2026-outlook-on-the-global-insurance"
collected_at: "2026-06-17T19:29:41.168Z"
relevance: 35
engagement_goal: "Deliver a comprehensive 2026 outlook on the global insurance industry that synthesizes market research and social listening to identify key shifts in consumer attitudes, marketing approaches, AI automation, enterprise needs, and technology trends."
content_hash: "9c5181cf5b818970"
relevance_by_goal: {"68c375ef0d4e":35}
chunks:
  - id: "articles/reddit-deep-r-actuary/bd53fadfae.md#c0"
    char_span: [0, 2059]
    sentence_count: 14
    key_terms: [public, topic, benchmarks, actuarial, interest, actuary, adjusts, sources]
    token_count: 493
  - id: "articles/reddit-deep-r-actuary/bd53fadfae.md#c1"
    char_span: [2061, 3729]
    sentence_count: 3
    key_terms: [impossible-shock-773, exams, gpt-4-fails-final-actuarial-exam, llm, firerapper, actuarial, question, example]
    token_count: 422
  - id: "articles/reddit-deep-r-actuary/bd53fadfae.md#c2"
    char_span: [3731, 4674]
    sentence_count: 8
    key_terms: [comparisons, adaptation, learning, because, learner, student, advise, better]
    token_count: 197
---
# Actuarial AI for exam prep

Source: [Reddit Deep: r/actuary](https://www.reddit.com/r/actuary/comments/1ng4wyy/actuarial_ai_for_exam_prep/)

Hi all, hope everybody doing good — I’m an IFoA student + dev exploring an **AI study coach** for actuarial exams. I’m trying to validate if there’s interest in something that doesn’t just answer questions but actually **learns how** ***you*** **learn** and adapts over time.

**What it does (all from public/open-license sources — no proprietary manuals):**

* **Learns your style:** prefers the explanations you upvote (visual / step-by-step / conceptual), then defaults to that. Adjusts difficulty based on how you perform.
* **Targets your gaps:** automatic weak-area detection; builds bite-size drills and spaced-repetition cards from your misses.
* **Tracks your progress:** dashboard with trendlines (accuracy, time per topic, streaks), “next best topic,” and an **exam-readiness score** that updates as you practice.
* **Benchmarks (opt-in, anonymous):** see where you sit vs. other users at the same stage (percentiles by topic & speed), plus “what top performers practiced next.”
* **Mocks that feel real:** timed exams, detailed post-mortems, and pacing alerts.
* **Study plans that adapt:** day-by-day plan that reshuffles when life happens. Add your exam date and constraints and it adjusts automatically.
* **Citations & transparency:** every answer is sourced so you can check quickly. No provider-locked content.

**Pricing idea:** \~**$20/month** with a free tier (limited features). Student discount likely.

**Would you use this?** What would make it a no-brainer?

1. Must-haves (Q&A, mocks, spaced repetition, formula sheets, calculators, visuals, etc.)
2. Benchmarks: useful or meh? What would you *actually* want to see?
3. Price point: fair / too high / prefer one-off?
4. Coverage priorities: SOA vs IFoA, and which papers first?

If this gets interest, I’ll share a public demo (again: only open/public sources). Mods — if this brushes self-promo rules, happy to adjust or remove.

Thanks!

--- TOP COMMENTS ---
[10↑ NoTAP3435] What is your plan for hallucinations?
[0↑ Impossible-Shock-773] Great question - short answer is that it has not been completely solved yet.  
I've got routers that act as a guardrail, classifiying the input to determine how it should best be answered - if it is, for example, an INV 101 (or anything that falls in the scope of the actuarial exams) question then it uses RAG to search for "context"  and provide that along with the prompt to the LLM to improve the output, whereas if you're asking about, for example Taylor Swift then it will do no better than the underlying LLm would. I am already doing this. \*

The 2nd way is to basically set the temp as low as possible (so say like 0-0.05) which would basically make the answers the LLM gives pretty much deterministic. **NB this would be after the retrieval improvements - basically need it to get really good before we can lock that (otherwise could be locking in bad info).** Not gotten here yet\*

u/FireRapper I've seen that article and be sure that will defs be part of the testing - once the above has been implemented I will absolutely push it through doing the actual exams as part of the testing before the first beta is deployed.
[6↑ FireRapper] https://notunreasonable.com/2023/03/29/gpt-4-fails-final-actuarial-exam/
[5↑ James_Legend] So is this a gpt wrapper?
[-1↑ Impossible-Shock-773] Yes - basically building it on top of GPT 4
[-2↑ Impossible-Shock-773] and fine tuning for actuarial exams
[4↑ Vhailor_19] This may seem an unusual request, but I'd want the ability to turn **off** features at a granular level (e.g. at the level your bullet points are at).

The reason why is because, for me, a significant portion of the value of exams comes from how they challenge me to become a better learner.  I value tools - flashcards, summaries, question banks.  I explicitly don't want systems that attempt to smooth out the learning process itself - learning style adaptation, weakness suggestions, etc.  Those are for me to self-assess and adapt around, because it makes me a stronger learner to do so, and that makes me a better actuary.  

I'd also advise being careful with user comparisons.  Study behaviours of top performers are not always appropriate for the "middle class" of student, so to speak.  If you do end up pursuing that feature, I'd advise trying to assess the student, and then giving them recommendations based on what students of similar strength focused on.  

Good luck!
[1↑ Impossible-Shock-773] This is fantastic feedback - I can defs make the adaptation and comparisons optional!
