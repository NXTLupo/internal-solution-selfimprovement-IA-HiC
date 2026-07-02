---
id: social-intelligence/reddit-deep/fintech/1qkxd4b.md
url: "https://www.reddit.com/r/fintech/comments/1qkxd4b/earlystage_fintech_ach_processor_for_peertopeer/"
kind: "social-post"
source: "reddit-deep: r/fintech"
subreddit: "fintech"
title: "Early-stage fintech: ACH processor for peer-to-peer consumer payments with very low volume?"
author: "prolikewhoa"
date: "2026-01-23T17:38:58.000Z"
score: 10
upvote_ratio: 1
num_comments: 15
flair: ""
extracted_at: "2026-06-26T21:51:45.867Z"
extraction_method: "praw-deep"
research_goal: "Identify and analyze the top five consumer finance trends for 2026 across retail banking, fintech, and consumer lending, delivering a prioritized trend matrix that details key drivers, shifting consumer behaviors, and technological adoption."
engagement: "identify-and-analyze-the-top-five-consumer-finance-trends-fo"
chunks:
  - id: "social-intelligence/reddit-deep/fintech/1qkxd4b.md#c0"
    char_span: [0, 1747]
    sentence_count: 10
    key_terms: [payments, fintech, peer-to-peer, volume, low, connect, trying, early-stage]
    concepts: [payments, peer-to-peer, fintech, volume, connect]
    token_count: 400
    sources: [{"n":"reddit-deep: r/fintech","u":"https://www.reddit.com/r/fintech/comments/1qkxd4b/earlystage_fintech_ach_processor_for_peertopeer/"}]
  - id: "social-intelligence/reddit-deep/fintech/1qkxd4b.md#c1"
    char_span: [1761, 3969]
    sentence_count: 19
    key_terms: [money, probably, doing, essentially, prolikewhoa, bank, compliance, definitely]
    concepts: [money, probably, essentially, prolikewhoa, compliance]
    section: Comments
    token_count: 511
  - id: "social-intelligence/reddit-deep/fintech/1qkxd4b.md#c2"
    char_span: [3971, 6130]
    sentence_count: 19
    key_terms: [stronghold-joins-nachas-payments-innovation-alliance, dwolla, regulatory, "they're", volume, "you're", requirements, verification]
    concepts: [regulatory, dwolla, "they're", requirements, verification]
    section: Comments
    token_count: 455
  - id: "social-intelligence/reddit-deep/fintech/1qkxd4b.md#c3"
    char_span: [6132, 7280]
    sentence_count: 8
    key_terms: [payments, prolikewhoa, ach, get, something, clients, painful, similar]
    concepts: [payments, prolikewhoa, something, clients, painful]
    section: Comments
    token_count: 282
---
# Early-stage fintech: ACH processor for peer-to-peer consumer payments with very low volume?

