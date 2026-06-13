---
id: social-intelligence/reddit-deep/dataengineering/1tpzxyw.md
url: "https://www.reddit.com/r/dataengineering/comments/1tpzxyw/llm_analytics_in_enterprises/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "LLM Analytics in Enterprises?"
author: "twattymanky"
date: "2026-05-28T10:46:42.000Z"
score: 20
upvote_ratio: 0.96
num_comments: 17
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.219Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1tpzxyw.md#c0"
    char_span: [0, 1259]
    sentence_count: 10
    key_terms: [data, dataengineering, organisations, mcp, understand, analytics, warehouse, comments]
    token_count: 257
  - id: "social-intelligence/reddit-deep/dataengineering/1tpzxyw.md#c1"
    char_span: [1274, 3447]
    sentence_count: 19
    key_terms: [evals, budget, llm, usually, agent, llms, run, baseline]
    section: Comments
    token_count: 513
  - id: "social-intelligence/reddit-deep/dataengineering/1tpzxyw.md#c2"
    char_span: [3449, 5938]
    sentence_count: 11
    key_terms: [business, because, start, data, risk, set, resolution, analytics]
    section: Comments
    token_count: 509
  - id: "social-intelligence/reddit-deep/dataengineering/1tpzxyw.md#c3"
    char_span: [5940, 8336]
    sentence_count: 12
    key_terms: [data, definitions, framework, get, need, people, build, right]
    section: Comments
    token_count: 504
  - id: "social-intelligence/reddit-deep/dataengineering/1tpzxyw.md#c4"
    char_span: [8338, 8482]
    sentence_count: 2
    key_terms: [foundation, repeatable, accuracy, freaking, insights, believe, magic, shiny]
    section: Comments
    token_count: 30
---
# LLM Analytics in Enterprises?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1tpzxyw/llm_analytics_in_enterprises/)
Posted by **twattymanky** · **20↑** · **17 comments**

Hi folks

Im curious to understand if and how teams are building their LLM analytics for internal usage across different organisations. Additionally, how would you test to ensure theres low hallucinations etc.

For example in my team (small organisation <50 people), we built an MCP server that runs on Cloudflare workers. We then have our main MCP client which is Claude that connects to that MCP. We have developed many skills and amongst it is a data warehouse skill which contains knowledge.md and skills.md files to describe the data warehouse. Those md files essentially are our semantic layer. We have some test coverage by domain which we try to evaluate desired sql outputs based on sample questions but its really rudimentary at the moment.

This was meant to help 'democratise' data but without proper testing and a robust evaluation infrastructure, it has really led exposing a lot of the key gaps, data quality and documentation issues.

I'm keen to understand how people are tackling this across organisations of varying sizes!

## Comments

- **Prestigious_Bench_96** (2↑): Evals, evals, evals. Markdown is fine as long as you manage it as code and measure changes. If you have a generous agent budget you can burn claude on the evals; if you don't figure out if you're allowed to use openrouter or equivalent and run them on deepseek. What matters is a measurable baseline. 

  
The problem with evals is:

1. Creating

2. Running them

3. Grading answers

Creating is annoying; usually just use your LLM, find things it's borderline on, promote that to an eval. Running is relatively easy if you figure out capacity/budget; grading... is tougher. I usually prefer to baseline on questions with clear answers and have the agent submit a tool call with a precise structured output rather than trying to wrangle with the SQL itself. Some people like LLMs as a judge but that's too much confound/uncertainty for me.
  - **Oxford89** (1↑): Evals?
    - **Prestigious_Bench_96** (2↑): "Evaluations" - test cases for the LLM that you can instrument and measure success on. (just integration testing with a fancy name). Since LLMs are fun and non deterministic, you'll usually need to run repeated trials (pass @ 10, etc). Then - ignoring budget - it's a general typical development loop; you find "issues" in prod where your agent + harness did something wrong, you create a test case that fails; you tweak things until it passes; you run regression tests on the whole suite; you ship it, and you feel reasonably confident that you have in fact made the system perform better. "ignoring budget" is doing a lot of heavy lifting here.
- **TheCauthon** (1↑): I’d be more curious to hear how LLMs in analytics actually drove value of any kind.  I’m generally curious.  I’ve seen some value from classification or extraction from unstructured data but very minimal impact to revenue.

