---
id: articles/reddit-deep-r-banking/ab08ab15eb.md
url: "https://www.reddit.com/r/Banking/comments/1susjw2/what_information_on_your_phone_should_banking/"
url_hash: "ab08ab15eb"
kind: "article"
source: "Reddit Deep: r/banking"
title: "What information on your phone should banking apps have access to?"
author: ""
date: "2026-04-24T21:18:07.000Z"
tier: 
method: "source-native"
extracted_at: "2026-06-26T21:58:10.785511+00:00"
chars: 3932
engagement: "identify-and-analyze-the-top-five-consumer-finance-trends-fo"
collected_at: "2026-06-26T21:58:07.240Z"
relevance: 50
engagement_goal: "Identify and analyze the top five consumer finance trends for 2026 across retail banking, fintech, and consumer lending, delivering a prioritized trend matrix that details key drivers, shifting consumer behaviors, and technological adoption."
content_hash: "8ee2d9e67de4dcc9"
relevance_by_goal: {"9d052f61cafb":50}
chunks:
  - id: "articles/reddit-deep-r-banking/ab08ab15eb.md#c0"
    char_span: [0, 2287]
    sentence_count: 16
    key_terms: [google, app, apps, access, permission, https, phone, android-developer]
    concepts: [google, permission, access, android-developer, https]
    token_count: 512
    sources: [{"n":"Reddit Deep: r/banking","u":"https://www.reddit.com/r/Banking/comments/1susjw2/what_information_on_your_phone_should_banking/"}]
  - id: "articles/reddit-deep-r-banking/ab08ab15eb.md#c1"
    char_span: [2289, 4135]
    sentence_count: 14
    key_terms: [app, apps, dougolicious, screen, bank, realmccoy13x, doing, legitimate]
    concepts: [dougolicious, screen, realmccoy13x, doing, legitimate]
    token_count: 428
---
# What information on your phone should banking apps have access to?

Source: [Reddit Deep: r/banking](https://www.reddit.com/r/Banking/comments/1susjw2/what_information_on_your_phone_should_banking/)

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

--- TOP COMMENTS ---
[8↑ RealMccoy13x] There is a reason why they do this. It is looking for customers that fall victim to screen sharing / remote access attacks.  Criminals will ask them to download an app or in certain cases, it can be malware. Maybe the setting isn't for you if you feel that you will never fall into this category. What bank may I ask?
[2↑ TinyNiceWolf] A simple search lists a variety of techniques that an Android app can use to determine whether the screen is currently being shared.

None of them involve listing all apps on the device and seeing if it recognizes any names of common screen sharing programs.

If that's the "reason" the bank is doing this, they don't know what they're doing.
[1↑ DifficultNovel1026] I have m&t Bank and I'm looking this up till they're doing that to me too
[-3↑ Dougolicious] shouldn't this be done by security software unrelated to any specific app?  maybe something built-in to android or ios
[1↑ RealMccoy13x] For malware, yes. Screensharing apps are not illegal or banned from the app stores since they also have a legitimate purpose. Your anydesk,  teamviewer, and many other variants over the years (can't keep up) can still be downloaded. 

They do work differently on a mobile app compared to a computer as to your immediate suspicions Apple and Google do have some features that may be blocked. In my experience, even as of this year, some of those apps will still work as long as the phone/device is unlocked and screen is not closed.
[5↑ rickPSnow] What bank are you talking about?  Just don’t give the app permissions to view other apps.  If this is legitimate it’s possible it’s checking for rouge key stoke capturing apps as a security feature.
[-3↑ Dougolicious] it's required
[-2↑ Dougolicious] see my top-level comment explaining this.  You cannot deny this permission.
