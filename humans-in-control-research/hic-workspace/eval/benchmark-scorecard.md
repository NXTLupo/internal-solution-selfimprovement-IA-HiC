# HiC Benchmark Scorecard

Fixture: `hic-workspace\wiki\engagements\identify-a-comprehensive-new-strategy-for-co-op-based-on-the`

## DATA_COLLECTION

- journal_lines: **906**
- unique_manifest_records: **10968**
- chunked_corpus_records: **9847**
- chunk_retrievability_pct: **14.94**
- chunk_retrievability_tagged: **1471**
- article_provenance_pct: **99.66**
- fixture_citation_count: **25**
- fixture_external_citation_pct: **28**
- fixture_citation_named_pct: **100**
- report_grounds_via_manifest: **1**
- report_raw_injection_gated: **1**

_probes / gaps:_
  - LIVE: per-source/feed extraction yield + deep-research coverage need a live run
  - WS1.1: report now manifest-first (assembleDeliverableCorpus), rawSources gated to fallback. Live report run still recommended to confirm prose depth holds; code path + fallback verified.

## THEMES

- theme_count: **25**
- theme_meets_breadth_floor: **true**
- avg_goal_alignment: **88.76**
- themes_with_external_citation_pct: **28**
- validated_pct: **100**
- avg_citations_per_theme: **1**
- avg_subthemes_per_theme: **2**
- avg_evidence_refs_per_theme: **5.08**
- avg_distinct_sources_per_theme: **1**
- themes_mandate_multisource: **1**
- themes_live_distinct_sources_per_theme: **2**
- themes_live_multi_source_pct: **100**

_probes / gaps:_
  - P2 mechanism is on-vision (mandates >=2 distinct sources/theme, goalAlignment relevancy gate, manifest grounding). Fixture avg_citations=1 is a stale 2026-05-26 generation; OUTPUT-depth gains require a LIVE themes regen to measure (the one phase that genuinely needs it).

## ANALYST_CHAT

- chat_grounds_via_manifest: **1**
- chat_persists_insights: **1**
- chat_answered_ok: **5/5**
- chat_avg_distinct_sources_per_answer: **1.4**
- chat_multi_source_answer_pct: **40**
- chat_grounding_pct: **100**

_probes / gaps:_
  - Mechanism now: manifest-grounded chat (PRIMARY EVIDENCE, cite-by-pointer) + fire-and-forget insight write-back to synthesis/chat-insights (retrievability).

## DELIVERABLES_DESIGN

- deliverables_parse_ok: **7/7**
- banned_phrase_hits: **8**
- em_dash_hits: **187**
- strings_scanned: **3813**
- renderer_hardcoded_brand_hex: **20**
- export_fonthref_token_derived: **1**
- renderer_renders_figma_image_slots: **1**

_probes / gaps:_
  - LIVE: action-title rate, prose quality, PPTX render fidelity + token-match need live export + auditors

## DESIGNER_CHAT

- sample_artifacts_found: **25**
- designer_slidespec_json_recovery: **1**
- designer_error_reduction_pct: **66.67**
- designer_on_total_errors: **1**
- designer_on_json_parse_ok: **1**

## SELF_IMPROVEMENT

- golden_set_present: **true**
- golden_set_exemplars_scored: **17**
- golden_set_exemplar_mean: **2.25**
- golden_set_degraded_mean: **0.58**
- golden_set_discrimination_proxy: **1.67**
- golden_set_discriminates: **true**
- learned_constraints_count: **49**
- hook_rejections_logged: **1**
- epochs_ledger_present: **true**

_probes / gaps:_
  - discrimination_proxy = clean exemplar vs deliberately-degraded control (same content + injected em-dashes/banned-phrases), LENGTH-NEUTRAL. Validates the scorer catches quality degradation (the gate's actual job) before the live gate is trusted. Live runGate uses the full qualityFrontier vector + /api/golden-set/failure-corpus.
  - GAP: golden-set discrimination gate not runnable until golden-set.json exists (WS2).
  - LIVE: epoch quality-delta trend needs goldenSetRunner + a frozen golden set.

