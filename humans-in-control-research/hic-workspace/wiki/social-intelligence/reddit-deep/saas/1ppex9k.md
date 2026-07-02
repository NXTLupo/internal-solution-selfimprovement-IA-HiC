---
id: social-intelligence/reddit-deep/saas/1ppex9k.md
url: "https://www.reddit.com/r/SaaS/comments/1ppex9k/said_no_to_a_48kyear_enterprise_deal_best/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "Said no to a $48K/year enterprise deal. Best decision of the quarter."
author: "Big_Currency_1805"
date: "2025-12-18T02:03:44.000Z"
score: 128
upvote_ratio: 0.94
num_comments: 42
flair: ""
extracted_at: "2026-06-14T15:28:21.914Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1ppex9k.md#c0"
    char_span: [0, 1710]
    sentence_count: 23
    key_terms: [customer, custom, enterprise, product, months, requirements, deal, year]
    concepts: [customer, enterprise, custom, product, requirements]
    related_chunks: ["social-intelligence/reddit-deep/saas/1ppex9k.md#c1"]
    token_count: 409
    sources: [{"n":"reddit-deep: r/saas","u":"https://www.reddit.com/r/SaaS/comments/1ppex9k/said_no_to_a_48kyear_enterprise_deal_best/"}]
  - id: "social-intelligence/reddit-deep/saas/1ppex9k.md#c1"
    char_span: [1724, 3925]
    sentence_count: 14
    key_terms: [customer, anyways, support, "don't", able, enterprise, honestly, standing]
    concepts: [customer, anyways, support, "don't", enterprise]
    related_chunks: ["social-intelligence/reddit-deep/saas/1ppex9k.md#c0"]
    section: Comments
    token_count: 506
  - id: "social-intelligence/reddit-deep/saas/1ppex9k.md#c2"
    char_span: [3927, 4985]
    sentence_count: 6
    key_terms: [security, always, price, work, nippyeagerness7, questionnaires, consulting, discipline]
    concepts: [security, always, price]
    section: Comments
    token_count: 238
  - id: "social-intelligence/reddit-deep/saas/1ppex9k.md#c3"
    char_span: [4987, 7090]
    sentence_count: 10
    key_terms: [enterprise, post, especially, backwards, clients, instead, product, willing]
    concepts: [enterprise, especially, backwards, clients, instead]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/saas/1ppex9k.md#c4"
    char_span: [6832, 7430]
    sentence_count: 5
    key_terms: [did, like, emeraldcrusher, requirements, potentially, convincing, enterprise, eventually]
    section: Comments
    token_count: 149
  - id: "social-intelligence/reddit-deep/saas/1ppex9k.md#c5"
    char_span: [7432, 8156]
    sentence_count: 4
    key_terms: [service, saying, level, electronic-cat185, like, new, sla, agreement]
    concepts: [service, saying, level]
    section: Comments
    token_count: 177
---
# Said no to a $48K/year enterprise deal. Best decision of the quarter.

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1ppex9k/said_no_to_a_48kyear_enterprise_deal_best/)
Posted by **Big_Currency_1805** · **128↑** · **42 comments**

