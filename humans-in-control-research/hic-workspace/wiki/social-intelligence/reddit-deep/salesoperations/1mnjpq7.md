---
id: social-intelligence/reddit-deep/salesoperations/1mnjpq7.md
url: "https://www.reddit.com/r/SalesOperations/comments/1mnjpq7/help_with_cold_email_infra_set_up/"
kind: "social-post"
source: "reddit-deep: r/salesoperations"
subreddit: "salesoperations"
title: "Help with cold email infra set up!"
author: "Objective-Professor3"
date: "2025-08-11T17:40:24.000Z"
score: 4
upvote_ratio: 0.84
num_comments: 5
flair: ""
extracted_at: "2026-06-23T20:31:57.362Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesoperations/1mnjpq7.md#c0"
    char_span: [0, 2249]
    sentence_count: 26
    key_terms: [microsoft, domain, email, through, issue, mailboxes, purchased, spam]
    concepts: [microsoft, domain, email, through, mailboxes]
    token_count: 506
    sources: [{"n":"reddit-deep: r/salesoperations","u":"https://www.reddit.com/r/SalesOperations/comments/1mnjpq7/help_with_cold_email_infra_set_up/"}]
  - id: "social-intelligence/reddit-deep/salesoperations/1mnjpq7.md#c1"
    char_span: [2251, 2739]
    sentence_count: 4
    key_terms: [wondering, domains, handle, appreciated, maintenance, absolutely, correctly, findymail]
    concepts: [wondering, domains, handle]
    token_count: 105
  - id: "social-intelligence/reddit-deep/salesoperations/1mnjpq7.md#c2"
    char_span: [2753, 3750]
    sentence_count: 11
    key_terms: [emails, domains, objective-professor3, old, send, inboxes, outlook, administrativelegg]
    concepts: [emails, objective-professor3, domains, inboxes, outlook]
    section: Comments
    token_count: 263
---
# Help with cold email infra set up!

Source: [reddit-deep: r/salesoperations](https://www.reddit.com/r/SalesOperations/comments/1mnjpq7/help_with_cold_email_infra_set_up/)
Posted by **Objective-Professor3** · **4↑** · **5 comments**

So I run a strategic partnership company that helps B2B companies increase revenue. Over the past year dealing with the email infra has been a night mare. The latest issue has been that my 6 mailboxes have all gone to spam. Three of the mailboxes I haven't sent a single outbound email from. They only go to spam for microsoft - to - microsoft mailboxes. Gmail has been okay. I purchased each domain separately, only have max 2 email accounts for each domain, use AI for personalized copy, purchased directly through microsoft, use cloudflare for domain hosting, yet my mail boxes suddenly all began to go to spam. When this happens, I have to call customer service and open a ticket for each mail box separately. Then, when I think they fixed the issue I tell the other reps for the different accounts, but turns out the issue isn't fixed so I need to open 6 MORE tickets. Turns out, they needed to release my IP from spam at the domain level. I wasn't listed on any of the public tools to check for blacklists, etc. The only way I could've known is through the microsoft reps escalating the issue to their support engineer. I am sick and tired of it. SICK. AND. TIRED. I am in the US, so it is not a EU regulation thing. I've done so much to learn how best to host my email domains and still it is futile. The problem is, my ICP uses outlook nearly exclusively. I am looking for a service like mailforge or something like that which handles the nitty gritty of domain handling and IP management. I would also like to understand what do others use to send these 10k a month emails. Are they using a VPN for there laptop? Are they sending through SMTP? I have baggered AI extensively to explain how this is done but I still haven't gotten great answers.

Infrastructure:

Cloudflare (domain purchasing and hosting)

Microsoft domains, purchased through microsoft, with the same CC, and the same name / address / company name (saying this to see if others do this or if this is a huge NO NO)

Lemlist for automation

SPF/DMARC/DKIM all set up correctly - validated by MS reps

Findymail and lemlist email finder used for emails via linkedin sales nav

  
To clarify, I am wondering if anyone here uses a tool like mailforge or something and if that tools scales and fixes the maintenance portion of domain hosting? I am also wondering about those who host handle their domains manually, how do you handle it so your domains are not hit with spam marks? Any help will be absolutely appreciated. Thank you!!

## Comments

- **AdministrativeLegg** (1↑): how old are your domains?
  - **Objective-Professor3** (1↑): Some domains are only a month old, some are nearly a year old. Total all 6 domains I have probably only sent out 600-700 emails. Not a lot, at all.
- **[deleted]** (1↑): If its an issue related to your IP, then try using VPN maybe. Outlook is infamous for sending emails to spam. Tried a lot of things with that, but unfortunately nothing works. 

  
I have 6 inboxes from 2 domains, and I use 2 separate devices to send emails. I used cold email platforms to send these emails but they just didn't work. So, I do it manually now. 3 inboxes are handled by my partner and 3 by me. We send 20 emails through each per day. Its not a great number, but at least we get replies.
- **Prize_Economist_2654** (1↑): Outlook can be brutal. Many switch to tools like Smartreach for inbox rotation, domain/IP management, and warmup so you are not fighting tickets..
  - **Objective-Professor3** (1↑): No you don't bot!
