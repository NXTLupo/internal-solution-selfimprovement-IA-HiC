---
id: social-intelligence/reddit-deep/internships/1wsfy5v.md
url: "https://www.reddit.com/r/internships/comments/1wsfy5v/an_internship_automation_tool_with_interactive/"
kind: "social-post"
source: "reddit-deep: r/internships"
subreddit: "internships"
title: "an internship automation tool with interactive dashboard"
author: "Mhdhdd"
date: "2026-09-28T14:21:12.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 2
flair: "Interviews"
extracted_at: "2026-10-01T20:49:41.904Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/internships/1wsfy5v.md#c0"
    char_span: [0, 2304]
    sentence_count: 18
    key_terms: [emails, email, sending, internship, need, workflow, easily, gonna]
    concepts: [emails, email, sending, internship, workflow]
    token_count: 509
    sources: [{"n":"reddit-deep: r/internships","u":"https://www.reddit.com/r/internships/comments/1wsfy5v/an_internship_automation_tool_with_interactive/","kind":"social-post","date":"2026-09-28","author":"Mhdhdd","subreddit":"internships"}]
  - id: "social-intelligence/reddit-deep/internships/1wsfy5v.md#c1"
    char_span: [2306, 3233]
    sentence_count: 8
    key_terms: [emails, "i'm", name, companies, intern, cause, large, gave]
    concepts: [emails, companies, intern, cause, large]
    section: Comments
    token_count: 219
    sources: [{"n":"reddit-deep: r/internships","u":"https://www.reddit.com/r/internships/comments/1wsfy5v/an_internship_automation_tool_with_interactive/","kind":"social-post","date":"2026-09-28","author":"Mhdhdd","subreddit":"internships"}]
---
# an internship automation tool with interactive dashboard

Source: [reddit-deep: r/internships](https://www.reddit.com/r/internships/comments/1wsfy5v/an_internship_automation_tool_with_interactive/)
Posted by **Mhdhdd** · **0↑** · **2 comments**

Hey guys, this year is my final year in engineering studies, and so I need to find an end-of-study internship.

So I started sending emails, applications, etc. I sent more than 100 requests, but the responses were a surprise for me. I couldn't find an opportunity due to the big demand.

And from that came an idea to my head: let's build my own automation workflow to automate email sending.

But the problem was too simple: emails need to be customized. And the solution is even simpler: make a scraper agent that checks the target context and feeds it to the email writer.

But I'm gonna use free API key models, so I can't fully rely on them to write my emails. And that's where I dropped my own email template, with the format I wanted and injection sections for the AI, which are soooo restricted and limited to avoid inventing things and using those very standard AI words that will make you look like a bot in front of company recruiters hahah.

Another point I noticed is that I still need to check the emails because I may want to change something. So it's not gonna be a fully automated workflow.

And here is where I added the core idea: the workflow simply builds you a loooot of emails ready to send with just one click. It uses Google Auth API to link easily with Gmail, and just by clicking "View," it's gonna show you the email content, AI logs to track the source of the data and what the AI did, and you can even modify the emails before sending them.

So it became a full app, and I'm relying on it every day.

All you need as a user is to upload your CV, a CSV containing a list of emails (I'm using one that contains more than 20K emails), an email template, and API keys, which are easily configurable in the dashboard. Then you connect your email easily with Google Auth.

The goal is simple: boost your email sending and enhance your opportunity to find an internship by increasing the quantity while keeping the quality customized and under your control!!!

I personally moved from sending around 7 emails per day to more than 40.

I'm saying this because I'm thinking about making it a startup idea. You know, I'm a student and need some pocket money hahah.

I need to hear your opinion as a community. I hope to hear from you about the idea and whether you'd be interested!

## Comments

- **EmarialArtayu** (1↑): I know as an HR intern at 5 different large companies and the us federal government my team and others (including ta) typically junk those emails. I got 3 emails last summer cause I was at a fortune 150 from people i didn't know asking for referrals / contacts or a job. Its annoying. 

The only time I've seen random emails work in the US at large (10k+) employee companies is if they had an internal name to say "X gave me your email / name". Ie this worked for me cause it was an HR director who gave me the name, I had a specific requisition I applied to, and I was able to say in two sentences what I brought to the table as an HR intern.
