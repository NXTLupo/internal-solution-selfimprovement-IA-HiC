---
id: social-intelligence/reddit-deep/datascience/1okvmiz.md
url: "https://www.reddit.com/r/datascience/comments/1okvmiz/home_insurance_claims_recovery_modelling/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "Home Insurance Claims Recovery modelling experience (subrogation)"
author: "Puzzleheaded_Text780"
date: "2025-10-31T14:09:37.000Z"
score: 6
upvote_ratio: 0.81
num_comments: 14
flair: "Discussion"
extracted_at: "2026-06-11T18:58:19.181Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1okvmiz.md#c0"
    char_span: [0, 790]
    sentence_count: 8
    key_terms: [recovery, datascience, identifying, propensity, insurance, modelling, comments, external]
    concepts: [recovery, datascience, identifying, propensity, insurance]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1okvmiz.md#c2"]
    token_count: 172
    sources: [{"n":"reddit-deep: r/datascience","u":"https://www.reddit.com/r/datascience/comments/1okvmiz/home_insurance_claims_recovery_modelling/"}]
  - id: "social-intelligence/reddit-deep/datascience/1okvmiz.md#c1"
    char_span: [804, 2609]
    sentence_count: 14
    key_terms: [recovery, something, check, claim, model, party, contractor, impossible]
    concepts: [recovery, something, check, claim, contractor]
    section: Comments
    token_count: 414
  - id: "social-intelligence/reddit-deep/datascience/1okvmiz.md#c2"
    char_span: [2611, 4967]
    sentence_count: 20
    key_terms: [recovery, model, party, frequency-severity, insurance, claim, fault, using]
    concepts: [recovery, model, frequency-severity, insurance, party]
    related_chunks: ["social-intelligence/reddit-deep/datascience/1okvmiz.md#c0"]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/datascience/1okvmiz.md#c3"
    char_span: [4969, 6533]
    sentence_count: 12
    key_terms: [loss-data-analytics, insurance, company, whether, repair, openacttexts, homeowners, themselves]
    concepts: [loss-data-analytics, insurance, company, whether, openacttexts]
    section: Comments
    token_count: 335
---
# Home Insurance Claims Recovery modelling experience (subrogation)

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1okvmiz/home_insurance_claims_recovery_modelling/)
Posted by **Puzzleheaded_Text780** · **6↑** · **14 comments**

Looking for people to get some insight and ideas for my new project for a client. The project is to predict recovery propensity in home insurance claims mainly when third party is at fault. 

Incase you have,

1. What type of external and internal data you used ? Mainly looking for relevant external data which was useful. 
2. Which features helped you in identifying the recovery propensity? 
3. Anything in the market which helps in identifying recovery ?
4. Any other approach you took which helped you in the modelling?

## Comments

- **[deleted]** (4↑): Ask an actuary.
  - **Puzzleheaded_Text780** (1↑): I will check with them. Thanks
- **Revision17** (2↑): I’ve never made a recovery model myself, but I work on a team with people who make recovery propensity models.

One thing I hear about is to check that you either filter out impossible recoveries and/or you check to make sure they’re generally not scoring high.   For example it’s better to predict high for something that has a possibility of recovery than something that’s impossible to recover.
  - **Puzzleheaded_Text780** (1↑): Yes, we do something called test and learn post model building to identify business rules which we can hard code in the rule. For example, there can be certain perils, with almost zero recovery probability, we will remove those. 

By any chance, can I get in touch with any of your colleagues on Reddit or any other way ? 

Thanks for your help.
- **DirectionPotential98** (2↑): Agree with the other comments:
- divide by peril: what was the cause of loss: fire, wind, water, liability (like dog bites)
- even below the “peril” level there may be differences due to the cause of loss
- see if you can identify who the third party is and if that third party is insured (which could be two separate features). The relationship of the third party could matter…is it a neighbor? A landlord? A contractor that the insured hired? A contractor hired by a neighbor/landlord (then you have two layers of subrogation!)?
- consider the legal environment / jurisdiction of the claim
- how much is the underlying claim that recovery is sought for? If it’s a relatively small claim, it may not be worth the effort for some insurers.

As far as model structure goes, what do they want you to predict? A currency-denominated amount (e.g. dollars/pounds/euros)? 

For insurance models with lots of zeros, a tweedie regression model is pretty common, and that allows you to build a single model. But you may want to build a frequency-severity model, where frequency is just a binomial “is there recovery?” and severity is either a dollar amount or a percentage of the underlying claim. I’d recommend doing some EDA first to see if there’s any patterns to the recovery percentage. You do want to avoid a model where you could end up predicting a recovery greater than the underlying claim.

The advantage of a split frequency-severity model is that you can get a bit more explainability around why/how/how much recoveries are, and it’s trivial to calculate an expected dollar recovery by multiplying the predictions. If you want to get real fancy, you could bootstrap some distributions of recoveries by sampling the frequency/severity, too.
  - **Puzzleheaded_Text780** (2↑): Thanks for the detailed answer. We are thinking on similar lines too. Currently, we are trying to establish scenarios in which recovery is possible, and have identified few cases like when third party is at fault ( insured and uninsured), Supplier and manufacturer is a fault (with or without liability insurance) and repair/contractor is at fault. 

We will go into peril soon. 

As per model structure is involved, we are only concerned about predicting if recovery is possible or not. We don’t care about how much can be recovered. 

We are doing the analysis, by creating recovery flag using historical data. Currently, we have created two flags, partial and full recovery. 

Our recent discussions with stakeholders suggests that the core driver of the recovery is incident details, mainly how the damage was caused.  We are thinking about using the claim notes and incident details using some NLP to create some features.
- **Defy_Gravity_147** (1↑): Health and life insurance analyst here:

Propensity for recovery depends very broadly on contractual requirements, the legal environment, and the qualities of the 3rd party.

Beware overfitting and outliers, esp in states where the company doesn't have a lot of business. 

HTH!
  - **Puzzleheaded_Text780** (1↑): Thanks for your input. Can you please explain “quality of third party” ? How do you define that?
    - **Defy_Gravity_147** (1↑): You're Welcome. Qualit*ies of the 3rd party.

The 3rd party from whom the insurance company seeks recovery can be an individual, another company, or even a governmental or community entity.

Different entities have different abilities to pay. I mean, uninsured motorist coverage arose because insurance companies figured out pretty quickly that suing a 3rd party didn't always work. Plenty of foolish individuals caused car crashes but didn't have insurance, and couldn't pay for damages themselves. 

I'm unsure what that looks like on homeowners'... I'm thinking home repair businesses who should be licensed, whether the repair contract was bonded, and whether the business is insured themselves? I've never worked with homeowners claim data, but in this scenario, I would expect whether or not the home repair project was big enough to be properly bonded is likely a huge driver.

Bonding is setting aside money to protect the customer from financial loss in case of error on the part of the company doing the renovations.

But that's just one scenario... Having an understanding of the scenarios that are big enough to subrogate, and those that aren't, would certainly help. I would talk to a  SME in the claims department to get better information.
- **rsambasivan** (1↑): You could check out the approaches possible in:  
[https://openacttexts.github.io/Loss-Data-Analytics/](https://openacttexts.github.io/Loss-Data-Analytics/)

Katrien Antonio's lectures in youtube are also good.

Good luck.
- **sonicking12** (-1↑): ChatGPT
  - **Puzzleheaded_Text780** (2↑): I tried but getting very generic answer.
