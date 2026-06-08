---
id: social-intelligence/reddit-deep/openai/1mnuys2.md
url: "https://www.reddit.com/r/OpenAI/comments/1mnuys2/weird_experiences_with_the_gpt5_api/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "Weird experiences with the GPT-5 API"
author: "nstevnc77"
date: "2025-08-12T01:06:43.000Z"
score: 7
upvote_ratio: 1
num_comments: 6
flair: "Discussion"
extracted_at: "2026-05-11T16:53:06.859Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1mnuys2.md#c0"
    char_span: [0, 1955]
    sentence_count: 15
    key_terms: [tools, gpt-5, personality, mentioned, comments, either, openai, never]
    token_count: 457
  - id: "social-intelligence/reddit-deep/openai/1mnuys2.md#c1"
    char_span: [1957, 2669]
    sentence_count: 6
    key_terms: [thinking, higher, models, keeps, good, keep, curveballs, surprising]
    token_count: 162
  - id: "social-intelligence/reddit-deep/openai/1mnuys2.md#c2"
    char_span: [2684, 4591]
    sentence_count: 20
    key_terms: [use, model, work, models, agent, tools, good, nstevnc77]
    section: Comments
    token_count: 491
  - id: "social-intelligence/reddit-deep/openai/1mnuys2.md#c3"
    char_span: [4593, 4934]
    sentence_count: 4
    key_terms: [system, prompt, lot, possible-ad-6765, documentation, suggestions, correctly, following]
    section: Comments
    token_count: 75
---
# Weird experiences with the GPT-5 API

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mnuys2/weird_experiences_with_the_gpt5_api/)
Posted by **nstevnc77** · **7↑** · **6 comments**

At work, I’ve basically become “the AI tools person.” My job is to meet with different departments, figure out where AI could actually help them, and then build tools on top of our internal UI so they can use those tools with our company’s data.

Up until last week, we were mostly running on GPT-4.1, o4-mini-high, o3, and occasionally Gemini 2.5 Pro for longer contexts. Today I decided to switch everything over to GPT-5, mixing reasoning efforts depending on the use case, and it’s been interesting.

Tools that used to be consistent and predictable are suddenly offering to do random things that were never even mentioned in our system. Example: someone asked about orders and GPT-5 offered to “share the order” or “save it.” Cool idea, except it can’t do either of those things, and we never even mentioned those capabilities anywhere.

Its long-context document summarization is excellent though. Pulling instructions from manuals and other sources it does a really good job. But beyond that, I feel like I have to straitjacket it. With its prompts there is zero room for creativity and I have to be really precise. Meaning that I have to tell it exactly what it should do every step of the way. With 4.1 and o4-mini, they’d pick up on context clues better and more importantly, they wouldn’t just make up new shit it thought it could do for the user. Not perfect either, but GPT-5 feels like a full personality transplant.

Earlier this week, I tried it in Cursor (I’m new to it) and it crushed some light coding tasks, so I figured people complaining about its “less friendly personality” were just missing the point. I don’t care if it’s chatty, I just want it to be good. But in my production tools, the hallucinations are killing me.

I’ve also noticed (while not surprising due to gpt-5 being a thinking model) that it’s pretty slow, even with minimal thinking. The time to first answer token is way higher than the old non thinking models and if you use medium or high it’s a good wait.

If I have to keep tightening the leash just to stop it from inventing new things it wants to do for the user, I might give Claude a shot despite the higher cost. I’m already planning some benchmark tests with our tools for both models. GPT 4.1 and o4 had been good enough that I could move fast, but now if this keeps up and the company keeps throwing curveballs, I’ll have to keep my options open.

Has anyone else seen this kind of behavior with the APIs?

## Comments

- **nstevnc77** (3↑): I have more thoughts: I feel like this model feels over-tuned? Like it’s obviously very smart and capable and it WANTS to do stuff for the user, almost to a fault. I can’t tell if this is a smaller model that is VERY good at benchmarks, a bigger model that’s just trained very precisely, or it has some sort of base prompt or system or router behind it pushing it to be this way. 

Just speculation though. It’s good for some stuff, but it’s just weird to use compared to all the old models.
  - **IslandPlumber** (2↑): So far in my use case it is a cruel joke. I can't even use it. I have to use Gemini only now for stuff that matters. I can use gpt for the creative writing style but hat's about it now.  I don't trust tools to run on the models side.  I make my own and have my agent do most of the work.  If I have to hold a models hand then I want to only do it once and train my agent to do the same thing for me.  I have tried to not become dependent on one model.  I try to make my tools work with llama, if they work there then they work anywhere thinking.  I think it is a mistake to develop around OpenAI instead of making an agent that can use any model.  it's good to have two different models debate an answer before giving it to you.  more means better.
- **promptenjenneer** (2↑): I've noticed it's slow too. Annoying as it doesn't output the actual thinking in the API too. I'm keeping us to GPT4.1 and Sonnet 4 for now.
- **Possible-Ad-6765** (1↑): Hey, I updated my tools to use gpt5 and have the same issues. Have you figured out how to make it work?
  - **nstevnc77** (1↑): Yeah! I’ve actually found that’s since launch my issues have been a lot better. I will say though you have to be VERY precise with it. You need to read and then reread your system prompts, you cannot be vague with it and you need to ensure that no two instructions in your prompt conflict. 

I found that’s since launch reading and following the system prompt documentation that OpenAI provides has made things a lot better. They also have a system prompt optimizer that you can use that will make suggestions and format your system prompts correctly. 

Hope this helps!
    - **Possible-Ad-6765** (1↑): Oh thanks a lot! I'll try it!
