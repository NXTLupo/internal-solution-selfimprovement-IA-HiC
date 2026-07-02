---
id: social-intelligence/reddit-deep/salesforce/1m93taf.md
url: "https://www.reddit.com/r/salesforce/comments/1m93taf/action_plans_app_efficient_ways_to_create/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Action Plans app & efficient ways to create repeatable series of tasks"
author: "NiaVC"
date: "2025-07-25T16:29:04.000Z"
score: 6
upvote_ratio: 1
num_comments: 9
flair: "help please"
extracted_at: "2026-06-11T18:58:38.963Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1m93taf.md#c0"
    char_span: [0, 2182]
    sentence_count: 9
    key_terms: [salesforce, date, due, action, tasks, account, partner, plans]
    concepts: [salesforce, action, tasks, account, partner]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1m93taf.md#c1"]
    token_count: 507
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1m93taf/action_plans_app_efficient_ways_to_create/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1m93taf.md#c1"
    char_span: [2196, 3623]
    sentence_count: 13
    key_terms: [appexchange, action, salesforce, brunogadaleta, niavc, plans, features, removed]
    concepts: [appexchange, salesforce, action, brunogadaleta, niavc]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1m93taf.md#c0"]
    section: Comments
    token_count: 365
---
# Action Plans app & efficient ways to create repeatable series of tasks

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1m93taf/action_plans_app_efficient_ways_to_create/)
Posted by **NiaVC** · **6↑** · **9 comments**

Have any of you used the [Action Plans](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000Gg6NVUAZ) app? (The standalone Salesforce Labs version, not the Financial Services Cloud one.) I need the ability to create several dozen tasks when an account of a certain type is created (these are tasks related to partner onboarding, such as "Email Partner Welcome Kit," "Confirm access to partner portal," etc.).   
  
The [Action Plans](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000Gg6NVUAZ) app looks like a fitting solution, but the only way to set a due date that I see is "X number of days after the Action Plan start date" (e.g., after account creation). I need more flexibility with setting the due date, such as being able to offset from account's date/time fields.

* If anyone has used this app, could you confirm that there's no way to set due dates in a more nuanced manner?
* Any other suggestions for how this could be accomplished? 

I basically need a to-do list/checklist generated when an account that meets certain criteria is created, but the checklist needs to be reportable on, e.g., 

* tasks with their statuses grouped by account;
* days open per task;
* days open past due date per task, etc. 

The requestors want to ensure that the reps are onboarding partners in a timely manner, no partner is falling through the cracks, etc.  
  
My backup solution is to build a flow, but it seems so inefficient, especially since I can see the team needing to finetune their process in the future (adding/removing tasks, modifying due dates, etc.). This would mean the flow would have to be edited every time, and that sounds like an unreasonable amount of maintenance. Action Plans solves this problem, but then there's the due date limitation. I suppose I could overwrite each task's due date post-insert using a flow, but that, too, seems unnecessarily cumbersome.

## Comments

- **Coolh4ndLuc** (8↑): Account Plans, Objectives, Action Plans, and Action Plan Templates are a feature in Sales Cloud now.
  - **NiaVC** (2↑): That's really good to know. I'll check and see if they offer better due date flexibility, Thank you.
- **brunogadaleta** (2↑): Action plans (template) are very limited. Can't be translated. Very simple dependency mechanism is available. Tracking deadlines with AP are really hard in real life scenarios.AP can't track decisions or dispatch tasks via dynamic assignment.
  - **NiaVC** (1↑): Thank you for your response. Do you suppose a flow is my best bet. (Trying to recreate the AP functionality with more flexible features seems like too much effort.)
    - **brunogadaleta** (2↑): Either a flow, or an AppExchange. We didn't investigate because AppExchange is restricted in our Org.
- **Ok_Desk8111** (1↑): The link above to "Action Plan" isn't working (https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000Gg6NVUAZ). Do you know if it's been removed or renamed?  Thanks!
  - **NiaVC** (1↑): Oh, how interesting, I had no idea it's been removed. I ended up not working on that project, so I didn't pursue the issue further. I wonder if they deprecated the Salesforce Labs app in favor of similar built-in features.
  - **ToeMurky694** (1↑): I came here to ask the same. I tried emailing Salesforce labs but got no reply. It has worked really well for clients
