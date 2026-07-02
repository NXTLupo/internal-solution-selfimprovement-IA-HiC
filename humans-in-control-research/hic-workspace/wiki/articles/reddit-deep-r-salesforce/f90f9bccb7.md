---
id: articles/reddit-deep-r-salesforce/f90f9bccb7.md
url: "https://www.reddit.com/r/salesforce/comments/1lxp55h/have_you_ever_had_to_pivot_your_data_model_post/"
url_hash: "f90f9bccb7"
kind: "article"
source: "Reddit Deep: r/salesforce"
title: "Have you ever had to pivot your data model post implementation? How did the conversation go?"
author: ""
date: "2025-07-12T02:17:41.000Z"
tier: 
method: "source-native"
extracted_at: "2026-06-23T20:33:23.693602+00:00"
chars: 5196
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
collected_at: "2026-06-23T20:33:23.008Z"
relevance: 50
engagement_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
content_hash: "05f0b680bb765d84"
relevance_by_goal: {"c7d2e2d44048":50}
chunks:
  - id: "articles/reddit-deep-r-salesforce/f90f9bccb7.md#c0"
    char_span: [0, 2149]
    sentence_count: 27
    key_terms: [partner, implementation, model, new, admin, apex, org, salesforce]
    concepts: [partner, implementation, model, admin, salesforce]
    token_count: 484
    sources: [{"n":"Reddit Deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1lxp55h/have_you_ever_had_to_pivot_your_data_model_post/"}]
  - id: "articles/reddit-deep-r-salesforce/f90f9bccb7.md#c1"
    char_span: [2151, 4236]
    sentence_count: 21
    key_terms: [did, process, work, salesforce, strategy, initial, lacking, leaders]
    concepts: [process, salesforce, strategy, initial, lacking]
    token_count: 440
  - id: "articles/reddit-deep-r-salesforce/f90f9bccb7.md#c2"
    char_span: [4241, 5433]
    sentence_count: 10
    key_terms: [role, related, constituent, different, handystan, always, change, person]
    concepts: [related, constituent, different, handystan, always]
    token_count: 265
---
# Have you ever had to pivot your data model post implementation? How did the conversation go?

Source: [Reddit Deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1lxp55h/have_you_ever_had_to_pivot_your_data_model_post/)

TL:DR, new admin, made necessary decisions during implementation that lead to a model breakdown at scale. partner didn't intervene, have to pivot model now. Wondering how you pitched a shift post implement. 

For context, I am a ft staff at a Canadian higher Ed institute working in education cloud and MCE. I am the sole CRM admin and I get a lot of autonomy in decision making in our org. I have a developer that I work side by side with. We have 17 users and all of our efforts are focused on marketing, student recruitment and communications.

Our SF journey started in 2018 when we purchased a standard enterprise org. Our previous admin was a total hack, our partner had zero buy-in to our success and everything failed to take off. The admin was fired, we ended the contract with the partner and our team said we need to start new. We still needed a CRM. I was promoted in and we purchased a new org under EDU in summer 24. 

Things have been a success so far. Daily users, data insights, source of truth, great feedback and the POC worked. Institution is bought in. 

HOWEVER, I was new and trusted in our new implementation partner a lot at the beginning. They built our model with us, under my suggestions granted and developed some flows/apex to make it work. Ultimately, Leads = prospects. All prospects are opt-in, we don't buy lists in Ontario. Person accounts are API created only from our SiS and only exist if they were an applicant to our school. 

Edu cloud is a person account only standard model and I see why now. I wish our partner made this more clear but here we are. Reparenting objects on leads via apex is a total pain and makes us much less agile. Duplicates are getting out of control as our conversion apex is limited. To be fast and meet an insane deadline we had to use web to lead forms. Omni-out (funny it no longer exists) was totally busted for us when we tried to implement. 

Now that we've matured and have more standard edu components going live, I'm at a bottle neck and I want to pitch a total shift to a unified profile. My boss is not sf savvy and risk averse and she will hear this as a risk. 

Have you had to pivot a model? How did you pitch it and what do you wish you did better? Did you sandbox a tangible solution and deliver that? Did you prepare anything specific or did you say models f'd, did a mic drop in your directors office then go to lunch?

--- TOP COMMENTS ---
[13↑ WhiteHeteroMale] I’ve had to make substantial data model updates on three occasions.  One was pretty significant (about 4 months of work and a lot of trepidation), one was more modest (2 months of work), and the third was really big (a 14 month project).  

The three scenarios were totally different in terms of design.  But they each had something in common.  The changes were implemented to address the expressed needs and frustrations of our users, and the priorities of the department leaders around me.  When I can frame a change as the way to get where everybody wants to go, they (users/leaders) are much more amenable to the disruption and resource requirements. When I *involve* them in that assessment, they may even become enthusiastic partners.
[3↑ HandyStan] This is a lovely lens and actually very helpful. Thank you for taking the time to share. This is exactly the input I was looking for. Genuinely appreciative.
[3↑ Interesting_Button60] Absolutely this is a frequent adjustment and almost always is rooted in two things: 

  
Initial decisions from lacking a defined strategy 

A major shift in strategy. 

  
The first thing you should do is ensure you have clear process mapping for the work Salesforce facilitates. But use plain language descriptions, avoid using salesforce lingo. Draw what they process should be as agreed by the process owners.

  
This will allow you to see where and how your current architecture is lacking. 

  
Process before technology always. This exercise likely was not done thoroughly in your initial implementation. 

  
Good luck, you will learn a ton in this initiative. Remember to lead with empathy for the change wearing users. Everyone resists change and we need to be empathetic of that matter.
[2↑ duncan_thaw69] all the time. maybe it’s just because I work with startups but the needs of the business are basically always changing. if the first crack at the data model always worked we wouldn’t have the jobs that we do.
[2↑ ollieraikkonen] We're moving to a Education Cloud org now. Our prospects are going to be person account with an academic interest and prospect constituent role attached. This way when they apply we'll only need to swap out the constituent role and attach an application.
[1↑ gottlico] How do you store the related role? How do you report on this?
[1↑ HandyStan] There is an Ed cloud standard object that stores the person account's role whether it be a student related role or a staff/faculty role. Reporting is no different than any other custom or related report type. Flex cards lay out the person's role very clearly on their profile and you use lists for the different views
[1↑ HandyStan] That's aligned with the model. You are setting yourself up well. Are you in Canada?
