---
id: social-intelligence/reddit-deep/productmanagement/1ojesre.md
url: "https://www.reddit.com/r/ProductManagement/comments/1ojesre/api_gateways_for_product_managers/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "API Gateways for Product Managers"
author: "platypiarereal"
date: "2025-10-29T19:55:49.000Z"
score: 230
upvote_ratio: 0.97
num_comments: 54
flair: "Tech"
extracted_at: "2026-06-18T13:35:35.635Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c0"
    char_span: [0, 2140]
    sentence_count: 11
    key_terms: [com, stripe, yourapp, api, need, services, http, productmanagement]
    concepts: [stripe, yourapp, services, productmanagement, disputes]
    token_count: 502
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1ojesre/api_gateways_for_product_managers/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c1"
    char_span: [2142, 2947]
    sentence_count: 10
    key_terms: [gateway, service, communication, real-time, internal, latency, through, extra]
    concepts: [communication, gateway, service, real-time, internal]
    token_count: 171
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c2"
    char_span: [2961, 5064]
    sentence_count: 12
    key_terms: [message, intra-service, service, broker, event, services, randomreddithero, platypiarereal]
    concepts: [message, intra-service, service, broker, randomreddithero]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c3"
    char_span: [5066, 7038]
    sentence_count: 11
    key_terms: [com, yourapp, something, api, use, billing, service, search]
    concepts: [yourapp, something, billing, service, search]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1ojesre.md#c4"]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c4"
    char_span: [7040, 8771]
    sentence_count: 11
    key_terms: [billing, stripe, api, com, gateway, checkout, search, rules]
    concepts: [billing, stripe, gateway, checkout, search]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1ojesre.md#c3", "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c5"]
    section: Comments
    token_count: 405
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c5"
    char_span: [8773, 10870]
    sentence_count: 14
    key_terms: [client, billing, gateway, api, stripe, implementation, com, dns]
    concepts: [client, billing, gateway, implementation, stripe]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1ojesre.md#c4"]
    section: Comments
    token_count: 466
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c6"
    char_span: [10872, 13007]
    sentence_count: 16
    key_terms: [platypiarereal, gaming, events, need, complexity, definitely, listening, specific]
    concepts: [platypiarereal, gaming, events, complexity, definitely]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c7"
    char_span: [13009, 15229]
    sentence_count: 9
    key_terms: [api, url, company, gateway, com, need, platypiarereal, based]
    concepts: [company, gateway, platypiarereal, perspective, based]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/productmanagement/1ojesre.md#c8"
    char_span: [15232, 17205]
    sentence_count: 14
    key_terms: [gateway, minutes, apis, like, everything, depending, different, catalog]
    concepts: [gateway, minutes, everything, depending, different]
    section: Comments
    token_count: 421
---
# API Gateways for Product Managers

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1ojesre/api_gateways_for_product_managers/)
Posted by **platypiarereal** · **230↑** · **54 comments**

Ok trying something new here. I've heard from quite a few PMs about technical proficiency and system design. Short of wading through a ton of software engineering concepts, there isn't a "teach me how to be proficient in technology without giving me a degree in computer science" resource out there. 

I've been teaching myself the latest system design concepts (candidly for my job really), but just sharing some "enough for PMs, but obvious to engineers" insights here. Please let me know if this series is useful at all - I'll continue if so.

**Today's topic: API Gateways (and when they become bottlenecks)**

A simple example is Stripe. As a PM for developer tools, you might want to build several services like payments, fraud detection, user services, disputes etc. Your customers (other developers) need to integrate with all of these. Do you make them call:

