---
id: social-intelligence/reddit-deep/ecommerce/1trcvm3.md
url: "https://www.reddit.com/r/ecommerce/comments/1trcvm3/a_shopify_app_reckoning_is_coming/"
kind: "social-post"
source: "reddit-deep: r/ecommerce"
subreddit: "ecommerce"
title: "A Shopify App Reckoning is Coming"
author: "jordanthinkz"
date: "2026-05-29T19:27:37.000Z"
score: 53
upvote_ratio: 0.88
num_comments: 60
flair: "🛒 Technology"
extracted_at: "2026-08-25T23:08:27.668Z"
extraction_method: "praw-deep"
research_goal: "Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics and skincare brand targeting Gen Z."
engagement: "identify-high-converting-email-design-patterns-and-product-m"
chunks:
  - id: "social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c0"
    char_span: [0, 1230]
    sentence_count: 7
    key_terms: [app, translation, replacement, ecommerce, comments, klaviyo, figma, hours]
    concepts: [translation, replacement, ecommerce, comments, klaviyo]
    related_chunks: ["social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c5"]
    token_count: 287
    sources: [{"n":"reddit-deep: r/ecommerce","u":"https://www.reddit.com/r/ecommerce/comments/1trcvm3/a_shopify_app_reckoning_is_coming/"}]
  - id: "social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c1"
    char_span: [1245, 3022]
    sentence_count: 10
    key_terms: [shopify, app, apps, like, functionality, code, ecommerce, building]
    concepts: [shopify, functionality, ecommerce, building, without]
    related_chunks: ["social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c2"]
    section: Comments
    token_count: 359
  - id: "social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c2"
    char_span: [3024, 5006]
    sentence_count: 17
    key_terms: [building, shopify, app, apps, last, work, compliance, merchant]
    concepts: [building, shopify, compliance, merchant, privacy]
    related_chunks: ["social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c1"]
    section: Comments
    token_count: 453
  - id: "social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c3"
    char_span: [5008, 6556]
    sentence_count: 7
    key_terms: [apps, built, going, customer, majority, shopify, custom, little]
    concepts: [built, going, customer, majority, shopify]
    section: Comments
    token_count: 346
  - id: "social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c4"
    char_span: [6558, 7740]
    sentence_count: 10
    key_terms: [apps, custom, translation, easily, people, weglot, been, dropshipping]
    concepts: [custom, translation, easily, people, weglot]
    section: Comments
    token_count: 289
  - id: "social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c5"
    char_span: [7742, 9780]
    sentence_count: 9
    key_terms: [code, klaviyo, claude, jordanthinkz, going, translation, app, team]
    concepts: [klaviyo, jordanthinkz, claude, translation, going]
    related_chunks: ["social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c0"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c6"
    char_span: [9509, 10162]
    sentence_count: 9
    key_terms: [year, hosting, offers, figma, code, replacement, processor, security]
    concepts: [hosting, offers, figma]
    section: Comments
    token_count: 172
  - id: "social-intelligence/reddit-deep/ecommerce/1trcvm3.md#c7"
    char_span: [10164, 10597]
    sentence_count: 5
    key_terms: [save, cheaper, savings, takes, own, igorgo2000, incurring, something]
    concepts: [cheaper, savings, takes]
    section: Comments
    token_count: 114
---
# A Shopify App Reckoning is Coming

Source: [reddit-deep: r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1trcvm3/a_shopify_app_reckoning_is_coming/)
Posted by **jordanthinkz** · **53↑** · **60 comments**

We hit our rate limit yesterday for one of our apps, and the price jump for the next tier was over $300 a mo. So I asked Claude Code connected via API - MCP if it could make a replacement, and within 3 hours we had a free, near-zero maintenance replacement. Total costs thats over 7k saved a year.

Our small but capable team is now going through our app stack to see what we can replace with our own implementation.

I don't think the saas world is ready for these next few months.

Edit: since people getting emotional over this post and things like Security, the app i replaced was a translation app (i live in a multilingual country) that was charging $600 a month for over a few thousand users, I bypassed it by running a translation pass over translate and adapt, Shopifys native language app that has limited automatic translation capabilities. Another cool thing was making a figma to klaviyo tool that allows to push email designs directly to klaviyo from figma, saving hours, if not days a month of work.

## Comments

- **Leviathant** (11↑): I came from a more mid-market, enterprise background, building custom ecommerce sites and later working with a platform that was sort of like a Magento competitor. I was astonished at all the dumb baseline stuff that you needed an app for in Shopify. I learned about how every app you add to Shopify slows down the customer experience, and how Shopify apps don't talk to each other, or how one of your apps might have scaling issues, which become a drag on the whole application tier.

By that point I had moved to a different role and wasn't doing implementation or integration anymore, but I always felt like if I was doing this in Shopify, I'd just custom code a lot of that stuff. But apparently it wasn't that simple in Shopify. 

Now that Claude or Antigravity or Cursor are making it easier to build without having to code, the app ecosystem is in a very strange place: The app store is being flooded with clanker garbage from people who are churning out apps, but there are also folks like you that are recognizing how simple so many of these apps are.

The next thing that Shopify is worrying about is how much their vision of an all-in-one easy turnkey solution becomes a roadblock to leveraging AI in ecommerce. They've made concessions to try and capture businesses that wanted to go headless, but have never giving the same scalable access to functionality and information that you get from something API-first like commercetools. And where technical complexity was once seen as a potential challenge when building in a MACH stack, with the likes of Claude, true MACH solutions are suddenly supercharged by the ability to build without needing to understand code. And not just storefronts, but business-specific functionality and features. 

2026 is going to be an interesting year.
- **danisaccountant** (26↑): I’m not an app developer but that monthly subscription price does a lot more than just pay for the app. They’re also squashing bugs, enhancing it to work with Shopify updates, patching security issues, and ensuring privacy standards are met.
  - **Leviathant** (15↑): Building features is easy. Scaling and maintaining is where the work is. Start getting into compliance and now you're talking \*hard\* work.
    - **emz0rmay** (6↑): Yesss the compliance piece is key! Any apps that touch customer data need to be compliant with privacy regulations wherever the merchant sells. I worry about the risk of vibe coded apps causing huge data leaks
  - **First_Seesaw** (1↑): Yup, I know we all want ways to reduce our expenses but there are things to always consider regardless.
- **rightig** (4↑): ‘Near zero maintenance’ famous last words
- **Itsallbs_100** (4↑): Building your own infra seems easy until you get to the last phase. No not the last building phase, the tedious and absolutely necessary testing -> edit -> test again -> repeat. Anyone who has built real platforms knows this is far from the trivial task of vibe coding. If i was to warn anything I would say make sure you understand what you doing and not just taking the ai's word for it. Otherwise, hell yea. Build your own. I like being in full control over my stacks personally. I wouldn't do it any other way. But know what you are doing first. Not saying you don't just saying in general for anyone reading this.
- **derekjadams** (4↑): This is precisely what I’ve done for a number of clients with a high degree of success and better customization.

I’ve taken existing workflows they’ve hacked together with Shopify apps and streamlined them into a custom integration that does all the previous app did and more.

It’s a question of whether the knowledge is there or not - if a Shopify merchant doesn’t know, they won’t look to make a switch.

Every client site I’ve redesigned and built over the past 6 months has been built with a custom integration to handle the majority of random apps they were using - saving them monthly and making the entire management and customer experience entirely more seamless.
  - **jordanthinkz** (2↑): Great stuff man, if a dev, merchant or marketer knows their way around an IDE and understands the basic idea of an API / MCP it really feels like they now have an unfair advantage.
    - **derekjadams** (1↑): Yup, you’re absolutely correct.
- **tobebuilds** (3↑): I highly doubt the majority of merchants will ever build their own custom apps, even with AI. Most end users of Shopify have very little knowledge of how the platform works, by design. When you add variance between stores to the mix, it's easy to see why Shopify apps require more customer service than other SaaS.

Only time will tell whether the average brand is willing to take on the burden of code ownership to save a few bucks a month, but it doesn't seem likely.
  - **Fluent_Press2050** (1↑): True but people are going to build apps and charge a fraction. Then as more competition enters, pricing is only going to go down. 

It’ll get to the point that AI drives the cost of everything down so much that no one is going to make any money, people will eventually leave the app race and prices will go back to where they were.

I’ve personally built dozens of replacements for my business already for little apps we were paying a few bucks a month for or $50 to $100 a year per person. 

I could easily turn around and put these on GitHub for free and potentially make it harder for other smaller devs trying to make a living.
    - **tobebuilds** (1↑): The race to the bottom is optional, and I choose not to participate. Building simple apps was already a losing game before GenAI. I hear your point, though.
- **mathiswrong** (4↑): Wait until you figure out that you don’t need apps at all anymore and can code any feature you want into a headless Shopify site on Lovable for $25/m. There you go. Enjoy the revolution.
- **toshko93** (2↑): 600$ a month translation app? I don't think there is one except for Weglot that is 10x more expensive than the rest.

But in any case, it's not going to happen any time soon. People have been able to write custom apps for so long and they still didn't do it but paid for apps. The majority of merchants are 50 IQ people who watched a 10$ course on how to get rich with dropshipping
  - **jordanthinkz** (2↑): Yea we were using weglot mainly for the support, url translation and their ability to easily edit custom sections, but we hit the rate limit which caused us to rethink lol. So far our custom solution has been flawless.

Yea, I have a background in CS so ig I know what I'm doing lol
    - **toshko93** (1↑): Well if you have any technical experience, you would know weglot is a ripoff. They just rely on dummies to pay 10x more for non-native translations
- **igorgo2000** (3↑): BS post - OP is complaining over $7K a year fee for a platform that runs his online business... and he has an "in-house" team to build a replacement using Claude Code... OMG! His online business must be total shit if $7K is going to make a difference to deal with security and all of the risks running his own code which was written by Claud and direct his paid in-house team to go through that code to ensure it actually works... a total crapshoot!  Then when he needs a payment plugin which is secure and certified by his merchant account provider (highly likely to be Stripe for which he is Ok to pay 2.9% basis points 🤦‍♂️), what is he going to do - ask Claud to whip that up...? 😂
  - **notneps** (3↑): Why not just ask Claude to vibe code a complete payment processor infrastructure instead? Zero percent transaction fees here we come! /s
  - **jordanthinkz** (3↑): Another thing we’ve built is a figma to klaviyo app that pushes our figma designs to klaviyo, no more spending hours in klaviyo programming emails
  - **jordanthinkz** (4↑): Not sure why everyone’s getting so emotional over this, yes saving $7k on a translation app (i live in a multilingual country) by running a Claude translation pass over translate and adapt which lives closer to the site is worth it, faster, and safer
    - **igorgo2000** (0↑): You said "Our small but capable team is now going through our app stack to see what we can replace with our own implementation." How much will it cost you in your labor to do all this, and you will have to keep doing on an ongoing basis... what about hosting - where are you hosting your code...? What about security...? Shopify offers all that and more and you are saving $7K per year...? You know the saying  "penny wise, pound foolish"...? - that's you. Good luck!  Oh and why don't you vibe code Klaviyo and Figma while you are at it...?  I heard that Claude now offers Figma replacement... and also a Stripe or whatever payment gateway / processor you are using while you are at it...
  - **Fluent_Press2050** (1↑): You wouldn’t save $7k? Give me a break. Even if you make $1m or $100m revenue a year, $7k a year savings is no joke.

My effort in savings is based on how long it takes me. If my rate per hour to save is not at least 2x savings it’s cheaper to pay it. Which means if Amazon has something cheaper than another site and it takes me 1 minute to save $7 I’ll do it.
    - **igorgo2000** (1↑): I also said saving $7K vs incurring costs of having your own team... Ok. Go save $7K... build and manage your own app, replace Shopify and do whatever you want...
