---
id: social-intelligence/reddit-deep/salesforce/1rvfke3.md
url: "https://www.reddit.com/r/salesforce/comments/1rvfke3/question_regarding_journy_builder_in_marketing/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Question regarding journy builder in Marketing cloud"
author: "TTruthSpeaker"
date: "2026-03-16T17:12:26.000Z"
score: 2
upvote_ratio: 1
num_comments: 4
flair: "help please"
extracted_at: "2026-06-11T18:58:38.961Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1rvfke3.md#c0"
    char_span: [0, 1426]
    sentence_count: 3
    key_terms: [builder, field, changes, journey, record, case, "it's", new]
    concepts: [builder, field, changes, journey, record]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1rvfke3.md#c1"]
    token_count: 328
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1rvfke3/question_regarding_journy_builder_in_marketing/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1rvfke3.md#c1"
    char_span: [1440, 2232]
    sentence_count: 4
    key_terms: [criteria, entry, journey, closed, changes, created, updated, record]
    concepts: [criteria, entry, journey, closed, changes]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1rvfke3.md#c0"]
    section: Comments
    token_count: 184
---
# Question regarding journy builder in Marketing cloud

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1rvfke3/question_regarding_journy_builder_in_marketing/)
Posted by **TTruthSpeaker** · **2↑** · **4 comments**

I'm just getting started after years working in sales/service, and a question arises regarding journey builder.

In the "original" flows, we could know when a record was new or not, and when a field was changed or not with access to both values, and base decision logic with that, but I want to implement a journey builder that only executes either when a record (case) is "new" or when it's status changes to closed

Originally all this logic was in the original flow, but I was asked to "clean" this part so that the emails are managed by marketing cloud, and since I haven't been able to see a way for jounery builder to identify when a record is new or not, I've created a field, that changes to true if it goes through the flow.

Until here it's fine, but now I need to know if journey builder, checking both "Is created" and "Is updated", knows when a field IS CHANGING as in "Only updated when criteria changes to fullfill the requirement" as to avoid multiple emails for the same case again and again like for example when an user changes a field in a case that it's already closed and the field is true

Sorry for the garbage english, I know this is kinda hard to read

## Comments

- **Oleg_Dobriy** (1↑): In journey builder when using Salesforce data as an entry source, you can define your entry criteria, plus record condition (created or updated). These work only in the "when record is updated to meet the criteria" mode.




To verify the logic, once you activate a journey, go to your org and check a flow it created (actually two). In one of them you'll find the set entry criteria spread across decision elements.
  - **TTruthSpeaker** (1↑): So if I just select the Update checkbox and the entry criteria to "status = Closed" and nothing else, by default it will only trigger when a case changes to the closed state


While if it was already in a closed state and the description field changes for example, the journey won't act?
    - **Oleg_Dobriy** (1↑): Correct
