---
id: social-intelligence/reddit-deep/fintech/1mdopbb.md
url: "https://www.reddit.com/r/fintech/comments/1mdopbb/anyone_else_drowning_in_kyc_compliance_hell_need/"
kind: "social-post"
source: "reddit-deep: r/fintech"
subreddit: "fintech"
title: "Anyone else drowning in KYC compliance hell? Need recommendations"
author: "Jeff3ryMurphy"
date: "2025-07-31T01:36:17.000Z"
score: 31
upvote_ratio: 0.88
num_comments: 60
flair: ""
extracted_at: "2026-06-11T18:57:30.595Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/fintech/1mdopbb.md#c0"
    char_span: [0, 1816]
    sentence_count: 17
    key_terms: [verification, fintech, kyc, "we're", need, compliance, different, comments]
    concepts: [verification, fintech, compliance, "we're", different]
    related_chunks: ["social-intelligence/reddit-deep/fintech/1mdopbb.md#c2"]
    token_count: 407
    sources: [{"n":"reddit-deep: r/fintech","u":"https://www.reddit.com/r/fintech/comments/1mdopbb/anyone_else_drowning_in_kyc_compliance_hell_need/"}]
  - id: "social-intelligence/reddit-deep/fintech/1mdopbb.md#c1"
    char_span: [1830, 3696]
    sentence_count: 14
    key_terms: [compliance, jeff3rymurphy, plaid, complyone, focused, check, kyc, fractional]
    concepts: [compliance, jeff3rymurphy, complyone, plaid, focused]
    section: Comments
    token_count: 484
  - id: "social-intelligence/reddit-deep/fintech/1mdopbb.md#c2"
    char_span: [3698, 6005]
    sentence_count: 20
    key_terms: [expensive, kyc, verification, automation, compliance, different, clients, curious]
    concepts: [expensive, verification, automation, compliance, different]
    related_chunks: ["social-intelligence/reddit-deep/fintech/1mdopbb.md#c0"]
    section: Comments
    token_count: 495
  - id: "social-intelligence/reddit-deep/fintech/1mdopbb.md#c3"
    char_span: [6007, 6975]
    sentence_count: 7
    key_terms: [kyc, providers, platform, former-historian-599, does, lot, afterthought, darkknightto]
    concepts: [providers, platform]
    section: Comments
    token_count: 217
---
# Anyone else drowning in KYC compliance hell? Need recommendations