Source: [reddit-deep: r/fintech](https://www.reddit.com/r/fintech/comments/1qkxd4b/earlystage_fintech_ach_processor_for_peertopeer/)
Posted by **prolikewhoa** · **10↑** · **15 comments**

I’m building an early-stage fintech app (0 customers, pre-revenue) focused on **bank-to-bank (ACH) payments between two consumers**. Think peer-to-peer expense and obligation settlement, not subscriptions or invoicing.

I’ve already talked to Dwolla, and they said my volume is too low right now. They suggested Seamless Chex and GoCardless, but I’m skeptical those actually fit my use case.

My constraints / requirements:

* US-only
* ACH only (no cards)
* Peer-to-peer between individuals (not businesses)
* Low / zero volume to start
* Clean audit trail (legal-sensitive use case)
* I’m trying to *avoid* heavy “merchant-style” onboarding UX for normal users

Stripe Connect is the obvious answer, but Connect still frames recipients as merchants, which feels like a UX mismatch for my audience. That said, I know identity verification is unavoidable.

What I’m trying to understand from people who’ve actually shipped this:

* Is there a realistic alternative to Stripe Connect at very low volume, or is this just the cost of doing business?
* Has anyone successfully used Moov, Seamless Chex, GoCardless for irregular, two-way consumer payments?
* Are there sponsor-bank / program-manager options that even talk to founders this early, or is that a later-stage move only?

Not looking for shortcuts or gray-area hacks, just trying to choose the *least wrong* option so I don’t have to rip out payments in 6 months.

Appreciate any real-world experience here.

## Comments

- **monkey6** (3↑): I built this in 2015 and we used NACHA batch files with the different banks. Watch out for any flow of funds that would make you an MSB.
  - **prolikewhoa** (1↑): Definitely do not want to be a MSB. What I'm building is essentially a ledger. It’s not open peer-to-peer. It’s a closed, ledger-based reimbursement system between two pre-defined parties
- **10452_9212** (2↑): I stay away from peer to peer. way to much headache, compliance, and fees you will need to pay.
- **RealDapper** (2↑): Good luck. If you get this going I’d love to hear more about it but moving money P2P is a legal/compliance struggle more than a technical one.

For reference we move money bank to bank (between ourselves and clients) with ACH using Plaid. It’s not cheap and it’s not a quick process. When we signed up they wanted to be sure we were not doing P2P money movement. While they support it, it’s an early product that they are very carefully selecting clients for. So if you go that route be ready to cough up a lot of authoritative documentation explaining what you’re doing, how you’re doing it, how you’re monitoring it, your audit process, audits you’ve had done, your legal counsel’s opinion (probably not required but they’d like to have it), diagrams and more.

I recall some comment from someone at some point saying Moov was good. Given your scenario though you’re probably going to get a lot of due diligence from them too.

Definitely look into every state’s money transmitter laws where you’re operating. An MTL would probably help land a service provider or partner if that fits your scenario.

You can try local banks if you’re small but they’d be taking a risk on you committing fraud, money laundering, etc. WebBank and Cross River Bank are common fintech partners though I can’t speak to what they’ll require from you.
  - **prolikewhoa** (1↑): Do you know what types of people I should talk to for guidance in this sector? What I'm making is essentially a ledger and tracker which also happens to allow you to move money via ACH through predefined parties, just two of them paired together. The actual money movement is the premium feature but it's a very big unique selling point. 

I did notice a competitor using Plaid/Dwolla to move money in this exact same way. But I know they're not a huge player so I don't know why Dwolla is rejecting me so far. The minimum requirements were extremely high when I inquired.
- **Old_Zucchini_404** (1↑): Have a look at Stronghold (https://stronghold.co/learn/stronghold-joins-nachas-payments-innovation-alliance) This is really the new plumbing and future of financial system
  - **prolikewhoa** (2↑): Thanks, I will look into this.
- **whatwilly0ubuild** (1↑): The honest answer is Stripe Connect is probably your least painful option at this stage even with the UX mismatch. The alternatives either won't talk to you at your volume or have worse tradeoffs.

Moov is worth a conversation. They're more developer-friendly than legacy ACH processors and their identity verification flow is cleaner than full merchant onboarding. They're also more willing to work with early-stage companies than Dwolla. The catch is you're still dealing with the same underlying regulatory requirements, so "lighter onboarding" has limits when you're moving money between consumers.

GoCardless is primarily designed for recurring payments and payee collection, not two-way P2P. The UX assumes a business is pulling from customers, not peers settling obligations. Probably not a fit unless you contort your flows significantly.

Seamless Chex is more of a verification and risk tool than a payment processor. You'd still need actual rails.

The regulatory reality you need to internalize is that P2P consumer payments in the US trigger money transmission concerns. The reason Dwolla bounced you isn't just volume, it's that their compliance setup for consumer-to-consumer flows is heavier than B2B. Stripe Connect's "merchant" framing exists partly because treating recipients as merchants rather than random consumers simplifies their regulatory position.

Sponsor bank and BaaS relationships at your stage are tough. Unit, Treasury Prime, and similar players generally want to see product-market fit and some volume trajectory before engaging. You're looking at months of integration work even if they said yes today.

Our clients in similar positions usually start with Stripe, accept the imperfect UX, and plan to migrate once volume justifies better options. Ripping out payments later is painful but less painful than spending six months trying to find the perfect early-stage solution that doesn't exist.
  - **prolikewhoa** (1↑): Thanks for this response. When you say "Our clients" are you referring to early stage startups?
- **EllisWyatt1** (1↑): You want RTP or fed now if possible, not ACH, if you have a legal use case or something serious. Bad actors pull back ACH payments all the time up to 120 days after they send them.

Just use stripe or similar until you get to scale. Charge people to settle the money into their bank faster. 

Once you get to scale you can get on a bank program and pay $0.05 for an ACH or less if you run the files yourself.
  - **prolikewhoa** (1↑): Are there services that provide P2P RTP or FedNow to startup businesses? That’s something I will definitely look into.
- **phoenixy1** (1↑): Maybe look at ACHQ and/or checkout.com?
- **know_it_alls** (1↑): You may want to chat with cherry payments. 

https://www.cherrynet.com
