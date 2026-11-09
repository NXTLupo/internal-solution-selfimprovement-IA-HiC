---
id: known-gaps/failure-evidence-density.md
title: "Recurring failure: Evidence density below the floor before generation"
type: known-gap
source: eval-frontier
family: evidence-density
applies_to: generation
kinds: [brief, case-study, gap-analysis, persona, recommendation, strategy]
cases: 245
updated: 2026-11-09
source_hash: 447f42e85fbaa4c1
chunks:
  - id: "known-gaps/failure-evidence-density.md#c0"
    char_span: [0, 517]
    sentence_count: 3
    key_terms: [deliverable, generation, evidence-density-pre-checker, evidence, recommendation, gap-analysis, remediation, case-study]
    concepts: [deliverable, generation, evidence]
    related_chunks: ["known-gaps/failure-evidence-density.md#c1", "known-gaps/failure-evidence-density.md#c2", "known-gaps/failure-evidence-density.md#c3", "known-gaps/failure-evidence-density.md#c4", "known-gaps/failure-evidence-density.md#c5"]
    token_count: 109
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-evidence-density.md#c1"
    char_span: [542, 1559]
    sentence_count: 1
    key_terms: [generation, evidence, frontier, density, case, below, brief, floor]
    concepts: [generation, evidence, frontier, density, below]
    related_chunks: ["known-gaps/failure-evidence-density.md#c0", "known-gaps/failure-evidence-density.md#c2", "known-gaps/failure-evidence-density.md#c3", "known-gaps/failure-evidence-density.md#c4", "known-gaps/failure-evidence-density.md#c5"]
    section: "2026-10-31 | unknown"
    token_count: 286
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-evidence-density.md#c2"
    char_span: [1585, 2616]
    sentence_count: 1
    key_terms: [generation, evidence, frontier, density, case, below, floor, brief]
    concepts: [generation, evidence, frontier, density, below]
    related_chunks: ["known-gaps/failure-evidence-density.md#c0", "known-gaps/failure-evidence-density.md#c1", "known-gaps/failure-evidence-density.md#c3", "known-gaps/failure-evidence-density.md#c4", "known-gaps/failure-evidence-density.md#c5"]
    section: "2026-11-03 | unknown"
    token_count: 290
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-evidence-density.md#c3"
    char_span: [2642, 3445]
    sentence_count: 1
    key_terms: [generation, evidence, frontier, density, below, floor, hook-recommendation-1793809894, case]
    concepts: [generation, evidence, frontier, density, hook-recommendation-1793809894]
    related_chunks: ["known-gaps/failure-evidence-density.md#c0", "known-gaps/failure-evidence-density.md#c1", "known-gaps/failure-evidence-density.md#c2", "known-gaps/failure-evidence-density.md#c4", "known-gaps/failure-evidence-density.md#c5"]
    section: "2026-11-04 | unknown"
    token_count: 211
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-evidence-density.md#c4"
    char_span: [3471, 4274]
    sentence_count: 1
    key_terms: [generation, evidence, frontier, density, below, floor, hook-recommendation-1793973739, case]
    concepts: [generation, evidence, frontier, density, hook-recommendation-1793973739]
    related_chunks: ["known-gaps/failure-evidence-density.md#c0", "known-gaps/failure-evidence-density.md#c1", "known-gaps/failure-evidence-density.md#c2", "known-gaps/failure-evidence-density.md#c3", "known-gaps/failure-evidence-density.md#c5"]
    section: "2026-11-06 | unknown"
    token_count: 211
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-evidence-density.md#c5"
    char_span: [4300, 5103]
    sentence_count: 1
    key_terms: [generation, evidence, frontier, density, below, floor, hook-recommendation-1794058599, case]
    concepts: [generation, evidence, frontier, density, hook-recommendation-1794058599]
    related_chunks: ["known-gaps/failure-evidence-density.md#c0", "known-gaps/failure-evidence-density.md#c1", "known-gaps/failure-evidence-density.md#c2", "known-gaps/failure-evidence-density.md#c3", "known-gaps/failure-evidence-density.md#c4"]
    section: "2026-11-07 | unknown"
    token_count: 211
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-evidence-density.md#c6"
    char_span: [5129, 6190]
    sentence_count: 1
    key_terms: [generation, evidence, frontier, density, case, below, floor, hook-case-study-1794145066]
    concepts: [generation, evidence, frontier, density, below]
    related_chunks: ["known-gaps/failure-evidence-density.md#c0", "known-gaps/failure-evidence-density.md#c1", "known-gaps/failure-evidence-density.md#c2", "known-gaps/failure-evidence-density.md#c3", "known-gaps/failure-evidence-density.md#c4"]
    section: "2026-11-08 | unknown"
    token_count: 298
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-evidence-density.md#c7"
    char_span: [6216, 7019]
    sentence_count: 1
    key_terms: [generation, evidence, frontier, density, below, floor, hook-recommendation-1794182503, case]
    concepts: [generation, evidence, frontier, density, hook-recommendation-1794182503]
    related_chunks: ["known-gaps/failure-evidence-density.md#c0", "known-gaps/failure-evidence-density.md#c1", "known-gaps/failure-evidence-density.md#c2", "known-gaps/failure-evidence-density.md#c3", "known-gaps/failure-evidence-density.md#c4"]
    section: "2026-11-09 | unknown"
    token_count: 211
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
---
# Recurring failure: Evidence density below the floor before generation

What fails: The corpus carried too little named evidence for the deliverable before generation started.

