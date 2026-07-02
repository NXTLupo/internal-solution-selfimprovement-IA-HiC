---
id: social-intelligence/reddit-deep/shopify/1q4fnar.md
url: "https://www.reddit.com/r/shopify/comments/1q4fnar/sales_suddenly_stopped/"
kind: "social-post"
source: "reddit-deep: r/shopify"
subreddit: "shopify"
title: "Sales suddenly stopped"
author: "theplugzh"
date: "2026-01-05T07:46:44.000Z"
score: 12
upvote_ratio: 0.93
num_comments: 42
flair: "Shopify General Discussion"
extracted_at: "2026-06-24T22:14:23.468Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/shopify/1q4fnar.md#c0"
    char_span: [0, 1273]
    sentence_count: 9
    key_terms: [noticed, sales, abandoned, comments, suddenly, shopify, stopped, bundle]
    concepts: [noticed, sales, abandoned, comments, suddenly]
    token_count: 293
    sources: [{"n":"reddit-deep: r/shopify","u":"https://www.reddit.com/r/shopify/comments/1q4fnar/sales_suddenly_stopped/"}]
  - id: "social-intelligence/reddit-deep/shopify/1q4fnar.md#c1"
    char_span: [1287, 2708]
    sentence_count: 8
    key_terms: [cart, in-app, users, atc, community, browsers, contact, session]
    concepts: [in-app, users, community, browsers, contact]
    section: Comments
    token_count: 316
  - id: "social-intelligence/reddit-deep/shopify/1q4fnar.md#c2"
    char_span: [2710, 4570]
    sentence_count: 11
    key_terms: [sales, theplugzh, clarity, traffic, navdeep-soni, like, microsoft, replays]
    concepts: [theplugzh, sales, clarity, traffic, navdeep-soni]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/shopify/1q4fnar.md#c3"
    char_span: [4347, 5967]
    sentence_count: 8
    key_terms: [new, bundle, back, everything, changes, clarity, product, change]
    concepts: [bundle, everything, changes, clarity, product]
    section: Comments
    token_count: 385
---
# Sales suddenly stopped

Source: [reddit-deep: r/shopify](https://www.reddit.com/r/shopify/comments/1q4fnar/sales_suddenly_stopped/)
Posted by **theplugzh** · **12↑** · **42 comments**

The sales on my store have suddenly stopped after averaging 3/4 orders per day for the past weeks. I changed the offer from a BOGO deal to a different upsell strategy, that used to work completely fine in the past.

I get my traffic from FB ads, all of which run normal metrics, proper CTR, link clicks, etc… But the adspend doesn’t reach the full daily budget since this happens. 

However I haven’t gotten any sales for new two days, not even abandoned carts. While everything seems to work fine when I’m testing the website I noticed that the add to cart can sometimes be a bit slow or laggy, although it’s probably been like this forever, I never noticed this prior to asking ChatGPT about possible causes.

I use a bundle app and noticed that when turned on, the cart takes slightly longer to open (not more than 0.3/0.4 seconds). I tried on multiple devices and browsers and this difference seems consistent.

In your experience, what could lead to absolutely no conversions all of a sudden? I reckon if the new bundle offer was not appealing I would at least get abandoned carts.

## Comments

- **AutoModerator** (1↑): To keep this community relevant to the Shopify community, store reviews and external blog links will be removed. Users soliciting personal contact, sales, or services in any form will result in a permanent ban.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/shopify) if you have any questions or concerns.*
- **Connect_Army8250** (12↑): When sales drop to zero overnight, it’s almost never just offer fatigue..it’s usually a broken post-click path. Two big red flags: 

1. meta not spending full budget despite normal CTR (means downstream signals went bad), and 
2. no abandoned carts, which suggests users aren’t even reaching a valid cart state. On top of that, in-app browsers (Instagram/Facebook) are notorious for breaking cart + checkout flows....bundle/upsell apps often introduce JS race conditions or delayed ATC events that only fail inside in-app browsers, not in normal testing. Even a 300–400ms delay can cause silent failures where users tap “Add to Cart” and come back after a few minutes of inactivity to find their session to be reset. I’d immediately disable the bundle app for 24 hours, test ATC on IG in-app browser specifically (mobile, slower network), check Meta Event Manager for missing/deduped ATC events, and review cart errors. Do this using Microsoft Clarity Session Recordings. 

If Meta sees traffic but no clean post-click signals, it throttles spend fast....which fits this pattern exactly.
  - **theplugzh** (3↑): Very insightful thanks for your reply. I’ll have a look at all of this 🙏🏼
    - **Connect_Army8250** (2↑): Glad it helped!
  - **threebutterflies** (2↑): Thank you, I love detailed answers so I can also learn. I appreciate you taking the time to share
    - **Connect_Army8250** (2↑): Glad you found it useful!!
- **Responsible_Routine6** (11↑): What do you sell? Its christmas no more
- **__Bodhi__** (3↑): I have a similar issue, although my traffic comes from Google, not FB.  I thought it was a seasonal/economic shift (common for my product) but it’s more extreme than usual.  I typically have 3-4 sales/day, just had a 3 day stretch with no sales and sales are down 40% in the last 2 weeks.  Very few abandoned carts (11) in the last 30 days.
- **[deleted]** (3↑): That sounds like a classic app conflict or a broken checkout flow. If you can't find the bug yourself, a professional eye helps. My business partner had a similar 'silent' sales killer and ended up getting a Shopify audit f**rom cro media.** They found the issue in like 48 hours. It was a bit pricey, but she said it paid for itself pretty quickly once the orders started coming back in
- **navdeep-soni** (2↑): Do you have session replays to check how customer are behaving or interacting on PDP?
  - **theplugzh** (1↑): I don’t but would like to implement such a tool, any good ones?
    - **navdeep-soni** (2↑): microsoft clarity
    - **michaelsmitley** (2↑): Propel Replays is free depending on how much traffic you get. I switched to it from Clarity a while back
    - **happy_chappy_89** (1↑): Microsoft clarity is free and easy to install
- **Civil-Employment5541** (1↑): Does the new offer align with what’s stated in the ad?
  - **theplugzh** (1↑): It does, and that’s also maybe the thing. I had to change my winning creatives to align with the new offers (from xmas to ny sale). I also think that my ads fell into an abyss in terms of of learning phase, added to the non existent conversions I’m
good to launch completely new campaigns
- **ArtemLocal** (1↑): A sudden drop to zero orders usually points to either a friction or a perception problem rather than just luck. Even small changes can trigger this like the new upsell/bundle confusing people, or subtle lag during add-to-cart creating hesitation. 0.3–0.4 seconds is tiny, but if combined with the bundle UI being unclear, it might subconsciously stop people. Other factors to check: ad targeting shifts, changes in audience behavior, or any checkout errors not caught in testing. Sometimes split-testing the old offer vs the new one instantly reveals if the bundle itself is the culprit. Did you try switching back to the previous BOGO setup to see if sales resume?
- **craftmarketmama** (1↑): everything stopped. i’ve been a brick and mortar for 10yrs with an “online shopping group” and added shopify last spring. everything drops off after 12/22
- **Key_Grapefruit_8650** (1↑): Go from your URL and create a complete order including payment. I typically create a product that is 1 penny with free shipping then change the rest product back to not chewable draft mode after.
