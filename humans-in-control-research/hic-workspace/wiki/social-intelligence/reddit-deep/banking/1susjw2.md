---
id: social-intelligence/reddit-deep/banking/1susjw2.md
url: "https://www.reddit.com/r/Banking/comments/1susjw2/what_information_on_your_phone_should_banking/"
kind: "social-post"
source: "reddit-deep: r/banking"
subreddit: "banking"
title: "What information on your phone should banking apps have access to?"
author: "Dougolicious"
date: "2026-04-24T21:18:07.000Z"
score: 3
upvote_ratio: 0.64
num_comments: 27
flair: "Advice"
extracted_at: "2026-06-26T21:51:56.847Z"
extraction_method: "praw-deep"
research_goal: "Identify and analyze the top five consumer finance trends for 2026 across retail banking, fintech, and consumer lending, delivering a prioritized trend matrix that details key drivers, shifting consumer behaviors, and technological adoption."
engagement: "identify-and-analyze-the-top-five-consumer-finance-trends-fo"
chunks:
  - id: "social-intelligence/reddit-deep/banking/1susjw2.md#c0"
    char_span: [0, 2286]
    sentence_count: 16
    key_terms: [google, app, apps, access, permission, phone, android-developer, "it's"]
    concepts: [google, permission, access, android-developer, phone]
    related_chunks: ["social-intelligence/reddit-deep/banking/1susjw2.md#c2"]
    token_count: 512
    sources: [{"n":"reddit-deep: r/banking","u":"https://www.reddit.com/r/Banking/comments/1susjw2/what_information_on_your_phone_should_banking/"}]
  - id: "social-intelligence/reddit-deep/banking/1susjw2.md#c1"
    char_span: [2291, 3584]
    sentence_count: 9
    key_terms: [app, screen, realmccoy13x, doing, bank, android, looking, malware]
    concepts: [realmccoy13x, screen, doing, android, looking]
    section: Comments
    token_count: 316
  - id: "social-intelligence/reddit-deep/banking/1susjw2.md#c2"
    char_span: [3586, 5032]
    sentence_count: 9
    key_terms: [google, dougolicious, permission, android-developer, app, apps, permissions, googleplay]
    concepts: [google, dougolicious, permission, android-developer, permissions]
    related_chunks: ["social-intelligence/reddit-deep/banking/1susjw2.md#c0", "social-intelligence/reddit-deep/banking/1susjw2.md#c4"]
    section: Comments
    token_count: 325
  - id: "social-intelligence/reddit-deep/banking/1susjw2.md#c3"
    char_span: [5034, 6272]
    sentence_count: 12
    key_terms: [app, privacy, another, website, option, reason, banks, doing]
    concepts: [privacy, another, website, option, reason]
    section: Comments
    token_count: 297
  - id: "social-intelligence/reddit-deep/banking/1susjw2.md#c4"
    char_span: [6274, 8371]
    sentence_count: 21
    key_terms: [different, something, app, privacy, google, dougolicious, phone, bank]
    concepts: [different, something, privacy, dougolicious, google]
    related_chunks: ["social-intelligence/reddit-deep/banking/1susjw2.md#c2"]
    section: Comments
    token_count: 477
  - id: "social-intelligence/reddit-deep/banking/1susjw2.md#c5"
    char_span: [8373, 9670]
    sentence_count: 7
    key_terms: [google, app, argument, purpose, apps, "it's", banking, "doesn't"]
    concepts: [google, argument, purpose, banking, "doesn't"]
    section: Comments
    token_count: 278
---
# What information on your phone should banking apps have access to?

