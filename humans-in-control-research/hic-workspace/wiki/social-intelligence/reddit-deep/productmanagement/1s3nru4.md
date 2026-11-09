---
id: social-intelligence/reddit-deep/productmanagement/1s3nru4.md
url: "https://www.reddit.com/r/ProductManagement/comments/1s3nru4/now_that_pms_can_build_more_easily_are_you/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Now that PM's can build more (easily), are you actually pushing to prod or just creating prototypes for engineers?"
author: "renaissancelife"
date: "2026-03-25T21:21:32.000Z"
score: 0
upvote_ratio: 0.36
num_comments: 38
flair: "Tools & Process"
extracted_at: "2026-10-09T16:37:15.730Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1s3nru4.md#c0"
    char_span: [0, 1566]
    sentence_count: 10
    key_terms: [prototypes, productmanagement, access, folks, new, prod, alignment, wondering]
    concepts: [prototypes, productmanagement, access, folks, alignment]
    token_count: 355
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1s3nru4/now_that_pms_can_build_more_easily_are_you/","kind":"social-post","date":"2026-03-25","author":"renaissancelife","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1s3nru4.md#c1"
    char_span: [1581, 3839]
    sentence_count: 14
    key_terms: [software, answer, making, requirements, engineering, prototyping, decision, product]
    concepts: [software, requirements, answer, making, engineering]
    section: Comments
    token_count: 512
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1s3nru4/now_that_pms_can_build_more_easily_are_you/","kind":"social-post","date":"2026-03-25","author":"renaissancelife","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1s3nru4.md#c2"
    char_span: [3841, 6040]
    sentence_count: 13
    key_terms: [building, engineer, claude, understanding, relationship, ship, company, review]
    concepts: [building, engineer, understanding, relationship, claude]
    section: Comments
    token_count: 491
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1s3nru4/now_that_pms_can_build_more_easily_are_you/","kind":"social-post","date":"2026-03-25","author":"renaissancelife","subreddit":"productmanagement"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1s3nru4.md#c3"
    char_span: [6042, 7631]
    sentence_count: 15
    key_terms: [better, enterprise, prototype, constraints, vibe, improve, systems, coding]
    concepts: [better, enterprise, prototype, constraints, improve]
    section: Comments
    token_count: 331
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1s3nru4/now_that_pms_can_build_more_easily_are_you/","kind":"social-post","date":"2026-03-25","author":"renaissancelife","subreddit":"productmanagement"}]
---
# Now that PM's can build more (easily), are you actually pushing to prod or just creating prototypes for engineers?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1s3nru4/now_that_pms_can_build_more_easily_are_you/)
Posted by **renaissancelife** · **0↑** · **38 comments**

Are yall doing more active prototyping at work with the new ai tools? How are yall handing that off to engineering? Do you have read/write access to the codebase or is it merely prototypes?

We're navigating this as a company but wondering how others are.

We have access to the Claude tools (code, cowork, etc), but for me, it feels a bit like these new "powers" are going a bit to waste.

Some designers have been able to ship but getting alignment still takes long and code quality issues are starting to creep up.

Personally, I've done stand alone prototypes but don't have read/write access to the repo so instead of an engineer just reviewing the PR, they have to re-create the feature in prod from the spec.

  
**EDIT: To be clear, I'm wondering what folks new day to day looks like. I'm not advocating for every PM to touch prod. For example**  
**- are there folks who've morphed into "product engineer" types and are consistently shipping prototypes or even doing more (since many PM's do have SWE backgrounds)**  
**- have people's companies re-organized to speed up the alignment it takes for features to get approved since time-wise, coding has gotten cheaper**  
**- do others feel that folks within orgs are resisting, etc?**

## Comments

- **heironymous123123** (34↑): How much do you know about software architecture?

Your answer will determine to what level you can contribute essentially.




-----


Edit:


That does not mean you can't learn and become that product engineer you have commented on in your later edits.


I am trying to make that transition myself- halfway between MLE and PM - but it's brutal. Full time job and 5 to 6 hours of coding and classes every day after hours so I can catch up.
  - **rayfrankenstein** (1↑): And to what degree you are hated and despised by your developers for making their jobs super-difficult
- **Old-and-grumpy** (16↑): My engineering team would eat me alive if I started making pull requests. So I spend my time refining my context library, making their requirements super clear, prototyping stuff, cranking out documentation, slide decks, and blog posts.

