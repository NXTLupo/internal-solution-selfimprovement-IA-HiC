---
id: social-intelligence/reddit-deep/ecommerce/1taro12.md
url: "https://www.reddit.com/r/ecommerce/comments/1taro12/ive_been_using_claude_code_for_the_past_month_to/"
kind: "social-post"
source: "reddit-deep: r/ecommerce"
subreddit: "ecommerce"
title: "I've been using Claude Code for the past month to build stuff I'd otherwise have to pay a monthly fee for"
author: "Intelligent-Fox2082"
date: "2026-05-12T05:08:19.000Z"
score: 201
upvote_ratio: 0.93
num_comments: 189
flair: "🧑‍💻 Creative"
extracted_at: "2026-06-18T13:35:23.799Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/ecommerce/1taro12.md#c0"
    char_span: [0, 2048]
    sentence_count: 15
    key_terms: [minus, "i've", ecommerce, something, comments, requests, instead, morning]
    token_count: 467
  - id: "social-intelligence/reddit-deep/ecommerce/1taro12.md#c1"
    char_span: [2063, 4016]
    sentence_count: 14
    key_terms: [intelligent-fox2082, too, shopify, prices, no-seesaw4444, admin, app, apps]
    section: Comments
    token_count: 467
  - id: "social-intelligence/reddit-deep/ecommerce/1taro12.md#c2"
    char_span: [4018, 5771]
    sentence_count: 13
    key_terms: [wrote, app, work, shopify, "there's", centraldesk, timekeeping, "i've"]
    section: Comments
    token_count: 415
  - id: "social-intelligence/reddit-deep/ecommerce/1taro12.md#c3"
    char_span: [5775, 7393]
    sentence_count: 8
    key_terms: [subscription, app, "it's", investment, automated, software, "that's", graceonajourney1611]
    section: Comments
    token_count: 387
  - id: "social-intelligence/reddit-deep/ecommerce/1taro12.md#c4"
    char_span: [7397, 8735]
    sentence_count: 9
    key_terms: [claude, maintenance, like, created, shopify, custom, graceonajourney1611, daily]
    section: Comments
    token_count: 339
---
# I've been using Claude Code for the past month to build stuff I'd otherwise have to pay a monthly fee for

Source: [reddit-deep: r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1taro12/ive_been_using_claude_code_for_the_past_month_to/)
Posted by **Intelligent-Fox2082** · **201↑** · **189 comments**

Anyone else doing this instead of adding yet another app subscription?

Half the posts here lately are some version of "I'm paying for 12 apps and I've barely launched" or "I've got 9 tabs open every morning just to figure out how yesterday went." 

A lot of that you can just build now.

Stuff I'd make if I were running a store:  
  
\- A support inbox that pulls email, Instagram, WhatsApp and the site chat into one place. The thing Gorgias and Zendesk charge for. 

\- A profit dashboard. Orders, minus ad spend, minus COGS, minus shipping, minus payment fees, minus app fees. The number you actually care about on one screen, instead of a spreadsheet that breaks every time you add a column.

\- Something that deals with "where's my order" emails on its own. Looks up the tracking, replies. Same for return requests. That's most of the inbox right there.

\- Cart abandonment that grabs the email when someone *starts* checkout, not when they finish, and follows up if they bail. Plus the "who are my anonymous visitors" thing the identity apps do.

\- Auto review requests a few days after delivery, with a widget to show them on the product page. Judge(.)me does this and the useful tier costs money.

\- A scraper that checks my main competitors' product pages every morning and tells me when they cut a price or sell out of something I also carry.

\- A weekly check on whether ChatGPT and Perplexity actually recommend your store when someone asks for products in your niche. Keep seeing people here who rank #1 on Google and get completely ignored by the AIs. Couldn't find a real tool for that one.

None of it's complicated, honestly. 

Anyway, anyone else building their own stuff, or has it fallen apart when you tried?

## Comments

- **No-Seesaw4444** (24↑): Solid approach! One tip for the competitor price scraper: if you hit Cloudflare, try using playwright-stealth or crawl4ai - they handle anti-bot detection much better than raw requests. For monitoring prices, set up a simple schedule with APScheduler and use exponential backoff on 429s to avoid getting IP-banned. Store historical prices in SQLite for quick analysis later.
  - **graceonajourney1611** (1↑): the historical pricing database is probably more valuable than the scraper itself long term
  - **Intelligent-Fox2082** (1↑): Yes this makes sense

Thanks for this. Do you run a tech consultancy?
    - **No-Seesaw4444** (1↑): freelancer agency
- **eyeborgUK** (14↑): Sounds brilliant but how would I go about this, step by step, like for the profit dashboard? Would the code be added to Shopify somewhere? I wouldn't have any idea where to start or what would go where! Gah! Sorry, not all of us are fully on top of AI coding, and I probably suffer from being old (it's a highly contagious disease). I have bravely used AI code once to create a new section on my shop interface so am willing to dive in. Or any recommend tutorial would be great. It is indeed annoying with all these apps that charge way too much for a tiny functionality.
  - **chewster1** (11↑): Almost guarantee op is trying to sell something. 

