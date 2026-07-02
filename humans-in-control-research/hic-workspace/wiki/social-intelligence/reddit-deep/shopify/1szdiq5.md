---
id: social-intelligence/reddit-deep/shopify/1szdiq5.md
url: "https://www.reddit.com/r/shopify/comments/1szdiq5/apps_vs_claude_coding/"
kind: "social-post"
source: "reddit-deep: r/shopify"
subreddit: "shopify"
title: "Apps vs claude coding"
author: "Makemoremusicbro"
date: "2026-04-29T22:17:40.000Z"
score: 8
upvote_ratio: 0.79
num_comments: 40
flair: "Apps"
extracted_at: "2026-06-24T22:14:23.467Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/shopify/1szdiq5.md#c0"
    char_span: [0, 1426]
    sentence_count: 9
    key_terms: [apps, shop, comments, modules, shopify, coding, using, code]
    concepts: [comments, modules, shopify, coding, using]
    token_count: 327
    sources: [{"n":"reddit-deep: r/shopify","u":"https://www.reddit.com/r/shopify/comments/1szdiq5/apps_vs_claude_coding/"}]
  - id: "social-intelligence/reddit-deep/shopify/1szdiq5.md#c1"
    char_span: [1440, 3398]
    sentence_count: 16
    key_terms: [code, theme, claude, "don't", apps, "it's", mess, something]
    concepts: [theme, claude, "don't", something, breaking]
    related_chunks: ["social-intelligence/reddit-deep/shopify/1szdiq5.md#c2"]
    section: Comments
    token_count: 477
  - id: "social-intelligence/reddit-deep/shopify/1szdiq5.md#c2"
    char_span: [3400, 5367]
    sentence_count: 14
    key_terms: [apps, like, aggressive-bat8821, something, app, did, section, claude]
    concepts: [aggressive-bat8821, something, section, claude, replaced]
    related_chunks: ["social-intelligence/reddit-deep/shopify/1szdiq5.md#c1"]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/shopify/1szdiq5.md#c3"
    char_span: [5369, 6832]
    sentence_count: 14
    key_terms: [stock, location, availability, dawn, something, because, website, whether]
    concepts: [stock, location, availability, something, because]
    section: Comments
    token_count: 324
  - id: "social-intelligence/reddit-deep/shopify/1szdiq5.md#c4"
    char_span: [6836, 9056]
    sentence_count: 17
    key_terms: [get, shopify, critical, doing, bugs, "it's", need, use]
    concepts: [shopify, critical, accounting, doing, something]
    section: Comments
    token_count: 503
  - id: "social-intelligence/reddit-deep/shopify/1szdiq5.md#c5"
    char_span: [9058, 9431]
    sentence_count: 3
    key_terms: [apps, dizzy-entrepreneur52, front, affiliates, backorders, especially, everything, regularly]
    concepts: [front]
    section: Comments
    token_count: 81
---
# Apps vs claude coding

