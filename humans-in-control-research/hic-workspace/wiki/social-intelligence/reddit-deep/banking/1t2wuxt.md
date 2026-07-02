---
id: social-intelligence/reddit-deep/banking/1t2wuxt.md
url: "https://www.reddit.com/r/Banking/comments/1t2wuxt/what_are_american_banks_responses_to_banking/"
kind: "social-post"
source: "reddit-deep: r/banking"
subreddit: "banking"
title: "What are American bank’s responses to banking fraud via SIM swap attacks?"
author: "Separate_Text_2129"
date: "2026-05-03T20:38:58.000Z"
score: 0
upvote_ratio: 0.27
num_comments: 16
flair: "US"
extracted_at: "2026-06-26T21:51:56.856Z"
extraction_method: "praw-deep"
research_goal: "Identify and analyze the top five consumer finance trends for 2026 across retail banking, fintech, and consumer lending, delivering a prioritized trend matrix that details key drivers, shifting consumer behaviors, and technological adoption."
engagement: "identify-and-analyze-the-top-five-consumer-finance-trends-fo"
chunks:
  - id: "social-intelligence/reddit-deep/banking/1t2wuxt.md#c0"
    char_span: [0, 1343]
    sentence_count: 9
    key_terms: [bank, sim, account, banks, banking, immediately, sms, comments]
    concepts: [account, banks, banking, immediately, comments]
    token_count: 284
    sources: [{"n":"reddit-deep: r/banking","u":"https://www.reddit.com/r/Banking/comments/1t2wuxt/what_are_american_banks_responses_to_banking/"}]
  - id: "social-intelligence/reddit-deep/banking/1t2wuxt.md#c1"
    char_span: [1357, 3664]
    sentence_count: 19
    key_terms: [alternative, completely, device, option, realmccoy13x, offer, information, push]
    concepts: [alternative, completely, realmccoy13x, device, option]
    section: Comments
    token_count: 501
  - id: "social-intelligence/reddit-deep/banking/1t2wuxt.md#c2"
    char_span: [3666, 4885]
    sentence_count: 17
    key_terms: [banks, sms, consumer, often, "it's", customer, hardware, password]
    concepts: [banks, consumer, often, customer, hardware]
    section: Comments
    token_count: 257
  - id: "social-intelligence/reddit-deep/banking/1t2wuxt.md#c3"
    char_span: [4887, 7005]
    sentence_count: 15
    key_terms: [sms, phone, code, did, get, customers, accounts, security]
    concepts: [phone, customers, accounts, security, cheaper]
    section: Comments
    token_count: 511
  - id: "social-intelligence/reddit-deep/banking/1t2wuxt.md#c4"
    char_span: [7007, 7069]
    sentence_count: 1
    key_terms: [required, choice, crap, sms, via]
    section: Comments
    token_count: 16
---
# What are American bank’s responses to banking fraud via SIM swap attacks?

