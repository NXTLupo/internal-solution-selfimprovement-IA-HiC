---
id: articles/reddit-deep-r-artificial/eea5a6c9f6.md
url: "https://www.reddit.com/r/artificial/comments/1l5pkcc/how_reliable_is_aigenerated_code_for_production/"
url_hash: "eea5a6c9f6"
kind: "article"
source: "Reddit Deep: r/artificial"
title: "How reliable is AI-generated code for production in 2025?"
author: ""
date: "2025-06-07T16:58:56.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:31:04.473090+00:00"
chars: 2993
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "articles/reddit-deep-r-artificial/eea5a6c9f6.md#c0"
    char_span: [0, 1711]
    sentence_count: 12
    key_terms: [code, ai-generated, reliable, testing, review, human, artificial, production]
    token_count: 391
  - id: "articles/reddit-deep-r-artificial/eea5a6c9f6.md#c1"
    char_span: [1713, 3196]
    sentence_count: 13
    key_terms: [code, time, people, "don't", good, "it's", production, deleted]
    token_count: 321
---
# How reliable is AI-generated code for production in 2025?

Source: [Reddit Deep: r/artificial](https://www.reddit.com/r/artificial/comments/1l5pkcc/how_reliable_is_aigenerated_code_for_production/)

I’ve been using AI tools like GPT-4, GitHub Copilot, and Blackbox AI to speed up coding, and they’re awesome for saving time. Of course, no one just blindly trusts AI-generated code review and testing are always part of the process.

That said, I’m curious: how reliable do you find AI code in real-world projects? For example, I used Blackbox AI to generate some React components. It got most of the UI right, but I caught some subtle bugs in state handling during review that could’ve caused issues in production.

So, where do you think AI-generated code shines, and where does it still need a lot of human oversight? Do you trust it more for certain tasks, like boilerplate or UI, compared to complex backend logic?

--- TOP COMMENTS ---
[5↑ tjk45268] Test the shit out of it, as you won’t know where the spec fails, poor design, or bugs are hiding.  But then, comprehensive testing is a best practice that you’re already following, right?
[3↑ Actual__Wizard] It's not reliable. 0% 

A human being still has to operate the AI and actively work with it.
[2↑ Traditional_Plum5690] What sets AI-generated code apart from human-created code? Surprisingly, not much. In a fully operational environment, complete with testing and review processes, the distinction blurs. Human programmers will still be essential, guiding AI agents and overseeing the entire workflow.
[2↑ sgt102] I find it really weird that people are asking the AI to generate pages and pages of code and then acting surprised when it's shit. 

I think it's brilliant for generating little three line snippits when I can't think what to do or refactoring things to clean up my dodgy ideas. It's really good for accelerating round the things that used to hold me up for hours.
[2↑ ShowerGrapes] judging by my twenty year experience as a programmer, it will be at least as reliable for production as most human written code has been, which is not that much.
[1↑ [deleted]] You have to keep checking what it produces. The more complex the code the more time it takes to verify things are working.

So its similar to working with teams that are growing larger with time. A lot more code of seemingly useful code is produced. But the time to verify it all goes on increasing.

Even the best people make mistakes, don't see things the same way, don't have enough time to do a good job etc etc and all that is visible in AI generated code too.
[1↑ [deleted]] Same level of trust I put into code written by a very expensive "code guru", which is none until it's gone through multiple rounds of testing, iteration, and polish. Doesn't matter how good a coder, if the end product is jank it can never be released. Expectations are astronomical these days. Have you run user tests? Have you certified the product with the various government boards? Have you scrubbed for copyright or legal issues? Holy fuck, the amount of times people think you can go straight from code to market shows how many people don't actually work on production.
