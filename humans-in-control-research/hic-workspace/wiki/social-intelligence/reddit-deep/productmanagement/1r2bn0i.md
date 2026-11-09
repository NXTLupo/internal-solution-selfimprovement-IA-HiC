---
id: social-intelligence/reddit-deep/productmanagement/1r2bn0i.md
url: "https://www.reddit.com/r/ProductManagement/comments/1r2bn0i/ai_in_health_tech/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "AI in health tech"
author: "IntelligentLong6310"
date: "2026-02-11T22:22:40.000Z"
score: 38
upvote_ratio: 0.97
num_comments: 40
flair: ""
extracted_at: "2026-10-09T16:37:15.730Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1r2bn0i.md#c0"
    char_span: [0, 1466]
    sentence_count: 8
    key_terms: [healthcare, productmanagement, space, solutions, comments, agentic, talking, health]
    concepts: [healthcare, productmanagement, space, solutions, comments]
    token_count: 326
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1r2bn0i/ai_in_health_tech/","kind":"social-post","date":"2026-02-11","author":"IntelligentLong6310","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1r2bn0i.md#c1"
    char_span: [1481, 2088]
    sentence_count: 6
    key_terms: [encrypted, encrypt, users, data, phi, sonographers, unencrypted, gitwrapped]
    concepts: [encrypted, encrypt, users]
    section: Comments
    token_count: 131
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1r2bn0i/ai_in_health_tech/","kind":"social-post","date":"2026-02-11","author":"IntelligentLong6310","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1r2bn0i.md#c2"
    char_span: [2090, 4083]
    sentence_count: 12
    key_terms: [use, compliance, intelligentlong6310, data, because, example, expert, regulations]
    concepts: [intelligentlong6310, compliance, because, example, expert]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1r2bn0i.md#c3"]
    section: Comments
    token_count: 454
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1r2bn0i/ai_in_health_tech/","kind":"social-post","date":"2026-02-11","author":"IntelligentLong6310","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1r2bn0i.md#c3"
    char_span: [4085, 6131]
    sentence_count: 9
    key_terms: [intelligentlong6310, healthcare, compliance, compliant, data, epic, leverage, company]
    concepts: [intelligentlong6310, healthcare, compliance, compliant, leverage]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1r2bn0i.md#c2"]
    section: Comments
    token_count: 474
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1r2bn0i/ai_in_health_tech/","kind":"social-post","date":"2026-02-11","author":"IntelligentLong6310","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1r2bn0i.md#c4"
    char_span: [6133, 8160]
    sentence_count: 15
    key_terms: [use, intelligentlong6310, data, product, nomoreonetimes, documentation, legal, engineering]
    concepts: [intelligentlong6310, nomoreonetimes, documentation, product, engineering]
    section: Comments
    token_count: 460
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1r2bn0i/ai_in_health_tech/","kind":"social-post","date":"2026-02-11","author":"IntelligentLong6310","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1r2bn0i.md#c5"
    char_span: [8162, 8997]
    sentence_count: 7
    key_terms: [llm, referral, agentic, patient, models, de-identification, phi, use]
    concepts: [referral, agentic, patient, models]
    section: Comments
    token_count: 174
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1r2bn0i/ai_in_health_tech/","kind":"social-post","date":"2026-02-11","author":"IntelligentLong6310","subreddit":"productmanagement"}]
---
# AI in health tech

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1r2bn0i/ai_in_health_tech/)
Posted by **IntelligentLong6310** · **38↑** · **40 comments**

My background is in health tech and I was laid off last month after being with my org for over 7 years. I’m trying to get up to speed with AI and the ways it can be applied practically in my next role. I’m not talking about using it to automate ticket creation, PRDs or synthesizing feedback etc. I’m talking about agents and agentic AI Theres lots of opportunity in the healthcare space where I could see this concept automating complex workflows and genuinely adding value in ways that improve outcomes and quality and reduce costs

I’m seeing a ton of posts all over LinkedIn about how “easy” it is now to prototype and how you can set shit up with lovable, n8n, RAGS etc but it feels so unattainable in the healthcare space when all of the reference data we would need has PHI involved. Does anyone have experience building solutions using agentic AI in the healthcare operations context? How do you manage when it requires the use of PHI? As an example thinking about solutions that could help with care navigation and closing the referral loop. 

Sorry if this is a ramble but like so many others I just feel so “behind” and I’m struggling to really figure out how realistic is it is to take advantage of this type of technology in the healthcare space.

## Comments

- **GitWrapped** (14↑): We developed a ultrasound AI system, but this was more for Computer Vision but still AI with deep learning models. We use client side KMS in AWS to encrypt PHI to be shared between users. This data was embedded in DICOM images and we had to strip it out, encrypt and serve it encrypted.

This can be HIPAA compliant.

So long as it is encrypted at rest and in transit and only unencrypted for users whom have the privilege level to see PHI then you're good. For practical purposes the sonographers needed to be able to see this data so they knew which patient they were dealing with.

I think an LLM would need to be agnostic to any PHI and only deal with the facts for analysis.
  - **IntelligentLong6310** (2↑): This is a really useful example - thanks for sharing!
