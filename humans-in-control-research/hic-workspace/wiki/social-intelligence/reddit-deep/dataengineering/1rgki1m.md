---
id: social-intelligence/reddit-deep/dataengineering/1rgki1m.md
url: "https://www.reddit.com/r/dataengineering/comments/1rgki1m/what_is_actually_stopping_teams_from_writing_more/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "What is actually stopping teams from writing more data tests?"
author: "Mountain-Crow-5345"
date: "2026-02-27T22:07:14.000Z"
score: 71
upvote_ratio: 0.8
num_comments: 62
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.202Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1rgki1m.md#c0"
    char_span: [0, 717]
    sentence_count: 7
    key_terms: [dataengineering, comments, writing, counts, teams, tests, mountain-crow-5345, data]
    token_count: 172
  - id: "social-intelligence/reddit-deep/dataengineering/1rgki1m.md#c1"
    char_span: [732, 2409]
    sentence_count: 13
    key_terms: [data, tests, testing, don, collecting, something, professioncrazy2947, back]
    section: Comments
    token_count: 374
  - id: "social-intelligence/reddit-deep/dataengineering/1rgki1m.md#c2"
    char_span: [2411, 4193]
    sentence_count: 12
    key_terms: [data, mountain-crow-5345, exactly, datakitchen, co-founded, happened, meeting, problem]
    section: Comments
    token_count: 421
  - id: "social-intelligence/reddit-deep/dataengineering/1rgki1m.md#c3"
    char_span: [4195, 6294]
    sentence_count: 18
    key_terms: [tests, critical, pipeline, stop, "you're", test, fail, something]
    section: Comments
    token_count: 479
  - id: "social-intelligence/reddit-deep/dataengineering/1rgki1m.md#c4"
    char_span: [6296, 8018]
    sentence_count: 13
    key_terms: [validation, data, tests, time, because, expensive, integrity, fixtures]
    section: Comments
    token_count: 360
  - id: "social-intelligence/reddit-deep/dataengineering/1rgki1m.md#c5"
    char_span: [8020, 10200]
    sentence_count: 17
    key_terms: [tests, data, better, new, compares, expected, products, product]
    section: Comments
    token_count: 505
  - id: "social-intelligence/reddit-deep/dataengineering/1rgki1m.md#c6"
    char_span: [10202, 11832]
    sentence_count: 13
    key_terms: [data, code, like, did, test, expected, balance, changes]
    section: Comments
    token_count: 381
---
# What is actually stopping teams from writing more data tests?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1rgki1m/what_is_actually_stopping_teams_from_writing_more/)
Posted by **Mountain-Crow-5345** · **71↑** · **62 comments**

My 4-hour pipeline ran "successfully" and produced zero rows instead of 1 million. That was the day I learned to test inputs, not just outputs.

I check row counts, null rates, referential integrity, freshness, assumptions, business rules, and more at every stage now. But most teams I talk to only do row counts at best.

What actually stops people from writing more data tests? Is it time, tooling, or does nobody \[senior enough\] care?

## Comments

- **Evilcanary** (118↑): Writing data tests that catch actual bugs and aren’t incredibly noisy is difficult. People should write more good tests. But it’s tough and you need to have good tests at every stage, including ideally at the event/client producer level.
  - **GrotesquelyObese** (11↑): Something I have started doing is using a snapshot of data from our sources to test.

Duplicate what is currently being collected. Watch it process through.

Obviously if you are not collecting the data then you don’t have any testing data. If possible, I start collecting potentially useful data as soon as we identify we want to utilize it.

I find this to be the easiest way to manage data collection as this is one of many hats. Plus we can back date data analysis to the planning phase of a project. Bosses don’t push so hard on timelines.
    - **exjackly** (2↑): It is helpful where that is allowed.
  - **brrrreow** (3↑): Yes the noise can be killer. I tried implementing a basic testing practice at my workplace (row count, unique/not null primary key on tables) to get us off the ground from nothing and my manager insisted we need some version of unit testing on every table too as part of the policy. 

