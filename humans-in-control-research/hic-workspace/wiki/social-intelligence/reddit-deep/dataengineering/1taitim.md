---
id: social-intelligence/reddit-deep/dataengineering/1taitim.md
url: "https://www.reddit.com/r/dataengineering/comments/1taitim/how_do_i_become_a_better_data_engineer/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "How do I become a better data engineer?"
author: "EmotionallyReboot"
date: "2026-05-11T22:34:00.000Z"
score: 133
upvote_ratio: 0.97
num_comments: 30
flair: "Career"
extracted_at: "2026-06-29T14:40:47.214Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1taitim.md#c0"
    char_span: [0, 756]
    sentence_count: 7
    key_terms: [dataengineering, comments, engineer, better, emotionallyreboot, data, "i'm", jobs]
    concepts: [dataengineering, comments, engineer, better]
    token_count: 179
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1taitim/how_do_i_become_a_better_data_engineer/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1taitim.md#c1"
    char_span: [770, 2832]
    sentence_count: 25
    key_terms: [data, issue, point55caliber, quality, stakeholders, checks, pipeline, always]
    concepts: [point55caliber, stakeholders, issue, quality, checks]
    section: Comments
    token_count: 467
  - id: "social-intelligence/reddit-deep/dataengineering/1taitim.md#c2"
    char_span: [2834, 4855]
    sentence_count: 15
    key_terms: [emotionallyreboot, something, data, edwardmitchell, teams, own, technical, problems]
    concepts: [emotionallyreboot, something, edwardmitchell, teams, technical]
    section: Comments
    token_count: 456
  - id: "social-intelligence/reddit-deep/dataengineering/1taitim.md#c3"
    char_span: [4857, 7129]
    sentence_count: 14
    key_terms: [data, didnt, job, like, experience, something, figuring, pipeline]
    concepts: [didnt, experience, something, figuring, pipeline]
    section: Comments
    token_count: 498
---
# How do I become a better data engineer?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1taitim/how_do_i_become_a_better_data_engineer/)
Posted by **EmotionallyReboot** · **133↑** · **30 comments**

I'm a 3YOE data engineer and I find myself not sure of how to:  
1) Grow into my career. I built some pipelines, managed some issues. Mostly around snowflake/python cron jobs/ airflow.

2) Understand newer concepts? I'm FAR from those godly DEs who have every call possible in spark memorized while they eat their daily masters degree in a framework which came out tomorrow. |

3) Show to management/switch jobs to get better positions in this economy? 

Any suggestions would be appreciated! Thanks in advance!

## Comments

- **point55caliber** (66↑): I’d say focus on these two things that go together. 

First is ownership. This can be things like stakeholder management and data contracts. Basically, make it clear something is owned and maintained by your team. 

Second is operational excellence. Is there monitoring in place?  Go beyond pipeline completion checks and have data quality checks that can be as simple as checking rows affected or as advanced as comparing data to a historic trend.
This is all to ensure SLAs are met.
  - **EmotionallyReboot** (2↑): I see, thanks!
  - **Gamplato** (1↑): Are data quality always an issue, no matter the maturity of the org? I’ve always been curious about how good DEs think about data quality monitoring.
    - **point55caliber** (2↑): I’m not experienced enough to know if it’s always an issue for all orgs.  

But what I have seen is stakeholders prodding us when data looks “bad” or “off”. So data quality checks (for a pipeline) helped us save time explaining to stakeholders that our queries are not wrong, and that there’s a larger application or business wide issue occurring. Overall, they’re like an automated audit.
- **joseph_machado** (28↑): Great points by point55caliber.

I'd also add 

1. Failure management. What happens when there is an urgent issue with your data? How do you keep stakeholders updated on progress?
2. Will your pipelines recover easily if there  is an issue with input data or your code? Will it require a lot of manual intervention? Can it be streamlined?
3. Requirements doc (which can be later converted to data contracts), which indicate SLA requirements, schema, what columns mean ,etc 
4. Standardize pipeline patterns. Do you see common issues across your pipelines, or is it time-consuming for a DE to build, test, and deploy code? Can you streamline this? 
5. Can you add effective DQ checks, unit tests for code, etc

