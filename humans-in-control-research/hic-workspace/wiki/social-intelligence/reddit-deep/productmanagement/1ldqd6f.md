---
id: social-intelligence/reddit-deep/productmanagement/1ldqd6f.md
url: "https://www.reddit.com/r/ProductManagement/comments/1ldqd6f/technical_debtdocumentation_for_startups/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Technical Debt/Documentation for Startups"
author: "rmend8194"
date: "2025-06-17T15:37:44.000Z"
score: 29
upvote_ratio: 0.93
num_comments: 11
flair: ""
extracted_at: "2026-06-14T15:28:02.847Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1ldqd6f.md#c0"
    char_span: [0, 1342]
    sentence_count: 4
    key_terms: [productmanagement, integration, comments, notion, tests, definition-of-done, debt, doc]
    token_count: 343
  - id: "social-intelligence/reddit-deep/productmanagement/1ldqd6f.md#c1"
    char_span: [1344, 2533]
    sentence_count: 7
    key_terms: [documentation, testing, tools, help, recommendations, off-the-shelf, integration, lightweight]
    token_count: 288
  - id: "social-intelligence/reddit-deep/productmanagement/1ldqd6f.md#c2"
    char_span: [2548, 3538]
    sentence_count: 4
    key_terms: [because, documentation, features, startup, testing, mindless-compote-352, test, complicated]
    section: Comments
    token_count: 238
  - id: "social-intelligence/reddit-deep/productmanagement/1ldqd6f.md#c3"
    char_span: [3543, 5489]
    sentence_count: 13
    key_terms: [documentation, unit, trade-offs, perfect, startup, "don't", tests, engineering]
    section: Comments
    token_count: 455
  - id: "social-intelligence/reddit-deep/productmanagement/1ldqd6f.md#c4"
    char_span: [5491, 7279]
    sentence_count: 12
    key_terms: ["it's", warning, feature, build, time, experiment, important, something]
    section: Comments
    token_count: 396
  - id: "social-intelligence/reddit-deep/productmanagement/1ldqd6f.md#c5"
    char_span: [7281, 7771]
    sentence_count: 4
    key_terms: [observability, immediately, internship, production, extremely, important, questions, rmend8194]
    section: Comments
    token_count: 120
---
# Technical Debt/Documentation for Startups

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1ldqd6f/technical_debtdocumentation_for_startups/)
Posted by **rmend8194** · **29↑** · **11 comments**

TL;DR: Early-stage SaaS wondering if our test & doc debt is normal. How much are you doing and what’s the minimum that keeps you sane?

I’m product-side at a **6-person, seed-stage SaaS company** (one full-time engineer, two part-timers, one QA eng). We’ve just eaten a couple of nasty production bugs—think **500s in our sign-up flow** because a vendor SDK drifted—and it’s forced us to ask:

>Are we way behind the curve on testing & docs,  
or is everyone else kind of winging it too

# What we have today

* **Unit tests:** \~15 % coverage, almost zero on the front-end.
* **Integration/E2E:** Cypress hits the main happy path, but no automated checks on third-party APIs
* **Docs:** A Notion space with PRDs and “how to set up local dev,” nothing formal for integrations or runbooks.

# What I think we should have

* Nightly “heartbeat” smoke tests for each external API
* Owner & risk fields for every integration in Notion
* A basic Definition-of-Done that forces a test + a doc stub

But I don’t know if this is table-stakes or over-engineering for our size.

# Questions for the hive mind

1. **Head-count & stage** – how big is your eng team and how far along are you?
2. **Unit-test coverage %** – and be honest, no judgment.
3. **Integration testing:**
   * Do you hit vendor sandboxes every day?
   * Any off-the-shelf tools you love (Postman Monitors, Assertible, etc.)?
4. **Living documentation:**
   * Do you maintain a “service catalog” or is it tribal knowledge?
   * If you *do* track it, where (Notion, Confluence, Backstage, plain README)?
5. **Biggest “wish we’d done this sooner” moment** regarding testing or docs.
6. **Tool Recommendations** \- One thing I've already honed in on is using Cursor to start generating documentation for all of our code base and even unit tests. Any other AI tools that can help?

We’re trying to carve out \~25 % of each sprint for reliability work, but time is scarce and shiny new features always look sexier. Some real-world data points would help us understand where the bar actually sits.

Appreciate any war stories, rough numbers, or “here’s what finally bit us” anecdotes. Links to good lightweight frameworks or checklists welcome.

