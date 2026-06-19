---
id: social-intelligence/reddit-deep/dropship/1onkj4x.md
url: "https://www.reddit.com/r/dropship/comments/1onkj4x/how_are_you_all_actually_handling_the_where_is_my/"
kind: "social-post"
source: "reddit-deep: r/dropship"
subreddit: "dropship"
title: "How are you all actually handling the \"Where Is My Order?\" chaos?"
author: "Material_Vast_9851"
date: "2025-11-03T18:57:40.000Z"
score: 13
upvote_ratio: 0.89
num_comments: 33
flair: ""
extracted_at: "2026-06-18T13:35:36.669Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/dropship/1onkj4x.md#c0"
    char_span: [0, 1159]
    sentence_count: 10
    key_terms: [tracking, job, like, different, comments, customer, dropship, everyone]
    token_count: 271
  - id: "social-intelligence/reddit-deep/dropship/1onkj4x.md#c1"
    char_span: [1174, 3321]
    sentence_count: 14
    key_terms: [tracking, order, eta, dropship, automatically, automates, shopify, "there's"]
    section: Comments
    token_count: 505
  - id: "social-intelligence/reddit-deep/dropship/1onkj4x.md#c2"
    char_span: [3323, 5386]
    sentence_count: 17
    key_terms: [system, customers, proactive, customer, heads-up, automation, "customer's", question]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dropship/1onkj4x.md#c3"
    char_span: [5125, 5863]
    sentence_count: 6
    key_terms: [villagehomef, chaos, different, business, orders, kind, satisfaction, high-volume]
    section: Comments
    token_count: 185
  - id: "social-intelligence/reddit-deep/dropship/1onkj4x.md#c4"
    char_span: [5865, 8163]
    sentence_count: 18
    key_terms: [tracking, order, processing, customer, delivery, perfect, trackingnumber, email]
    section: Comments
    token_count: 504
  - id: "social-intelligence/reddit-deep/dropship/1onkj4x.md#c5"
    char_span: [8165, 10398]
    sentence_count: 22
    key_terms: [tracking, delivery, like, shopify, order, estimated, updates, emails]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/dropship/1onkj4x.md#c6"
    char_span: [10400, 12269]
    sentence_count: 20
    key_terms: [automation, helpdesk, system, like, exceptions, shopify, handle, manage]
    section: Comments
    token_count: 455
---
# How are you all actually handling the "Where Is My Order?" chaos?

Source: [reddit-deep: r/dropship](https://www.reddit.com/r/dropship/comments/1onkj4x/how_are_you_all_actually_handling_the_where_is_my/)
Posted by **Material_Vast_9851** · **13↑** · **33 comments**

Hey everyone, I have been deep in the e-commerce space for a while, and one thing I see with dropshipping is that it looks like two different jobs. There is the "fun" job (finding products, making ads). And then there is the "admin" job (customer service). It feels like the admin job, especially just answering "where is my order?" 50 times a day, is the real bottleneck that burns everyone out. It is like your Shopify store, your supplier's tracking, and your customer's emails are all in different buildings. And *you* are the one who has to manually run back and forth between them to find the tracking number and reply to the email. I am just curious how you all are solving this? Is the only answer to just hire a bunch of VAs? Or has anyone here successfully built an automated *system* that can automatically check the tracking status and update the customer *before* they even ask?

## Comments

- **AutoModerator** (1↑): **REPORT posts/comments if they are SPAM, self-promotion, or a store review/critique**  
    + help keep r/dropship SPAM free 


*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dropship) if you have any questions or concerns.*
- **shockwagon** (2↑): there's tons of automated systems out there for this. but it requires that your shipping source has EDI or API or at least an FTP service that gets auto populated with invoices/tracking information.

We have a shopify store, and a 3rd party order software called Sellercloud, it talks to our distributors (8 of them), and automates order processing to them, and automates tracking numbers from them back to shopify. Runs about $2k/mo.

Lots of softwares like this though, takes some investment to get it setup and a monthly recurring cost. This is the first bottleneck to scale beyond 7 figures.

