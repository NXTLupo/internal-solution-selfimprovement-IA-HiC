---
id: social-intelligence/reddit-deep/cscareerquestions/1v4ctne.md
url: "https://www.reddit.com/r/cscareerquestions/comments/1v4ctne/feedback_requested_job_portal_for_tech_jobs/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Feedback requested: Job portal for tech jobs - Filter by tech stack, remote pref, salary etc."
author: "leventus93"
date: "2026-07-23T12:42:29.000Z"
score: 0
upvote_ratio: 0.43
num_comments: 12
flair: ""
extracted_at: "2026-10-01T20:49:45.678Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/cscareerquestions/1v4ctne.md#c0"
    char_span: [0, 1050]
    sentence_count: 7
    key_terms: [remote, cscareerquestions, jobs, https, com, tech, comments, jobhose]
    concepts: [cscareerquestions, remote, https, comments, jobhose]
    token_count: 248
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1v4ctne/feedback_requested_job_portal_for_tech_jobs/","kind":"social-post","date":"2026-07-23","author":"leventus93","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1v4ctne.md#c1"
    char_span: [1065, 1220]
    sentence_count: 1
    key_terms: [aes256gcm, intuitive, vibecoded, cursory, avoids, claude, design, glance]
    section: Comments
    token_count: 39
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1v4ctne/feedback_requested_job_portal_for_tech_jobs/","kind":"social-post","date":"2026-07-23","author":"leventus93","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1v4ctne.md#c2"
    char_span: [1222, 3241]
    sentence_count: 13
    key_terms: [leventus93, boards, seniority, filters, structured, job, intern, board]
    concepts: [leventus93, seniority, boards, filters, structured]
    section: Comments
    token_count: 489
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1v4ctne/feedback_requested_job_portal_for_tech_jobs/","kind":"social-post","date":"2026-07-23","author":"leventus93","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1v4ctne.md#c3"
    char_span: [3243, 4336]
    sentence_count: 10
    key_terms: [postings, good, job, extraction, companies, language, quality, issues]
    concepts: [postings, extraction, companies, language, quality]
    section: Comments
    token_count: 230
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1v4ctne/feedback_requested_job_portal_for_tech_jobs/","kind":"social-post","date":"2026-07-23","author":"leventus93","subreddit":"cscareerquestions"}]
---
# Feedback requested: Job portal for tech jobs - Filter by tech stack, remote pref, salary etc.

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1v4ctne/feedback_requested_job_portal_for_tech_jobs/)
Posted by **leventus93** · **0↑** · **12 comments**

Hey all,  
when looking for some remote jobs I was having a hard time finding the right, relevant jobs for my preferences (tech stack, remote preference, remote restriction such as location, salary). So I built a job portal that scrapes thousands of companies' ATS (apllicant tracking system) boards continuously, enriches them via a LLM and writes it into a database in a structured/filterable format.

**I built:** [https://jobhose.com/](https://jobhose.com/)

You can filter for the right jobs using the UI, or also hook up your coding agent to use the API directly. The enrichment was quite token intensive so I am planning to not keep it for myself only and continue to operate it. What do you think about it? Any thoughts / wishes? Is it useful?

## Comments

- **AES256GCM** (2↑): From cursory glance, looks really good and intuitive and avoids the the kind of design I see from most vibecoded Claude Code web apps

Nice work.
  - **leventus93** (1↑): Thanks, appreciate it. The frontend is mostly vibe coded too, but I know exactly what you mean. I hate the standard ui patterns that ai generates
- **MarcableFluke** (2↑): https://xkcd.com/927/
- **my_peen_is_clean** (1↑): cool idea, the tech stack + location filters are actually what i wish other boards had tbh. please add years of experience / seniority filters and date posted sorting. really hope it sticks around, hunting right now is awful
  - **leventus93** (1↑): Thanks for taking a look and your feedback. There is a "seniority" filter which is kinda meant to reflect this. I think for LLMs (and humans too?) it's not always easy to extract the required seniority for a given posting. Did you notice and test this filter? Any specific job posts where this may be off so that I could have a look what went wrong?
  - **leventus93** (1↑): Can't upload pictures here, but here's a search url that filters for jobs where seniority is == intern: [https://jobhose.com/?sen=intern](https://jobhose.com/?sen=intern) . Quite a few filters are supported, maybe I need to think how to make them more accessible
- **igot2pair** (1↑): Howd you build the scrapers for each portal?
  - **leventus93** (3↑): Actually most ATS just expose their boards with the active postings as structured JSON, so for each board it's literally just a normal HTTP request to retrieve all open job postings in an already structured way. No HTML parsing or n requests per board or so. The hardest part here was getting all the boards that you want to fetch and the fact that companies happen to switch between ATS (e.g. from Greenhouse to Ashby) which means you have to update the board. That is still manual work to update then.
- **ishvirchopra35** (1↑): Interesting approach. Scraping ATS boards directly and enriching with an LLM is a smart way to get cleaner structured data than what most job APIs provide. The filtering by tech stack is something job seekers genuinely want and most boards do badly.

Curious how you're handling the enrichment quality. LLM extraction on job postings can be inconsistent, especially for salary ranges where companies deliberately obscure the numbers. Are you doing any validation pass on top of the raw extraction?
  - **leventus93** (1↑): Good question , this is what has taken me the longest time. I wanted the cheapest possible model that still meets the quality bar. So I had around 100 „golden tests“ that I evaluated against and tested different models too. Whenever I spotted a new issue I added it to the test set and had Claude code tune the prompt automatically. That was working well because I covered a good chunk of potential issues. It’s never perfect I guess, but it seems quite good and the remaining issues are really tricky or plain wrong job postings. I learned that companies often copy paste the postings from other roles and forget to edit / remove something
- **baldachinsblessing** (1↑): I really like it, very pleasant to use. It would be nice to have the option to filter by posting language as well as language(s) required by the job.
