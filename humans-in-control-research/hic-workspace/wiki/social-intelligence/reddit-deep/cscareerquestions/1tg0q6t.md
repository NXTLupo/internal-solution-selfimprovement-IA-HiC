---
id: social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md
url: "https://www.reddit.com/r/cscareerquestions/comments/1tg0q6t/cs_career_path_advice_software_systems_engineering/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "CS Career Path Advice. (Software Systems Engineering?)"
author: "Superdude11235"
date: "2026-05-17T20:23:58.000Z"
score: 2
upvote_ratio: 1
num_comments: 5
flair: "Student"
extracted_at: "2026-06-03T18:35:34.173Z"
extraction_method: "praw-deep"
research_goal: "Identify strategic opportunities for Northeastern University to enhance experiential learning and co-op success, specifically focusing on First Year Student Preparedness, unifying fragmented student data into a 360 student profile, improving advisor capabilities, and strengthening corporate partner development. Leverage deep industry research, stakeholder transcripts, social data, articles, and news to inform this strategic analysis. \n"
chunks:
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md#c0"
    char_span: [0, 1799]
    sentence_count: 14
    key_terms: ["i've", cscareerquestions, unfortunately, verification, enjoy, engineering, programming, comments]
    concepts: [cscareerquestions, unfortunately, verification, engineering, programming]
    token_count: 384
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1tg0q6t/cs_career_path_advice_software_systems_engineering/"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md#c1"
    char_span: [1801, 2903]
    sentence_count: 12
    key_terms: [semester, systems, career, distributed, "i'm", compilers, school, seems]
    concepts: [semester, systems, career, distributed, compilers]
    related_chunks: ["social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md#c3"]
    token_count: 236
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md#c2"
    char_span: [2917, 3454]
    sentence_count: 1
    key_terms: [engineering, systems, formal, good, wild-ganache3061, infrastructure, verification, distributed]
    concepts: [engineering, systems, formal]
    related_chunks: ["social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md#c3"]
    section: Comments
    token_count: 100
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md#c3"
    char_span: [3459, 5541]
    sentence_count: 8
    key_terms: [systems, distributed, like, infrastructure, cloud, engineering, jobs, want]
    concepts: [systems, distributed, infrastructure, engineering, cloud]
    related_chunks: ["social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md#c1", "social-intelligence/reddit-deep/cscareerquestions/1tg0q6t.md#c2"]
    section: Comments
    token_count: 478
---
# CS Career Path Advice. (Software Systems Engineering?)

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1tg0q6t/cs_career_path_advice_software_systems_engineering/)
Posted by **Superdude11235** · **2↑** · **5 comments**

Hey y'all, CS student #482938243 here. I was hoping some of you could give me some advice for how to move forward in my career so that I can ultimately get a job that I enjoy.

  
I'm a rising senior studying Computer Science with a minor in math. I enjoy the logical and puzzle-solving part of programming, as well as the rigorous proof writing in math. Unfortunately, before this past semester I really didn't understand my own interests and or know what I wanted to specialize in (and I'm still not sure!) I've tried robotics, web development, and machine learning, but none of them clicked the same way the core CS classes did. However, Operating Systems was probably my favorite CS class I've taken here. I loved thinking about concurrency, including ways to avoid race conditions, maximize throughput, and avoid deadlocks. Overall, I like programming where correctness and efficiency are the priorities.

Another thing I've enjoyed is formal verification research. I've been helping a professor with his project that aims to automatically find inductive invariants for distributed protocols. I've been enjoying it, though I feel that there's a lot more for me to learn about formal verification.

This summer, I'll be working at a startup that develops manufacturing engineering technology as a software engineer. I know I'll be pretty busy, and depending on how much I enjoy it, it could greatly impact what I want to work on in the future. I don't know much more specific information yet, unfortunately, but I start soon.

My plan for next semester is to take distributed systems, cyber security, and formal methods. I didn't really consider cybersecurity much until recently, but it also seems like something I may be interested in. Beyond this, do you have any advice for what I should be focusing on? I have enough credits to graduate after next semester, and I'm not sure what to do. I could either try to get a job, stay in college an extra semester, or apply for a one-year masters program. Do you think that staying in school is worth it, and may lead to more opportunities? If I stay in school longer I'm thinking of taking cryptography, compilers, and/or programming languages.

In terms of my career, from what I've gathered, it seems like a career in systems software may be good for me. I know that's a pretty broad field that includes infrastructure, SRE, compilers, kernel, and distributed systems engineering, so I'm not sure what to focus on (if I should at all). What is the career prospect in these fields, and what would you recommend for me? And what else should I do to prepare?

Thanks for all the help!

## Comments

- **Wild-Ganache3061** (1↑): sounds like systems engineering could be good fit for you. based on what you described about loving os concepts and formal verification, maybe look into infrastructure or platform engineering roles after graduation

  
regarding staying extra semester - if you're already doing well with research and have summer internship lined up, might be worth just finishing and getting real world experience. the one year masters could be good if you want to dive deeper in formal methods or distributed systems though

  
for career prospects, systems roles are pretty solid right now especially with all the cloud infrastructure growth. infrastructure teams at tech companies are always hiring and pay is decent
- **st4rdr0id** (1↑): As someone who did a grad project on FM, it sounds like you are going to suffer in 99% of the tech jobs out there. If you want FM-related jobs you need to look into embedded critical software like railways, avionics, space... I don't know which systems engineering jobs are left out there but the cloud systems have already been built in the 2010s, so the market is going to be dry. The new thing is AI and datacenters. FM will never get the spotlight again like when all those distributed systems in the cloud were being built. I'd say FM will go back to niche status.
  - **Superdude11235** (1↑): That's unfortunate. What do you recommend I do instead?
    - **st4rdr0id** (1↑): I forgot to say that there are a number of distributed systems companies using modern formal methods such as TLA+: The Azure CosmosDB team, the AWS S3, DynamoDB and EBS teams, the MongoDB guys, ElasticSearch,OCI, CockroachDB..., but i think we are past the boom of distributed systems. Still if you can land a job at any of these, it might be what you are looking for.
- **Deep_Ad1959** (1↑): the upside of liking systems work is that almost every project you'd want to work on is public. lkml, pgsql-hackers, the rust-lang compiler PRs, the postgres commitfest, the kubernetes sig-storage meeting notes, the linux-mm archives. spend two weeks following the activity stream on one or two of those and you'll know whether the rhythm of that work is what you want your tuesday afternoons to look like, in a way no internship rotation can tell you. for the formal methods angle specifically, tigerbeetle, sled's old design docs, lean4's mathlib, and the rust-for-linux integration are where you can watch fm-flavored engineering land in shipping code instead of papers. that observation alone is worth more than picking between distributed systems and compilers right now. written with s4lai
