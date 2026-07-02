---
id: social-intelligence/reddit-deep/cybersecurity/1t9txl9.md
url: "https://www.reddit.com/r/cybersecurity/comments/1t9txl9/malicious_tenants_paid_us_to_abuse_our_rmm_we/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "Malicious tenants paid us to abuse our RMM. We blocked them"
author: "Lunixar"
date: "2026-05-11T05:30:12.000Z"
score: 8
upvote_ratio: 0.65
num_comments: 8
flair: "Business Security Questions & Discussion"
extracted_at: "2026-06-20T17:52:50.787Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1t9txl9.md#c0"
    char_span: [0, 2282]
    sentence_count: 20
    key_terms: [lunixar, legitimate, suspicious, accounts, platform, cybersecurity, clear, small]
    concepts: [lunixar, legitimate, suspicious, accounts, platform]
    token_count: 478
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1t9txl9/malicious_tenants_paid_us_to_abuse_our_rmm_we/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1t9txl9.md#c1"
    char_span: [2284, 3280]
    sentence_count: 9
    key_terms: [abuse-prevention, rmm, legitimate, customers, controls, friction, lunixar, revenue]
    concepts: [abuse-prevention, legitimate, customers, controls, friction]
    token_count: 198
  - id: "social-intelligence/reddit-deep/cybersecurity/1t9txl9.md#c2"
    char_span: [3294, 4686]
    sentence_count: 8
    key_terms: [lunixar, impressive-craft1926, friction, onboarding, attackers, necessary, balance, because]
    concepts: [impressive-craft1926, lunixar, friction, onboarding, attackers]
    section: Comments
    token_count: 327
---
# Malicious tenants paid us to abuse our RMM. We blocked them

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1t9txl9/malicious_tenants_paid_us_to_abuse_our_rmm_we/)
Posted by **Lunixar** · **8↑** · **8 comments**

Over the last few weeks, Lunixar became a target for several abusive signup attempts.

Some of these accounts were not just random free trials. They were willing to pay real money through Stripe to use the platform, but their behavior raised clear red flags around suspicious remote access activity, unauthorized deployment patterns, and payment abuse/card testing.

I’ll be honest: at the beginning, we were a bit naive.

We wanted Lunixar to be as easy as possible for legitimate MSPs and IT teams to try. That meant allowing tenants to start with a very small number of endpoints, even just one endpoint, with almost no friction.

The intention was good: make it simple, transparent, and accessible.

But we learned that in the RMM space, extremely low-friction onboarding can also attract the wrong type of users.

We believe Lunixar became interesting to some of these actors because of a combination of factors: our EV code signing certificate, our low entry point, Stripe-based payments, and the fact that we were making it very easy to start using the platform quickly.

Once we started seeing suspicious behavior, we blocked those accounts.

We also increased our minimum purchase requirements. For customers who need a smaller plan, we now ask them to open a support ticket so we can manually review the request. The goal is not to punish legitimate MSPs or small IT teams. The goal is to prevent bad actors from quickly creating accounts, paying a small amount, and attempting to misuse the platform.

We also saw users trying to mislead us by claiming they wanted to download tools or installers from “trusted sources.” But when we reviewed the domains involved, several of them were associated with reputable security blocklists or showed clear indicators of suspicious activity.

That was a clear line for us.

RMM tools are powerful. They help legitimate MSPs and IT teams manage endpoints, automate work, deploy updates, and support users remotely. But in the wrong hands, those same capabilities can be abused.

For us, trust is more important than short-term revenue. If an account raises serious abuse concerns, we would rather lose the money than allow Lunixar to be used in a way that could harm others or violate the law.

We are continuing to strengthen our abuse-prevention controls, including tenant review, domain checks, MFA, audit logs, high-risk command blocking, suspicious behavior detection, payment abuse monitoring, and clearer acceptable-use policies.

There is always a balance. Too much friction hurts legitimate customers. Too little friction attracts the wrong users.

We are still learning, but one thing is clear: we do not want revenue from people trying to misuse an RMM platform.

I would rather build Lunixar slowly with real MSPs and IT teams than make it easy for bad actors to operate.

For other MSPs, RMM vendors, and security teams here: what abuse-prevention controls do you think are essential for RMM platforms without making the product painful for legitimate customers?

## Comments

- **RegionRat219** (2↑): May want to make sure you don’t end up on this list: https://lolrmm.io
  - **Lunixar** (1↑): Yes, I’m aware of LOLRMM. My understanding is that it tracks many legitimate RMM tools because any remote management platform can be abused in the wrong hands.

I’m planning to submit the necessary updates for Lunixar there as well, so the information is accurate and transparent.
- **Impressive-Craft1926** (4↑): Honestly a smart move… low-friction onboarding sounds great until attackers realize they can weaponize it cheaply. The fact you chose trust and long-term reputation over quick revenue says a lot about your direction.
  - **Lunixar** (4↑): Thanks, that’s exactly how I see it. I understand now why some friction is necessary in the RMM space.

It’s still a bit sad, because one of my goals was to make Lunixar accessible to small MSPs without minimum endpoint requirements. Now I have to balance that with keeping bad actors out.
    - **Impressive-Craft1926** (2↑): Yeah, that balance is tough... low friction helps genuine small MSPs, but attackers also love low friction. Careful onboarding and gradual trust systems usually end up being the middle ground.
- **Lucky-Warthog2369** (1↑): this is a classic example of why point-in-time pentesting fails. the environment changed after the audit. continuous offensive validation would have caught the regression.