Thanks in advance—happy to share more details or results after we gather a few responses.

## Comments

- **Mindless-Compote-352** (11↑): I believe you are way better covered than an average 6-person startup 🙌 It’s normal to prioritize features that will help you scale and grow, you’ll pay off the documentation and security debt sometime down the road. Keep rocking!
- **orofirm** (4↑): \> We’ve just eaten a couple of nasty production bugs—think **500s in our sign-up flow** because a vendor SDK drifted—and it’s forced us to ask

  
if this happened on the 12th of June, its because there was a global Google Clouds & Cloudflare (because it depended on a GC service) outage. Literally most of the internet had 500s errors so don't worry about that. 

  
a startup I work with is in the 

\- \~6M ARR, 

\-  12 engineers

\- no test coverage requirement. We only write test for the things which are complicated

\- we have a part time manual tester who does release testing. the team is testing the features they build themselves 

\- the unit tests and the source code is the documentation 

  
really depends on the product, but if you are a 6 person startup, I wouldn't be fixated on unit test coverage. presumably thing still change rapidly, so the RIO on the unit tests might not worth it
  - **rmend8194** (0↑): So would you recommend incorporating unit testing more forcefully for our core features?
    - **orofirm** (0↑): imo, core features which include a lots of logic would be great candidate to have mandatory unit tests for
- **No-Management-6339** (2↑): This is on engineering to determine. You're a PO, not the engineering manager. If the issues are an issue for the company, go talk to the EM. It's very often that if you have a good product, the things you think are a problem aren't. Very often a button that doesn't work is way less of a problem for the customer than not having a feature.
- **MadeInASnap** (2↑): As a startup, you have to do a lot of trade-offs and take on a lot of debt, including tech debt, in order to get off the ground. In a perfect world we'd have infinite time to make things perfect before expanding, but in reality we have a fixed amount of venture capital before the company goes bankrupt. That's your runway to take off from, and if the plane doesn't take off it crashes into the trees.

Managing a startup isn't about making things perfect, it's about balancing trade-offs. So don't feel bad that trade-offs had to be made and your documentation and CI/CD have flaws. You have some in place, and that's pretty good.

\---

When using Cursor to generate documentation, try using Agent mode if you aren't already. That gives it the ability to choose its own files to read and explore the codebase by itself.
- **full_arc** (1↑): Personally I don't believe in documentation for this type of stuff, especially at that stage. We're similar size in terms of headcount, and this is what we do:

\-> **Unit tests**: We do have plenty, but we don't obsess over this. We focus on the core functionality

\-> **Taking the time to plan and anticipate**: This is probably the biggest one. For each feature we informally decide if it's an experiment or a stepping stone towards a bigger vision. If it's an experiment, we ship super quickly and acknowledge that we'll need to throw away the code before we build any more on top of it. If we have conviction in the feature, then we take the time to discuss the 11 version of it and then break down the increments from there. This helps reduce cruft build up and building on top of janky foundations

\-> **We review every single error and warning that comes in**: And we address them. Either it's not something we're concerned about and we remove that warning, or if it's a legit warning we take the time to fix it. Staying up to date and keeping a tidy house ensures that we don't grow numb to warning signs.

  
I think at this stage of the game it's a real balance and you need to be careful not to over-rotate and start pulling in place policies and processes that hamstring you.
- **rmend8194** (1↑): That second one is huge… so if it’s something that will be a part of the app for a while, you do a thought exercise on what the 11th version of the feature looks like?
- **ubiquae** (1↑): Unit tests are not that important at this stage, prioritize hot spots, complex business logic.

E2E is important, focus on not only the happy path but other use cases. Services like ghostinspector can help you build tests fast offloading the test platform and leveraging automation since they focus on a programmatic approach towards testing (strong APIs).

AI for unit testing is ok but always keep the man in the loop, in this case QA, to review the prompts and the outputs.

Sentry can help to deal with errors while developing and also in production.

Focus on observability, fast CI/CD, rollbacks and a super clear path to fix bugs in production. This is extremely important. Errors will happen, you need to know immediately (not the customer raising the hand), rollback and/or ship hotfixes.
- **New_Marionberry4029** (1↑): Hey u/rmend8194, I'm a student applying for a PM internship at Postman and want to come in with real user insight rather than just my own takes. Mind if I ask you a couple of questions about how you've been using it?