- **ziti_mcgeedy** (12↑): This is my domain and I feel like the key is to force discussions early and a part of the PRD but don’t pretend like you’re a compliance or security or infra expert, that’s not the job. More important to understand the tech and to use it (and where not to use it) which for product means being an expert in the workflows for example, and how to measure AI use cases (business level requirements, human in the loop etc). Thats just been my experience though as someone who isn’t a compliance expert but has built these tools
- **ActiveDinner3497** (6↑): I’d make a fake data set to be used. Everything valid in terms of data allowances and constraints, but all info bogus. Should only taking 15-20 rows to play with AI tools. Start small like patient basic info only and expand as needed. Even ask AI to build the junk data sets for you.
  - **IntelligentLong6310** (6↑): Yeah this is a good tip for prototyping and proving a concept- I’m just wondering once that’s validated how do we execute the idea in practice. But I’m wondering if that’s more of an engineering / security / legal convo
- **HelloHyde** (5↑): I work in this space, and you're correct that there's enormous potential but it requires care. A lot of it has to be more systematic. So for example the AI providers you use have to have strict compliance agreements in place before you use them, or you need to explore self-hosting. And you have to have certifications for anyone who might access the data directly. 

Most healthcare companies in this space tend to be pretty mature because of all the regulations; there's a high barrier to entry because of the privacy issues, and it ends up being fairly tough (not impossible, though) to design something that would violate regulations because it's all so locked down. 

In other words, I just listen to the people whose job it is to make sure we're compliant, and those conversations happen early.
  - **ziti_mcgeedy** (3↑): yea this is my exact comment above pretty much, dont LARP as a compliance expert but bring the people in the room
- **UnprocessedAutomaton** (5↑): Healthcare presents one of the biggest opportunities in AI but it’s also got the most challenging bottlenecks in terms of compliance, including (but not limited to) legal, privacy and safety requirements. I work as an AI lead in a renowned healthcare company in Canada and 90% of my time is spent in compliance related activities. Nothing moves unless you solve that so don’t underestimate it if you’re seriously considering working in ai in healthcare/tech. Your best friends (and worth enemies) are the legal, infosec and privacy folks.
  - **IntelligentLong6310** (1↑): Is it still fun? Haha
- **Rotatos** (3↑): Okay so as someone working on similar data, your infra side should set up compliant ways to use the models, typically on bedrock or GCP alongside an agreement with said LLM (Anthropic etc).

It’s honestly done in very similar ways as you would expect data governance on PII or PHI
  - **IntelligentLong6310** (1↑): As long as we’re compliant in that way, do we need patient permission ? If for example we wanted to build our own LLM using de identified patient data?
- **resilientbresilient** (2↑): Question for y’all; I work for a large healthcare provider and leadership is more focused on leveraging Epic workflows (and whatever AI solution they have). It leaves no room for stand alone applications that leverage AI, I’ve built them and they’re all being turned off for something that may be in Epic’s backlog in 18 months. 

Can y’all provide guidance on what companies to look out for that can leverage product management and AI?
  - **IntelligentLong6310** (2↑): Hard solidarity on the Epic stuff - before AI we had the same issues as a 3rd party SaaS company and they pretty much beat us out of the game using this method

I’m not sure I’m following your question - are you looking for companies in the health tech industry looking for AI PMs?
- **[deleted]** (2↑): Hey! I’m taking AI product management by the Pms at cursor and Anthropic… and this is my capstone project. I’m not that far along yet but if you want to chat — I can also ask the advisors for their POV! My background is in ML and marketplaces but new to LLMs and this new wave of AI
  - **IntelligentLong6310** (1↑): Sent you a PM!
- **nomoreonetimes** (2↑): I work in health tech and actually just launched an AI product within our space related to governance, risk, and compliance. The biggest factor is compliance review and never use real data unless precautions protecting PHI are in place.  One thing that has come up a lot is making sure your documentation regarding your use of AI is top notch.  It was one of the first things I had legal review while still in the prototype stage.  Nothing moves unless approved like someone mentioned above. 

As far as using AI for product management tasks, I don’t use real data in prototyping. I have the application I use create mock data. I can then give the engineers access to the fully functional mock at planning. I then feed the prototype into AI and have it write my ACs for me to refine. It’s a huge time saver.
  - **IntelligentLong6310** (1↑): Did you own that documentation for legal or did engineering (or did you work on it together?)
    - **nomoreonetimes** (2↑): I owned it.  Once engineering decided on what solution we would use, I then verified and documented how it complied with healthcare regulations and proof of it along with compiling any additional things legal may reference or verify such as BAAs and the such. I like to keep everything together for quick reference for the company.
- **Slight_Warthog8706** (2↑): The LinkedIn crowd making it look easy is mostly building demos on clean, non-regulated data

On the PHI problem specifically, this is the central challenge and there are a few patterns emerging:

\- De-identification pipelines before the AI layer touches anything. The practical approach most orgs are taking is sanitizing PHI before it hits an LLM. There's recent research on hybrid approaches using regex + NER models (like BERT-based classifiers) to strip identifiers before inference, then re-associate on the output side. This lets you use foundation models without them ever seeing raw PHI.

\- Agentic ≠ generative when it comes to compliance. A key distinction: the agent can use an LLM to understand intent ("patient needs cardiology referral") but the \*action\* (querying the EHR, sending the referral) runs through deterministic, auditable scripts hitting FHIR APIs. The LLM reasons, but secure code executes. This separation is what makes agentic AI actually viable in healthcare vs. just throwing GPT at patient data.