Basically, make the company make more money (typically creating new datasets) or save time (streamlining processes). And these flow into good STAR points for your resume.

Hope these give you some ideas.
  - **EmotionallyReboot** (2↑): Thanks!
  - **LogicalEmploy3558** (1↑): You have some awesome reads on your blog.
    - **EmotionallyReboot** (2↑): bro please don't be a bot
- **Wh00ster** (4↑): Solve people’s problems. Sometimes they don’t even know what their problem is and you have to show them that something is a problem they have.
  - **EdwardMitchell** (1↑): This is great for working with non technical staff, but I struggle with communicating problems other IT teams. Solutions can sound theoretical and experimentation is always required.
- **EdwardMitchell** (4↑): FinOps is something forgotten by many teams. Saying that you save x dollars looks good on a resume.

Also learn to own your own time. Document patterns and delegate easy tasks to a new team member you’ve taken under your wing.  
Understand the director level priorities and focus on those. Only refactor if you can prove ROI.
  - **EmotionallyReboot** (2↑): Thanks!
- **Ok-Notice-737** (3↑): Underrated, explain your work in simple terms. Even non-tech guy understands it.
- **greenestgreen** (3↑): Read fundamentals of data engineering and see in which areas are you lacking :)
- **patrikdev** (3↑): The best thing Ive seen people do is niche down on something. For example financial data, vulnerabilites data, sales data. Whatever that is you work with the most and feel closest to.

  
This way you can actually become expert in something and advice managers how to better manage their teams, set goals, improve processes and so on.

  
This way you could even start your own consultancy firm and share the specific "know-how" inbetween companies.

  
If you want to go more on the technical side, just study more, create some persona projects, be more initiative with architectural decisions in your team, for example propose some changes, reason, explain and get it approved. This way you can get more profound experience under your belt and can easily transition into solution architect or senior DE roles.

Memorising syntax might look cool and you will probably impress people, its not really the moat, although for example optimizing slow queries and so on might be but the stakeholder wont understand the importance of it anyway, you will gain respect among your peers.
- **Stev_Ma** (2↑): You’re honestly doing better than you think. Most good DEs are not walking encyclopedias of Spark APIs or learning every new framework the second it drops. What really helps you grow is getting stronger at fundamentals like SQL, data modeling, pipeline reliability, debugging, and understanding how production systems behave. I’d focus on going deeper in one ecosystem for a while instead of trying to learn everything at once. Since you already use Snowflake and Airflow, platforms like dbt, Databricks, Kafka, and AWS or GCP data tooling are all solid next steps depending on what interests you. Also try to build impact stories around things like improving pipeline performance, reducing cloud costs, or making systems more reliable because that is the stuff that actually helps with promotions and job switches.
- **moshujsg** (2↑): I learned programming at my first real de job (before i had 2 years of basically nothing, really) and 3 years later im unnoficially the lead data engineer at my nee company (data team didnt exist, now its 2 soon to be 3 of us).

I got to where im at by just figuring things out. I didnt know how to program, but i built things to improve the developer experience, and kept doing that without anyone asking, my curiosity lead me to learn more, and my boss started realizing and gave me lore reaponsibility. At my new job, i came in and we didnt have anything for data engineering, so i just started figuring out what to do, and thats it really.

I didnt have a lot of experience with aws, or building apis, or dealing with stakeholders, but i have the willingness to try, so i do it and it works and people are happy.

I guess what im trying to say is, it doesnt matter whether you know something or not. It just matters if you cak figure it out.

You dont need to know a lot in order to build something. You just need to simplify the process and at each step resolve the problems that arise.
- **Honest-Hospital1142** (2↑): Do lots of certifications
