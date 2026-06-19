---
id: social-intelligence/reddit-deep/productmanagement/1skefv8.md
url: "https://www.reddit.com/r/ProductManagement/comments/1skefv8/getting_prototypes_into_users_hands/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Getting prototypes into users' hands"
author: "scottishbee"
date: "2026-04-13T15:36:00.000Z"
score: 6
upvote_ratio: 1
num_comments: 17
flair: "Tech"
extracted_at: "2026-06-18T13:35:35.647Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1skefv8.md#c0"
    char_span: [0, 1428]
    sentence_count: 8
    key_terms: [productmanagement, data, getting, comments, feedback, justification-building, better, users]
    token_count: 341
  - id: "social-intelligence/reddit-deep/productmanagement/1skefv8.md#c1"
    char_span: [1443, 2364]
    sentence_count: 7
    key_terms: [simple, reach, store, title, users, mvp, poc, post]
    section: Comments
    token_count: 220
  - id: "social-intelligence/reddit-deep/productmanagement/1skefv8.md#c2"
    char_span: [2367, 4652]
    sentence_count: 12
    key_terms: [research, feedback, problem, users, like, products, solution, because]
    section: Comments
    token_count: 492
  - id: "social-intelligence/reddit-deep/productmanagement/1skefv8.md#c3"
    char_span: [4654, 6576]
    sentence_count: 17
    key_terms: [customers, pilot, get, getting, product, georgeharter, new, business]
    section: Comments
    token_count: 427
---
# Getting prototypes into users' hands

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1skefv8/getting_prototypes_into_users_hands/)
Posted by **scottishbee** · **6↑** · **17 comments**

Curious if this is a me-problem or a shared one.  I do discovery, learn some common friction points, and realize we have the data to make that possible, but then get stuck on delivering that data to users for feedback.

It's happed at small b2b startups and large b2e faangs.  Some examples are:

\* collecting sales data across 10k+ convenience stores => "Stocking is a total dark art.  I take what my distributor tells me, but I have no clue what's blowing up in my area."

\* internal tool on observability => "this is great for debugging but i have no idea when the wait-time is getting out of control, other than someone getting mad and slacking me"

  
In most cases I (and increasingly now AI) can whip up a query and spit out at a result for a feedback session.  But then productizing that, even as something lightweight, seems to drag in a staffing request for a front-end dev, a data eng ticket that I've got to attend N sprint plannings to advocate for, usually a security review for anything we want to regularly share with a 2nd-party, etc.

  
Do I just need to get better at politics/justification-building?  And/or are there better ways y'all have found to go from POC -> MVP ?

## Comments

- **utzutzutzpro** (3↑): Can you explain me where a PoC is set here in that scenario?

  
I do not understand the title to the post. The post isn't about how to reach users, it tells me about qualitative discovery (which is nice) and then about the individual organisational structure bottleneck of having to include a sprint team. 

I mean, the title introduces a friction in "how to reach prospective users", but the content talks about PO issues and ends with a PoC to MVP solution progression issue?
  - **scottishbee** (1↑): Sure: in the store example, a proof of concept is a simple gsheet we created for each store in our alpha. Simple: run a query, dump the results to a shared sheet, text the user. The MVP is a basic reports page in the customer's Web app.  Tack an input (customer ID), generate/pull an updated report, visualize it. ie: the same thing but in a stable spot, and scalable to 1,000s of customers.


I'm not worried about discovery, I have no problems reaching users for research.
- **kikiii_itis** (3↑): Yeah this is very common, not just you, gap from POC to MVP is where most things slow down because of dependencies and process. easiest hack is dont “productize” early, just ship scrappy stuff like dashboards, emails or simple internal tools to get feedback fast, then justify build. politics matters a bit but bigger thing is reducing scope so you dont need full team every time.
- **strongscience62** (2↑): If you're under-resourced then a business case justifying additional investment or prioritizing some other work would be my starting point. You can't do everything.
- **Personal-Lack4170** (2↑): This reminds me of mills vs distributors—data exists orders, demand signals, but unless it’s embedded into decision loops, it never changes behavior. MVPs should focus on actionability, not completeness.
- **clearspec** (2↑): The fastest path I've found: stop treating prototypes like products. Skip the polish. Share a Loom walkthrough instead of a deployed build. Use a clickable Figma if the interaction matters more than the functionality. The goal is learning, not a demo, and users give you way better feedback when it's clearly rough because they feel safe telling you it's bad.
  - **yeezyforsheezie** (2↑): There’s a pretty well-documented pattern in UX research: when you show something polished, people tend to shift into evaluation mode, like critiquing UI, wording, and flows, rather than exploring the underlying problem.

That makes high-fidelity great for evaluative research (“does this solution work?”), but less reliable for generative research (“what problem is worth solving?”).

Lower-fidelity artifacts (or even just conversations) tend to keep things more abstract and invite people to shape the problem space instead of reacting to a specific solution.

That said, the original research was done in a very different context. Users today are far more familiar with digital products and UX patterns, so I’m not sure the effect is as strong or as one-directional as it used to be.

My current take is that fidelity doesn’t determine quality of insight as much as it determines the mode of feedback you get:

• Low-fi → more exploratory, co-creative input

• High-fi → more concrete, evaluative feedback
- **Legitimate_Key8501** (2↑): The fidelity trap is real here. Teams either wait until the prototype is too polished to get honest feedback, or they go so rough that users can't separate the idea from the execution. The sweet spot I've seen work is interactive Figma with real copy but clearly rough visuals - users engage with the concept but don't get attached to the interface.
- **GeorgeHarter** (1↑): I THINK you are saying that you have acces to data that would be valuable to people at other businesses. 

Do you think you can sell these reports?
How much will the customers pay?

You need to make a business case that describes how your idea will help customers, how much demand there is 
Then, conservatively, estimate costs and how much profit your company will make fom this new product.
  - **scottishbee** (1↑): Not quite.  These are existing customers, getting a new feature. 


You're of course right we have to make the business case, as for any feature.


The friction, to me, is that even after getting the greenlight the staffing alignment is like playing Frogger.
    - **GeorgeHarter** (2↑): OK, I understand. The challenge is getting the funding for staff. 
I think that means that management doesn’t trust that the likelihood of success in selling the new product is high enough for the requested $. 

I would suggest a closed end or phased pilot. 
First find a couple of existing customer that agree to pilot IF you can get a pilot approved. 

Try asking for enough $ for a 3 month contract developer who is skilled at vibe coding and in integrating LLM functions. You need to account for the labor and the LLM tokens for use by 2-3 customers. 

If the pilot customers are willing to pay an acceptable price beginning at the end of the pilot, then you would get $ to maintain/improve the product for a year. If profitable then, it gets ongoing budget.
