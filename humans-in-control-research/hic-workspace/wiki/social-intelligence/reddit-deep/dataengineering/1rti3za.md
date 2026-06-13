---
id: social-intelligence/reddit-deep/dataengineering/1rti3za.md
url: "https://www.reddit.com/r/dataengineering/comments/1rti3za/testing_in_de_feels_decades_behind_traditional/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Testing in DE feels decades behind traditional SWE. What does your team actually do?"
author: "seedtheseed"
date: "2026-03-14T12:25:39.000Z"
score: 207
upvote_ratio: 0.97
num_comments: 70
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.197Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1rti3za.md#c0"
    char_span: [0, 935]
    sentence_count: 11
    key_terms: [dataengineering, tests, traditional, comments, culture, problem, testing, "don't"]
    token_count: 210
  - id: "social-intelligence/reddit-deep/dataengineering/1rti3za.md#c1"
    char_span: [950, 3229]
    sentence_count: 19
    key_terms: [data, engineering, control, tests, hard, wrong, engineer, fixtures]
    section: Comments
    token_count: 504
  - id: "social-intelligence/reddit-deep/dataengineering/1rti3za.md#c2"
    char_span: [3231, 4556]
    sentence_count: 10
    key_terms: [records, test, testing, macros, expected, usually, pretty, using]
    section: Comments
    token_count: 308
  - id: "social-intelligence/reddit-deep/dataengineering/1rti3za.md#c3"
    char_span: [4558, 6172]
    sentence_count: 11
    key_terms: [macros, dbt, dvc, like, files, workflow, version, agree]
    section: Comments
    token_count: 379
  - id: "social-intelligence/reddit-deep/dataengineering/1rti3za.md#c4"
    char_span: [6174, 7365]
    sentence_count: 7
    key_terms: [data, something, business, software, quality, checks, volume, jumpy-possibility754]
    section: Comments
    token_count: 262
  - id: "social-intelligence/reddit-deep/dataengineering/1rti3za.md#c5"
    char_span: [7367, 9204]
    sentence_count: 12
    key_terms: [test, launch, dbt, jsp777, "that's", code, run, documented]
    section: Comments
    token_count: 439
  - id: "social-intelligence/reddit-deep/dataengineering/1rti3za.md#c6"
    char_span: [9206, 11439]
    sentence_count: 12
    key_terms: [engineering, streaming, testing, software, data, modularized, understand, behavior]
    section: Comments
    token_count: 496
---
# Testing in DE feels decades behind traditional SWE. What does your team actually do?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1rti3za/testing_in_de_feels_decades_behind_traditional/)
Posted by **seedtheseed** · **207↑** · **70 comments**

Coming from a more traditional software background, I'm used to unit tests being non-negotiable. You just don't merge without them.  
  
Now working in Data Engineering, I've noticed testing culture is wildly inconsistent. Some teams have full dbt test suites and Great Expectations pipelines. Others just eyeball row counts and pray.  
  
For those of you who do test: what does your stack look like? Schema tests, data quality checks, pipeline integration tests?  
  
And for those who don't: is it a tooling problem, a culture problem, or do you genuinely think it's not worth the overhead?  
  
Curious to hear war stories from both sides.

## Comments

- **takenorinvalid** (191↑): What we do is have no QA framework in place, not realize the data is wrong for months or even years, and then blame each other when it comes out.


Data Engineering is invisible. If a software engineer screws up, the app stops working and everybody knows it. If a data engineer screws up, the company makes the wrong decisions and has no idea it happened.


That's why QA's inconsistent - if you're in a "go fast and fail" company, it's hard to get the CEO to understand and invest in it.
  - **SSttrruupppp11** (31↑): My team’s situation exactly. Our CTO and analysts just constantly barrage us with new idiotic ideas while I keep wondering how we can monitor existing stuff and how much of it is doing bullshit with no one noticing. Ah well, not my money in the end.
  - **doryllis** (10↑): The biggest danger in data engineering is that no matter how wrong your query or data, if you write it so it works, it returns results. 

