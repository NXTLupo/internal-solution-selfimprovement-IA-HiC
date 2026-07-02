---
id: social-intelligence/reddit-deep/salesforce/1lxp55h.md
url: "https://www.reddit.com/r/salesforce/comments/1lxp55h/have_you_ever_had_to_pivot_your_data_model_post/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Have you ever had to pivot your data model post implementation? How did the conversation go?"
author: "HandyStan"
date: "2025-07-12T02:17:41.000Z"
score: 8
upvote_ratio: 0.91
num_comments: 19
flair: "help please"
extracted_at: "2026-06-23T20:32:01.769Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1lxp55h.md#c0"
    char_span: [0, 2200]
    sentence_count: 27
    key_terms: [partner, implementation, model, new, admin, apex, org, salesforce]
    concepts: [partner, implementation, model, admin, salesforce]
    token_count: 501
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1lxp55h/have_you_ever_had_to_pivot_your_data_model_post/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1lxp55h.md#c1"
    char_span: [2202, 2689]
    sentence_count: 6
    key_terms: [did, pitch, risk, components, directors, anything, solution, specific]
    concepts: [pitch]
    token_count: 112
  - id: "social-intelligence/reddit-deep/salesforce/1lxp55h.md#c2"
    char_span: [2703, 4301]
    sentence_count: 16
    key_terms: [process, work, salesforce, strategy, initial, lacking, leaders, always]
    concepts: [process, salesforce, strategy, initial, lacking]
    section: Comments
    token_count: 335
  - id: "social-intelligence/reddit-deep/salesforce/1lxp55h.md#c3"
    char_span: [4306, 6039]
    sentence_count: 15
    key_terms: [role, related, ollieraikkonen, model, constituent, different, handystan, incoming]
    concepts: [ollieraikkonen, related, constituent, model, different]
    section: Comments
    token_count: 407
  - id: "social-intelligence/reddit-deep/salesforce/1lxp55h.md#c4"
    char_span: [6041, 8097]
    sentence_count: 17
    key_terms: [apex, lead, everything, existing, standard, person, email, model]
    concepts: [everything, existing, standard, person, email]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/salesforce/1lxp55h.md#c5"
    char_span: [8099, 10095]
    sentence_count: 11
    key_terms: [domain, model, switch, data, get, like, time, apiwrapper]
    concepts: [domain, model, switch, apiwrapper, everything]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/salesforce/1lxp55h.md#c6"
    char_span: [10097, 10891]
    sentence_count: 4
    key_terms: [cloud, leads, model, does, forms, "won't", lead, use]
    concepts: [cloud, leads, model, forms, "won't"]
    section: Comments
    token_count: 176
---
# Have you ever had to pivot your data model post implementation? How did the conversation go?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1lxp55h/have_you_ever_had_to_pivot_your_data_model_post/)
Posted by **HandyStan** · **8↑** · **19 comments**

TL:DR, new admin, made necessary decisions during implementation that lead to a model breakdown at scale. partner didn't intervene, have to pivot model now. Wondering how you pitched a shift post implement. 

For context, I am a ft staff at a Canadian higher Ed institute working in education cloud and MCE. I am the sole CRM admin and I get a lot of autonomy in decision making in our org. I have a developer that I work side by side with. We have 17 users and all of our efforts are focused on marketing, student recruitment and communications.

Our SF journey started in 2018 when we purchased a standard enterprise org. Our previous admin was a total hack, our partner had zero buy-in to our success and everything failed to take off. The admin was fired, we ended the contract with the partner and our team said we need to start new. We still needed a CRM. I was promoted in and we purchased a new org under EDU in summer 24. 

Things have been a success so far. Daily users, data insights, source of truth, great feedback and the POC worked. Institution is bought in. 

HOWEVER, I was new and trusted in our new implementation partner a lot at the beginning. They built our model with us, under my suggestions granted and developed some flows/apex to make it work. Ultimately, Leads = prospects. All prospects are opt-in, we don't buy lists in Ontario. Person accounts are API created only from our SiS and only exist if they were an applicant to our school. 

Edu cloud is a person account only standard model and I see why now. I wish our partner made this more clear but here we are. Reparenting objects on leads via apex is a total pain and makes us much less agile. Duplicates are getting out of control as our conversion apex is limited. To be fast and meet an insane deadline we had to use web to lead forms. Omni-out (funny it no longer exists) was totally busted for us when we tried to implement. 

Now that we've matured and have more standard edu components going live, I'm at a bottle neck and I want to pitch a total shift to a unified profile. My boss is not sf savvy and risk averse and she will hear this as a risk. 

Have you had to pivot a model? How did you pitch it and what do you wish you did better? Did you sandbox a tangible solution and deliver that? Did you prepare anything specific or did you say models f'd, did a mic drop in your directors office then go to lunch?

## Comments

- **WhiteHeteroMale** (13↑): I’ve had to make substantial data model updates on three occasions.  One was pretty significant (about 4 months of work and a lot of trepidation), one was more modest (2 months of work), and the third was really big (a 14 month project).  

The three scenarios were totally different in terms of design.  But they each had something in common.  The changes were implemented to address the expressed needs and frustrations of our users, and the priorities of the department leaders around me.  When I can frame a change as the way to get where everybody wants to go, they (users/leaders) are much more amenable to the disruption and resource requirements. When I *involve* them in that assessment, they may even become enthusiastic partners.
  - **HandyStan** (3↑): This is a lovely lens and actually very helpful. Thank you for taking the time to share. This is exactly the input I was looking for. Genuinely appreciative.
- **Interesting_Button60** (3↑): Absolutely this is a frequent adjustment and almost always is rooted in two things: 

  
Initial decisions from lacking a defined strategy 

