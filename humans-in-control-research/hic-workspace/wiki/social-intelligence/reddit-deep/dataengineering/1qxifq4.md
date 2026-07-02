---
id: social-intelligence/reddit-deep/dataengineering/1qxifq4.md
url: "https://www.reddit.com/r/dataengineering/comments/1qxifq4/is_classic_data_modeling_scds_stable_business/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Is classic data modeling (SCDs, stable business meaning, dimensional rigor) becoming less and less relevant?"
author: "Likewise231"
date: "2026-02-06T14:02:24.000Z"
score: 125
upvote_ratio: 0.96
num_comments: 39
flair: "Discussion"
extracted_at: "2026-06-29T14:40:47.216Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c0"
    char_span: [0, 1613]
    sentence_count: 7
    key_terms: [teams, modeling, data, business, dataengineering, meaning, organizations, consistently]
    concepts: [teams, modeling, dataengineering, business, organizations]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c3"]
    token_count: 345
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1qxifq4/is_classic_data_modeling_scds_stable_business/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c1"
    char_span: [1627, 3508]
    sentence_count: 19
    key_terms: [people, query, data, because, model, "i'm", run, business]
    concepts: [people, query, because, model, business]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c5"]
    section: Comments
    token_count: 414
  - id: "social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c2"
    char_span: [3510, 5771]
    sentence_count: 13
    key_terms: [people, statements, data, architecture, eventually, understand, spaghetti, business]
    concepts: [people, statements, architecture, eventually, understand]
    section: Comments
    token_count: 474
  - id: "social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c3"
    char_span: [5773, 7815]
    sentence_count: 13
    key_terms: [modeling, data, time, business, consistency, dimensional, everything, leadership]
    concepts: [modeling, business, consistency, dimensional, everything]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c0", "social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c4"]
    section: Comments
    token_count: 394
  - id: "social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c4"
    char_span: [7817, 9706]
    sentence_count: 12
    key_terms: [modeling, dimensional, data, enough, companies, concepts, instead, better]
    concepts: [modeling, dimensional, enough, companies, concepts]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c3"]
    section: Comments
    token_count: 409
  - id: "social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c5"
    char_span: [9708, 11442]
    sentence_count: 12
    key_terms: [business, people, terms, data, tool, different, problem, product]
    concepts: [business, people, terms, different, problem]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c1"]
    section: Comments
    token_count: 363
  - id: "social-intelligence/reddit-deep/dataengineering/1qxifq4.md#c6"
    char_span: [11444, 12108]
    sentence_count: 3
    key_terms: [data, start, warehousing, everything, raginjason, deploying, designing, sleepless]
    concepts: [start]
    section: Comments
    token_count: 164
---
# Is classic data modeling (SCDs, stable business meaning, dimensional rigor) becoming less and less relevant?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1qxifq4/is_classic_data_modeling_scds_stable_business/)
Posted by **Likewise231** · **125↑** · **39 comments**

I’ve been in FAANG for about 5 years now, across multiple teams and orgs (new data teams, SDE-heavy teams, BI-heavy teams, large and small setups), and one thing that’s consistently surprised me is how little classic data modeling I’ve actually seen applied in practice.

When I joined as a junior/intern, I expected things like proper dimensional modeling, careful handling of changing business meaning, SCD Type 2 being a common pattern, and shared dimensions that teams actually align on — but in reality most teams seem extremely execution-focused, with the job dominated by pipelines, orchestration, data quality, alerts, lineage, governance, security, and infra, while modeling and design feel like maybe 5–10% of the work at most.

Even at senior levels, I’ve often found that concepts like “ensuring the business meaning of a column doesn’t silently change” or why SCD2 exists aren’t universally understood or consistently applied. In tech-driven organizations it is more structured, but in business-driven organizations it's less structued (Organization I mean ±100-300 people organization).

My logic is because compute and storage got so much cheapier over the years, the effort/benefit ratio is not there in as many situations. Curious what others think: have you seen the same pattern?

## Comments

- **JonPX** (132↑): And then people wonder why data projects are so prone to failure.
- **cream_pie_king** (116↑): Yes.

