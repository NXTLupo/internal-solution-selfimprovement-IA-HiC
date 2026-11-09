---
id: social-intelligence/reddit-deep/chatgptcoding/1pe2teu.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "When your AI-generated code breaks, what's your actual debugging process?"
author: "Critical-Brain2841"
date: "2025-12-04T15:26:08.000Z"
score: 11
upvote_ratio: 0.92
num_comments: 43
flair: "Discussion"
extracted_at: "2026-10-09T16:37:34.764Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1pe2teu.md#c0"
    char_span: [0, 566]
    sentence_count: 6
    key_terms: [chatgptcoding, debugging, comments, process, actual, breaks, critical-brain2841, code]
    concepts: [chatgptcoding, debugging, comments, process, actual]
    token_count: 141
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/","kind":"social-post","date":"2025-12-04","author":"Critical-Brain2841","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1pe2teu.md#c1"
    char_span: [581, 2675]
    sentence_count: 17
    key_terms: [architecture, code, process, programming, review, blazarious, concepts, testing]
    concepts: [architecture, programming, process, blazarious, review]
    section: Comments
    token_count: 477
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/","kind":"social-post","date":"2025-12-04","author":"Critical-Brain2841","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1pe2teu.md#c2"
    char_span: [2677, 3998]
    sentence_count: 11
    key_terms: [integration, testing, architecture, front, stack, bugs, end, test]
    concepts: [integration, testing, architecture, front, stack]
    section: Comments
    token_count: 301
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/","kind":"social-post","date":"2025-12-04","author":"Critical-Brain2841","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1pe2teu.md#c3"
    char_span: [4000, 5851]
    sentence_count: 14
    key_terms: [like, print, abp, code, "i'm", test, absolutely, everything]
    concepts: [absolutely, everything, everywhere, print, statements]
    section: Comments
    token_count: 447
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/","kind":"social-post","date":"2025-12-04","author":"Critical-Brain2841","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1pe2teu.md#c4"
    char_span: [5853, 7473]
    sentence_count: 7
    key_terms: [code, understand, problem, variables, certain, "there's", deploy, enough]
    concepts: [understand, problem, variables, certain, "there's"]
    section: Comments
    token_count: 383
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/","kind":"social-post","date":"2025-12-04","author":"Critical-Brain2841","subreddit":"chatgptcoding"}]
---
# When your AI-generated code breaks, what's your actual debugging process?

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1pe2teu/when_your_aigenerated_code_breaks_whats_your/)
Posted by **Critical-Brain2841** · **11↑** · **43 comments**

Curious how you guys handle this.

I've shipped a few small apps with AI help, but when something breaks after a few iterations, I usually just... keep prompting until it works? Sometimes that takes hours.

Do you have an actual process for debugging AI code? Or is it trial and error?

## Comments

- **blazarious** (21↑): This is not an AI coding problem. This is a software engineering problem. It’s the same with human coders. What do you do if the code starts breaking after a few iterations?

There are concepts and workflows that can help you with that: code review, automated testing, static analysis, clean architecture, and pair programming, come to mind. 

It doesn’t matter who does the coding (human or AI or both), what matters is the process. 

At least that’s been my experience in the industry so far.
  - **Quind1** (2↑): Learning to properly debug an application is a skill. There are plenty of videos, OP, that will teach you the debugging process for your architecture/IDE.
    - **blazarious** (2↑): Yes, I glossed over the actual debugging too quickly in my response. This is a very good addition, thank you!
  - **Critical-Brain2841** (2↑): Wow thanks for the reframe. The real question is "what's my process.".... not "how do i prompt better". X totally got me in the wrong path lol

I do have a CS background but haven't touched actual dev workflows in years. The concepts you mentioned - testing, code review, clean architecture - I know what they are but never applied them to AI coding.

What's the minimum viable process you'd recommend for someone building solo? Like, where do you start if you have none of this in place?
    - **blazarious** (0↑): That's great that you're already familiar with those concepts. So, you can start applying them and see which ones work for you.

For me it's these:

**Testing**: I have AI create automated tests and basically verify itself and make sure there won't be regressions down the road.

**Code review**: I always do a code review of the generated code in the end. Depending on the project this might be more or less thorough.

