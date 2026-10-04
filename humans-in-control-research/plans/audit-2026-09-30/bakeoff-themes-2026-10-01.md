# Theme-breadth bake-off 2026-10-01

Corpus: 18 excerpts across 18 distinct origins. 2 repetition(s) per model. Total spend $0.4597.

| model | runs | failed | quality | themes | thick | quote verbatim rate | cost per run | seconds |
|---|---|---|---|---|---|---|---|---|
| claude-opus-5-5 | 2 | 0 | 1 | 10.5 | 10.5 | 1 | $0.1438 | 46.3 |
| claude-sonnet-5-5 | 2 | 0 | 0.861 | 8.5 | 5 | 1 | $0.0806 | 44.7 |
| gemini-3.5-flash | 2 | 0 | 0.957 | 9.5 | 9.5 | 0.947 | $0.0054 | 49.1 |

Decision rule: a cheaper model may take theme breadth only if its mean quality is at least 0.90 of the reasoning model and its failed-run count is 0.

Recommendation: re-tier theme breadth to gemini-3.5-flash (quality 0.957 vs 1, cost 0.0054 vs 0.1438 per run).

Quality = 0.35 share of themes with two or more distinct origins + 0.35 share of quoted spans found verbatim in the corpus + 0.15 share free of hedge promotion + 0.15 share free of banned phrasing.