---
id: articles/reddit-deep-r-machinelearning/cc7ffd60fa.md
url: "https://www.reddit.com/r/MachineLearning/comments/1t4mzm3/production_ai_very_different_from_the_demos_d/"
url_hash: "cc7ffd60fa"
kind: "article"
source: "Reddit Deep: r/machinelearning"
title: "Production AI very different from the demos [D]"
author: ""
date: "2026-05-05T17:52:35.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-31T21:52:18.508906+00:00"
chars: 2983
chunks:
  - id: "articles/reddit-deep-r-machinelearning/cc7ffd60fa.md#c0"
    char_span: [0, 1332]
    sentence_count: 6
    key_terms: [feature, machinelearning, because, production, dashboard, openai, reddit, trying]
    token_count: 277
  - id: "articles/reddit-deep-r-machinelearning/cc7ffd60fa.md#c1"
    char_span: [1334, 3183]
    sentence_count: 11
    key_terms: [task, workflow, decide, architecture, orchestrator, agent, model, challenge]
    token_count: 423
---
# Production AI very different from the demos [D]

Source: [Reddit Deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1t4mzm3/production_ai_very_different_from_the_demos_d/)

Moved an AI feature into production a few months ago and the cost profile has been a constant surprise since so the demos and the early prototypes ran cheap because the volume was tiny + the prompts were short but when it hit traffic the token usage scaled a lot. I think it was partly because customers ask longer and unclear questions than our test set because we ended up adding context retrieval that doubled the input length on every call.  
  
We started on GPT4o for the early version and the response quality was good enough that nobody pushed back but after a few weeks of volume the bill came in higher and finance had no way to break out which feature or which model was driving it. I am pulling exports from the OpenAI dashboard and trying to map them back to features manually which is not sustainable.  
I shipped the feature and now I am the de facto owner of the cost question. The OpenAI dashboard tells me the total but it does not tell me what I actually need to answer and I spend half a day every week trying to reconcile token counts against feature usage but I am still not confident in the numbers I hand off.

--- TOP COMMENTS ---
[17↑ Dapper_Letterhead_80] The token cost problem doesn't show up in demos because you control the inputs. Real users write long and messy and the context window fills up fast.
[13↑ MetalAdditional2040] The attribution is the real issue here. OpenAI gives you spend but not spend-by-feature and that gap is yours to fill manually.
[4↑ Character-File-6003] Exactly. But this manual way of figuring out can't be kept up after a couple of features.
[1↑ No_Inspection4415] And also the distribution is an issue if anything you do is related to user data and you have users with different needs. If you do not already have a lot of relevant data it is a challenge, and it is a challenge regardless because sampling is hard and evaluation of LLMs is costly.
[11↑ Foreign-Manner6555] Here's how you should approach it if you need a plan. First are log tokens in and out per call at your application layer and tag by feature from day one. Secondly move cheaper tasks to a smaller model and keep GPT4o only where quality matters. And finally set a prompt length cap and test it
[5↑ Outrageous-Tea-315] On the model routing point, how did you decide which calls needed GPT-4o and which ones don't? It's still a maze for me
[3↑ Unnamed831] I think we can  decide that for our task like in langraph we have control over the entire flow for each agent we can select a specific model that is required for that task and the architecture of the workflow decides which agent should be routed the task next. 

For example there's the orchestrator architecture of agents  where the orchestrator decides which agent task should be routed so agents can decide themselves. 

For specific workflow we can define that workflow as per our needs
[3↑ new_name_who_dis_] You should have a different auth token for each feature to see the costs separately.
