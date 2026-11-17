---
id: known-gaps/failure-unverified-quote.md
title: "Recurring failure: Quotes not found in the cited source"
type: known-gap
source: eval-frontier
family: UNVERIFIED_QUOTE
applies_to: generation
kinds: [brief, prd, quiz, report]
cases: 18
updated: 2026-11-11
source_hash: fcb950e9a89a6b60
chunks:
  - id: "known-gaps/failure-unverified-quote.md#c0"
    char_span: [0, 357]
    sentence_count: 3
    key_terms: [chunk, cited, does, deliverable, engagement, paraphrase, recurring, evidence]
    concepts: [chunk, cited]
    token_count: 87
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-unverified-quote.md#c1"
    char_span: [455, 2171]
    sentence_count: 1
    key_terms: [blocking, frontier, repair, round, case, row, prd, prd-]
    concepts: [blocking, frontier, repair, round, report-]
    related_chunks: ["known-gaps/failure-unverified-quote.md#c2"]
    section: "2026-09-11 | as-of-august-september-2026-no-earlier-what-are-the-capabilities-limitations-and / 2026-10-03 | deliver-a-2026-risk-and-market-analysis-report-evaluating-how-emerging-property / 2026-10-03 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ / 2026-10-05 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ / 2026-11-09 | 1-understand-emerging-northeastern-university-student-and-other-college-student"
    token_count: 460
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-unverified-quote.md#c2"
    char_span: [2269, 2914]
    sentence_count: 1
    key_terms: [blocking, frontier, repair, round, case, row, prd, prd-]
    concepts: [blocking, frontier, repair, round]
    related_chunks: ["known-gaps/failure-unverified-quote.md#c1"]
    section: "2026-11-10 | 1-understand-emerging-northeastern-university-student-and-other-college-student"
    token_count: 234
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
---
# Recurring failure: Quotes not found in the cited source

What fails: A quoted span does not appear verbatim in the cited chunk.

Seen in 18 frontier eval case(s) across 4 engagement(s); deliverable kinds: prd (11), report (5), brief (1), quiz (1).

What the harness does about it: Quote only text present in the chunk; paraphrase loses the Evidence label.

## 2026-09-11 | as-of-august-september-2026-no-earlier-what-are-the-capabilities-limitations-and
- report report_1789160246406: 2 blocking row(s) after 1 repair round(s) (frontier case report-report_1789160246406)

## 2026-10-03 | deliver-a-2026-risk-and-market-analysis-report-evaluating-how-emerging-property
- prd prd_1791062565190: 13 blocking row(s) after 1 repair round(s) (frontier case prd-prd_1791062565190)
- prd prd_1791065630724: 17 blocking row(s) after 1 repair round(s) (frontier case prd-prd_1791065630724)

## 2026-10-03 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ
- prd prd_1790992453571: 13 blocking row(s) after 1 repair round(s) (frontier case prd-prd_1790992453571)
- prd prd_1790996085060: 24 blocking row(s) after 1 repair round(s) (frontier case prd-prd_1790996085060)
- prd prd_1791001019550: 145 blocking row(s) after 1 repair round(s) (frontier case prd-prd_1791001019550)

## 2026-10-05 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ
- report report_1791226306714: 2 blocking row(s) after 1 repair round(s) (frontier case report-report_1791226306714)

## 2026-11-09 | 1-understand-emerging-northeastern-university-student-and-other-college-student
- prd prd_1794198719767: 8 blocking row(s) after 1 repair round(s) (frontier case prd-prd_1794198719767)
- prd prd_1794203207634: 14 blocking row(s) after 1 repair round(s) (frontier case prd-prd_1794203207634)
- report report_1794197230641: 1 blocking row(s) after 1 repair round(s) (frontier case report-report_1794197230641)
- report report_1794204665168: 3 blocking row(s) after 2 repair round(s) (frontier case report-report_1794204665168)
- report report_1794207381855: 1 blocking row(s) after 2 repair round(s) (frontier case report-report_1794207381855)

## 2026-11-10 | 1-understand-emerging-northeastern-university-student-and-other-college-student
- brief brief_1794271881406: 1 blocking row(s) after 2 repair round(s) (frontier case brief-brief_1794271881406)
- prd prd_1794279168716: 20 blocking row(s) after 2 repair round(s) (frontier case prd-prd_1794279168716)
- prd prd_1794280192856: 20 blocking row(s) after 2 repair round(s) (frontier case prd-prd_1794280192856)
- prd prd_1794283409964: 19 blocking row(s) after 2 repair round(s) (frontier case prd-prd_1794283409964)
- prd prd_1794284408358: 34 blocking row(s) after 2 repair round(s) (frontier case prd-prd_1794284408358)
- quiz quiz_1794276212181: 1 blocking row(s) after 2 repair round(s) (frontier case quiz-quiz_1794276212181)
