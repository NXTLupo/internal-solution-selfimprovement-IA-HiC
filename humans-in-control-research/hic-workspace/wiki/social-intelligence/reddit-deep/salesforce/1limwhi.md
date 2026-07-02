---
id: social-intelligence/reddit-deep/salesforce/1limwhi.md
url: "https://www.reddit.com/r/salesforce/comments/1limwhi/which_salesforce_edition_should_we_get/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Which Salesforce Edition should we get?"
author: "Dry_Apple7391"
date: "2025-06-23T17:33:48.000Z"
score: 3
upvote_ratio: 1
num_comments: 25
flair: "getting started"
extracted_at: "2026-06-23T20:32:01.769Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1limwhi.md#c0"
    char_span: [0, 793]
    sentence_count: 5
    key_terms: [salesforce, cloud, marketing, personalization, experience, building, comments, use]
    concepts: [salesforce, cloud, marketing, personalization, experience]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1limwhi.md#c1", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c3", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c5"]
    token_count: 171
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1limwhi/which_salesforce_edition_should_we_get/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1limwhi.md#c1"
    char_span: [807, 2922]
    sentence_count: 18
    key_terms: [experience, cloud, salesforce, use, clients, partner, implementation, reps]
    concepts: [experience, cloud, salesforce, implementation, clients]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1limwhi.md#c0", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c3", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c5"]
    section: Comments
    token_count: 474
  - id: "social-intelligence/reddit-deep/salesforce/1limwhi.md#c2"
    char_span: [2924, 3540]
    sentence_count: 5
    key_terms: [tools, related, mobile, give, responsiveness, best-in-class, integrations, experiences]
    concepts: [tools, related, mobile]
    section: Comments
    token_count: 115
  - id: "social-intelligence/reddit-deep/salesforce/1limwhi.md#c3"
    char_span: [3542, 5863]
    sentence_count: 15
    key_terms: [salesforce, partner, enterprise, tax, cloud, requirement, help, work]
    concepts: [salesforce, partner, enterprise, requirement, cloud]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1limwhi.md#c0", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c1", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c4", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c5"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/salesforce/1limwhi.md#c4"
    char_span: [5591, 5947]
    sentence_count: 3
    key_terms: [partner, suspicious-nerve-487, cloud, best, work, experience, salesforce, business]
    concepts: [partner, cloud]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1limwhi.md#c3"]
    section: Comments
    token_count: 84
  - id: "social-intelligence/reddit-deep/salesforce/1limwhi.md#c5"
    char_span: [5949, 7850]
    sentence_count: 15
    key_terms: [experience, salesforce, cloud, edition, enterprise, through, documentation, requirements]
    concepts: [experience, salesforce, cloud, edition, enterprise]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1limwhi.md#c0", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c1", "social-intelligence/reddit-deep/salesforce/1limwhi.md#c3"]
    section: Comments
    token_count: 409
---
# Which Salesforce Edition should we get?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1limwhi/which_salesforce_edition_should_we_get/)
Posted by **Dry_Apple7391** · **3↑** · **25 comments**

We’re a small business looking to use salesforce for sales, but also want functionality to build websites within experience cloud. Do journey building with emails in marketing cloud and website personalization with the use of MCP. 

From a Salesforce CRM perspective - I’m seeing that Salesforce Pro Suite (100€ user/month) option is likely the best choice, but I’m not sure if it allows for building sites through experience cloud - can anyone confirm this? 

Am I correct in saying Marketing Cloud Engagement & Marketing Cloud Personalization are separate costs?

## Comments

- **BabySharkMadness** (8↑): Do you have an implementation partner yet? If so, reach out to them and they can help guide purchasing decisions.
  - **[deleted]** (5↑): I 2nd this. I'd offer a free consultation but we're US based so the time might be hard to nail down. If you have a partner, use them. Salesforce reps will oversell and lock you into a contract you don't need.

And yes, Marketing Cloud Engagement & Marketing Cloud Personalization are separate costs.
    - **Dry_Apple7391** (2↑): Thanks for this, I’ll look into an implementation partner. Yeah I’m worried of the upsell when talking to sales reps. But I see from another comment and online, Enterprise edition would be the likely option? Or Pro Suite, but the add on to build in experience cloud.
    - **Dilfaikadmi** (1↑): This….more people need to be aware about the practice of these salesforce reps or AEs
- **Leather_Mobile2058** (4↑): I wouldn't recommend experience cloud for building your main customer facing website. Typical use case is customer service or self service as that's what most of the built-in components are designed for. You will run into a lot of limitations if you want something flashy or modern.
  - **bugtank** (5↑): Ours is in experience cloud and I second your suggestion. The report chart components don’t even work properly. Avoid experience cloud for analytics use cases.
    - **Samwise336** (1↑): Can you elaborate on why you'd recommend staying away from Experience Cloud? I'd be interested in hearing the specifics of your experience or concerns.

