---
id: social-intelligence/reddit-deep/salesforce/1s2corw.md
url: "https://www.reddit.com/r/salesforce/comments/1s2corw/marketing_cloud_next_is_awful/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Marketing Cloud Next is awful"
author: "GuinsooCow"
date: "2026-03-24T12:43:03.000Z"
score: 40
upvote_ratio: 0.91
num_comments: 57
flair: "help please"
extracted_at: "2026-06-23T20:32:01.764Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1s2corw.md#c0"
    char_span: [0, 723]
    sentence_count: 3
    key_terms: [marketing, cloud, encountered, next, salesforce, comments, seems, challenging]
    concepts: [marketing, cloud, encountered, salesforce, comments]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1s2corw.md#c6"]
    token_count: 167
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1s2corw/marketing_cloud_next_is_awful/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1s2corw.md#c1"
    char_span: [725, 3064]
    sentence_count: 8
    key_terms: [email, unified, data, lead, segment, graphs, mobile, individual]
    concepts: [email, unified, segment, individual, graphs]
    token_count: 512
  - id: "social-intelligence/reddit-deep/salesforce/1s2corw.md#c2"
    char_span: [2795, 3211]
    sentence_count: 1
    key_terms: [data, graphs, contactpoints, referenced, understand, bringing, probably, correct]
    concepts: [graphs]
    token_count: 98
  - id: "social-intelligence/reddit-deep/salesforce/1s2corw.md#c3"
    char_span: [3213, 3353]
    sentence_count: 2
    key_terms: [unflexible, marketing, reality, better, moment, cloud, guys, next]
    token_count: 32
  - id: "social-intelligence/reddit-deep/salesforce/1s2corw.md#c4"
    char_span: [3367, 5308]
    sentence_count: 16
    key_terms: [trondersk, mc-next, product, get, ses, customers, engineers, solution]
    concepts: [trondersk, mc-next, product, customers, engineers]
    section: Comments
    token_count: 495
  - id: "social-intelligence/reddit-deep/salesforce/1s2corw.md#c5"
    char_span: [5310, 6846]
    sentence_count: 9
    key_terms: ["it's", like, email, next, marketers, marketing, product, going]
    concepts: [email, marketers, marketing, product, going]
    section: Comments
    token_count: 391
  - id: "social-intelligence/reddit-deep/salesforce/1s2corw.md#c6"
    char_span: [6848, 8546]
    sentence_count: 9
    key_terms: [next, girlgonevegan, cloud, seems, data, like, mce, incredibly]
    concepts: [girlgonevegan, cloud, incredibly, salesforce, seems]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1s2corw.md#c0"]
    section: Comments
    token_count: 399
  - id: "social-intelligence/reddit-deep/salesforce/1s2corw.md#c7"
    char_span: [8548, 9124]
    sentence_count: 5
    key_terms: [formalwitness77, loud-variety85, kevincolumbus, consentmodel, alternative, engagement, gofast2038, salesforce]
    section: Comments
    token_count: 162
---
# Marketing Cloud Next is awful

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1s2corw/marketing_cloud_next_is_awful/)
Posted by **GuinsooCow** · **40↑** · **57 comments**

Coming from Marketing Cloud Engagement and moving to Marketing Cloud Next/Advanced, it seems like a huge downgrade from its predecessor. It feels so clunky and I can't believe this is next state of where Marketing Cloud is supposed to go. I'm not sure if it's because I just don't fully understand the platform yet but it seems there's some incredibly challenging issues I've encountered in some use cases. **Please let me know if** **anyone has encountered the same things and how they managed to work around it:**