I would love to see real world workflows and tutorials implemented and working with $ numbers.
  - **sfwills** (2↑): Yes I’d love to know this too
    - **Intelligent-Fox2082** (9↑): Same three steps above work for you too. The only part anyone trips on is making the Shopify token, so here's that bit slower:

Shopify admin > Settings > Apps and sales channels > Develop apps > turn on "Allow custom app development" > Create an app > Configuration > Admin API integration > tick `read_orders, read_products`if you want it to pull your cost prices too) > Install app > copy the Admin API access token.

That token is the thing Claude Code needs. Paste it in with the prompt I mentioned and it handles the rest. Shout if you get stuck.
- **NinjaSimone** (4↑): Done the same. I've written a set of Amazon Seller tools that are just the ones I need from Helium10; wrote it initially for my internal team and then launched it as its own service for other cheapskates who just need the basic product info monitoring from Helium10 without all the other stuff.

I also wrote my own timekeeping app to replace Harvest (same thing; wrote it internally, then launched it publicly), and wrote a custom Shopify app last week for JSON schema stuff.

The Shopify app was the hardest. Lots of hoops to go through the first time. But now that I've gotten over that steep curve, we can start just writing custom shopify apps for our clients rather than suggest a stack of third-party apps that might add up to $300 or more per month.

On the Amzon stuff, now, rather than asking myself "I wonder if there's a tool out there that I can subscribe to for $100 a month," I just write it myself, and if it's good enough, I release it to the public.

EDIT: since I got a few DMs from people asking, the Amazon seller tools suite is at [centraldesk.io](http://centraldesk.io) and the timekeeping app is at [timeywimey.io](http://timeywimey.io) (okay, we're still workshopping the name). As with so many other kinds of projects, there's the first 80% of the work... and then the remaining 80% of the work.

Both took about one week to build the initial version, and then I've been tweaking them, fixing bugs and adding features for the past two or three weeks.

As with so many other kinds of projects, there's the first 80% of the work... and then the remaining 80% of the work.  
  
If I had to guess, my time investment has been about 48 hours for the two of them, but the timekeeping app is saving me a $100+ monthly Harvest subscription and the Amazon seller tools app has allowed us to downgrade our Helium10 subscription and put off loose plans to subscribe to new tools for some of the other functionality. So -- it's not an instantaneous solution, but it's well worth the investment.
  - **graceonajourney1611** (1↑): That's how good software starts. Someone gets annoyed paying for a bloated tool and builds a leaner version for themselves.
- **Altruistic_Bear987** (6↑): Yeah I made myself an App that allows me to upload invoices and receipts. It scans all documents and uploads to Airtable for my accountant. 

Its a simple one, but normally you would need a subscription software for somthing like this.
  - **Intelligent-Fox2082** (2↑): Yeah that's what I am talking about, let's go 🔥🔥
- **Admirable_Plastic840** (2↑): interested in the profit dashboard. how does it actually work? is it automated or would you have to enter figures every day
  - **Educational_Wolf_07** (1↑): I mean.. it can be fully automated - no daily data entries.  
  
The way it would work: Shopify has an Admin API that exposes your orders, and you connect your ad accounts (Meta/Google) and a sheet or input for COGS. A script pulls all of it on a schedule and computes the real net number, all you mentioned: revenue minus ad spend, COGS, shipping, fees so you just open it and it's current.   
  
The manual-entry versions are the ones that kinda die after a week butt the API pulled ones just keep running.   
  
I've built one like this.. butt.. the only down part is the COGS source since Shopify doesn't always hold your true cost per item, so you decide whether to feed that in manually once or pull from wherever you track it.
- **cooldrumz** (2↑): I created an app that pulls th important information I need every day. Like a daily brief on my orders, cart abandonment, SEO optimisation. Can’t lie Claude has helped me greatly
  - **graceonajourney1611** (1↑): that's a much better use case than trying to build the next SaaS unicorn. Just solve your own daily annoyances first.
- **chipskaapacket** (1↑): If you can get your hands on a student account you can get claude ai model for free
- **AppVisorDev-Umut** (1↑): Same but with Codex app. I just give it a repo, a saas, or just any idea. Mostly small stuff and it just does it. Just for $100.
- **xaibc** (1↑): I created a section using shopify liquid with claude that allows a potential customer to filter the exact product that should fit what they need ! Amazing building stuff like that without any knowledge.
- **[deleted]** (1↑): Yes, custom tools save money—maintenance eventually becomes the real subscription.
  - **rantanplan-** (1↑): We spent $15k on a custom solution with an outside dev team. Maintenance is close to $1k/month, and cherry on top, it’s been broken for a month+.
