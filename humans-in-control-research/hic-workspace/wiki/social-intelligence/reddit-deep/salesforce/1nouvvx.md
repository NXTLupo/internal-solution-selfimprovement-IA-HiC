---
id: social-intelligence/reddit-deep/salesforce/1nouvvx.md
url: "https://www.reddit.com/r/salesforce/comments/1nouvvx/creating_leads_via_marketing_cloud_exacttarget/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Creating Leads via Marketing Cloud (exacttarget) with LeadID as SubscriberKey?"
author: "datapharmer"
date: "2025-09-23T22:04:39.000Z"
score: 2
upvote_ratio: 1
num_comments: 2
flair: "help please"
extracted_at: "2026-06-23T20:32:01.770Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1nouvvx.md#c0"
    char_span: [0, 1194]
    sentence_count: 4
    key_terms: [salesforce, marketing, lead, use, creating, subscriberkey, cloud, https]
    concepts: [salesforce, marketing, creating, subscriberkey, articleview]
    token_count: 277
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1nouvvx/creating_leads_via_marketing_cloud_exacttarget/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1nouvvx.md#c1"
    char_span: [1208, 1752]
    sentence_count: 5
    key_terms: [otherwise, import, system, email, leads, crm, data, lead]
    concepts: [otherwise, import, system, email, leads]
    section: Comments
    token_count: 137
---
# Creating Leads via Marketing Cloud (exacttarget) with LeadID as SubscriberKey?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1nouvvx/creating_leads_via_marketing_cloud_exacttarget/)
Posted by **datapharmer** · **2↑** · **2 comments**

I'm trying to find a way to upload a list of emails to marketing cloud and use the contact/lead id as the subscriber key (we have marketing cloud connect setup) and if the email is unknown to create a lead and use that lead as the subscriber. I can upload as a non-sendable list and use automation studio to match the existing contacts, and put that in a sendable list, but from what I can gather from here: [https://help.salesforce.com/s/articleView?id=000390391&type=1](https://help.salesforce.com/s/articleView?id=000390391&type=1) creating the lead for emails that don't exist via a marketing journey create lead step would still use the email address as the subscriberkey instead of the lead ID and not link the send data back to salesforce CRM, which kind of defeats the purpose of this feature... so what are my options? We would prefer not to have Marketing folks logging into the CRM and creating leads directly.

## Comments

- **Oleg_Dobriy** (2↑): I think the only way is to import the leads into the CRM first as that's the system to look for duplicates. Otherwise, if you import them into MCE  first and there are no matching Contacts/Leads, the system won't have any other choice rather than using email addresses as subkeys.
- **Jagpferd** (1↑): If you have a lead generative form then you can send the data to the CRM that way. Otherwise bulk upload. Then on MC use salesforce data and lead as entry source. You don't want to use email address as the contact key.
