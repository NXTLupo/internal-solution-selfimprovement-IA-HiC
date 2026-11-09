---
id: articles/fred-blog/f31dd30aad.md
url: "https://fredblog.stlouisfed.org/2026/09/estimating-the-risk-of-recession-in-the-us/"
url_hash: "f31dd30aad"
kind: "article"
source: "fred_blog"
title: "Estimating the risk of recession in the US"
author: ""
date: "Thu, 24 Sep 2026 13:00:00 +0000"
tier: 3
method: "source-native"
extracted_at: "2026-10-01T21:03:34.050581+00:00"
chars: 2314
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
collected_at: "2026-10-01T21:03:33.825Z"
relevance: 5
engagement_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
content_hash: "4f9f93cf9f66025a"
relevance_by_goal: {"3c5a90385ab5":5}
chunks:
  - id: "articles/fred-blog/f31dd30aad.md#c0"
    char_span: [0, 2467]
    sentence_count: 15
    key_terms: [probability, recession, business, data, fred, recessions, graph, available]
    concepts: [probability, recession, business, recessions, available]
    token_count: 500
    sources: [{"n":"fred_blog","u":"https://fredblog.stlouisfed.org/2026/09/estimating-the-risk-of-recession-in-the-us/","kind":"article","date":"2026-09-24"}]
---
# Estimating the risk of recession in the US

Source: [fred_blog](https://fredblog.stlouisfed.org/2026/09/estimating-the-risk-of-recession-in-the-us/)

The takeaway
A new dataset in FRED provides the monthly probability the US economy is in recession. The latest data, for August 2026, show that probability was 0.08%.
The data
FRED has added probability estimates of the US economy being in recession. The dataset comes from RecessionRisk.com and was developed by economists Francesco Furno and Domenico Giannone. Our FRED graph above shows these monthly median probabilities since January 1980. Probability values range from 0% to 100%, where values closer to 100 indicate higher probability of recession.
Because the calculations incorporate timely indicators, these estimates are available on the first business day after the reference month closes. For example, the recession risk value for August 2026 (0.08%) became available on the first business day of September 2026.
The shaded areas in the graph represent the start and end dates of recessions reported by the National Bureau of Economic Research (NBER) Business Cycle Dating Committee. This data visualization feature can be turned on and off in every FRED graph by following the steps described here.
The interpretation
The overlap between the RecessionRisk.com data and the NBER data is generally close. The timing of spikes in the estimated probability of recession broadly coincide with the dates announced by the NBER for turning points in the US business cycle from expansion to contraction. (That is, the occurrence of recessions.) However, several probability spikes, such as the ones around October 1998 and March 2023, did not develop into actual recessions.
The methodology
The probability estimates are calculated using a statistical model that combines two indicators. The first measures broad economic conditions, and the second measures financial market stress:
- Institute for Supply Management’s Purchasing Managers’ Index (PMI) for manufacturing, which is a survey of business conditions
- The Composite Indicator of Systemic Stress (CISS) reported by the European Central Bank, which tracks stress across bond, equity, money, foreign exchange, and financial intermediary markets
Details about the methodologies are available here.
How this graph was created: Search FRED for and select “Recession Probability for the United States, Median Estimate.”
Suggested by Diego Mendez-Carbajo.
