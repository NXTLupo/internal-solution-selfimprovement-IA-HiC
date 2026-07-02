---
id: social-intelligence/reddit-deep/salesforce/1mneau2.md
url: "https://www.reddit.com/r/salesforce/comments/1mneau2/households_donation_rollups_in_the_new_non_profit/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Households Donation Rollups in the new Non Profit Cloud"
author: "JumpyRepeat4974"
date: "2025-08-11T14:20:43.000Z"
score: 8
upvote_ratio: 1
num_comments: 8
flair: "help please"
extracted_at: "2026-06-25T15:21:44.740Z"
extraction_method: "praw-deep"
research_goal: "Identify how peer large private universities without medical schools are implementing AI across advancement workflows—including fundraising, alumni relations, and donor communications—to define our own adoption roadmap that balances ethical guardrails, staff readiness, and ROI."
engagement: "identify-how-peer-large-private-universities-without-medical"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1mneau2.md#c0"
    char_span: [0, 1621]
    sentence_count: 9
    key_terms: [gift, transactions, household, commitments, dpe, rollups, prg, salesforce]
    concepts: [transactions, household, commitments, rollups, salesforce]
    token_count: 375
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1mneau2/households_donation_rollups_in_the_new_non_profit/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1mneau2.md#c1"
    char_span: [1635, 3487]
    sentence_count: 10
    key_terms: [household, donor, dpe, jumpyrepeat4974, summary, level, gift, org]
    concepts: [household, donor, jumpyrepeat4974, summary, households]
    section: Comments
    token_count: 475
---
# Households Donation Rollups in the new Non Profit Cloud

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1mneau2/households_donation_rollups_in_the_new_non_profit/)
Posted by **JumpyRepeat4974** · **8↑** · **8 comments**

We’re on **Nonprofit Cloud** and I’m trying to use the **Data Processing Engine** to roll up all donations (Gift Transactions) and commitments (Gift Commitments) from every member of a **Party Relationship Group (PRG)** into the PRG record itself.

Ultimately, we just want the PRG to have rollup fields showing:

* Total given
* Largest household gift
* Last household gift date
* Total pledged

In **NPSP**, this was handled automatically with rollups to the **Household Account**.

In NPC, it looks like we need to build these rollups ourselves in DPE, but I’m not sure of the simplest join path/aggregation setup so that all group members’ giving is included.

Has anyone set this up before in DPE?

Thanks!

\*\*\*Update  
OK here's what I got so far- yes, donor gift summary using DPE IS calculating all transactions that were paid at the household level. So it will roll up all gift transactions with paid status. 

For some weird reason, it does not calculate gift commitments or unpaid transactions out of the box, but this can be added to the basic DPE process.   
The main problem, as you all mentioned, is that there's little to no documentation about it.   
I've been working with NPSP for years now, so while I can see the value the new setup brings, I still have many unanswered questions about some features that should be very basic functionality.

## Comments

- **BabySharkMadness** (2↑): Have you looked into DLRS, it’s a Salesforce app, and free, but would give you the flexibility you need if you can’t do it natively.
  - **JumpyRepeat4974** (2↑): Thanks for your quick reply!   
I can use DLRS, but I feel like SF probably has some standard solutions in place no? Like it's basically the same as donor gift summary, only at the household level.
- **gordynerf** (1↑): I'm pretty sure they provide the donor gift summary recipe already. Take a look at that before building your own. 

You can also use flow to handle the rollups with the new bulkify feature.
  - **JumpyRepeat4974** (2↑): We've activated the donor gift summary DPE process at the person account level. How can I run it at the household PRG level?
    - **gordynerf** (2↑): you can create a smaller DPE that rolls up the donor summaries after they've been calculated. that way you don't need re run the entire process again, just take what the person accounts have and roll them up to the same fields for the household record
    - **Momma_Knits21718** (2↑): Grab a NPC Learner org as it includes a DPE called "*NPC_DonorGiftSummary" that you can see how it works with the PRG and Households, and recreate (or try and export and bring into your org, but not 100% how).
    - **Momma_Knits21718** (1↑): Wait - FWIW it does seem that the OOTB DonorGiftSummary DPE does have PRG as a Data Source and is filtering on the Type = Household. Look all the way down at the bottom on it. So I think that means it actually should work along with the "regular" rollups, going to a DGS record for the Household Account. I don't have a test org with Households to confirm, but that seems to be the intention.
- **Mctridge** (1↑): Raise a case with Salesforce Support. This is standard NPC functionality but can be awkward to set up due to poor documentation