It's because individual teams spin up their own analysts. Which then brute force their way into basically being shadow engineers. All in the name of "faster time to insight".

Problem is, people leave, people shuffle around, people get promoted. No one aligns on what the metric really should be.

It eventually blows up in everyone's face when multiple versions of the same number hit the desks of execs and the board.

These embedded analyst fiefdoms resist change and take it as a personal insult when you tell them their 5000 line query that feeds one report is garbage, not scalable, and you can't run a business like this. 

You're then targeted as slowing things down for trying to put real rigor into the data platform.

I'm leaving an environment like this in a week. For a greenfield opportunity to build the stack from scratch precisely because I'm tired of this bullshit.

I don't care about the minor and bootcamp you took in SQL and Python. That shit can't run a multi billion dollar business long term.

Hell I'm seeing intern built "data science" workloads being deployed. They're "version controlled" in SharePoint and run locally to push to reporting. When we push back it's our fault.
  - **hectorgarabit** (52↑): > take it as a personal insult when you tell them their 5000 line query that feeds one report is garbage

Some head of Analytics / BI told me, when I proposed some dimensional modeling that they were not interested in "philosophy". Their model is chaos and they spin countless hours untangling their spaghetti data model. They feel smart because they wrote a 1000 lines SQL query or Python notebook. They don't understand that they would be a lot smarter if their model was clean enough, so the same query only took 10 lines...

The main issue IMO is that many people come from a non-technical background, and they don't understand how data model, architecture solve the vast majority of development problems.
  - **calaelenb907** (3↑): Well, when you started with a green field to build an analytical system eventually you'll face the same problems you mentioned previously. People will like how your reports are accurate, faster and easier to navigate then previous ones but eventually they will target you as a person that slow things for put real rigor into the data platform yadada. Business people will act as business people even if the project is new.
  - **domscatterbrain** (5↑): I always warn my manager to not to give users the freedom of running their own statements. Just drag and drop filters and pivot in their own custom dashboard is more than enough.

Today by the power of chatgpt, they start creating more spaghetti. Their submitted statements looks very structured at a glance. But since, they don't give enough contexts to prompt and just copying their costly statements as is and  simply said "this query is slow, optimize it", the result is just anInstagramable spaghetti.
- **tophmcmasterson** (15↑): No. 

There are lots of people who don’t understand it and brute force implement sloppy bad practices for ad-hoc reporting. 

And then inevitably end users end up upset that the data is inflexible, report builders in tools like Power BI are seeing unexpected results, they need to make a new table or view every time they want to cross analyze things across tables, etc. 

And then the org calls on the person or consultant that actually understands data modeling to figure out where things went wrong. Or they just continue the cycle. 

It’s not that it’s less relevant, it’s that there’s a huge number of developers who never understood it in the first place and think it’s not relevant because compute is faster and storage is cheap when those were never the main reasons to create a dimensional model in the first place.
- **El_Guapo_Supreme** (10↑): I agree with a lot of this, except the last bit about the effort to benefit not being there because of cost. You are right that compute got so cheap and efficient that people can be sloppy about architecture. 

But the benefit still far exceeds the costs. The problem is leadership has a bias for action and expediency. It's hard to explain the proper modeling and architecture will make everything faster and easier down the road. 

But will you get a reward for taking longer to do it correctly or fix what's broken? No. And if you have a great model, you'll never be able to point to problems that never manifested and how much time you saved. To the business it looks like you just took a long time.
- **123456234** (38↑): A few forces are pushing modeling out of the center:

* Storage and compute keep getting cheaper, so the pressure to model everything 'correctly' up front is lower.
* Dimensional modeling isn’t valuable by itself. Its real value is allowing systems to adapt as business meaning changes over time, and that benefit is easy to defer.
* Tech debt is real, and under delivery pressure the cleanup backlog rarely wins. Even when modeling could be part of the design, timelines usually cut it first.
* Storing source data indefinitely is becoming common, which makes replaying historical transformations feel like an acceptable substitute for managing change semantics.
* Data teams are increasingly embedded in business units. Without a central steward, consistency across domains erodes even when the same underlying data is reused.
* AI increases speed and lowers the cost of repetitive work, which further shifts effort toward shipping and iteration rather than integration rigor.
* The idea of a single source of truth still matters philosophically, but if leadership doesn’t care when numbers don’t line up exactly, it’s hard to justify enforcing it.

