---
id: social-intelligence/reddit-deep/machinelearning/1sv3cnm.md
url: "https://www.reddit.com/r/MachineLearning/comments/1sv3cnm/how_would_you_build_an_automated_commentary/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "How would you build an automated commentary engine for daily trade attribution at scale? [R]"
author: "Problemsolver_11"
date: "2026-04-25T05:30:46.000Z"
score: 4
upvote_ratio: 0.62
num_comments: 7
flair: "Research"
extracted_at: "2026-05-29T20:20:45.885Z"
extraction_method: "praw-deep"
research_goal: "Provide a strategic overview for a company's creative team detailing emerging AI design trends, essential skills, practical tools, relevant platforms, and technical implementations. Focus on how these elements move beyond AI as a concepting aid to practically support design production, system testing, asset generation, governance, and stakeholder confidence."
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1sv3cnm.md#c0"
    char_span: [0, 1938]
    sentence_count: 11
    key_terms: [attribution, machinelearning, automatically, deterministic, trade, llm, commentary, precision]
    token_count: 408
  - id: "social-intelligence/reddit-deep/machinelearning/1sv3cnm.md#c1"
    char_span: [1952, 4280]
    sentence_count: 21
    key_terms: [deterministic, llm, spot, hallucinated, verification, calculation, determinism, challenge]
    section: Comments
    token_count: 501
  - id: "social-intelligence/reddit-deep/machinelearning/1sv3cnm.md#c2"
    char_span: [4282, 6034]
    sentence_count: 13
    key_terms: [model, use, data, language, specific, natural, handle, output]
    section: Comments
    token_count: 360
---
# How would you build an automated commentary engine for daily trade attribution at scale? [R]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1sv3cnm/how_would_you_build_an_automated_commentary/)
Posted by **Problemsolver_11** · **4↑** · **7 comments**

Hey everyone,

I'm currently working through a problem in the market risk reporting space and would love to hear how you all would architect this.

The Use Case: > I have thousands of trades coming in at varying frequencies (daily, monthly). I need to build a system that automatically analyzes this time-series data and generates a precise, human-readable commentary detailing exactly what changed and why.

For example, the output needs to be a judgment like: "The portfolio variance today was +$50k, driven primarily by a shift in the Equities asset class, with the largest single contributor being Trade XYZ."

The Dilemma:

* The Math: Absolute precision is non-negotiable. I know I can't just dump raw data into an LLM and ask it to calculate attribution, because it will hallucinate the math. I usually rely on Python and Polars for the high-performance deterministic crunching.
* The Rigidity: If I hardcode every single attribution scenario (by asset class, by region, by specific trade) into a static ETL pipeline before feeding it to an LLM for summarization, the system becomes too rigid to handle new business scenarios automatically.

My Question:

How would you strike the balance between deterministic mathematical precision and dynamic natural language generation?

Are you using Agentic workflows (e.g., having an LLM dynamically write and execute Polars/pandas code in a sandbox)? Or are you sticking to pre-calculated cubes and heavily structured context prompts? Any specific frameworks (LangChain, LlamaIndex, PandasAI, etc.) or design patterns you've had success within financial reporting?

Appreciate any insights!

## Comments

- **Raspberrybye** (1↑): I think when looking for absolute determinism from an automatic system like this, the problem is that the human version of this is also non deterministic.

So you will always be trading off flexibility with accuracy, and this makes “absolute precision” not possible. LLMs are non deterministic like humans. A human-led calculation (for something bespoke) could contain a mistake which is hard to spot. Happens all the time. Or the human isn’t smart enough to think about the problem in the optimal way. LLMs will do the same.

To deal with this you hardcode templates of calculations which are known good to remove uncertainty. You build in review of LLM outputs to spot issues. And you build in spot checks on key points to confirm common mistakes are not present. 

It’s much easier to spot where an LLM has a) hallucinated recall of a hardcoded number from a deterministic process you built, than b) where an LLM has hallucinated a calculation method and spat out a number that isn’t what it said it is. Spotting b requires another LLM that will reliably spot the mistake because you are sure as hell not going to dig through every 200 lines of slop the model will make. There is just a huge verification challenge vs a) where you’re comparing text output with what’s on a table.

As for Agentic workflows - you can mitigate determinism issues with this in theory. But right now are still quite new and not very well understood. Also agentic workflows can break easily, and concerns about model changes from Anthropic recently for example can make models less reliable. For example if your tool calls start malfunctioning, that’s a huuuuge mess to clean up. Maybe you can’t clean it up and you get stuck

Maybe the easiest way you can do this is something you’ve already said. Work backwards from your desired outputs, make a matrix of timeframes, data axis, template cuts etc and then feed these into an LLM to summarise. You could then rely on spot checks using an LLM2 comparing the LLM1 text output and the deterministic data cuts you’ve made.
  - **Problemsolver_11** (1↑): This is incredibly sharp feedback, and you hit the nail on the head regarding the verification challenge. Pushing the heavy lifting to deterministic code rather than relying on the LLM to do the math makes a lot of sense.

To make sure I'm fully aligning with your suggestion on the architecture: is the plan here to feed the completely aggregated, pre-calculated data matrix directly to the LLM, and effectively just use the model as a natural language summarization layer?
    - **Raspberrybye** (2↑): Thank you!

And yes, what you said is what I suggested. At the very least it’s probably the right starting point. I think most LLMs can ingest this quite easily, and you can just chat to ask for whatever you want. 

You can use a system prompt to try and squeeze the output into the kind of structure you’d like. Depending on how mission critical the data are, I’d (personally) also manually spot check many examples and use cases before showing it to anyone.
- **ai_guy_nerd** (1↑): The most robust way to handle this is through a 'Code-Interpreter' pattern. Instead of feeding raw data to the model, the LLM should act as the orchestrator that writes a specific Polars script to extract the attribution delta, executes it in a secure sandbox, and then interprets the resulting JSON. This keeps the math 100% deterministic while allowing the natural language to be dynamic.

Using a structured output for the intermediate step ensures the model doesn't hallucinate the numbers before the final summary is written. This approach avoids the rigidity of static ETL pipelines because the model can adapt the query logic based on the specific business scenario it is analyzing.

There are several frameworks that handle this well. If building from scratch, a simple Python wrapper around Polars with a restricted execution environment works. Other agentic systems like OpenClaw or similar automation harnesses use this exact loop to maintain precision in financial reporting.
