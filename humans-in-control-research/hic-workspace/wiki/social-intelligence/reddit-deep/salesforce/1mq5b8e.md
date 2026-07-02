---
id: social-intelligence/reddit-deep/salesforce/1mq5b8e.md
url: "https://www.reddit.com/r/salesforce/comments/1mq5b8e/send_the_printable_view_of_a_record_in_an_email/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Send the printable view of a record in an email alert?"
author: "Business-Systems360"
date: "2025-08-14T16:21:26.000Z"
score: 6
upvote_ratio: 1
num_comments: 11
flair: "help please"
extracted_at: "2026-06-11T18:58:38.963Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1mq5b8e.md#c0"
    char_span: [0, 725]
    sentence_count: 5
    key_terms: [salesforce, printable, email, form, view, comments, acheive, custom]
    concepts: [salesforce, printable, email, comments, acheive]
    token_count: 174
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1mq5b8e/send_the_printable_view_of_a_record_in_an_email/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1mq5b8e.md#c1"
    char_span: [739, 2494]
    sentence_count: 11
    key_terms: [illperspective9981, form, document, "you're", "don't", email, cost, done]
    concepts: [illperspective9981, document, "you're", "don't", email]
    section: Comments
    token_count: 435
  - id: "social-intelligence/reddit-deep/salesforce/1mq5b8e.md#c2"
    char_span: [2499, 2914]
    sentence_count: 3
    key_terms: [business-systems360, going, cost, form, considerations, implementation, salesforce, suggestion]
    concepts: [going]
    section: Comments
    token_count: 87
---
# Send the printable view of a record in an email alert?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1mq5b8e/send_the_printable_view_of_a_record_in_an_email/)
Posted by **Business-Systems360** · **6↑** · **11 comments**

We have a custom onboarding form (screen flow to a custom object), we want to be able to send the form  to our SE team outside of Salesforce. Currently we use printable view to download it and attach it to an email. Is there anyway to acheive this automatically, once the form has been approved, it gets sent via an email alert with the printable view as an attachement? Or any other ideas for how to acheive this without having to add 30 merge fields to a template?

## Comments

- **Far-Judgment-5591** (2↑): Using a form tool is the easiest way to do it. There are tools that could cost you less than $10/month fixed, depending on how complex your screen flow is or what you need the form to prefill.
- **IllPerspective9981** (2↑): We do this via OmniStudio doc gen. Our onboarding form has around 200 fields and it populates into a Word document that our team use when they go on to meet with the client.
  - **Business-Systems360** (1↑): Just skimming through the documentation, I don't see any mention of additional cost, could you confirm its free to add?
    - **IllPerspective9981** (1↑): May depend on your licencing. We are on Financial Services Cloud and it's no cost. Check with your AE
- **AMuza8** (1↑): In other words - do you need to send a PDF file attached to an Email?
- **Creative-Lobster3601** (1↑): This can easily be done via document generation on approval of the record.

Why are you worried about the 30 merge fields?

What can be done via a printable PDF that cannot be done with a document generation solution?
- **kmartcwby2** (1↑): You will need to create a visualforce page with the record details on it, and apex to generate the PDF from it, and email it out.
- **sfdc_dude** (0↑): Why don't you use a form solution like formstack so they can enter the data directly into Salesforce. You could also host your screen flow on a sf site so they can enter the data directly in the flow.
- **Interesting_Button60** (-1↑): Unauthenticated site could work. 

  
But for like $120 you can get zoho forms which integrates great with Salesforce. 

  
This thing you're doing is silly if you mean you're just sending an email with a list of questions for manual entry. I don't fully understand what you're saying. 

  
The form stack suggestion is going to cost a whole lot more than zoho
  - **Business-Systems360** (1↑): The reps are going through the form with the customers and filling it out for the engineers so there are implementation considerations with technical and cost estimates for the rep and SE to determine. They want the data to live in salesforce at the account level. There is also an approval element for the CFO.
