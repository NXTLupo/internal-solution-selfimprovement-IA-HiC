---
id: social-intelligence/reddit-deep/salesops/1td05vy.md
url: "https://www.reddit.com/r/SalesOps/comments/1td05vy/tested_hubspots_mcp_connector_on_revops_metrics/"
kind: "social-post"
source: "reddit-deep: r/salesops"
subreddit: "salesops"
title: "Tested HubSpot's MCP connector on RevOps metrics vs ground truth. Results were aweful!"
author: "alec_ogha"
date: "2026-05-14T14:38:24.000Z"
score: 2
upvote_ratio: 0.75
num_comments: 2
flair: ""
extracted_at: "2026-06-11T18:58:06.638Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesops/1td05vy.md#c0"
    char_span: [0, 2109]
    sentence_count: 22
    key_terms: [returned, mcp, hubspot, connector, instead, metrics, expansion, expecting]
    token_count: 503
  - id: "social-intelligence/reddit-deep/salesops/1td05vy.md#c1"
    char_span: [2111, 4117]
    sentence_count: 23
    key_terms: [layer, hubspot, returned, channel, "doesn't", nothing, revenue, "there's"]
    token_count: 440
  - id: "social-intelligence/reddit-deep/salesops/1td05vy.md#c2"
    char_span: [4132, 4774]
    sentence_count: 3
    key_terms: [constructionleft2325, semantic, layer, using, vasco, app, mcp, infrastructure]
    section: Comments
    token_count: 148
---
# Tested HubSpot's MCP connector on RevOps metrics vs ground truth. Results were aweful!

Source: [reddit-deep: r/salesops](https://www.reddit.com/r/SalesOps/comments/1td05vy/tested_hubspots_mcp_connector_on_revops_metrics/)
Posted by **alec_ogha** · **2↑** · **2 comments**

Background: I've been seeing a lot of "just connect Claude to your CRM via MCP and it'll handle your reporting" takes lately and I wanted to actually pressure-test that. Specifically: how accurate is the output when you ask it the kind of questions you'd actually ask in a monthly review.

So I built a ground-truth dataset for an anonymized sample company. Around 40 metrics (bowtie funnel actuals (leads, MQLs, SQLs, SAL pipeline, won, expansion, retention), actuals vs forecast comparison, channel attribution at every stage, rep performance, post-funnel expansion and retention by motion. Basically the stuff a CRO would actually look at. Then I asked Claude the same questions through the HubSpot MCP connector and compared.

HubSpot MCP returned like 10 out of 40 metrics. None of the 10 matched ground truth.

I was expecting some misses. I was not expecting the pattern of the misses, which is what I want to talk about.

I went in thinking I'd find dirty-data problems (duplicates, missing fields, etcc). What I actually found is a schema problem, and it's kind of more interesting (and harder to fix) than dirty data.

Examples of what came back:

When I asked for # of MQLs this month, HubSpot MCP returned the count of every contact currently sitting at or above MQL lifecycle stage. Cumulative, not period-based. So instead of 22 it returned 43. Same issue with SQLs: returned 30 instead of 5, off by 500%. The connector just doesn't have a concept of stage-transition logic, because HubSpot itself stores lifecycle as a current-state field, not as an event log.

Won revenue came back as the sum of closed-won deal amounts, which sounds right, except it missed all the post-closing upsells. So $16.5K instead of $87.4K, off by 81%. A CRO acting on $16.5K vs $87.4K draws the literal opposite conclusion about the month.

Channel attribution returned nothing useful. HubSpot stores hs\_analytics\_source (Organic, Direct, Paid Social, etc.) which is traffic source, not revenue channel taxonomy. There's no mapping from "Paid Social" to "Outbound" or "Referral" to "Partner", that classification layer doesn't exist in raw CRM, you have to build it.

Actuals vs planned returned nothing at all. HubSpot doesn't store forecast targets. No plan layer means there's nothing to compare against, which is fine, except Claude didn't say "I don't have plan data" ... it just... didn't address that part of the question.

That's actually the thing that bugged me most. Across all 40ish questions, Claude never flagged uncertainty. Never said "I'm not sure how your team defines MQL" or "this number looks cumulative, did you want period-based?" It just confidently returned numbers. If you didn't know to check, you'd never know.

The conclusion I keep landing on: an MQL in HubSpot and an MQL in your monthly review are not the same object. The connector gives you raw CRM access. A monthly review needs interpreted metrics, stage-transition logic, period-based counting, post-closing revenue concepts, a channel taxonomy that doesn't exist in the source schema, and a plan layer that lives in a spreadsheet somewhere. None of that is in the CRM, so none of it comes through the MCP.

Which means the "just plug Claude into HubSpot" pitch is doing a sleight-of-hand. The MCP is a data access layer. A revenue review needs a semantic layer. Different problem.

Two things I'm curious about from this sub:

1. For anyone running MCP connectors in production already: what's your sanity-check process before a number from one of these hits a board deck? Like is anyone actually catching this stuff, or is the trust just... assumed?
2. Where are you drawing the line between "use AI for drafting/summarizing" vs "use AI for numbers you'd act on"? Because I think there's a real answer there and I haven't seen anyone articulate it cleanly.

## Comments

- **ConstructionLeft2325** (1↑): Great write up on the semantic layer gap. I've seen success using them on top of a semantic layer that's been consolidated first with ETL tools like Windsor.ai, then adding an angetic infrastructure with metric definitions reviews, guardrails, feedback loops, and human in the loop validation. Without that stack, you get exactly what you found, confidently wrong numbers.
  - **alec_ogha** (1↑): u/ConstructionLeft2325 There's another tool called [vasco.app](http://vasco.app) that is doing that work of semantic layer as well and that has an MCP so using my HubSpot data through that and then MCP to Claude.
