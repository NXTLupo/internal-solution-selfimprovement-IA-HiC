---
id: social-intelligence/reddit-deep/uwaterloo/1qf4tcp.md
url: "https://www.reddit.com/r/uwaterloo/comments/1qf4tcp/uwpathr_degree_planner_for_cs_students/"
kind: "social-post"
source: "reddit-deep: r/uwaterloo"
subreddit: "uwaterloo"
title: "UWPathr: Degree planner for CS students"
author: "Flippyy4"
date: "2026-01-17T05:32:33.000Z"
score: 4
upvote_ratio: 0.7
num_comments: 2
flair: ""
extracted_at: "2026-10-01T20:49:32.733Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/uwaterloo/1qf4tcp.md#c0"
    char_span: [0, 2179]
    sentence_count: 16
    key_terms: [uwpathr, https, students, prerequisites, degree, uwaterloo, courses, website]
    concepts: [uwpathr, https, prerequisites, students, degree]
    related_chunks: ["social-intelligence/reddit-deep/uwaterloo/1qf4tcp.md#c1"]
    token_count: 509
    sources: [{"n":"reddit-deep: r/uwaterloo","u":"https://www.reddit.com/r/uwaterloo/comments/1qf4tcp/uwpathr_degree_planner_for_cs_students/","kind":"social-post","date":"2026-01-17","author":"Flippyy4","subreddit":"uwaterloo"}]
  - id: "social-intelligence/reddit-deep/uwaterloo/1qf4tcp.md#c1"
    char_span: [2181, 2651]
    sentence_count: 1
    key_terms: [png, prerequisites, preview, format, https, width, auto, redd]
    concepts: [prerequisites, preview, format, https, width]
    related_chunks: ["social-intelligence/reddit-deep/uwaterloo/1qf4tcp.md#c0"]
    token_count: 167
    sources: [{"n":"reddit-deep: r/uwaterloo","u":"https://www.reddit.com/r/uwaterloo/comments/1qf4tcp/uwpathr_degree_planner_for_cs_students/","kind":"social-post","date":"2026-01-17","author":"Flippyy4","subreddit":"uwaterloo"}]
---
# UWPathr: Degree planner for CS students

Source: [reddit-deep: r/uwaterloo](https://www.reddit.com/r/uwaterloo/comments/1qf4tcp/uwpathr_degree_planner_for_cs_students/)
Posted by **Flippyy4** · **4↑** · **2 comments**

Hey everyone! I’ve been working on **UWPathr**, an open-source web app designed to help UW CS students plan their degrees.

Besides being a degree planner, it automatically checks prerequisites, enforces degree requirements, and helps you plan out those upper year courses with a ton of prerequisites so you know early on what courses to take.

**Why I made this:** Unlike other programs that have degrees fully planned out, CS students have to plan 5 years of courses themselves. Furthermore, most planners don’t actually enforce requirements or check prerequisites, they’re just for tracking. UWPathr fixes that.

The dashboard is essentially just the CS degree checklist the university provides, but I have only added the non-specialization 2025-2026 one so far. Click [here](https://cs.uwaterloo.ca/sites/default/files/uploads/documents/2025-2026-bcs.pdf) to view it.

This is my first full-stack website and first open-source project, so I’d love for fellow CS students to check out both the repo and website, try it, and share feedback! Let me know if you encounter bugs or errors.

Also, **contributors** are welcome, especially for the frontend/UI. Most of the frontend code (excluding authentication and basic layout) was AI-generated, so it could use some polishing (I do not know much react/nextjs). There are also some more features I want to work on soon. If you find this project useful and want to help improve it, contributions would be super appreciated.

I’ve added an installation guide in the README, but let me know if you run into issues.

Lastly, there is an **Important Notice** section in the README that I encourage people to check out before using this website.

**Links:**

* [https://www.uwpathr.rocks](https://www.uwpathr.rocks)
* [https://github.com/SurenMar/uwpathr](https://github.com/SurenMar/uwpathr)

For the sake of my wallet, the backend is scaled to zero. So, the first request may take a minute if the server was idle.

Here are some pictures of the dashboard (More in the README):

[Prerequisites for GER 331 were not completed.](https://preview.redd.it/hv8jaju9dudg1.png?width=2939&format=png&auto=webp&s=50689bbbc53dba6f5cbbd67aade582835a8c2dc3)

[Planning out prerequisites for MATBUS 470](https://preview.redd.it/ol4lbtlrdudg1.png?width=2940&format=png&auto=webp&s=8a29dffcd41149f30ab0971ca8af2d930cea5d24)

## Comments

- **Ok-Sample-8982** (2↑): Good write up and sounds interesting!
