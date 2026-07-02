---
id: social-intelligence/reddit-deep/productmanagement/1nhadmn.md
url: "https://www.reddit.com/r/ProductManagement/comments/1nhadmn/how_to_approach_a_complex_system_migration_as_the/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "How to approach a complex system migration as the sole developer and PM? Need guidance."
author: "Mindless_Swordfish_9"
date: "2025-09-15T02:44:38.000Z"
score: 2
upvote_ratio: 0.63
num_comments: 14
flair: ""
extracted_at: "2026-06-18T13:35:35.657Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1nhadmn.md#c0"
    char_span: [0, 2455]
    sentence_count: 13
    key_terms: [project, "i'm", migration, productmanagement, system, documentation, non-technical, integrations]
    concepts: [project, productmanagement, migration, documentation, non-technical]
    token_count: 511
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1nhadmn/how_to_approach_a_complex_system_migration_as_the/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1nhadmn.md#c1"
    char_span: [2457, 2683]
    sentence_count: 3
    key_terms: [documentation, appreciate, frameworks, incredibly, strategies, articles, helpful, methods]
    token_count: 44
  - id: "social-intelligence/reddit-deep/productmanagement/1nhadmn.md#c2"
    char_span: [2697, 4875]
    sentence_count: 24
    key_terms: [important, tool, document, documentation, integrations, scale, building, biggest]
    concepts: [important, document, documentation, integrations, scale]
    section: Comments
    token_count: 493
  - id: "social-intelligence/reddit-deep/productmanagement/1nhadmn.md#c3"
    char_span: [4877, 7046]
    sentence_count: 20
    key_terms: [new, system, tool, get, like, old, practical, something]
    concepts: [system, practical, something, typically, building]
    section: Comments
    token_count: 494
  - id: "social-intelligence/reddit-deep/productmanagement/1nhadmn.md#c4"
    char_span: [7048, 9176]
    sentence_count: 25
    key_terms: [integrations, goals, docs, get, keep, run, migration, airtable]
    concepts: [integrations, goals, migration, airtable, external]
    section: Comments
    token_count: 494
  - id: "social-intelligence/reddit-deep/productmanagement/1nhadmn.md#c5"
    char_span: [9178, 10765]
    sentence_count: 12
    key_terms: [coda, airtable, rather, own, set, documentation, dependencies, integrations]
    concepts: [airtable, rather]
    section: Comments
    token_count: 363
---
# How to approach a complex system migration as the sole developer and PM? Need guidance.

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1nhadmn/how_to_approach_a_complex_system_migration_as_the/)
Posted by **Mindless_Swordfish_9** · **2↑** · **14 comments**

Hi everyone,

I'm looking for some guidance on how to approach a major project I've been tasked with and would appreciate any advice you can offer.

**Background:** I'm a frontend developer with about 2 years of experience and an MS in Computer Science. I am a recent grad and to maintain my visa status and learn stuff while I search for a new full-time role, I recently joined a non-profit (\~100 people). My role here is split: on the development side, I contribute to an AI grant writing automation tool. On the operations side, I'm leading the Airtable to Coda migration, which is where I need advice.

**The Project:** My primary operations responsibility is to manage our organizational system, which is currently built on Airtable. The system is fairly complex, consisting of over 40 tables(on main base itself), numerous automations, and critical integrations that sync with services like Google Calendar, Google Meet, Gmail, and others. The long-term goal is to migrate this entire setup over to Coda, and I am responsible for the full lifecycle: discovery, planning, and execution.

**The Challenge:** This is the first time I have ever been asked to independently architect a solution or lead a project of this scale. I'm essentially the user researcher, product owner, and project manager all in one. While my non-technical colleagues are supportive, I'm the sole technical lead for this migration. I want to do this properly, with solid documentation, user feedback loops, and a good overall process, especially to ensure a smooth handover in case I leave before the project is fully complete.

**My Questions:**

* What's the best way to start a project like this? What are the crucial first steps (e.g., discovery, requirements gathering, auditing existing integrations)?
* What kind of project management process should I follow? Should I be learning a framework like Agile or Scrum for what is essentially a one-person project?
* What are the best practices for documentation to ensure the project is maintainable and easy to hand off?
* How can I effectively manage user feedback and feature requests from a non-technical team?

Any advice on frameworks, tools, documentation strategies, or first steps would be incredibly helpful. Thank you!

Edit: Would also also appreciate links for any articles, videos, methods or books that might help me with this.

## Comments

- **wwb_99** (2↑): Howdy -- this is the role I've done at a non profit for a few decades. It is an interesting job.

The biggest thing to keep in mind when flying solo is to have a little voice in your head saying "is there a way to roll back what I am doing if I screw it up?" Not unlike solo climbing you always need to keep in mind recovery and the control plane over everything else. You cannot get out of a tailspin without it.

Getting started

* At this scale people and politics are more important; you are often building a tool for a universe of 1. It needs to work for them.   
* Look but don't cut! At least at first. Understand the biggest, most important integrations. Your most important tool is Miro. Figure out what it does, what the integration points really are.   
* How well do you know Coda? What are the best practices? How do people build in it? Knowing where you are going is perhaps more important than where you are coming from.   
* The trickiest thing is cutover. The best way I have found to do it is to build the new tool as a strict, automated import from the old tool. That way you can repeatedly pull in the data to test things and you are never stuck in the "we started cutting over and something broke" gap.   
* Make sure you think about maintenence when you are building. Your future self will thank you.      

