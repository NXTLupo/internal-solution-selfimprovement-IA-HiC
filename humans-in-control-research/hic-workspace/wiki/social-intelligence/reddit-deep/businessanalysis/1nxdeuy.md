---
id: social-intelligence/reddit-deep/businessanalysis/1nxdeuy.md
url: "https://www.reddit.com/r/businessanalysis/comments/1nxdeuy/best_technique_to_uncover_complexities_in_a_new/"
kind: "social-post"
source: "reddit-deep: r/businessanalysis"
subreddit: "businessanalysis"
title: "Best technique to uncover complexities in a new workflow"
author: "Im_no-1"
date: "2025-10-03T22:38:22.000Z"
score: 8
upvote_ratio: 0.9
num_comments: 11
flair: ""
extracted_at: "2026-06-23T20:32:15.469Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/businessanalysis/1nxdeuy.md#c0"
    char_span: [0, 864]
    sentence_count: 6
    key_terms: [get, businessanalysis, business, comments, workflow, mapping, working, start]
    concepts: [businessanalysis, business, comments, workflow, mapping]
    related_chunks: ["social-intelligence/reddit-deep/businessanalysis/1nxdeuy.md#c1"]
    token_count: 182
    sources: [{"n":"reddit-deep: r/businessanalysis","u":"https://www.reddit.com/r/businessanalysis/comments/1nxdeuy/best_technique_to_uncover_complexities_in_a_new/"}]
  - id: "social-intelligence/reddit-deep/businessanalysis/1nxdeuy.md#c1"
    char_span: [878, 3106]
    sentence_count: 12
    key_terms: [demystifying-business-analysis-for-business-owners-a-beginners-guide, approval, business, here, message, businessanalysis, https, state]
    concepts: [approval, business, message, businessanalysis, reddiquette]
    related_chunks: ["social-intelligence/reddit-deep/businessanalysis/1nxdeuy.md#c0"]
    section: Comments
    token_count: 514
  - id: "social-intelligence/reddit-deep/businessanalysis/1nxdeuy.md#c2"
    char_span: [3108, 5068]
    sentence_count: 22
    key_terms: [process, fail, ask, meeting, cases, milestones, correct, diagram]
    concepts: [process, meeting, cases, milestones, correct]
    section: Comments
    token_count: 444
  - id: "social-intelligence/reddit-deep/businessanalysis/1nxdeuy.md#c3"
    char_span: [5070, 5970]
    sentence_count: 7
    key_terms: [already, "haven't", process, usually, start, end, etc, hit]
    concepts: [already, "haven't", process, usually, start]
    section: Comments
    token_count: 205
---
# Best technique to uncover complexities in a new workflow

Source: [reddit-deep: r/businessanalysis](https://www.reddit.com/r/businessanalysis/comments/1nxdeuy/best_technique_to_uncover_complexities_in_a_new/)
Posted by **Im_no-1** · **8↑** · **11 comments**

I’m working on an initiative to improve an existing workflow. When we talk to business high level things seem straightforward forward. As we get to detailed steps in the flow, things start to spiral, new questions and limitations come up and decisions get stuck. This is purely operational flow, not a lot of technology considerations. 

I’m struggling, I’ve done techniques like story mapping/process mapping for simpler initiatives. I’m unsure what to do to get non technical business partners to say “this is where things get complex because of these reasons” before we start working through details.

## Comments

- **AutoModerator** (1↑): Welcome to /r/businessanalysis the best place for Business Analysis discussion.

Here are some tips for the best experience here.

You can find [reading materials on business analysis here](https://betterauds.com/businesses/demystifying-business-analysis-for-business-owners-a-beginners-guide/). 

Also here are the rules of the sub:

Subreddit Rules

* Keep it Professional.
* Do not advertise goods/services.
* Follow [Reddiquette.](https://www.reddithelp.com/en/categories/reddit-101/reddit-basics/reddiquette)
* Report Spam!


This is an automated message so if you need to contact the mods, please [Message the Mods](https://www.reddit.com/message/compose?to=%2Fr%2Fbusinessanalysis) for assistance.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/businessanalysis) if you have any questions or concerns.*
- **Minute_Efficiency_76** (7↑): # That is because we didnt understand the business problem to be solved here. I am guessing you would have jumped directly into the solution part. I would approach in the following manner.

# Three-State Framing (Past → Current → Future)

# 1. Past State (Baseline)

* What was the original process?
* What worked? What pain points were tolerated?
* Sample output (bullet, not a giant map):
   * Invoices were emailed manually to Finance
   * Approval done by single Ops Manager
   * 2–3 day turnaround time was acceptable

# 2. Current State (Why Change Now?)

* What triggered this initiative? (volume, compliance, cost, customer complaints, SLA breach, etc.)
* This forces stakeholders to articulate **the real business problem**.
* Sample output:
   * Invoice volumes doubled in 2024 → Ops cannot keep up
   * Audit found lack of approval controls
   * Delays now impacting vendor payments & reputation

# 3. Future State (Recommendation Space)

* Define *outcomes*, not tech solutions.
* Example:
   * Ensure approval controls based on amount thresholds
   * Standardize data validation before approval
   * Reduce turnaround time from 5 days → 2 days
* Then align solution options to those outcomes.
- **BattleOfTaranto** (3↑): You’re describing happy path in a way. 

When customer does A on time, the right amount of B and C in enough detail it’s easy. 

We need to think that it’s conceivable that A, B, and/or C fail. And tease out those combinations.

There are essentially waygates or milestones in each process, what happens when the conditions of those milestones are not met. What are the edge cases, the stress cases, who owns the decisions etc. you need to try cover all sad path possibilities. 

If you think you have done that you get them to sign off on that documentation and that’s covering your own ass
  - **Im_no-1** (2↑): Is there a framework or technique to tease the edge cases out? Other than a simple white boarding session?
    - **BattleOfTaranto** (4↑): Yes for each milestone in the process ask:

What could fail

Why would it fail

What happens if it fails

Who catches it if it fails? What’s the control mechanism. 


For example we automated a reminder email for customers. If they had no email on file however this would be an issue so we needed a dead letter queue to catch that, that queue then gets auto shipped off to a printing company using their postal address on the 20th of the month. 

Your job is to make reasonable efforts to ensure things don’t fail.
- **Silly_Turn_4761** (2↑): I would of course start with a high process diagram. Then attempt to do a detailed process flow diagram with swimlanes. Schedule a meeting and send it to them ahead of time. Then during the meeting walk through it. That should flush out the positive and negative scenarios. During the meeting ask why they do it that way then ask why again etc. Frame the workflow as though you have assumed things. People are much more likely to correct something that's wrong than to just give feedback. Walk them through your thought process. 

At the decision points, be sure to call out "So the only way this could fail is ____" when describing the No path. They will correct you. If they don't, ask them to confirm. 

Once you've got it most of the way done ask them which portion takes the longest or is hardest or usually fails, etc. This way they are already down into the weeds with you so it will help them to think of what usually goes wrong etc.
- **brooksa17** (1↑): Shameless promotion but I think it's applicable here. I'm building a startup which is a task mining/process intelligence solution. It allows your users to hit start and it tracks what they do from start to finish. They then hit stop and it stops tracking. This summarized the end to end flow so you can see the reality of what they are doing not just what is supposed to happen. 

  
Like I said we haven't launched yet but we'll have a bet ready within a few weeks and I'd love to have you test it out to see if it helps.
- **Mental-Two5831** (1↑): It might be worth looking into the different levels of process mapping if you haven't already