Source: [reddit-deep: r/banking](https://www.reddit.com/r/Banking/comments/1t2wuxt/what_are_american_banks_responses_to_banking/)
Posted by **Separate_Text_2129** · **0↑** · **16 comments**

Other countries have mostly moved away from using SMS as 2FA.
In the US, banks that even have an option to use something other than SMS for bank account security are rare.

So, to them SMS OTP codes are “proof” that you authorized transactions, reset your password etc..

There is a service that can tell banks when a phone number has been swapped to a different SIM and allow the bank to immediately flag the account for additional verification.
Do many banks participate in this? 
Clearly, not all banks do or the issue of SIM swapping happening overnight and a customer having their account drained before they wake up in the morning would not ever be able to happen.


If your number gets SIM swapped via hacking, social engineering or employee fraud at your mobile carrier, do the records showing that the SIM was moved to a new device and then your bank password reset immediately before the wire transfer or other account-emptying activity happened on your account, compel them to expedite reimbursing you for the losses?

Has anyone here have this happen at any bank?

## Comments

- **RealMccoy13x** (8↑): At least in the interfaces and methodologies I am familiar with, the risk indicators of an SIM attack are not completely invisible because the device change but destination phone didn't. What I mean by that is, if using one of the larger risk solutions in market, it would usually register as a new device based off many indicators and possibly push scoring up. 

Depending on how you set your rules it could block, alert along with many other actions. In some instances a sudden departure to a new device paired with high risk changes or events it will invoke such a response.

Retail/consumer is different from commercial. The offerings on commercial for many institution allow for token use, or dual approvers to help prevent attacks. Not saying this doesn't exist in the consumer space. You might just find it limited in comparison at least at the moment. 

Push and passkeys are an option that are slowly becoming an alternative to OTP in market to many institutions. 

I have to be honest, I have not heard of the exact service you are talking about. Trying to figure out if it is available in the states. If you have more information about it, I would love to hear about it.
  - **Separate_Text_2129** (0↑): Isn’t true that zero of the largest US banks offer any complete alternative to SMS though?
Even the ones that offer app push or passkeys as an option still rely on SMS as the fallback and don’t offer any option to disable SMS and completely move to any alternative.
    - **RealMccoy13x** (2↑): I wouldn't have that information. If we are talking about the big 5, I wouldn't doubt it. I was at a conference prior to the pandemic and this was a big topic then. There was a panelist from a top 10 bank. In the context of online banking, he stated they faced challenges in completely getting rid of OTP altogether due conflicts with their older/elderly users command of newer technologies.
- **RailRuler** (5↑): I've seen more banks move toward app based verification for sensitive transactions.
- **ronreadingpa** (3↑): From my layperson's cursory understanding, mobile carriers aren't held liable for 3rd party losses due to unauthorized SIM swaps, service changes, etc. This has come up in court cases. Though the ones I recall reading about involved crypto holdings.

Presuming it goes the other way too. Banks will argue their system worked fine. It's up to the customer having a properly configured and operating phone / device. That's out of their control, which is true.

Many would say 2FA (ie. SMS) is just another level of security. However, that line of reasoning often falls short. In many instances, 2FA effectively becomes 1FA if the same method alone can be used to reset one's password / gain access. Rambling on. In my view, this is more a legal topic than a technical one.

From a practical standpoint, banks will often return funds for consumer accounts. Keyword being *often* not always. Comes down to exact circumstances, how persistence one is, amount involved, and whether it's a consumer account. If it's a business account, losses tend to be higher and various consumer protections don't apply.

Biggest challenge for banks to get away from SMS is consumers forgetting their password or being compromised (ie. reuse elsewhere). Authentication apps, hardware keys, etc may be offered, but problems so common (lost / stolen phones, lost hardware keys, device problems, etc) that banks push SMS. Even when the customer chooses something else, SMS will be the fallback.

Put simply, despite the flaws and potential losses, cheaper for banks to support SMS 2FA for consumer accounts. True alternative 2FA with no SMS at all is more relegated to business accounts.
  - **Separate_Text_2129** (1↑): How did Europe manage this change?
    - **didhe** (1↑): Did they?
- **19HzScream** (2↑): You would be surprised how much you don’t see. There absolutely is detection for sim swaps and other restrictions in place that you would never hear or see unless you’re the one doing the swapping
- **Greedy-Stage-120** (2↑): Bank response is to do nothing from moving on from 2FA SMS and try to get customers to pay for unauthorized transactions. Shifting liability onto customers is cheaper than upgrading their authentication systems.
- **RandomGuy_81** (1↑): I know my capital one uses app based. I think chase did as well, i didnt bother with my citibank
  - **Separate_Text_2129** (1↑): Most or all of these still *require* SMS and will fall back to SMS if the person signing in using your user ID chooses to select SMS as their MFA or password reset option.
It doesn’t improve security much if you cannot disable the weakest link.

I think part of the reason they love mobile phone number based security so much is because it helps validate that the user is in the country.  None of the other methods do that.
    - **RandomGuy_81** (1↑): I mean we need a backup. But i see what you mean.  If the app has issues , we’re fucked

I think the problem is they allow sms spoofing….
- **DistinctOffer9681** (1↑): I agree that banks should NOT require SMS text as a 2FA. Even in cases where there is no hacking involved, phones can break and sometimes folks cannot access the code in order to sign in. I'd rather my email be used for 2FA cause at least I have other devices where I can access my email. 

I remember when I got my new phone when my old one was malfunctioning and the only way I was able to activate it was to log into my google account via 2FA, but google of course kept sending the code to my broken phone!! LOL. Thank God was still able to get my old phone to reboot to get that code. 

2FA via SMS is crap and should only be a choice, not required!
