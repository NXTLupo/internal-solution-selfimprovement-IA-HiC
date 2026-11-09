---
id: articles/reddit-deep-r-chatgptcoding/7bad5be22c.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/"
url_hash: "7bad5be22c"
kind: "article"
source: "Reddit Deep: r/chatgptcoding"
title: "When your AI-generated code breaks, what's your actual debugging process?"
author: ""
date: "2025-12-04T15:26:08.000Z"
tier: 
method: "source-native"
extracted_at: "2026-10-09T16:46:55.822722+00:00"
chars: 4308
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:46:55.527Z"
relevance: 42
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "2aabb26dfceaea31"
relevance_by_goal: {"aa6916010743":42}
chunks:
  - id: "articles/reddit-deep-r-chatgptcoding/7bad5be22c.md#c0"
    char_span: [0, 2140]
    sentence_count: 21
    key_terms: [process, debugging, code, architecture, actual, blazarious, concepts, testing]
    concepts: [process, debugging, architecture, blazarious, actual]
    token_count: 491
    sources: [{"n":"Reddit Deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/","kind":"article","date":"2025-12-04","subreddit":"chatgptcoding"}]
  - id: "articles/reddit-deep-r-chatgptcoding/7bad5be22c.md#c1"
    char_span: [2142, 3882]
    sentence_count: 13
    key_terms: [architecture, integration, end, testing, comes, front, stack, programming]
    concepts: [architecture, integration, testing, programming, comes]
    token_count: 387
    sources: [{"n":"Reddit Deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/","kind":"article","date":"2025-12-04","subreddit":"chatgptcoding"}]
  - id: "articles/reddit-deep-r-chatgptcoding/7bad5be22c.md#c2"
    char_span: [3884, 4529]
    sentence_count: 4
    key_terms: [abp, test, everything, framework, use, boilerplates, sreekanth850, integration]
    concepts: [everything, framework]
    token_count: 152
    sources: [{"n":"Reddit Deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/","kind":"article","date":"2025-12-04","subreddit":"chatgptcoding"}]
---
# When your AI-generated code breaks, what's your actual debugging process?

Source: [Reddit Deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/)

Curious how you guys handle this.

I've shipped a few small apps with AI help, but when something breaks after a few iterations, I usually just... keep prompting until it works? Sometimes that takes hours.

Do you have an actual process for debugging AI code? Or is it trial and error?

--- TOP COMMENTS ---
[21↑ blazarious] This is not an AI coding problem. This is a software engineering problem. It’s the same with human coders. What do you do if the code starts breaking after a few iterations?

There are concepts and workflows that can help you with that: code review, automated testing, static analysis, clean architecture, and pair programming, come to mind. 

It doesn’t matter who does the coding (human or AI or both), what matters is the process. 

At least that’s been my experience in the industry so far.
[2↑ Quind1] Learning to properly debug an application is a skill. There are plenty of videos, OP, that will teach you the debugging process for your architecture/IDE.
[2↑ blazarious] Yes, I glossed over the actual debugging too quickly in my response. This is a very good addition, thank you!
[2↑ Critical-Brain2841] Wow thanks for the reframe. The real question is "what's my process.".... not "how do i prompt better". X totally got me in the wrong path lol

I do have a CS background but haven't touched actual dev workflows in years. The concepts you mentioned - testing, code review, clean architecture - I know what they are but never applied them to AI coding.

What's the minimum viable process you'd recommend for someone building solo? Like, where do you start if you have none of this in place?
[0↑ blazarious] That's great that you're already familiar with those concepts. So, you can start applying them and see which ones work for you.

For me it's these:

**Testing**: I have AI create automated tests and basically verify itself and make sure there won't be regressions down the road.

**Code review**: I always do a code review of the generated code in the end. Depending on the project this might be more or less thorough.

**Clean architecture**: This is a larger topic but it helps a lot if it's not all Spaghetti.

**Static analysis and linting**: This is a very easy sanity check, no reason to skip it.

**Pair programming**: Sometimes working with the AI feels like pair programming, so this one comes naturally.

Now, here comes some shameless self-promotion: I've been using more or less the same tech stack over and over again within the last 2 years or so, with the same techniques for static analysis and testing and a reasonably clean architecture. Now, I sell that stack but you don't have to buy it. I also documented that stack and maybe you wanna check out that [documentation](https://agentready-stack.productionbuild.de/architecture.html) to get some inspiration (or ask your AI agent to reproduce it).
[3↑ sreekanth850] I do 95% of Integration test. Decoupled backend and front end, front end is coding by a Front end engineer. AI is for backend only. I almost cover all scenarios in integration testing, and it catches almost most of the produdtcion bugs. Then use detailed logging, Serilog, and then test indvidually to identify the issue in details. this had worked best. Claude is the only option if you have to detect timing bugs, concurrency bugs etc. Also i build on the top of ABP framework that comes with a builtin testing framework. and 80% of the boilerplates are already done with Auth, User management and tenancy.
[1↑ Critical-Brain2841] 95% integration test coverage is some serious stuff! How long did it take you to get there? And do you write the tests yourself or have AI generate them?

The ABP framework mention is interesting - I've been building everything from scratch which is probably part of my problem.
[1↑ sreekanth850] What i understood is, if you build everything yourself, hell of bugs, issues. if you use boilerplates like ABP, 80% of the plumbing is done already and battle tested, your test and fix focus on your core idea not the generic auth, user management, multi tenancy or permissions.. I use Claude to generate every test ,ABP framework have builtin supoort for integration test that i can mirrror 1;1 prod. C# proves to be much better than JS for AI to give cleaner codes. I came from C# and dotnet backgroud
