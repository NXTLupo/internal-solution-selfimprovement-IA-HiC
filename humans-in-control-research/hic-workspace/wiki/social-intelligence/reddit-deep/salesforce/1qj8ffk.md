---
id: social-intelligence/reddit-deep/salesforce/1qj8ffk.md
url: "https://www.reddit.com/r/salesforce/comments/1qj8ffk/how_are_people_actually_using_salesforce_metadata/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "How are people actually using Salesforce Metadata API in Apex for newer metadata (External Client App)? mdapi + WSDL"
author: "KaranSingh0712"
date: "2026-01-21T19:58:38.000Z"
score: 2
upvote_ratio: 1
num_comments: 4
flair: "developer"
extracted_at: "2026-06-11T18:58:38.962Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1qj8ffk.md#c0"
    char_span: [0, 1274]
    sentence_count: 9
    key_terms: [metadata, apex, salesforce, wsdl, mdapi, newer, api, approach]
    token_count: 299
  - id: "social-intelligence/reddit-deep/salesforce/1qj8ffk.md#c1"
    char_span: [1289, 2859]
    sentence_count: 9
    key_terms: [metadata, apex, api, using, salesforce, apexcode, external, handled]
    section: Comments
    token_count: 373
---
# How are people actually using Salesforce Metadata API in Apex for newer metadata (External Client App)? mdapi + WSDL

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1qj8ffk/how_are_people_actually_using_salesforce_metadata/)
Posted by **KaranSingh0712** · **2↑** · **4 comments**

Hi folks,

I’m working with Salesforce Metadata API in Apex (no UI) and running into issues with newer metadata types like External Client App and its related settings.

What I found so far:
1. The commonly used MetadataService class from Andy in the Cloud’s mdapi repo doesn’t include many newer metadata types.

2. Manually creating Apex classes by looking at the Metadata WSDL compiles but fails at runtime (Unable to find apex schema info)

3. mdapi patcher seems to be the suggested approach, but:
- The full Metadata WSDL is >1MB and can’t be uploaded
- The repo doesn’t include a ready-to-use trimmed WSDL
- It looks like manual WSDL trimming + patching is required

My questions:
1. Is this really how people handle any newer metadata type in Apex?
2. Do you actually use mdapi patching in real projects?
3. Or do most teams avoid Apex Metadata API and use some other approach?

Would love to hear how others are handling this in practice.

Thanks 🙏

## Comments

- **rawmixs** (2↑): That pretty much sums it up, the mdapi wrappers lag, WSDL2Apex hits size/complexity limits, and once you get into things like External Client App, you’re in trim-and-patch territory. Yes, people can make that work, but most teams don’t choose it unless they’re locked into Apex-only automation.

What I mostly see is either provisioning/config handled at deploy time via SFDX/CI/CD (or DevOps Center), not runtime Apex or true dynamic needs handled outside Apex where SOAP tooling isn’t fighting you.

Which gets to the real question, what’s the business problem that requires creating or mutating an External Client App at runtime? Once that’s clear, the “Apex Metadata API” requirement often disappears. OAuth clients live firmly in org-level security configuration, not tenant data, and a lot of the friction you’re hitting here is very intentional on Salesforce’s part.
- **zdware** (1↑): is there any reason why you aren't using the SF CLI / or the metadata REST API? 

SOAP is quite old/inefficient -- not surprised you are having WSDL issues/etc.
  - **zdware** (1↑): Ah, I just read you are using the metadata API in Apex???. Not a great place to handle that given you have a heap size limit of 6 mb and 10 seconds of CPU time...

Actually I'm not sure what you are doing xD -- the metadata api usage in Apex only supports 2 types... - https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_metadata_supported_types.htm
- **iheartjetman** (1↑): You can get a lot of the same functionality by using the REST tooling api.