Source: [reddit-deep: r/shopify](https://www.reddit.com/r/shopify/comments/1szdiq5/apps_vs_claude_coding/)
Posted by **Makemoremusicbro** · **8↑** · **40 comments**

I was wondering what the opinions are on (small) shop owners vibe coding their own modules with ai instead of using and paying for apps.

I’ve recently started my own shop and I don’t really have a background in developing. Shopify is great for the basics but you want to have some modules added to your shop and that’s the point where before you know you have 50 apps running all for a different add-on. 

I found that claude (yes, the free version) is quite successful at coding modules for my shop. Some recent examples I have made using AI are; a shipping progress bar that shows visually how much more you have to add to get free shipping, an upselling module on the bottom of the cart that upsells one specific product (biggest margin), a popup size chart that easily shows the customer what size to take without leaving the product page, and so on.

Now I still see a lot of people using apps, am I missing something that could possibly harm me (more than an app could do). I am aware that this code probably has mistakes or isn’t as efficient as it could be. That’s why I make duplicates of my code before adding a new module, and having comments in the code to tell me what I added with AI.

Would love to hear y’all opinions.

## Comments

- **sshaw_** (12↑): If you can't write the code on your own and don't plan to learn I would not recommend this. You're going to create a mess! 

I use Claude daily for a variety of programming languages and I would 100% not trust its output without review. And I'm not even considering the all-important topic of "maintainable code". If you plan on being in business for the long-term it's not about a single "win", it's about how easy this code is to maintain.

On the bright side, the code _may_ be better than a lot of the outsourced trash!
  - **Eightloop** (3↑): I agree with this. A client used Claude (or at least I think so) to modify a few things. It works, but the code is unreadable and way more complicated than it needs to be. There were a few other smaller issues. The thing is, if I ever need to work on it or update the theme, whatever money they saved using AI, will be be gone.

I’ve also seen marketing agencies trying to “fix” issues and modifying JavaScript files only to make it worse or breaking something else in the process.
  - **Makemoremusicbro** (2↑): I understand, I’m not in a position to review every code I make and paying for apps that slow my shop aswell doesn’t attract me either. Only thing I’m afraid of is something breaking in the future (after for example a shopify theme update) where I will not be able to pinpoint the problem. That said, I’m using the dawn theme, which I’ll probably outgrow as my shop grows and I’ll need to switch to a different theme anyway
- **blocking-io** (13↑): Be careful, if you don't know what you're doing you may be bloating your storefront with slow performing and/or buggy js. I think it's fine if you keep your scope narrow, thoroughly test... But you don't want to end up with a bloated mess either.


That being said, adding a bunch of apps that do simple things is also a bloated mess
  - **Hi_Keyboard_Warriors** (6↑): I deleted 80% of the apps and went all coding with Claude. 

It works
    - **blocking-io** (1↑): Yeah, like I said... Many apps are just bloatware as well because a merchant needs to add a slider or progress bar like OP mentioned, an app just to do this is overkill. I think Claude is fine for this 


Having a dev review it would be ideal, but I know it's not cheap
    - **sshaw_** (1↑): What functionality did you replace?
- **Aggressive-Bat8821** (5↑): 50/ 50 but I use section store on Shopify apps to just buy preceded sections that aren’t subscriptions
  - **Makemoremusicbro** (1↑): For some things like hero banners I did buy sections from section store, it’s just the other things that require different apps for things such as upselling, cross selling, aov boost,… that I’m using Claude now.
    - **Aggressive-Bat8821** (1↑): Oh I see - did you just give specs and claude created it? I’m running in to errors if a section or something like cross-selling and I start getting load time warnings on mobile that my page is now slow
    - **baldie** (1↑): Sounds like you need a backend for that. Where are you hosting it?
- **tobebuilds** (7↑): If an app could be completely replaced by AI for your needs, then you don't need it. But be mindful... Are you trying to build a brand, or are you trying to become a developer?
- **dellottobros** (2↑): We used shopifys own AI tool to write code that replaced a few apps we were using. Also used it to write some code that helped solve other issues that we didn’t have apps for. There are definitely limits and it does take some knowledge. 

When you do it you really need to map out what you want it to do and how it might be done. Otherwise it can start making something that doesn’t end up working properly. It also doesn’t always know its own limitations so it tells you it can do something but then does not actually have that capability. Recently had to download the Mechanic app so we could do certain things. That did replace a bunch of small apps with a larger app. 

If you are just starting your shop you should really be focusing on that and not coding a bunch of stuff.  It’s not necessary early on.  

Also you mentioned switching from Dawn at some point to another theme. We have been running Dawn for years. We also used a paid theme in the past. I highly recommended just sticking with Dawn for a while. We run a 7 figure business with it, works just fine. Focus on selling your products not constantly upgrading your website.
- **PLogacev** (2↑): Just be aware it's a bit like invoking a genie. You get roughly what you ask for, but you can't foresee the side effects because you don't fully understand the code it wrote. Your shipping bar and size chart are probably fine — low stakes. But I vibe-coded a web scraper once and got banned from a cloud host because the code was doing things I had no idea it was doing. The riskier the module, the more that gap in understanding can bite you.
- **nicknamealias** (1↑): I've been meaning to test something out with Claude on my website. 

I got multiple stores, so if a customer wants to check stock availability of a specific location, you have to click a button that says "Check Availability by Pickup Location", then it pops up a widget that shows my locations and whether this item is "In Stock" or "Out Of Stock". 

I want it to be just displayed straight on the product page, so it's very clear whether something is in stock or out of stock at a location right away.   
  
I contacted the developers of the theme, and they were not able to give me a good solution. Maybe Claude can help, but I got so much other stuff to do, exploring AI is always on low priority....which is bad. I need to get up to speed on all this.
  - **baldie** (3↑): The thing with the exact feature you're describing is it will need a backend. Shopify does not have a way to get this information directly in liquid. But this info is available via their API. Claude can implement this but you'll need to host the backend somewhere for your frontend to communicate with
    - **nicknamealias** (1↑): Appreciate the insight. I'll look more into it and see if it's worth doing.
- **genPoop** (1↑): I totally get the app bloat struggle, it happens so fast. I started doing the same thing last year, but just be careful with maintenance. When you code it yourself, you're the one who has to debug it when Shopify updates their liquid files or changes their API. It's great for simple stuff, but for anything mission critical, just make sure you keep a backup of the original theme code before you start messing with it.
- **carbon3915** (1↑): I think it depends on the use case - I probably wouldn't use it at this stage for anything customer facing, critical to the business or where there's a large risk from unforseen bugs. 

I needed an easier way to get data from Shopify to our accounting software. It basically just needs to pull the data from Shopify and format it into a spreadsheet to match what can be imported into the accounting software. It'd be outputted on request, and if there are any bugs once it's in use they'll get caught quickly when things don't balance, and if that's the case we can go back to doing it manually - so very low risk and not at all mission critical. 

I tried vibe coding with a few different AI coders to try to get something to work. It sorta, kinda works but not really and they all just tell me they've fixed the bugs without actually fixing it. If I keep persevering arguing with them it'll probably get it to work, but AI isn't at the stage of asking for what you want and receiving it even for something very simple. I dont think they're far off that, but not there right now. 

People seem very obsessed with apps though, and I've tried to minimise how many apps I need especially on the front end. The only front facing apps we have is for reviews and backorders, everything else is backend (mainly shipping and affiliates). I go through regularly and uninstall any apps we aren't using.
- **Dizzy-Entrepreneur52** (1↑): Testing if comments work here