We're currently exploring Experience Cloud as a potential hub for our clients (MASSIVE decision to make), with Salesforce as the backbone. Our main idea was to use Experience Cloud primarily as a "central point" for clients. They'd log in and see overall status, key details, and clear links directly to ShareFile (for secure file storage and e-signatures) and Suralink (for document checklists and workflows). The other objective was creating a real time chat feature that would give clients a way to engage with us easily while also tracking it automatically.

We also weren't looking to embed heavy-duty tools directly into the portal itself, just to give clients a simplified dashboard experience and then "smart link" out to best-in-class tools. We know from testing that embedding complex tools inside Salesforce tends to create headaches, especially on mobile, so we'd planned to avoid that by linking out.

Did you have negative experiences related to integrations, mobile responsiveness, or usability? Or is your hesitation more related to cost, complexity, or general client confusion? I'd really appreciate hearing more details, since these two comments give me pause.

We are a family office type firm that works in financial planning, insurance, tax, accounting, etc. The tax partner has used a tool called "Tax Dome" which apparently is awesome for tax work and blows our current tech stack out of the water. So, we're trying to replicate those features while creating a centralized structure that works for other business functions, too.
- **grogertheogre** (3↑): Anything less than enterprise and you're going to be hit with a million limitations.
- **Variant4133** (3↑): Push for enterprise at a discount w/ foundations if you haven’t discussed yet.  Gives you some lightweight functionality of the other clouds but won’t cause a reimplementation if you outgrow pro suite.
- **Radiant-Librarian196** (1↑): Salesforce is for enterprise and expensive. If you're a small business, you will pay for features that you would never use.
- **Legitimate_Cat5648** (1↑): Hey salesforce dev this side, yes MC engagement & MC personalisation are seprate cost. 
Regarding your website requirement , do you need a gated website or ungated. How much level of user interaction you have and how many users u are expecting, those aee main questions. You should check if u should have a experience cloud based site or a wordpress or other site can help u , u can still integrate that with salesforce , which is cheaper.
There are things you can get customised in salesforce by a partner rather than buying a product suite.
To be honest if you have clear cut plan for your requirements a salesforce partner can help you better than salesfoece AE.
If u are using salesforce for first time I would advice to start with simple edition and update later. Because once you paid for it salesforce do not refund if u go back to lower edition for current year. If u have more specific question you can ping me , i can even help you to get free consultation as well for your requirement for salesforce and also your needs from marketing to sales and analytics as well.
- **Current-Holiday8836** (1↑): I would agree with everyone else...talk to your SF partner and have them work with you on the best dev options.  If you don't have a partner we have done a lot of work with Experience Cloud and Sales Cloud. If you want to reach out we can provide a free consult on the best path forward.
- **Suspicious-Nerve-487** (1↑): Is there a specific reason you’re looking at Salesforce as a small business? 

They have SMB packages, but Salesforce is usually overkill for small businesses, and there are much cheaper options out there

Also - the minimum edition needed to actually create an Experience Cloud site is Enterprise Edition, so that should be your starting point. This is also available to search / look at in the online documentation

It’s going to be much easier to work with an account team at Salesforce to actually talk through your requirements and what is needed licensing wise
  - **Dry_Apple7391** (0↑): Thanks. Yeah the boss wants Salesforce. 

Yes the part about enterprise edition, I saw that in an ai overview so I wanted to check from other people experiences. 

Yeah figured that’s the best approach. Possibly using pro suite with the add-on of building sites through experience cloud.
    - **Suspicious-Nerve-487** (3↑): > Possibly using pro suite with the add on of building sites through experience cloud 

You can’t do that. That was the point of my comment, along with the blurb about the documentation. You need enterprise edition to create exp cloud sites.

Again, will be a lot easier for you to get in touch with Salesforce and review your requirements with an account team that will put together the appropriate licensing
    - **Dilfaikadmi** (1↑): Most of the time boss is trying to make a connection happy on the product side, so they go with spending huge amounts to buy an overkill tool this early.

Also, what’s the use case of your website that you are planning to launch from experience cloud.
- **stonediggity** (0↑): Experience cloud websites are trash. Why have you settled on Salesforce? There are so many good CRMs around for much cheaper. Highly recommend you chat with an implementation partner to really understand what you are paying for and if it is worth it.
- **Subject-League-3988** (0↑): Unlimited. It’s almost end of quarter. Give these AEs a break.
