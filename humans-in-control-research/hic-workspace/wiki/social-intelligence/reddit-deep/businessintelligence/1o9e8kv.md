---
id: social-intelligence/reddit-deep/businessintelligence/1o9e8kv.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1o9e8kv/all_the_noteable_bi_bs_i_dealt_with_this_week/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "All the noteable BI bs I dealt with this week"
author: "datawazo"
date: "2025-10-17T21:47:03.000Z"
score: 81
upvote_ratio: 0.97
num_comments: 34
flair: ""
extracted_at: "2026-06-11T18:57:56.374Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1o9e8kv.md#c0"
    char_span: [0, 2035]
    sentence_count: 24
    key_terms: [businessintelligence, like, week, charts, sales, today, bar, comments]
    token_count: 476
  - id: "social-intelligence/reddit-deep/businessintelligence/1o9e8kv.md#c1"
    char_span: [2037, 2720]
    sentence_count: 10
    key_terms: [formats, means, table, date, did, net, gross-discounts, troublshooting]
    token_count: 153
  - id: "social-intelligence/reddit-deep/businessintelligence/1o9e8kv.md#c2"
    char_span: [2735, 3443]
    sentence_count: 6
    key_terms: [vikster1, vendor, data, like, net, tell, gross-discounts, collectively]
    section: Comments
    token_count: 199
  - id: "social-intelligence/reddit-deep/businessintelligence/1o9e8kv.md#c3"
    char_span: [3445, 5495]
    sentence_count: 4
    key_terms: [year, report, difference, negative, positive, quantity, looks, sales]
    section: Comments
    token_count: 509
  - id: "social-intelligence/reddit-deep/businessintelligence/1o9e8kv.md#c4"
    char_span: [5498, 6846]
    sentence_count: 11
    key_terms: [want, learn, order, style, take, tell, used, future-proofing]
    section: Comments
    token_count: 308
---
# All the noteable BI bs I dealt with this week

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1o9e8kv/all_the_noteable_bi_bs_i_dealt_with_this_week/)
Posted by **datawazo** · **81↑** · **34 comments**

1. Client has a rule that if a store is closed 4 or more consecutive days either this year or last it needs to be removed from year over years sales comparisons. In 5 years it hasnt happened and I was kind of banking on it never happening. But it happened this week. So I had to *urgently* cross join dates to stores to sales and code a table that did a partition over every store and every date to see if three in a row were null.  And then also pass that back to PY. I dont do many partitions, always enjoy the opportunity. Also 3 days later after it was urgent they still havent green lit it for prod (they cant agree on the math).

2. We have 18,000 food items but no categorization. So like yoy sales for a sku is possible but yoy for chicken category isnt. Categorizing them has been on backburner forever and we decided to propose using AI to take a shot at it. Hilarious results. Like incredible what its getting wrong. This week we fed it some other somewhat similar mapping and told it to use that which it looks like it was a bit more successful. Will deeper dive next week.

3. Wednesday client and I went through some sample dashboards to try and pick a style for the reports they want to build. Agreed on some charts and formats he likes. Today had a meeting to review his mockups. None of the mockups remotely resemble the style we agreed on. Like he landed on this design with 3 swim lanes each with a kpi, pie chart and combo line/bar chart. Filters and navigation down the left hand side. 
Hid mockup today was a quadrant, no combo or pie charts, kpis with delta from targets (we dont have defined targets), and bar charts. Filters across the top, no nav bar just drill throughs. Concerned its a twin situation and the other twin showed up today or something.

4. Vendor decided to change date formats from yyyy-mm-dd to mm-dd-yyyy. But only for new data so now the column has two different date formats which means tableau won't auto detect and convert it which means all of reporting for that table broke. Why did they do this? Power move, probably. That was a fun fire drill. Its a huge table too so troublshooting it was tedious

5. Yeeted something into prod where I did net = gross-discounts except discounts when there are none was null not 0 so all my net was fucked. That one was on ya boy though long live not testing.

Got some good stuff over the finish line as well, but these were some of the moments that made my gray hair grayer

## Comments

- **vikster1** (36↑): 4 sounds like the dumbest thing i have read this month. can tell that to the client. call me john if he asks
  - **datawazo** (8↑): We collectively _hate_ that vendor. So all good there. They give us the data and separately their own dashboards but cannot tell us at all how to tie the two out. We try and we can't and we ask them how and their like lol *shrugs*
    - **wyx167** (1↑): The vendor data comes from where? ERP?
  - **vikster1** (0↑): sure name is Jon Bovi
- **kappapolls** (12↑): >Yeeted something into prod where I did net = gross-discounts except discounts when there are none was null not 0 so all my net was fucked. That one was ok ya boy though long live not testing.

the classic.  daily reminder to make sure any fields you're doing math with are defined as `NOT NULL`
  - **HarbaughCantThroat** (2↑): COALESCE() is your friend.
    - **kappapolls** (2↑): coalesce is your enemy because you have to remember to do it in every query.  `NOT NULL` is your true friend
- **MSB_the_great** (5↑): Garbage in garbage out, they think they can solve all problems in BI, 
My current project I am trying to convert from BO to another BI tool, 
The report is simple get this year sold quantity minus last year quantity, if the difference is positive they think it is better than last year,  
But  noticed negative sold quantity for prior year (how is it possible ? ) and current year 0 .Difference  becomes positive I was asking then what is going on, they just compared old report and new report  output and said it looks same,
  - **stachulec** (4↑): returns, cancellations etc. most of the time it's not visible because positive values are bigger than the negative ones
    - **MSB_the_great** (1↑): Of course they return items. There are cancellation entry for the invoice it will have negative qty and when sum it up it will become zero, looks like they returned more than they purchased lol.
- **stachulec** (3↑): Ad.1 does that mean that new stores are also not included? on aggregated results they may overstate the sales , curious it didn't happen over 5 years
  - **datawazo** (2↑): Good q, there's a separate section on the report for stores that don't yet have YoY sales.


And the code I added only looks for $0 sales days between the open and close dates.
- **Electronic-Artist272** (2↑): Wtf 😒
- **turbo_dude** (1↑): I can't believe there is not some kind of industry standard service that has this kind of product categorisation already in place.
- **Gators1992** (1↑): For 1 my first step would have been to try the math and show them that the difference is either negligible and it's not worth doing or if it's significant they need to think through just yanking it.  Maybe normalize for days open or something?


For 3 I generally have a quick presentation based on our style guide with examples that I give up front before talking requirements.  Basically this is our style and why it's important.  Then instead of them going wild with random designs, we talk about what they want to measure and what actions they want to take, then fit that into the standard design.  Sometimes I get pushback, but mostly is saves us all time and produces a better output.
- **ccuser011** (1↑): After you are long enough in this field, you will learn to anticipate all these items and have ETL to proactively address it. 

Regarding dashboard, take more active decisions and learn to influence and tell them what they want. I used to tell them to defer further revisions for phase 2 in order not to derail timeline. 

Nothing out of ordinary here. Is used remjnd direct report of why they are getting bigger bucks then rest of colleagues.
- **Adventurous_Shake_35** (1↑): I'm sorry to hear about these things you have to go through, but these are the most fun i had this week. Guess that's the "inflexibility" of BI when facing real life situations.

Cus you never know why would a user go into a bar and order a bloody fried rice. (Joke from the programmers)
- **No_Wish5780** (1↑): cross joins for store closures classic BI hurdles. Consider dynamic SQL for future-proofing.
