---
id: social-intelligence/reddit-deep/productmanagement/1t4t4ob.md
url: "https://www.reddit.com/r/ProductManagement/comments/1t4t4ob/amplitude_buys_statsig/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Amplitude buys Statsig?"
author: "cafegalore"
date: "2026-05-05T21:31:20.000Z"
score: 35
upvote_ratio: 0.93
num_comments: 17
flair: ""
extracted_at: "2026-06-14T15:28:02.844Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1t4t4ob.md#c0"
    char_span: [0, 706]
    sentence_count: 4
    key_terms: [amplitude, amplitude-and-statsig-partnership, statsig, productmanagement, https, blog, com, comments]
    token_count: 163
  - id: "social-intelligence/reddit-deep/productmanagement/1t4t4ob.md#c1"
    char_span: [721, 1256]
    sentence_count: 2
    key_terms: [statsig, openai, like, experimentation, praying4exitz, acquisition, engineering, experiments]
    section: Comments
    token_count: 116
  - id: "social-intelligence/reddit-deep/productmanagement/1t4t4ob.md#c2"
    char_span: [1258, 3307]
    sentence_count: 15
    key_terms: [amplitude, statsig, openai, account, confident-climate139, sskates, email, been]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/productmanagement/1t4t4ob.md#c3"
    char_span: [3309, 5277]
    sentence_count: 11
    key_terms: [statsig, amplitude, product, code, transition, customers, engineers, integrate]
    section: Comments
    token_count: 443
---
# Amplitude buys Statsig?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1t4t4ob/amplitude_buys_statsig/)
Posted by **cafegalore** · **35↑** · **17 comments**

Just announced on the Amplitude blog: [https://amplitude.com/blog/amplitude-and-statsig-partnership](https://amplitude.com/blog/amplitude-and-statsig-partnership)

>Amplitude will maintain and develop the current Statsig platform across the cloud and data warehouse, including support for existing customers. Amplitude will also begin building a more integrated roadmap for the future of the Amplitude and Statsig platforms together. 

What do you guys think about Statsig post-OpenAI-acquisition?

## Comments

- **praying4exitz** (19↑): Seems like an amazing move for Amplitude since Statsig was best in class at experimentation and can help modernize the brand and platform for the more technical engineering and data science audience that is growing a lot due to agentic coding tools. 

I’m confused on what’s the play for Statsig and OpenAI… This makes it seem like the acquisition was purely an acquihire and that OpenAI has minimal intent to enter the experiments and product analytics space, which is great for focus to take on Anthropic. 

We’re huge Amplitude fans on our team. Full send on where they’re headed especially after this partnership!
  - **sskates** (1↑): thank you!
- **MistakeAmbitious3287** (6↑): I thought OpenAI bought them? Damn, what happened? I missed something.
  - **TrainingAccording807** (6↑): Sounds like OpenAI bought the talent but realized they don’t want to be running the business.
    - **Confident-Climate139** (1↑): Back then I thought OpenAI was trying to diversify revenue streams, so this move confused me as well. Why do they not poach the talent by offering bonuses or salaries ? I find this move very weird
- **Prestigious_Okra_791** (6↑): Got the email from our statsig rep today. Think it’s probably a good thing for the development of statsig with a parent more focused on experimentation than AI.  
From the email I received it sounds like all account management will be migrated over to the amplitude team?
  - **Confident-Climate139** (1↑): I wonder what will happen with the Statsig account managers ? Will they now manage OpenAI products or move to amplitude ?
    - **Prestigious_Okra_791** (1↑): I got an email for an intro with the account team at amplitude. Will find out more info next week
  - **sskates** (1↑): Amplitude is taking over all account management, the product, the brand. Statsig employees are staying at OpenAI. As you imagine we've been scrambling at Amplitude to make sure we're supporting every Statsig customer. I'd love your feedback on how it's been.
- **New_Marionberry4029** (1↑): Hey u/cafegalore, I'm a student applying for a PM internship at Amplitude and want to come in with real user insight rather than just my own takes. Mind if I ask you a couple of questions about how you've been using it?
- **forest-monger** (1↑): Anyone else having real statsig performance and latency issues, since the acquisition? We are routinely waiting 2+ days for data to fill in
  - **sskates** (1↑): Can you reach out to us directly so we can make sure it's fixed for your case? spenser at amplitude and curtis at amplitude

As we've been getting up to speed with Statsig's code base, they do a lot well, even better than Amplitude: experimentation, warehouse native, a more modern architecture, and there's a few places where they're behind: ingestion, data latency. There's a bunch of work we're doing to make it robust and I want to make sure we're hitting what you're running into.
- **desihokie** (1↑): This is actually really bad for Statsig customers and Statsig as a product/tool itself. If you read the first para of Spencer's note carefully on the blog, Amplitude is buying the Statsig brand, the list of accounts, and the product as-is. No data scientists, engineers or any other crucial statsig employees are going to Amplitude. So now comes the task for Amplitude engineers, DS to understand Statsig code and how the product works, integrate it with their suite of products and code and only then develop it further. This will be extremely difficult as there is noone from Statsig there to guide them on how the code works and how to integrate. Maybe Amplitude will pull it off, but it won't be easy. And until then, for Statsig customers, this will be a nightmare - as there are no mentions of how they will keep the current product running.
  - **SlightlyMusical** (3↑): It’s funny that you think Statsig is a product still being maintained and cared about by OpenAI.
  - **totoro_457** (2↑): Totally agree. My company is a (mostly) happy customer of Statsig and dissatisfied Amplitude customer. I’m not optimistic that Amplitude will do a good job of carrying the product forward.
  - **praying4exitz** (1↑): The blog literally reads: “Amplitude will also begin building a more integrated roadmap for the future of the Amplitude and Statsig platforms together. We’ll work closely with the Statsig team at OpenAI during the transition.”

So it seems like there will be a team that helps with the transition and code knowledge transfer instead of no support like you’re implying.
