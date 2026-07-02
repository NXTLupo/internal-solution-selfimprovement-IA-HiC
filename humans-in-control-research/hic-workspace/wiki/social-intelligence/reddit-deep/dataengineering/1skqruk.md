---
id: social-intelligence/reddit-deep/dataengineering/1skqruk.md
url: "https://www.reddit.com/r/dataengineering/comments/1skqruk/dagster_pricing_update_is_beyond_nuts/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Dagster Pricing Update is Beyond Nuts"
author: "annie_406"
date: "2026-04-13T22:50:18.000Z"
score: 88
upvote_ratio: 0.92
num_comments: 55
flair: "Rant"
extracted_at: "2026-06-29T14:40:47.213Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1skqruk.md#c0"
    char_span: [0, 898]
    sentence_count: 8
    key_terms: [dataengineering, pricing, plan, comments, credits, price, alternatives, orchestrate]
    concepts: [dataengineering, pricing, comments, credits, price]
    token_count: 212
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1skqruk/dagster_pricing_update_is_beyond_nuts/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1skqruk.md#c1"
    char_span: [912, 2537]
    sentence_count: 12
    key_terms: [friendly, decent, manage, needed, pretty, outside-childhood-20, "i'm", "it's"]
    concepts: [friendly, decent, manage, needed, pretty]
    section: Comments
    token_count: 389
  - id: "social-intelligence/reddit-deep/dataengineering/1skqruk.md#c2"
    char_span: [2539, 4022]
    sentence_count: 4
    key_terms: [run, ethan-codes-stuff, dagster, running, continuously, costs, rds, compute]
    concepts: [ethan-codes-stuff, dagster, running, continuously, costs]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1skqruk.md#c3"]
    section: Comments
    token_count: 423
  - id: "social-intelligence/reddit-deep/dataengineering/1skqruk.md#c3"
    char_span: [4024, 5819]
    sentence_count: 17
    key_terms: [jobs, oss, vroemboem, template, dagster, running, "don't", price]
    concepts: [vroemboem, template, dagster, running, "don't"]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1skqruk.md#c2"]
    section: Comments
    token_count: 478
  - id: "social-intelligence/reddit-deep/dataengineering/1skqruk.md#c4"
    char_span: [5821, 6816]
    sentence_count: 4
    key_terms: [ecs, iamlivan, dagster, config, need, yuki100percent, alternatives, orchestrator]
    concepts: [iamlivan, dagster, config]
    section: Comments
    token_count: 236
---
# Dagster Pricing Update is Beyond Nuts

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1skqruk/dagster_pricing_update_is_beyond_nuts/)
Posted by **annie_406** · **88↑** · **55 comments**

We are a startup and use Dagster's starter plan for our data pipelines, just got an email that they are changing the pricing model. We relied on the 30,000 credits included with the plan to orchestrate everything, which under the new plan...is completely gone. You now pay per credit - $0.035. So those 30,000 credits will now cost $1,050. The best part is that they only gave 2 weeks notice for this pricing to go into effect. I know these are not 5 digit numbers but the magnitude of the price change is crippling for us. Definitely the most hostile price increase strategy I've seen. Anyone want to share their favorite alternatives for what we should switch to?

## Comments

- **D3SL** (33↑): The first thing that stands out to me is that two weeks notice does not seem legal. Blindsiding people like this with potentially crippling financial penalties and not remotely enough time to avoid them is pretty textbook bad faith. I would love to see a decent judge's response to what basically amounts to a mugging.

Aside from that I'm also a one man show and I've been using self-hosted Windmill paired with self hosted Garage for basic S3. It's all local, runs on a VM with less resources than the average decent gaming computer, and I can manage it all via portainer. I do all my actual data munging in polars in-memory but you can also do a few flavors of SQL and numerous languages too.

For our needs it's a very user friendly setup. The lead developer is also a pretty friendly guy that's very active on their discord.
- **Outside-Childhood-20** (30↑): Dagster OSS? Except you pay for it in infra costs and maintenance
  - **annie_406** (28↑): I'm a one-woman team over here, gonna be hard to manage all the devops that entails
    - **kudika** (9↑): It can be intimidating. If I were you I would provision a VM, make sure to have backups/snaps enabled, and host whatever is needed on there until things grow organically--by then the team should have grown and you all can deliberately refactor as needed.
    - **Dark-Knight-27** (7↑): Just did this myself, and it is easier once you get going (I’m a one-man shop with a semi-technical background). The documentation is fairly light, and there’s many ways to set it up, but there is definitely an easy way to do it. Happy to chat if you’d like! 

