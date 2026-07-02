---
id: social-intelligence/reddit-deep/salesforce/1mwud1a.md
url: "https://www.reddit.com/r/salesforce/comments/1mwud1a/need_advice_setting_up_sso_for_salesforce/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Need Advice: Setting Up SSO for Salesforce Experience Cloud with Multiple External Companies"
author: "LiveGrowRepeat"
date: "2025-08-22T02:17:00.000Z"
score: 8
upvote_ratio: 0.91
num_comments: 10
flair: "help please"
extracted_at: "2026-06-11T18:58:38.963Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1mwud1a.md#c0"
    char_span: [0, 1642]
    sentence_count: 6
    key_terms: [experience, salesforce, company, multiple, cloud, users, companies, automatically]
    concepts: [experience, salesforce, company, multiple, cloud]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1mwud1a.md#c1", "social-intelligence/reddit-deep/salesforce/1mwud1a.md#c2"]
    token_count: 361
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1mwud1a/need_advice_setting_up_sso_for_salesforce/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1mwud1a.md#c1"
    char_span: [1656, 3655]
    sentence_count: 13
    key_terms: [salesforce, company, experience, companies, provider, maybe, seems, articleview]
    concepts: [salesforce, company, experience, companies, provider]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1mwud1a.md#c0", "social-intelligence/reddit-deep/salesforce/1mwud1a.md#c2"]
    section: Comments
    token_count: 473
  - id: "social-intelligence/reddit-deep/salesforce/1mwud1a.md#c2"
    char_span: [3657, 5059]
    sentence_count: 16
    key_terms: [salesforce, cognito, customer, solution, company, sharing, custom, like]
    concepts: [salesforce, cognito, customer, solution, company]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1mwud1a.md#c0", "social-intelligence/reddit-deep/salesforce/1mwud1a.md#c1"]
    section: Comments
    token_count: 324
---
# Need Advice: Setting Up SSO for Salesforce Experience Cloud with Multiple External Companies

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1mwud1a/need_advice_setting_up_sso_for_salesforce/)
Posted by **LiveGrowRepeat** · **8↑** · **10 comments**

Hey everyone,

I’m working on a 2 Experience Cloud sites that serves as a knowledge base and support portal for multiple partner companies. Right now, users have two separate logins:

* One for our Experience Cloud sites
* One for their own company’s Salesforce org and apps

What I want to achieve:

* Allow users to log in to our Experience Cloud site using their home company credentials.
* Ideally, if they’re already logged into their company’s Salesforce org, they should be automatically authenticated when they visit our site (true SSO experience).

The challenge:

* We work with multiple companies, each with its own Salesforce org.
* I cannot reach out to each company’s IT team to coordinate setup.

From my research, this seems to involve:

* Configuring our Experience Cloud site as a Service Provider.
* Supporting multiple SAML or OpenID Connect IdPs (one per company).
* Using a Login Discovery Page to route users based on email domain or let them pick their company.
* Possibly enabling Just-in-Time provisioning so users are created automatically.

Has anyone implemented something like this?

* How did you handle multiple IdPs without direct coordination?
* Any best practices for scaling this?
* Would using a central IdP (like Okta or Azure AD) make sense here?

Any advice, gotchas, or info in general would be greatly appreciated.

## Comments

- **kammycoder** (2↑): I gave a good 20 mins thought. Seems impossible bud. 
Even if you setup Salesforce’s as the oauth provider, you’ll have to have all other companies to adapt to it. 

Maybe.  Maybe if you have every company setup their salesforce  as a oauth provider you could. And store the uses if from that salesforce into your experience cloud users fed id. 
Not sure how it would work
- **BoldInterrobang** (2↑): This seems like a massive security risk - what keeps someone from setting up an org and making the username or Federation ID the email address of one of your partner companies? The whole point of SSO is to trust the identity provider, but you don’t have that in your ideal solution.
- **asdx3** (2↑): Maybe I am misunderstanding but isn't this detailing what you are talking about - [https://help.salesforce.com/s/articleView?id=experience.sso\_between\_multiple\_orgs.htm&type=5](https://help.salesforce.com/s/articleView?id=experience.sso_between_multiple_orgs.htm&type=5)
  - **LiveGrowRepeat** (1↑): This seems very similar to what I’m trying to produce but from the documentation it says if “your company deploys more than one Salesforce org”.

Which we are trying to to do but using SSO from our multiple clients Orgs to automatically be able to authenticate to our experience cloud portal.
    - **asdx3** (1↑): I don't think that matters but you could always confirm with SFDC support.  I could of swore we did this at a previous company when we were required or I am not remembering why I had this bookmarked.  
  
The main company org became our IDP and us acquired companies SP.  We were still being billed under the old company since it had to remain a legal entity for some time due to global business reasons.  So on paper - we were different companies to Salesforce.
- **BeingHuman30** (1↑): Following
- **ConsciousBandicoot53** (1↑): This sounds wild - would love to hear how you implement
- **TheSauce___** (1↑): > Has anyone implemented something like this?

Yeah, kind of. It was at a company that hosted a SaaS product out of an experience cloud site & Salesforce. This ofc was a massive violation of Salesforce’s TOS. Anyway - I just worked there man.

What we wound up doing was cloning the experience cloud site multiple times. It’s either that, or for each customer you have a button like “sign in for this customer”, “sign in for that customer”, etc. etc. - we weren’t doing that.

Solved my immediate problem, but again, terrible idea. Terrible that I was forced to do it.

Other option might be SSO via cognito or something? Get AWS, map the company’s Salesforce username (which is globally unique) to a cognito user, set up SSO from their company orgs-> cognito then cognito -> Salesforce? Then you’d only have one SSO button. Would require multi-cloud knowledge though. 

I’ll further emphasize though - it’s probably just not a good idea, I’d run any proposals by your security team.

Custom JIT handler was needed bc for some reason the standard one kept failing. Their org was kind of cursed, and I only had like a day or 2 to figure out a solution, so I went with custom Apex.

Use sharing sets & contact-account relationships for sharing, absolutely do not hand-roll a custom sharing solution.
- **rezgalis** (1↑): I would encourage looking at a dedicated solution like Okta or auth0 to manage this.
  - **LiveGrowRepeat** (1↑): Will do, thanks.
