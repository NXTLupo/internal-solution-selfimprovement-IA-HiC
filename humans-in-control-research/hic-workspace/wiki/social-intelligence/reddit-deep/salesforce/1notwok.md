---
id: social-intelligence/reddit-deep/salesforce/1notwok.md
url: "https://www.reddit.com/r/salesforce/comments/1notwok/the_5_stages_of_sales_architecture_for_revops/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "The 5 Stages of Sales Architecture for RevOps (From Stripe to CPQ)"
author: "WBMcD_4"
date: "2025-09-23T21:25:11.000Z"
score: 2
upvote_ratio: 0.58
num_comments: 5
flair: "admin"
extracted_at: "2026-06-11T18:58:38.963Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1notwok.md#c0"
    char_span: [0, 2271]
    sentence_count: 16
    key_terms: [architecture, products, salesforce, companies, renewal-architecture-ebook, https, sales, www]
    concepts: [architecture, products, renewal-architecture-ebook, salesforce, companies]
    token_count: 505
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1notwok/the_5_stages_of_sales_architecture_for_revops/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1notwok.md#c1"
    char_span: [2285, 3665]
    sentence_count: 12
    key_terms: [manually, quotes, feeling-average4024, "don't", data, "it's", love, automatically]
    concepts: [manually, quotes, "don't"]
    section: Comments
    token_count: 324
---
# The 5 Stages of Sales Architecture for RevOps (From Stripe to CPQ)

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1notwok/the_5_stages_of_sales_architecture_for_revops/)
Posted by **WBMcD_4** · **2↑** · **5 comments**

I've worked and scaled sales architecture at SaaS companies with very few products and seen how much you can build first hand with Sales Cloud. At the same token, I've worked with clients that have an insane complex array of products that require bundling and order management. 

What I've come to realize is that the sales architecture that is needed by a company generally depends on the company's maturity and the industry that they operate in. Some industries by their nature just sell way more products. Other industries sell way fewer products. 

Typically SaaS companies in their early stages sell fewer products, but as they mature they start to commoditize their products and package them in a way where they can be bundled or discounted alongside other line items. 

Companies systems will evolve over time and you need to build according to your company's size and product complexity. That being said, a lot of people have no idea that there is even a base level of architecture that they need to properly manage subscription services. 

This is why I made this video because it explains the five stages of sales architecture that a growing company will go through. I think it might clear up some confusion in this area. I think a lot of people aren't educated on this topic because none of this comes out of Salesforce out of the box. 

But Salesforce CPQ is built in sort of an over complicated way for a lot of companies. 

Here's the video: [https://www.youtube.com/watch?v=DDm7iqpmL0Q](https://www.youtube.com/watch?v=DDm7iqpmL0Q)

You probably only need to watch the first four minutes. To get a good understanding of what I'm trying to communicate. Please let me know what your thoughts are!

Lastly if you want to checkout my free eBook, where I outline the base level of architecture required when you start to sell annualized contracts, check it out here: [https://www.brendanmcdonald.co/resources/renewal-architecture-ebook](https://www.brendanmcdonald.co/resources/renewal-architecture-ebook)

## Comments

- **Traditional_Side2555** (2↑): Love the “ladder” framing. Especially your point about introducing Opportunities + Contracts and renewal tracking before jumping into price books and quotes, that sequencing prevents a ton of rework. 

Also liked the clarity on when negotiated quotes/approvals become necessary vs. when a lean setup still works. 

Super helpful way to self-assess maturity!
  - **WBMcD_4** (1↑): Thank you!
- **Feeling-Average4024** (0↑): I'm the RevOps manager at a small SaaS company and I can confirm that most tools don't handle deduplication well, even when they promise to. I really needed something that actually merges or enriches our data intelligently, plus it also shouldnt overwrite existing data unless it's verified. Got a chance to try Full⁤enrich and observed that it wor⁤ks quietly in the background. I had to go back and see if it did the things i wanted. Thankfully, those concerns can be laid to rest. So now i don't have to manually trigger anything but only run a tool as part of my workflow to keep HubSpot contacts consistent. Before this, I was manually exporting lists to clean them in Google Sheets. Now everything just updates automatically. It's
  - **WBMcD_4** (1↑): Gottta love automated AI comments on reddit that have nothing to do with the actual post!
- **WBMcD_4** (-1↑): Actually comment if you have an opinion on this please!
