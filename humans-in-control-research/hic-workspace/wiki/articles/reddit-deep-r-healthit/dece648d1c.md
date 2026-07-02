---
id: articles/reddit-deep-r-healthit/dece648d1c.md
url: "https://www.reddit.com/r/healthIT/comments/1n398cf/considering_ehr_transition_veradigm_athena_for_rhc/"
url_hash: "dece648d1c"
kind: "article"
source: "Reddit Deep: r/healthit"
title: "Considering EHR Transition Veradigm > Athena for RHC"
author: ""
date: "2025-08-29T14:39:36.000Z"
tier: 
method: "source-native"
extracted_at: "2026-06-22T21:49:42.806063+00:00"
chars: 7155
engagement: "deliver-a-strategic-market-outlook-report-on-the-state-of-ai"
collected_at: "2026-06-22T21:49:43.044Z"
relevance: 40
engagement_goal: "Deliver a strategic market outlook report on the state of AI adoption across the healthcare sector heading into 2026, analyzing clinical and operational use cases, deployment barriers, and regulatory drivers. Evaluate current health system integration trends, investment priorities, and market growth indicators based on recent industry research and deployment data."
content_hash: "24f66c32cce32a7a"
relevance_by_goal: {"fb4000205329":40}
chunks:
  - id: "articles/reddit-deep-r-healthit/dece648d1c.md#c0"
    char_span: [0, 2424]
    sentence_count: 10
    key_terms: [transition, veradigm, athena, integration, collections, ehr, practice, billing]
    concepts: [transition, veradigm, athena, integration, collections]
    token_count: 509
    sources: [{"n":"Reddit Deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1n398cf/considering_ehr_transition_veradigm_athena_for_rhc/"}]
  - id: "articles/reddit-deep-r-healthit/dece648d1c.md#c1"
    char_span: [2426, 4086]
    sentence_count: 12
    key_terms: [especially, vendors, altera, spend, get, "it's", technical, multiple]
    concepts: [especially, vendors, altera, spend, technical]
    token_count: 357
  - id: "articles/reddit-deep-r-healthit/dece648d1c.md#c2"
    char_span: [4088, 6380]
    sentence_count: 19
    key_terms: [epic, through, community, data, hospital, another, connect, systems]
    concepts: [through, community, hospital, another, connect]
    related_chunks: ["articles/reddit-deep-r-healthit/dece648d1c.md#c3"]
    token_count: 481
  - id: "articles/reddit-deep-r-healthit/dece648d1c.md#c3"
    char_span: [6382, 7351]
    sentence_count: 7
    key_terms: [athena, import, data, community, company, connect, want, implementation]
    concepts: [athena, import, community, company, connect]
    related_chunks: ["articles/reddit-deep-r-healthit/dece648d1c.md#c2"]
    token_count: 210
---
# Considering EHR Transition Veradigm > Athena for RHC

Source: [Reddit Deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1n398cf/considering_ehr_transition_veradigm_athena_for_rhc/)

Hello, I am managing a potential EHR transition for a primary rural health clinic from Veradigm to Athena. I'm looking for feedback from people who have performed the same transition: regrets, pitfalls, upsides.

My desire for transition started with lacking clinical documentation and HIE integration tools. Features Athena have demoed which Veradigm does not have:

