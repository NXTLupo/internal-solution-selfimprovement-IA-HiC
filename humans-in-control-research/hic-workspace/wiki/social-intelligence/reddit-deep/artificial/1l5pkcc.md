---
id: social-intelligence/reddit-deep/artificial/1l5pkcc.md
url: "https://www.reddit.com/r/artificial/comments/1l5pkcc/how_reliable_is_aigenerated_code_for_production/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "How reliable is AI-generated code for production in 2025?"
author: "Secret_Ad_4021"
date: "2025-06-07T16:58:56.000Z"
score: 0
upvote_ratio: 0.22
num_comments: 8
flair: "Discussion"
extracted_at: "2026-05-11T17:27:04.772Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1l5pkcc.md#c0"
    char_span: [0, 975]
    sentence_count: 8
    key_terms: [ai-generated, code, artificial, production, blackbox, comments, reliable, review]
    token_count: 228
  - id: "social-intelligence/reddit-deep/artificial/1l5pkcc.md#c1"
    char_span: [989, 2525]
    sentence_count: 11
    key_terms: [code, "it's", human, time, reliable, testing, working, verify]
    section: Comments
    token_count: 355
  - id: "social-intelligence/reddit-deep/artificial/1l5pkcc.md#c2"
    char_span: [2527, 3289]
    sentence_count: 7
    key_terms: [code, people, "don't", product, etc, good, astronomical, expectations]
    section: Comments
    token_count: 165
---
# How reliable is AI-generated code for production in 2025?

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1l5pkcc/how_reliable_is_aigenerated_code_for_production/)
Posted by **Secret_Ad_4021** · **0↑** · **8 comments**

I’ve been using AI tools like GPT-4, GitHub Copilot, and Blackbox AI to speed up coding, and they’re awesome for saving time. Of course, no one just blindly trusts AI-generated code review and testing are always part of the process.

That said, I’m curious: how reliable do you find AI code in real-world projects? For example, I used Blackbox AI to generate some React components. It got most of the UI right, but I caught some subtle bugs in state handling during review that could’ve caused issues in production.

So, where do you think AI-generated code shines, and where does it still need a lot of human oversight? Do you trust it more for certain tasks, like boilerplate or UI, compared to complex backend logic?

## Comments

- **tjk45268** (5↑): Test the shit out of it, as you won’t know where the spec fails, poor design, or bugs are hiding.  But then, comprehensive testing is a best practice that you’re already following, right?
- **Actual__Wizard** (3↑): It's not reliable. 0% 

A human being still has to operate the AI and actively work with it.
- **Traditional_Plum5690** (2↑): What sets AI-generated code apart from human-created code? Surprisingly, not much. In a fully operational environment, complete with testing and review processes, the distinction blurs. Human programmers will still be essential, guiding AI agents and overseeing the entire workflow.
- **sgt102** (2↑): I find it really weird that people are asking the AI to generate pages and pages of code and then acting surprised when it's shit. 

I think it's brilliant for generating little three line snippits when I can't think what to do or refactoring things to clean up my dodgy ideas. It's really good for accelerating round the things that used to hold me up for hours.
- **ShowerGrapes** (2↑): judging by my twenty year experience as a programmer, it will be at least as reliable for production as most human written code has been, which is not that much.
- **[deleted]** (1↑): You have to keep checking what it produces. The more complex the code the more time it takes to verify things are working.

So its similar to working with teams that are growing larger with time. A lot more code of seemingly useful code is produced. But the time to verify it all goes on increasing.

Even the best people make mistakes, don't see things the same way, don't have enough time to do a good job etc etc and all that is visible in AI generated code too.
- **[deleted]** (1↑): Same level of trust I put into code written by a very expensive "code guru", which is none until it's gone through multiple rounds of testing, iteration, and polish. Doesn't matter how good a coder, if the end product is jank it can never be released. Expectations are astronomical these days. Have you run user tests? Have you certified the product with the various government boards? Have you scrubbed for copyright or legal issues? Holy fuck, the amount of times people think you can go straight from code to market shows how many people don't actually work on production.