Even if you hire a VA or 5, there's human error in that mix.
- **One_Literature_5041** (2↑): Totally feel you—WISMO can eat your whole day if the customer knows more about the ad than the ETA. What’s worked best for us is treating “where is my order?” as a messaging problem first, not a staffing one. Make the ETA specific and visible everywhere (PDP/cart/checkout and the order email), then mirror the same plain-English status on the tracking page. If the system says “In transit,” add a “Next step: with the carrier; expected by Tue–Thu” and one obvious “Need help?” path. That single line cuts a surprising % of tickets because people just want to feel in control.

On the ops side, a light automation loop beats throwing VAs at it: a daily job that finds orders with no first scan after X days, or at risk of missing ETA, and sends a short heads-up before customers ask (“New ETA window is Thu–Fri; reply here to swap/cancel”). Then have your helpdesk/macros pull the tracking link + last scan into the reply automatically so agents aren’t tab-hopping. For dropship timelines, honesty is the hack—longer ETAs are fine if you say it upfront and proactively update when something slips.

If you’ve got Shopify + a basic tracking page, you can do 80% of this with order webhooks + simple rules (no fancy stack required). i have a doubt - do you currently send a pre-ETA heads-up when a package looks late, or only reply once people email you?
  - **Material_Vast_9851** (2↑): That is a fantastic, high-value comment. You have completely nailed it. "Honesty is the hack" is so true. That automation loop you described—the "daily job that finds orders at risk" and sends a "heads-up before customers ask"—is *exactly* the kind of "system" I was talking about. It is not just a reactive chatbot; it is a proactive workflow. That is the 100/100 solution. To answer your question: I am on the tech/automation side of this, so I am a huge believer in the "proactive heads-up." If you are waiting for them to email you, you are already in the "chaos" I was talking about. Great comment.
    - **One_Literature_5041** (1↑): Well said. In our tool we believe in proactive responses too and we’ve seen the approach work as well. Customers actually have positive experiences even when delivery issues occur if you’ve reached out to them beforehand.
- **Thanh-Eboxman** (1↑): most of them now build their own automated system to answer customer's frequently asked questions. I see it works well and have been in the customer's shoes and I rate it about 80/100
  - **Material_Vast_9851** (1↑): That is a great point. You are right. An 80/100 is a perfect score for a system that "answers the question" well. The 100/100 system is the one that automatically updates the customer *before* they even have to ask. That is the one that solves the "chaos" for good, because the customer never has to worry.
    - **Damazinga49** (1↑): Totally agree! If you can get a system that preemptively updates customers, it not only cuts down on inquiries but also boosts customer satisfaction. Have you come across any specific tools or software that do this well?
- **VillageHomeF** (1↑): this is why we prefer fewer higher ticket orders.
  - **Material_Vast_9851** (1↑): That is a 100 percent valid strategy. You are just avoiding the "admin chaos" from the start by changing the business model. That is a really smart way to do it. But for the people who are in that high-volume game, that chaos is still the main bottleneck. It is just a different kind of business, and it needs a different kind of system to work.
    - **VillageHomeF** (1↑): I really couldn't imagine is I got 100+ orders a day.  would be chaos
- **Maittanee** (1↑): Automation is key

\- After order: "Thanks for the order. You will get your Trackingnumber as soon as we gave the packet to DHL"  
\- If your processing takes longer - After 12-18 hours: your packet will be given to DHL in the next X hours"  
\- After processing: "Your trackingnumber is: ......"

And then it depends on the shipping time. Make a mail every 2-4 days about stuff about your delivery information, about a bonus code for the next visit in your store, if it takes too long something like an apology and a reason why it takes so long etc. 

If your deliver times are long, you need to inform your customer regularely and when you know your processes and your supplier, then you know the typical delivery times and you can create the e-mail automatism.
  - **Material_Vast_9851** (1↑): That is a perfect breakdown. You are 100 percent right. You just described a simple, perfect "system." It is not just one email; it is a full *workflow* that you build *once*. That is exactly what I was talking about. You build the automated process, and it does the "admin" work for you, so you do not have to. That is how you solve the chaos. Great comment.
- **AwayShare8162** (1↑): Totally get this, the constant “Where’s my order?” messages used to drain my time and energy too. Back when I started, I had to manually check tracking numbers on the supplier’s dashboard and copy them back to each customer email. It felt endless. I’ve tried a few tools to automate that process, so here’s a quick breakdown of what worked (and didn’t) for me:

