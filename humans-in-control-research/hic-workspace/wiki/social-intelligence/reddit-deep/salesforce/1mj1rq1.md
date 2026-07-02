---
id: social-intelligence/reddit-deep/salesforce/1mj1rq1.md
url: "https://www.reddit.com/r/salesforce/comments/1mj1rq1/trailhead_legend_craft_an_effective_prompt/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Trailhead Legend - Craft an Effective Prompt Template"
author: "Kamimzc"
date: "2025-08-06T11:12:25.000Z"
score: 6
upvote_ratio: 0.87
num_comments: 14
flair: "admin"
extracted_at: "2026-06-25T15:21:44.740Z"
extraction_method: "praw-deep"
research_goal: "Identify how peer large private universities without medical schools are implementing AI across advancement workflows—including fundraising, alumni relations, and donor communications—to define our own adoption roadmap that balances ethical guardrails, staff readiness, and ROI."
engagement: "identify-how-peer-large-private-universities-without-medical"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1mj1rq1.md#c0"
    char_span: [0, 700]
    sentence_count: 5
    key_terms: [prompt, salesforce, template, f8fb22d553d8c0f388f3574e8af6ff16d6d57b87, effective, trailhead, comments, legend]
    concepts: [salesforce, prompt, template, effective, trailhead]
    token_count: 198
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1mj1rq1/trailhead_legend_craft_an_effective_prompt/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1mj1rq1.md#c1"
    char_span: [714, 2263]
    sentence_count: 12
    key_terms: [field, suspicious-nerve-487, check, trailhead, fields, instructions, need, sometimes]
    concepts: [field, suspicious-nerve-487, trailhead, check, instructions]
    section: Comments
    token_count: 348
---
# Trailhead Legend - Craft an Effective Prompt Template

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1mj1rq1/trailhead_legend_craft_an_effective_prompt/)
Posted by **Kamimzc** · **6↑** · **14 comments**

Hi everyone! I need help completing the "Create an Effective Prompt Template" step in the Salesforce Trailhead Legend.

So, I started the challenge and created a Flexible Prompt Template and customized a prompt they provided, but when I went to customize the "Next Check-in Date," it didn't appear. See the image below. Could you help me?  


https://preview.redd.it/prl5o5sptdhf1.png?width=1769&format=png&auto=webp&s=f8fb22d553d8c0f388f3574e8af6ff16d6d57b87

## Comments

- **Suspicious-Nerve-487** (1↑): Field permissions would be the first place I’d check. I wouldn’t think that’s the issue since they provide the org, but worth a shot

Would also double check to confirm that the field exists on the contact object. Also maybe search for “check” instead of date?
  - **Kamimzc** (1↑): I've found that in many Trailhead modules, especially the more advanced ones like "Legend," you need to create the fields, objects, or other settings as part of the challenges before you can use them.  

Thank you for your help!
    - **Suspicious-Nerve-487** (2↑): Have you confirmed that you signed up for and are using the very specific dev org that is called out in that module?

You shouldn’t need to create these fields, as there would then need to be instructions around what information to populate on the records after creating the field
- **UbiquitousTool** (1↑): Trailhead can be super particular about these things. I'd double check two things:  
  
Is the 'Next Check-in Date' field actually added to the page layout for the specific record type (like Account or Opportunity) that the prompt template is supposed to run on? The builder often won't pick up a field if it's not accessible in the standard view.  
  
Did you select the correct resource in the step right before this? Sometimes if you select the wrong object, the available fields won't match what the instructions expect.  
  
If that doesn't work, sometimes the Trailhead playgrounds just glitch out. Logging out and back in can fix it. Annoying but true.
