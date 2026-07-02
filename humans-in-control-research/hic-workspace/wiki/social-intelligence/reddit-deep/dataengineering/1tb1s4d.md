---
id: social-intelligence/reddit-deep/dataengineering/1tb1s4d.md
url: "https://www.reddit.com/r/dataengineering/comments/1tb1s4d/maybe_i_am_not_cut_out_to_be_a_de/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Maybe I am not cut out to be a DE"
author: "Delicious-View-8688"
date: "2026-05-12T13:32:35.000Z"
score: 126
upvote_ratio: 0.94
num_comments: 55
flair: "Rant"
extracted_at: "2026-06-29T14:40:47.212Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1tb1s4d.md#c0"
    char_span: [0, 1293]
    sentence_count: 12
    key_terms: [work, data, dataengineering, right, consulting, comments, delicious-view-8688, fun]
    concepts: [dataengineering, consulting, right, comments]
    token_count: 294
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1tb1s4d/maybe_i_am_not_cut_out_to_be_a_de/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1tb1s4d.md#c1"
    char_span: [1295, 3307]
    sentence_count: 29
    key_terms: [data, different, failing, guy, change, trying, using, crap]
    concepts: [different, failing, change, trying, using]
    token_count: 446
  - id: "social-intelligence/reddit-deep/dataengineering/1tb1s4d.md#c2"
    char_span: [3321, 3462]
    sentence_count: 1
    key_terms: [resources, learning, community-submitted, dataengineering, automoderator, https, find, here]
    concepts: [resources, learning]
    section: Comments
    token_count: 33
  - id: "social-intelligence/reddit-deep/dataengineering/1tb1s4d.md#c3"
    char_span: [3464, 5473]
    sentence_count: 13
    key_terms: [github, delicious-view-8688, engineers, team, data, like, another, broader]
    concepts: [delicious-view-8688, github, engineers, another, broader]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dataengineering/1tb1s4d.md#c4"
    char_span: [5211, 5894]
    sentence_count: 7
    key_terms: [github, delicious-view-8688, job, specifically, department, parameters, beginning, daguito81]
    concepts: [github]
    section: Comments
    token_count: 173
  - id: "social-intelligence/reddit-deep/dataengineering/1tb1s4d.md#c5"
    char_span: [5896, 7390]
    sentence_count: 13
    key_terms: [like, advantage, doing, because, making, "it's", job, jobs]
    concepts: [advantage, doing, because, making, completely]
    section: Comments
    token_count: 390
  - id: "social-intelligence/reddit-deep/dataengineering/1tb1s4d.md#c6"
    char_span: [7392, 8816]
    sentence_count: 15
    key_terms: [delicious-view-8688, engineer, people, job, like, "couldn't", mistakes, multiple]
    concepts: [delicious-view-8688, engineer, people, "couldn't", mistakes]
    section: Comments
    token_count: 358
  - id: "social-intelligence/reddit-deep/dataengineering/1tb1s4d.md#c7"
    char_span: [8818, 9887]
    sentence_count: 12
    key_terms: [data, fix, compute, issue, chemical-knee-1182, get, "i'm", job]
    concepts: [compute, issue]
    section: Comments
    token_count: 275
---
# Maybe I am not cut out to be a DE

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1tb1s4d/maybe_i_am_not_cut_out_to_be_a_de/)
Posted by **Delicious-View-8688** · **126↑** · **55 comments**

I've had roles that spans Management Consultant, Data Analyst, Data Scientist, and as of a couple of years ago, a Data Engineer. Of these four titles I've held, DE is both the easiest and the hardest of them all. Let me explain.

Consulting is mainly interacting with clients. It can be hard at times, but it's a relationship thing. The hard part is trying to find meaning in the work, and instead looking into the abyss.

DA work was intense, fielding questions left and right, running statistical analyses, hoping you're sampling it right and using the right kinds of models and tests. It's fun, you form a deep understanding of the datasets you work with. I also liked explaining things in plain English for the stakeholders.

