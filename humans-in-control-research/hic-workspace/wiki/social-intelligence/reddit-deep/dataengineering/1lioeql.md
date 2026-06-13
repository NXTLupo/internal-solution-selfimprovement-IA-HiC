---
id: social-intelligence/reddit-deep/dataengineering/1lioeql.md
url: "https://www.reddit.com/r/dataengineering/comments/1lioeql/why_data_engineers_dont_test_according_to_reddit/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Why data engineers don’t test: according to Reddit"
author: "PotokDes"
date: "2025-06-23T18:30:25.000Z"
score: 129
upvote_ratio: 0.9
num_comments: 94
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.206Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c0"
    char_span: [0, 2319]
    sentence_count: 16
    key_terms: [engineers, testing, reddit, dataengineering, comments, data, perspective, often]
    token_count: 467
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c1"
    char_span: [2321, 4559]
    sentence_count: 17
    key_terms: [data, engineers, engineering, product, perspective, analytical, pipelines, testing]
    token_count: 419
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c2"
    char_span: [4561, 5827]
    sentence_count: 8
    key_terms: [data, problem, fields, handle, impossible, pipelines, analysis, changes]
    token_count: 250
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c3"
    char_span: [5842, 8007]
    sentence_count: 18
    key_terms: [testing, transforms, test, dataengineering, involve, massive, integration, conditions]
    section: Comments
    token_count: 484
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c4"
    char_span: [8009, 10255]
    sentence_count: 8
    key_terms: [data, testing, quality, tests, pipelines, coverage, "that's", integration]
    section: Comments
    token_count: 477
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c5"
    char_span: [10257, 12162]
    sentence_count: 11
    key_terms: [engineers, data, different, testing, being, users, test, youravgse]
    section: Comments
    token_count: 433
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c6"
    char_span: [12164, 14422]
    sentence_count: 16
    key_terms: [engineering, data, experience, perspective, engineers, something, everyone, experiences]
    section: Comments
    token_count: 477
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c7"
    char_span: [14426, 16129]
    sentence_count: 11
    key_terms: [python, like, statement, template, outputs, inputs, output, script]
    section: Comments
    token_count: 373
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c8"
    char_span: [16131, 17539]
    sentence_count: 9
    key_terms: [tests, business, good, technical, numbers, people, data, like]
    section: Comments
    token_count: 314
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c9"
    char_span: [17541, 19776]
    sentence_count: 11
    key_terms: [software, data, testing, discussion, years, tests, companies, engineers]
    section: Comments
    token_count: 466
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c10"
    char_span: [19778, 22339]
    sentence_count: 15
    key_terms: [data, testing, engineering, development, teams, software, quality, tests]
    section: Comments
    token_count: 487
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c11"
    char_span: [22341, 24113]
    sentence_count: 13
    key_terms: [state, software, data, tests, "it's", testing, typical, manage]
    section: Comments
    token_count: 398
  - id: "social-intelligence/reddit-deep/dataengineering/1lioeql.md#c12"
    char_span: [24115, 25668]
    sentence_count: 14
    key_terms: [state, tests, data, mock, application, interesting, mean, swe]
    section: Comments
    token_count: 363
---
# Why data engineers don’t test: according to Reddit

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1lioeql/why_data_engineers_dont_test_according_to_reddit/)
Posted by **PotokDes** · **129↑** · **94 comments**

Recently, I made a post asking: Why don’t data engineers test like software engineers do? The post sparked a lively discussion and became quite popular, trending for two days on r/dataengineering.

Many insightful points were raised in the comments. Here, I’d like to summarize the main arguments and share my perspective.

The most upvoted comment highlighted the distinction between data testing and logic testing. While this is an valid observation, it was somewhat tangential to the main question, so I’ll address it separately.

Most of the other comments centered around three main reasons:

1. Testing is costly and time-consuming.
2. Many analytical engineers lack a formal computer science background.
3. Testing is often not implemented because projects are volatile and engineers have little control over source systems.

And here is my take on these:

1. Testing requires time and is costly

**Reddit:** The decision to invest in testing often depends on the company and the role data plays within its structure. If data pipelines are not central to the company’s main product, many engineers do not see the value in spending additional resources to ensure these pipelines work as expected.

**My perspective**: Tests are a tool. If you consider your project simple enough and do not plan to scale it, then perhaps you do not need them.

**Reddit:**: It can be more advantageous for engineers to deliver incomplete solutions, as they are often the only ones who can fix the resulting technical debt and are paid more for doing so.