Results but not necessarily correct ones.

Data engineering is resistant to things like: source control(ffs), agile methodology, QA, and more things that are ever so common in software  engineering. 

It is so hard some days to be both. So hard.
- **MonochromeDinosaur** (49↑): dbt tests are nice but I hate it when teams start going crazy with jinja and start creating their own piles of DSLs and tests. It becomes an unmaintainable mess.

Reading complex jinja makes me want to tear out my eye balls and it a pain to debug so I restrict usage to builtins and dbt-utils.

Great expectations IMO is garbage it promises a lot but delivers on nothing and you end up with a mess to maintain.

For code write pure functions separate I/O from transformations and do unit tests with in-line fixtures using data structures native to the tool you’re using. This is easy because you control the intermediate schemas and state.

End-to-end/integration tests are hard in data engineering because many times you don’t control the source and your inputs can be and usually are huge and ever changing. 

Maintaining fixtures for ever-changing data sources becomes a full time job. 

Instead have a raw data dump do schema validation on the fields you need for your job to control the schema changes on your side without losing data. 

This way you can include new fields at your own pace as needed and/or you catch a breaking schema change very early in a pipeline and get a page AND you already have the raw data on your end for a rerun.

Testing in SWE is easier because you usually control most of stack and interfaces. 

Third party integrations/APIs usually respect their contracts more when it’s webdev related. 

When you need fixtures and mocks they’re relatively small.
  - **raginjason** (9↑): Macros are handy but I often see them overused. They aren’t code. They are a pain to test or refactor. Use them as little as possible
    - **matt-triano** (2↑): I've been using \[this pattern\](https://github.com/MattTriano/loci\_platform/blob/main/platform/dbt/tests/macros/test\_clean\_address\_macro.sql) for testing macros for years and I'm pretty confused why the dbt documentation doesn't mention it, as it's super easy. Honestly, I'm pretty surprised I've never seen anyone else using it.

In dbt's generic/singular testing framework, you write a query that would return records that fail the test (so returning 0 records = pass). So you just write a CTE that creates records with the test case data as well as a column with the \`expected\_value\`, then apply the macro and select records where the macro-produced value != the \`expected\_value\`.

I guess I also use dbt macros like functions (or more accurately to swap in a functional implementation), so in my workflow dbt macros are unambiguously code, so I assume the workflow you've seen uses macros very differently. What kind of stuff does your team do with macros that makes them not like code?
    - **Sverdro** (1↑): What does it mean as little as possible in a production env?
Dbt noob here and wondering for a 100 ish models size project , how much are we talking about? Is it less than 10?
  - **Prothagarus** (1↑): The voice of reason over here, fully agree on this comment. Pydantic data classes for detecting schema change. Integration and end to end tests for golden path and each new feature. Only thing I have been experimenting with is Iceberg/Databricks table versioning for point in time reasoning for why we made a decision last year with the version of the software at that time in a docker container.
  - **InfiniteDrop42** (1↑): We managed to solve the input size problem with dvc (data version control), some other teams use git LFS. We like dvc more, since it is virtually unlimited and much cheaper compared to LFS. We can have raw inputs and also processed files for end-to-end snapshot tests. Most files are just a few MBs, so we can still do "dvc pull" to have it also locally ... and the bigger files are in a different dvc config and tested only in CI for regression (after the development is done).
  - **sparkplay** (1↑): 100% agree with Great Expectations. Some forks of it actually deliver better like `dbt-expectations` as part of the dbt scaffold or Elementary scaffolds.

