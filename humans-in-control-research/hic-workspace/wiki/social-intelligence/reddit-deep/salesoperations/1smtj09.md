---
id: social-intelligence/reddit-deep/salesoperations/1smtj09.md
url: "https://www.reddit.com/r/SalesOperations/comments/1smtj09/looking_for_scalable_sales_crm_lead_management/"
kind: "social-post"
source: "reddit-deep: r/salesoperations"
subreddit: "salesoperations"
title: "Looking for scalable sales CRM / lead management system (evaluation + pipeline + assignment)"
author: "Funny-Raspberry-5865"
date: "2026-04-16T04:42:26.000Z"
score: 6
upvote_ratio: 1
num_comments: 14
flair: ""
extracted_at: "2026-06-23T20:31:57.359Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesoperations/1smtj09.md#c0"
    char_span: [0, 1313]
    sentence_count: 6
    key_terms: [lead, management, sales, pipeline, salesoperations, team, assignment, evaluation]
    concepts: [management, sales, salesoperations, pipeline, assignment]
    related_chunks: ["social-intelligence/reddit-deep/salesoperations/1smtj09.md#c1"]
    token_count: 271
    sources: [{"n":"reddit-deep: r/salesoperations","u":"https://www.reddit.com/r/SalesOperations/comments/1smtj09/looking_for_scalable_sales_crm_lead_management/"}]
  - id: "social-intelligence/reddit-deep/salesoperations/1smtj09.md#c1"
    char_span: [1327, 3567]
    sentence_count: 23
    key_terms: [crm, lead, adoption, pipeline, based, performance, assignment, conditions]
    concepts: [adoption, pipeline, performance, assignment, based]
    related_chunks: ["social-intelligence/reddit-deep/salesoperations/1smtj09.md#c0"]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/salesoperations/1smtj09.md#c2"
    char_span: [3571, 4616]
    sentence_count: 7
    key_terms: [departments, everything, employees, number, "what's", old-relationship6837, crm, team]
    concepts: [departments, everything, employees, number, "what's"]
    section: Comments
    token_count: 244
---
# Looking for scalable sales CRM / lead management system (evaluation + pipeline + assignment)

Source: [reddit-deep: r/salesoperations](https://www.reddit.com/r/SalesOperations/comments/1smtj09/looking_for_scalable_sales_crm_lead_management/)
Posted by **Funny-Raspberry-5865** · **6↑** · **14 comments**

We’re currently evaluating software for our sales team and wanted some real-world recommendations.

We’re looking for something that can handle a fairly large-scale setup with the following:

* Lead capture and centralised management
* Lead assignment (auto/manual) across multiple sales reps
* Clear pipeline stages (multi-step process before closing)
* Salesperson performance tracking / evaluation
* Follow-ups, reminders, and automation (nothing should fall through the cracks)
* Reporting/dashboard for management insights

Ideally, we want something that can scale well as lead volume increases and multiple team members are involved.

From what I’ve seen, most CRMs claim to do everything, but in practice usability and adoption seem to be the real challenge. 

Would love to know:

* What tools are you using?
* What actually worked (and didn’t)?
* Any regrets after scaling?

Context: mid-to-large sales team, structured pipeline, fairly high lead flow.

Appreciate any suggestions or experiences!

## Comments

- **Solo_rw** (1↑): A CRM will do this in part. Thing is off the shelf tools claim to do all of this in an ideal scenario but what you are looking for is going to be far from it. 

What you actually need is someone who can understand your crm; what it does and then build on top of it or around it to automate what the crm doesn't do well or easily. 

Here is how I would do it: 

1. Lead capture -> compiled in one place automatically 

2. Lead enrichment -> run on specific leads based on certain conditions 

3. Lead centralisation -> pushing the lead into the CRM 

These 3 don't happen in the CRM, not cleanly so build a system that takes leads from different sources, cleans the data, homogenizes it and sends it to the CRM. 

4. Lead assignment and pipeline stages and dashboarding or performance reviews are simple. Any CRM will do it well. 

5. Follow ups and reminders should be automated via integrations. Pull data from the CRM daily based on certain conditions - integrate to slack or mail to send reminders.

To summarise use the CRM just as a central point.

Happy to go deeper on this if this helps. 
Cheers!
- **daughterofthesun_22** (1↑): Adoption really comes down to clean workflows and tools that adapt to how your team actually works. I’ve found that platforms with smart lead routing and performance based assignments make the biggest difference as you grow.
- **Powerful-Table8562** (1↑): I think adoption is the real question here, not the feature list. Every CRM on the market checks those boxes on paper.  
  
We went through this a while back... tried Salesforce first, and it was just too much config for what we needed. Half the team stopped logging stuff after a few weeks because it felt like homework.  
  
We ended up on Nutshell, and the difference in adoption was night and day. Auto lead assignment worked out of the box, pipeline views were easy to customize, and the follow-up automation actually caught stuff we were missing before. Reporting is solid enough that management stopped asking me for custom spreadsheets... thank goodness lol.  
  
One thing I'd flag for your scale, though: really nail down your pipeline stages BEFORE you pick a tool. We didn't and had to redo everything a month in.  
  
What's your team size roughly?
- **Kortopi-98** (1↑): You could look into Attio. It’s good for managing pipelines, assigning leads, and keeping everything in one place as the team grows. Not the easiest to set up at first, but it works well once everything’s dialed in.
- **Old-Relationship6837** (1↑): This was my exact scenario a few years back. We started with the basic plan on Insightly CRM when there were just two of us, and it's scaled with us now to several departments and over 50 employees. We've changed plans along the way, added the marketing automation suite, and integrated other systems like quickbooks. Honestly, we didn't have any growing pains from the CRM side. We did have many in other departments, though!
- **Niksachdeva** (1↑): What's your monthly budget?
- **Mike-diego** (0↑): A few questions for the OP - can you describe the business in more detail please: industry, products/services, number of employees, number of sales reps, current tech stack, requirements, what are you familiar with and have you researched..