**My perspective**: Tight deadlines and fixed requirements mean that testing is usually the first thing to be cut. This allows engineers to deliver a solution and close a ticket, and if a bug is found later, extra time and effort are allocated from a different budget. While this approach is accepted by many managers, it is not ideal, as the overall time wasted on fixing issues often exceeds the time it would have taken to test the solution upfront.

**Reddit:**: Stakeholders are rarely willing to pay for testing.

**My perspective**: Testing is a tool for engineers, not stakeholders. Stakeholders pay for a working product, and it should be the producer's responsibility to ensure that the product meets the requirements. If I personally were about to buy a product from a store and someone told me to pay extra for testing, I would also refuse. If you are certain about your product do not test it, but do not ask non-technical people how to do your job.

2. Many analytical engineers lack a formal computer science background.  
**Reddit:**: Especially in analytical and scientific engineering, many people are not formally trained as software engineers. They are often self-taught programmers who write scripts to solve their immediate problems but may be unaware of software engineering practices that could make their projects more maintainable.

**My perspective**: This is a common and ongoing challenge. Computers are tools used by almost everyone, but not everyone who uses a computer is a programmer. Many successful projects begin with someone trying to solve a problem in their own field, and in analytics, domain knowledge is often more important than programming expertise when building initial pipelines. In companies just starting their data initiatives, pipelines are typically built by analysts. As long as these pipelines meet expectations, this approach is acceptable. However, as complexity grows, changes become more costly, and tracking down the source of problems can become a nightmare.

3. No control of source data  
**Reddit:**: Data engineers often have no control over the source data, which can lead to issues when the schema changes or when unexpected data is encountered. This makes it difficult to implement testing.

**My perspective**: This one of the assumptions of data engineering systems. Depending on the type of the data engineering system, data engineers very rarely will have a say in there. Only where we are creating the analytical system for the operational data, we might have a conversation with the operational system maintainers.

In other cases when we are scraping the data from the web or calling external APIs, it is not possible. So what are the ways that we could do to help in such situations?

When the problem is related to the evolution of schema (case when data fields are added or removed, data type changes): First we might use schema-on-read strategy, where we store the raw data as they are ingested, for example in JSON format in the staging models, we extract only the fields that are relevant to us. In this case, we do not care if new fields are added. When columns that were using are removed or changed the the pipeline will break, but if we have tests they will tell us what is the exact reason why. We have a place to start investigation and decide how to fix it

If the problem is unexpected data the issues are similar. It’s impossible to anticipate every possible variation in source data, and equally impossible to write pipelines that handle every scenario. The logic in our pipelines is typically designed for the data identified during initial analysis. If the data changes, we cannot guarantee that the analytics code will handle it correctly. Even simple data tests can alert us to these situations, indicating, for example: “We were not expecting data like this—please check if we can handle it.” This once again saves time on root cause analysis by pinpointing exactly where the problem is and where to start investigating a solution.

## Comments

- **AutoModerator** (1↑): You can find a list of community-submitted learning resources here: https://dataengineering.wiki/Learning+Resources

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **RobDoesData** (161↑): Reddit is full of bad engineers is the obvious answer.

The more nuanced answer is that data engineering has a trackrecord of being immature and not wanting to learn from SWE.

Those of us who understand testing and implement it will keep getting paid.
  - **roastmecerebrally** (40↑): Yeah I have implemented validation testing and other types of tests for our warehouse and I am being treated like a god. Sorry, no, I just have anxiety.
    - **TurboSmoothBrain** (3↑): What is validation testing? An integration test?
  - **steelpoly_1** (31↑): I beg to differ and offer an example. A full stack engineer can host the entire app on his machine and create most of the conditions for testing. A data engineer building a multi petabyte ingest pipeline which can have unknown number of scenarios cannot test it. The test itself would need to spawn a massive compute and storage cost. I agree that DE's can do more unit testing but integration testing would not be an easy task.
    - **Impressive_Run8512** (3↑): Most testing could be done via DuckDB for static checks, etc. Most people don't even do that. But I would agree, testing a whole PB pipeline would be costly.

Then again, so is crashing a test vehicle for safety. So not unique to our industry haha.
    - **kenfar** (2↑): Field transforms and business rules should absolutely be tested.  Pretty simple and unforgivable not to test that.   Especially when they involve regex, are complex multi-field rules, or are involve complex conditions or math. 

Point A:  If the excuse is "but those field transforms are all mixed together in massive 1000 line queries" - then one should have thought about that before writing 1000 line sql transforms.

If the excuse is that the transforms involve massive joins between dozens of models, then see Point A.

If the excuse is that you're building non-determinant data science & machine-learning processes, then fine, classic unit testing won't work for you.  But that's probably just a fraction of your code, and there are other methods of testing your data distributions.

