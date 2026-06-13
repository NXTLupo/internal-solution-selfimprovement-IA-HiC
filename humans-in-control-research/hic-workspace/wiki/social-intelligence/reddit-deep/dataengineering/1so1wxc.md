---
id: social-intelligence/reddit-deep/dataengineering/1so1wxc.md
url: "https://www.reddit.com/r/dataengineering/comments/1so1wxc/everything_where_i_work_is_giant_stored_procedures/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Everything where I work is giant stored procedures"
author: "Good_Skirt2459"
date: "2026-04-17T14:02:37.000Z"
score: 38
upvote_ratio: 0.96
num_comments: 31
flair: "Rant"
extracted_at: "2026-06-11T18:58:17.212Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1so1wxc.md#c0"
    char_span: [0, 1631]
    sentence_count: 14
    key_terms: [logic, procedures, dataengineering, because, stored, implemented, business, comments]
    token_count: 359
  - id: "social-intelligence/reddit-deep/dataengineering/1so1wxc.md#c1"
    char_span: [1646, 3610]
    sentence_count: 16
    key_terms: [logic, procs, good, time, identical, customer, privacy, version]
    section: Comments
    token_count: 468
  - id: "social-intelligence/reddit-deep/dataengineering/1so1wxc.md#c2"
    char_span: [3612, 5668]
    sentence_count: 18
    key_terms: [data, "it's", integration, procedure, database, logic, day, did]
    section: Comments
    token_count: 501
  - id: "social-intelligence/reddit-deep/dataengineering/1so1wxc.md#c3"
    char_span: [5670, 6301]
    sentence_count: 3
    key_terms: [work, procedures, functions, stored, use, yada, architecture, brownbearpdx]
    section: Comments
    token_count: 176
---
# Everything where I work is giant stored procedures

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1so1wxc/everything_where_i_work_is_giant_stored_procedures/)
Posted by **Good_Skirt2459** · **38↑** · **31 comments**

Hello all.

At the place I work, all of the logic is stored procedures. Any ETL pipeline is about 1000-2000 lines of SQL. I use a tool to map external dependencies, and there are usually about 30-60 of them. 

Lots of logic is duplicated, I think because whoever developed it wasn't aware the logic was already done somewhere else. 

Often, the development workflow is a user complains about the data from a process. It's due to incorrect business logic in one of these stored procedures. We fix it, but we have no inventory of all the other places that business logic is implemented, so we just wait for another complaint and fix that if/when it comes in.

It slows me down significantly because something that should be a very simple change winds up requiring intensive changes. And I know that I haven't even really solved the problem because there are 10 other places it's still implemented incorrectly I just don't know where they are until later when someone finally catches the inconsistency.

We also do integrations at the database level. Literally just reach into a 3rd party software's database which is running on prem and get the data you need. Yea we need to update the software sometimes and it just breaks a bunch of stuff. We don't have a map or documentation of this or anything, so we YOLO the update and put out fires when users start complaining.

## Comments

- **SoggyGrayDuck** (23↑): Did you join my company!? 

That screams it's time to redesign. Logic shouldn't be repeated like that and it's impossible to make reporting line up across departments and etc.
- **TodosLosPomegranates** (27↑): This is a really good opportunity for you to get a good refactor under your belt. Figure out how to assign a dollar amount to the wasted time and energy the current set up is taking. Spend 20% of your week refactoring this mess on the side. Make the 20% non-negotiable. Document everything you’re doing so you can turn in a very clear win sheet to your boss at review time and if they screw you over you have a stellar case study to discuss in interviews.
  - **Jalumia** (3↑): This is great advice. Try to focus on business logic that is (or should be) identical for your first pass. Version the script so you can compare outputs by version. Guaranteed there will be minor differences in logic between versions that were supposed to be identical that someone will complain about when you fix. Be ready to ask the users to decide amongst themselves whether they should align or you should make allowances in the code for the drift. 

Good luck, refactors are 40% technical, 80% negotiation with users.
  - **NoleMercy05** (1↑): Lol. They will fail to come anywhere close to performance and spend more $$ bc they are scared of set based algorithms
- **randomuser1231234** (4↑): lol this sounds so much like my first DE job, only we did “privacy”-related things so each customer had their very own database! Which meant that each customer needed their very own stored procedure for each transaction type and data source, and for said “privacy reasons” we weren’t allowed to DRY anything. Euggggggh. Nightmare fuel.
- **BobDogGo** (5↑): is it a series of procs  that total 1-2k lines or are you talking 1-2k line stored procs?  we have a lot of code in our warehouse but most procs are designed to do simple, single table upserts.

yeah, thats screaming for a refactor
  - **Good_Skirt2459** (7↑): Nope it's a bunch of 1-2k line long procs. They have business logic database logic all in one. For example common patterns are them sending emails (and building the HTML structure for the email, including dynamic generation of lists and stuff) and fixing data.

They are how we maintain data integrity. Say you're doing an integration and you find the data is bad. Well... just start the stored procedure off by fixing the data in the database, then do your integration... (All in the same procedure, it'll be called something like "Prepare\_Vendor\_X\_Export", no indication it also cleans the data too).

It can become hard to debug. For example I had an issue where an integration was failing periodically. I learned we had 2 other integrations which ran as scheduled jobs, both did address formatting and wrote it back to the real tables, but they did it in different ways. So depending on the time of day my procedure ran, it would get one format or the other.

It's kind of a fact of life around here that "sometimes stuff just fails, but it's schedules to run 5 times a day, so as long as it's successful once a day, it's fine". I think a lot of that is due to these kind of temporal dependencies that are completely unmapped.

It works though... by sheer force of will.
  - **Outrageous_Let5743** (2↑): Same here. Almost all sprocs of us are  for merging data (scd 1, scd2, incremental fact loading, full replacement, backfill etc) or for automatically making the tables and relevant indexes based on the view.  
I don't think any of our sprocs actually contains data transformation logic.
    - **Good_Skirt2459** (1↑): You're living my dream. At this point I'm just trying to get the dynamic HTML generation out of the database.
- **ludflu** (5↑): is it even in source code control? Because if not, that's the first step.
  - **Good_Skirt2459** (3↑): Yes. The first thing I did when I got here was set up a Git server and put our projects in there.
    - **Monowakari** (7↑): Dbt.

Can have shared functions, use Python or Sql, self host, yada yada
- **Kostya_Rico** (2↑): What tool do you use for linage and dependencies tracking?
- **lysogenic** (2↑): do we work at the same company??
- **BrownBearPDX** (2↑): Do a complete inventory with an LLM to start.
  - **Good_Skirt2459** (1↑): Great idea. I'll work on better tools. As of now just putting a big list of our stored procedures & functions into notebook LM has helped me boost my productivity and quality since I avoid rewriting.
- **GachaJay** (2↑): Medallion architecture for the win
- **Old_Tourist_3774** (2↑): Stored procedures are so ass to work with
