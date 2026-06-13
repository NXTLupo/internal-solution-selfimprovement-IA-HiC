---
id: social-intelligence/reddit-deep/dataengineering/1prs6gr.md
url: "https://www.reddit.com/r/dataengineering/comments/1prs6gr/seeing_posts_about_using_google_sheets_and_excel/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Seeing posts about using Google sheets and excel as database a lot in LinkedIn, this bothers me so much"
author: "Old_Tourist_3774"
date: "2025-12-20T23:45:49.000Z"
score: 72
upvote_ratio: 0.92
num_comments: 38
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.217Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1prs6gr.md#c0"
    char_span: [0, 1221]
    sentence_count: 11
    key_terms: [database, dataengineering, google, sheets, using, spreadsheet, comments, client]
    token_count: 268
  - id: "social-intelligence/reddit-deep/dataengineering/1prs6gr.md#c1"
    char_span: [1236, 3093]
    sentence_count: 11
    key_terms: [spreadsheet, data, use, simple, break, "don't", rdbms, leogodin217]
    section: Comments
    token_count: 426
  - id: "social-intelligence/reddit-deep/dataengineering/1prs6gr.md#c2"
    char_span: [3095, 4876]
    sentence_count: 21
    key_terms: [spreadsheet, data, solution, often, application, mvp, production, integrity]
    section: Comments
    token_count: 383
  - id: "social-intelligence/reddit-deep/dataengineering/1prs6gr.md#c3"
    char_span: [4878, 5889]
    sentence_count: 8
    key_terms: [almost, issues, bad, witty-ninja-8403, preferences, spreadsheet, deployment, industries]
    section: Comments
    token_count: 246
  - id: "social-intelligence/reddit-deep/dataengineering/1prs6gr.md#c4"
    char_span: [5892, 7444]
    sentence_count: 9
    key_terms: [people, "don't", data, "it's", like, understand, interface, something]
    section: Comments
    token_count: 370
  - id: "social-intelligence/reddit-deep/dataengineering/1prs6gr.md#c5"
    char_span: [7446, 8096]
    sentence_count: 3
    key_terms: [scaling-to-millions-with-google-sheets, original, levels, pretty, sheets, fyi, used, completely]
    section: Comments
    token_count: 166
---
# Seeing posts about using Google sheets and excel as database a lot in LinkedIn, this bothers me so much

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1prs6gr/seeing_posts_about_using_google_sheets_and_excel/)
Posted by **Old_Tourist_3774** · **72↑** · **38 comments**

Seems it is such a can of worms and borderline creating "solutions"  for things that are not problems.
One time I suggested using a regular database like SQlite and the dude used my comment later to post saying how I was basically a retard to suggest to some old sir to use and  understand a database.

#Here is one exemple:

>I’m developing an MVP for a small client who needed agility and, above all, zero initial infrastructure cost. The solution?
I turned a Google Sheets spreadsheet into the backend.
The scenario:
Stack: Node.js consuming the Google Sheets API.
Goal: Validate an idea quickly, with minimal bureaucracy.
Client advantage: They can manage the data themselves using an interface they already know (the spreadsheet!), and the website updates in real time. Cost: $0.
My “software engineer” side screams: “This won’t scale! What about the API rate limits? Where’s relational integrity?!”

## Comments

- **Ok_Yesterday_3449** (48↑): I think neither "this is a terrible idea that should be avoided at all costs" nor "why do databases even exist?" are correct. 

There's certainly some benefits in some situations. I think the greatest benefit is that if you need to allow one or two non technical people to have full admin access over some dynamic data, the spreadsheet is indeed the most familiar interface over any other DB admin UI or custom tool. But the downsides may overweigh the upsides and it's certainly not the only simple and cost effective structured storage solution.
- **leogodin217** (28↑): I don't know. I bet there are more use cases served by Sheets and Excel than RDBMS. For small use cases at least. Old SharePoint used to be good for this as well until they kept removing features. Like everything else, there are tradeoffs. And we should evaluate the good and bad.
  - **Acceptable_Durian868** (7↑): The problem with something like this is that the data schema isn't enforced by anything and it's simple to break your website by doing normal spreadsheet operations like merging or hiding columns.
    - **themightychris** (12↑): sure, but we don't live in a world where you can get everyone to maintain an RDBMS

Often your choices are: give them a better way to maintain the data in a spreadsheet, or don't have the data because they're going to keep it in a spreadsheet anyway and not use whatever workflow you set up for them to get it into an RDBMS consistently