Fwiiw it’s just docker container on ec2 and managed RDS.
    - **wannabe-DE** (6↑): It’s not too bad once you get it going. How many credits are you using a month now?
    - **iamlivan** (2↑): curious about your setup… what we did is just use ECS in AWS before one blocker that we had though was auth but managed that using cloudflare zero trust gonna be a pain though if you require RBAC
    - **ast0708** (1↑): I also manage dragster cluster on my own, it's not a lot of work after the initial setup
    - **Street-Individual446** (0↑): Claude+civo/k3s and you will never look back.
  - **themightychris** (2↑): I put together a fully GCP cloud run native Dagster deploy recently, might be one of the cheapest ways to run it: https://github.com/JarvusInnovations/gtfs-realtime-archiver/tree/develop/tf/modules/dagster
    - **ethan-codes-stuff** (1↑): Are you running the cloud run continuously or spinning down the instance after run?
  - **Morzion** (1↑): Hardly, deployed on AWS ECS and it costs around $2,000 a month
  - **Dark-Knight-27** (1↑): My infra costs are sub $100, mostly due to RDS cost
    - **ethan-codes-stuff** (2↑): Not sure how RDS helps with the compute costs in running EC2 instances? Compute is the most expensive part and w/ dagster you need to run the Daemon continuously
- **ardentcase** (10↑): I'm a team of one, running oss on esc/fargate. 20 pipelines ~100 GB of data per day. Only paying for Fargate (serverless) and S3, so it's as cheap as it gets. 

Almost no infra maintenance, would never consider a paid version.
  - **vroemboem** (1↑): Any tips on how to implement this? How much do you pay?
- **randomuser1231234** (8↑): 1,000 a month for JUST orchestration?
  - **toabear** (5↑): I recently changed jobs. The new job was using Qlik Talend as the orchestrator. They were paying $50,000 a year for it. They had six exceptionally simple jobs running. Basically just select and insert statements moving data from one SQL server DB to another. 

Even better, they also had a number of other oddball data mover jobs that execute via windows task scheduler. Super secure scripts that have all the passwords hard coded into them. 

I got rid of all that shit and just ran Dagster in  Kube  instead.
  - **Fluffy_CatLover** (2↑): That's what I'm thinking 😭
    - **annie_406** (5↑): the VP that came up with that idea clearly showing usual VP incompetence...as usual
- **Thatpersiankid** (3↑): Dragster OSS on railway is great
  - **kokofrank** (1↑): How hard is it to set it up on rw?
  - **Yabakebi** (1↑): They don't have a template for it though? (I don't plan to use it, but just curious)
  - **vroemboem** (1↑): Would you mind sharing the template?
- **YookiAdair** (3↑): I was always worried about going over the “free” credits just due to their original price. Now they really ripped the rug out from under all of us.

I just got finished with an OSS deployment. Thankfully we don’t need RBAC as it’s a small team. Just running Cloudflare One and tunnel. 

Annoyingly the CEO posted about having “the best quarter” ever in some sales-slop on LinkedIn. Mind you this is before these absurd price hikes.
- **akozich** (3↑): IMHO there is no equivalent to Dagster. Airflow with bunch of plugins might be close.

OSS was alway my first choice. 

Shamelessly plug here  - ping if need to move to your own instance
- **iamlivan** (11↑): claude code will definitely help just configure iam roles and permissions. we used terraform that time. if you worry about resource consumption dagster has a ecs config where you can use the decorator pattern to specify your expected memory. it also spawns ecs task per asset or job run. the only downside is if your image is big it takes around 30-1min to load.
- **Yuki100Percent** (2↑): I'd ask if you actually need a full featured orchestrator. 


As for alternatives, airflow and prefect come to mind. And they also have self hostable solutions like dagster does.
- **iamlivan** (2↑): we ran it for over a year. the setup was s3 and athena. I am no longer there now but last I heard they are still using it. the easiest thing we found was ECS config we predicted that since the service is new it might bite us in the back if price changed and it was easy for us to get approval predicting aws pricing.
