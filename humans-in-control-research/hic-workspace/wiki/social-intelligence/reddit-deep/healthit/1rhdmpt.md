---
id: social-intelligence/reddit-deep/healthit/1rhdmpt.md
url: "https://www.reddit.com/r/healthIT/comments/1rhdmpt/experience_integrating_with_epic_using_their_fhir/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "Experience integrating with EPIC using their FHIR APIs"
author: "redd_pratik"
date: "2026-02-28T20:50:06.000Z"
score: 26
upvote_ratio: 0.82
num_comments: 26
flair: "Integrations"
extracted_at: "2026-06-22T21:46:00.284Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market outlook report on the state of AI adoption across the healthcare sector heading into 2026, analyzing clinical and operational use cases, deployment barriers, and regulatory drivers. Evaluate current health system integration trends, investment priorities, and market growth indicators based on recent industry research and deployment data."
engagement: "deliver-a-strategic-market-outlook-report-on-the-state-of-ai"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1rhdmpt.md#c0"
    char_span: [0, 710]
    sentence_count: 4
    key_terms: [fhir, integrating, experience, healthcare, fhir-integration-with-epic, comments, healthit, https]
    concepts: [integrating, experience, healthcare, comments, healthit]
    token_count: 176
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1rhdmpt/experience_integrating_with_epic_using_their_fhir/"}]
  - id: "social-intelligence/reddit-deep/healthit/1rhdmpt.md#c1"
    char_span: [724, 1724]
    sentence_count: 10
    key_terms: [epic, experience, systems, advice, thanks, solutionsexistinpast, wrong, type]
    concepts: [experience, systems, advice, thanks, wrong]
    section: Comments
    token_count: 233
  - id: "social-intelligence/reddit-deep/healthit/1rhdmpt.md#c2"
    char_span: [1726, 3297]
    sentence_count: 13
    key_terms: [epic, integration, big-info, curious, patient, thanks, jumpy-possibility754, neither-beginning395]
    concepts: [integration, big-info, curious, patient, thanks]
    section: Comments
    token_count: 386
  - id: "social-intelligence/reddit-deep/healthit/1rhdmpt.md#c3"
    char_span: [3302, 3915]
    sentence_count: 4
    key_terms: [pricing, accomplishedwar6677, fhir, capabilities, appreciated, flexibility, integration, perspective]
    concepts: [pricing]
    section: Comments
    token_count: 149
---
# Experience integrating with EPIC using their FHIR APIs

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1rhdmpt/experience_integrating_with_epic_using_their_fhir/)
Posted by **redd_pratik** · **26↑** · **26 comments**

Hey! I wrote a blog post about my experience integrating EPIC's FHIR API into a healthcare app.

It covers the gotchas with FHIR resource parsing, SMART on FHIR auth, HIPAA realities on a budget, and why the EPIC sandbox can give you false confidence.

Might be useful if you're working with EHR integrations or building in the healthcare space: https://symbol-health.vercel.app/blog/fhir-integration-with-epic

 Happy to answer any questions or chat about it!

## Comments

- **papalrage11** (36↑): Odd that you have experience and yet still all caps EPIC. For some of us, we will immediately discount your advice seeing that. 

Epic Systems is a proper noun. EPIC as an acronym does not mean what you think it means.

Article itself is not too bad, thanks for writing
  - **redd_pratik** (3↑): Got it thanks for the advice :)
    - **SolutionsExistInPast** (-1↑): Hello,

Since 2005 I have typed out EPIC when there is no way of reproducing how the company creates their branded name.  There is nothing wrong in typing out EPIC.

As for the person who commented on your experience I would bet they have no experience to be speaking to you about experience after such an in appropriate and not true statement.

If there is a group out there thumbing their noses at those who type out EPIC for Epic Systems in Wisconsin then they are focused on the wrong things. They should think about how petty that type of review and comment really is. 

Keep doing epic things with EPIC!

Thank you.
- **Big-Info** (2↑): Quick question for you, what are the costs associated with integration?
  - **redd_pratik** (1↑): Depends on the use case. If it’s a patient facing app, the USCDI APIs are generally free to use. If its a Provider/Commercial app there are varying charges. I would suggest contacting epic directly with your specific requirements. They would provide you with an exact figure, if any.
    - **Big-Info** (2↑): Ok thanks, going through this with Athena now and epic is on the list.
- **Jumpy-Possibility754** (2↑): Noted on Epic Systems naming. Curious — what’s been your biggest friction point integrating with their FHIR stack?
- **Neither-Beginning395** (2↑): Thank you for this Blog, I'm about to embark myself om a similar journey with Epic.
- **valuat** (2↑): Good stuff. Thanks!
- **Moist_Explanation895** (2↑): Good write-up. The sandbox vs prod gap is one of those things everyone hits and nobody warns you about. Disclosure: I build EHR integration tooling at HeyIntegra, so this stuff is basically my daily work. Curious where the most time got burned. Was it scopes and USCDI gaps, patient matching weirdness, rate limits, write-back, or more the operational side like credentials and actually getting support? I keep a running list of these and share it back with anyone building on Epic for the first time.
- **sherrilldulsonn7g5a** (2↑): EPIC's FHIR APIs work pretty well for basic pulls but auth setup drove me nuts with their token refreshes.

  
I hit the same walls trying to pipe in imaging studies from our PACS last year.

  
Medicai sorted the DICOM integration for me without much hassle.
- **Reasonable_Smile2987** (2↑): Appreciated this read! I’m joining a med tech company and trying to understand how all the pieces might fit from a product perspective and this was helpful.
  - **redd_pratik** (1↑): Glad it helped!
- **AccomplishedWar6677** (1↑): We are still seeing flexibility of API pricing while FHIR is filling in various capabilities.  I have long suspected that the primary reason for evolving from HL7 to FHIR is to support "per variable" pricing on APIs.   My point is that is is wise to monitor Epic's posture for future.