I really like Elementary for data quality checks, including volume anomalies and schema changes in a nice succinct dashboard. It's incredibly easy to use and near-natively integrated in dbt.
- **Jumpy-Possibility754** (33↑): Something I’ve noticed is that a lot of data pipelines end up behaving more like long chains of scheduled scripts than traditional software systems. Once ingestion, transformation, enrichment, and downstream triggers start chaining together the failure surface grows pretty quickly. At that point unit tests help but they don’t catch the kinds of failures that actually break things in production. What tends to matter more is data validation layers, pipeline observability, and the ability to replay parts of the flow when something fails mid chain.
- **robberviet** (25↑): You can test code. Data is another story.
  - **Outside-Storage-1523** (14↑): Exactly. It is very hard to test business logic.
    - **Prestigious_Bench_96** (2↑): This doesn't really seem true - plenty of business logic in software - I think it's more to do with the tooling/volume/duration of feedback loops in data workflows.
- **EarthGoddessDude** (7↑): Unit tests != data quality checks

But either way, I agree with you.
- **anxiouscrimp** (6↑): Smash straight into prod. You guys need to live a little.
- **JSP777** (18↑): Python code unit tested with 80% or more coverage. The pipeline has to be deployed to a dev/test environment with the feature changes documented. The pipeline has to be able to be run locally by whoever reviews it by simply cloning and using launch configs in VS Code.
Any DB related change has to be documented with rollback prepared if needed. Dont know about DBT but SQLMesh can be tested by writing tests for every model, that doesn't give you real quantifiable coverage but that's the developers responsibility.
That's pretty much it.
  - **Black_Magic100** (5↑): Can you elaborate on the launch configs when testing locally?
    - **JSP777** (2↑): You can set up a launch.json file in your .vscode folder, and that specifies your settings, env cars, args etc for your program. Then in the debugger menu in VS Code, that launch becomes a debugger option, so your program can run with one click instead of very long CLI commands.
  - **No-Theory6270** (2↑): DBT has dbt test. You have YML input files and expected results. You can also run macros for more complex things.
    - **JSP777** (1↑): Yeah ok so that's pretty much the same as mesh
    - **raginjason** (1↑): Dbt unit tests are painful, especially because you can’t test materialization.
  - **CrackedBottle** (2↑): Yeah we have a pytest library which we trigger with a gitlab runner
- **Outside-Storage-1523** (16↑): Data is not easily testable. There are so many business logic inside that if you want to cover all test cases you are going to essentially write a second set of pipelines and see if both have the same outcomes, which is pointless.

The streaming side is much easier to test because little transformation is performed. 

If SWE wants to understand the issues, they can try calculating all those metrics in backend and they will understand why it doesn’t work easily.
  - **FortunOfficial** (3↑): i find streaming tests much harder as the source behavior can have much more severe effects of your pipeline such as timeliness of inputs when doing streaming joins, statefulness, restart behavior, exactly-once guarantees etc. Feels so low-level compared to batch processing
    - **Outside-Storage-1523** (2↑): Yeah. It is more "engineering" than the Analytic Engineering part of the job, so it requires a higher standard of testing. But the AE part has an unlimited amount of things to test, which makes it untestable. Also, if you separate streaming and AE in the team, most of the time people just ask AE "is this wrong?", not the streaming guy. Streaming is basically shielded by the AE team.
- **naijaboiler** (48↑): it is because, fundamentally data engineering is not software engineering. They are at best cousins, not brothers, and definitely not twins. 

Instead of trying to port software engineering over to the data side, try understanding what data engineering really is, and what its ultimate goals are and in what fundamental ways it differs from software engineering.
  - **darkneel** (16↑): Add to that barring the updated in production dbs all other aspects of data engineering are cheaper to to just rewrite and testing is much more complex , time consuming and needs to be updated with every iteration . There are simply no good ways to have unit tests in DE .
    - **three-quarters-sane** (1↑): I see both sides of it. Our code base is much less modularized than it should be (and much much less modularized than what I was used to in software). 


So in some cases we should be addressing that & implementing more testing, but in others the pipeline is just going to be so niche that you have to rewrite testing for every change which kind of defeats the purpose.
- **SirGreybush** (4↑): I love unit testing, managed to do it once in a SQL Server based DW and it was awesome.

We are moving to DBT and I'm looking forward to it, but, just learned that it will be DBT Project, hosted in Snowflake, so not sure how flexible it will be.
