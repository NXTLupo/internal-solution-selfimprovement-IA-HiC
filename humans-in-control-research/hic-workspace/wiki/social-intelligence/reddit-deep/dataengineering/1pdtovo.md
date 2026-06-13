---
id: social-intelligence/reddit-deep/dataengineering/1pdtovo.md
url: "https://www.reddit.com/r/dataengineering/comments/1pdtovo/is_data_engineering_becoming_the_most_important/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Is data engineering becoming the most important layer in modern tech stacks"
author: "TheTeamBillionaire"
date: "2025-12-04T07:17:03.000Z"
score: 140
upvote_ratio: 0.91
num_comments: 38
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.214Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1pdtovo.md#c0"
    char_span: [0, 1147]
    sentence_count: 6
    key_terms: [engineering, data, dataengineering, analytics, companies, becoming, comments, teams]
    token_count: 223
  - id: "social-intelligence/reddit-deep/dataengineering/1pdtovo.md#c1"
    char_span: [1162, 2728]
    sentence_count: 11
    key_terms: [data, engineer, value, company, bringing, probably, "don't", perfectly]
    section: Comments
    token_count: 345
  - id: "social-intelligence/reddit-deep/dataengineering/1pdtovo.md#c2"
    char_span: [2730, 4303]
    sentence_count: 7
    key_terms: [one-man-who-can-do-the-work-of-an-entire-it-department, want, engineering, like, pay, possible, certain, "that's"]
    section: Comments
    token_count: 398
  - id: "social-intelligence/reddit-deep/dataengineering/1pdtovo.md#c3"
    char_span: [4305, 5842]
    sentence_count: 10
    key_terms: [data, engineering, teams, because, shift, governance, understand, ownership]
    section: Comments
    token_count: 319
  - id: "social-intelligence/reddit-deep/dataengineering/1pdtovo.md#c4"
    char_span: [5844, 7010]
    sentence_count: 6
    key_terms: [data, company, project, seeing, theoverzealousengie, car, like, oil]
    section: Comments
    token_count: 271
  - id: "social-intelligence/reddit-deep/dataengineering/1pdtovo.md#c5"
    char_span: [7012, 8619]
    sentence_count: 10
    key_terms: [data, engineering, companies, important, fit-employee-4393, been, core, "i'll"]
    section: Comments
    token_count: 358
---
# Is data engineering becoming the most important layer in modern tech stacks

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1pdtovo/is_data_engineering_becoming_the_most_important/)
Posted by **TheTeamBillionaire** · **140↑** · **38 comments**

I have been noticing something interesting across teams and projects. No matter how much hype we hear about AI cloud or analytics everything eventually comes down to one thing the strength of the data engineering work behind it.

Clean data reliable pipelines good orchestration and solid governance seem to decide whether an entire project succeeds or fails. Some companies are now treating data engineering as a core product team instead of just backend support which feels like a big shift.

I am curious how others here see this trend.  
Is data engineering becoming the real foundation that decides the success of AI and analytics work  
What changes have you seen in your team’s workflow in the last year  
Are companies finally giving proper ownership and authority to data engineering teams

Would love to hear how things are evolving on your side.

## Comments

- **Crazy-Sir5935** (54↑): Ask yourself, when does hiring a data engineer increase business value? 

The value of having data engineers scales on 4 axis i would say: 

1) How much dependent is the company on data (f.e. a bakery probably doesn't give a shit), 

2) How big is the company in terms of data sources (lots of sources -> more value to bringing in a data engineer)

3) How big is the company in terms of data users (more users -> value in central platform -> more value to bringing in a data engineer)

4) How fast paced is the data used in the company (faster -> more complex -> more value to bringing in a data engineer).

Yes, AI depends on good quality data but for just a small company they can just perfectly fine built something great without a data engineer (probably the data scientist/analist doing most of the cleaning).

I
  - **Ok_Carpet_9510** (30↑): >Yes, AI depends on good quality data but for just a small company they can just perfectly fine built something great without a data engineer (probably the data scientist/analist doing most of the cleaning).

And many data shops start out like that until you hit certain problems like performance, security, data volume, governance. The data scientists and data analysts focus on getting insights out as quickly as they can. They don't care too much about the plumbing. They don't care if the solution will scale. They may even build data pipelines that depend on their credentials. They often don't document how things work. They churn out value quickly I.e. insights..  until things break.

