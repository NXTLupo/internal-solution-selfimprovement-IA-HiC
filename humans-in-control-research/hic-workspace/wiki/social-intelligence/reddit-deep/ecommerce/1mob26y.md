---
id: social-intelligence/reddit-deep/ecommerce/1mob26y.md
url: "https://www.reddit.com/r/ecommerce/comments/1mob26y/conversational_commerce/"
kind: "social-post"
source: "reddit-deep: r/ecommerce"
subreddit: "ecommerce"
title: "Conversational Commerce"
author: "JennyAtBitly"
date: "2025-08-12T14:59:30.000Z"
score: 45
upvote_ratio: 1
num_comments: 40
flair: ""
extracted_at: "2026-06-18T13:35:23.810Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/ecommerce/1mob26y.md#c0"
    char_span: [0, 2141]
    sentence_count: 15
    key_terms: [like, customers, shopping, "it's", chatbots, recommendations, product, conversational]
    token_count: 422
  - id: "social-intelligence/reddit-deep/ecommerce/1mob26y.md#c1"
    char_span: [2156, 4383]
    sentence_count: 13
    key_terms: [customer, messaging, jennyatbitly, agents, communicate, app, chat, get]
    section: Comments
    token_count: 509
  - id: "social-intelligence/reddit-deep/ecommerce/1mob26y.md#c2"
    char_span: [4385, 6602]
    sentence_count: 16
    key_terms: [data, letssharelove, jennyatbitly, like, llm, engagement, everything, investment]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/ecommerce/1mob26y.md#c3"
    char_span: [6604, 7378]
    sentence_count: 5
    key_terms: [texts, like, treating, another, someone, get, conversation, promotional]
    section: Comments
    token_count: 158
---
# Conversational Commerce

Source: [reddit-deep: r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1mob26y/conversational_commerce/)
Posted by **JennyAtBitly** · **45↑** · **40 comments**

Anyone here started playing around with this?   
  
I remember seeing a lot of hype around it a few years ago along side the first few waves of AI releases but it looks like it's starting to build some momentum: global spending on conversational commerce is supposed to reach $290 billion this year.

Basically, it's where online shopping meets instant messaging. Instead of browsing a Shopify or WooCommerce site alone, customers can chat, text, or voice message brands for everything from personalized recommendations to purchases. In practice it might look like: 

* SMS marketing that lets customers reply with questions
* Chatbots that guide you through product selection
* WhatsApp or Facebook Messenger shopping experiences
* Voice assistants helping with reorders

I think it's starting to take off because people like having the option of in-the-moment interactions just like they would with a sales assistant in a brick-and-mortar store. It adds a little human touch to the convenience of online shopping. 

One of the big examples I've seen is Dominos Pizza using chatbots for ordering and paying. Customers can literally just text a pizza order and complete the whole transaction in a chat.  

On the e-commerce side, Sephora leverages chatbots to offer personalized beauty advice and product recommendations. Sephora's virtual assistant utilizes AI to analyze clients' skincare concerns, preferences, and purchase history to provide tailored product suggestions and home routines. It's like having a beauty consultant in your pocket.

It seems a bit gimmicky at times, but I do like how it bridges the gap between the convenience of online shopping and the personal service of in-store experiences. Instead of abandoning their cart because they have a question about sizing, customers can just ask right there.

Interested to hear some takes on this. Especially form anyone who's actually bought something through a chat interface .

## Comments

- **KRYPTON5762** (2↑): Used WhatsApp shopping with a local retailer recently and it was surprisingly smooth for basic questions and checkout. Still feels early though. Success probably depends heavily on your customer base and whether they're already comfortable messaging businesses.
  - **JennyAtBitly** (1↑): Thanks for sharing. I definitely agree about the customer base point and I'd through product in there too. For more high-end purchases I can see people being wary about using a messaging app or chatbot for purchases.
- **MDG_dev** (2↑): I suspect this is a legit post and not astroturfing…can I ask which plugin(s) you’d recommend to create a direct chat line to the customer service team?

Ideally we’re talking super, super light…set up the chat plugin on the site and on my end it just goes straight to my messaging app or to a devoted messaging app?
  - **gerim_dealer** (3↑): To make it work really good it should a bit more complicated and connected to your inventory at least. Also some db to track previous conversations, get insights from client’s behaviour exactly your audience and tune the solution later. Then it will shine.
    - **JennyAtBitly** (2↑): Absolutely, making those previous customer interactions work for you in the future is a huuuuuge.
  - **JennyAtBitly** (2↑): You are correct, all natural grass here :). 

Going to get the whole "it depends on your setup" disclaimer out of the way and say that the WhatsApp (Elfsight, QuadLayers) and Meta's Messenger chat plugins are *probably* the lightest.  That said, you won't get any extra features/automations for routing, analytics, or easy CRM integrations. 

If you’re starting simple but want access to more features, I've heard good things about Tidio and LiveChat.
    - **MDG_dev** (1↑): Thank you!
- **gerim_dealer** (2↑): Yes, there is sort of shift from „simple chatbot” on website to the agentic ai solutions. These agents play roles of customer assistants , recommend products and and even may interact with other agents ,  responsible for inventory automation for instance. At the end you have agents team on board , some of them communicate with clients , other with you or your stuff and also they communicate with each other.

But from what I see it’s on early stage of adoption at least for now. It requires some investment from business owners, and it’s not only about money . It’s actually way more cheaper then owners think. To make it valuable it also requires engagement to analyse processes, understand some basic infra required, decide the desired funnel of customer journey and so on.
  - **JennyAtBitly** (2↑): Exactly! It's a worthwhile investment for brands that are able to spend the money and hours getting the system fully-integrated.
- **dphntm1020** (2↑): Are you referring to chat interface by brand or model providers like OpenAI? I think depending on where the engagement happens, things change dramatically. If you're a store building chat for your own brand, it's simpler since you control everything AI needs (product catalog, user data, conversation context etc.). If the interaction happens on 3rd party platform like ChatGPT, things get much more challenging since the data now lives in different places
  - **JennyAtBitly** (1↑): Great point! I was referring to the former in this post, the new slate of chatbot tools that are purpose built for ecom/support and are integrated with the different sections of the site that you mentioned. Not as up to speed on using OpenAI's API but the data concern is definitely valid.
    - **LetsShareLove** (1↑): For data privacy, we can add a layer for anonymizing the inputs before sending to the LLM and deanonymize upon getting the response. For example, divide all the numbers by 420 before sending and multiply everything in the response back so the openai or any LLM provider won't know the actual data. Same with names and any identifiable params. I even saw a product that solves this exact problem of anonymity with LLMs.

There are also other options like hosting the LLM/SLM locally but only medium/large enterprises can afford the cost for this part I guess.
- **LetsShareLove** (1↑): Amazon also introduced Rufus AI and it handled ~14% of their search queries in Oct 24 and is expected to handle 25-35% of all of their search queries by the end of 2025 itself.

The next generation is shopping on another level of convenience. Conversational commerce is near-future!

Disclosure: I help e-commerce brands make shopping agents so there could be some bias involved in what I said (altho I'm trying to be as unbiased as I can)
- **Sonatina13** (1↑): What actually worked for us was treating texts like you've got a store associate helping someone out, not just another marketing blast. Like when someone texts asking about shipping times or if you have their size in stock, answering that right there in the thread saves way more sales than sending another 20% off promo ever did.

The one-way promotional texts get tuned out fast. But when people can actually ask questions and get real answers through SMS, they stop bouncing. We noticed abandoned carts dropped pretty hard once we started treating it more like a conversation than a campaign.
