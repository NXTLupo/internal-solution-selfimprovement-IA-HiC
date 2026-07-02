---
id: social-intelligence/reddit-deep/salesforce/1n2sme5.md
url: "https://www.reddit.com/r/salesforce/comments/1n2sme5/will_marc_benioff_revoke_my_license_if_i_build/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Will Marc Benioff revoke my license if I build this flow?"
author: "HandyStan"
date: "2025-08-29T00:10:19.000Z"
score: 21
upvote_ratio: 0.73
num_comments: 35
flair: "admin"
extracted_at: "2026-06-23T20:32:01.768Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1n2sme5.md#c0"
    char_span: [0, 2138]
    sentence_count: 22
    key_terms: [person, account, web, model, flow, prospects, lead, create]
    concepts: [person, account, model, prospects, create]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1n2sme5.md#c3"]
    token_count: 483
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1n2sme5/will_marc_benioff_revoke_my_license_if_i_build/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1n2sme5.md#c1"
    char_span: [2152, 3509]
    sentence_count: 9
    key_terms: [delete, flow, lead, deadmoneydrew, leads, time, conversion, something]
    concepts: [delete, deadmoneydrew, conversion, leads, something]
    section: Comments
    token_count: 359
  - id: "social-intelligence/reddit-deep/salesforce/1n2sme5.md#c2"
    char_span: [3511, 5389]
    sentence_count: 12
    key_terms: [error, lead, create, delete, build, "don't", add, field]
    concepts: [error, create, delete, build, "don't"]
    section: Comments
    token_count: 445
  - id: "social-intelligence/reddit-deep/salesforce/1n2sme5.md#c3"
    char_span: [5391, 7726]
    sentence_count: 14
    key_terms: [person, cloud, account, education, entities-objects-included, education-cloud-overview, understanding, salesforce]
    concepts: [person, cloud, account, entities-objects-included, education-cloud-overview]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1n2sme5.md#c0"]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/salesforce/1n2sme5.md#c4"
    char_span: [7728, 8192]
    sentence_count: 4
    key_terms: [flow, flows, png, admissions, salesforce, education, sandboxed, intended]
    concepts: [flows]
    section: Comments
    token_count: 135
---
# Will Marc Benioff revoke my license if I build this flow?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1n2sme5/will_marc_benioff_revoke_my_license_if_i_build/)
Posted by **HandyStan** · **21↑** · **35 comments**

I am genuinely looking for discussion. What I am about to ask is blasphemy by some admins but whenever I think hard about it, I wonder why. 

I am changing our data model from a lead to person account centric model. I work in higher Ed at a medium institute and our tech resources are squeezed like you wouldn't believe right now.

We started our journey with a lead = prospect and person account = applicant based model. We relied on a flow and apex class to match and convert leads to an existing person account via an account triggered flow on create. The system is candy glass and as soon as we scaled it fell apart. 

We are moving to a unified profile model where all constuents are person accounts. Close to the education cloud standard model but modified for our region. 

We are about to head into a season where we will generate 70% of our prospects in 3-4 months. I want to get this off the ground and have the pieces ready for that for all but one Avenue of prospects, web forms. Our web team is swamped and it's taking forever to consider the move to lightning out or a redirect to guest access experience cloud for our 75 web forms. 

Will Marc call my dad and yell at him if I create a flow that takes a web form lead record, turns into a person account and then deletes the lead? At its core, this is no different than the nested screen flows and power automate flows I am using to create prospect person accounts. The only difference is the inputs get wiped on flow end with those and in the case of using leads as a shell, to have to include the dml as an element. 

I have sandboxed and the testing worked well. Our web forms are low traffic relatively speaking. I do not want to have two truth objects for prospects at once. Waiting for the web team is going to push us back an entire cycle. Getting this off the ground lets us go for this cycle.

What do you think?

## Comments

- **yohosse** (81↑): He's too busy in Hawaii to care.
- **[deleted]** (35↑): I would not delete the leads generally.  But, if you want to do it, I would still not delete them as part of your initial process, but instead have a nightly cleanup flow that deletes the leads as matched by contacts.  That way, you have some time to catch errors and have something to look forward to checking each morning.
  - **HandyStan** (4↑): This is good insight. That makes total sense. Thanks for the reply.
  - **TraderGaper_649** (2↑): Why would you delete the leads? sounds like redundant data to me.
