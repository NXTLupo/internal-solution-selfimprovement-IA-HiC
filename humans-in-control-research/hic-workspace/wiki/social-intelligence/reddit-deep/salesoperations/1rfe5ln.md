---
id: social-intelligence/reddit-deep/salesoperations/1rfe5ln.md
url: "https://www.reddit.com/r/SalesOperations/comments/1rfe5ln/centralized_platform_for_sdrs_to_sit_between/"
kind: "social-post"
source: "reddit-deep: r/salesoperations"
subreddit: "salesoperations"
title: "Centralized platform for SDRs to sit between marketing and sales?"
author: "usheikh136"
date: "2026-02-26T16:06:07.000Z"
score: 3
upvote_ratio: 0.81
num_comments: 6
flair: ""
extracted_at: "2026-06-23T20:31:57.360Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesoperations/1rfe5ln.md#c0"
    char_span: [0, 2039]
    sentence_count: 11
    key_terms: [salesforce, platform, sdr, instances, salesloft, sdrs, multiple, salesoperations]
    concepts: [salesforce, platform, instances, salesloft, salesoperations]
    related_chunks: ["social-intelligence/reddit-deep/salesoperations/1rfe5ln.md#c1"]
    token_count: 419
    sources: [{"n":"reddit-deep: r/salesoperations","u":"https://www.reddit.com/r/SalesOperations/comments/1rfe5ln/centralized_platform_for_sdrs_to_sit_between/"}]
  - id: "social-intelligence/reddit-deep/salesoperations/1rfe5ln.md#c1"
    char_span: [2053, 4249]
    sentence_count: 14
    key_terms: [sales, salesforce, routing, sdr, leads, instances, source, organization]
    concepts: [salesforce, sales, routing, instances, leads]
    related_chunks: ["social-intelligence/reddit-deep/salesoperations/1rfe5ln.md#c0"]
    section: Comments
    token_count: 473
---
# Centralized platform for SDRs to sit between marketing and sales?

Source: [reddit-deep: r/salesoperations](https://www.reddit.com/r/SalesOperations/comments/1rfe5ln/centralized_platform_for_sdrs_to_sit_between/)
Posted by **usheikh136** · **3↑** · **6 comments**

Our company has changed a lot over the last few years with mergers resulting in all our sales and SDR teams operating in silos. I am responsible for our SDR org and currently we have teams working out of 6 different Salesforce instances divided by either product type or region, and then each SDR teams uses their own stack of tools for enrichment, prospecting, etc. We are trying to find a way to standardize and improve our SDR operations. My VP wants to see a centralized lead management and prospecting platform that we can consolidate all our SDRs under. One that can connect and send converted leads to the appropriate salesforce instance and also be able to receive MQLs. We have been struggling to find the right tool and direction. Does anyone here have any tools or any advice on how to go about achieving this? Ideally this platform would meet the following high-level criteria:

* Platform would sit between Eloqua and multiple Salesforce instances, allowing SDRs to manage cadences and outreach centrally
* SDRs would have visibility into all customers in the platform and can see active opportunities to avoid duplicating efforts
* When leads qualify as opportunities, they would be pushed back to the appropriate Salesforce instance
* Platform would need to seamlessly synchronize with multiple Salesforce instances
* User-based rules and permissions can handle regional requirements without needing separate systems

We also have multiple Salesloft instances today, same as our Salesforce. I suggested perhaps setting up one Salesloft dedicated to just our SDR organization, but not all our SDR managers are happy with Salesloft so want to look at alternatives that can help fit our needs better.

Thanks in advance for the help, happy to clarify anything!

## Comments

- **ocludintvp** (3↑): Six Salesforce instances and multiple Saleslofts is wild 😅  
id probably figure out source of truth and routing rules first, otherwise you’re just moving the silo somewhere else.
  - **want_to_vent** (3↑): Yeah 100% agree, routing logic has to come first or you're just building a prettier silo. We went through something similar (4 SF instances, not 6 though) and mapping out which fields needed to sync and where leads should land took longer than picking the tool. Sumble helped us get visibility into overlapping accounts across instances, though it's more of an intelligence layer than a routing tool. But yeah, nail the data model first.
  - **usheikh136** (2↑): Our source of truth is Salesforce and, albeit not ideal, we do have the routing rules figured out. We know which leads have to be routed to which Salesforce instance/sales teams. The issue we have is that our sales organization and SDR organizations are separate entities. However, an SDR team supporting product A operates from the same Salesforce and Salesloft as the sales team today. We want to change this as we are constantly limited by what we can do/change/improve in there as Sales teams constantly pushback. Additionally, lack of documentation and processes has built up over decades. Instead of trying to fix this (as we've tried in the past), we are leaning towards taking a different approach and setting up our entire SDR organization in one central place. This way we can easily manage the operations, track their progress, and our KPIs. As long as we can easily route converted leads to the appropriate sales teams, without disrupting their work (especially in somewhere like Salesloft where leads and contacts in opportunities are both just "People").
    - **ocludintvp** (1↑): That makes way more sense actually.

If routing’s clean and Salesforce is source of truth, then yeah this feels less like a data issue and more like “SDR needs its own sandbox” without being blocked by sales every time you want to tweak something.

Centralizing SDR ops separately but syncing cleanly back to sales sounds smart as long as handoff rules are airtight so it doesn’t turn into blame game later 😅