Source: [reddit-deep: r/banking](https://www.reddit.com/r/Banking/comments/1susjw2/what_information_on_your_phone_should_banking/)
Posted by **Dougolicious** · **3↑** · **27 comments**

My Bank introduced a new version of its app, which now wants permission to get a list of all apps on my phone.  They say it's to verify who I am, and prevent fraud.

I checked my other financial apps and they do not do this - they have the permissions you'd expect.   Another bank's app has access to camera (scanning checks for deposit) and phone (identity? calling customer support?) and that's it.

I get that you could get a fingerprint based on apps, but it's not a very conclusive one and it's a HUGE violation of privacy.  There's all kinds of apps that reveal things about my life that I don't think I have to share with my bank.

I came across something similar recently picking new auto insurance, where one requires me to have their app installed, which wants a bunch of stuff that I don't think has anything to do with how good a driver I am, but might be used to make some assumptions about me (risk? character? life patterns?)

Also, note that the old app attempted to link me to a website similar to but NOT my bank's domain.   I called customer service and they didn't see it as a red flag.   So I'm a bit cautious about their security practices now.

**Update:** Google explains this permission and how they regulate access to sensitive app info:  
[https://support.google.com/googleplay/android-developer/answer/10158779](https://support.google.com/googleplay/android-developer/answer/10158779)

This (and linked docs) seems to be saying that google can grant any app developer usage of QUERY\_ALL\_PACKAGES, provided it's a legitimate use and it is "prominently declared" to the user. So it appears that you cannot deny this specific access to your information if it has been officially granted by Google.  

That explains why I was never asked for it during application setup. I had to grant specific permissions for PHONE and LOCATION, but not anything relating to apps. They already had permission.

Thanks, Google. If anyone would be the arbiter of my privacy, I'd absolutely want it to be you - and not me.

  
[](https://www.reddit.com/commentstats/t1_oi3v08i)

## Comments

- **RealMccoy13x** (8↑): There is a reason why they do this. It is looking for customers that fall victim to screen sharing / remote access attacks.  Criminals will ask them to download an app or in certain cases, it can be malware. Maybe the setting isn't for you if you feel that you will never fall into this category. What bank may I ask?
  - **TinyNiceWolf** (2↑): A simple search lists a variety of techniques that an Android app can use to determine whether the screen is currently being shared.

None of them involve listing all apps on the device and seeing if it recognizes any names of common screen sharing programs.

If that's the "reason" the bank is doing this, they don't know what they're doing.
  - **DifficultNovel1026** (1↑): I have m&t Bank and I'm looking this up till they're doing that to me too
  - **Dougolicious** (-3↑): shouldn't this be done by security software unrelated to any specific app?  maybe something built-in to android or ios
    - **RealMccoy13x** (1↑): For malware, yes. Screensharing apps are not illegal or banned from the app stores since they also have a legitimate purpose. Your anydesk,  teamviewer, and many other variants over the years (can't keep up) can still be downloaded. 

They do work differently on a mobile app compared to a computer as to your immediate suspicions Apple and Google do have some features that may be blocked. In my experience, even as of this year, some of those apps will still work as long as the phone/device is unlocked and screen is not closed.
- **rickPSnow** (5↑): What bank are you talking about?  Just don’t give the app permissions to view other apps.  If this is legitimate it’s possible it’s checking for rouge key stoke capturing apps as a security feature.
  - **Dougolicious** (-3↑): it's required
  - **Dougolicious** (-2↑): see my top-level comment explaining this.  You cannot deny this permission.
- **Dougolicious** (5↑): **Update:**  Google explains this permission and how they regulate access to sensitive app info:  
[https://support.google.com/googleplay/android-developer/answer/10158779](https://support.google.com/googleplay/android-developer/answer/10158779)

This (and linked docs) seems to be saying that google can grant any app developer usage of QUERY\_ALL\_PACKAGES, provided it's a legitimate use and it is "prominently declared" to the user.   So it appears that you cannot deny this specific access to your informationn if it has been officially granted by Google.

That explains why I was never asked for it during application setup.   I had to grant specific permissions for PHONE and LOCATION, but not anything relating to apps.  They already had permission.

Thanks, Google.  If anyone would be the arbiter of my privacy, I'd absolutely want it to be you - and not me.
  - **frowniecloud** (2↑): If you know so much and care about privacy why aren't you using Graphene OS already?
- **Majestic_League_6061** (2↑): my bank app just tells me about harmful apps, like I have wechat installed in my phone and the app is banned in my country so it just shows an alert
- **Mmoneymark** (2↑): Our financial is exploring this option and the reason is for fraud prevention.
  - **Dougolicious** (1↑): no doubt that is one reason, but there are many things of interest to an institution with a blank-check privacy policy.
- **ronreadingpa** (1↑): Try denying the permission. App may still work. If overly concerned, don't use the app. Use their website instead on your phone. When doing so, may be helpful to click Desktop Site in browser settings. Most regular banks allow website access. Fintechs and online only banks are another story.

Another option, though less practical, is having two or more phones. That gets expensive and difficult to manage. About the only people I regularly see doing that are delivery drivers running orders for multiple services (ie. Ubereats and Doordash) at the same time.

That said, banks and other places already have so much information on users. There's far less privacy than people think even when being careful. Good to try, but it can be overwhelming so one needs to pick their battles. As for customer service, they have no idea what tracking is going on. Nor able to do anything about it.
  - **Dougolicious** (2↑): it's absolutely required.   even if i revoke it later, it has likely already gathered info
  - **Dougolicious** (2↑): The phone didn't ask me at all.  It seems it was granted by google.
    - **ronreadingpa** (2↑): Not surprised. Saw your other post. Google and the like are fickle when it comes to privacy and security. There was a setting to not open / preview PDFs in the browser and then one day it just started doing it anyways. May be off on the details, but point is a security setting that was not supposed to do something was later ignored with no warning. See that with privacy settings frequently on many sites.

Phones are convenient, but also tracking devices that hide much of the internals from the user in mystery blobs. Low level OS on the board / CPU, baseband processor, etc. Suppose one with much effort can cobble together something relatively secure, but that's not going be a consumer mobile phone (including so called dumb ones, such as flipphones) of any kind.

The workaround is using the bank's website. Desktop view on phone and/or a different device, such as desktop or tablet. Or as some suggest, a different bank, but many are moving in the same direction. Some strongly pushing their app for certain functionality.
    - **TheWandererWise** (1↑): Then it's a red flag and you need to get a different bank. There's something pretty fishy here
- **TinyNiceWolf** (1↑): Given that link to Google's docs, it appears the bank is flagrantly violating Google's rules. 

Google says an app may only use that permission if its "core purpose" is "to search for all apps on the device". The ability to query packages must be so essential to the function of the app that without it, "the app is 'broken' or becomes unusable".

Since a banking app can work just fine without the ability to search for other apps, and the core purpose of a banking app is not to search for other apps, the bank is violating Play policy, and its app should be removed from the store until it has been fixed. Report the app to Google for this violation.

(It's possible Google doesn't actually mean what their documentation says, of course, but reporting the app is worth trying.)
  - **Dougolicious** (1↑): An argument can be made (using the application process Google makes available) that it is essential.  And Google has to approve the use of this privilege, so I would assume Google approved it.
    - **TinyNiceWolf** (2↑): Google's process is semi-automated. Perhaps they missed this one?

Sure, they could make that argument, but it's a poor argument, because scanning a list of installed apps is ineffective at achieving the legitimate purpose of ensuring no screen-sharing is in effect, and there are methods to achieve the same purpose which actually work.

What they're doing is like insisting they need access to a user's contacts to compare it to a list of fraudsters to combat fraud. It's intrusive and doesn't actually address the issue effectively.
- **1130coco** (-1↑): Nothing in our phones have anything to do with our banks.