At first, I tried 17TRACK Order Tracking, which is pretty solid for syncing tracking numbers automatically from multiple carriers. It’s great if you’re managing a high order volume or using multiple suppliers. But the downside is that it mostly focuses on the tracking page, it doesn’t show customers estimated delivery times until the tracking number exists, so early stage reassurance is still missing.

Then I moved to Parcel Panel Order Tracking, which offered nice branded tracking pages and automated email updates. It’s perfect for stores that already have stable shipping operations and want to add a polished customer experience. The only drawback is that it gets expensive fast if you’re processing many orders, and setup can feel a bit heavy for smaller stores.

Finally, I tested NS Estimated Delivery Date this one really fit better for my mid-size Shopify store. Instead of waiting for tracking info, it shows the estimated delivery date right on the product page or cart. The app is lightweight, super flexible (you can set rules by product, collection, or country), and doesn’t overwhelm your theme with scripts. The only limitation is that it doesn’t do post shipment tracking like 17TRACK, it’s purely about delivery transparency and expectation setting.

So in short:

* 17TRACK Order Tracking: best for high-volume stores that want centralized shipment tracking.
* Parcel Panel Order Tracking: best for brands that want branded tracking experiences and customer emails.
* NS Estimated Delivery Date: best for small to mid-sized Shopify stores
  - **Material_Vast_9851** (1↑): Wow, this is a fantastic and super-detailed breakdown. Thanks for sharing this. You have perfectly explained the problem. It is not just about a "tracking tool" (like 17TRACK) but about an "expectation setting" tool (like the NS app). It sounds like the real solution is a system that does *both*:

1. Sets a clear ETA *before* the sale.
2. Provides good tracking *after* the sale.

It is a great example of how you have to build a full *system* to solve the chaos, not just buy one tool. Really appreciate the detailed review of those apps.
- **acalem** (1↑): The easiest win is to stop it before it starts. Most people ask because they never got clear tracking info or updates.

You can set up automation that emails or texts customers at key points: order confirmed, tracking number added, item in transit, item out for delivery. Shopify Flow or apps like AfterShip, ParcelPanel, or Track123 can do this automatically. They pull tracking data from your supplier and push updates by email. You can even build a branded tracking page on your store that shows real-time status instead of sending them to 17track. That page alone cuts down 60–70% of those emails for most stores.

If you still get questions, use macros (prewritten replies) inside Shopify Inbox, Zendesk, or Gorgias. Example: “Hi [name], your order is currently in transit. You can check live updates here: [tracking link].” Copy-paste and done.

Hiring a VA is fine when volume gets high, but automation should come first. A VA should manage exceptions, not do every lookup.
  - **Material_Vast_9851** (2↑): That is a perfect summary. You have hit on every single point. "Stop it before it starts" is the key. You are 100 percent right. "Automation should come first. A VA should manage exceptions." That is the exact "system" I was talking about. You build the system to handle 90% of the work, and the human just handles the 10% that the system cannot. That is how you solve the "chaos" for good. Great, high-value comment.
- **No_Possession_508** (1↑): What orders?
- **hopefully_useful** (1↑): For sure it’s the least “fun” part of ecommerce by a long shot. Most stores I see at that stage end up doing one (or both) of two things:  

1. Set up a proper helpdesk - Tools like Gorgias or Zendesk pull all the messages (email, chat, socials) into one shared inbox. That alone makes it easier for you or any VA to handle the backlog without losing track.    
2. Layer in automation for the repetitive stuff. Disclosure: I’m the founder of My AskAI, and this is exactly the problem it solves. We plug into Shopify (or any other 3rd party data) and those helpdesks so the AI can answer “where’s my order?” instantly by fetching live tracking info, sending the right link, and matching your tone. When it’s not confident, it just passes the conversation back to you inside your helpdesk instead of guessing.  

We usually see about 70–80% of order-status tickets deflected like that, which works out around $0.10 per automated ticket vs roughly $1 per resolution or $1.50–3 for a human VA.  

If you’re still manually bouncing between Shopify and supplier systems, even just setting up a helpdesk + AI layer will feel like night and day. Happy to show you how it looks in practice if you want to see an example setup.