- **DeadMoneyDrew** (16↑): Why would you need to delete the Lead? It's been a while since I last dealt with lead conversion so my memory may be failing me, but is it not possible to convert a Lead to a Person Account via flow?
  - **PacTown3** (5↑): Yes but it requires calling an apex class from within the flow for the actual conversion.
    - **DeadMoneyDrew** (1↑): That rings a bell.
- **Oleg_Dobriy** (7↑): My advice is to run your flow in an async path. Otherwise, if something goes wrong, the transaction will be rolled back, and you'll loose the incoming lead.
  - **Alarmed_Ad_7657** (1↑): This. Over time I've moved flows to a scheduled or async paths. Most of the time there is no need to run them immediately
- **Armageddon85** (9↑): Here's my two cents:

* If you decide you must delete the lead: don't delete the lead right away like u/AYfD6PsXcndUxSfobkM9 mentioned. Batch delete at the end of night is a good middle ground.
* If you're okay with keeping it: build an apex action that converts the lead to a person account. 
* Create an Error Log Custom Object with a lookup to Lead and Account. Add a 255 text field for a Short Error Description and a Long Text field for a Long Error Description. Add other fields for more metadata insights. 
* Add a Scheduled Flow to delete all Error Logs that are more than 3 months old. 
* When a Lead is generated: build your flow to asynchronously run when the Lead is generated and matches your criteria. 
* Build fault paths to create Error Logs. 
* Bonus: Add a picklist processing (Process, Processing, Processed, Error, Warning) field on the Error Log to create a case. This adds room to create cases to assign to the web team for when they create forms that don't provide enough information to convert the Lead. 
* All of the above helps you scale the process and prevents you from becoming the choke point! 
* Call Benioff and tell him to fix all of the decade old ideas with more than 20,000 upvotes.
  - **HandyStan** (2↑): Thanks for the detailed response. This is super helpful and clearly you have experience managing complex processes like this. i will be taking your suggestions to sandbox next week. My IT director set a dead drop date for 2 weeks from now so were going to build quick. The custom object is genius compared to the email action I had originally scoped. 

Thank you again.
  - **[deleted]** (1↑): This is the way.  My only addition is to do this in Visual Flow rather than Apex if your volume is not massive.  Easier for the next person to undo what you are doing.
- **Holiday-Platypus5708** (6↑): If you don't hit the limits they don't care. You will be fine.

The only thing I would advise is to have error handling creating custom exception records.
- **big-blue-balls** (5↑): 1. Why would Salesforce care?
2. What benefit are you gaining from doing this?
  - **HandyStan** (0↑): 1: Hyperbole for drama
2: to adopt the data model for our industry cloud that we should have started on in the first place. We were first time SF users and used other, non-education cloud orgs as an example which used leads for prospective students and applicants were person accounts. Education cloud is meant to operate on a unified profile for every single contact and contact type. Our partner did not advise us on this. We scaled and our basic understanding and model failed.
- **age_of_unreason** (3↑): No, you’ll be fine.
- **datapharmer** (3↑): This could bite you if you use things like Marketing Cloud with Marketing Cloud Connect because you will have duplicate subscribers and the history won’t get tied to the new record.

I think you would be better off solving your conversion reliability issues or going straight to person accounts.
  - **HandyStan** (1↑): That is the goal, to go person account only. We use education cloud and it's base data model is designed entirely around person accounts. Every single person record should be a person account except bought lead lists (which doesn't happen in my region) and commissioned education agents (which we don't use).

Our basic understanding at the time of buying a license and lack of business process advice/industry cloud understanding from our partner led to a lead/person account split for our most important contacts and that breaks a tonne of the industry objects, flows and metadata in our specific cloud.
- **[deleted]** (3↑): Why not do web-to-case.  There is already a flow template that will try and match a case to an existing Person Account and if there isn't a match it will create the person account and relate the case to it.

You can also have a look at the Education Data Model here - [https://developer.salesforce.com/docs/platform/data-models/guide/education-cloud-overview.html#entities-objects-included](https://developer.salesforce.com/docs/platform/data-models/guide/education-cloud-overview.html#entities-objects-included)
  - **HandyStan** (1↑): That is an interesting thought. I have never experimented with web to case. 

Is the prebuilt flow a salesforce platform flow or education cloud flow? I haven't come across that one yet. I have sandboxed the three edu admissions inquiry/contact request flows and they work great with the intended screen flows.
    - **[deleted]** (1↑): It should be sitting in core.  Here's what its called when you go to create a new flow.

https://preview.redd.it/656g6q0cdgmf1.png?width=1206&format=png&auto=webp&s=10b85e918025bc3b01a6063b6ca4edf664a11abf
