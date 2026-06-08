---
id: social-intelligence/reddit-deep/deeplearning/1sbkpe7.md
url: "https://www.reddit.com/r/deeplearning/comments/1sbkpe7/any_suggestion_for_making_ai_write_understandable/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Any suggestion for making AI write understandable code?"
author: "Satirosix"
date: "2026-04-03T17:54:44.000Z"
score: 0
upvote_ratio: 0.14
num_comments: 7
flair: ""
extracted_at: "2026-05-11T17:26:50.052Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, enterprise_it]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1sbkpe7.md#c0"
    char_span: [0, 1216]
    sentence_count: 11
    key_terms: [code, deeplearning, programming, experience, comments, project, pygame, hand]
    token_count: 264
  - id: "social-intelligence/reddit-deep/deeplearning/1sbkpe7.md#c1"
    char_span: [1231, 2684]
    sentence_count: 2
    key_terms: [prompt, structure, rules, time, constraint, passes, pygame, review]
    section: Comments
    token_count: 336
  - id: "social-intelligence/reddit-deep/deeplearning/1sbkpe7.md#c2"
    char_span: [2686, 4114]
    sentence_count: 9
    key_terms: [code, intraluminal, ask, patterns, planning, clearly, defined, writing]
    section: Comments
    token_count: 325
---
# Any suggestion for making AI write understandable code?

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1sbkpe7/any_suggestion_for_making_ai_write_understandable/)
Posted by **Satirosix** · **0↑** · **7 comments**

Hi, I am in vibe coding related stuff for a month more or less, practicing and studying about it. Now I finally decided to maintain the generated code and ended up disappointed.

I have found redundant code, repetitive object initialization alternative flows that do not follow the same rules along the project...

I have experience for years programming in python, but wasn't able to modify a button functionality in a pygame MVP videogame without asking it to the IA again.

I am using MinMax 2.5 with OpenCode for pygame programming. I am forcing it to refine the code and to explain it, but it is barely improving the project.

On one hand I feel motivated by the power unleashed with the AI agents but on the other hand I don't trust the code for maintenance and in the long run.

Do you have any better experience? Any advice to make the AI code in a more structured and comprehensive way? Some skills or specific prompt patterns that you would recommend.

## Comments

- **RogueStargun** (2↑): Let it to keep things SOLID, DRY, and YAGNI, and write this into your review agent.

Every 3-6 mainline commit passes, compact, and run the review agent for refactoring passes
- **bonniew1554** (2↑): the fix is in your prompt structure, not the model. before you generate anything, drop in a rules block at the top of your prompt: "follow single responsibility principle, no repeated logic, add a one line comment per function." then after generation, paste the code back and ask it to flag any block that violates those rules. a friend building a pygame project added a strict style constraint to every prompt and cut refactor time from 4 hours to about 45 minutes per session. claude or gpt4o tend to hold structure better than minmax for this kind of constraint following, so worth a quick comparison. happy to dm a prompt template that works well for structured pygame codebases.
- **Real_2204** (2↑): yeah this is super common, AI is great at getting things working but not great at keeping things clean over time

what helped me was not asking it to “improve the whole codebase”. instead I force structure upfront like what modules exist, how data flows, naming rules, etc. then I only let it change small parts at a time. big refactors from AI usually make things worse

also I ask it to explain the architecture, not just the code. like “what owns what” and “why is this here”. that makes it way easier to maintain later

in my workflow I keep that structure and constraints defined in Traycer so the model sticks to it instead of reinventing patterns every time and creating messy code
- **Illustrious_Echo3222** (2↑): Yeah, I’ve had better results when I stop asking for “better code” and start giving it stricter rails. Things like “one module per responsibility,” “no duplicate logic,” “reuse existing patterns,” “explain the diff before writing,” and “don’t create new abstractions unless clearly needed” seem to help more than generic refine prompts. It also helps a lot to make it work in tiny steps and review each patch before moving on, otherwise it happily grows a weird little codebase you can’t reason about. Honestly, if you can’t change one button without calling the model again, that’s usually the sign the loop is too agent-driven and not enough human-guided.
- **Intraluminal** (1↑): Yes. there is, just not in a single pass. Step one: ask it to write code using 'best practices,' in a modular way, being careful to use meaningful variable names. Step two: ask but to read the code, and break it down into clearly defined modules. Continue to ask for refinements until you're satisfied. Rinse, wash, repeat.
  - **clintCamp** (2↑): Also start by planning into a planning and architecture document and forbid writing code until the plan is perfect enough.
    - **Intraluminal** (2↑): Yes. I should have added that at the beginning.