* So if a business has a Salesforce CRM setup wherein a person could have several inquiries that come in as Leads, and that whichever email or mobile I used in that lead should be retained and what is always going to be used when communicating regarding that lead.
* Here's the problem: to use segments in Marketing Cloud Next, the Primary DMO must be Unified Individual, if you want to create Segment-Triggered Flows for your journeys. However, because Unified Profiles applies reconciliation rules, the Email Address and Mobile is almost never the same with the Lead Inquiry. If Last Updated, then if I try to campaign on a particular Lead criteria that ends up getting not the Last Updated Lead, then I've contacted them on a different email. If Most Frequent, then if I have a Lead I want a campaign email to but it's the only one with a different email but merged via mobile number, then it gets the wrong email again. If by Source, I don't even know which one it gets because they'd all be Leads.
* I've looked into Activation Templates as well, but all that does is define Contact Point Email Address of the Unified Profile to the same degree as the reconciliation rule, there is no option to Match the Record found in the segment.
* I know that the Spring '26 release now allows Individual DMO to be used in a segment in a flow, but the problem is that it doesn't allow Data Graphs to be used in conjunction with it. Data Graphs is what allows personalization and the flow decision to be easier, as it predefines the fields and data if I'm not mistaken. As a partner, I can probably find a way in the flow to do that, but then how would you expect non-SF savvy people to navigate around that? 
* What I've then had to resort on is to make Unified Indviduals 1:1 by matching on CRM ID, which defeats the entire purpose of Data Cloud's unification. But at the very least, I can ensure that each Unified Individual would reflect the contact points (email and mobile) of the segment criteria I want, and then I can just Rank and Limit it (but a tedious process to do each time there's a segment to create)
* I would still then be able to use Data Graphs, and the data graphs would always ensure that the correct DMO and contactpoints are referenced as they are simply 1:1 
* I understand this is not the best way to set it up and we'll probably have to revisit the model once we start bringing in other data sources, but as of the moment, that's all I can do or at least I think so.

Do you guys think there was a better way to do this? Or is this just the reality of how unflexible Marketing Cloud Next is as of the moment?

## Comments

- **trondersk** (42↑): Internally at Salesforce, all the solutions engineers hate working with MC-Next. All the sales and leadership want to push it, but the people who do the demo knows half of the stuff MC-Next promises doesn’t work, or doesn’t work as well as Engagement. It’s a disaster of a product.
  - **girlgonevegan** (5↑): ![gif](giphy|YVNZFUSKcsuyyiDczK)

Ugh. Appreciate the honesty though!
  - **rickvug** (2↑): I wouldn't say that all SEs hate working with it. It is actually far easier for Core SEs given existing knowledge. MC Next being a good solution to start with for customers who are immature with Marketing and already invested in CRM. There is something to be said about having one integrated platform. No doubt the product is early though. Lots of maturing to do.
    - **trondersk** (3↑): You’re right. I was referring to the Digital SEs who have worked on Pardot and ET in the past. Next will get there eventually. But it’s all Agentforce and Data360 smoke and mirrors right now.
    - **FormalWitness77** (2↑): Get out of here, fake Johnny Account Executive, stop trying to sell this nonsense to everyone.
  - **mscranton** (1↑): How much of that has been developed with an LLM vs actual engineers?
    - **trondersk** (4↑): I don’t have insight into that. We are just there to push the software, we don’t develop it. 

Most of our implementation partners have advised customers away from MC-Next as well.
    - **big-blue-balls** (3↑): That’s not the issue. The issue is the design and a team of PMs who never listened to what customer actually used MC for.
  - **ElectronicLet9845** (1↑): I think that was the case maybe a year ago but the product has come a long way in even a year. I do think SF pushes things before they’re fully ready but the amount of time and investment the company has made into the solution, it will only get better as more feedback is provided.
- **AromaPapaya** (19↑): IT SUCKS BALLS.

I have 15+ years on ExactTarget/MCE, and run a small SF partner agency and I HATE MCA.  it's not even remotely close to MCE feature wise and the dynamic content is DOG SHIT.

Sales knows it sucks, but their hands are tied.

The Product team thinks/states it's at par but these Product people obviously DONT DO EMAIL MARKETING.

/rant
- **HispidaAtheris** (16↑): You have just experienced the tip of the iceberg. It's not a production-ready platform yet, **especially** with that price tag.
  - **GuinsooCow** (6↑): It doesn't seem like it's going to be production ready in the next 1 or 2 years, it's like they jumped back to square one with this thing.
- **Feisty_Amphibian4436** (7↑): I’ve had some exposure to this and I feel your pain. Like, you just want to email a Lead with the email they submitted. How hard can that be!? But Salesforce forces you to setup all this bullshit to the point that I lose track of what the hell the point of each part is. Monumentally over engineered. It is quicker for me to integrate with a third party sender and just have it do what I ask than trying to wrangle MC Next.
- **Special-Ad-9828** (6↑): ![gif](giphy|iDJuQR0UmiqOI)

as a former MC consultant, lurking and reading the documentation and marketing materials SF is releasing...this is me when i come across a post like this...  
  
my brain is grappling to understand how this is going to make marketers lives easier. the data cloud layer. the fact that you have marketers in FLOW. i've already seen other  ¯\\\_(ツ)\_/¯ posts about Next. 

wild.
- **girlgonevegan** (11↑): I’m not sure who they designed MC Next for. I’ve been an enterprise Pardot admin for 6 years, and as clunky as it is, everything I’ve seen about MC Next seems at least 10X worse. It seems like it requires the expertise of a Data Engineer, but that’s insufficient if they don’t have Marketing Operations expertise. To top it off, the trend with the AI hype cycle is to offload high cognitive workloads like this onto “agents,” so getting caught up in this mess seems like a career killer.
  - **GuinsooCow** (12↑): I've worked with MCE and Pardot for years, and I've had my share of "wait I can't do that?" in both platforms several times, but MC Next is just literally that non-stop. I wish they would've opted to push first on Data Cloud integrated with MCE rather than completely pushing for MC Next BEFORE it stabilized.

Edit: The worst part about this is that, as a Partner, it's incredibly challenging enough for me, imagine any end-user who gets their hands on this. It's incredibly unintuitive.
    - **girlgonevegan** (4↑): Yeah I can’t even imagine. This is just Salesforce kicking their platform’s identity resolution problems down the road and attempting to force technical Marketers to keep dealing with it under a new shiny object.
- **spartyftw** (4↑): I’m currently evaluating running MC Next concurrently with MCE and MCAE (stupid names). I’m having difficulty even understanding their value prop besides “it’s the future of MC” and “AI”.
- **GoFast2038** (3↑): Dumpster fire... and Salesforce is trying to back folks into a corner by making it requirement to have a org with data cloud to even use the Marketing Cloud Next for Engagement features.

We are looking at going elsewhere after this contract. It probably makes the most sense for us since we don't use Salesforce as our Primary CRM. But still, what a disaster of a rollout this has been.
  - **FormalWitness77** (1↑): Is Marketing Cloud Engagement not a good alternative?
    - **GoFast2038** (1↑): It seems they're releasing only a few truly new features in MCE. It is starting to feel dated.
- **Loud-Variety85** (7↑): Well, Benioff is happily bragging that Ai is writing their code.....so I guess enjoy 🤷‍♂️
- **kevincolumbus** (5↑): CoNSenTMOdEL!! I hate it...