A major shift in strategy. 

  
The first thing you should do is ensure you have clear process mapping for the work Salesforce facilitates. But use plain language descriptions, avoid using salesforce lingo. Draw what they process should be as agreed by the process owners.

  
This will allow you to see where and how your current architecture is lacking. 

  
Process before technology always. This exercise likely was not done thoroughly in your initial implementation. 

  
Good luck, you will learn a ton in this initiative. Remember to lead with empathy for the change wearing users. Everyone resists change and we need to be empathetic of that matter.
- **duncan_thaw69** (2↑): all the time. maybe it’s just because I work with startups but the needs of the business are basically always changing. if the first crack at the data model always worked we wouldn’t have the jobs that we do.
- **ollieraikkonen** (2↑): We're moving to a Education Cloud org now. Our prospects are going to be person account with an academic interest and prospect constituent role attached. This way when they apply we'll only need to swap out the constituent role and attach an application.
  - **gottlico** (1↑): How do you store the related role? How do you report on this?
    - **HandyStan** (1↑): There is an Ed cloud standard object that stores the person account's role whether it be a student related role or a staff/faculty role. Reporting is no different than any other custom or related report type. Flex cards lay out the person's role very clearly on their profile and you use lists for the different views
  - **HandyStan** (1↑): That's aligned with the model. You are setting yourself up well. Are you in Canada?
    - **ollieraikkonen** (1↑): No UK. I'll DM you :)
- **dadading_dadadoom** (2↑): Yes totally possible. That's the point of tech.. like every 5 years people upgrade iphones. 

Document the current bottlenecks with this data model. 

Lay out your plan __ months for dev, __ months test ing, __ live date. how you will deal with incoming records while transition is happening, while maintaining the compatibility. You said you have an API for incoming, those API clients should not face disruption..

Forecast the benefits eg: by using new model, you will save __ amount of hours/$$ for future releases.
- **Practical_Smile_794** (2↑): It can probably be fixed without redoing everything, especially since you just overhauled last year. Person Accounts can be limiting and frustrating at times but you can figure it out. What’s causing the duplicates? Are there any rules in place? Do you have any duplicate management solutions? Have you looked at migrating from Apex to Flow for more transparency?
  - **HandyStan** (1↑): I don't have access to a dev with apex skills, the dev I work with is more focused on integrations and writes everything on prem in c# and SQL. 

Our partner wrote the apex to exact match on email, they even left it case sensitive I just discovered, for existing lead to existing person account conversion. The flow the apex is invoked from is triggered off create of PA. 

Edu cloud has a tonne of standard objects that need to be reparented manually and this is the major bottleneck for us right now. 

I have alert and report set on lead and contact with standard rules. Higher Ed sees massive repeat interactions at the top of funnel due to the nature of the sales cycle. Because our dev team struggled we were forced to go live with web to lead only for all inquiries, event regs, sign up forms, etc. web to lead of course fails if rules are anything other than report. I built a list view readable duplicate detect so all of our users can take part in merging. 

I want to drop apex and do everything in flow but that means dropping leads and going with the standard edu model. We're live and it's my first time navigating a model switch while live so the input from everyone has been great.
    - **Practical_Smile_794** (1↑): Gotcha. It actually does sound like Apex would be your friend here. If email is truly the best identifier, you could set up a process that could look up existing person accounts with the same email on lead creation and convert it into that account (I'd probably log this event in some way, though). 

As far as the Edu Cloud standard objects, I won't even pretend to know anything about them, but I can imagine that they can be automated as well. It was like me looking at the NPSP data model for the first time and wondering what the hell was going on!
- **NeutroBlack54** (2↑): My worst change was having a full Salesforce data model for claims using FSC, then after about 4 months of implementation "not live yet" we had leadership introduced a domain model

This changed everything. essentially had the domain orchestrate everything and Salesforce is just a front end

Half the battle from conversations was explaining what a domain is and then figuring out how to incorporate this domain into the equation
  - **HandyStan** (1↑): Yeesh, did they get anything really out of FSC at that point? That sounds like a frustrating thing to have experienced.
- **Key-Boat-7519** (2↑): Lead-person split is already biting; the only way I got approval to flip to pure person accounts was by showing execs hard numbers on time lost, dupes created, and feature gaps. I pulled three months of conversion logs, calculated 9% duplicate rate and 12 hrs/week in cleanup, then stacked that beside a sandbox demo that showed the one-screen view you get with unified profiles. Walk them through a mocked student journey-web form, auto-create person account, campaign member, app record-so they see nothing breaks. Stress the rollback plan: full sandbox build, data load scripts, Gearset for deployments, nightly backups before cutover. That de-risks it and keeps finance calm. One sentence with tools: I leaned on DemandTools for initial dedupe, Gearset for CI, and [APIWrapper.ai](http://APIWrapper.ai) for quick one-off API pulls from our SIS. Once the numbers and safety nets are clear, the model switch sells itself.
  - **HandyStan** (1↑): This sounds like precision work. Well done. 

I was able to get the initial buy in for the switch but we are doing a slow switch with one lead source moving at a time. 

Currently battling with web/IT in trying to get them to sign off on button redirect for forms as opposed to web to lead forms built into our program pages. They simultaneously won't purchase a form tool (we tried omni out and they got burned on the dev site so won't try lightning out now) but also don't recognize the damage leads are doing to our model. 

Lol if you want to shoot me any of your slide decks haha they sound powerful.
- **gottlico** (1↑): Does Edu cloud not have Lead object?
  - **HandyStan** (1↑): It does. The standard model for education cloud does not use leads for anything but a very specific purpose in the student recruitment/marketing process; however, a traditional model would potentially use leads for more purposes but Ed cloud is a unique beast in the SF world.