Last week I listened to Hard Fork describe this phenomena they called "prompt exhaustion" (I might be getting that term wrong). I absolutely feel that every day.
  - **AprilsayRelax** (1↑): lol "eat me alive" you got me
- **utzutzutzpro** (17↑): You are never supposed to get your hands on production environments. If, then you are in a small company, very small.

You validate assumptions with pilots to come to a decision. The final solution implementation isn't a product managers job nor responsibility, the strategic decision is, partially.
  - **Daddy_Long_Legs** (-12↑): 2024 coded answer
    - **dreamingtree1855** (3↑): Never had a p0 incident coded answer
- **vrt__** (5↑): As a PM with a software engineering background: don't ship to prod ;). Vibe coding requires a lot of handholding to make sure it produces desirable output. When you have the necessary experience, prototyping gets really quick and also allows for testing out new technologies.
- **rkelsey15** (4↑): This post comes across as someone who doesnt understand system design or software architeture. AI has it moments for protyping an idea but that doesn't mean you should be pushing "code" to prod especially for legacy systems that you do not know how your new code will affect downstream systems or data. Imagine you pushed something that needed GDPR/CCPA requirements but does not have those capabilities. 

As someone mentioned, refining clear requirements and aligning stakeholders still matter even if claude can ship some code. There will be a time when AI can really ship into prod but i do not think we are there yet. Its a shiney toy in the current iteration.
- **Clear_Illustrator825** (5↑): Yes, we're pushing to prod, where it makes sense.

Are we building features? No, that requires a lot more thoughtful architecture and the cost in PR review (getting the context, understanding what AI did, etc) is higher than the saving of us doing it v an engineer (and realistically, its either a high enough priority they should be touching it, or its not, in which case why am I doing it??) Prototypes are useful to test ideas and build shared understanding though - more and more the spec is the prototype.

Are we using Claude to speed up papercut fixes, small ui changes, copy change experiments, event tracking and other smaller scale stuff? Yeah, those are easy for developers to review, for us to test and provide evidence for, and often less effort than writing the ticket and passing it off, and you can quickly smash them out and solve those papercuts without disrupting the day to day. Sure everyone's had that experience of the 'tiny' fix that causes so much benefit that can never be prioritised over big company okrs- this let's you ship it 😀
  - **mb4ne** (1↑): is design looped in?
- **new-acc-who-dis** (3↑): Chances are good that you fast track ruining your relationship with your engineers this way

They would hate me if i come with a pull request eventho we currently have a great relationship 

Just dont
- **Accomplished_Mind_69** (3↑): Why do we want the PM to build? 

An already amazing engineer with tools like Claude code can finish tasks in days what took weeks earlier. Nothing we can do is better architected, tested, developed, integrated etc. 

We can spend a couple of hours building something that engineer will not use or fix small bugs that they don’t care for and probably not high value. Is that the highest value item we can do?

PM have always been responsible on making sure the team is building the right things and moving towards the outcome the company needs. 

Prototyping for user testing or feedback or for some form of stakeholder approval is the only thing I see value in. The other thing that potentially might be helpful is using tools to learn about the technology capability but that really depends on what industry you are in. 

Rant over
- **Gubbarewala** (2↑): 1. Define why better with AI. Do better research and get closer to understanding the true PMF.
2. Convince stakeholders better with AI. Make them see the need, the vision, and get them actually excited and super bought in.
3. Improve the systems of work better. Make sure your team is improving, show them better ways to work, collaborate easier, and influence to improve the PDLC. 

Prototypes may be the way to do one of these. But actually launching on taking away equity from others in your team doesn't help in the long run.
- **ambitiouspie_** (2↑): The lines between PMs and builders are definitely getting blurred, especially with how accessible vibe coding has become.

  
What matters now isn’t who builds, but whether the code meets quality and compliance standards, things like reviews, security, and adherence to enterprise design systems.  
  
Enterprise-grade vibe coding tools are designed with those guardrails in mind, letting PMs prototype confidently within enterprise constraints. This allows a PM or Engineer to "vibe code" a prototype that is *already* tethered to enterprise constraints (using the right React components, the right auth wrappers, etc.), and that prototype isn't a throwaway artifact. It’s the actual foundation of the production feature.
