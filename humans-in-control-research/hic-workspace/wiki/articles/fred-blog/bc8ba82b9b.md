---
id: articles/fred-blog/bc8ba82b9b.md
url: "https://fredblog.stlouisfed.org/2026/09/a-new-calculation-for-subprime-credit-risk/"
url_hash: "bc8ba82b9b"
kind: "article"
source: "fred_blog"
title: "A new calculation for subprime credit risk"
author: ""
date: "Thu, 10 Sep 2026 13:00:00 +0000"
tier: 3
method: "source-native"
extracted_at: "2026-10-01T21:03:36.082750+00:00"
chars: 2520
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
collected_at: "2026-10-01T21:03:35.971Z"
relevance: 5
engagement_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
content_hash: "f7ac2103cac9128b"
relevance_by_goal: {"3c5a90385ab5":5}
chunks:
  - id: "articles/fred-blog/bc8ba82b9b.md#c0"
    char_span: [0, 150]
    sentence_count: 1
    key_terms: [a-new-calculation-for-subprime-credit-risk, calculation, stlouisfed, fredblog, subprime, credit, source, https]
    token_count: 42
    sources: [{"n":"fred_blog","u":"https://fredblog.stlouisfed.org/2026/09/a-new-calculation-for-subprime-credit-risk/","kind":"article","date":"2026-09-10"}]
  - id: "articles/fred-blog/bc8ba82b9b.md#c1"
    char_span: [152, 2397]
    sentence_count: 13
    key_terms: [methodology, credit, new, score, equifax, york, consumer, subprime]
    concepts: [methodology, credit, score, equifax, consumer]
    token_count: 512
    sources: [{"n":"fred_blog","u":"https://fredblog.stlouisfed.org/2026/09/a-new-calculation-for-subprime-credit-risk/","kind":"article","date":"2026-09-10"}]
  - id: "articles/fred-blog/bc8ba82b9b.md#c2"
    char_span: [2156, 2673]
    sentence_count: 3
    key_terms: [select, graph, population, subprime, equifax, alfred, county, credit]
    concepts: [select, graph, population, subprime, equifax]
    token_count: 130
    sources: [{"n":"fred_blog","u":"https://fredblog.stlouisfed.org/2026/09/a-new-calculation-for-subprime-credit-risk/","kind":"article","date":"2026-09-10"}]
---
# A new calculation for subprime credit risk

Source: [fred_blog](https://fredblog.stlouisfed.org/2026/09/a-new-calculation-for-subprime-credit-risk/)

The takeaway
The New York Fed’s consumer credit dataset is now calculated with a different methodology—one that includes 33 million more borrowers than before.
The Consumer Credit Panel
With a data update on August 10, 2026, the New York Fed has changed the way it measures subprime credit risk in their Consumer Credit Panel, moving from the old/discontinued methodology of Equifax Risk Score 3.0 to the new methodology of Vantage Score 4.0.
Our FRED map above shows, for each U.S. county, the percent of the resident population with a credit score below 660 in Q4 of 2025—again, with data from the revised version of their Consumer Credit Panel.
The New York Fed advises users to “exercise caution when comparing credit score distribution changes from 2025:Q4 to 2026:Q1, as differences may reflect the change in scoring model rather than changes in borrower credit quality.”
Comparing the old and new measures
We can use our archival ALFRED database to compare the data vintages of the new Vantage Score 4.0 methodology with the vintages of the old/discontinued Equifax Risk Score 3.0 methodology. The graph shows the data for New York County (i.e., Manhattan). Clearly, these percentages are substantially higher now than they had been. For example, the current subprime share of 30.27% (green line, for Q4 2025) had been 17.72% (blue line, for Q4 2025) before the methodology was revised.
What changed, exactly?
Vantage Score 4.0 is a credit-scoring model that uses a broader set of personal finance information details than the Equifax Risk Score 3.0 it replaced. By casting a broader scoring net, 33 million additional borrowers that previously were unscored are now factored into the calculations of subprime lenders as a fraction of overall populations. And, in a fraction, when the numerator rises more than the denominator, the resulting ratio rises.
Read more from the New York Fed about this switch in methodology and its potential implications for analysts and researchers.
How the FRED map and ALFRED graphs were created: For the map, search FRED for and select “Equifax Subprime Credit Population for New York County, NY.” Click on “View Map” and select the date “2025-10-01.” For the graph: Search ALFRED for and select “Equifax Subprime Credit Population for New York County, NY.” Click on “Edit Graph” and select the “Format” tab. Use the dropdown menu to select “Graph Type: Line.” Last, adjust the date range by clicking on the “Max” option above the graph canvas.
Suggested by Diego Mendez-Carbajo.
