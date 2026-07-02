---
id: social-intelligence/reddit-deep/dataengineering/1t12tjh.md
url: "https://www.reddit.com/r/dataengineering/comments/1t12tjh/sqlglot_is_now_5x_faster_while_still_being/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "sqlglot is now 5x faster while still being written in python"
author: "captaintobs"
date: "2026-05-01T19:09:01.000Z"
score: 266
upvote_ratio: 0.98
num_comments: 31
flair: "Open Source"
extracted_at: "2026-06-29T14:40:47.212Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1t12tjh.md#c0"
    char_span: [0, 1001]
    sentence_count: 1
    key_terms: [how-we-accelerated-transpilation-by-compiling-sqlglot-with-mypyc, sqlglot, python, dataengineering, work, comments, fivetran, written]
    concepts: [sqlglot, python, dataengineering, comments, fivetran]
    token_count: 253
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1t12tjh/sqlglot_is_now_5x_faster_while_still_being/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1t12tjh.md#c1"
    char_span: [1015, 2976]
    sentence_count: 13
    key_terms: [sqlglot, captaintobs, been, thanks, thank, using, translation, like]
    concepts: [sqlglot, captaintobs, thanks, translation, thank]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1t12tjh.md#c2"]
    section: Comments
    token_count: 482
  - id: "social-intelligence/reddit-deep/dataengineering/1t12tjh.md#c2"
    char_span: [2978, 3898]
    sentence_count: 8
    key_terms: [extensions, sqlglot, thanks, though, table, find, need, work]
    concepts: [extensions, sqlglot, thanks, though, table]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1t12tjh.md#c1"]
    section: Comments
    token_count: 231
---
# sqlglot is now 5x faster while still being written in python

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1t12tjh/sqlglot_is_now_5x_faster_while_still_being/)
Posted by **captaintobs** · **266↑** · **31 comments**

hey folks! i'm the creator of SQLGlot and currently work at Fivetran. i wanted to share some really exciting work that my team has been doing on, which is ALL open source.

sqlglot is a SQL parser and transpiler/analysis framework. it's fully written in Python and although it's very powerful, it wasn't super fast. we love that sqlglot is so easy to install and use in the Python ecosystem so didn't want to rewrite it. instead, we used mypyc to compile typed Python code into fast C!

while doing this work, we had to make many contributions to mypy, but we're happy now that all of you can enjoy faster sql parsing of your data pipelines!

https://www.fivetran.com/blog/how-we-accelerated-transpilation-by-compiling-sqlglot-with-mypyc

## Comments

- **agni69** (25↑): Thanks! I'm looking into SQL translation for big reports and context management has been a problem using llms. Have been leaning into sqlglot to give me semantic chunks which has given interesting results. Do you have any best practices guides for using the package?
  - **captaintobs** (8↑): awesome! it's got of a lot of bells and whistles that can be used to improve transpilation, check out optimizer, specifically qualify + annotate_types.

translation is hard, if you run into things, try to contribute back so others who run into those issues can benefit!
- **serious_frank** (28↑): I’d like to take this opportunity to thank you and your team; your work has been extremely helpful to me on several projects, both for code analysis and lineage extraction, as well as for translating between different SQL dialects. Thank you again, and best wishes for the future.
  - **captaintobs** (8↑): thanks glad it's helping and consider contributing back!
- **diabloman8890** (15↑): One of the unsung heros holding up the entire industry! Thank you for your service.
- **mischiefs** (11↑): Excelent work guys. Been using it on and off from like 3 years and picked it up again and more serious for a query anti pattern detector for bigquery and worked great.
  - **captaintobs** (3↑): great to hear
- **kvlonge** (5↑): Amazing stuff guys. SQLGlot is an incredible project
- **ex0ns** (3↑): Thanks for the amazing work from you and your team. I can't imagine working without sqlglot as we need to parse, create lineage and modify various SQL dialects.

Not later than this morning I used Pyodide as a sandbox to be able to use sqlglot from our Typescript application
- **randomuser1231234** (3↑): OMG.

I use the heck out of sqlglot to help my fun little LLM skill point out where/why specific dbt models are “optimization opportunities”.

Happy to see this!
- **xeroskiller** (3↑): Love sqlglot. Its like magic, when you haven't seen it before.

Docs are a little anemic, though, and it can be hard to get everything. For example, when parsing maybe a create table statement, its not always easy to find whether its a temp or transient or permanent table. Stuff like that.

Compliment sandwich, though: you're the best and I love you and I hope you find $20 while walking. Thanks for your contributions to OSS.
- **Specific_Mirror_4808** (5↑): Apologies for the dumb question...

As a casual user of Python and SLQGlot do I need to do anything to take advantage of this great improvement beyond ensuring I am using the most recent release?
  - **captaintobs** (6↑): yes, you need do pip install "sqlglot[c]", the c extensions are not installed by default
    - **Specific_Mirror_4808** (1↑): Thanks.  Will SQLMesh utilise the c extensions?
- **git0ffmylawnm8** (2↑): I used sqlglot for some work in my last job to parse out queries for lineage tracing. Awesome work!