Source: [reddit-deep: r/fintech](https://www.reddit.com/r/fintech/comments/1mdopbb/anyone_else_drowning_in_kyc_compliance_hell_need/)
Posted by **Jeff3ryMurphy** · **31↑** · **60 comments**

Hey everyone, hoping to tap into the collective wisdom here.

We're scaling our fintech app to new markets and holy sh\*t, KYC is eating us alive. Like, I knew it would be complex but this is next level.

Main issues we're hitting:

* Manual reviews taking forever (our ops team is about to revolt)
* Each country needs different flows and our current setup is a frankenstein monster
* Zero visibility into what happens after onboarding - users just disappear into the void

Last week we had a potential enterprise client ghost us because our verification took 3 days. THREE DAYS. In 2025. For remote identity verification that should be instant. Kill me.

What KYC platform for fintech are you all using that actually works?

Need something that:

* Actually automates the process (not just claims to)
* Handles KYB without being a separate nightmare
* Ideally plays nice with transaction monitoring

Been researching different options - looked at the usual suspects (Jumio, Onfido) but the pricing made my CFO cry. We need a proper KYC verification platform that won't bankrupt us.

We've been piloting Ondato for a few weeks - their remote identity verification seems decent and the API doesn't suck, but I'm paranoid about committing without hearing war stories from others.

Anyone willing to share what's working (or what to avoid like the plague)? Especially interested if you're also in fintech and dealing with multi-market compliance BS.

My sanity (and my ops team's will to live) depends on it.

Edit: Should mention we're B2B2C if that matters

## Comments

- **nrmitchi** (6↑): If you’re a fintech, and especially B2B2C (where you’re taking the load and compliance risk of your clients) you really need a solid compliance program internally; that is really hard, and risky, to try to offfload entirely.

If you don’t have the in-house expertise you should consider a part-time/fractional CCO (that will also have good opinions on vendors). 

An old coworker of mine started a company called ComplyOne (https://complyone.tech/); if you email him (anzar@<domain>) he should be able to help point you in right direction.
  - **Jeff3ryMurphy** (1↑): Yeah you're probably right about the in-house expertise. We've been trying to do it all ourselves and it shows. Fractional CCO actually makes sense - hadn't thought of that. Thanks for the ComplyOne rec, will check it out
    - **Longjumping-Gap5159** (1↑): Check out FS Vector (U.S. focused) as well, they specialize in helping early stage fintechs build/operationalize compliance programs.
- **greenacres13** (4↑): Plaid
  - **Jeff3ryMurphy** (1↑): Two votes for Plaid already 👀 Guess I need to check that out
- **get_a_mudget** (4↑): Not dealing with this yet, but I know we will run into KYC compliance as well. We really like Plaid and are going to lean on their offerings as much as possible. What's your current solution? 

We are a FinTech startup, B2C, focused on goal-oriented personal finance, and pre-seed so we are looking at a very niche market currently.
  - **Jeff3ryMurphy** (2↑): Currently limping along with a frankenstein mix of Jumio + manual reviews. It's... not great. Plaid for KYC? Didn't even know they had that - always thought they were just the bank connection guys. Will def look into it, thanks!
- **TitusRiskView** (2↑): Totally get this. You’re describing what we run into constantly: KYC setups focused on document compliance, not actual risk.

Especially in cross-border cases, we’ve seen “clean” applications fall apart when you dig into:
	•	Who’s really behind the entity
	•	Dissolved guarantors
	•	Sealed fraud convictions in other jurisdictions

We started building our own lightweight layer on top of KYC just to screen structures and people early.
That became Second Opinion Check: focused on human-layer risk and reputational blind spots.

Not a vendor pitch just sharing what worked when compliance tech alone fell short.

Curious what others here do to catch this stuff before the legal team gets involved?
- **TitusRiskView** (2↑): Yup, familiar pain. I’ve helped several teams fix broken KYC setups where ops collapse and clients vanish. Curious what’s actually working for you?
- **TechnologyKey5680** (2↑): Hi, I’m the CDO of a Spanish fintech. We also had this problem… KYC solutions are really expensive. For us, the best approach has been to do it ourselves using Amazon Rekognition and adapting it. It has different features that might work for you. If you want some help, feel free to send me a message.
- **Foreign-Rest5206** (2↑): Here's my two cents:

We went through the EXACT same nightmare when we expanded internationally. Three days for verification is absolutely brutal - we lost so many good potential customers because of stuff like that.

The multi-country compliance thing is what really kills you. Every market has their own special requirements and suddenly your "simple" KYC flow becomes this monster.

What actually helped us get our sanity back:

Jumio ended up being worth the price once we factored in the dev time saved and the automation that actually works. Yeah, it's expensive but losing enterprise clients is way more expensive.

spektr has been a lifesaver for orchestrating all the different flows across markets - handles the complex routing and workflow automation that you need for B2B2C setups. Think they just launched an AI agent builder as well so you can just prompt your use case and it builds it for you.

Onfido is solid but you're right about pricing. Their business verification isn't bad though.

Haven't tried Ondato but heard decent things. Just make sure their international coverage actually works for your target markets - some providers oversell their global reach (we see this a lot).

The transaction monitoring integration piece is tricky. Most KYC providers bolt that on as an afterthought. You might need to accept that it's going to be 2-3 specialized tools rather than one magical platform that does everything well.

What markets are you expanding into? That usually determines which providers are actually viable vs just marketing fluff.
- **DarkKnightTO** (2↑): Any vendor you choose, do you have a third party risk management and governance framework? These KYC and AML Suppliers have access to a lot of sensitive information. How do you protect your fintech and your clients from potential privacy risks?
- **sasquatchsam** (1↑): Socure's RiskOS platform does all of the above.
- **Former-Historian-599** (1↑): yeah, kyc compliance can be a real pain. i’ve dealt with it a lot in my work, and what helped me was just breaking it down into smaller steps and focusing on one area at a time. also, using a checklist can make it less overwhelming.
