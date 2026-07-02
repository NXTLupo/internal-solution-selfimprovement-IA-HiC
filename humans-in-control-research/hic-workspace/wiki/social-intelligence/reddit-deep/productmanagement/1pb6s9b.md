---
id: social-intelligence/reddit-deep/productmanagement/1pb6s9b.md
url: "https://www.reddit.com/r/ProductManagement/comments/1pb6s9b/looking_for_advice_product_analytics/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Looking for advice - Product Analytics"
author: "Unlikely_Joke_5632"
date: "2025-12-01T07:41:49.000Z"
score: 17
upvote_ratio: 0.95
num_comments: 23
flair: ""
extracted_at: "2026-06-18T13:35:35.651Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1pb6s9b.md#c0"
    char_span: [0, 2426]
    sentence_count: 17
    key_terms: [product, analytics, productmanagement, data, mixpanel, interesting, like, want]
    concepts: [product, analytics, productmanagement, mixpanel, interesting]
    token_count: 512
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1pb6s9b/looking_for_advice_product_analytics/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1pb6s9b.md#c1"
    char_span: [2428, 4701]
    sentence_count: 18
    key_terms: [tracking, data, like, certain, payload, product, architecture, help]
    concepts: [tracking, certain, payload, product, architecture]
    section: Comments
    token_count: 436
  - id: "social-intelligence/reddit-deep/productmanagement/1pb6s9b.md#c2"
    char_span: [4703, 5510]
    sentence_count: 7
    key_terms: [data, decisions, yourself, product, least, "won't", get, need]
    concepts: [decisions, yourself, product, least, "won't"]
    section: Comments
    token_count: 172
  - id: "social-intelligence/reddit-deep/productmanagement/1pb6s9b.md#c3"
    char_span: [5512, 7761]
    sentence_count: 11
    key_terms: [data, new, reports, etc, team, use, evolution, important]
    concepts: [reports, evolution, important, database, entities]
    section: Comments
    token_count: 491
  - id: "social-intelligence/reddit-deep/productmanagement/1pb6s9b.md#c4"
    char_span: [7763, 9890]
    sentence_count: 12
    key_terms: [data, standard-feed-9260, tool, user, platforms, timestamp, activity, feedback]
    concepts: [standard-feed-9260, platforms, timestamp, activity, feedback]
    section: Comments
    token_count: 502
  - id: "social-intelligence/reddit-deep/productmanagement/1pb6s9b.md#c5"
    char_span: [9892, 11695]
    sentence_count: 12
    key_terms: [users, returning, activity, minutes, within, get, percentile, insights]
    concepts: [users, returning, activity, minutes, within]
    section: Comments
    token_count: 440
  - id: "social-intelligence/reddit-deep/productmanagement/1pb6s9b.md#c6"
    char_span: [11697, 13677]
    sentence_count: 13
    key_terms: [analytics, event, track, tool, honestly, actions, allowed, celoxis]
    concepts: [analytics, event, track, honestly, actions]
    section: Comments
    token_count: 429
  - id: "social-intelligence/reddit-deep/productmanagement/1pb6s9b.md#c7"
    char_span: [13679, 14703]
    sentence_count: 8
    key_terms: [pendo, especially, honestly, product, flows, been, get, serene-alessia]
    concepts: [especially, pendo, honestly, product, flows]
    section: Comments
    token_count: 229
---
# Looking for advice - Product Analytics

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1pb6s9b/looking_for_advice_product_analytics/)
Posted by **Unlikely_Joke_5632** · **17↑** · **23 comments**

We’re a small company with a young product team, and we’re about to dive into product analytics for the very first time. Up until now, we haven’t tracked any product usage data, so this is completely new territory for us. Our goal is to find a platform that helps us understand how users interact with our application and gives us actionable insights without overwhelming us with complexity or unpredictable costs.

We want to introduce product analytics to become more data-backed in our decisions. Our focus is on tracking meaningful data that actually helps us improve the product, not just collecting everything for the sake of it.

So far, we’ve evaluated Pendo, Userpilot, and Mixpanel. All three seem powerful, but Userpilot felt more interesting to us than Mixpanel, mainly because of its focus on in-app experiences and onboarding. With Mixpanel, the pricing model is a big question mark for us – we can’t really estimate how many events we’ll have per month, which makes it hard to predict costs. We do have a budget, but we want transparency and control so we know exactly what we’re paying for.

Our main requirement is event tracking: we want to see how users navigate through our app, what they click on, and what their paths look like. It would also be great if we could measure things like the amount of data each user consumes.

Beyond that, there are some nice-to-have features we’d love to explore in the future:

Guides (we found Pendo’s guide functionality very interesting, but we keep reading that it can get expensive)

Heatmaps

Analytics for AI agents or AI-driven features

Churn prediction and churn analytics (long-term goal)

Right now, it’s just two of us managing this internally. We expect to involve a developer for the initial setup, but long-term we’d like to handle most of it ourselves without heavy engineering support.

Important note: We’re based in the EU, so GDPR and data privacy compliance is a must for any solution we choose.

