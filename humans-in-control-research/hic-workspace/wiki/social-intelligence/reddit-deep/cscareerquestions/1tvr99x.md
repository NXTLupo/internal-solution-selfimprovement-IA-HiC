---
id: social-intelligence/reddit-deep/cscareerquestions/1tvr99x.md
url: "https://www.reddit.com/r/cscareerquestions/comments/1tvr99x/automated_my_job_search_with_claude_cowork_google/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Automated my job search with Claude Cowork + Google Sheets + some scripting. Sharing the architecture since I've seen a few posts asking about this."
author: "Lovamelin"
date: "2026-06-03T14:36:10.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 44
flair: ""
extracted_at: "2026-10-01T20:49:45.676Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tvr99x.md#c0"
    char_span: [0, 1440]
    sentence_count: 10
    key_terms: [job, search, follow-up, cscareerquestions, morning, roles, "i've", comments]
    concepts: [cscareerquestions, search, follow-up, morning, roles]
    token_count: 330
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1tvr99x/automated_my_job_search_with_claude_cowork_google/","kind":"social-post","date":"2026-06-03","author":"Lovamelin","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tvr99x.md#c1"
    char_span: [1455, 3180]
    sentence_count: 18
    key_terms: [referrals, people, applying, noise, worth, get, "i'm", real]
    concepts: [referrals, people, applying, noise, recruiters]
    section: Comments
    token_count: 409
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1tvr99x/automated_my_job_search_with_claude_cowork_google/","kind":"social-post","date":"2026-06-03","author":"Lovamelin","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tvr99x.md#c2"
    char_span: [3182, 5228]
    sentence_count: 18
    key_terms: [everything, lovamelin, claude, trying, build, skill, get, "i'm"]
    concepts: [everything, lovamelin, claude, trying, build]
    section: Comments
    token_count: 490
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1tvr99x/automated_my_job_search_with_claude_cowork_google/","kind":"social-post","date":"2026-06-03","author":"Lovamelin","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tvr99x.md#c3"
    char_span: [5230, 7014]
    sentence_count: 16
    key_terms: [automation, cowork, files, get, hit, work, automated, something]
    concepts: [automation, cowork, files, automated, something]
    section: Comments
    token_count: 386
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1tvr99x/automated_my_job_search_with_claude_cowork_google/","kind":"social-post","date":"2026-06-03","author":"Lovamelin","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tvr99x.md#c4"
    char_span: [7016, 9104]
    sentence_count: 16
    key_terms: [email, manager, recruiters, points, resume, sidedish120, find, like]
    concepts: [email, manager, recruiters, points, resume]
    section: Comments
    token_count: 490
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1tvr99x/automated_my_job_search_with_claude_cowork_google/","kind":"social-post","date":"2026-06-03","author":"Lovamelin","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1tvr99x.md#c5"
    char_span: [9106, 9382]
    sentence_count: 4
    key_terms: [hunter, api, free, systematic, automated, something, generous, finally]
    concepts: [hunter]
    section: Comments
    token_count: 69
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1tvr99x/automated_my_job_search_with_claude_cowork_google/","kind":"social-post","date":"2026-06-03","author":"Lovamelin","subreddit":"cscareerquestions"}]
---
# Automated my job search with Claude Cowork + Google Sheets + some scripting. Sharing the architecture since I've seen a few posts asking about this.

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1tvr99x/automated_my_job_search_with_claude_cowork_google/)
Posted by **Lovamelin** · **0↑** · **44 comments**

I've seen a few posts in here about job search tracking systems and thought I'd share what I built since it's been running well for a few months.

**The problem I was solving:** Applying to 20-30 roles a week, tracking in a spreadsheet, manually writing follow-up emails, manually opening job listings every morning. The cognitive overhead was making the search feel like a second full-time job.

**What I built:**

*Job discovery layer:* A scraper that pulls from Jobright's API and drops new matching roles into a Google Sheet daily.

*Follow-up automation:* When I mark an application as submitted, it triggers a Claude prompt that drafts a follow-up email. Queued to send 48-72 hours later. I review and approve before sending.

*Morning tab queue:* Roles I've flagged open automatically in Chrome each morning.

**Honest results:** Response rate went from roughly 5% to 12-15% on applications where follow-ups sent. Time to build: a few weekends. Maintenance: maybe 20 minutes a week.

Happy to go deep on any piece of this. What are you using to manage your search right now?

## Comments

- **TheBeAll** (8↑): This is why our company recruits almost entirely on referrals now.
  - **Lovamelin** (3↑): To some extent. It's more so because of all of the offshore and unqualified people applying to work. An average quality post coudl get 1,000 applicants in a week. Easily 90% aren't remotely qualified based on geo, not being a real person, or don't have the needed experience. Ironically, I'm producing way less noise than most. I'm just doing better at getting in first, the real goal of all of this. 

As for referrals, yeah, for sure. I had a friend applying to a role at CNN. The HM told him they were only working throuhg referrals, which they had roughly 100 of. So yeah, even these days referrals get a bit noisy. I try to only solicit a referral if I have a really warm connection that is on the hiring team or knows the HM. Otherwise I'm just another schlub being referred. But valid point!
    - **TheBeAll** (3↑): You’re giving those people the tools to cause more noise. 

Referrals are the future sadly.
- **besthelloworld** (20↑): Honestly you people suck. Literally just gumming up the system with slop applications is exactly what makes shit so messy and slow for people right now. Just talk to a fuckin recruiter and have them do this for you, but with actual intention.
  - **timelessblur** (-3↑): Tell me you are not looking with out telling me you are not looking. 

