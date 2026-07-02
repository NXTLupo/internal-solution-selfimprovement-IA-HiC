---
id: social-intelligence/reddit-deep/salesforce/1poeoru.md
url: "https://www.reddit.com/r/salesforce/comments/1poeoru/using_contacts_in_ed_cloud/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Using Contacts in Ed Cloud?"
author: "Coolcat612"
date: "2025-12-16T21:49:02.000Z"
score: 2
upvote_ratio: 1
num_comments: 1
flair: "help please"
extracted_at: "2026-06-23T20:32:01.770Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1poeoru.md#c0"
    char_span: [0, 1247]
    sentence_count: 13
    key_terms: [future, accounts, person, cloud, represented, "i'm", salesforce, employees]
    concepts: [future, accounts, person, represented, cloud]
    token_count: 261
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1poeoru/using_contacts_in_ed_cloud/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1poeoru.md#c1"
    char_span: [1261, 1608]
    sentence_count: 2
    key_terms: [account, person, contact, fields, traditional, approach, properly, students]
    concepts: [account, person, contact, fields]
    section: Comments
    token_count: 83
---
# Using Contacts in Ed Cloud?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1poeoru/using_contacts_in_ed_cloud/)
Posted by **Coolcat612** · **2↑** · **1 comments**

Hello! I'm working with a college system office that is going to implement SF Ed Cloud primarily to track engagement/correspondence with businesses in their state. Future phases only indicate bringing in additional users to support those engagements, not necessarily looking at bringing in any student data or program/class data. 

Of course, with Ed Cloud, Person Accounts are standard. Although for this use case, we're looking at identifying employees of a business. To avoid complexity for both future admins and end users, I'd love to stick with the traditional Account/Contact/Opportunity model. However, I'm unfamiliar with potential future ramifications for doing so. 

1. If they do choose to bring in students in the future, could those be represented as person accounts and these business employees continue to be represented as contacts?  
2. Are there issues with automations? Such as creating flows on the contact if person accounts are enabled?  
3. Any other issues I'm not thinking through?

Any thoughts are appreciated, thanks!

## Comments

- **[deleted]** (0↑): You can do both and I agree with your approach. Basically person account for b2b stuff (students) and traditional account/contact for b2c stuff. 

1 - yes
2 - add fields to the account for person account since you can’t use contact fields for dml events (for person account stuff) 
3 - not enough info here to answer properly