Yeah they can break it—so you need some validation and a feedback loop so they get an email or Teams message if they break it
    - **leogodin217** (2↑): Again, it depends on the use case. Building an app to manage an internal process that adds/updates tens of records a day is easy to manage. Spreadsheets can have validation, lookups, etc. to enforce a simple schema. 

Building a high-frequency trading app with lots of user input... Well that's a different story.
    - **GuhProdigy** (1↑): I wouldn’t use a spreadsheet for data input for  website or application but i think for some analytical use cases it’s a decent solution. Smartsheets enforces data integrity and I think you might be able to enforce such integrity with other spreadsheet services.
- **Creyke** (10↑): Idk man. Coming from a company where I’ve spent the last 3 years un-fucking everyone’s spreadsheet “MVPs” that all made it into production…. Just do it right the first time. Unfortunately, nothing is more permanent than a temporary solution, and things often languish in MVP stage far longer than you’ll ever expect. Often the MVP is the P, and you’ll have to live with whatever architecture was originally built. 

Spreadsheet for a POC? Maybe… but MVP? Often a bad idea. 

For a website just displaying some data… probably a fine solution I grant you. But for anything more complex, no. How are you handling pushing the data? Do you have a Dev/PPE/Prod spreadsheet? Do you run tests to validate the data before it gets pushed live? How are you managing the schema of the spreadsheet against your application layer? What if you need to roll back? 

If your client can’t handle using git or some other workflow to update the data, I’d want some substantial guard rails in place if I am letting them edit production data. At least some type of defined deployment flow with validation and integration testing. 

A cloud hosted DB has pretty minimal costs. Databases have tons of advantages, but the one of the most important is they are robust and conform to a design standard with means that the next guy who comes along wont be stuck unpicking a bespoke spreadsheet solution.

Also, DBs are not the only solution. I often favour config files in a git repo for dynamic data that I need to let clients manage. That way they can be CI/CD integrated, with any necessary deployment, version management, and testing built in.
  - **Old_Tourist_3774** (1↑): I don't know, seems almost like snakeoil you know? Of course there are use case but i fail to see and thats why shared this here, you guys are a good source.
    - **Creyke** (3↑): Ultimately we’re all just espousing opinions. Plus, LinkedIn is literally a hellscape. Almost nothing I read there is worth mentioning, basically it’s all just a sales pitch for something. 

My preferences are all based around issues I’ve had to overcome in my career. If sheets at working great for you then stick with them until you run into issues.
  - **Witty-Ninja-8403** (1↑): hi question how would you go about finding a job fixing bad spreadsheet,perm or temp,any particular industries?
- **Atticus_Taintwater** (9↑): Is that example really so bad?


Spreadsheets as a source suck because of maintenance and scaling, and you don't maintain or scale a poc
  - **SRMPDX** (1↑): If I had a dime for every POC I've seen get scaled and pushed into production I'd have a few dimes at least.
  - **Old_Tourist_3774** (0↑): Just interested in what people here think as I tend to be over skeptical of people selling things.
- **konwiddak** (3↑): People like what they understand - particularly senior management. The cynic in me thinks these posts are fishing for work from people who like the idea of something because they understand what it is. A lot of people who will be making the recruiting decision know what Google sheets is but don't know why it's a terrible back end.
- **ccesta** (4↑): At least it's not mongo
- **TA_poly_sci** (2↑): I have done for stuff that needed to run once and where observability >>>>>> all other concerns. There are few things in data that doesn't have its niece use cases.
- **wbrd** (2↑): Sometimes it's the best solution. My company gets lots of data from lots of different places. One place emails us a spreadsheet and so we wrote an airflow dag that checks the box, grabs the attachment and copies the data into big query. 
Some of the execs put their stuff in sheets and have information that goes out to our decisioning systems so we grab data from there too. It's so much better than something like monday.com. 
They use an interface they know, we don't have to write a new interface, and as long as they don't change the fields we've agreed on everything works fine.

In the example you posted I wouldn't use sheets as the final DB, but it works fine until you get the funding or whatever and move to something else.
- **ckal09** (2↑): That resume sounds completely made up and very AI. I hate pretty much every word of it. It’s so cringey.
  - **Old_Tourist_3774** (1↑): Well, I used chatgpt to translate as the original was in my language but the original was not far from it
- **Maiden_666** (1↑): You would be surprised that learn levels.fyi used Google Sheets as their database once upon a time lol and they did pretty well for themselves. 

https://www.levels.fyi/blog/scaling-to-millions-with-google-sheets.html