Data architecture.... who needs that, and then things break.
    - **Tacoma3691215** (6↑): Yeah.  It's like me with my house, DIY until you can't.  However, I don't get upset when a pro makes me pay them to tear out/down some bullshit that's already existing.
    - **QueryFairy2695** (3↑): I'm just starting... taking database classes and getting certs, and what you described here is what made me realize I want to go into data engineering, NOT DA.  I want to build a solution that scales. I want someone else to be able to follow what I've done because I've documented it.
  - **yiddishisfuntosay** (1↑): Could argue a bakery is able to increase production of certain breads that sell more frequently on certain days vs other days for  better inventory management too, for what that's worth. \*flies away\*
    - **BJNats** (7↑): Right, but you’re describing analytics, not engineering. Pretty basic transformations will work fine for them, as well hiding this out to a consultant who can copy-paste the last 20 times he has done this
- **AliAliyev100** (134↑): no
  - **Efficient_Shoe_6646** (42↑): Ya I think the shift they're referring to is from "back of house" -> mildly important

The main difference I see is that companies are frustrated they have to pay us like engineers.
    - **PeopleNose** (4↑): More like they don't understand the scope of work required for their asks

What they *want* is a one-man-who-can-do-the-work-of-an-entire-IT-department. Of course if I was a stakeholder, I *want* to pay as little as possible while gaining as much as possible...

But the people who don't understand what they're asking for will never understand what they're paying for... 😮‍💨
  - **boss-mannn** (10↑): Why?
    - **thinkingatoms** (4↑): I'm guessing because that's what they experience in response to OPs question
- **VisualAnalyticsGuy** (14↑): Yes, seeing the same shift. Teams are realizing flashy AI doesn’t matter if the plumbing underneath leaks, so data engineering is finally getting treated like the backbone instead of the help desk. Over the last year, workflows have moved toward product-style ownership: dedicated roadmaps, proper SLAs, and tighter loops with analytics and ML teams because everyone depends on the same foundation. And yes, the authority is catching up too, with data engineering getting a real say in architecture, tooling, and governance instead of cleaning up messes after the fact.
- **dataflow_mapper** (7↑): I’ve seen the same shift. Once teams start relying on anything ML or real time, the cracks in their pipelines show up fast and suddenly data engineering isn’t a background function anymore. The work becomes more about shaping the contract between producers and consumers and less about just moving data from A to B. That shift feels pretty fundamental.

The biggest change on my side is tighter collaboration cycles. DE gets pulled in earlier when a new product idea forms since everyone knows messy upstream data will kill the project later. Ownership has improved a bit too, mostly because teams finally realized they can’t bolt governance on at the end.

It still varies a lot by company, but the places that treat DE as a core layer tend to move faster and spend less time firefighting. Curious if you’re seeing that ownership gap close where you are or if it still feels like an uphill push.
- **TheOverzealousEngie** (14↑): Not really, but I am seeing an insane spike in data engineering drama queens  :)
- **nickchomey** (12↑): You're such a good data engineer that you scrubbed all non-period punctuation from your post.
- **Sad_Cell_7891** (11↑): no depends on your project the complexity the scope MVP, etc but can be a big factor. Think of it this way, if the intent of the project is for the company to implement AI software or be more driven the data component is like taking care of a car. The data you feed it is the fuel and oil. If you constantly put in bad gasoline and never change the oil, the car will still run for a while but over time, performance drops, parts wear out, and things start to break. In the same way, if your AI models are trained on low-quality, inconsistent, or noisy data, it will limit how accurate and reliable their outputs can be, no matter how much tuning you do under the hood.

But if you treat your car well use clean, high-quality data, keep things consistent, and regularly monitor and maintain your pipelines it will run smoother, perform better, and be far less likely to produce bad or unpredictable results. data engineering doesn’t magically solve everything, but it can massively improve what your AI capabilities
- **RandomFan1991** (16↑): Data Engineering always has been the unsung and unseen heroes of the data world. That being said calling it a core is a bit too much praise. It is no more a core than any other field in the entire chain from network engineers, devops, analysts to data scientists i.e. they are all critical for one reason or another. And skimping on one of them will quickly show the error of said choice.
- **mertertrern** (4↑): A data engineer can only do so much in an organization, and are not a silver bullet. I'll say this before, and I'll say it again: data quality and process integrity are EVERYONE's responsibility, from CEO to Janitor. It's as important as cyber security because it's the life blood of modern companies.
- **Fit-Employee-4393** (4↑): Each data role is equally as important. You can have a cracked data engineering team, but if there are no DE, MLE, BI or DA folks then all you have are some well designed databases with no impact. Basically these other roles rely on DE, but a DE’s work is fruitless if no one is there to use it.

I think data engineering is just a common point of failure for most companies so there has been more of a focus on it recently. Especially as companies try to do more complex things with ML/AI.