Just adding tests for the sake of claiming we test has been unnecessary extra work to think of something just to check a box. Then when those tests eventually fail and break a job it turns out we actually don’t care or the dev never verified the rule was legitimate in the first place and have to go back to remove them.
  - **ProfessionCrazy2947** (1↑): Agreed, and if you scale this up across multiple pipelines and teams your compute costs can go up significantly.

A lot of input tests (presuming you’re working out of a data warehouse or similar) should be tested independently for many of these items in my opinion.
  - **Mountain-Crow-5345** (1↑): Agreed on noise. A test suite with too many false positives eventually gets ignored. On the producer level, when possible, one of the most effective approaches is improving input validation on human-entered data (e.g. dropdowns, format checks, required fields). The bad data never enters the system.
- **SearchAtlantis** (103↑): Literally a week ago in the *Data Quality Stack in 2026* thread you said " — full disclosure, I co-founded DataKitchen and we built TestGen for exactly this problem."

Is this marketing or an actual discussion.
  - **ferrywheel** (15↑): His picture tels a thousand words
  - **[deleted]** (8↑): Hahaha ahhh never change reddit
  - **dillanthumous** (3↑): Lol. Nice spot.
  - **Mountain-Crow-5345** (1↑): That is fair. I co-founded DataKitchen and should have said so here. The question is still genuine though. Most teams don't produce meaningful data tests and I often wonder about the root cause.
- **kenfar** (31↑): Lack of skill, domain knowledge, and/or concern.

I like to start by defining KPIs for data quality, collect data, publish this for your customers.

Next any time a data-quality incident occurs (or availability or whatever), hold an incident-review meeting.  This should be a "blameless post-mortem".  And at the meeting walk through exactly what happened:

   * timeline with exactly what happened by who when
   * how to prevent this from happening again?
   * how to detect the problem earlier?
   * how to communicate with users more quickly?
   * how to handle incorrect data that was use and published already?
   * how to automate any steps?

Really, the first three bullets are the most important - and generally drive things like increasing test coverage.
  - **Mountain-Crow-5345** (2↑): I agree that no shame, no blame has to be the culture for these reviews to work. In other words "love your errors."  I have observed that holding the meetings consistently will help to shift the culture over time. One addition: for teams with a high volume of incidents, run a Pareto analysis first to focus the conversation on the issues causing the most downstream pain.
- **lzwzli** (16↑): Writing tests isn't the hard part. It's deciding the operational playbook for each of the tests that gets tricky. 

Great so you have 100 tests.

Do you stop the pipeline if any of those fail? No? Ok, then which ones should stop the pipeline?

What do you do with the results of the others? Send you a report? Great. 

Are you reading the report that is sent for every pipeline run? How do you decide which failing, non-critical test deserves action?
  - **Certain_Leader9946** (2↑): you should stop everything if a critical test fails, yes. doesn't matter how much money you're losing, if you're fucking up the business in deeper less repairable ways on production (and the tests should be catchihng these issues before they hit prod).

if you're going to ignore a test, you may as well have never written it.
    - **brrrreow** (2↑): Agree - I’ve come to stop believing in warnings! If it’s something you care about that truly impacts quality then fire the hard alert. If it’s something you can safely ignore, what’s the real threshold at which you need to care?
    - **lzwzli** (2↑): As I said, critical tests that fail should stop the pipeline. The question is the other non critical tests, what should you do with them when they fail. 

Unless you're suggesting you only write critical failure tests. Which is fair but those are pretty straightforward and there should only be a few.
- **MonochromeDinosaur** (7↑): Input tests work, then you have GBs of fixtures you need to correct because your data source changed their schema for the millionth time 

After the data source changes out from under you for the billionth time you learn to write input schema validation, null rates, integrity etc and to error out and bail the pipeline early and often.

I’d rather get a page in the middle of the night that the pipeline failed 10 minutes in than find out we got no data when everyone is trying to pull data first thing in the morning.

I don’t count dbt tests in this. They don’t really count as tests IMO they’re just audit queries which I’m all for. 

I’m tallking about ingestion pipelines. 

