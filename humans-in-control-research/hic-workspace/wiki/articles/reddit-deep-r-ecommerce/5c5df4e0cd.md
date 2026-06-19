---
id: articles/reddit-deep-r-ecommerce/5c5df4e0cd.md
url: "https://www.reddit.com/r/ecommerce/comments/1o8tmf7/ecommerce_ai/"
url_hash: "5c5df4e0cd"
kind: "article"
source: "Reddit Deep: r/ecommerce"
title: "E-commerce & AI"
author: ""
date: "2025-10-17T06:08:44.000Z"
tier: 
method: "source-native"
extracted_at: "2026-06-18T13:38:40.033246+00:00"
chars: 4148
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
collected_at: "2026-06-18T13:38:40.179Z"
relevance: 85
engagement_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
content_hash: "621521f87e9e90f3"
relevance_by_goal: {"490684cfa204":85}
chunks:
  - id: "articles/reddit-deep-r-ecommerce/5c5df4e0cd.md#c0"
    char_span: [0, 1727]
    sentence_count: 19
    key_terms: [people, e-commerce, customer, recommendations, support, discussion, ecommerce, questions]
    token_count: 413
  - id: "articles/reddit-deep-r-ecommerce/5c5df4e0cd.md#c1"
    char_span: [1731, 3852]
    sentence_count: 15
    key_terms: [order, comm100, customers, oms, chatbot, service, shopify, updates]
    token_count: 484
  - id: "articles/reddit-deep-r-ecommerce/5c5df4e0cd.md#c2"
    char_span: [3854, 4272]
    sentence_count: 5
    key_terms: [skin, customers, products, care, recommends, provides, brother, curious]
    token_count: 89
---
# E-commerce & AI

Source: [Reddit Deep: r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1o8tmf7/ecommerce_ai/)

Hey guys!

Thought I'd open a discussion here. I find it funny that it's almost 2026 and most people still think of AI as chatGPT. I've been devoting a lot of time to e-commerce lately & I met so many people in the space.

I see a trend where people start thinking about AI more openly (integrations, customer support bots, etc..) rather than.. just GPT.  
  
Either way, my goal here is to create an open discussion among fellow e-commerce people. How do you leverage AI? What works, what doesn't? What have you tried and how did the outcome feel? Thoughts/ideas appreciated!

--- TOP COMMENTS ---
[3↑ Bart_At_Tidio] This shift is definitely happening. People are finally using AI for real, day to day stuff like customer support, product recommendations, or post-purchase follow ups instead of just seeing it as a chatbot thing.

The best approach to this is starting small. Automate the easy stuff first, order updates, quick FAQs, then layer in more once it proves helpful. It frees up your team for real conversations with customers instead of the repetitive questions.
[1↑ Zanx_thebanx] Any concrete ideas?
[1↑ Bart_At_Tidio] I named a couple already: Customer support, product recommendations, and automated/personalized purchase follow ups. 

But there's a ton more it can do, obviously. Reading, analyzing and giving you insights into huge amounts of data is so big. Plenty of companies have their hands on large amounts of data that they just never use
[1↑ OwntomationNation] 100% this. "Start small" is the only sane way to do it. It's wild how much time is spent on the same 5-10 questions.  
  
I work at eesel AI, and we see ecomm stores do this all the time. A lot of them start by just having the AI handle "where is my order?" by plugging it into their Shopify. That plus training on past tickets to answer basic FAQs automates a huge chunk of the repetitive stuff. Then the team can actually focus on the more complicated convos.
[3↑ TOBYIT] I still haven’t managed to find an inexpensive ai powered chat bot that can achieve a solid csat. 

I’d love to have one that can call and produce tracking information from my OMS or change order items per customer requests (prior to dispatch).

Also, a proactive upselling tool would be handy
[3↑ neevar79] I am able to do this with Comm100 and their workflows 

Shopify -> Chatbot (Comm100) -> Order Status -> email/order number -> Webhook -> Service -> WMS -> Compose Response -> Back to Comm100 

Similarly 

Chatbot ( Comm100) -> Cancellation or Add - Remove Items ->  Service  ( Checks for Order Status to see if can be still made ) -> Web View (aka custom page of Comm100) -> Allows Customer to make selection of Form -> Submit -> Service -> Updates Shopify -> Updates ERP / WMS 

For a AI Agent to do this would be tremendous. Haven't come across one.
[1↑ Zanx_thebanx] So you’re saying you have to pay big time to get good AI chat?
[1↑ Substantial_Set2737] We actually built something close to what you’re describing for a mid-sized apparel brand. Off-the-shelf chatbots couldn’t handle dynamic order updates or OMS pulls without breaking.

So we built a lightweight layer on top of their existing OMS that connects to the chatbot via API. It does three things:

1. Pulls live tracking data and shows it instantly in chat when customers ask for order status.


2. Lets verified customers modify or cancel orders before dispatch, synced straight back into the OMS.


3. Triggers smart upsells only when it makes sense (like when someone’s adding a related product before fulfillment).

Their CSAT jumped by 24% within two weeks just because customers got faster answers without opening a ticket.
And cost-wise, the setup stayed under $150/month or even cheaper.

If you’re curious or have any such ideas in your mind, I am happy to discuss. It’s pretty modular and can fit most Shopify or custom OMS setups.

The one we made for a skin care brand is beyond just a Q&A bot but it recommends products for customers based on their skin type. Provides skin care routine for customers with their range of products. The sky is the limit brother if you can explain what exactly you want.