Almost all examples I’ve seen so far are efficiency gains only.  Everything that comes out of an LLM always has to be validated.
  - **orinoco_w** (1↑): Depends on application point.

We've had success in using LLM for stuff like keyword research for SEO/SEM purposes for example, to improve ROI of marketing and pick up more lead volumes.

We haven't automated the marketing implementation end (yet) because the risk of LLM with Google ads MCP ducking up all the campaigns is too high, and the teams don't change easily (although I'm waiting for them to but some shitty tool on a whim which they give the keys to the castle and break things en masse).

The biggest barrier to scaling the final steps is what I've started calling  Business Engineering, which is hard and expensive, because it's bringing risk management and CICD practices to every line of business...  E.g. for marketing or SEO optimisation you need a way to A/B test and also to detect failures and roll back to working configs, and really fine grained access controls, because your agents could go haywire and break shit much faster than a rogue employee could.
    - **TheCauthon** (1↑): But isn’t this still an efficiency or operational improvement?
- **Mitzu_Analytics** (1↑): The md-files-as-semantic-layer approach is pragmatic but starts to fray when you need to handle ambiguous identifiers across tables. 'User' in your events schema might be session\_id in analytics events but account\_id in subscription tables — the LLM needs explicit resolution rules, not just context. The test coverage angle is the right instinct: the only thing that keeps text-to-SQL reliable in production is evaluating SQL output against known correct results for a representative question set. Worth separating the semantic disambiguation layer (machine-readable entity graph) from the prompt injection layer (the md files). The md files are great for business context; entity resolution needs deterministic rules.
- **orinoco_w** (0↑): Work up to it. 

Like any AI deployment, you start with internal use because it's lower risk and you can build maturity before it gets put in front of an (internal) customer.

So get the analytics team to start working with and learning from improving a set of agents to help them do their job.

Start with using llms to tie together documentation (business glossary) and data  definitions and data.. get a basic set of skills which describes your organisations metadata (products, terminology for the acquisition pipeline, etc.) and the warehouse structure and conceptual/physical model.

Then using MCP, connect a basic agent to start doing things you benefit from like reconciling datasets (e.g. comparing CI job vs live schema) and round out the data analyst skills for investigating data issues wlbehind incidents or quality issues.

Once that's reliable enough, extend to another agent who can actually build data and follow the standards.  Start with simple things like little refinements or analytical flag additions to a fact table, and build up to "can explore new content and build a fact which didn't exist".

All of this is with supervision, and learning to get LLM backed agents to learn how to use the tools to get data right, because LLM can not analyse data by just feeding iit data.  The nature of context and recency means they suck at "analyse this table and explain why X" because they sample, and cut corners and confidently give out bullshit.

So you need to learn how to get agents to use the tools like an analyst would, using python to profile a distribution, or testing joins by picking an unusual data point and following the narrative.

By this time your analytics team should be humming and being more productive.. but it still hasn't unlocked the power of data.  That's the next and hardest step.

You need to package up the skills, agent framework, etc. and be able to deploy it behind a service with a usable front end.. but you also need an eval framework to test it against regularly so that model or data changes give you confidence it's right.

Start by making sure the AI definitions of the core metrics you use, exactly match the accepted and working definitions from your BI tools..  numbers AI gives should be identical to the source of truth, and reliably so.. retention rates, lifetime values, click thru rates etc.   we pulled the DAX out of power BI and built a skill out of them for the definitions as they can traceably show how to calculate not just from the star-schema  data model, but also all the variants for year on year, month on month etc. too.

The eval framework can be a complex custom report from the BI suite and track that the AI version matches.

The harder part to do is then make sure people are asking useful questions which actually help improve performance.. 

And don't try to claim your AI can do amazing things which you can't actually deliver with your own people..  your people need the skills to know how to make it right, and how to know when it's off track.
  - **orinoco_w** (2↑): Oh and whenever someone shows you data where they threw a spreadsheet into Claude to get insights, ask them to do it again with the same spreadsheet, and to check their numbers.

Shiny toy is not a magic freaking wand but they all want to believe it.

Repeatable accuracy is your goal.. insights need that solid foundation.
