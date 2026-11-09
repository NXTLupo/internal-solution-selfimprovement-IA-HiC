---
id: social-intelligence/reddit-deep/internships/1wdkz7r.md
url: "https://www.reddit.com/r/internships/comments/1wdkz7r/made_a_selfupdating_internship_tracker_repo_3200/"
kind: "social-post"
source: "reddit-deep: r/internships"
subreddit: "internships"
title: "Made a self-updating internship tracker repo (3200+ SWE/AI/Quant/PM/Hardware listings, refreshes 5x/day) + built-in application tracker"
author: "HotCalendar5711"
date: "2026-09-11T16:23:44.000Z"
score: 2
upvote_ratio: 1
num_comments: 0
flair: "Applications"
extracted_at: "2026-10-01T20:49:41.899Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/internships/1wdkz7r.md#c0"
    char_span: [0, 1397]
    sentence_count: 3
    key_terms: [tracker, listings, scripts, github, python, track, application, internships]
    concepts: [tracker, listings, scripts, github, python]
    token_count: 383
    sources: [{"n":"reddit-deep: r/internships","u":"https://www.reddit.com/r/internships/comments/1wdkz7r/made_a_selfupdating_internship_tracker_repo_3200/","kind":"social-post","date":"2026-09-11","author":"HotCalendar5711","subreddit":"internships"}]
---
# Made a self-updating internship tracker repo (3200+ SWE/AI/Quant/PM/Hardware listings, refreshes 5x/day) + built-in application tracker

Source: [reddit-deep: r/internships](https://www.reddit.com/r/internships/comments/1wdkz7r/made_a_selfupdating_internship_tracker_repo_3200/)
Posted by **HotCalendar5711** · **2↑** · **0 comments**

Hey all!  
  
I built this because I was sick of juggling a spreadsheet plus five different "awesome-internships" repos that all go stale.

[2027 Internship Tracker](https://github.com/SuryaHarikrishnan/2027-internship-tracker) is a GitHub repo with:

* **3,200+ active listings** for Summer 2026/2027 across SWE, AI/ML, Quant Finance, Hardware, and PM
* Listings **auto-refresh 5x a day** via GitHub Actions, so it doesn't go stale like most lists
* A **Top 20** page ranked by freshness + company signal + YC batch, updated daily
* A built-in **application tracker** — fork it, and you get a script to log where you applied, when, and a `days-since-applied` column so nothing quietly dies in your inbox

&#8203;

    python scripts/track.py add "Stripe" "SWE Intern" "2026-08-11" "Applied"
    python scripts/track.py update 0 "Interviewed"
    python scripts/track.py render   # writes APPLICATIONS.md

Free, open source, no sign-up. Fork it if you want your own copy of the tracker: \[link\]

Happy to add sources if people know of good ones I'm missing.
