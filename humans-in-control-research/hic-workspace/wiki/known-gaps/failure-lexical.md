---
id: known-gaps/failure-lexical.md
title: "Recurring failure: Banned phrasing in generated copy"
type: known-gap
source: eval-frontier
family: lexical
applies_to: generation
kinds: [blueprint, journey, persona, prd-feature, recommendations, slides]
cases: 19
updated: 2026-11-06
source_hash: 566c08a9f28e213b
chunks:
  - id: "known-gaps/failure-lexical.md#c0"
    char_span: [0, 461]
    sentence_count: 3
    key_terms: [banned, claude, human-voice-editor, recommendations, meta-narration, banned-phrase, deliverable, prd-feature]
    concepts: [banned, claude]
    token_count: 113
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-lexical.md#c1"
    char_span: [558, 785]
    sentence_count: 1
    key_terms: [frontier, lexical, partial, slides-, slides, chain, case]
    concepts: [frontier, lexical, partial, slides-, slides]
    related_chunks: ["known-gaps/failure-lexical.md#c2", "known-gaps/failure-lexical.md#c3"]
    section: "2026-08-24 | analyze-the-executive-search-industry-to-map-current-trends-against-dsg-globals"
    token_count: 64
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-lexical.md#c2"
    char_span: [883, 1110]
    sentence_count: 1
    key_terms: [frontier, lexical, partial, slides-, slides, chain, case]
    concepts: [frontier, lexical, partial, slides-, slides]
    related_chunks: ["known-gaps/failure-lexical.md#c1", "known-gaps/failure-lexical.md#c3"]
    section: "2026-08-26 | identify-high-converting-email-design-patterns-and-product-marketing-trends-for"
    token_count: 64
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
  - id: "known-gaps/failure-lexical.md#c3"
    char_span: [1208, 3894]
    sentence_count: 1
    key_terms: [frontier, lexical, partial, chain, case, recommendations-, recommendations, slides-]
    concepts: [frontier, lexical, partial, chain, recommendations-]
    related_chunks: ["known-gaps/failure-lexical.md#c1", "known-gaps/failure-lexical.md#c2"]
    section: "2026-08-27 | identify-high-converting-email-design-patterns-and-product-marketing-trends-for / 2026-10-01 | identify-high-converting-email-design-patterns-and-product-marketing-trends-for / 2026-10-03 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ / 2026-10-05 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ / 2026-10-06 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ / 2026-10-20 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ / 2026-10-26 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ / 2026-11-03 | analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
    token_count: 502
    sources: [{"n":"eval-frontier","u":"","kind":"known-gap"}]
---
# Recurring failure: Banned phrasing in generated copy

What fails: The lexical stage removed banned phrases, meta-narration or format tells.

Seen in 19 frontier eval case(s) across 4 engagement(s); deliverable kinds: slides (8), recommendations (6), persona (2), blueprint (1), journey (1), prd-feature (1).

What the harness does about it: human-voice-editor and the banned-phrase list in .claude/CLAUDE.md; repeated hits point at a prompt that invites them.

## 2026-08-24 | analyze-the-executive-search-industry-to-map-current-trends-against-dsg-globals
- slides slides_1787577788440: chain:lexical partial (schema_invalid) (frontier case slides-slides_1787577788440)
- slides slides_1787579556386: chain:lexical partial (schema_invalid) (frontier case slides-slides_1787579556386)

## 2026-08-26 | identify-high-converting-email-design-patterns-and-product-marketing-trends-for
- slides slides_1787702950649: chain:lexical partial (schema_invalid) (frontier case slides-slides_1787702950649)
- slides slides_1787762412765: chain:lexical partial (schema_invalid) (frontier case slides-slides_1787762412765)

## 2026-08-27 | identify-high-converting-email-design-patterns-and-product-marketing-trends-for
- slides slides_1787848685138: chain:lexical partial (schema_invalid) (frontier case slides-slides_1787848685138)

## 2026-10-01 | identify-high-converting-email-design-patterns-and-product-marketing-trends-for
- prd-feature prd-feature_1790858517350: chain:lexical partial (schema_invalid) (frontier case prd-feature-prd-feature_1790858517350)

## 2026-10-03 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ
- persona persona-card_1790996995711: chain:lexical partial (schema_invalid) (frontier case persona-persona-card_1790996995711)
- slides slides_1790997482374: chain:lexical partial (schema_invalid) (frontier case slides-slides_1790997482374)

## 2026-10-05 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ
- blueprint service-blueprint_1791222428446: chain:lexical partial (schema_invalid) (frontier case blueprint-service-blueprint_1791222428446)
- journey journey-map_1791219156197: chain:lexical partial (schema_invalid) (frontier case journey-journey-map_1791219156197)

## 2026-10-06 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ
- persona persona-card_1791247737688: chain:lexical partial (schema_invalid) (frontier case persona-persona-card_1791247737688)
- recommendations recommendation_1791249012501: chain:lexical partial (schema_invalid) (frontier case recommendations-recommendation_1791249012501)
- recommendations recommendation_1791257849267: chain:lexical partial (schema_invalid) (frontier case recommendations-recommendation_1791257849267)
- recommendations recommendation_1791304383912: chain:lexical partial (schema_invalid) (frontier case recommendations-recommendation_1791304383912)
- recommendations recommendation_1791308176302: chain:lexical partial (schema_invalid) (frontier case recommendations-recommendation_1791308176302)
- recommendations recommendation_1791316422301: chain:lexical partial (schema_invalid) (frontier case recommendations-recommendation_1791316422301)

## 2026-10-20 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ
- recommendations recommendation_1792523961210: chain:lexical partial (schema_invalid) (frontier case recommendations-recommendation_1792523961210)

## 2026-10-26 | generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ
- slides slides_1793002796899: chain:lexical partial (schema_invalid) (frontier case slides-slides_1793002796899)

## 2026-11-03 | analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th
- slides slides_1793746762186: chain:lexical partial (schema_invalid) (frontier case slides-slides_1793746762186)
