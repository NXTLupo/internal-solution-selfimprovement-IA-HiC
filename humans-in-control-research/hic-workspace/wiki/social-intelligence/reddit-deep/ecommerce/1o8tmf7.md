---
id: social-intelligence/reddit-deep/ecommerce/1o8tmf7.md
url: "https://www.reddit.com/r/ecommerce/comments/1o8tmf7/ecommerce_ai/"
kind: "social-post"
source: "reddit-deep: r/ecommerce"
subreddit: "ecommerce"
title: "E-commerce & AI"
author: "Zanx_thebanx"
date: "2025-10-17T06:08:44.000Z"
score: 5
upvote_ratio: 0.61
num_comments: 65
flair: ""
extracted_at: "2026-06-18T13:35:23.803Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/ecommerce/1o8tmf7.md#c0"
    char_span: [0, 752]
    sentence_count: 10
    key_terms: [people, e-commerce, discussion, ecommerce, comments, here, open, integrations]
    concepts: [e-commerce, people, discussion, ecommerce, comments]
    token_count: 195
    sources: [{"n":"reddit-deep: r/ecommerce","u":"https://www.reddit.com/r/ecommerce/comments/1o8tmf7/ecommerce_ai/"}]
  - id: "social-intelligence/reddit-deep/ecommerce/1o8tmf7.md#c1"
    char_span: [766, 2690]
    sentence_count: 16
    key_terms: [order, customer, recommendations, comm100, repetitive, questions, amounts, chatbot]
    concepts: [order, recommendations, customer, comm100, repetitive]
    related_chunks: ["social-intelligence/reddit-deep/ecommerce/1o8tmf7.md#c2"]
    section: Comments
    token_count: 461
  - id: "social-intelligence/reddit-deep/ecommerce/1o8tmf7.md#c2"
    char_span: [2692, 4112]
    sentence_count: 12
    key_terms: [customers, oms, updates, order, chatbot, comm100, service, shopify]
    concepts: [customers, updates, order, chatbot, comm100]
    related_chunks: ["social-intelligence/reddit-deep/ecommerce/1o8tmf7.md#c1"]
    section: Comments
    token_count: 322
  - id: "social-intelligence/reddit-deep/ecommerce/1o8tmf7.md#c3"
    char_span: [4114, 6363]
    sentence_count: 11
    key_terms: [customer, questions, conversation, tools, been, skin, want, answering]
    concepts: [customer, questions, conversation, tools, answering]
    section: Comments
    token_count: 506
  - id: "social-intelligence/reddit-deep/ecommerce/1o8tmf7.md#c4"
    char_span: [6368, 6573]
    sentence_count: 2
    key_terms: [background, generated, optimizes, something, against, testing, variant, always]
    section: Comments
    token_count: 43
---
# E-commerce & AI

Source: [reddit-deep: r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1o8tmf7/ecommerce_ai/)
Posted by **Zanx_thebanx** · **5↑** · **65 comments**

Hey guys!

Thought I'd open a discussion here. I find it funny that it's almost 2026 and most people still think of AI as chatGPT. I've been devoting a lot of time to e-commerce lately & I met so many people in the space.

I see a trend where people start thinking about AI more openly (integrations, customer support bots, etc..) rather than.. just GPT.  
  
Either way, my goal here is to create an open discussion among fellow e-commerce people. How do you leverage AI? What works, what doesn't? What have you tried and how did the outcome feel? Thoughts/ideas appreciated!

## Comments

- **Bart_At_Tidio** (3↑): This shift is definitely happening. People are finally using AI for real, day to day stuff like customer support, product recommendations, or post-purchase follow ups instead of just seeing it as a chatbot thing.

The best approach to this is starting small. Automate the easy stuff first, order updates, quick FAQs, then layer in more once it proves helpful. It frees up your team for real conversations with customers instead of the repetitive questions.
  - **Zanx_thebanx** (1↑): Any concrete ideas?
    - **Bart_At_Tidio** (1↑): I named a couple already: Customer support, product recommendations, and automated/personalized purchase follow ups. 

But there's a ton more it can do, obviously. Reading, analyzing and giving you insights into huge amounts of data is so big. Plenty of companies have their hands on large amounts of data that they just never use
  - **OwntomationNation** (1↑): 100% this. "Start small" is the only sane way to do it. It's wild how much time is spent on the same 5-10 questions.  
  
