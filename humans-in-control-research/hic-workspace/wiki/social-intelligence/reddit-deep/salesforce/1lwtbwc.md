---
id: social-intelligence/reddit-deep/salesforce/1lwtbwc.md
url: "https://www.reddit.com/r/salesforce/comments/1lwtbwc/timeline_component/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Timeline Component"
author: "thebeanmachine88"
date: "2025-07-11T00:47:59.000Z"
score: 1
upvote_ratio: 1
num_comments: 14
flair: "help please"
extracted_at: "2026-06-11T18:58:38.963Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1lwtbwc.md#c0"
    char_span: [0, 951]
    sentence_count: 7
    key_terms: [timeline, salesforce, component, activity, comments, license, https, com]
    concepts: [timeline, salesforce, component, activity, comments]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1lwtbwc.md#c2"]
    token_count: 198
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1lwtbwc/timeline_component/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1lwtbwc.md#c1"
    char_span: [965, 3129]
    sentence_count: 15
    key_terms: [component, cloud, time, like, need, thebeanmachine88, license, without]
    concepts: [component, cloud, thebeanmachine88, license, without]
    section: Comments
    token_count: 476
  - id: "social-intelligence/reddit-deep/salesforce/1lwtbwc.md#c2"
    char_span: [3131, 3924]
    sentence_count: 6
    key_terms: [custom, kingofcrash8, salesforce, licenses, timeline, events, object, suspicious-nerve-487]
    concepts: [kingofcrash8, custom, salesforce, licenses, timeline]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1lwtbwc.md#c0"]
    section: Comments
    token_count: 213
---
# Timeline Component

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1lwtbwc/timeline_component/)
Posted by **thebeanmachine88** · **1↑** · **14 comments**

I am looking to replace the Activity Timeline with something that could roll tasks, emails, notes, and our custom event object together to display similar to the Activity Timeline.

I found what reads like a native Salesforce component for a lightning record page called Timeline.

I am the admin and on an Enterprise edition. Our org is tailored to financial planners.

After escalating this case they came back saying I was missing the “Industry Service Excellence permission set licenses," and I need to contact an Account Executive to help me purchase this license.

Does anyone have this license and is it worth it? Thank you in advance!

[Timeline SF Documentation](https://help.salesforce.com/s/articleView?id=ind.timeline_client_information.htm&type=5)

## Comments

- **queenofadmin** (6↑): There is a similar product from Salesforce Labs on the app exchange that doesn’t need a particular license sku to work. Maybe that will do the job without need if to buy an additional license.
  - **bstackulous** (4↑): Time Warp. We're getting ready to roll this out, and the feedback from users has been very positive during demos and training sessions. Pretty easy to configure the display for custom relationships.
    - **thebeanmachine88** (2↑): Time Warp looks okay, just wasn't as clean and compact as the Timeline component. Appreciate you both taking the time to help!
- **Suspicious-Nerve-487** (2↑): This sounds like it’s gated behind industry solutions (health cloud, manufacturing cloud, financial services cloud). No it is absolutely not worth purchasing one of these products solely for a simple component. 

In your case, you MIGHT look at evaluating financial services cloud as a real solution (assuming this permission comes with it, you’d have to check with your AE or SE), but do not waste the money for one of these solutions without the need for the actual solution 

As the other comment mentioned, looking on something like Salesforce labs or unofficialSF would be a start

 You could also vibe code it as a simple LWC, I bet you could screenshot whatever component you wanted it to look like and tell an LLM to build you an LWC
  - **thebeanmachine88** (1↑): Appreciate you taking the time to help! I will be vibe coding this. Without LLMs, I'd be screwed - Yay technology!
- **HandyStan** (2↑): We have this standard in education cloud. 

You can add four related objects to a core object and use an indexed date/time field as the timestamp for the event. 

Users can create records from it and you can have multiple running off the same record page or home page for different views. 

It's honestly pretty cool, and handy for us to see prospect milestones turn into applicant milestones or admissions journeys etc. 

My boss would throw a textbook at me if I asked to purchase a license for it though. The sf labs component would probably do what you need fine. This is like a cleaner, more clean cut version of.

Edit: oh and integrates with data cloud natively and is probably why it is license walled.
  - **thebeanmachine88** (1↑): This sounds like the dream! The data cloud makes sense. Appreciate you taking the time to help. No extra licenses happening here (half-fuelled on spite alone)
- **shortykiwigirl** (1↑): I have used this custom timeline from Salesforce labs with great success.

https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000G0yN3UAJ

No extra licenses required :)
- **KingofCrash8** (0↑): A custom object with a new lwc record page ?
  - **Suspicious-Nerve-487** (2↑): How would creating a new object here solve OPs need?
    - **KingofCrash8** (0↑): Not sure about ops specific custom events, If was email events text call log? Like a timeline? That is doable.