DS work was a bit of... busy fancy work that was going nowhere. Leadership just heard from some conference that data was the big thing and machine learning will solve all efficiency problems. It was fun in some sense, and it was the title I wanted, but it was like consulting, just with a different set of jargon and playbooks.

Now the DE title... yeah moving TBs of data, combining a bunch of different data using a bit of ML is all well and good, but I think with LLMs, the expectations are expanding. One day I am load balancing Opensearch clusters, then I am tweaking parameters for an ML model because the data distribution is different now. Then a client is asking about how to find shortest paths in a graph database, inbetween trying to rejig the CI/CD pipeline and updating the friggin' certificates and access tokens using terraform or opentofu or whatever the eff is set up to create them. Another week, you're wrestling with kubernetes and datadog to check why the heck authentication to the app is failing. Completely unrelated, Databricks decides to change default settings, and the data you think was going to be retained for a few more weeks have been wiped. Oh no, why is that ML job failing? What? AWS ran out of compute in the region? Crap, the dev team changed the API, let me update my python package, together with the unit tests. New data source, yay. What? un undocumented XML structure? I guess I'll just navigate that tree. Stakeholders want the same data, but aggregated differently. Sure. That's easy enough. Just after I help out with this other business proposal. Oh no, somebody else is trying to push a different change in the same codebase as that PR I'm waiting to get reviewed. Rebase, resolve conflict. Argh, I missed the release window, let me cherry pick, I always forget how to do that. Why is dbt checks passing in staging but failing in prod with identical data? Hmm, I should really review the blocking strategy for this record-linkage algorithm. Wait this dashboard looks different in Chrome compared to Edge. Lemme take a look at dev tools. Why ain't that javascript thing loading? Ah crap. Postgres migration failed... and I crashed GitHub.

It's tool overload, and with the range of tasks... I don't know if I am a stats guy, a software guy, or a cloud guy. Didn't realise so much was expected.

## Comments

- **AutoModerator** (1↑): You can find a list of community-submitted learning resources here: https://dataengineering.wiki/Learning+Resources

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **Lastrevio** (132↑): Why are you managing Kubernetes clusters and tweaking ML models as a data engineer? It sounds like you are doing the work of 3-4 people as a single person.
  - **proof_required** (30↑): I'm kind of in similar boat as OP. Doing lot of ML side, DE and Devops. With LLMs these boundaries keep getting broader and broader. We (my team) has no choice since we are all trying to keep our jobs.
    - **No_Lifeguard_64** (6↑): Are you looking for another job while you do this?
  - **KarmaIssues** (9↑): I do both of those things along with building ETLs. I'm not going to create a dependency on another team just to do something simple.
  - **Mindless_Let1** (9↑): Good engineers are generally fine handling multiple related domains
    - **Budget-Minimum6040** (4↑): ML is not a related domain though.
  - **EntertainmentAble533** (1↑): Sounds like it's more of a bad experience with that company rather than the data engineering role being hard.  Data engineers \*can\* work on infrastructure tasks if it's a small team, but a larger (and mature) company will have a dedicated MLOps/DevOps team. In general, do what makes you happy; job stress is not worth a pay bump imo
- **TheOverzealousEngie** (39↑): Not sure I've ever hear someone speak about such deep human purpose at the same time as vomiting 2 full paragraphs of some really good technobabble. Quite the contrast.
  - **Delicious-View-8688** (4↑): Haha. Sorry for the rant.
    - **idiots-abound** (5↑): It’s like you were keywording your post so it could get past the automated resume filter.
- **figshot** (31↑): You didn't crash GitHub. GitHub crashes GitHub.
  - **Delicious-View-8688** (7↑): I wish the best to those Engineers working at GitHub. Beginning to imagine what they must be dealing with and going through that all the issues are surfacing.
