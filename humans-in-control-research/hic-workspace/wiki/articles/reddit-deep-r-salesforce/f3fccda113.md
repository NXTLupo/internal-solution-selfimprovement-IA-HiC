---
id: articles/reddit-deep-r-salesforce/f3fccda113.md
url: "https://www.reddit.com/r/salesforce/comments/1n2sme5/will_marc_benioff_revoke_my_license_if_i_build/"
url_hash: "f3fccda113"
kind: "article"
source: "Reddit Deep: r/salesforce"
title: "Will Marc Benioff revoke my license if I build this flow?"
author: ""
date: "2025-08-29T00:10:19.000Z"
tier: 
method: "source-native"
extracted_at: "2026-06-23T20:33:28.707756+00:00"
chars: 3002
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
collected_at: "2026-06-23T20:33:28.417Z"
relevance: 40
engagement_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
content_hash: "c123ef786616b562"
relevance_by_goal: {"c7d2e2d44048":40}
chunks:
  - id: "articles/reddit-deep-r-salesforce/f3fccda113.md#c0"
    char_span: [0, 2086]
    sentence_count: 22
    key_terms: [person, account, web, model, flow, prospects, lead, create]
    concepts: [person, account, model, prospects, create]
    token_count: 466
    sources: [{"n":"Reddit Deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1n2sme5/will_marc_benioff_revoke_my_license_if_i_build/"}]
  - id: "articles/reddit-deep-r-salesforce/f3fccda113.md#c1"
    char_span: [2088, 3203]
    sentence_count: 7
    key_terms: [delete, flow, lead, deadmoneydrew, leads, conversion, something, transaction]
    concepts: [delete, deadmoneydrew, conversion, leads, something]
    token_count: 274
---
# Will Marc Benioff revoke my license if I build this flow?

Source: [Reddit Deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1n2sme5/will_marc_benioff_revoke_my_license_if_i_build/)

I am genuinely looking for discussion. What I am about to ask is blasphemy by some admins but whenever I think hard about it, I wonder why. 

I am changing our data model from a lead to person account centric model. I work in higher Ed at a medium institute and our tech resources are squeezed like you wouldn't believe right now.

We started our journey with a lead = prospect and person account = applicant based model. We relied on a flow and apex class to match and convert leads to an existing person account via an account triggered flow on create. The system is candy glass and as soon as we scaled it fell apart. 

We are moving to a unified profile model where all constuents are person accounts. Close to the education cloud standard model but modified for our region. 

We are about to head into a season where we will generate 70% of our prospects in 3-4 months. I want to get this off the ground and have the pieces ready for that for all but one Avenue of prospects, web forms. Our web team is swamped and it's taking forever to consider the move to lightning out or a redirect to guest access experience cloud for our 75 web forms. 

Will Marc call my dad and yell at him if I create a flow that takes a web form lead record, turns into a person account and then deletes the lead? At its core, this is no different than the nested screen flows and power automate flows I am using to create prospect person accounts. The only difference is the inputs get wiped on flow end with those and in the case of using leads as a shell, to have to include the dml as an element. 

I have sandboxed and the testing worked well. Our web forms are low traffic relatively speaking. I do not want to have two truth objects for prospects at once. Waiting for the web team is going to push us back an entire cycle. Getting this off the ground lets us go for this cycle.

What do you think?

--- TOP COMMENTS ---
[81↑ yohosse] He's too busy in Hawaii to care.
[35↑ [deleted]] I would not delete the leads generally.  But, if you want to do it, I would still not delete them as part of your initial process, but instead have a nightly cleanup flow that deletes the leads as matched by contacts.  That way, you have some time to catch errors and have something to look forward to checking each morning.
[4↑ HandyStan] This is good insight. That makes total sense. Thanks for the reply.
[2↑ TraderGaper_649] Why would you delete the leads? sounds like redundant data to me.
[16↑ DeadMoneyDrew] Why would you need to delete the Lead? It's been a while since I last dealt with lead conversion so my memory may be failing me, but is it not possible to convert a Lead to a Person Account via flow?
[5↑ PacTown3] Yes but it requires calling an apex class from within the flow for the actual conversion.
[1↑ DeadMoneyDrew] That rings a bell.
[7↑ Oleg_Dobriy] My advice is to run your flow in an async path. Otherwise, if something goes wrong, the transaction will be rolled back, and you'll loose the incoming lead.
