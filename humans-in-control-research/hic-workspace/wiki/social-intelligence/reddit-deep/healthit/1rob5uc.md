---
id: social-intelligence/reddit-deep/healthit/1rob5uc.md
url: "https://www.reddit.com/r/healthIT/comments/1rob5uc/therapy_notes_are_more_time_consuming_that_they/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "Therapy notes are more time consuming that they should be. Looking to try AI scribe for therapists. Anybody with real experience I can DM?"
author: "DrJocelyn1"
date: "2026-03-08T17:44:35.000Z"
score: 0
upvote_ratio: 0.31
num_comments: 22
flair: ""
extracted_at: "2026-06-22T21:46:00.285Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market outlook report on the state of AI adoption across the healthcare sector heading into 2026, analyzing clinical and operational use cases, deployment barriers, and regulatory drivers. Evaluate current health system integration trends, investment priorities, and market growth indicators based on recent industry research and deployment data."
engagement: "deliver-a-strategic-market-outlook-report-on-the-state-of-ai"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1rob5uc.md#c0"
    char_span: [0, 898]
    sentence_count: 14
    key_terms: [looking, integration, day, therapists, comments, healthit, end, time]
    concepts: [looking, integration, therapists, comments, healthit]
    token_count: 215
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1rob5uc/therapy_notes_are_more_time_consuming_that_they/"}]
  - id: "social-intelligence/reddit-deep/healthit/1rob5uc.md#c1"
    char_span: [912, 1384]
    sentence_count: 3
    key_terms: [integration, vendor, does, okay, fethrhealth, encounter, extension, fantastic]
    concepts: [integration, vendor]
    section: Comments
    token_count: 119
  - id: "social-intelligence/reddit-deep/healthit/1rob5uc.md#c2"
    char_span: [1386, 3295]
    sentence_count: 16
    key_terms: [drjocelyn1, documentation, note, therapists, copying, instead, pasting, session]
    concepts: [drjocelyn1, documentation, therapists, copying, instead]
    section: Comments
    token_count: 439
  - id: "social-intelligence/reddit-deep/healthit/1rob5uc.md#c3"
    char_span: [3297, 5281]
    sentence_count: 19
    key_terms: [develop, records, claude, documentation, code, technology, something, workflow]
    concepts: [documentation, develop, records, claude, technology]
    section: Comments
    token_count: 483
---
# Therapy notes are more time consuming that they should be. Looking to try AI scribe for therapists. Anybody with real experience I can DM?

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1rob5uc/therapy_notes_are_more_time_consuming_that_they/)
Posted by **DrJocelyn1** · **0↑** · **22 comments**

I wanted to do this for a long time.

I run a solo PP. Looking for something that fits well with my day to day work.

1. Anything other than HIPAA compliance that I should check for?
2. How important is EHR integration? I use Simple practice. Can I copy paste or is integration helpful?
3. What is the consent process with patients?
4. Is it better to go for a general tool for doctors or a specialised tool for therapists?

Looking for suggestions only from someone who has adopted this. What is your workflow like? do you do it at the end of each session or day end?

## Comments

- **fethrhealth** (5↑): Integration is fantastic for large practices, for smaller ones you have to ask yourself - how many patients do I see a day? 30, okay how long does it take me to open a chart, navigate to the encounter, and copy and paste a note? 2 minutes (2 x 30 = 1 hour saved). 

Is it worth it to me to pay 5k for my vendor to integrate with the scribe? No, okay does the vendor support a chrome extension that can make this integration happen for much cheaper?

At some point you may just want to pay for the convenience even if it costs just so you don't even have to think about it.
  - **DrJocelyn1** (1↑): I agree. Honestly I am okay copying and pasting the notes. As long as they are reliable and I do not need to edit them a lot. Also, aren't there out of the box solutions for integrations without the extra cost? I know Two Fold and Supanote has it with Simple Practice. Heidi does not but its okay.
- **upnorth77** (3↑): 3. Most states dont require consent for AI use like this, but it would still behoove you to make sure the patient is informed.
  - **DrJocelyn1** (1↑): Agreed, its not about regulations but more about patient's privacy and comfort level.
- **Jumpy-Possibility754** (2↑): For solo practices the biggest win from AI scribes is not the note itself, it is finishing documentation immediately after the session instead of hours later. Most therapists who adopt them either run the scribe live during the session or record the conversation and generate the note right after while details are still fresh. HIPAA compliance and a signed BAA are the first things to check, but after that the real question is workflow. If copying and pasting into your EHR only takes a few seconds, full integration is nice but not essential. The bigger factor is whether the summaries match how therapists actually structure their notes so you are editing instead of rewriting.
  - **DrJocelyn1** (1↑): Thank you. Very helpful. I agree, reliability is the main thing. If I am paying for it, I want it to actually reduce my workload.
- **Thel_Odan** (2↑): Don't use AI for clinical documentation. You are setting yourself up for a lawsuit or fraud investigation when it inevitably hallucinates and goes off the rails. If you have to review every single note anyway to ensure accuracy, you're not really saving any time and in some cases might be investing more time. 

You'd probably be better off hiring a human to scribe for you. Or depending on your EMR see what kind of templating you have access too. Epic documentation can be built so it's really straightforward and quick for clinicians. I'm sure other EMRs do this as well.
- **BWMerlin** (1↑): I always decline the use of AI on my medical records and sessions.
- **FowndNotation** (1↑): [ Removed by Reddit ]
- **valuat** (0↑): Pay an EECS undergrad to develop a custom application for you. All tools are open-source. Better yet, develop it yourself with Claude Code. But answering your questions:  
1) Easy fix.  
2) Not at all in your case. Your records \*are\* the EHR.  
3) Just explain the technology and ask for permission. I've seen +200 patients with ambient technology and not a single one refused it (I did spend more time looking at them rather than at the computer screen)  
4) How different is the workflow? I don't see the difference. You want something that records the conversation and writes notes. Couldn't be simpler.
  - **uconnboston** (2↑): So allow HIPAA-governed conversations on an open source AI environment?
    - **valuat** (1↑): No genius, read each token carefully. I wrote “develop the tool” with Claude Code and *then* use it. Once the system is built, Claude Code or Codex or whatever is completely out of the loop.
  - **DrJocelyn1** (1↑): I dont think making my own tool will be helpful here. Not only will it be more expensive but I am looking for something reliable which saves me time.   
  
3. Most clients of my colleagues have agreed to be recorded so I guess it should be fine. 

4. Workflow might be same but which is the reliability same is the question?
- **jjkantro** (-3↑): Hey - I’m the co-owner/founder of a small company building out customizable AI written documentation. We haven’t worked with therapists yet but I’d bet we can get you setup quite quickly (1-2 hours). We offer a 30 day free trial with a BAA included in our terms of service.