**Clean architecture**: This is a larger topic but it helps a lot if it's not all Spaghetti.

**Static analysis and linting**: This is a very easy sanity check, no reason to skip it.

**Pair programming**: Sometimes working with the AI feels like pair programming, so this one comes naturally.

Now, here comes some shameless self-promotion: I've been using more or less the same tech stack over and over again within the last 2 years or so, with the same techniques for static analysis and testing and a reasonably clean architecture. Now, I sell that stack but you don't have to buy it. I also documented that stack and maybe you wanna check out that [documentation](https://agentready-stack.productionbuild.de/architecture.html) to get some inspiration (or ask your AI agent to reproduce it).
- **sreekanth850** (3↑): I do 95% of Integration test. Decoupled backend and front end, front end is coding by a Front end engineer. AI is for backend only. I almost cover all scenarios in integration testing, and it catches almost most of the produdtcion bugs. Then use detailed logging, Serilog, and then test indvidually to identify the issue in details. this had worked best. Claude is the only option if you have to detect timing bugs, concurrency bugs etc. Also i build on the top of ABP framework that comes with a builtin testing framework. and 80% of the boilerplates are already done with Auth, User management and tenancy.
  - **Critical-Brain2841** (1↑): 95% integration test coverage is some serious stuff! How long did it take you to get there? And do you write the tests yourself or have AI generate them?

The ABP framework mention is interesting - I've been building everything from scratch which is probably part of my problem.
    - **sreekanth850** (1↑): What i understood is, if you build everything yourself, hell of bugs, issues. if you use boilerplates like ABP, 80% of the plumbing is done already and battle tested, your test and fix focus on your core idea not the generic auth, user management, multi tenancy or permissions.. I use Claude to generate every test ,ABP framework have builtin supoort for integration test that i can mirrror 1;1 prod. C# proves to be much better than JS for AI to give cleaner codes. I came from C# and dotnet backgroud
- **pizzae** (3↑): I just panic and lose my mind
- **Old-Bake-420** (5↑): My total amateur approach is to get the AI to do what I would do if I didn't have AI. Start dropping print statements everywhere. If its UI related I have it add little visual overlays that serve the same purpose.

I've also found it surprisingly helpful to just ask a Chatbot that can't see the actual code what the best way to solve a particular problem is from a high level design perspective. Then I'm like, yo! Coding agent, does my code work like this? And it's like, that's genius and your code sucks! Let me fix it!
  - **Soariticus** (1↑): I am full-time employed as a software developer. Whether that means I can officially call myself 'professional' or whether I'm just an amateur with a job is up to you though lol.

I still *absolutely* have print statements absolutely everywhere. Usually it follows the rough format of "\[LINENUM\] - short description : \[value of variables that are related\]"

It does very often still end up being just "bad :(" when I'm just testing to see if a certain function is called or w/e, and I'll insert a print with just "bad :(" in an area that *shouldn't* be getting called.

There's better ways to do it in theory - but honestly, just having a quick print that shows you a certain piece of code has executed along with what values certain variables are very often is more than enough - and a lot less effort than alternatives.
- **UziMcUsername** (2↑): Ask your AI IDE to add logging around where it thinks the problem could be, to pinpoint it. Then test again, copy the debug log from the console and feed it back to the LLM.
- **Gasp0de** (2↑): You read the code, understand what is going on, what is wrong with it, correct it, deploy. Don't just randomly deploy code that you didn't read or understand fully.
- **rjames24000** (1↑): use the debugger, shove a breakpoint it and you should understand your code well enough to look at the variables in a couple breakpoints and know if they are right, continue to move through the code until you find the problem

orrr write the unit tests first with ai, and frequently check them every time ai makes a change, if anythings broken your ai code is shit
- **QultrosSanhattan** (1↑): I never let AI to hijack the architecture. I only use it for junior level tasks like nested iterations, recursions and other low level stuff.

If there's a problem, it's quickly isolated by default, AI code should limit itself to accept inputs and return corresponding outputs.

Most of my prompts are: "create a functions that accepts these inputs, does this and returns that"
- **supermopman** (1↑): I do interactive debugging like I always used to.

Sometimes I ask the AI for help now while doing that and it's nice.
- **Myg0t_0** (1↑): Try again,  but no bugs!
