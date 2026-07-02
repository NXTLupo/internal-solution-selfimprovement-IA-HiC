---
id: social-intelligence/reddit-deep/banking/1s1xgnd.md
url: "https://www.reddit.com/r/Banking/comments/1s1xgnd/how_are_you_handling_video_kyc_now_that_deepfakes/"
kind: "social-post"
source: "reddit-deep: r/banking"
subreddit: "banking"
title: "How are you handling video KYC now that deepfakes are getting good?"
author: "Left-Listen-3501"
date: "2026-03-23T23:33:35.000Z"
score: 0
upvote_ratio: 0.33
num_comments: 8
flair: "Other"
extracted_at: "2026-06-26T21:51:56.872Z"
extraction_method: "praw-deep"
research_goal: "Identify and analyze the top five consumer finance trends for 2026 across retail banking, fintech, and consumer lending, delivering a prioritized trend matrix that details key drivers, shifting consumer behaviors, and technological adoption."
engagement: "identify-and-analyze-the-top-five-consumer-finance-trends-fo"
chunks:
  - id: "social-intelligence/reddit-deep/banking/1s1xgnd.md#c0"
    char_span: [0, 1298]
    sentence_count: 7
    key_terms: [video, going, onboarding, deepfakes, high-risk, mandatory, comments, banking]
    concepts: [video, going, onboarding, deepfakes, high-risk]
    token_count: 295
    sources: [{"n":"reddit-deep: r/banking","u":"https://www.reddit.com/r/Banking/comments/1s1xgnd/how_are_you_handling_video_kyc_now_that_deepfakes/"}]
  - id: "social-intelligence/reddit-deep/banking/1s1xgnd.md#c1"
    char_span: [1312, 3611]
    sentence_count: 27
    key_terms: [maleficentcoconut594, digital, "false", like, businesses, accounts, managers, positive]
    concepts: [maleficentcoconut594, digital, businesses, "false", accounts]
    section: Comments
    token_count: 491
  - id: "social-intelligence/reddit-deep/banking/1s1xgnd.md#c2"
    char_span: [3613, 4145]
    sentence_count: 4
    key_terms: [customers, specifically, explanation, willingness, prediction, awareness, cooperate, detection]
    concepts: [customers]
    section: Comments
    token_count: 109
---
# How are you handling video KYC now that deepfakes are getting good?

Source: [reddit-deep: r/banking](https://www.reddit.com/r/Banking/comments/1s1xgnd/how_are_you_handling_video_kyc_now_that_deepfakes/)
Posted by **Left-Listen-3501** · **0↑** · **8 comments**

Our board wants video verification for all high-risk customer onboarding starting Q3 which makes sense on paper given the synthetic identity stuff going around, but I'm stuck on the practical side.

We don't have capacity to staff live video calls for every high-risk app, our analysts aren't trained to spot deepfakes anyway, and I already know we're going to lose business customers who won't sit through a video call just to open an account.

Are you running mandatory video KYC right now? Did it move the needle on fraud or did it mostly just slow things down?

\*\*edit: appreciate all the responses and DMs, this is really helpful. couple things I'm taking away, seems like most of you who went mandatory video are using some kind of automated liveness detection rather than live analyst calls, which I hadn't considered to be honest.

Going to look into iProov, Sphinxhq, Jumio, and Onfido this week to see what integrates with our existing stack without rebuilding the whole onboarding flow.

Will report back if anyone cares.

## Comments

- **MaleficentCoconut594** (2↑): I’ve never heard of this. Our RMs (branch managers) and/or VPs (regional managers) are required to make physical site visits to businesses, annually for high risk clients
  - **Left-Listen-3501** (1↑): makes sense for traditional commercial banking, we still do site visits too for our higher risk business accounts. 

The issue we're running into is more on the digital onboarding side where there's no branch relationship at all, so the board is pushing video as a substitute for that in-person touchpoint.
    - **MaleficentCoconut594** (1↑): I see. Our digital division got overwhelmed with so much fraud we had to totally shut it off for over 2 years. They just recently started it up again, however it’s severely limited and I believe businesses are not allowed, only personal accounts
- **original_lowsypunk** (1↑): I care! Please do report back. Curious, and seems like lots of firms struggling with same issue right now. There's a big gap between "we need video verification" and actually being ready to do it well.

I help run a Stanford-affiliated angel group and have seen a ton of identity/security startups come through. Also used to lead a digital thread at a Fortune 100 manufacturer. So I've been on both sides of this. It's definitely evolving quickly.

Automated liveness detection is the move here. Not about replacing human judgment. It's about filtering. Good system flags the 2-3% that actually need human eyes, your analysts review edge cases instead of everything. Totally different workload!

A couple things to push vendors on. First, the right vendor should complement your existing stack, not rip and replace it. If they can't run a proof of concept that shows complementary lift on top of what you already have before you spend anything, walk away. Second, ask about guarantees. The serious players will put real money behind their accuracy. Like paying you for every false positive. That tells you a lot about how confident they actually are in their tech.

Also worth knowing: huge variance in real-world performance vs lab numbers. Push hard for false positive/false negative rates on data that looks like YOUR high-risk segment, not their cherry-picked benchmarks. Cost of rejecting good customers often outweighs the fraud savings.

I think business customers generally get it, though. 2-3 minute video flow with a clear explanation of why, most will cooperate. Some friction is just the cost of the control, and my prediction is that customers' willingness will increase with their awareness of growing fraud risks.
- **Unique_Buy_3905** (1↑): Add au10tix to your vendor list. They handle deepfake detection specifically and integrate without ripping out existing flows. Their liveness tech catches synthetic faces while keeping pass rates high for real customers.