Got approached by a big company. Wanted my product. Had budget.
$48K/year contract. Would've been my biggest customer by 4x.
I said no. Here's why.
Their requirements:
Custom SSO integration (we don't have it)
On-premise deployment option (we're cloud only)
Dedicated support with 2-hour SLA (I'm a team of 2)
Custom reporting features (would take 3 months to build)
Vendor security questionnaire (47 pages)
Compliance certifications we don't have
What taking this deal would've meant:
3-4 months building their custom requirements
Neglecting all other customers during that time
Ongoing support burden for features only they use
Dependency on one customer for 31% of revenue
Setting precedent that we do custom work for enterprise
The conversation I had with myself:
$48K is a lot of money.
But $48K isn't worth becoming a services company.
The decision:
Politely declined. Explained we weren't the right fit for their needs right now.
Offered to revisit in a year if we had those capabilities.
They were disappointed but understood.
What happened instead:
Spent those 4 months on product improvements for my core customer base.
Added 23 new customers during that time (~$31K additional ARR).
No single customer over 10% of revenue. Less risk.
Product roadmap stayed focused on serving many, not one.
Enterprise deals are seductive. Not all of them are good.
Sometimes the best deals are the ones you walk away from.
Have you ever said no to a big deal?

## Comments

- **brodhibro** (38↑): What they were asking for definitely nowhere near worth 50k per year.
  - **SalaciousVandal** (6↑): Right?! I charge that much for rudimentary design on demand. Minimum.
- **Hobofan94** (32↑): Honestly, the only thing on there that sounds unrealistic is the "custom reporting feature".

Apart from that, those are just table stakes if you want to do enterprise deals in general. Ours looks just the same and we are also a team of 2.

If you bring yourself into a position to cater to that, that 4x your biggest customer can become your typical customer that makes up no more than 10% of your revenue as a single customer.

> Custom SSO integration (we don't have it)

Do you custom-build SSO integrations? We abstract it away with oauth2-proxy and are able to support any OIDC compliant IDP provider (we never encountered one at an enterprise that doesn't fit that). We did at one point extend that with SCIM support, but it's a rare ask.

> On-premise deployment option (we're cloud only)

If you are able to package your application as a Helm chart, that usually takes care of that requirement.

> Dedicated support with 2-hour SLA

In the typical SLAs we offer we have a 3 incident tiers. If they have to hit a specific checkbox for procurement guidelines that you don't think you'll be able to service, one common option is to just construct the tiers and rebates tied to them in a way that this would only entitle them to a less than 10% rebate (with also the burden of proof being on them, which makes them unlikely to ever be enforced).

Honestly, SLAs for contracts that are not between two enterprises and below $Xmil/year a kind of bogus anyways. If you are in good standing with the customer they never enforce them anyways. If you are in bad standing they will likely churn anyways.

> Vendor security questionnaire (47 pages)
> Compliance certifications we don't have

If it's the common certificates, those are a bit of an investment, but one that's quickly recouped. They are surpsingly easy to get and also less work than you would expect. I think someone once said "turning on MFA for all internal tools gets you 50% of the way there" and I couldn't agree more.

Security questionnaires can be a bit of a slog, and depending on the form they should be delivered hard to automate. They are usually a one-off part of the sales process though and not a continous burden.
- **NippyEagerness7** (11↑): Dude this is exactly what separates successful founders from those who get stuck in consulting hell

  
Walking away from that much money takes serious discipline but you nailed it - becoming dependent on one enterprise customer is basically selling your soul
  - **xasdfxx** (10↑): I disagree.  They're stable in a way that smaller companies are not, and often will happily sign 3 year or longer deals.  Including with 3-5% annual price increases, because that cuts both ways.  Are they a pain to work with, sometimes, but if you deliver you'll likely be a pretty sure thing for a decade.

Separately, SSO is always a good idea and not that much work; who knows how final that $48k was or if it was an opening price; security certs are almost always optional (I've never had one kill a deal) and just shortcut a discussion.

tl;dr: skeptical this was a final price; if OP got an RFP, they were likely willing to pay far more.  If they wanted on prem, they were probably willing to pay 10x or could be talked out of it.  And honestly, it sounds kind of like nonsense: half the point of on-prem is skipping the security certs because eg running the entirety of the code behind a firewall makes them less relevant.
  - **sreekanth850** (1↑): Every enterprise sales is the same.
  - **chaos_battery** (-2↑): I agree. I wish more companies would stop bending over backwards to satisfy these bullshit enterprise checklists. If everyone starts saying no then they have to start caving to just sliding their damn credit card and using the product that's in front of them instead of trying to make every vendor and tool they come into contact with their own fucked up version of something that was much better before they came along.
- **yeetsqua69** (3↑): Did you attempt to negotiate their requirements at all?
  - **Armitage1** (11↑): Why bother with a counter-offer when you can just say "No thank you" and feel so proud of yourself and post on reddit. /s
- **GlitteringPicture412** (2↑): Nice story, thanks for sharing. Definitely food for thought. Entrepreneurs usually think they have to bend over backwards for clients and big clients especially, but the best business decisions can come from saying no
- **[deleted]** (1↑): This didn't happen.
  - **XiberKernel** (2↑): Depending on the itch they were scratching, and how stingy the healthcare/finance client was, I can totally see this happening.  Especially if OP was in "talks" with them leading them on instead of a flat no.
    - **CivMajorCo** (2↑): It's a shill/bot post who will soon promote t******.ai, they post reworded AI slop in this subreddit constantly now
- **pizza_the_mutt** (1↑): Right choice, I think. What they were asking for isn't worth $48k. That would slow down everything else you do by 2x.
- **EmeraldCrusher** (1↑): How did you even go about potentially convincing an enterprise to contract with you and what is your product?
- **Happy_Management_671** (1↑): I was put in a similar position once. $50K, and requirements for bunch of features like custom sso, dedicated servers (private cloud) and even bring your own s3 bucket. I said YES. I knew these would get us off track for a while, but eventually we decided that we will be able to repeat this deal (and we did, like 20 more times). 

Would have they asked me for any SLA, I would run away and jump off the building. 

Good decision :)
  - **mare35** (1↑): I am new to this, what's an SLA?
    - **Happy_Management_671** (1↑): Service Level Agreement. What is the expected service level. In his case, a response within 2 hours of a new support ticket (probably at any time of day, weekend too).
- **Electronic-Cat185** (1↑): That’s a hard call to make, but it sounds like the right one. deals like that quietly turn a product into a custom services shop before you realize what happened. the revenue looks great until you factor in focus, risk, and long term drag on the roadmap. saying no early usually hurts less than saying yes and paying for it for years.