The common thread is that modern data systems are optimized for reversibility rather than correctness. Cheap compute, infinite retention, replayability, and AI assisted iteration all increase tolerance for semantic drift. Dimensional modeling still addresses that problem, but its value only materializes when the organization is forced to care about consistency over time. 

Modeling is rejected in favor of these other mechanisms which isn't a better approach but it does align with the systems that are readily available.
  - **raginjason** (3↑): I would add to point 2 (and have done so in my organization): having a vocabulary  that every one can learn instead of being some home-grow data slop is tremendous value. If you don’t do dimensional modeling (which in reality is the only kind of modeling we use as DE), then people are calling the same concepts different words. Or mashing concepts together in a haphazard way.

If it were “dimensional modeling vs some other modeling” I would be interested in discussion. It’s pretty much “dimensional modeling or no modeling”, which I don’t have the patience for. This was solved over 20 years ago. The hubris of teams and organizations to think they know better than established practice is amazing to me, although extremely common.
- **RoomyRoots** (9↑): LOL, no. The problem is that many companies think they are or they must be like FAANG sized ones with data projects to be successful with data products.

In the past 20 years most of the companies I worked wouldnt even be considerable to Big Data solution but still they would sink lots of money to try to mimic it.
- **ding_dong_dasher** (5↑): No they're just as relevant as before, it's just that enough platform engineers are clueless enough to not realize that this same failure-state has existed in our domain forever.

It's just in 2003 analysts were circumventing Oracle-based DW's in Excel instead of DS's marring your precious DBX deployment with AI slop.

It points to the same root cause of there having been a business need for something that the existing environment couldn't serve quickly enough. Nobody is going to tell some SVP who needs an answer yesterday that your first step is to attend the DE team's next backlog grooming session lol.

That's always going to happen and is just a reality of operating platforms used for decision support, if it feels like an adversarial thing you're probably looking at org dysfunction, not an architectural problem. Digesting analytical output and turning it into a mature reporting product is a pretty normal responsibility for data teams, imo.
- **Rovaani** (3↑): Infinite storage and compute won't help solve the problem if sales, manufacturing and logistics can't agree on what a  "product" or "customer" is or isn't and when their respective operational systems reflect that dichotomy and use different terms for same things ans same or similar terms for different things.

To solve that you need data modelling. Introduce your own terms or concepts if need be and map the source models to that. Then you can escape the trap of trying to understand several incompatible data models simultaneously just to feed the next dashboard.
- **konwiddak** (3↑): So I work for a company which several years ago purchased a drag and drop ETL tool, and handed out licenses to anyone who asked. It's an absolute mess. The tool is very expensive, and people have built these business critical monstrosities. There are workflows with over 70 inputs and outputs. IT wasn't really keeping tabs on the tool and are shitting a brick now they've realised what's out there propping up the business.

Fortunately there was a leader who let a few of us in the background do things properly. We've been unpicking one segment of the business for about 3 years now - and we're just finally getting to the point where people are going "oh wow we get it now". However, it's a constant battle to keep things under control and lots of people see us as the enemy.

If you can start well, do start well.
- **kxlx_rxvi** (3↑): I'm an entry level data engineer who started working a few months back, took courses on data warehousing and data modeling during college learnt the basics of SCDs, designing schemas and everything and loved doing it as hard as it was but haven't used any of these concepts even once so far at work.
Makes me wonder why I spent sleepless nights learning all of these.
  - **Data_cruncher** (2↑): I’ve said it before and I’ll say it again: the value of Kimball only shines AFTER you’ve tried deploying your first data warehouse.
    - **raginjason** (2↑): That’s pretty good. I may have to steal this one.