That's it.
    - **killerfridge** (-1↑): Sure, but you could do simple integration tests like: checking that your credentials actually work etc.
    - **PotokDes** (0↑): There are ways around it. For example do data tests only on the data was ingested the latest, the previous partitions were tested before.

Other point of view: If you this  a petabyte dataset have a null in id column that would beak one of the latest models would it be cheaper to run simple data test that to compute however many models?
  - **Top-Faithlessness758** (7↑): Testing is necessary\*\*, but I would say that in Data Engineering, input/output data profiling (not "testing" really) comes first in ensuring reliable and correct data pipelines. That’s likely where the meme originates, many engineers face numerous failure modes caused by changes in external data sources or data generation processes rather than logic bugs per se, leading to a “no (logic) test can fully protect me” mindset. Obviously no testing whatsoever is madness, and hopefully you test every piece of software you own strategically (i.e. no vanity metrics about coverage, no "lets see if a SQL query doing AVG() works as defined" tests), enough to sleep peacefully.

\*\* *Good testing*, I’ve seen data engineers proud of their (happy path high coverage % seeking unit) testing efforts yet still losing hours diagnosing issues caused by uncontrolled live inputs and outputs in their pipelines.
    - **RobDoesData** (1↑): That's not true 

Data quality checks are obviously important but functional code tests than generate the data offer much more coverage and safety for building your pipelines.
  - **kenfar** (3↑): It would also help enormously if our field focused more on methodology and less on marketing & products.

For example, there's a huge difference between:

   * Quality Assurance (QA): Integration testing
   * Quality Assurance (QA): Unit testing 
   * Quality Control (QC): data validation & anomaly-detection

They are all testing, and we really need all of them to various degrees.
    - **PotokDes** (2↑): There are some new books that tires to feel the gap. I personally liked "fundamentals of data engineering".
  - **yourAvgSE** (1↑): After spending a year in this sub, I've become of the opinion that an overwhelming majority of users here are either students, junior engineers, or just completely out of touch boomers who are terrible at their jobs.

I would never take legitimate DE advice from this sub. Ironically, /g/ in 4chan actually has much better views about DE.

I'll never forget a thread here where the most upvoted answer about a problem of sending a report to 1000 people was to send 1000 excel files via email
  - **yourAvgSE** (1↑): It's really incredible how bad most of the takes in technology subs are.

The problem is that Reddit allows users to sound super wise and confident while spewing nonsense
  - **PotokDes** (-1↑): True. It is not about testing, it is about being professional and doing your job.
- **DenselyRanked** (10↑): "Why data engineers don’t test?" and " Why don’t data engineers test like software engineers do?" are two very different questions. I would assume that there is some sort of validation process even if it doesn't look the way you would expect it to.

It's also odd (and very un-DE like) to lump all of the subreddit responses together as if these are not different users with different opinions. That being said, I largely agree with the overall idea of points 1 and 3 for a lack of unit testing- the upstream data is too unpredictable for it to be useful and the expected outputis (or should be) driven by the stakeholders ever evolving business rules. Data engineers often work within a data platorm or framework, so I am not sure what is being built where an integration test would be useful beyond valdiating results in a Dev and/or UAT environment.   

The link to your blog in your previous post is not working. Can you add a summary?
  - **PotokDes** (3↑): The comments were all from a single post. I read through them and tried to identify the main themes in each comment. Then I grouped those themes and distilled the core idea. Maybe I should have added the nicknames of the users along. I will do it next time if I repeat this exercise.

The blog I linked earlier is a series of three articles. While building an analytical pipeline, I added different types of tests and explained their purpose along the way.  
  
Of course, it’s all written from my perspective and based on my own experiences, so it might not apply to everyone.
    - **DenselyRanked** (2↑): > Of course, it’s all written from my perspective and based on my own experiences, so it might not apply to everyone.

I am not trying to invalidate your experience, but stating something sensational like "Why don't data engineers test" is too much of an overgeneralization of data engineering practices. Data engineering is not a monolithic process (even for an analytical pipeline) and there are a near infinite number of tools, methodologies, and approaches. The broad definition of data engineering as a discipline and a job title is something that many have dived into in books, blogs, and videos, so it may be worthwhile for you to explore some of this content as you continue your journey. 

A positive takeaway is that you have sparked interesting discussions about unit testing in data engineering. Everyone seems to have different, but strongly held, opinions on what it is and how it is useful.
- **MonochromeDinosaur** (35↑): My experience with this is that many data engineers are heavily SQL focused and programming is a secondary tool so they’ve simply either never had the means to test things in the way software engineers do (SQL) or never had to write something larger than an ETL script.

