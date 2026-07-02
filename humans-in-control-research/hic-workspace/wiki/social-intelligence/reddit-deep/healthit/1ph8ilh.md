---
id: social-intelligence/reddit-deep/healthit/1ph8ilh.md
url: "https://www.reddit.com/r/healthIT/comments/1ph8ilh/architecture_advice_smart_on_fhir_ehr_launch/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "Architecture Advice: SMART on FHIR EHR Launch + Authentication Strategy"
author: "NotNoobMaster69"
date: "2025-12-08T09:53:06.000Z"
score: 9
upvote_ratio: 1
num_comments: 5
flair: "Integrations"
extracted_at: "2026-06-22T21:46:00.293Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market outlook report on the state of AI adoption across the healthcare sector heading into 2026, analyzing clinical and operational use cases, deployment barriers, and regulatory drivers. Evaluate current health system integration trends, investment priorities, and market growth indicators based on recent industry research and deployment data."
engagement: "deliver-a-strategic-market-outlook-report-on-the-state-of-ai"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1ph8ilh.md#c0"
    char_span: [0, 1438]
    sentence_count: 12
    key_terms: [launch, application, epic, authentication, user, patient, "i'm", custom]
    concepts: [launch, application, authentication, patient, architecture]
    token_count: 321
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1ph8ilh/architecture_advice_smart_on_fhir_ehr_launch/"}]
  - id: "social-intelligence/reddit-deep/healthit/1ph8ilh.md#c1"
    char_span: [1452, 2734]
    sentence_count: 3
    key_terms: [user, epic, additional, context, smart, users, b2c, ehr]
    concepts: [additional, context, smart, users]
    section: Comments
    token_count: 292
---
# Architecture Advice: SMART on FHIR EHR Launch + Authentication Strategy

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1ph8ilh/architecture_advice_smart_on_fhir_ehr_launch/)
Posted by **NotNoobMaster69** · **9↑** · **5 comments**

Hey everyone, I'm looking for some guidance from those experienced with SMART on FHIR implementations.

I'm building a custom application that integrates with Epic via SMART on FHIR. I have created a sandbox UI with Epic that can act like a PMS System and when I select a patient from this PMS System, it should launch my custom application for that patients session.

In short this is my desired flow: 
1. User logs into Epic Hyperspace 
2. User navigates to patient list 
3. User selects a patient 
4. Epic launches my custom application for that patient (EHR Launch) 

The problem I'm facing is that I'm trying to understand whats the the best authentication architecture. (Between step 3 and 4)

My application currently uses Azure AD B2C for user authentication, but I realize that for the EHR Launch scenario, I shouldn't be asking users to log in again since they're already authenticated in Epic. 

What I was thinking to do is token exchange in backend. When Epic launches my app with the launch parameters (iss + launch token), should all the OAuth token exchange happen server-side without any user interaction? 

Any help or suggestions would be grateful. Thanks

## Comments

- **BatmanUnderBed** (2↑): yeah, for an EHR launch you definitely don’t want to throw an Azure B2C login screen at someone who just came from Hyperspace

usual pattern is: treat Epic as the IdP for that flow, do the full SMART on FHIR auth code exchange server-side with your confidential client, and use the resulting access token + user/context claims to map into your own user model instead of reauthing them.  you can still keep B2C for standalone logins, but for in EHR launches I’d handle it all in the backend and just drop the user straight into the patient session, then use something like supanote on your side if you need to track how you’re mapping Epic users/contexts to your app’s accounts over time.
- **therealzordon** (2↑): I'm pretty sure most apps I've seen are using the SMART on FHIR user context and not additional authentication; you can also pull some additional info about the user who launched it. I remember at least one that validated the user against an AD group to make sure they really should be in there.
- **Danimal_House** (1↑): What does your application do/when would users be accessing it?

Epic already has SoF integrations baked in for a number of applications, and im fairly certain you need to go through them to get anything new configured.