* CareQuality connectivity with full body notes available (Veradigm has integration in name only, has not been functional for us)
* Indexed, searchable documents using text prompts
* Direct ACO integration (we use Aledade)
* Ability to create favorite orders per user (there are multiple work arounds in Veradigm, however users can accidentally affect everyone's work flow if needed permissions given)

Additional reasons for transition:

* Transition from on-prem server to cloud based (could be done through Veradigm also, but good time to move during EHR transition)
* Improved fax handling (currently manually sorting/dividing faxes, printing faxes for redaction. Athena promises to handle all incoming faxes, also barcode based re-routing of scans of physical forms and promising OCR tech in 2025. We only have analog VOIP fax currently)
* Improved reporting (RVUs, demographic reports etc)
* "Billing Rules Engine" to reduce kicked back claims, in-house clearing house, greater integration between practice management and EHR sides

My Concerns:

* On Facebook, I'm seeing lots of Athena users reporting billing issues and lack of support for those issues: delays, seeming lack of knowledge of RHC needs
* Threats of increasing % of collections billing if the practice collections drop (this seems like a recipe for a death spiral: practice brings in less revenue > Athena charges a higher proportion of collections > higher operating costs)
* Success so dependent on initial setup, but going into this system blind I don't know what best practices are

I'm making this decision after hiring the onsite-deployed Veradigm Optimization Team. It was disappointing, and the answer to a lot of my clinical needs were met with "we can't do that". Their support is extremely lacking.

Am I being oversold on Athena? Is this a lateral move not worth the headache?

--- TOP COMMENTS ---
[5↑ TheOnlyKarsh] I just migrated our Altera TouchWorks EMR from on prem to Altera Cloud hosting after a cyber event.  Altera and Veradigm used to be the same company and I believe the EMR is at its heart the same one just rebranded.  That being said I think you'd likely be able to solve your issue with Veradigm but, and this is always the catch, are you willing to spend the money, time, effort to solve them.  Not to dissuade you from Athena but IMO just about all EMRs are capable, all have some short fall, and the real difference in being successful and mitigating is the willingness to spend the money, time, and effort.  Vendors, especially the sales and contracting people lie through their teeth and promise way more than the technical folks can deliver, especially in the timeline they promise.  You can achieve things with multiple vendors but then it becomes a hassle to get them to work together, not to mention to navigate the contracts and payments for multiple interdependent vendors.    
  
I highly recommend moving to a cloud based infrastructure unless you truly have the technical resources to support a robust data center that is prepared for and can mitigate a cyber event.  It's not an if, it's a when.  This means not just a really good desktop guy who thus far as covered your networking needs with equipment he's getting from Best Buy.  It's hard to get talent in rural areas and especially hard to get redundancy with the budget that rural medical centers are willing to spend.  

TLDR:  Don't think you're going to have all your problems solved with a different vendor.  They will fall short somewhere too.  

Karsh
[1↑ Lemnope] Definitely. We work quite well within our EHR limitations, and to drop ours to adopt another set of limitations would just be pointless.
[1↑ gr8fulbrb] Karsh makes a lot of great points — switching vendors alone rarely fixes all issues. A few things I’ve seen help:
	•	Cloud infrastructure is critical for security and disaster recovery, especially after a cyber event. Even with a new EMR, on-prem systems can be vulnerable if you don’t have dedicated IT resources.
	•	Be realistic about vendor promises — almost all EMRs have gaps, and timelines are usually optimistic. Success often comes down to investing the right amount of time, money, and effort in setup, training, and integration.
	•	Plan for your legacy data from day one. Even the most capable EMR can’t make up for poorly archived or structured historical data. Ensuring your old data stays usable for audits, reporting, and operational needs can prevent headaches later.

I work as a legacy data archiving consultant, helping practices navigate this exact part of EMR transitions. Happy to share strategies if anyone wants to avoid common pitfalls.
[5↑ mrm112] I'm biased as I support Epic in my role but have you looked into them as an option? Possibly getting extended via community connect through another health system on it locally if you are a smaller org?
I'm not familiar with Veradigm but have done a go-live from Athena to Epic. While I've never supported Athena directly in my limited exposure Epic seemed pretty superior in all but document indexing.
[9↑ Lemnope] We are a smaller organization, and Epic will only contract with clinics with >90 providers.

We have looked at Community Connect through some local hospital systems: I've happily worked with Epic elsewhere as a clinician > 10 years, so I was really initially fixated on an Epic-based solution. Disappointingly, through a Community Connect implementation, you are subject to that larger health systems goals and priorities. You want to create a custom template for your site? Good luck getting it through their 15 hospital system Medical Informatics committee. Satisfied with your referral process? Too bad, the hospital system has decided to retire that process and force you off in favor of another. I don't know that it's worth it.

Regardless, I have contacted hospital systems about becoming a community connect partner and have been turned down; as a private clinic, I get the impression they are only interested in sharing their implementation if we become a referring center or if they feel they can eventually acquire us. I don't think our needs would be prioritized.
[3↑ mrm112] That's a good point. You definitely are subjected to the policies of the other organization and it's a lot harder to request things. Best of luck on your search!
[2↑ ohhhmyyyglob] Reach out again and ask about Garden Plot. There’s more opportunities there for groups who don’t want to necessarily go community connect.
[4↑ rabbidrascal] I worked for a company whose primary business was archiving data in a Athena conversion.
Athena doesn't import a very rich set of data, so you want to understand what data you can and cannot import.
Athena is a great company, you just need to be aware of the import limitations.