* [payments.stripe.com](http://payments.stripe.com)
* [fraud.stripe.com](http://fraud.stripe.com)
* [users.stripe.com](http://users.stripe.com)
* [disputes.stripe.com](http://disputes.stripe.com)

Or do they call one endpoint: [**api.stripe.com**](http://api.stripe.com) and you handle the routing?

**So what is a gateway?** Think of it as a single front door for all your services. Instead of clients calling search.yourapp.com, user.yourapp.com, booking.yourapp.com separately, they call api.yourapp.com/search, api.yourapp.com/user, etc. The gateway handles routing, security, and rate limiting.

**When it makes sense:**

* External-facing APIs (mobile apps, web, third-party integrations need one consistent endpoint)
* You need centralized security and rate limiting across many services. Need everyone to log in and you as the PM need analytics of all this.
* Different routes need different rules (search can handle 100 req/min, checkout only 10 req/min)

**When it's actually hurting you (and why engineers might push back):**

1. **Internal service communication** \- If Service A calls Service B through the gateway, you're adding extra steps and latency for no reason. So say you want to personalize and need user data. During peak load (think Black Friday), this compounds. Engineers will want direct communication here. You will lose some tracking though. 
2. **Small internal tools** \- An analytics dashboard for 50 employees? The gateway setup takes days and adds operational complexity for minimal benefit. A simpler load balancer works fine. 
3. **Real-time features** \- Gaming, live chat, real-time bidding. When users expect <50ms response times, every extra hop through a gateway is noticeable degradation. As a thumb rule, most applications have \~100-200ms of latency

Is this useful at all? Would love some feedback.

## Comments

- **pooja_gupta_** (29↑): Appreciate the efforts and I am definitely looking forward to this series.
  - **platypiarereal** (8↑): Thank you for the feedback!
    - **spacenglish** (5↑): Yes appreciate this. How can we ask more questions and what topics do you plan to cover?
- **HugeEgo_Sorry** (6↑): Thanks for sharing this. 

I would add that most of the time you will have different communication protocols to address the issues you raised. For instance, intra-service exchanges will be event based by way of a message broker
  - **platypiarereal** (2↑): >intra-service exchanges will be event based by way of a message broker

can you explain with an example perhaps? i'm a bit lost.
    - **HugeEgo_Sorry** (9↑): That's exactly it /u/RandomredditHero! 

To expand a little bit with an exemple, if your app was made of 5 different services you wouldn't want them communicating directly because it can gets messy really fast. If each service implemented its own direct flows towards the other, you would be looking at 20 unidirectional flows. It would be wasteful, brittle, and hard to evolve and innovate because each flow is specific to one service's needs (let's not even get into organizational and ownership can of worm). 

A better pattern is to have some kind of 'post office' that facilitate intra-service communication. That way each service does what it has to do without preoccupying itself with whatever happens in the other services. When it's finished it sends a message that say "hey i'm done! here is what i did, these are the modification that happened, etc." 

The service then sends the message to a post office, the message/event broker, and other service will read from there and react accordingly. The sender is called a publisher, the reader is called a subscriber and between them sits the event broker.  

 /u/RandomredditHero mentionned rabbitmq, others include Kafka, Eventbridge & sqs (AWS), pubsub (GCP), Web Pubsub (Azure) and many many others. They all have specific strengths and features but they pretty much serve the same purpose : keeping your services decoupled. 

When done right the messages themselves are very straightforward and human readable. I encourage PMs to participate in the scoping of the message's contents. It's one of the fastest way to understand your whole system. 

I hope this is a clear and readable :)
    - **RandomredditHero** (3↑): I'll take a stab and wager it's using something like a rabbitmq, or other message queueing service, instead of going through the gateway (so internal use only).

Also since I got to use 'queueing' here I feel obligated to link this https://xkcd.com/853/

Even if I'm wrong I get to share that comic so yay haha
- **OHotDawnThisIsMyJawn** (3↑): > Instead of clients calling search.yourapp.com, user.yourapp.com, booking.yourapp.com separately, they call api.yourapp.com/search, api.yourapp.com/user

Would be helpful to explain why this matters.  

Do the clients care (i.e. something about the process is easier or better for them)?  

Or do we care (i.e. something about the process is easier/better for us, either us as PMs, the engineering team, or the company as a whole)?

Unless you already understand some of the more technical details, there doesn't appear to be any functional difference between having someone call api.stripe.com/billing vs. billing.stripe.com.  

And I actually think that trying to make the distinction between these two setups muddies up what's actually important, which is that you have a *single service* routing all the traffic to the backend, no matter how many actual services there are, because that's where you can do all the important things you were talking about (auth, logging, analytics, etc).  

Honestly, you could use billing.stripe.com with no problem and have your API gateway use host headers to route traffic to the correct service.  Might make some auth/cookie/CORS/whatever stuff a little more annoying but it's not a real issue.

> Different routes need different rules (search can handle 100 req/min, checkout only 10 req/min)

Unless I'm missing something, this doesn't require an API gateway, each service could just set their own rules right?  An API gateway would come into play if you needed the rules to work *cross-service*.  Like... you're capped at 100 requests/min across all services, whether it's 50/50 search/checkout or 95/5 search/checkout.
  - **platypiarereal** (1↑): >Unless you already understand some of the more technical details, there doesn't appear to be any functional difference between having someone call api.stripe.com/billing vs. billing.stripe.com.

Ok lets take a customer scenario. Let's say there is no api gateway and Stripe has a [billing.stripe.com](http://billing.stripe.com) for all your billings. Now due to some reason (perhaps scale, hard requirements, org change, or whatever), they need to separate subscriptions billing and one time billing. if there was no gateway, they will now have to launch 2 end points- [subs.billing.stripe.com](http://subs.billing.stripe.com) and [ot.billing.stripe.com](http://ot.billing.stripe.com) and reach out to every client to get them to change their implementation.

If you have an api gateway, they could jsut map it internally. so client send [api.s.com/billing](http://api.s.com/billing) \- which the gateway can then map internally. No change to the client and stripe can make changes that they want. So api gateways make sense in these scenarios. 

>Unless I'm missing something, this doesn't require an API gateway, each service could just set their own rules right? An API gateway would come into play if you needed the rules to work *cross-service*. Like... you're capped at 100 requests/min across all services, whether it's 50/50 search/checkout or 95/5 search/checkout.

Yea, i mean this is my whole point. this is all a choice. sure each service can set their own limits - totally manageable when you have 5 services, but now if you have 50 services it quickly becomes a headache. And lets say client a wants more fraud calls, and client b wants more billing calls. If you have hard limits per service per client - well this starts getting into nightmare territory.But again if you only have 5 services, its not worth the operational overload of having an api gateway.
    - **OHotDawnThisIsMyJawn** (3↑): > Ok lets take a customer scenario. Let's say there is no api gateway and Stripe has a billing.stripe.com for all your billings. Now due to some reason (perhaps scale, hard requirements, org change, or whatever), they need to separate subscriptions billing and one time billing. if there was no gateway, they will now have to launch 2 end points- subs.billing.stripe.com and ot.billing.stripe.com and reach out to every client to get them to change their implementation.
> If you have an api gateway, they could jsut map it internally. so client send api.s.com/billing - which the gateway can then map internally. No change to the client and stripe can make changes that they want. So api gateways make sense in these scenarios.

You can do all this with DNS too.  You can have the same API gateway running behind 100 different DNS entries.  There's functionally very little difference between mapping via DNS and mapping via an HTTP path. 

You talk about the client needing to update their implementation in the DNS case but it's the same thing in the HTTP path case.  If the client now needs to specify subs vs. otb then either way they need to update their implementation (and if you're saying that in the /billing case the client doesn't need to include it then you're not comparing apples to apples).
- **michaelisnotginger** (3↑): > Real-time features - Gaming, live chat, real-time bidding. When users expect <50ms response times, every extra hop through a gateway is noticeable degradation. As a thumb rule, most applications have ~100-200ms of latency

When customers say they want real-time, outside of very very few cases they do not need <50ms. Especially when they find out cost and complexity grow exponentially the closer you get to 'real time'
  - **platypiarereal** (1↑): I think this is a nuanced point that definitely warrants further deep dives. I plan to write a post on latency and the cost of lowering latency. -> doing this research now.
- **imtheonewhowanders** (3↑): Yes please more of these
  - **platypiarereal** (2↑): Just uploaded the second one on caching patterns!
- **blaqkpupil** (2↑): A couple of notes:
- provide more examples of the other tools that can be used. For internal communication between servers you could use RabbitMQ, Kafka, Redis. They all have pros/cons and specific scenarios where they shine. It can help other PMs when they can associate terms that may be in the realm of a Gateway and work similarly so they can pick up those terms when talking with engineering and paint an even bigger picture of context in their mind.
- you can use a gateway for real time events or notifications. But you typically won’t be making direct request/response calls, like event buses (Kafka, Redis) you’d be listening for events (subscriptions) and you can react to them. I wouldn’t rule them out completely for gaming or chat, you just need architecture to handle the mutability of the data wherever you’re listening for changes/events (TLDR it depends on what you’re doing when it comes to gaming. Is this the backend that manages a players account info? Or inventory? Or are you trying to run lobbies and game servers? There’s a lot of components to how games run so you’d need to be very specific on what “gaming“ means in this context)
  - **platypiarereal** (1↑): Both great points! thank you! One 1, yes thats a good addition and will add a section in related tech. Agree that even being able to recognize which techs go together is helpful. 

I am definitely not an expert in gaming by any means! So I'm sure there is quite a bit of complexity i missed / abstracted out.
- **WoodpeckerAlive2595** (2↑): But this is still only focusing on the base URL? 

Every application will require their specific proxy in order for the gateway to reroute to their endpoint, so from a customers perspective, they still need the full URL path per service, i.e. every customer will still need to integrate to different endpoints, API requirements, etc.

You can't go to Google and type "social media URL" and expect it to know if you meant Facebook, reddit, or Instagram.

Our base URL is api.company.com and every microservice extends that URL to things like 

api.company.com/billing
api.company.com/subscription
api.company.com/etc 

And the API gateway does the routing to each respective service based on their proxy config.

If that's what you meant as well, cool! It's just my intial read of your post made it sound like just the base URL was needed and somehow the gateway will know how to redirect you.
  - **platypiarereal** (1↑): Yes i think you put it well.
- **sgergely** (2↑): you have missed the cost perspective. api gw not just adds latency but cloud cost too: cpu time and network costs.
  - **platypiarereal** (1↑): Thats an interesting point. Is there really a marked difference? It'll come down to your load i imagine. My understanding is that gateways are managed services whereas for something like load balancers you are paying the cost of the machine (i'm sure this is a simplification - but for the sake of argument)

Is there a clear winner?
    - **sgergely** (2↑): hah, gws are not always managed services. you can host it for yourself as well.
load balancers are one part and the limits are another. just think of a scenario when an api gw need to make tiered limitation based on usage. need to calculate if it can let the next api call in or not, count the numbers of calls and the rate limit if needed. also logging the api calls to provide usage dashboard and bill based on them. 🫠🤯
with logging costs can also skyrocket.
- **it-depends121224** (2↑): Agree with most of what you said, but a well architected api management system (gateway is a part of a broader family of tools collectively called api management) doesn't take days to set up, but a few minutes. Your mileage may vary depending on how mature and well oiled your organizational processes are.


Ideally every API should be designed to be reusable and exposed via the gateway but the biggest benefit is when putting the gateway in front of your external facing APIs. There are internal use cases though where a gateway can add a lot of value if the small additional latency is acceptable. 


And yes, putting small, ad-hoc tools that do not provide real business capabilities should not be put behind a gateway. 


And a gateway by itself is not as valuable unless you combine it with a strong discovery mechanism like a catalog and a playground.
  - **platypiarereal** (1↑): I like your username! Aptly captures the discussion we have been having in this thread haha

Thanks for raising these points. 

>doesn't take days to set up, but a few minutes. 

TBH i have heard feedback about this taking minutes to hours. I imagine the complexity comes from the size of the system and the number of APIs? Is my assumptions correct? Or are there other factors that influence how complex setting up (and maintaining) a gateway is?
    - **it-depends121224** (1↑): I don't want to go into too much detail without giving away my identity, but I work very closely with a team that manages such a system. And there are different aspects to 'setting up a gateway'.


There is the gateway and the catalog and other components depending on what software you're using... Apigee, Kong, Mulesoft or any of the dozens of similar solutions by different vendors. There definitely is a huge initial effort needed to get everything set up. 


But once you have everything in place, adding a new api should typically not take more than a few minutes to hours depending on how much automation you have and how efficient your other infrastructure processes like network and compute provisioning and configuration are.
- **SquirrelOk9955** (2↑): I am a PM that has really wanted to learn more about APIs, but had no ideas where too start, so I think this is really useful and helpful, thank you!
