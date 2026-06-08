---
id: social-intelligence/reddit-deep/machinelearning/1t4mzm3.md
url: "https://www.reddit.com/r/MachineLearning/comments/1t4mzm3/production_ai_very_different_from_the_demos_d/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "Production AI very different from the demos [D]"
author: "Far-Football3763"
date: "2026-05-05T17:52:35.000Z"
score: 16
upvote_ratio: 0.73
num_comments: 29
flair: "Discussion"
extracted_at: "2026-05-31T21:49:57.036Z"
extraction_method: "praw-deep"
research_goal: "Identify emerging AI design trends, skills, tools, platforms, and technical implementations that would  help a company's creative team to move beyond AI as a concepting aid and understand where AI-enabled tools, workflows and internal models can practically support design production, system testing, asset generation, governance and stakeholder confidence. \n"
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1t4mzm3.md#c0"
    char_span: [0, 1391]
    sentence_count: 6
    key_terms: [feature, machinelearning, because, production, dashboard, comments, openai, trying]
    token_count: 297
  - id: "social-intelligence/reddit-deep/machinelearning/1t4mzm3.md#c1"
    char_span: [1406, 3116]
    sentence_count: 10
    key_terms: [task, decide, architecture, orchestrator, agent, model, challenge, because]
    section: Comments
    token_count: 405
  - id: "social-intelligence/reddit-deep/machinelearning/1t4mzm3.md#c2"
    char_span: [3118, 4102]
    sentence_count: 6
    key_terms: [feature, data, workflow, costs, token, usage, api, like]
    section: Comments
    token_count: 214
  - id: "social-intelligence/reddit-deep/machinelearning/1t4mzm3.md#c3"
    char_span: [4104, 6084]
    sentence_count: 12
    key_terms: [attribution, requests, emergency, cost, outbound, though, going, term]
    section: Comments
    token_count: 418
---
# Production AI very different from the demos [D]

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1t4mzm3/production_ai_very_different_from_the_demos_d/)
Posted by **Far-Football3763** · **16↑** · **29 comments**

Moved an AI feature into production a few months ago and the cost profile has been a constant surprise since so the demos and the early prototypes ran cheap because the volume was tiny + the prompts were short but when it hit traffic the token usage scaled a lot. I think it was partly because customers ask longer and unclear questions than our test set because we ended up adding context retrieval that doubled the input length on every call.  
  
We started on GPT4o for the early version and the response quality was good enough that nobody pushed back but after a few weeks of volume the bill came in higher and finance had no way to break out which feature or which model was driving it. I am pulling exports from the OpenAI dashboard and trying to map them back to features manually which is not sustainable.  
I shipped the feature and now I am the de facto owner of the cost question. The OpenAI dashboard tells me the total but it does not tell me what I actually need to answer and I spend half a day every week trying to reconcile token counts against feature usage but I am still not confident in the numbers I hand off.

## Comments

- **Dapper_Letterhead_80** (17↑): The token cost problem doesn't show up in demos because you control the inputs. Real users write long and messy and the context window fills up fast.
- **MetalAdditional2040** (13↑): The attribution is the real issue here. OpenAI gives you spend but not spend-by-feature and that gap is yours to fill manually.
  - **Character-File-6003** (4↑): Exactly. But this manual way of figuring out can't be kept up after a couple of features.
  - **No_Inspection4415** (1↑): And also the distribution is an issue if anything you do is related to user data and you have users with different needs. If you do not already have a lot of relevant data it is a challenge, and it is a challenge regardless because sampling is hard and evaluation of LLMs is costly.
- **Foreign-Manner6555** (11↑): Here's how you should approach it if you need a plan. First are log tokens in and out per call at your application layer and tag by feature from day one. Secondly move cheaper tasks to a smaller model and keep GPT4o only where quality matters. And finally set a prompt length cap and test it
  - **Outrageous-Tea-315** (5↑): On the model routing point, how did you decide which calls needed GPT-4o and which ones don't? It's still a maze for me
    - **Unnamed831** (3↑): I think we can  decide that for our task like in langraph we have control over the entire flow for each agent we can select a specific model that is required for that task and the architecture of the workflow decides which agent should be routed the task next. 

For example there's the orchestrator architecture of agents  where the orchestrator decides which agent task should be routed so agents can decide themselves. 

For specific workflow we can define that workflow as per our needs
- **new_name_who_dis_** (3↑): You should have a different auth token for each feature to see the costs separately.
- **Miserable_Bit7921** (2↑): You are not going to win this with manual reconciliation cause the data shape is wrong for spreadsheets. Tag the application layer when you make the API call so usage is attributed natively or pull the data into a system that handles the breakdown automatically. The middle ground of weekly exports is the worst of both worlds.
- **Primary_Pollution_24** (2↑): Yeah this hits home. I've been down the same rabbit hole trying to track costs per feature after the fact - it's like doing archaeology on your own code. 

One thing that saved me was adding a simple middleware that logs model + token counts with a feature tag before hitting the API. Takes like 20 lines but suddenly you have real attribution data instead of playing detective with usage dashboards every week.

The prompt length thing is brutal though - users will paste entire emails into a chat box if you let them..
- **RatioEnough8821** (2↑): Context retrieval doubling your input length on every call is the kind of thing that only shows up at volume. The prototype cost and the production cost are measuring different things
  - **Careful-Estimate4348** (1↑): Pulling it into a system that handles the breakdown would be what you want to aim and the tooling has caught up to that like there's Ramp which has AI Spend Intelligence specifically for this, it integrates directly with the providers and gives you the team and model level attribution natively.
- **RageOnGoneDo** (2↑): What a shocker
- **theanswerisnt42** (1↑): I’m pretty sure we’re going to see a YC startup that solves this exact problem in roughly 3 months.
- **hi117** (1↑): Cloud platforms such as AWS often provide statistics on INPUT requests, but most platforms actually don't. Tracing OUTBOUND requests generally requires your software to handle it. Thankfully, this can be relatively simple, though potentially expensive. OpenTelemetry could be an emergency solution to drop in and get statistics on outbound requests depending on your stack, as would DataDog which has complete feature overlap. These solutions can be very expensive at scale though, so I wouldn't recomend outside of an emergency and zero effort response. The actual recomended response from me requires some assumptions. I'm going to assume you're in some cloud environment and that logging is going to an S3-like system. Simply add a log line so that it logs outbound requests and the expected cost of the query. You can then use a tool like Athena (or just bulk download and grep) to do a one time query on the logs. You probably aren't interested in long term attribution but short term emergency attribution here. Long term attribution would require more thought and pricing profiling since it will cost money to know where your costs lie.