Project Management

* just say no -- there is no point in having a stand up with yourself. That is called a shower.   
* that said, using some sort of tracking system to capture project planning and bugs makes a ton of sense. I would use coda for this as part of my familiarization process.   

Documentation

* at this scale, documentation is another thing that can break. Make sure there is a clear runbook, but getting stuck document just adds more work and more things you need to maintain with little or no payoffs.   
* that said, document landmines! Stuff that gets you in trouble, weird integrations. Your future self will thank you.   
* always code like the guy coming behind you is a violent psychopath who knows where you live.   
* at this scale, hand-off is going to be a meeting not a document drop.  

Feedback   

* I would lean into clickup first. Being able to have a simple mechanism -- like "email app-feedbac@example.com" -- is very very handy. You can usually triage issues very easily, you don't get much data in most cases.    
* You won't get much feedback.  

Also, make sure to read Don't Make Me Think by Steven Krug, it will help you figure out the right UI things to do.
  - **Mindless_Swordfish_9** (1↑): ## Thank you so so much(x10) for this incredibly practical advice. This is the kind of real-world experience I was hoping for.
 
If you have a moment, I'd love to ask a few follow-up questions on some of your key points.

1. In a database-like tool such as Airtable or Coda, what does a practical rollback plan look like? Is it primarily about taking regular backups/snapshots, or are there other techniques you use to ensure you can revert a specific change without restoring the entire system?

2. The idea of building the new tool as a strict, automated import from the old one is brilliant. When you've done this, what tools do you typically rely on for that automation? Is it something you'd handle with a tool like Make/Zapier, or would you typically write a custom script for more control?

3. I love the advice to document landmines instead of every minor detail. To help me get into that mindset, could you give me an example of something you'd classify as a 'landmine' from a past project that wouldn't have been obvious to a new person?

No worries at all if you're too busy, but any further insight you could share would be hugely appreciated. Thanks again for such detailed and thoughtful response!
    - **wwb_99** (2↑): 1. It's not rollback, it is automate forward. Make it so you can new up the new system based on an export of the old system. Then you can keep the old system running and updating, doing new data drops and building out the new system based on the import. There might be a transformation tool involved depending on what you need to do.

2. usually database backups and some custom scripts, depends on the platform. Not necessarily good work for zapier or make as it is going to be a lot of calls and you will do it more than once.

3. landmines are things you can't see that blow up. For this sort of app a lot of it is documenting why things are setup in somewhat nonsesical ways, often due to human or business constraints.
- **MetalRadiant687** (2↑): yeah been there soloing a messy migration, tbh the playbook that saved me was: 1) baseline audit, 2) phased migration, 3) ruthless docs. Start with an inventory. Map every Airtable table, fields, owners, automations, and external integrations. Capture data volumes, refresh cadence, failure points. Turn that into a simple context diagram and a RACI so folks know who decides what. 

Then write a one pager RFC for goals, non goals, risks, and success metrics. Share it, get sign off. After that, run a spike in Coda to validate the tricky bits, especially Calendar and Gmail integrations, then pick one thin slice, migrate it, and run it in parallel with Airtable. No big bang. 

Process wise, keep it Kanban. Weekly goals, daily 15 min check in with yourself and a sponsor. Timebox discovery spikes. Do demo Fridays with users using a sandbox doc, capture feedback with a simple intake form and a scoring rubric, impact vs effort, so you dont get derailed. 

Docs: keep living docs in the repo or Coda. ADRs for key decisions, schema map, automation catalog, runbooks with step by step, rollback plan, and a handover checklist. Record short Looms for workflows, people actually watch those. 

Risk: keep a cutover plan, data backfill script, and a rollback switch. Monitor with a basic health dashboard, failed syncs, queue length, error logs. 

If you want external eyes on early, I’ve posted similar internal tools on Launch Community to get neutral feedback on UX and onboarding flows. Not required, but it helped me spot blind spots before wider rollout. 

You’ve got this. Start small, parallel run, document as you go, and demo relentlessly.
  - **Mindless_Swordfish_9** (1↑): My apologies for the late response, I've been caught up with work and everything. Just wanted to say a huge thank you for your incredibly practical and helpful playbook. I really appreciate you taking time to share this! 

If possible, can you share any books, case studies, or any articles to learn such process. Thanks in advance!
- **Cyclr_Systems** (2↑): Really good discussion! One thing I’d add to what others have already advised is to think about the integrations as workflows first, rather than as a set of Airtable automations you need to replicate in Coda. Before you start building, try writing them out in plain language: “when someone schedules a meeting, we create a record, notify the team, and attach the link.” That way you’re clear on the purpose, not just the mechanism. Once you’ve got the workflow mapped, you can decide how best to implement it in Coda, or whether it even makes sense to keep it at all.

On documentation, the most useful thing you can capture isn’t every little detail, it’s the quirks and dependencies. Why something is set up in a strange way, what will break if a field changes, etc. That’s the kind of context that really helps with handover.

What you’re really doing here is learning integration design, which is a skill in its own right. Even though your immediate task is Airtable → Coda, the way you approach it will shape how maintainable and adaptable the system is in the long run. The habits you build now around mapping, phasing, and documenting will serve you well on other projects down the line.
- **New_Marionberry4029** (1↑): Hey u/Mindless_Swordfish_9, I'm a student applying for a PM internship at Coda and want to come in with real user insight rather than just my own takes. Mind if I ask you a couple of questions about how you've been using it?
