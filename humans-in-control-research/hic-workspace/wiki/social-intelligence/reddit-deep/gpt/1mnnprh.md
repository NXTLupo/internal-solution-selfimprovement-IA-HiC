---
id: social-intelligence/reddit-deep/gpt/1mnnprh.md
url: "https://www.reddit.com/r/GPT/comments/1mnnprh/example_of_all_gpt5_reasoning_effort_levels/"
kind: "social-post"
source: "reddit-deep: r/gpt"
subreddit: "gpt"
title: "Example of all GPT-5 Reasoning Effort Levels"
author: "iyioioio"
date: "2025-08-11T20:10:19.000Z"
score: 4
upvote_ratio: 0.84
num_comments: 0
flair: "ChatGPT"
extracted_at: "2026-05-11T17:26:37.730Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/gpt/1mnnprh.md#c0"
    char_span: [0, 1186]
    sentence_count: 2
    key_terms: [verbosity, effort, high, low, medium, gpt-5, response, minimal]
    concepts: [verbosity, effort, medium, gpt-5, response]
    token_count: 342
    sources: [{"n":"reddit-deep: r/gpt","u":"https://www.reddit.com/r/GPT/comments/1mnnprh/example_of_all_gpt5_reasoning_effort_levels/"}]
  - id: "social-intelligence/reddit-deep/gpt/1mnnprh.md#c1"
    char_span: [1197, 2768]
    sentence_count: 5
    key_terms: [convo-lang, https, current, learn, electrons, reasoning-effort, voltage, github]
    concepts: [convo-lang, https, current, reasoning-effort, electrons]
    token_count: 368
---
# Example of all GPT-5 Reasoning Effort Levels

Source: [reddit-deep: r/gpt](https://www.reddit.com/r/GPT/comments/1mnnprh/example_of_all_gpt5_reasoning_effort_levels/)
Posted by **iyioioio** · **4↑** · **0 comments**

I ran a test on GPT-5 using the same prompt with every combination of reasoning effort and response verbosity.

1. `minimal` effort, `low` verbosity
2. `minimal` effort, `medium` verbosity
3. `minimal` effort, `high` verbosity
4. `low` effort, `low` verbosity
5. `low` effort, `medium` verbosity
6. `low` effort, `high` verbosity
7. `medium` effort, `low` verbosity
8. `medium` effort, `medium` verbosity
9. `medium` effort, `high` verbosity
10. `high` effort, `low` verbosity
11. `high` effort, `medium` verbosity
12. `high` effort, `high` verbosity

I personally liked `high` effort and `low` verbosity the most, the response was short, the information was dense and it was easy to read. The text after `> assistant` is the response from GPT-5

Here is the prompt for `high` effort and `low` verbosity:

    > define
    __model='gpt-5'
    __reasoningEffort='high'
    __responseVerbosity='low'
    
    > user
    Describe how electricity flows through a circuit.
    
    
    > assistant
    - A source (battery or generator) creates a potential difference (voltage) between two points.
    - When a closed conductive path connects them, an electric field is established around the loop.
    - That field pushes mobile charges: in metals, electrons move; in electrolytes, ions; in semiconductors, electrons and holes.
    - Conventional current is defined from + to −; electrons in metals drift the opposite way and slowly, while the field propagates much faster.
    - Collisions with the material cause resistance, limiting current: I = V / R. Components drop voltage and convert electrical energy to heat, light, or motion: P = V × I.
    - Conservation laws apply: currents at a junction sum to zero (KCL), and voltage rises equal drops around any loop (KVL).
    - Open circuit (broken path) → no current; short circuit (very low resistance path) → very large current.
    - DC keeps one direction; AC reverses direction periodically.

I wrote the prompts in [Convo-Lang](https://learn.convo-lang.ai/) and used the [Convo-Lang VSCode extension](https://marketplace.visualstudio.com/items?itemName=IYIO.convo-lang-tools) to submit the prompts to GPT-5.

You can checkout the results on the Convo-Lang Github repo - [https://github.com/convo-lang/convo-lang/tree/main/examples/convo/reasoning-effort](https://github.com/convo-lang/convo-lang/tree/main/examples/convo/reasoning-effort)

Leave a comment with your favorite combination (1 - 12).

To learn more about Convo-Lang visit [https://learn.convo-lang.ai](https://learn.convo-lang.ai)