**Edit:** This is to say I think time is better spent writing assertions and schema validation than setting up a bunch of brittle fixtures for end-to-end data tests. Unless you have the time to setup automation to refresh the fixtures but then you need to test the fixture generation and that’s a matryoshka situation.

I do make unit tests for transformations and try to make all my transformation pure functions but I just use the built-in data structure and the minimum viable amount of dummy data in-line to test the behavior.
- **DungKhuc** (4↑): Testing is usually cheap but hard to cover real life scenarios, you have to build it up over time.

What you are referring to is validation, which is not only hard, but slow and expensive. Very often teams can't afford having extensive validation steps in between stages. 

I'd even argue that assumptions and business rules should not be in validation, but in testing because they are known.

Referential integrity is a tough one. Most modern data warehousing platform doesn't enforce it not because they can't, but because it's very expensive. You might need to evaluate if you truly want to to validate this every run or not.

The rest are just usual monitoring / observability. You shouldn't check them, but set reasonable alerts, and react when necessary.
  - **Certain_Leader9946** (1↑): use BDD syntax and map your tests to your user stories
    - **DungKhuc** (1↑): To me BDD is always wishful thinking for data engineering unless you only create simple dashboards.
- **zesteee** (3↑): I’m actually keen to hear about the tests you currently do in more detail.  For me, when I get a new data feed I import it and write all my procedures. Often it’s come as a csv file, so I literally open it in excel, and use auto-sum on the entire column, then compare that to my final table.  If it’s too big to do that, then I have to faff around a bit more, but that’s basically the gist of it.  I’m really aware that I want to be doing a better job at it, so would love to learn better techniques.  Maybe that’s the answer to your question in my case - because I haven’t come up with good ways to perform the tests. 

For the record; that’s just the initial data load. Once the pipeline is in place; I have a qc table which loads figures from raw, staging, and dev tables. It compares them and notifies me of any variance. And compares against previous weeks, looking for larger than acceptable differences. And a few other checks, depending on the data, such as if a bunch of products have moved to a new category but they haven’t carried the old products with them as they’re not selling. Still important when calculating growth so I address it. 

But yeah, I’d love to see how other people do their testing.
  - **Mountain-Crow-5345** (1↑): You are off to a great start, better than many teams. It sounds like you have implemented a type of anomaly detection (values falling outside of a tolerance range).

I think about tests in three categories: Input, Transformation, and Output.

Input:

\- In addition to totals, check totals grouped by a key segment (product, state, sales territory)

\- Do you need alerts when a new product is added?

\- Are key metrics within expected upper and lower bounds?

\- Are dates within expected ranges (e.g. transaction date in the future, or an event too far in the past)?

\- Did the data file update when expected?

\- Did the data contents timestamp update as expected?

\- Are there columns with restricted values (e.g. US state, ISO country code)?

\- Do values conform to a known format (phone numbers, emails, zip codes)?

\- Can addresses be validated against a known format or geocoded?

Transformation:

\- As you transform the data, what assumptions are you making? Add a test to confirm each one.

\- Check for balance between layers in a Medallion architecture.

Output:

\- Are output tables proportionate to input tables?

\- Should row counts or key sums always be increasing over time?

\- Apply the same anomaly detection and range checking as on the input.

Finally, are there business rules from your domain that can be tested?
- **Atmosck** (3↑): Lack of experience. Those of us who have been burned like you were with that four-hour pipeline that did nothing write data tests.
  - **Reasonable_Tooth_501** (1↑): Exactly. You don’t realize you need them until you’ve scrambled to get shit fixed cuz things are broken and the heat is on and it’s embarrassing. 

That’s when you realize oh wow it doesn’t have to be like this.
- **rycolos** (3↑): I’m a team of one and I’m burdened by way way too much to do and way too much data. I implement tests when I can, and generally the most important one, but definitely not on everything I’d like. Like anything, it’s a balance.
- **PrestigiousAnt3766** (2↑): I test code..
  - **Mountain-Crow-5345** (1↑): In development, code changes and data does not. In production, code is static and data changes. That is why you need to test the data.