I agree mass spamming is useless and I am not doing that but hardest part is getting recruiters to contact you back or more so recruiters worth your time. 

For me I want a way to shift through the noise of tons of jobs not worth applying to and get it down to a more manageable number worth targeting and have a real shot at. 

For example I get hit up fairly often by recruiters for contacting companies that want me to take a 6-7 month contract at what would be 20-30% less than I was making but no benefits.  It is a hard pass. Some are very respectful when I explain I am looking for full time work only or when I answer for my hard floor for w2 contract work they back off.
    - **Lovamelin** (1↑): Save your beath. Haters gonna hate. Tis the Reddit way.
  - **Lovamelin** (-10↑): Lol, none of the applications are slop. I automated EVERYTHING around the application. I automated the discovery, search, follow up, etc. I stil manually apply to every job myself but spend way less time looking for high fit jobs. So no, you're totally wrong. I know tons of recruiters. I'm adding no noise, I just figured out a better way to be first, which is more important than ever in this market.
- **Chekonjak** (6↑): Just a heads up when you use a LLM to write a post look out for boilerplate phrases like “Honest ___.” Seeing the same writing style over and over gets pretty old. Ditto for over-eager “Happy to ___” engagement farming.
  - **Lovamelin** (-2↑): That's fair. I'm trying to train it better 😉

All of the work I did is still mine but I'm just trying to engage on reddit and get feedback. Lots of great feedback on LinkedIn already so now trying here. But thanks for the heads up. I try to still tweak and watch the drafts to be more human.
    - **Chekonjak** (4↑): Could you include an LLM disclaimer on future posts? Makes it less of a bad taste in the mouth to expect a human with unique writing and get something else instead.
- **timelessblur** (4↑): Can you share your prompts that you used to set it up in Claude. I assume you build a Claude skill and used that as the base


On my side I have a Claude skill I build that has a master resume in it and it will take job description and build custom resumes for everything which has improved things and like you have a spread sheet tracking everything and a rating for each job it sees matching my skill sets. 

Lastly it has a Texas Work force separate tracker built incase I ever get hit with a random audit during my unemployment making that turn over a lot easier. Plus when I have to request payment it has all the info on one spot for me to turn in
  - **Lovamelin** (0↑): I'm primarily using Claude Cowork as the automation engine and connective tissue.   
  
One cowork automation that does the daily follow up emails with a deep voice and skill file that covers all of my experience, formatting guidelines, etc. That took quite a bit of tweaking to get exactly what I wanted and produce something that I felt sounded like me and hit the hit all the points I wanted it to. 

One cowork automation does the jobright scraping as it requires some Claude Chrome browser agent work. 

And then a cowork automation for opening the queued jobs from my Google Sheet every morning. It was more reliable than a cron job. 

I don't bother wiht custom resumes anymore. There's no real ROI in my opinion. I've been in product design for 14 years so at this point a lot of the keywords needed are naturally seeded in my resume. I tried customizing resumes for a couple months, saw zero lift from it so stopped doing it. Takes way too much work and time. Granted I never fully automated it, but just didn't feel like it was worth spending time on anymore. 

As for the skill files attached to each automation and the App Script GS files in Google Sheets I'm not sure how to best share those? Each is quite lengthy and I doubt they let you upload files in here do they? Happy to share via DM or something if that's better for sharing that type of content.
    - **timelessblur** (1↑): I recommend trying to get it automated as if it was not for the automation I agree not worth the effort for the gains. 

In my case while I am at 14 years of iOS development and have a ton of key words it helps in flexy the resume in different directions. Like my back ground has full greenfield in it, I have maintenance and going into existing code bases, I have manager experience, tech lead, put IC. Last title was manager that still coded a lot.   It more to flex the resume in roll that wants more greenfield then those points are pushed, more manager based change the wording and key points a little that way.   More letting Claude change the things on my resume to put top of list and push forward while while say it’s IC push down the pure manager stuff and tweak it more to show mentoring over manager.  Hard rules like never lie and never exaggerated. 

Helps quite a bit.
- **SideDish120** (1↑): Would love to trial this if I could via GitHub? Private repo is fine too if you would be open to it.
  - **Lovamelin** (1↑): Currently not on a Github repo. But happy to share over via DM as it's easiest to just email you the zip of the job stack.
    - **jerry_kook** (1↑): I would love to try it out too!
    - **SideDish120** (1↑): Sent you a chat!
- **GioPeyo** (1↑): How do you find the persons email for a follow up ?
  - **Lovamelin** (1↑): I used to do it all manually. I would take an email from the company saying "Thanks for applying" then go on LinkedIn find what I felt was the most relevant recruiter (or sometimes I looked for who was most recently active on LI, some recruiters aren't on LI much ironically) and then I use [hunter.io](http://hunter.io) to find their email address to email them directly. I saw some real results doing this. I used to email hiring managers sometimes but they were less responsive and their head isn't in the space as much. Recruiters expect emails from applicants, hiring managers don't. Occasionally you're rewarded for your initiative but more likely not and some people get salty so I stick with recruiters. 

This was all manual and took a lot of time. I would then write emails using a template and customize bullet points and the like each time. 

It was systematic enough that I finally automated it. [hunter.io](http://hunter.io) has an API but you can also use it as a regular user and get 50 free lookups a month. So it's pretty generous for free. Even their API costs are super cheap. I think 1000 for $50 or something?
