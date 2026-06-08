---
id: social-intelligence/reddit-deep/neu/1t5nwew.md
url: "https://www.reddit.com/r/NEU/comments/1t5nwew/course_explorer/"
kind: "social-post"
source: "reddit-deep: r/neu"
subreddit: "neu"
title: "Course Explorer"
author: "jerry_zzz"
date: "2026-05-06T19:54:30.000Z"
score: 48
upvote_ratio: 0.99
num_comments: 7
flair: "Academics"
extracted_at: "2026-05-18T13:18:36.379Z"
extraction_method: "praw-deep"
research_goal: "Generate a slide-ready consulting report for NXT Humans, structured as an Executive Summary, Meeting Guardrails and Validation Criteria, Ideas to Retire or Reframe, Five CLR-Dependent Recommendations, Five Non-CLR Recommendations, Recommended Prioritization, and Suggested Next Steps for NXT Humans. This report must present 10 practical, AI-enabled recommendations for Northeastern University's first-year students to improve co-op and experiential learning readiness. Five recommendations must leverage CLR data and infrastructure, and five must be valuable independently of CLR. Each recommendation requires a title, description, rationale for first-year students and co-op readiness, explanation of CLR dependency/independence, execution within Northeastern's existing experiential learning stack, integration with Microsoft Copilot/365/Teams/SharePoint/Power Automate/Power BI for cost reduction, key stakeholders, implementation steps, risks, and explicit validation against Liz and Jen’s guardrails (cost containment, Microsoft ecosystem, no new platforms, advisor/student burden, AI-enabled, practical). The report should also summarize Liz and Jen’s priorities and non-starters, core design principles, and previous NXT Humans ideas to retire or reframe. Output the #recommendations #NU in this format, including tables comparing implementation complexity, student impact, Microsoft/Copilot fit, dependency, stakeholder burden, and strategic alignment."
industries: [higher_ed]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/neu/1t5nwew.md#c0"
    char_span: [0, 1213]
    sentence_count: 8
    key_terms: [neu-course-explorer, course, https, neu, explorer, section, xianruizhong, com]
    token_count: 301
  - id: "social-intelligence/reddit-deep/neu/1t5nwew.md#c1"
    char_span: [1228, 2447]
    sentence_count: 6
    key_terms: [topics, conversational, banner, northeastern, topic, designing, different, amazing]
    section: Comments
    token_count: 332
---
# Course Explorer

Source: [reddit-deep: r/neu](https://www.reddit.com/r/NEU/comments/1t5nwew/course_explorer/)
Posted by **jerry_zzz** · **48↑** · **7 comments**

Hi, I'm an incoming CS PhD student where I comes from has a nice course explorer to check the courses offered in a specific semester, and you can see all the section information of a specific course. I couldn't find such a tool for NEU so I built one. The link is [https://neu-course-explorer.vercel.app](https://neu-course-explorer.vercel.app)

Later I found SearchNEU and coursicle, but there are still some unique features of NEU course explorer:

* Search by instructor (P3), which is very useful for me as I need to find the reading course taught by my advisor. You can also use this function to search for courses taught by the professors you want to work with.
* Display and navigate by section name (P4). For instance, CS7180 in Fall 2026 has three section names, you can easily distinguish between sections with different focus.

The enrollment is updated in about every 30 minutes. The code is at [https://github.com/xianruizhong/Neu-Course-Explorer](https://github.com/xianruizhong/Neu-Course-Explorer). Please feel free to submit issues.

## Comments

- **New_Pilot_3176** (8↑): wait this is so amazing
- **diet_of_data** (3↑): very sleek and amazing user experience! just one point - northeastern has “topics in” courses which appear in the catalog as a generic shell like this one (https://neu-course-explorer.vercel.app/schedule/2026/fall/ARTG/3400) but banner actually lists the name and description of the specific topic of a section - they are re studios with different topics.
  - **jerry_zzz** (3↑): Thanks for your feedback! I'm a bit confused. The website list the topics "Topics In Interaction Design Inquiry" and "Designing Conversational AI", which are the same in banner. Do you mean I should add "Topic: Designing Talking Machines: Conversational AI." for section 01? Could you clarify it a little more?
    - **diet_of_data** (3↑): yes exactly. you can think of “topics in” courses at northeastern as containers that can be filled with different topics (for example in this case, conversational AI). banner will show the actual topic while the catalog shows only the name of the container course. The course number and prefix stay the same.
- **Well_-Oiled_Machine** (1↑): 🔥🔥🔥🔥🔥🔥🔥🔥🔥
- **GooseClimber** (1↑): Saving ts
- **Last_Passion_1872** (1↑): love it
