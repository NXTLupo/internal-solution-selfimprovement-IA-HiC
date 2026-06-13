---
id: social-intelligence/reddit-deep/bigdata/1qcv7aq.md
url: "https://www.reddit.com/r/bigdata/comments/1qcv7aq/moving_ibm_db2_data_into_databricks_or_bigquery/"
kind: "social-post"
source: "reddit-deep: r/bigdata"
subreddit: "bigdata"
title: "Moving IBM Db2 data into Databricks or BigQuery in real time — what’s actually working?"
author: "Due-Dig-1761"
date: "2026-01-14T18:30:34.000Z"
score: 5
upvote_ratio: 1
num_comments: 3
flair: ""
extracted_at: "2026-06-11T18:58:27.061Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/bigdata/1qcv7aq.md#c0"
    char_span: [0, 1179]
    sentence_count: 5
    key_terms: [data, db2, replication, here, databricks, analytics, platforms, bigquery]
    token_count: 277
  - id: "social-intelligence/reddit-deep/bigdata/1qcv7aq.md#c1"
    char_span: [1194, 3376]
    sentence_count: 10
    key_terms: [operational, correctness, teams, emergency-file-952, real, failures, usually, reconciliation]
    section: Comments
    token_count: 439
  - id: "social-intelligence/reddit-deep/bigdata/1qcv7aq.md#c2"
    char_span: [3378, 4477]
    sentence_count: 2
    key_terms: [governance, management, data, recovery, logging, visibility, sensitive, coverage]
    section: Comments
    token_count: 217
---
# Moving IBM Db2 data into Databricks or BigQuery in real time — what’s actually working?

Source: [reddit-deep: r/bigdata](https://www.reddit.com/r/bigdata/comments/1qcv7aq/moving_ibm_db2_data_into_databricks_or_bigquery/)
Posted by **Due-Dig-1761** · **5↑** · **3 comments**

A lot of teams we talk to struggle with getting Db2 for i or Db2 LUW data into modern analytics and AI platforms without heavy custom code or major system impact.

We’re hosting a free 30-minute technical webinar next week where we walk through how organizations are replicating Db2 data into platforms like Databricks and BigQuery in real time, with minimal footprint and no-code setup.

Topics we’ll cover:

* Why Db2 data is hard to use in cloud analytics & AI tools
* Common replication pitfalls (latency, performance, data integrity)
* How teams validate changes and monitor replication in production
* Real-world use cases across BI dashboards, reporting, and AI models

Full disclosure: I work with the team hosting this session.  
If this sounds useful, here’s the registration link: [Here](https://webinar.zoho.com/meeting/ShowHomePage.do?product=CRM)

Happy to answer questions here as well.

## Comments

- **latent_threader** (1↑): This reads like a webinar promo more than a discussion. In practice, what I usually see working is some mix of CDC plus very careful load management so Db2 does not get hammered. The hard parts are always schema drift, replay after failures, and trust in data correctness, not the tooling pitch. Would be more interesting to hear what actually broke in real deployments and how teams fixed it.
- **Emergency-File-952** (1↑): From what I’ve seen, the tooling itself is rarely the hardest part anymore — most modern stacks *can* move Db2 data into Databricks or BigQuery in near real time.

The bigger challenge is operational correctness once those pipelines become business-critical.

Teams I’ve talked to usually end up in one of a few patterns:

* CDC → Kafka → Databricks Structured Streaming
* Qlik Replicate / IBM CDC / HVR-style replication
* Debezium-based pipelines where the org is comfortable operating Kafka infrastructure

But the real pain points tend to show up later:

* schema drift
* replay after failures
* transaction ordering
* reconciliation
* minimizing load on Db2
* downstream trust in metrics/dashboards

Especially once AI or operational analytics depend on the data, “pipeline is running” stops being enough  teams start needing guarantees around lineage, consistency, and semantic correctness over time.

I’ve also noticed a lot of organizations gradually shifting from pure ingestion thinking toward observability/governance thinking because silent corruption or drift becomes more dangerous than obvious failures.

Curious are you optimizing mainly for ultra-low latency, or for operational reliability and reconciliation at scale? Those usually push teams toward very different architectures.
- **Emergency-File-952** (1↑): I think the most useful cybersecurity audit checklists are the ones that go beyond “is a policy documented?” and focus more on operational reality.

A lot of environments technically have security controls in place, but the real question is whether the organization can reliably:

* detect issues
* contain them
* recover quickly
* explain what happened afterward

Some areas I’d definitely include:

* Identity & access management
   * MFA coverage
   * privileged account reviews
   * stale/orphaned accounts
   * least-privilege enforcement
* Asset & data visibility
   * inventory of systems/endpoints
   * shadow IT/SaaS usage
   * sensitive data classification
   * backup validation
* Logging & monitoring
   * centralized logging/SIEM coverage
   * alert fatigue review
   * retention policies
   * incident response workflows
* Vulnerability & patch management
   * patch timelines
   * internet-facing exposure
   * dependency management
* Governance & recovery
   * disaster recovery testing
   * ransomware recovery readiness
   * vendor/third-party risk
   * audit trails and access logging

What’s interesting now is that audits increasingly overlap with data governance and AI governance too, because organizations need visibility not just into infrastructure, but also into how sensitive data moves through analytics and automation systems.

Curious are you building this checklist mainly for compliance purposes, or more for operational risk reduction and internal security maturity?