In my personal experience, it took experience writing actual application code (not scripts) to learn how to deliberately write testable code and not some untestable script kiddie slop.
  - **PotokDes** (8↑): Maybe you're right. I was a software engineer before landing my first DE role, and I think that gave me a better perspective.  
  
Iol, I earned a lot by fixing a Python script that had grown into a standalone application but still functioned  and was structured  like a script.
  - **Little_Kitty** (2↑): My experience is that many have more of a basic Excel background and copy paste python scripts until they delivers what's specified on Jira.  No understanding of the fundamentals such as what consumes memory, why storage IO can be a bottleneck, what cardinality and granularity mean.

Python being the lingua franca is an issue - it's easy to write terrible code and searching for examples when trying to accomplish something usually turns that up for you to copy-paste.  Treat it as a tool to instruct dedicated / appropriate resources to do things, not as the whole environment unless you're doing small stuff.

It's useful to find good people to learn from e.g. /u/kenfar on here reliably writes comments that you will learn from, whereas the bulk of what is written is more likely to mislead you - even if well intentioned.
- **Icy_Clench** (8↑): Part of it is the janky way you have to do testing. In normal programs you pass your functions inputs and expect outputs. There is no simple way to change the inputs and capture outputs of a SQL select statement. When you’re developing, it’s natural to just want to run an SQL statement and see the output, and it’s not that straightforward when you’ve got a template and model jargon.

You have to template your code out to parameterize every input and output. Then you have to figure out how you’re going to get your test cases hooked up in there. Tools like dbt and sqlmesh don’t feel like they scale all that well imo, and it’s odd to store database tables to test as yaml.

Plus some more head scratchers about how you’re going to make ephemeral and idempotent tests, and separate environments. When I started, nobody at my organization was aware of the tooling that can do this. It can feel overwhelming to set up a good CICD process.
  - **SearchAtlantis** (1↑): Any suggestions? I just inherited an Airflow + SQL stack and the lack of tests is driving me bananas. It's supposed to go to databricks but that is the golden future, not the tech debt I have to deal with now.
    - **Icy_Clench** (3↑): If the SQL isn’t templated out, it is almost impossible to do tests. You’d have to do error-prone plain text replacements. Start with jinja templating all of the table names.
- **Clever_Username69** (7↑): Writing good tests is difficult and DE is a somewhat new field so people don't do it as much as they should. In my experience (mostly feeding business/analytics reports) having good tests for business logic is more useful than technical testing (like is this column nullable or unique, etc) because I'm trying to minimize scenarios where the data pipelines succeed but the numbers make no sense to business people and then the business complains or stops trusting the numbers. And I find a decent amount of issues with technical data quality will be noticeable immediately, like if you try to upsert with a duplicate PK, the pipeline will fail and you'll get a notification. 

It seems like you have the perspective of a DE working in a tech minded company where tech/software is the product, so it makes sense to have the highest possible software quality. This is not the case for all non software companies, where having old and shitty software is the norm and asking for budget increases gets you laughed out of the room. This culture filters down into who gets hired and what tools get used, so the business ends up with worse quality engineering talent all else equal. Sometimes that blows up in the business's face, other times nothing bad happens for years. Those DEs probably aren't going to write tests because they don't see the benefits, are too lazy, are overworked, or don't have the budget (or some other excuse). idk if that answers your question but i think it describes reality a bit better than the strawman arguments the earlier commenters provided
- **AdamByLucius** (7↑): Was this the thread that did a good discussion on unit testing versus integration testing in DE workflows?  

Would love to have a detailed discussion on that (and similar treatment to the ‘Reddit says’ / ‘DE says’ response framing!).
  - **PotokDes** (3↑): I’m not certain that the people posting on r/dataengineering are actual data engineers.

Edit: Ignore it, I did not get what you mean at first :).
  - **PotokDes** (0↑): There was some discussion on that topic, but also many other conversations. I especially liked the one about the difference between data tests and logic tests, though it was actually a critique of my post.
- **botswana99** (5↑): I've been working on (and failing at, honestly) getting data engineers to adopt proper testing practices for ten years. Here's what I've observed:

1.     **Legacy Systems and Technical Debt** Many organizations are stuck with legacy data architectures - monolithic data warehouses, batch ETL processes built years ago - that are incredibly difficult to modernize. The technical debt from years of ad hoc development makes implementing proper testing and observability feel like trying to retrofit a Formula 1 engine into a horse-drawn carriage. Migrating to modern cloud-native stacks requires significant investment that many companies aren't willing to make.