Seen in 245 frontier eval case(s) across 1 engagement(s); deliverable kinds: case-study (44), gap-analysis (43), persona (43), recommendation (41), brief (37), strategy (37).

What the harness does about it: evidence-density-pre-checker names the upstream remediation (query expansion, analogues, framework pages) to run before generating.

## 2026-10-31 | unknown
- brief hook-brief-1793460591: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793460591)
- brief hook-brief-1793462194: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793462194)
- brief hook-brief-1793464441: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793464441)
- brief hook-brief-1793469629: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793469629)
- brief hook-brief-1793470674: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793470674)
- brief hook-brief-1793470679: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793470679)
- brief hook-brief-1793470684: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793470684)
- brief hook-brief-1793470701: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793470701)
- and 134 more case(s) of this family on this day

## 2026-11-03 | unknown
- brief hook-brief-1793732485: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793732485)
- brief hook-brief-1793735250: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793735250)
- brief hook-brief-1793737909: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793737909)
- brief hook-brief-1793737910: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793737910)
- brief hook-brief-1793738733: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793738733)
- brief hook-brief-1793739692: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793739692)
- brief hook-brief-1793746499: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793746499)
- case-study hook-case-study-1793732485: Evidence density 0.72 below floor before generation (frontier case hook-case-study-1793732485)
- and 36 more case(s) of this family on this day

## 2026-11-04 | unknown
- brief hook-brief-1793809894: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793809894)
- case-study hook-case-study-1793809894: Evidence density 0.72 below floor before generation (frontier case hook-case-study-1793809894)
- gap-analysis hook-gap-analysis-1793809894: Evidence density 0.72 below floor before generation (frontier case hook-gap-analysis-1793809894)
- persona hook-persona-1793809894: Evidence density 0.72 below floor before generation (frontier case hook-persona-1793809894)
- recommendation hook-recommendation-1793809894: Evidence density 0.72 below floor before generation (frontier case hook-recommendation-1793809894)
- strategy hook-strategy-1793809894: Evidence density 0.72 below floor before generation (frontier case hook-strategy-1793809894)

## 2026-11-06 | unknown
- brief hook-brief-1793973739: Evidence density 0.33 below floor before generation (frontier case hook-brief-1793973739)
- case-study hook-case-study-1793973739: Evidence density 0.72 below floor before generation (frontier case hook-case-study-1793973739)
- gap-analysis hook-gap-analysis-1793973739: Evidence density 0.72 below floor before generation (frontier case hook-gap-analysis-1793973739)
- persona hook-persona-1793973739: Evidence density 0.72 below floor before generation (frontier case hook-persona-1793973739)
- recommendation hook-recommendation-1793973739: Evidence density 0.72 below floor before generation (frontier case hook-recommendation-1793973739)
- strategy hook-strategy-1793973739: Evidence density 0.72 below floor before generation (frontier case hook-strategy-1793973739)

## 2026-11-07 | unknown
- brief hook-brief-1794058599: Evidence density 0.33 below floor before generation (frontier case hook-brief-1794058599)
- case-study hook-case-study-1794058599: Evidence density 0.72 below floor before generation (frontier case hook-case-study-1794058599)
- gap-analysis hook-gap-analysis-1794058599: Evidence density 0.72 below floor before generation (frontier case hook-gap-analysis-1794058599)
- persona hook-persona-1794058599: Evidence density 0.72 below floor before generation (frontier case hook-persona-1794058599)
- recommendation hook-recommendation-1794058599: Evidence density 0.72 below floor before generation (frontier case hook-recommendation-1794058599)
- strategy hook-strategy-1794058599: Evidence density 0.72 below floor before generation (frontier case hook-strategy-1794058599)

## 2026-11-08 | unknown
- brief hook-brief-1794145066: Evidence density 0.33 below floor before generation (frontier case hook-brief-1794145066)
- brief hook-brief-1794158805: Evidence density 0.33 below floor before generation (frontier case hook-brief-1794158805)
- brief hook-brief-1794177289: Evidence density 0.33 below floor before generation (frontier case hook-brief-1794177289)
- brief hook-brief-1794178717: Evidence density 0.33 below floor before generation (frontier case hook-brief-1794178717)
- brief hook-brief-1794181129: Evidence density 0.33 below floor before generation (frontier case hook-brief-1794181129)
- case-study hook-case-study-1794145066: Evidence density 0.72 below floor before generation (frontier case hook-case-study-1794145066)
- case-study hook-case-study-1794158806: Evidence density 0.72 below floor before generation (frontier case hook-case-study-1794158806)
- case-study hook-case-study-1794177289: Evidence density 0.72 below floor before generation (frontier case hook-case-study-1794177289)
- and 27 more case(s) of this family on this day

## 2026-11-09 | unknown
- brief hook-brief-1794182503: Evidence density 0.33 below floor before generation (frontier case hook-brief-1794182503)
- case-study hook-case-study-1794182503: Evidence density 0.72 below floor before generation (frontier case hook-case-study-1794182503)
- gap-analysis hook-gap-analysis-1794182503: Evidence density 0.72 below floor before generation (frontier case hook-gap-analysis-1794182503)
- persona hook-persona-1794182503: Evidence density 0.72 below floor before generation (frontier case hook-persona-1794182503)
- recommendation hook-recommendation-1794182503: Evidence density 0.72 below floor before generation (frontier case hook-recommendation-1794182503)
- strategy hook-strategy-1794182503: Evidence density 0.72 below floor before generation (frontier case hook-strategy-1794182503)
