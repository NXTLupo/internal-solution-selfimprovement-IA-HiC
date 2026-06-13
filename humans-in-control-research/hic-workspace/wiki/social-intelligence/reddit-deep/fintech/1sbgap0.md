---
id: social-intelligence/reddit-deep/fintech/1sbgap0.md
url: "https://www.reddit.com/r/fintech/comments/1sbgap0/automating_business_verification_without_docs/"
kind: "social-post"
source: "reddit-deep: r/fintech"
subreddit: "fintech"
title: "Automating business verification without docs?"
author: "Narrow-Variation-169"
date: "2026-04-03T15:12:50.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 10
flair: ""
extracted_at: "2026-06-11T18:57:30.596Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/fintech/1sbgap0.md#c0"
    char_span: [0, 729]
    sentence_count: 6
    key_terms: [verification, business, comments, fintech, anyone, narrow-variation-169, docs, accountancy]
    token_count: 159
  - id: "social-intelligence/reddit-deep/fintech/1sbgap0.md#c1"
    char_span: [744, 3348]
    sentence_count: 26
    key_terms: [verification, data, documents, banking, company, open, use, friction]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/fintech/1sbgap0.md#c2"
    char_span: [3350, 4811]
    sentence_count: 8
    key_terms: [different, verification, company, beneficial, connection, registries, friction, banking]
    section: Comments
    token_count: 300
---
# Automating business verification without docs?

Source: [reddit-deep: r/fintech](https://www.reddit.com/r/fintech/comments/1sbgap0/automating_business_verification_without_docs/)
Posted by **Narrow-Variation-169** · **1↑** · **10 comments**

We onboard new business clients onto an accountancy platform and the verification step is still quite manual — collecting IDs, company records, etc., which slows things down.

I’ve been wondering if anyone has moved toward using bank data (via Open Banking) to streamline parts of this instead.

Has anyone tried this in practice? Does it actually reduce friction, or do you still end up needing the usual docs anyway?

Interested in what’s working day-to-day rather than ideal setups.

## Comments

- **alicantetocomo** (1↑): Open banking wont let you get last AMl/KYC requirements. Almost every KYC/KYB provider offers document-free  verifications
- **designbymaya** (1↑): Depends on the market and your specific use case/regulations. But from my experience, when A/B testing Open banking vs ID document verification, users usually prefer ID document. 

I’ve also done a lot of user interviews on the subject (mostly in Europe) and the majority of users were sharing that scanning ID feels more secure to them.
  - **vouchsafehq** (0↑): Ironically, it's the opposite! Pictures of ID docs are easy to fake nowadays but banks and other "authoritative data" is essentially fraud-proof to everyone but nation state-level actors.
    - **designbymaya** (1↑): Absolutely, but that’s not how non-tech users think.. and when the goal is to reduce friction, their perception is what matters.
- **whatwilly0ubuild** (1↑): Bank data can supplement business verification but it won't replace the core documents for regulated contexts. The friction reduction is real but more modest than vendors sometimes suggest.

What Open Banking data actually helps with. Confirming the account belongs to the entity by matching account holder name to the registered company name. Verifying the business is operational through transaction history showing real commercial activity. Income and revenue verification for credit or lending decisions. Reducing back-and-forth by pre-filling information you'd otherwise ask for manually.

What it can't replace. Company registry verification confirming the legal entity exists. UBO identification since bank data doesn't tell you who owns the company. Director verification and ID checks. Formation documents for complex ownership structures. Anything your regulatory obligations specifically require as documentary evidence.

Where teams see actual friction reduction. The biggest win is usually eliminating the "please send bank statements" step. Instead of asking the client to download PDFs and email them, you get authorized access and pull the data directly. This removes a common dropout point where clients abandon onboarding because they can't be bothered finding the documents.

The practical pattern that works. Use registry APIs like Companies House in the UK to pull company data automatically. Use Open Banking to verify account ownership and pull transaction data. Still collect ID documents for directors and UBOs, but use verification providers that make this low-friction. The combination reduces manual steps without pretending you can skip compliance requirements.

For an accountancy platform specifically, the Open Banking connection you establish for verification can double as the ongoing bank feed connection for bookkeeping, which makes the friction more justifiable to clients.
- **Petter-Strale** (1↑): Open Banking helps with some of the verification picture (confirming the account is real, the company is transacting) but it doesn't replace the structural checks. You still need to know the company is actually registered, who the beneficial owners are, whether anyone on the cap table is sanctioned, whether the address is real. Bank data alone can't tell you any of that.

What actually reduces friction is pulling from the authoritative registries directly instead of asking the customer to upload PDFs. Companies House for UK, Bolagsverket for Sweden, BRreg for Norway, etc. Most of them have APIs, they're just a pain to integrate one by one because every country has different auth, different schemas, different quirks.

We've been building this at Strale, a single API that wraps 27 countries of company registries plus sanctions and beneficial ownership. Cuts onboarding from "upload these 6 documents" to "give me your registration number." Not a silver bullet, you still need ID verification for signatories, but it takes a huge chunk out of the manual work.
- **Senior_Sir_7724** (0↑): What country are you in referring too? requirements and acceptance is vastly different depending on regulatory regimes.
