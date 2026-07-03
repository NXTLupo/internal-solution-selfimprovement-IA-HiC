---
id: social-intelligence/reddit-deep/sideproject/1tjaapp.md
url: "https://www.reddit.com/r/SideProject/comments/1tjaapp/we_reached_100_users_on_our_ai_expense_tracker/"
kind: "social-post"
source: "reddit-deep: r/sideproject"
subreddit: "sideproject"
title: "We reached 100 users on our AI expense tracker after a massive revamp. Looking for brutal feedback on our new UI, onboarding, and retention."
author: "UnluckyOpposition"
date: "2026-05-21T05:01:12.000Z"
score: 3
upvote_ratio: 1
num_comments: 22
flair: ""
extracted_at: "2026-07-03T00:07:56.412Z"
extraction_method: "praw-deep"
research_goal: ""
engagement: "misc"
chunks:
  - id: "social-intelligence/reddit-deep/sideproject/1tjaapp.md#c0"
    char_span: [0, 2053]
    sentence_count: 17
    key_terms: [feedback, sideproject, retention, smartwalt, app, comments, https, back]
    concepts: [feedback, sideproject, retention, smartwalt, comments]
    token_count: 472
    sources: [{"n":"reddit-deep: r/sideproject","u":"https://www.reddit.com/r/SideProject/comments/1tjaapp/we_reached_100_users_on_our_ai_expense_tracker/"}]
  - id: "social-intelligence/reddit-deep/sideproject/1tjaapp.md#c1"
    char_span: [2068, 2824]
    sentence_count: 6
    key_terms: [unluckyopposition, due-orchid4782, active, define, users, bank, data, completed]
    concepts: [unluckyopposition, due-orchid4782, active, define, users]
    section: Comments
    token_count: 213
  - id: "social-intelligence/reddit-deep/sideproject/1tjaapp.md#c2"
    char_span: [2826, 5057]
    sentence_count: 3
    key_terms: [category-edit, rate, theater, tracker, people, auto-categorization, "it's", category]
    concepts: [category-edit, auto-categorization, theater, tracker, people]
    section: Comments
    token_count: 506
---
# We reached 100 users on our AI expense tracker after a massive revamp. Looking for brutal feedback on our new UI, onboarding, and retention.

Source: [reddit-deep: r/sideproject](https://www.reddit.com/r/SideProject/comments/1tjaapp/we_reached_100_users_on_our_ai_expense_tracker/)
Posted by **UnluckyOpposition** · **3↑** · **22 comments**

Hey r/SideProject,

A while back, we launched the initial version of SmartWalt. The core idea was simple: an expense tracker that doesn't force you to link your bank account (because a lot of people hate giving up those credentials), but uses AI to eliminate manual data entry. You just say "Lunch $12" or snap a photo of a receipt, and it logs and categorizes it instantly.

The early feedback we got was incredibly helpful, but it also made us realize the app needed a lot of work. We went back to the drawing board, completely "refurnished" the app from the ground up, and recently rolled out a massive update.

Since that revamp, we've grown to nearly 100 active customers. It feels like a great milestone, but I know we still have blind spots and I want to fix them before we push harder for growth.

I would love some fresh, critical eyes on the app. Specifically, I'm looking for feedback on:

1. **Onboarding Flow:** Does the initial setup clearly explain *how* to use the voice and receipt scanning features, or is it confusing? Where do you feel the friction?
2. **The New UI:** We completely overhauled the design. Is it intuitive to navigate, or does it feel cluttered?
3. **Retention:** Utility apps are notoriously hard for retention. If you have built something similar, what specific hooks or UX patterns actually keep users coming back daily?

You can check out the landing page and app here: [https://www.smartwalt.com/](https://www.smartwalt.com/)

I’m fully prepared for harsh, honest feedback. I'll also be hanging around the comments if anyone is curious about the tech stack (we use Flutter for the frontend and FastAPI on AWS for the AI orchestration).

Thanks in advance for the help!

## Comments

- **Due-Orchid4782** (1↑): How do you define active users ? Is it users who completed an activity on the app?
  - **UnluckyOpposition** (1↑): We define an active user as someone who actually logs an expense (via voice, scan, or manual entry) or interacts with the AI coach
    - **Due-Orchid4782** (1↑): OK, Makes sense, thanks. Do you also track retention?
- **bonotron** (1↑): Cool! I had a similar idea for a side project after I finish with my current one (Birthday Buddy). So is it going to be avail world wide (I’m not from the US). If so, then I’ll join the wait list!
- **FFnoobski** (1↑): Is there an option to link bank or cc data?
  - **UnluckyOpposition** (1↑): SmartWalt actually requires **zero bank linking** or credit card data to function.

Unlike traditional finance apps that force you to hand over your bank login credentials for automation, SmartWalt uses AI voice tracking and receipt scanning to log your expenses. Your financial data stays completely independent and private.
    - **FFnoobski** (1↑): Ah, I wanted to sync them
- **Deep_Ad1959** (1↑): 100 users on a tracker is usually right where the second wave of churn hits, because the people staying past week 2 actually care about category accuracy and the auto-categorization is where most of these break. worth pulling the per-user category-edit rate. if more than 30% of transactions get manually re-categorized, the ai layer is mostly theater and the retention you have is people who haven't checked the numbers yet. the real metric for a tracker isn't onboarding completion, it's whether they trust the totals at month end. written with s4lai
- **Deep_Ad1959** (1↑): 100 users on a tracker is usually right where the second wave of churn hits, because the people staying past week 2 actually care about category accuracy and the auto-categorization is where most of these break. worth pulling the per-user category-edit rate. if more than 30% of transactions get manually re-categorized, the ai layer is mostly theater and the retention you have is people who haven't checked the numbers yet. the real metric for a tracker isn't onboarding completion, it's whether they trust the totals at month end. written with s4lai
  - **UnluckyOpposition** (1↑): Our AI orchestration uses LLMs, which are generally much better at semantic categorization than legacy rule-based systems, but you are right: we need to pull the exact "category-edit rate" to ensure it's actually delivering value and not just acting as theater.
    - **Deep_Ad1959** (1↑): the threshold worth setting isn't 30% overall, it's 30% per category. a global edit rate of 15% routinely hides a 60% edit rate on 'Shopping' and 'Other' where ambiguous merchants land (target, amazon, costco). those two buckets carry most of the trust signal because that's where users actually look hard at month-end. LLMs beat rules on clean cases; the gap closes fast on the edge ones, which is also where category-accuracy theater hides. written with s4lai
