---
id: social-intelligence/reddit-deep/banking/1qwyp4n.md
url: "https://www.reddit.com/r/Banking/comments/1qwyp4n/cleared_bill_pay_check_endorsed_by_chase_but/"
kind: "social-post"
source: "reddit-deep: r/banking"
subreddit: "banking"
title: "Cleared Bill Pay check endorsed by Chase, but issuer says funds never received - trying to understand where the breakdown occurs"
author: "LeftHookLead"
date: "2026-02-05T21:45:36.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 14
flair: "Advice"
extracted_at: "2026-06-26T21:51:56.871Z"
extraction_method: "praw-deep"
research_goal: "Identify and analyze the top five consumer finance trends for 2026 across retail banking, fintech, and consumer lending, delivering a prioritized trend matrix that details key drivers, shifting consumer behaviors, and technological adoption."
engagement: "identify-and-analyze-the-top-five-consumer-finance-trends-fo"
chunks:
  - id: "social-intelligence/reddit-deep/banking/1qwyp4n.md#c0"
    char_span: [0, 2131]
    sentence_count: 15
    key_terms: [check, chase, lockbox, pottery, bank, understand, ally, barn]
    concepts: [check, chase, lockbox, pottery, understand]
    related_chunks: ["social-intelligence/reddit-deep/banking/1qwyp4n.md#c1"]
    token_count: 471
    sources: [{"n":"reddit-deep: r/banking","u":"https://www.reddit.com/r/Banking/comments/1qwyp4n/cleared_bill_pay_check_endorsed_by_chase_but/"}]
  - id: "social-intelligence/reddit-deep/banking/1qwyp4n.md#c1"
    char_span: [2145, 4098]
    sentence_count: 12
    key_terms: [endorsement, initiate, pottery, check, bank, barn, claim, payee]
    concepts: [endorsement, initiate, pottery, check, claim]
    related_chunks: ["social-intelligence/reddit-deep/banking/1qwyp4n.md#c0", "social-intelligence/reddit-deep/banking/1qwyp4n.md#c2"]
    section: Comments
    token_count: 453
  - id: "social-intelligence/reddit-deep/banking/1qwyp4n.md#c2"
    char_span: [4100, 4850]
    sentence_count: 3
    key_terms: [check, endorsement, response, sent, appropriate, affiliated, the-pocket, commenter]
    concepts: [check, endorsement, response]
    related_chunks: ["social-intelligence/reddit-deep/banking/1qwyp4n.md#c1"]
    section: Comments
    token_count: 162
---
# Cleared Bill Pay check endorsed by Chase, but issuer says funds never received - trying to understand where the breakdown occurs

Source: [reddit-deep: r/banking](https://www.reddit.com/r/Banking/comments/1qwyp4n/cleared_bill_pay_check_endorsed_by_chase_but/)
Posted by **LeftHookLead** · **1↑** · **14 comments**

Hoping someone here with bank ops / lockbox / check processing experience can help me understand where this likely broke down.

I’m in Michigan. In September 2025, I used Ally Bank Bill Pay to pay off a Pottery Barn / Capital One credit card. Ally sent a paper check payable to Pottery Barn, and the check included my Pottery Barn credit card account number.

The check was mailed to a Pottery Barn payment PO box that had been used the prior year. I later learned the current PO box was one digit higher, but still the same city and lockbox location.

In October 2025, Ally confirmed the check cleared and the funds permanently left my account. Ally later provided a copy of the cleared check. The endorsement stamp on the back reads “JP Morgan Chase Bank, N.A.” and does not reference Capital One, Pottery Barn, or Williams-Sonoma.

Capital One briefly credited the payment, then reversed it and says they can’t locate the funds. Ally confirmed in writing that the payment was authorized and correct, but closed its dispute and says they can’t help further. Chase customer service won’t engage with me since I don’t have a Chase account.

From a banking perspective, I’m trying to understand:

	•	If a check clears and carries a Chase endorsement, does that mean Chase acted as the depositary bank or lockbox processor?

	•	In a lockbox setup, how likely is it that a check sent to a prior-year PO box still gets processed but misapplied?

	•	Operationally, who should be able to identify the final deposit account once a check has cleared — the originating bank, the issuer, or the depositary/lockbox bank?

I’m not looking to assign blame here — I’m just trying to understand where in the payment chain this likely failed and who is actually in a position to trace it.

Happy to provide more detail if helpful.

## Comments

- **Empty_Requirement940** (16↑): If the check shows paid and the payee claims to have not received it then you want to initiate an endorsement claim.  This usually involves the payee signing an affidavit that says they never got the benefit.  Then your bank can initiate an investigation to locate what account it went to, or where it was cashed.
  - **LeftHookLead** (2↑): Any advice on how to get the payee, in this case pottery barn / capital one to initiate an endorsement claim? I have spoken with them on the phone and sent them a certified letter with images of the cleared check, and they’re attitude about all of it is “we never received the payment, so not our problem”
    - **Empty_Requirement940** (5↑): The maker can initiate it.  So call your bank and request to initiate an endorsement claim.  They can get the paperwork started and you get it signed by the payee
  - **hopbow** (1↑): Your bank should also be able to see the endorsement on the check even if it was initiated by billpay
- **Ill-Acanthisitta6022** (6↑): FYI, FISERV is terrible. That being said, Ally is certainly not being an ally right now. I would drop them the second you resolve this.
- **UIQueen** (3↑): Other than the fact this happened long enough ago that you're going to have trouble.  The first place to start is to look at your Ally Bank check images for an OLDER Pottery Barn check image to look at the endorsement and compare it to this one that's at issue.  While it's not impossible that Cap One processes its payments through JP Morgan, but it gives you a place to start.  If all the other Pottery Barn endorsements are the same, it means you can shove this back on Pottery Barn because they may very well have posted your payment to another Pottery Barn customer's account, and that's why they, "can't locate the funds."

If the endorsement is different, this then becomes a forged endorsement claim.  Which then you have to get your bank to deal with.

As to Ally's response, what exactly were you asking them?  If you were just enquiring about the check it might be an appropriate response.  However, if you can point out that a prior payment had a different endorsement than this one with the issue and mention a "forged endorsement," you might get a response where they'll help you.
- **The-Pocket** (1↑): My first question would be why is the check cleared through Chase if you sent it to Pottery Barn, who is affiliated with Capital One? 🤨 I’d do whay another commenter said and check previous endorsed checks, but also examine the current check copy they sent you a bit closer to see what the endorsement looked like and if any of the check was altered, because this is extremely suspect behavior.