Here’s what we’re curious about:

Are there smaller companies here that can share what tools they use for product analytics?

How did you get started?

How much effort did it take to implement and maintain?

Any tips for keeping costs predictable when you don’t know your event volume yet?

We’d really appreciate any insights, recommendations, or lessons learned from your experience. Thanks in advance!

## Comments

- **throwawayTymFlys528** (7↑): Mixpanel becomes seriously expensive over time just so you know.

And why even go to full solution companies yet, you said you're a young product company means your product isn't stacking features left and right. Will assume you have found a great niche for yourself and has the capacity to grow over time.

Which means you should stick to basics for now. Every action has a payload, right? Without it you can't even run performance logs. Focus on refining that payload and creating a standard payload which has tracking, fixed variables to maintain coherence across customer states and free variables that you might want to add or play with like A/B experiment IDs or other metadata that you want to pass through to get more insights into a certain action.

If you really need help with this, find a provider like segment to support tracking architecture rather than full solution like mix panel.

Then finally think through how your customer moves around the product, sit down with your experience devs and map every access point and every funnel it leads to. It will help you identify the hierarchy you need to develop for workflow tracing and bake it into your tracking architecture.

Once all this is done, build a small but durable data mart. Since you're a PM, I'm assuming you understand the basics of data structures as a bare minimum. Make it air tight, no assumptions like "yeah sure this feature could be pushed here too..." None of that half baked bullshit, be crystal in your head why a certain feature should live somewhere and how it would help create clarity in understanding the movement of customers. Minimize overlapping features, write detailed documentation because you will mess up and will have to create temp solutions to fix that mess. If your data engineer does not document it, you are cooked and won't be able understand the nuances of why a certain metric looks so weird here.

Start with maybe open source tools for tracking, tracing, ingestion, storage, data management and finally metric reporting.

Hope this helps a little bit at least.
- **esteban-felipe** (7↑): Before buying anything, I would rather focus on creating the absolute need for product analytics. Get some data from your database, logs, or by adding a small notification to capture when something significant happens in your product. Then process, present, and use the data for decisions. You want to get yourself in a position where you want/have to make a decisio,n and the data you have is not sufficient. That will force you and your team to   
\- Actually appreciate using data to make decisions.  
\- Understand what exactly you need.

You may find yourself understanding that your team or culture doesn't have an appetite for data. It will be a sad realization, but at least you won't be burning extra dollars in tools you won't use.

If your team is ready to appreciate data, you will be in a better position to evaluate the tools and methods you are considering.
- **Sweaty_Ear5457** (2↑): hey! we went through something similar last year. instead of jumping straight into expensive analytics platforms, we started by mapping our entire user journey on a visual canvas first. i use instaboard for this - created sections for each major funnel (onboarding, core features, retention), then used cards to map every touchpoint and what data we actually needed to track. this helped us see exactly what mattered vs what was just noise. we ended up starting super basic with just database queries and a simple dashboard, then gradually added tools as we proved the value. the visual map made it so much easier to prioritize what to track first and kept us from getting overwhelmed. plus it gave our dev team a clear picture of the tracking architecture before we wrote any code. gdpr compliance was easier to handle too since we could see exactly what user data we were collecting at each step.
- **draculaparty** (1↑): We are somehow similar.
We have some basic reports in Google Looker with data from our database. For example, the most important graph is our license bar-chart to show us for each module how many licenses we have each month. Than we have how many a new vs old, etc
One for the evolution of new clients to see the trends over the years. 
We have specific reports for the main entities  starting from the total, top clients, evolution, etc.
Also, we have one where the sales team can search for each client to see the usage for the most important entities - helps them at renewal.
You need initial setup and than if you know how queries work you can try to document how to create yourself new reports.

Currently we have Hotjar the free version. What we use the most is their Survey feature, but we use it as announcements to inform users of new features, incidents, webinars, etc. - it is not really built for that but it does the job.

I have discovered PostHog and I have a task on my list to understand it better and analyze it with a Dev to see if is a good fit for us.
- **gglavida** (1↑): Hello! PostHog is a good solution but they nerfed its open source versión.

I highly recommend if you have a front-end + back-end or full-stack developer, that you go with a data capture tool such as TelemetryDeck, that way you only capture the more critical elements, and you store them in a database where you can later query with a text-to-SQL tool or Power BI.

You can also have a tool such as Piwik, Fathom or Plausible, which are all privacy-friendly together if you want high-level metadata such as regions where users are located, type of device, OS, etcetera.

That way you have aggregated data in one platform and in-detal data in another one.

You'll avoid data overload as well with this approach.