- **daguito81** (16↑): That’s because you’re not a DE. You’re an entire department. That’s why it’s so jarring. You’re not the guy that’s tweaking model parameters, that’s the DS job. How to query a database specifically I would say it’s the DA job you know “analyse the data in the DB” 
The Cicd stuff should be managed by a DevOps team unless it’s self service and you’re changing “your project” stuff. 

Kubernetes should be handled by the engineering team. Same with Datadog. 

You’re not a data engineer, you’re just the guy they’re taking advantage off
  - **Delicious-View-8688** (2↑): They decided to pay me well (like, wow), so I don't feel taken advantage of. And an increase in staffing will follow an increase in revenue they say... and revenue will go up right? the economy is doing great right?
    - **daguito81** (1↑): are you making 5x the salary of one of your peers? because you're doing 5 different jobs yourself, and burning out in the process. The evidence is you making this post. However if you're making that much, then sure, that's completely fair. 

We're just telling you why this jobs seems like it's insane compared to the other two. And it's because on the other two you were doing 1 job, or a couple. Here you are doing 5 jobs. 

10/10 times is the company taking advantage of someone being proactive and self-justifying "no no, I really like it like that" or the other one "I like it because I get to learn a lot!" (which is completely true, but still it should be 3-4 different people). 

I'm not talling you to quit or dislike your job. I'm also someone "taken advantage of" 100%.
- **Demistr** (14↑): It's just a job in the end.
  - **Big_Storage_94** (1↑): It’s not a lifestyle? lol
- **Shadowlance23** (25↑): Honestly, I like that about it. Always a new problem to solve, something new to learn, another fire to put out. Keeps me on my toes and I don't get bored.

It can get overwhelming though. Just today I was making stupid mistakes in the afternoon because it was a full-on day juggling multiple things and my brain was fried by about 3pm. I couldn't even write a Teams message without multiple spelling mistakes. Make sure you take some time out if you need it.
  - **Delicious-View-8688** (4↑): Yeah, there is that. I'd like the job to not bleed into 11pm and the occasional 4am or weekends though.
    - **Complex-Archer-853** (3↑): Then don’t. Whats the worst gonna happen. Fire you? Good, you’ll find another job with your skill set
    - **Quick_Assignment8861** (1↑): Work your own hours and let your PO manage the priority.
- **UnusualIntern362** (8↑): Bro you are DevOps Engineer, Data Engineer, DA and DS. You are the whole team! I am a DE and I’ve never managed kubernetes cluster, that’s infra stuff
  - **Delicious-View-8688** (4↑): We do have cloud people, ML people, backend/frontend people, and other more specialised roles too. I couldn't do what they do (not right now at least). It's just that perhaps DE has a number of touch points with those other areas, and it's not like they have engineer time to spare either.

So it starts with a benign thing like. Hmm, I need to scale up that compute cluster for that job I am about to run to push new data... I can submit a ticket and wait up to 24 hours (and risk missing the delivery date), or I can scale it up myself.

The log shows a few blips. Then your job fails. Wait, is this a data issue or a compute issue? Turns out it's a bit of both. You know the context, and you have an idea on how to fix it. Do you just fix the data side of the problem and raise a ticket to get the compute side of it fixed? Again, either wait up to 24 hours for it to get picked up and risk slipping deadline, or, do you go in and attempt a fix yourself? down the rabbit hole we go...
    - **Chemical-Knee-1182** (4↑): You sound like someone I would love to learn from.
- **tiktokbot12** (7↑): Couldn’t agree more OP
- **cakerev** (5↑): I feel you and with the age of AI. Now every dataset needs to be accessible to AI and optimally used by it as well. It feels like their has been a ground swell of what data engineering is in companies recently. Don't forget you have to have experience in every cloud, dbt, airflow, Databricks and snowflake. Learning on the job? that's for suckers. You are not alone man and daily I'm wondering how to step into a non-technical space because I'm struggling to keep up.
