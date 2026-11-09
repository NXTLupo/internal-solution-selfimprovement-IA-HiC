---
id: social-intelligence/reddit-deep/productmanagement/1odck22.md
url: "https://www.reddit.com/r/ProductManagement/comments/1odck22/sdlc_in_ai_era/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "SDLC in AI era"
author: "MeAndMCubed"
date: "2025-10-22T16:09:48.000Z"
score: 2
upvote_ratio: 0.63
num_comments: 18
flair: ""
extracted_at: "2026-10-09T16:37:15.731Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1odck22.md#c0"
    char_span: [0, 794]
    sentence_count: 5
    key_terms: [data, science, teams, productmanagement, comments, delivery, cannot, sdlc]
    concepts: [science, productmanagement, teams, comments, delivery]
    token_count: 180
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1odck22/sdlc_in_ai_era/","kind":"social-post","date":"2025-10-22","author":"MeAndMCubed","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1odck22.md#c1"
    char_span: [809, 3234]
    sentence_count: 26
    key_terms: [problem, model, data, through, initiatives, need, product, helps]
    concepts: [problem, model, initiatives, through, product]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1odck22.md#c2"]
    section: Comments
    token_count: 506
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1odck22/sdlc_in_ai_era/","kind":"social-post","date":"2025-10-22","author":"MeAndMCubed","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1odck22.md#c2"
    char_span: [3236, 4279]
    sentence_count: 7
    key_terms: [data, why-your-ai-product-needs-a-different, problem, model, point, playful-disk-9850, poc, sdlc]
    concepts: [problem, model, point]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1odck22.md#c1"]
    section: Comments
    token_count: 254
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1odck22/sdlc_in_ai_era/","kind":"social-post","date":"2025-10-22","author":"MeAndMCubed","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1odck22.md#c3"
    char_span: [4281, 6419]
    sentence_count: 16
    key_terms: [data, science, features, meandmcubed, traditional, team, work, investment]
    concepts: [science, features, meandmcubed, traditional, investment]
    section: Comments
    token_count: 456
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1odck22/sdlc_in_ai_era/","kind":"social-post","date":"2025-10-22","author":"MeAndMCubed","subreddit":"productmanagement"}]
---
# SDLC in AI era

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1odck22/sdlc_in_ai_era/)
Posted by **MeAndMCubed** · **2↑** · **18 comments**

For AI features, how are you adjusting the SDLC (or PDLC) to account for data science tasks. How are delivery timelines formulated when the apps and design teams have to wait on the output from data science teams? It is hard to predict the success and feasibility of data science initiatives - they cannot estimate how long it will take them to reach the quality threshold. Burnup charts cannot work for data science teams to measure delivery velocity. How has the way of working between teams changed now that the traditional triad (PM UX Engg) has evolved into a quad with Data Scientists in the mix?

## Comments

- **DeanOnDelivery** (2↑): This isn’t an SDLC problem. It’s a sequencing problem. I've seen too many teams get de-funded because they started by digging through piles of data looking for "something interesting," then build a speculative model,  and then toss it over the fence to product, hoping PM can find a market.  

That’s not product. That’s gambling with GPUs.  

Even if you move from SDLC to MDLC, you still start with the problem.  
Otherwise you’re wandering through data swamps without a map or a mission.  
You’re hunting an unknown object in a universe of haystacks.  
Instead, hunt a relatively identifiable needle in a much smaller, smarter pile of hay shaped by the problem.

Start with a real customer problem. Run discovery. Test value.  
If a model helps, great. Aim it at something that matters.  
Otherwise you’re just burning through someone's budget to make math nobody asked for.  

I’ve seen this more than once. Flailing AI initiatives I've been parachuted into, AI PM classes I teach, coaching gigs, whole teams of very brilliant data folks turned product people, all building fascinating things that unfortunately nobody wants to buy.

First lesson: hope is not a strategy.  
Second: customers don’t hire your model. They hire what it helps them get done.
- **Im_on_reddit_hi** (2↑): I find that Data Science initiatives tends to be a lot more ambiguous than traditional development work. 

Yes there’s complexity that Engineers can’t fully anticipate upfront, which typically ups the estimate but they usually mitigate that with a tech spike.

But for Data Science initiatives, usually they’re trying to solve a math problem and there’s components to this that’s outside of their control, particularly how much data they can get to pipe through the model to gain confidence it works. 

You as a PM can help your DS by reducing the problem space of what they need to explore which should help with creating more small units of progress. Eg being specific about scenarios you care more about or scenarios DS don’t need to worry about, that helps with reducing the need to see how the model function in certain cases.

Some DS has the tendency to work in an academic way ie they’re chasing for the “perfect statistical approach” vs a more iterative approach. You need to be pretty savvy and involved to know when a DS is stuck in a rabbit hole vs actually doing necessary work to improve the model.

TLDR: I’ll typically treat DS initiatives as more like us running experiments - start with a model POC, time is a checkpoint, not delivery timeline and communication focuses on learning, not what’s built. Once the model PoC shows results, then plan a proper development project around that.
- **Playful-Disk-9850** (3↑): You hit a very valid point. You switch from traditional sdlc to "AI SDLC" where "Data acquisition and exploration" is part of the intial diacovery stages before you trigger dev and UX teams. That's where you account for the data science activities.
  - **yeezyforsheezie** (6↑): Decent article from Lenny’s on this: https://www.lennysnewsletter.com/p/why-your-ai-product-needs-a-different
  - **DeanOnDelivery** (1↑): I don't disagree with your point about data discovery having to be added into the mix. 

However, I think I'd want to discover what problem we're solving for and for whom first.

Now, can we use data to help identify that problem? Sure, provided we understand the who and what you're trying to get done. 

Point is, putting  data diving in front of problem space painfully fast way to find out how fast the money runs out.
- **TechFlameMaster** (1↑): Think of it a little more generically. How would you handle, manage, and represent a dependency or blocker from any other team.
  - **MeAndMCubed** (1↑): True. The curve ball in this case is data science cannot predict the duration of their work or how quickly they will reach a quality threshold. Not sure if it’s lack of team experience or the inherent experimental nature of data science (or both). Traditional SDLC is based on work and effort estimates for dependencies. I’ve been contemplating heavier upfront investment in discovery cycles - would be a major organizational behaviour change. Looking to hear what changes others have implemented.
- **freezedriednuts** (1↑): This is a huge challenge. I think the biggest shift is realizing that the data science part often needs to be treated more like R&D or a discovery phase, separate from the predictable dev cycle. You can't really put a hard deadline on 'finding a model that works well enough.' It means the PM/UX/Engg teams need to start their work with more uncertainty, or have parallel tracks where the data science team is exploring while the others are building out the non-AI parts or preparing for integration.
- **forthelob** (1↑): What kind of AI features are you talking about specifically? Data scientists don't deliver LLMs or products on top of them. Are you talking about classifiers or other traditional AI features?
  - **MeAndMCubed** (1↑): AI capabilities in our commercial product - generation, summarization etc. The whole fine tuning and evaluation process behind it. What does your AI SDLC look like?
    - **forthelob** (3↑): It hasn't changed much. There's a prompting iteration step that happens nowadays pretty much right up until launch. We add more signals to measure user feedback on various AI assistance features and measurements on the outcomes they're supposed to help drive for users. There's some more investment to be done with how evals and automated testing is done but that's pretty much it.