And you have the extra benefit of data separation, you can't tie identifiable data to a person unless they have a common id in both platforms and someone has access to both data platforms.
- **Standard-Feed-9260** (1↑): We're really early stage (only 3 months of user data at this time) and we have posthog ... but the thing that works for me is a stupid hack. I ask my engineer to give me a dump of all our event tracking logs for the month and feed it to chatGPT ... and i am pretty astounded by the level of insights and follow-up digging i can do with this. Everyone's mileage varies, but I don't actually need to look at my data daily -> because there are no actions i take on my data at that level of granularity.
  - **Full_Skill1945** (2↑): This is really interesting to me - could you elaborate? What types of insights and follow-ups do you get?
  - **Aware_Pie6692** (2↑): I would love to learn more too! We're a seed stage startup just signing our first design partners
  - **Standard-Feed-9260** (2↑): u/Aware_Pie6692 u/Full_Skill1945   
As an example, I got an export of {userid}{activity}{timestamp}{account first created timestamp} as a CSV for a timeperiod. Activity here is actually something completed and recorded in the backend. For our app \[YoFigma.com\] this is actually AI-powered feedback such as a design audit or feedback from a user persona.

Using this as input to Claude (seems better than ChatGPT right now) I asked for an analysis of returning user behavior. 

Sample output included things like **Behavior Patterns Identified:**  
1. High engagement outliers  
2. Users exploring 3 activity types  
3. Medium returning cohort / each with actual userids, frequency etc.

Deepdives - I asked for an analysis of all users who have returned to perform >1 action. Pasting the data here for your reference. Honestly, NO WAY you can get this from any traditional analytics package unless you wrangle a bunch of setups - and typically I would have had an analyst help me out.

These are super actionable (to me - since I know the context of this) >> this is what I meant by my original comment. You can get so much value out of using the data you already have with LLMs.

|Metric|Value|Meaning|
|:-|:-|:-|
|**Count**|273 intervals|Total number of consecutive activity gaps measured|
|**Mean**|**13 hours**|On average, users come back *within half a day*|
|**Median**|**6 minutes 11 seconds**|Half of all returning actions happen almost immediately|
|**25th percentile**|**2 min 52 sec**|A quarter of all users take less than 3 minutes before doing another activity|
|**75th percentile**|**26 min 17 sec**|Three-quarters of all returning actions happen within \~30 minutes|
|**Minimum**|**29 seconds**|Some users run back-to-back tests almost instantly|
|**Maximum**|**22 days 16 hours**|Long-tail returners coming back after weeks|
  - **Unlikely_Joke_5632** (1↑): So the event tracking logs you get are from posthog? If so, you run posthog cloud or do you have the free tier and on-premises deployment? Can you give some insights on the tracking within the application itself? Do you tag specific routes only or everything?
- **ironmanun** (1↑): We took the 1 year free for startup’s and setup post hog 

Also, we used enterpret, which I found better for true insights. 

Post hog allowed drill down into sessions, enterpret allowed qualitative and wunatitive insights
- **Fantastic-Nerve7068** (1↑): If you’re mainly worried about cost predictability, event volume, and not drowning in setup overhead, you’re honestly thinking about the right things. Tools like Mixpanel and Pendo are great, but yeah… once the MAU or event count spikes, so does your bill, and it hits you fast.

We’re a smaller team too, and we actually ended up doing something slightly unconventional: instead of going all in on a pure analytics tool, we paired light-weight tracking with our project/ops tool. In our case it’s Celoxis (we use it for PM work), and it actually surprised me how much product operations stuff it can cover:

• Custom fields + reporting let us track usage related metrics without inflating costs  
• Dashboards are flexible enough to build “event-style” summaries for user actions  
• Worklog + time analytics ended up helping us estimate engineering load for each tracked feature, which mattered way more than vanity event numbers  
• Client/Project health views gave us a decent “early churn vibe check” long before we had real churn models

It’s obviously not a full replacement for Mixpanel-level funnels or Pendo heatmaps, but for a team just getting started, having everything in one clean place and not paying per event was honestly a lifesaver.

Then on top of that, we added a tiny self-hosted script to track a handful of critical user actions in the app. Only the important stuff, no data hoarding. With GDPR this was way easier to keep compliant.

If I were in your position:

1. Decide the 5 to 10 events that actually matter
2. Track only those (even manually at first)
3. Use a consolidated tool (Jira, Celoxis, Linear, whatever fits your workflow) to tie those events back to product decisions
4. Move to heavier analytics only when you know what you need

The cost trap in analytics is always event sprawl. Start tiny and intentional.

If you want something between “full Pendo” and “spreadsheet hell,” that’s honestly the sweet spot.
- **Legitimate_Canary834** (1↑): If your product does not exceed 500 MAUs then Pendo Free literally will give you it all. We were on that until recently and have been rocking for a few years. You also get access to the entire product suite essentially.
- **Serene-Alessia** (1↑): Agreed on Mixpanel becoming super expensive in the long run, especially if you scale.   
I hate when pricing isn't transparent as well. So we were in similar situation and went through several options including Pendo (and honestly the guides are great but also too costly for what you get). We chose Statsig for the event tracking, user flows etc.. its been impressive with looking at drop off rates in our onboarding flows and other areas.  
  
They tick a lot of your boxes so def worth a peek. Quick Q - how many users/events do you anticipate (especially early on) because that might be important to know and help drive the best tool option.