2.     **Lack of Data Engineering Maturity** This is the big one. Most companies still treat data engineering as a back-office function rather than a core engineering discipline. You end up with a mess of one-off scripts, undocumented workflows, and manual interventions everywhere. Very few data teams practice basic software engineering principles like CI/CD, proper testing, or version control for their pipelines.

3.     **Resistance to Cultural Change** Data teams have historically worked in silos - engineers, analysts, scientists, and business teams all doing their own thing. DataOps requires breaking down these silos and adopting agile methodologies, which is genuinely disruptive to existing workflows. Leadership has to drive this cultural shift, but most executives don't understand data engineering well enough to know what needs to change.  You need to test at every point on the data joureny

4.     **Tooling Complexity & Vendor Overload** The data tooling landscape is overwhelming. Every vendor promises to solve all your problems, but integrating everything into a coherent, testable system is a nightmare.

5.     **Lack of Automated Testing & Observability** This is where we really fail compared to software engineering. Data teams still rely on manual SQL checks instead of automated data quality pipelines. We have open source tools now - Great Expectations, , dbt tests, and my company's DataOps Data Quality TestGen - but adoption is still painfully slow.

6.     **The Meaning of "Testing" is Confusing** This one drives me crazy. When software engineers talk about testing, they mean unit tests, integration tests, etc. that run during development and deployment. But in data engineering, "testing" could mean: Testing your code logic during development (like software engineers do), Testing data quality when new data arrives in production, Testing data at various points in the produict process.

7.     **Do you test in development when code changes, or in production when data changes? The answer is YES to both**, but most teams don't distinguish between these different types of testing. This confusion leads to either over-engineering development tests or completely ignoring runtime data quality checks. We need both static code testing AND dynamic data testing, but the industry hasn't standardized the terminology or tooling around this distinction.

8.     **Regulatory & Compliance Challenges** Compliance requirements often prioritize audit trails over engineering best practices, creating friction around automation.

9.     **Lack of Executive Buy-In & ROI Justification** It's hard to quantify the ROI of "preventing data disasters that haven't happened yet." Executives see testing as overhead rather than insurance.

The frustrating part is that we know how to solve these problems - the tools and methodologies exist. But changing organizational culture and overcoming years of technical debt is incredibly difficult. It's like trying to rebuild a plane while it's flying.
  - **worktyworkwork** (1↑): For #6 id probably differentiate testing from validation, which is what it sounds like you're describe?
    - **botswana99** (1↑): Yea, I think data validation in production is done by data quality tests.  … so testing?
- **KWillets** (4↑): The short answer: it's better to have good data and bad processes than vice-versa. 

Databases are collections of facts, and the way to test facts is for the people who understand the facts to run queries. These people change their minds frequently.
- **SnooHesitations9295** (20↑): As I've said in another discussion on the same topic: Data Engineering is all about managing state.  
Software Engineers never manage state in their life. And all "solutions" to managing state in modern software revolve around "let's not manage state at all, too complicated".  
So DE do not write "tests" because typical SWE tests are useless for state management.
  - **Impressive_Run8512** (5↑): If they're a typical web dev, then yeah. But they're also the bottom of the barrel in terms of software engineering. Dealing with state is the first, and arguably most important step to any mobile / native app.

To say that "Software Engineers never manage state in their life" is just incorrect.

Also...

\> typical SWE tests are useless for state management

What do you mean by this? There's E2E tests, unit tests (which you can obviously inject state or common patterns), and property based testing (best for state fuzzing).
  - **BrisklyBrusque** (5↑): What do you mean by state? I think SWE deal with dynamic states all the time. They are used to application APIs changing overnight, data drift in machine learning algorithms, service providers like Google or YouTube or Salesforce changing what kind of metrics they provide, servers experiencing high load under certain conditions (Black Friday), etc.
    - **leonseled** (5↑): You mock all of those in SWE. You only make actual calls in E2E or integration tests usually. 

There is no such thing in DE. Sure you can create mock data but 100% sure your pipeline will still end up failing in prod even with those tests.

Create mock data for smoke tests if you want (i think dbt is rolling out support for limited row count runs which removes need for creating mock data)  

Business logic tests and dq checks yes 100%. But unit testing is a waste of time.
    - **SnooHesitations9295** (0↑): By state I mean holding and managing the state of the application.  
Check the shitshow of redux, mst, and others. And that's just a state of web app: which buttons are pressed and checkmarks are checked.  
Managing more complex states is much more "interesting". Usually a typical SWE cannot do that and they rely on RDBMS to manage it for them.  
Transactions, rollback support, etc.
  - **PotokDes** (2↑): This is interesting point of view I will think about it.