I work at eesel AI, and we see ecomm stores do this all the time. A lot of them start by just having the AI handle "where is my order?" by plugging it into their Shopify. That plus training on past tickets to answer basic FAQs automates a huge chunk of the repetitive stuff. Then the team can actually focus on the more complicated convos.
- **TOBYIT** (3↑): I still haven’t managed to find an inexpensive ai powered chat bot that can achieve a solid csat. 

I’d love to have one that can call and produce tracking information from my OMS or change order items per customer requests (prior to dispatch).

Also, a proactive upselling tool would be handy
  - **neevar79** (3↑): I am able to do this with Comm100 and their workflows 

Shopify -> Chatbot (Comm100) -> Order Status -> email/order number -> Webhook -> Service -> WMS -> Compose Response -> Back to Comm100 

Similarly 

Chatbot ( Comm100) -> Cancellation or Add - Remove Items ->  Service  ( Checks for Order Status to see if can be still made ) -> Web View (aka custom page of Comm100) -> Allows Customer to make selection of Form -> Submit -> Service -> Updates Shopify -> Updates ERP / WMS 

For a AI Agent to do this would be tremendous. Haven't come across one.
  - **Zanx_thebanx** (1↑): So you’re saying you have to pay big time to get good AI chat?
  - **Substantial_Set2737** (1↑): We actually built something close to what you’re describing for a mid-sized apparel brand. Off-the-shelf chatbots couldn’t handle dynamic order updates or OMS pulls without breaking.

So we built a lightweight layer on top of their existing OMS that connects to the chatbot via API. It does three things:

1. Pulls live tracking data and shows it instantly in chat when customers ask for order status.


2. Lets verified customers modify or cancel orders before dispatch, synced straight back into the OMS.


3. Triggers smart upsells only when it makes sense (like when someone’s adding a related product before fulfillment).

Their CSAT jumped by 24% within two weeks just because customers got faster answers without opening a ticket.
And cost-wise, the setup stayed under $150/month or even cheaper.

If you’re curious or have any such ideas in your mind, I am happy to discuss. It’s pretty modular and can fit most Shopify or custom OMS setups.

The one we made for a skin care brand is beyond just a Q&A bot but it recommends products for customers based on their skin type. Provides skin care routine for customers with their range of products. The sky is the limit brother if you can explain what exactly you want.
  - **abd297** (0↑): I was charging around 5 cents per conversation which is super-cheap when you consider improved conversion rates. I also know others in this space providing the service at a similar price point. Have you tried some of these tools?
- **tarun479** (1↑): What tools are available for free/low cost for images , social media reels ? Any suggestions
- **thepillowco** (1↑): yeah, totally - i used to think ai was just messing with gpt prompts, but for my shop i've been chasing practical stuff that actually frees up time. we tried ai for images and descriptions, but the biggest low-effort win was automating customer questions. what i ended up using was chatsupportbot to handle shipping/returns/pricing/hours and to qualify leads, and it just took the repetitive stuff off our plate. setup was an afternoon, it worked right away, and it actually showed us which product pages needed clearer info so we stopped answering the same questions over and over.
- **neevar79** (1↑): I really want AI to replace the search bar. Instead of keyword searching, I want that to be a conversation between AI agent and customer.
  - **Zanx_thebanx** (1↑): Google already doing smthg in that direction
    - **neevar79** (1↑): Yes. Search is still their bread and butter .
- **mindthychime** (0↑): AI’s become way more than just “chatGPT answering questions.” We’re seeing brands use it for smarter ad targeting, product recommendations, customer service, even inventory prediction. Some e-com folks I know have been outsourcing parts of the AI setup (like data cleaning + workflow building) so they can focus more on strategy. Curious how others here are blending AI tools with human help what’s actually been worth the effort for you guys?
- **qwesr123** (-2↑): I am working on an AI based tool to automatically optimize on-page copy using LLMs + sequential A/B testing. Showing very promising uplift in add-to-cart and user engagement rates in early customer beta testing. 

  
The tool runs in the background to make sure you are always A/B testing something on your page, and optimizes based off real event data. The winner from each test is pitted against a new generated variant.
